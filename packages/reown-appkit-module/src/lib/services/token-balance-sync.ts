/**
 * Token Balance Synchronization Service
 *
 * Syncs on-chain RWA token balances with database records
 * Tracks successful token purchases and distributions
 *
 * @author Tokenizin
 */

import { ethers } from 'ethers';
import { createClient } from '@/lib/db';
import type { AuthUser } from '@/lib/auth';

// RWA Token ABI (ERC20 + custom functions)
const RWA_TOKEN_ABI = [
  // ERC20 Standard
  'function balanceOf(address account) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  // RWA-specific
  'function getTokenHolders() view returns (address[])',
  'function getTokenHolderBalance(address holder) view returns (uint256)',
  // Owner function (for Ownable contracts)
  'function owner() view returns (address)',
];

export interface OnChainBalance {
  propertyId: string;
  tokenAddress: string;
  walletAddress: string;
  balance: string; // BigNumber as string
  balanceDecimal: number; // Human-readable balance
  lastSynced: Date;
  chainId: number;
  transactionHash?: string;
}

export interface TokenPurchaseVerification {
  propertyId: string;
  userId: string;
  walletAddress: string;
  tokenAmount: number;
  purchaseAmount: number;
  onChainBalance: number;
  verified: boolean;
  transactionHash?: string;
  blockNumber?: number;
  timestamp?: Date;
}

export interface TokenDistributionRecord {
  propertyId: string;
  tokenAddress: string;
  recipients: Array<{
    userId: string;
    walletAddress: string;
    tokenAmount: number;
    transactionHash: string;
    status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  }>;
  totalDistributed: number;
  distributionDate: Date;
}

/**
 * Token Balance Sync Service
 */
export class TokenBalanceSyncService {
  private provider: ethers.JsonRpcProvider;
  private db: Awaited<ReturnType<typeof createClient>> | null = null;
  private user: AuthUser;

  constructor(user: AuthUser, rpcUrl?: string) {
    this.user = user;
    this.provider = new ethers.JsonRpcProvider(
      rpcUrl || process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/2d7d7d7916714e30a4c5d5a6ba129303'
    );
  }

  private async getDb() {
    if (!this.db) {
      this.db = await createClient(this.user);
    }
    return this.db;
  }

  /**
   * Sync on-chain balance for a specific user and property
   */
  async syncUserPropertyBalance(
    userId: string,
    propertyId: string,
    tokenAddress: string,
    walletAddress: string
  ): Promise<OnChainBalance> {
    try {
      // Get on-chain balance
      const tokenContract = new ethers.Contract(tokenAddress, RWA_TOKEN_ABI, this.provider);
      const balance = await tokenContract.balanceOf(walletAddress);
      const decimals = await tokenContract.decimals();
      const balanceDecimal = parseFloat(ethers.formatUnits(balance, decimals));

      const onChainBalance: OnChainBalance = {
        propertyId,
        tokenAddress,
        walletAddress,
        balance: balance.toString(),
        balanceDecimal,
        lastSynced: new Date(),
        chainId: 11155111, // Sepolia
      };

      // Update database TokenHolder record
      await this.updateTokenHolderBalance(userId, propertyId, tokenAddress, balanceDecimal, walletAddress);

      return onChainBalance;
    } catch (error) {
      console.error('Error syncing balance:', error);
      throw new Error(`Failed to sync balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sync all balances for a property (all token holders)
   */
  async syncPropertyBalances(propertyId: string, tokenAddress: string): Promise<OnChainBalance[]> {
    try {
      // Get all token holders from database
      const db = await this.getDb();
      const tokenHolders = await db.tokenHolder.findMany({
        where: { realEstateAssetId: propertyId },
        include: {
          user: {
            include: {
              walletConnections: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
        },
      });

      const balances: OnChainBalance[] = [];

      // Sync balance for each holder
      for (const holder of tokenHolders) {
        const walletAddress = holder.user.walletConnections[0]?.walletAddress;
        if (!walletAddress) {
          console.warn(`No wallet address found for user ${holder.userId}`);
          continue;
        }

        try {
          const balance = await this.syncUserPropertyBalance(
            holder.userId,
            propertyId,
            tokenAddress,
            walletAddress
          );
          balances.push(balance);
        } catch (error) {
          console.error(`Failed to sync balance for user ${holder.userId}:`, error);
        }
      }

      return balances;
    } catch (error) {
      console.error('Error syncing property balances:', error);
      throw error;
    }
  }

  /**
   * Verify a token purchase on-chain
   */
  async verifyTokenPurchase(
    userId: string,
    propertyId: string,
    tokenAddress: string,
    walletAddress: string,
    expectedAmount: number
  ): Promise<TokenPurchaseVerification> {
    try {
      // Get on-chain balance
      const balance = await this.syncUserPropertyBalance(userId, propertyId, tokenAddress, walletAddress);

      // Get database investment record
      const db = await this.getDb();
      const investment = await db.investment.findFirst({
        where: {
          investorId: userId,
          realEstateAssetId: propertyId,
        },
      });

      if (!investment) {
        throw new Error('Investment record not found');
      }

      const verification: TokenPurchaseVerification = {
        propertyId,
        userId,
        walletAddress,
        tokenAmount: investment.tokenAmount,
        purchaseAmount: investment.amount,
        onChainBalance: balance.balanceDecimal,
        verified: balance.balanceDecimal >= expectedAmount,
        timestamp: new Date(),
      };

      // Log verification result
      await this.logVerification(verification);

      return verification;
    } catch (error) {
      console.error('Error verifying purchase:', error);
      throw error;
    }
  }

  /**
   * Get all on-chain token balances for a user across all properties
   */
  async getUserAllTokenBalances(userId: string): Promise<OnChainBalance[]> {
    try {
      // Get all token holdings for user
      const db = await this.getDb();
      const holdings = await db.tokenHolder.findMany({
        where: { userId },
        include: {
          realEstateAsset: true,
          user: {
            include: {
              walletConnections: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
        },
      });

      const balances: OnChainBalance[] = [];

      for (const holding of holdings) {
        const walletAddress = holding.user.walletConnections[0]?.walletAddress;
        if (!walletAddress) continue;

        // Check if property has been deployed to blockchain
        // Look for blockchain deployment records in database
        const property = holding.realEstateAsset as any;
        const tokenAddress = property.blockchainTokenAddress || property.tokenAddress;

        if (!tokenAddress) {
          console.warn(`Property ${holding.realEstateAssetId} not yet deployed to blockchain`);
          continue;
        }

        try {
          const balance = await this.syncUserPropertyBalance(
            userId,
            holding.realEstateAssetId,
            tokenAddress,
            walletAddress
          );
          balances.push(balance);
        } catch (error) {
          console.error(`Failed to sync balance for property ${holding.realEstateAssetId}:`, error);
        }
      }

      return balances;
    } catch (error) {
      console.error('Error getting user token balances:', error);
      throw error;
    }
  }

  /**
   * Distribute tokens to existing investors during deployment
   * Uses the contract owner address from the contract itself
   */
  async distributeTokensToInvestors(
    propertyId: string,
    tokenAddress: string,
    ownerPrivateKey: string
  ): Promise<TokenDistributionRecord> {
    try {
      // Get all investors for this property
      const db = await this.getDb();
      const investments = await db.investment.findMany({
        where: {
          realEstateAssetId: propertyId,
          status: 'ACTIVE',
        },
        include: {
          investor: {
            include: {
              walletConnections: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
        },
      });

      // Get contract owner address from the contract
      const tokenContractReadOnly = new ethers.Contract(tokenAddress, RWA_TOKEN_ABI, this.provider);
      let contractOwnerAddress: string;
      
      try {
        // Try to get owner from contract (if it has an owner() function)
        contractOwnerAddress = await tokenContractReadOnly.owner();
      } catch (error) {
        // If owner() doesn't exist, use the signer address from the private key
        const tempSigner = new ethers.Wallet(ownerPrivateKey, this.provider);
        contractOwnerAddress = await tempSigner.getAddress();
      }

      // Create signer from private key
      const signer = new ethers.Wallet(ownerPrivateKey, this.provider);
      const signerAddress = await signer.getAddress();
      
      // Verify signer address matches contract owner
      if (signerAddress.toLowerCase() !== contractOwnerAddress.toLowerCase()) {
        throw new Error(`Signer address (${signerAddress}) does not match contract owner (${contractOwnerAddress})`);
      }

      const tokenContract = new ethers.Contract(tokenAddress, RWA_TOKEN_ABI, signer);

      const recipients: TokenDistributionRecord['recipients'] = [];
      let totalDistributed = 0;

      for (const investment of investments) {
        const walletAddress = investment.investor.walletConnections[0]?.walletAddress;
        if (!walletAddress) {
          console.warn(`No wallet for investor ${investment.investorId}, skipping`);
          continue;
        }

        try {
          // Mint/transfer tokens to investor
          const tokenAmount = investment.tokenAmount;
          const tx = await tokenContract.transfer(walletAddress, ethers.parseUnits(tokenAmount.toString(), 18));
          const receipt = await tx.wait();

          recipients.push({
            userId: investment.investorId,
            walletAddress,
            tokenAmount,
            transactionHash: receipt.hash,
            status: 'CONFIRMED',
          });

          totalDistributed += tokenAmount;

          // Update TokenHolder record
          await this.updateTokenHolderBalance(
            investment.investorId,
            propertyId,
            tokenAddress,
            tokenAmount,
            walletAddress
          );
        } catch (error) {
          console.error(`Failed to distribute to ${investment.investorId}:`, error);
          recipients.push({
            userId: investment.investorId,
            walletAddress,
            tokenAmount: investment.tokenAmount,
            transactionHash: '',
            status: 'FAILED',
          });
        }
      }

      const distribution: TokenDistributionRecord = {
        propertyId,
        tokenAddress,
        recipients,
        totalDistributed,
        distributionDate: new Date(),
      };

      // Log distribution
      await this.logDistribution(distribution);

      return distribution;
    } catch (error) {
      console.error('Error distributing tokens:', error);
      throw error;
    }
  }

  /**
   * Update TokenHolder balance in database
   */
  private async updateTokenHolderBalance(
    userId: string,
    propertyId: string,
    tokenAddress: string,
    balance: number,
    walletAddress: string
  ): Promise<void> {
    try {
      const db = await this.getDb();
      await db.tokenHolder.upsert({
        where: {
          realEstateAssetId_userId: {
            realEstateAssetId: propertyId,
            userId,
          },
        },
        update: {
          tokenAmount: Math.floor(balance),
          updatedAt: new Date(),
        },
        create: {
          realEstateAssetId: propertyId,
          userId,
          tokenAmount: Math.floor(balance),
        },
      });
    } catch (error) {
      console.error('Error updating token holder balance:', error);
      throw error;
    }
  }

  /**
   * Log purchase verification
   */
  private async logVerification(verification: TokenPurchaseVerification): Promise<void> {
    try {
      const db = await this.getDb();
      await db.auditLog.create({
        data: {
          action: 'TOKEN_PURCHASE_VERIFICATION',
          entityType: 'TokenPurchase',
          entityId: verification.propertyId,
          userId: this.user.id,
          metadata: verification as any,
          success: verification.verified,
        },
      });
    } catch (error) {
      console.error('Error logging verification:', error);
    }
  }

  /**
   * Log token distribution
   */
  private async logDistribution(distribution: TokenDistributionRecord): Promise<void> {
    try {
      const db = await this.getDb();
      await db.auditLog.create({
        data: {
          action: 'TOKEN_DISTRIBUTION',
          entityType: 'TokenDistribution',
          entityId: distribution.propertyId,
          userId: this.user.id,
          metadata: distribution as any,
          success: distribution.recipients.filter(r => r.status === 'CONFIRMED').length === distribution.recipients.length,
        },
      });
    } catch (error) {
      console.error('Error logging distribution:', error);
    }
  }

  /**
   * Get transaction status from blockchain
   */
  async getTransactionStatus(txHash: string): Promise<{
    status: 'PENDING' | 'CONFIRMED' | 'FAILED';
    blockNumber?: number;
    confirmations?: number;
    timestamp?: Date;
  }> {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);

      if (!receipt) {
        return { status: 'PENDING' };
      }

      const block = await this.provider.getBlock(receipt.blockNumber);
      const currentBlock = await this.provider.getBlockNumber();

      return {
        status: receipt.status === 1 ? 'CONFIRMED' : 'FAILED',
        blockNumber: receipt.blockNumber,
        confirmations: currentBlock - receipt.blockNumber,
        timestamp: block ? new Date(block.timestamp * 1000) : undefined,
      };
    } catch (error) {
      console.error('Error getting transaction status:', error);
      throw error;
    }
  }
}

/**
 * Helper function to create a token balance sync service
 */
export function createTokenBalanceSyncService(user: AuthUser, rpcUrl?: string): TokenBalanceSyncService {
  return new TokenBalanceSyncService(user, rpcUrl);
}
