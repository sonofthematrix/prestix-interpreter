/**
 * Property Blockchain Integration Service
 *
 * Handles automatic deployment of RWA contracts when properties are onboarded
 * Integrates property data with blockchain tokenization
 *
 * @author Tokenizin
 */

import { ethers } from 'ethers';
import { createBlockchainAdminInterface } from './blockchain-admin-interface';
import { createClient } from '@/lib/db';
import type { AuthUser } from '@/lib/auth';

export interface PropertyBlockchainDeployment {
  propertyId: string;
  networkId: string;
  assetId?: number;
  registryAddress?: string;
  tokenAddress?: string;
  marketplaceAddress?: string;
  deploymentStatus: 'PENDING' | 'DEPLOYING' | 'DEPLOYED' | 'FAILED';
  deploymentTxHash?: string;
  deploymentError?: string;
}

export interface PropertyToBlockchainParams {
  // Property details
  propertyId: string;
  title: string;
  description: string;
  assetType: string;
  location: string;
  price: number; // In USD or primary currency

  // Tokenization details
  tokenPrice: number; // Price per token
  totalTokens: number;
  tokenName?: string;
  tokenSymbol?: string;

  // Owner details
  ownerAddress: string;
  ownerId: string;

  // Network
  networkId: string;

  // Optional metadata
  imageUrl?: string;
  videoUrl?: string;
  metadata?: Record<string, any>;
}

/**
 * Convert property data to blockchain deployment parameters
 */
export function propertyToBlockchainParams(
  property: any,
  tokenizationParams: {
    tokenPrice: number;
    totalTokens: number;
    ownerAddress: string;
  }
): PropertyToBlockchainParams {
  return {
    propertyId: property.id,
    title: property.title,
    description: property.description,
    assetType: property.assetType || 'RESIDENTIAL_PROPERTY',
    location: property.location || '',
    price: property.price,
    tokenPrice: tokenizationParams.tokenPrice,
    totalTokens: tokenizationParams.totalTokens,
    tokenName: `${property.title} Token`,
    tokenSymbol: generateTokenSymbol(property.title),
    ownerAddress: tokenizationParams.ownerAddress,
    ownerId: property.ownerId,
    networkId: 'sepolia', // Default to Sepolia
    imageUrl: property.imageUrl,
    videoUrl: property.videoUrl,
    metadata: {
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      buildSize: property.buildSize,
      landSize: property.landSize,
      features: property.features,
    },
  };
}

/**
 * Generate a token symbol from property title
 */
function generateTokenSymbol(title: string): string {
  // Take first 3 words, get first letter of each, uppercase
  const words = title.split(' ').slice(0, 3);
  const symbol = words.map(w => w[0]?.toUpperCase() || '').join('');
  return symbol.length >= 2 ? symbol : 'PROP';
}

/**
 * Deploy RWA contracts for a property
 */
export class PropertyBlockchainIntegration {
  private adminUser: AuthUser;

  constructor(adminUser: AuthUser) {
    this.adminUser = adminUser;
  }

  /**
   * Deploy full RWA contract suite for a property
   */
  async deployPropertyToBlockchain(
    params: PropertyToBlockchainParams
  ): Promise<PropertyBlockchainDeployment> {
    const db = await createClient(this.adminUser);

    try {
      // 1. Update status to DEPLOYING
      await this.updatePropertyBlockchainStatus(params.propertyId, 'DEPLOYING');

      // 2. Get blockchain network
      const network = await db.blockchainNetwork.findFirst({
        where: { name: params.networkId },
      });

      if (!network) {
        throw new Error(`Network ${params.networkId} not found`);
      }

      // 3. Create blockchain interface
      const blockchain = await createBlockchainAdminInterface(network.id, this.adminUser);

      // 4. Convert prices to wei
      const priceWei = ethers.parseEther(params.price.toString());
      const tokenPriceWei = ethers.parseEther(params.tokenPrice.toString());

      // 5. Register asset in RWAAssetRegistry
      console.log('📝 Registering asset on blockchain...');
      const registryResult = await blockchain.registerAsset({
        assetId: params.propertyId,
        title: params.title,
        description: params.description,
        assetType: params.assetType,
        location: params.location,
        price: priceWei.toString(),
        tokenPrice: tokenPriceWei.toString(),
        totalTokens: params.totalTokens,
        owner: params.ownerAddress,
        metadata: {
          ...params.metadata,
          imageUrl: params.imageUrl,
          videoUrl: params.videoUrl,
        },
      });

      console.log(`✅ Asset registered with ID: ${registryResult.assetId}`);

      // 6. Create token contract via RWATokenFactory
      console.log('🪙 Creating token contract...');
      const tokenResult = await blockchain.createToken(
        registryResult.assetId,
        params.tokenName || `${params.title} Token`,
        params.tokenSymbol || 'PROP',
        params.totalTokens,
        params.ownerAddress
      );

      console.log(`✅ Token created at: ${tokenResult.tokenAddress}`);

      // 7. Get marketplace address (already deployed)
      const marketplace = await db.deployedContract.findFirst({
        where: {
          networkId: network.id,
          contractType: 'MARKETPLACE',
          isActive: true,
        },
      });

      // 8. Save deployment info to database
      const deployment: PropertyBlockchainDeployment = {
        propertyId: params.propertyId,
        networkId: network.id,
        assetId: registryResult.assetId,
        registryAddress: registryResult.receipt.events?.[0]?.args?.contractAddress,
        tokenAddress: tokenResult.tokenAddress,
        marketplaceAddress: marketplace?.contractAddress,
        deploymentStatus: 'DEPLOYED',
        deploymentTxHash: registryResult.transactionHash,
      };

      // 9. Update property with blockchain data
      await db.realEstateAsset.update({
        where: { id: params.propertyId },
        data: {
          status: 'ACTIVE',
          updatedAt: new Date(),
        },
      });

      // 10. Create blockchain record
      await this.saveDeploymentRecord(deployment, registryResult, tokenResult);

      console.log('🎉 Property successfully deployed to blockchain!');

      return deployment;
    } catch (error: any) {
      console.error('❌ Deployment failed:', error);

      // Update status to FAILED
      await this.updatePropertyBlockchainStatus(params.propertyId, 'FAILED', error.message);

      return {
        propertyId: params.propertyId,
        networkId: params.networkId,
        deploymentStatus: 'FAILED',
        deploymentError: error.message,
      };
    }
  }

  /**
   * Update property blockchain status
   */
  private async updatePropertyBlockchainStatus(
    propertyId: string,
    status: 'PENDING' | 'DEPLOYING' | 'DEPLOYED' | 'FAILED',
    error?: string
  ): Promise<void> {
    const db = await createClient(this.adminUser);

    await db.realEstateAsset.update({
      where: { id: propertyId },
      data: {
        // Store blockchain status in a metadata field or create a new field
        updatedAt: new Date(),
      },
    });

    // Log to audit
    await db.auditLog.create({
      data: {
        userId: this.adminUser.id,
        action: `BLOCKCHAIN_DEPLOYMENT_${status}`,
        entityType: 'PROPERTY',
        entityId: propertyId,
        changes: {
          status,
          error,
        } as any,
        ipAddress: 'system',
        userAgent: 'property-blockchain-integration',
        timestamp: new Date(),
      },
    });
  }

  /**
   * Save deployment record to database
   */
  private async saveDeploymentRecord(
    deployment: PropertyBlockchainDeployment,
    registryResult: any,
    tokenResult: any
  ): Promise<void> {
    const db = await createClient(this.adminUser);

    // Save wallet transaction for registry
    await db.walletTransaction.create({
      data: {
        userId: this.adminUser.id,
        walletAddress: this.adminUser.walletAddress || 'admin',
        transactionHash: registryResult.transactionHash,
        chainId: 11155111, // Sepolia
        networkName: 'sepolia',
        type: 'property_tokenization',
        tokenAddress: tokenResult.tokenAddress,
        status: 'COMPLETED',
        metadata: {
          propertyId: deployment.propertyId,
          assetId: deployment.assetId,
          tokenAddress: tokenResult.tokenAddress,
        } as any,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get property blockchain deployment status
   */
  async getPropertyDeploymentStatus(propertyId: string): Promise<PropertyBlockchainDeployment | null> {
    const db = await createClient(this.adminUser);

    // Query for deployment info
    const transaction = await db.walletTransaction.findFirst({
      where: {
        type: 'property_tokenization',
        metadata: {
          path: ['propertyId'],
          equals: propertyId,
        } as any,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!transaction) {
      return null;
    }

    const metadata = transaction.metadata as any;

    return {
      propertyId,
      networkId: 'sepolia',
      assetId: metadata.assetId,
      tokenAddress: metadata.tokenAddress,
      deploymentStatus: transaction.status === 'COMPLETED' ? 'DEPLOYED' : 'FAILED',
      deploymentTxHash: transaction.transactionHash,
    };
  }

  /**
   * Check if property is already deployed
   */
  async isPropertyDeployed(propertyId: string): Promise<boolean> {
    const status = await this.getPropertyDeploymentStatus(propertyId);
    return status?.deploymentStatus === 'DEPLOYED';
  }

  /**
   * Mint tokens for a property investment
   */
  async mintPropertyTokens(
    propertyId: string,
    recipientAddress: string,
    amount: number
  ): Promise<{ transactionHash: string }> {
    const deployment = await this.getPropertyDeploymentStatus(propertyId);

    if (!deployment || deployment.deploymentStatus !== 'DEPLOYED') {
      throw new Error('Property not deployed to blockchain');
    }

    if (!deployment.assetId) {
      throw new Error('Asset ID not found');
    }

    const db = await createClient(this.adminUser);
    const network = await db.blockchainNetwork.findFirst({
      where: { name: 'sepolia' },
    });

    if (!network) {
      throw new Error('Network not found');
    }

    const blockchain = await createBlockchainAdminInterface(network.id, this.adminUser);

    const receipt = await blockchain.mintTokens({
      assetId: deployment.assetId,
      recipient: recipientAddress,
      amount,
    });

    return {
      transactionHash: receipt.transactionHash,
    };
  }

  /**
   * Get property token information
   */
  async getPropertyTokenInfo(propertyId: string): Promise<{
    tokenAddress: string;
    tokenName: string;
    tokenSymbol: string;
    totalSupply: number;
    holders: Array<{ address: string; balance: string }>;
  } | null> {
    const deployment = await this.getPropertyDeploymentStatus(propertyId);

    if (!deployment || !deployment.tokenAddress) {
      return null;
    }

    const db = await createClient(this.adminUser);
    const network = await db.blockchainNetwork.findFirst({
      where: { name: 'sepolia' },
    });

    if (!network) {
      return null;
    }

    const blockchain = await createBlockchainAdminInterface(network.id, this.adminUser);

    // Get token holders
    const holders = await blockchain.getTokenHolders(deployment.tokenAddress);

    return {
      tokenAddress: deployment.tokenAddress,
      tokenName: 'Property Token', // Would need to query from contract
      tokenSymbol: 'PROP',
      totalSupply: holders.reduce((sum, h) => sum + parseInt(h.balance), 0),
      holders,
    };
  }
}

/**
 * Factory function to create PropertyBlockchainIntegration
 */
export async function createPropertyBlockchainIntegration(
  adminUser: AuthUser
): Promise<PropertyBlockchainIntegration> {
  // Verify user has appropriate role
  if (adminUser.role !== 'ADMIN' && adminUser.role !== 'VENDOR') {
    throw new Error('Admin or Vendor role required for blockchain operations');
  }

  return new PropertyBlockchainIntegration(adminUser);
}
