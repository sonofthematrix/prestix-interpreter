/**
 * Blockchain Admin Interface Service
 *
 * Comprehensive interface between backend admin operations and on-chain contracts
 * Manages all aspects of tokenization, wallets, accounts, and assets (RWA & Digital)
 * Provides traceability, security, and compliance for all blockchain operations
 *
 * @author Tokenizin
 * @version 1.0.0
 */

import { ethers } from 'ethers';
import { createClient } from '@/lib/db';
import type { AuthUser } from '@/lib/auth';
import { AuditLogger, AuditLogEntry } from './audit-logger';
import { ComplianceValidator } from './compliance-validator';

// Contract ABIs
import RWAAssetRegistryABI from '@/lib/contracts/abis/RWAAssetRegistryUpgradeable';
import RWATokenFactoryABI from '@/lib/contracts/abis/RWATokenFactoryUpgradeable';
import RWAMarketplaceABI from '@/lib/contracts/abis/RWAMarketplaceUpgradeable';
import RWATokenABI from '@/lib/contracts/abis/RWAToken';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface BlockchainConfig {
  networkId: string;
  rpcUrl: string;
  chainId: number;
  explorerUrl: string;
}

export interface ContractAddresses {
  registry: string;
  factory: string;
  marketplace: string;
  membership?: string;
}

export interface AssetTokenizationParams {
  assetId: string;
  title: string;
  description: string;
  assetType: string;
  location: string;
  price: string; // In wei
  tokenPrice: string; // In wei
  totalTokens: number;
  owner: string;
  metadata?: Record<string, any>;
}

export interface TokenMintParams {
  assetId: number;
  recipient: string;
  amount: number;
}

export interface MarketplaceListingParams {
  assetId: number;
  tokenAmount: number;
  pricePerToken: string; // In wei
}

export interface WalletOperationParams {
  walletAddress: string;
  operation: 'REGISTER' | 'VERIFY' | 'SUSPEND' | 'ACTIVATE';
  reason?: string;
  metadata?: Record<string, any>;
}

export interface ComplianceCheckResult {
  passed: boolean;
  violations: string[];
  warnings: string[];
  requiresManualReview: boolean;
}

export interface TransactionReceipt {
  transactionHash: string;
  blockNumber: number;
  blockHash: string;
  gasUsed: string;
  status: 'success' | 'failed';
  events: Array<{
    eventName: string;
    args: Record<string, any>;
  }>;
}

export interface AuditTrail {
  timestamp: Date;
  adminUser: string;
  operation: string;
  contractAddress: string;
  transactionHash?: string;
  params: Record<string, any>;
  result: 'SUCCESS' | 'FAILED' | 'PENDING';
  errorMessage?: string;
}

// ============================================================================
// BLOCKCHAIN ADMIN INTERFACE SERVICE
// ============================================================================

export class BlockchainAdminInterface {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private contracts: {
    registry?: ethers.Contract;
    factory?: ethers.Contract;
    marketplace?: ethers.Contract;
  } = {};
  private config: BlockchainConfig;
  private auditLogger: AuditLogger;
  private complianceValidator: ComplianceValidator;
  private adminUser: AuthUser;

  constructor(
    config: BlockchainConfig,
    contractAddresses: ContractAddresses,
    adminUser: AuthUser
  ) {
    this.config = config;
    this.adminUser = adminUser;
    this.auditLogger = new AuditLogger();
    this.complianceValidator = new ComplianceValidator();

    // Initialize provider and signer
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);

    const privateKey = process.env.ADMIN_PRIVATE_KEY || process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('Admin private key not configured');
    }
    this.signer = new ethers.Wallet(privateKey, this.provider);

    // Initialize contract instances
    this.initializeContracts(contractAddresses);
  }

  /**
   * Initialize contract instances with proper ABIs
   */
  private initializeContracts(addresses: ContractAddresses): void {
    if (addresses.registry && addresses.registry !== '') {
      this.contracts.registry = new ethers.Contract(
        addresses.registry,
        RWAAssetRegistryABI.abi,
        this.signer
      );
    }

    if (addresses.factory && addresses.factory !== '') {
      this.contracts.factory = new ethers.Contract(
        addresses.factory,
        RWATokenFactoryABI.abi,
        this.signer
      );
    }

    if (addresses.marketplace && addresses.marketplace !== '') {
      this.contracts.marketplace = new ethers.Contract(
        addresses.marketplace,
        RWAMarketplaceABI.abi,
        this.signer
      );
    }
  }

  // ============================================================================
  // ASSET TOKENIZATION OPERATIONS
  // ============================================================================

  /**
   * Register a new RWA asset on-chain
   */
  async registerAsset(
    params: AssetTokenizationParams
  ): Promise<{ assetId: number; transactionHash: string; receipt: TransactionReceipt }> {
    // 1. Compliance check
    const complianceCheck = await this.complianceValidator.validateAssetRegistration(params);
    if (!complianceCheck.passed) {
      throw new Error(`Compliance check failed: ${complianceCheck.violations.join(', ')}`);
    }

    // 2. Audit log - start
    const auditId = await this.auditLogger.logOperationStart({
      adminUser: this.adminUser.id,
      operation: 'REGISTER_ASSET',
      params,
    });

    try {
      // 3. Execute on-chain transaction
      if (!this.contracts.registry) {
        throw new Error('Registry contract not initialized. Please ensure the registry contract address is configured in the blockchain network settings.');
      }

      const tx = await this.contracts.registry.registerAsset(
        params.owner,
        params.title,
        params.description,
        params.assetType,
        params.location,
        params.price,
        params.tokenPrice,
        params.totalTokens
      );

      // 4. Wait for confirmation
      const receipt = await tx.wait();

      // 5. Parse events to get assetId
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = this.contracts.registry!.interface.parseLog(log);
          return parsed?.name === 'AssetRegistered';
        } catch {
          return false;
        }
      });

      if (!event) {
        throw new Error('AssetRegistered event not found in transaction receipt');
      }

      const parsedEvent = this.contracts.registry.interface.parseLog(event);
      const assetId = Number(parsedEvent!.args[0]);

      // 6. Format receipt
      const formattedReceipt: TransactionReceipt = {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed',
        events: [{
          eventName: 'AssetRegistered',
          args: {
            assetId,
            owner: parsedEvent!.args[1],
            assetType: parsedEvent!.args[2],
          },
        }],
      };

      // 7. Save to database
      const db = await createClient(this.adminUser);
      await db.walletTransaction.create({
        data: {
          userId: this.adminUser.id,
          walletAddress: this.signer.address,
          transactionHash: receipt.hash,
          chainId: this.config.chainId,
          networkName: 'sepolia',
          type: 'asset_registration',
          amount: params.price,
          status: 'COMPLETED',
          createdAt: new Date(),
        },
      });

      // 8. Audit log - success
      await this.auditLogger.logOperationSuccess(auditId, {
        assetId,
        transactionHash: receipt.hash,
        receipt: formattedReceipt,
      });

      return {
        assetId,
        transactionHash: receipt.hash,
        receipt: formattedReceipt,
      };
    } catch (error: any) {
      // Audit log - failure
      await this.auditLogger.logOperationFailure(auditId, error.message);
      throw error;
    }
  }

  /**
   * Update asset details on-chain
   */
  async updateAsset(
    assetId: number,
    newPrice: string,
    newTokenPrice: string
  ): Promise<TransactionReceipt> {
    const auditId = await this.auditLogger.logOperationStart({
      adminUser: this.adminUser.id,
      operation: 'UPDATE_ASSET',
      params: { assetId, newPrice, newTokenPrice },
    });

    try {
      if (!this.contracts.registry) {
        throw new Error('Registry contract not initialized');
      }

      const tx = await this.contracts.registry.updateAsset(assetId, newPrice, newTokenPrice);
      const receipt = await tx.wait();

      const formattedReceipt: TransactionReceipt = {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed',
        events: [],
      };

      await this.auditLogger.logOperationSuccess(auditId, { receipt: formattedReceipt });
      return formattedReceipt;
    } catch (error: any) {
      await this.auditLogger.logOperationFailure(auditId, error.message);
      throw error;
    }
  }

  /**
   * Update asset status on-chain
   */
  async updateAssetStatus(
    assetId: number,
    newStatus: 0 | 1 | 2 | 3 // PENDING=0, ACTIVE=1, SOLD_OUT=2, INACTIVE=3
  ): Promise<TransactionReceipt> {
    const auditId = await this.auditLogger.logOperationStart({
      adminUser: this.adminUser.id,
      operation: 'UPDATE_ASSET_STATUS',
      params: { assetId, newStatus },
    });

    try {
      if (!this.contracts.registry) {
        throw new Error('Registry contract not initialized');
      }

      const tx = await this.contracts.registry.updateAssetStatus(assetId, newStatus);
      const receipt = await tx.wait();

      const formattedReceipt: TransactionReceipt = {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed',
        events: [],
      };

      await this.auditLogger.logOperationSuccess(auditId, { receipt: formattedReceipt });
      return formattedReceipt;
    } catch (error: any) {
      await this.auditLogger.logOperationFailure(auditId, error.message);
      throw error;
    }
  }

  // ============================================================================
  // TOKEN OPERATIONS
  // ============================================================================

  /**
   * Create a new token for an asset
   */
  async createToken(
    assetId: number,
    tokenName: string,
    tokenSymbol: string,
    totalSupply: number,
    owner: string
  ): Promise<{ tokenAddress: string; transactionHash: string }> {
    const auditId = await this.auditLogger.logOperationStart({
      adminUser: this.adminUser.id,
      operation: 'CREATE_TOKEN',
      params: { assetId, tokenName, tokenSymbol, totalSupply, owner },
    });

    try {
      if (!this.contracts.factory) {
        throw new Error('Factory contract not initialized');
      }

      const tx = await this.contracts.factory.createToken(
        assetId,
        tokenName,
        tokenSymbol,
        totalSupply,
        owner
      );

      const receipt = await tx.wait();

      // Parse TokenCreated event
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = this.contracts.factory!.interface.parseLog(log);
          return parsed?.name === 'TokenCreated';
        } catch {
          return false;
        }
      });

      if (!event) {
        throw new Error('TokenCreated event not found');
      }

      const parsedEvent = this.contracts.factory.interface.parseLog(event);
      const tokenAddress = parsedEvent!.args[1]; // tokenAddress is second arg

      await this.auditLogger.logOperationSuccess(auditId, {
        tokenAddress,
        transactionHash: receipt.hash,
      });

      return {
        tokenAddress,
        transactionHash: receipt.hash,
      };
    } catch (error: any) {
      await this.auditLogger.logOperationFailure(auditId, error.message);
      throw error;
    }
  }

  /**
   * Mint tokens to a recipient
   */
  async mintTokens(params: TokenMintParams): Promise<TransactionReceipt> {
    const auditId = await this.auditLogger.logOperationStart({
      adminUser: this.adminUser.id,
      operation: 'MINT_TOKENS',
      params,
    });

    try {
      if (!this.contracts.factory) {
        throw new Error('Factory contract not initialized');
      }

      const tx = await this.contracts.factory.mintTokens(
        params.assetId,
        params.recipient,
        params.amount
      );

      const receipt = await tx.wait();

      const formattedReceipt: TransactionReceipt = {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed',
        events: [],
      };

      await this.auditLogger.logOperationSuccess(auditId, { receipt: formattedReceipt });
      return formattedReceipt;
    } catch (error: any) {
      await this.auditLogger.logOperationFailure(auditId, error.message);
      throw error;
    }
  }

  /**
   * Get token address for an asset
   */
  async getTokenAddress(assetId: number): Promise<string> {
    if (!this.contracts.factory) {
      throw new Error('Factory contract not initialized');
    }

    return await this.contracts.factory.getTokenAddress(assetId);
  }

  /**
   * Get token holder information
   */
  async getTokenHolders(tokenAddress: string): Promise<Array<{ address: string; balance: string }>> {
    const tokenContract = new ethers.Contract(tokenAddress, RWATokenABI.abi, this.provider);

    const holderAddresses = await tokenContract.getHolders();
    const holders = await Promise.all(
      holderAddresses.map(async (address: string) => ({
        address,
        balance: (await tokenContract.balanceOf(address)).toString(),
      }))
    );

    return holders;
  }

  // ============================================================================
  // MARKETPLACE OPERATIONS
  // ============================================================================

  /**
   * Get marketplace fee
   */
  async getMarketplaceFee(): Promise<number> {
    if (!this.contracts.marketplace) {
      throw new Error('Marketplace contract not initialized');
    }

    const feeBps = await this.contracts.marketplace.getMarketplaceFee();
    return Number(feeBps);
  }

  /**
   * Get marketplace payment token address
   */
  async getMarketplacePaymentToken(): Promise<string | null> {
    if (!this.contracts.marketplace) {
      throw new Error('Marketplace contract not initialized');
    }

    const paymentToken = await this.contracts.marketplace.paymentToken();
    return paymentToken === '0x0000000000000000000000000000000000000000' ? null : paymentToken;
  }

  /**
   * Set marketplace payment token (admin only)
   */
  async setMarketplacePaymentToken(paymentTokenAddress: string): Promise<TransactionReceipt> {
    const auditId = await this.auditLogger.logOperationStart({
      adminUser: this.adminUser.id,
      operation: 'SET_MARKETPLACE_PAYMENT_TOKEN',
      params: { paymentTokenAddress },
    });

    try {
      if (!this.contracts.marketplace) {
        throw new Error('Marketplace contract not initialized');
      }

      const tx = await this.contracts.marketplace.setPaymentToken(paymentTokenAddress);
      const receipt = await tx.wait();

      const formattedReceipt: TransactionReceipt = {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed',
        events: [],
      };

      await this.auditLogger.logOperationSuccess(auditId, { receipt: formattedReceipt });
      return formattedReceipt;
    } catch (error: any) {
      await this.auditLogger.logOperationFailure(auditId, error.message);
      throw error;
    }
  }

  /**
   * Set marketplace fee (admin only)
   */
  async setMarketplaceFee(newFeeBps: number): Promise<TransactionReceipt> {
    const auditId = await this.auditLogger.logOperationStart({
      adminUser: this.adminUser.id,
      operation: 'SET_MARKETPLACE_FEE',
      params: { newFeeBps },
    });

    try {
      if (!this.contracts.marketplace) {
        throw new Error('Marketplace contract not initialized');
      }

      const tx = await this.contracts.marketplace.setMarketplaceFee(newFeeBps);
      const receipt = await tx.wait();

      const formattedReceipt: TransactionReceipt = {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed',
        events: [],
      };

      await this.auditLogger.logOperationSuccess(auditId, { receipt: formattedReceipt });
      return formattedReceipt;
    } catch (error: any) {
      await this.auditLogger.logOperationFailure(auditId, error.message);
      throw error;
    }
  }

  /**
   * Withdraw collected marketplace fees
   */
  async withdrawMarketplaceFees(): Promise<TransactionReceipt> {
    const auditId = await this.auditLogger.logOperationStart({
      adminUser: this.adminUser.id,
      operation: 'WITHDRAW_MARKETPLACE_FEES',
      params: {},
    });

    try {
      if (!this.contracts.marketplace) {
        throw new Error('Marketplace contract not initialized');
      }

      const tx = await this.contracts.marketplace.withdrawFees();
      const receipt = await tx.wait();

      const formattedReceipt: TransactionReceipt = {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed',
        events: [],
      };

      await this.auditLogger.logOperationSuccess(auditId, { receipt: formattedReceipt });
      return formattedReceipt;
    } catch (error: any) {
      await this.auditLogger.logOperationFailure(auditId, error.message);
      throw error;
    }
  }

  /**
   * Get active listings for an asset
   */
  async getAssetListings(assetId: number): Promise<any[]> {
    if (!this.contracts.marketplace) {
      throw new Error('Marketplace contract not initialized');
    }

    return await this.contracts.marketplace.getListingsByAsset(assetId);
  }

  // ============================================================================
  // WALLET MANAGEMENT OPERATIONS
  // ============================================================================

  /**
   * Register wallet operation in database
   */
  async registerWalletOperation(params: WalletOperationParams): Promise<void> {
    const db = await createClient(this.adminUser);

    await db.walletConnection.upsert({
      where: {
        userId_walletAddress: {
          userId: this.adminUser.id,
          walletAddress: params.walletAddress,
        },
      },
      update: {
        isVerified: params.operation === 'VERIFY',
        verificationDate: params.operation === 'VERIFY' ? new Date() : undefined,
        lastConnectedAt: new Date(),
        connectionCount: {
          increment: 1,
        },
      },
      create: {
        userId: this.adminUser.id,
        walletAddress: params.walletAddress,
        walletType: params.metadata?.walletType || 'unknown',
        isPrimary: false,
        isVerified: params.operation === 'VERIFY',
        verificationDate: params.operation === 'VERIFY' ? new Date() : undefined,
        firstConnectedAt: new Date(),
        lastConnectedAt: new Date(),
        connectionCount: 1,
      },
    });
  }

  /**
   * Get wallet balance for an address
   */
  async getWalletBalance(walletAddress: string): Promise<{
    eth: string;
    tokens: Array<{ tokenAddress: string; symbol: string; balance: string }>;
  }> {
    // Get ETH balance
    const ethBalance = await this.provider.getBalance(walletAddress);

    // Get token balances (you would need to track which tokens to check)
    // For now, returning empty array
    const tokens: Array<{ tokenAddress: string; symbol: string; balance: string }> = [];

    return {
      eth: ethers.formatEther(ethBalance),
      tokens,
    };
  }

  // ============================================================================
  // COMPLIANCE & TRACEABILITY
  // ============================================================================

  /**
   * Get audit trail for a specific operation
   */
  async getAuditTrail(filters: {
    operation?: string;
    adminUser?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<AuditLogEntry[]> {
    return await this.auditLogger.getAuditTrail(filters);
  }

  /**
   * Run compliance check on an address
   */
  async checkAddressCompliance(address: string): Promise<ComplianceCheckResult> {
    return await this.complianceValidator.checkAddress(address);
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(params: {
    startDate: Date;
    endDate: Date;
    includeTransactions?: boolean;
  }): Promise<any> {
    const db = await createClient(this.adminUser);

    const transactions = params.includeTransactions
      ? await db.walletTransaction.findMany({
          where: {
            createdAt: {
              gte: params.startDate,
              lte: params.endDate,
            },
          },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    const auditTrail = await this.getAuditTrail({
      startDate: params.startDate,
      endDate: params.endDate,
    });

    return {
      period: {
        start: params.startDate,
        end: params.endDate,
      },
      summary: {
        totalTransactions: transactions.length,
        totalOperations: auditTrail.length,
        successfulOperations: auditTrail.filter(a => a.result === 'SUCCESS').length,
        failedOperations: auditTrail.filter(a => a.result === 'FAILED').length,
      },
      transactions,
      auditTrail,
      generatedAt: new Date(),
      generatedBy: this.adminUser.id,
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get current gas price
   */
  async getGasPrice(): Promise<{ gasPrice: string; maxFeePerGas: string; maxPriorityFeePerGas: string }> {
    const feeData = await this.provider.getFeeData();

    return {
      gasPrice: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') : '0',
      maxFeePerGas: feeData.maxFeePerGas ? ethers.formatUnits(feeData.maxFeePerGas, 'gwei') : '0',
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei') : '0',
    };
  }

  /**
   * Get contract information
   */
  async getContractInfo(contractAddress: string): Promise<any> {
    const db = await createClient(this.adminUser);

    return await db.deployedContract.findFirst({
      where: { contractAddress },
      include: {
        network: true,
        upgrades: {
          orderBy: { upgradedAt: 'desc' },
          take: 5,
        },
      },
    });
  }

  /**
   * Verify contract on block explorer
   */
  async verifyContract(contractAddress: string, constructorArgs: any[]): Promise<void> {
    // Implementation would call Etherscan API
    // For now, just log
    console.log('Contract verification not yet implemented');
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create a new BlockchainAdminInterface instance
 */
export async function createBlockchainAdminInterface(
  networkId: string,
  adminUser: AuthUser
): Promise<BlockchainAdminInterface> {
  // Verify admin permissions
  if (adminUser.role !== 'ADMIN') {
    throw new Error('Admin role required');
  }

  // Get network configuration from database
  const db = await createClient(adminUser);
  const network = await db.blockchainNetwork.findUnique({
    where: { id: networkId },
    include: {
      contracts: {
        where: { isActive: true },
      },
    },
  });

  if (!network) {
    throw new Error('Network not found');
  }

  // Extract contract addresses
  const registryContract = network.contracts.find(c => c.contractType === 'REGISTRY');
  const factoryContract = network.contracts.find(c => c.contractType === 'FACTORY');
  const marketplaceContract = network.contracts.find(c => c.contractType === 'MARKETPLACE');
  const membershipContract = network.contracts.find(c => c.contractType === 'MEMBERSHIP');

  const contractAddresses: ContractAddresses = {
    registry: registryContract?.contractAddress || '',
    factory: factoryContract?.contractAddress || '',
    marketplace: marketplaceContract?.contractAddress || '',
    membership: membershipContract?.contractAddress,
  };

  // Create config
  const config: BlockchainConfig = {
    networkId: network.id,
    rpcUrl: network.primaryRpcUrl,
    chainId: network.chainId,
    explorerUrl: network.explorerUrl,
  };

  return new BlockchainAdminInterface(config, contractAddresses, adminUser);
}
