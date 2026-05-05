/**
 * Contract Factory Service
 * 
 * Handles property token creation via RWA Token Factory smart contracts
 * Integrates with wallet authentication for contract ownership
 * Provides complete property-to-token deployment pipeline
 */

import { AuthUser } from '@/lib/auth';
import { createClient } from '@/lib/db';
import { ethers } from 'ethers';
import { ContractABIs } from '@/lib/contracts/load-abi';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface PropertyTokenParams {
  // Property details
  propertyId: string;
  propertyName: string;
  propertySymbol: string; // e.g., "TPP-001"
  
  // Token economics
  totalValue: string; // Total property value in USD (will be converted to wei)
  tokenSupply: string; // Number of tokens to create
  tokenPrice: string; // Price per token in USD
  
  // Metadata
  metadataURI: string; // IPFS or API endpoint with property details
  imageURL?: string;
  description?: string;
  
  // Owner
  ownerAddress: string; // Wallet address of property owner
}

export interface ContractDeploymentResult {
  success: boolean;
  
  // Contract addresses
  tokenAddress?: string;
  assetId?: string;
  
  // Transaction details
  transactionHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  
  // Database records
  contractId?: string;
  tokenizedAssetId?: string;
  
  error?: string;
  errorDetails?: any;
}

export interface TokenInfo {
  tokenAddress: string;
  assetId: string;
  name: string;
  symbol: string;
  totalSupply: string;
  owner: string;
  isValid: boolean;
  createdAt: Date;
}

export interface FactoryConfig {
  rpcUrl: string;
  factoryAddress: string;
  registryAddress: string;
  chainId: number;
  networkName: string;
  explorerUrl: string;
}

// ============================================================================
// CONTRACT FACTORY SERVICE CLASS
// ============================================================================

export class ContractFactoryService {
  private provider: ethers.JsonRpcProvider;
  private config: FactoryConfig;
  private factoryContract: ethers.Contract;
  private registryContract: ethers.Contract;

  constructor(config?: Partial<FactoryConfig>) {
    this.config = this.loadConfig(config);
    this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
    
    // Initialize contracts
    this.factoryContract = new ethers.Contract(
      this.config.factoryAddress,
      ContractABIs.RWATokenFactory.abi,
      this.provider
    );
    
    this.registryContract = new ethers.Contract(
      this.config.registryAddress,
      ContractABIs.RWAAssetRegistry.abi,
      this.provider
    );
  }

  // ========================================================================
  // CONFIGURATION
  // ========================================================================

  private loadConfig(override?: Partial<FactoryConfig>): FactoryConfig {
    const defaultConfig: FactoryConfig = {
      rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/',
      factoryAddress: process.env.RWA_TOKEN_FACTORY || '',
      registryAddress: process.env.RWA_ASSET_REGISTRY || '',
      chainId: 11155111, // Sepolia
      networkName: 'sepolia',
      explorerUrl: 'https://sepolia.etherscan.io',
    };

    return { ...defaultConfig, ...override };
  }

  // ========================================================================
  // PROPERTY TOKEN CREATION
  // ========================================================================

  /**
   * Create a property token using connected wallet
   * This is the main method for property owners to tokenize their assets
   */
  async createPropertyToken(
    params: PropertyTokenParams,
    walletSigner: ethers.Signer,
    user: AuthUser
  ): Promise<ContractDeploymentResult> {
    try {
      console.log('🏗️ Starting property token creation:', params.propertyName);

      // Step 1: Validate parameters
      this.validateTokenParams(params);

      // Step 2: Verify wallet owns the signer
      const signerAddress = await walletSigner.getAddress();
      if (signerAddress.toLowerCase() !== params.ownerAddress.toLowerCase()) {
        throw new Error('Signer address does not match owner address');
      }

      // Step 3: Register asset in registry (first transaction)
      console.log('📝 Registering asset in registry...');
      const assetId = await this.registerAsset(params, walletSigner);
      console.log('✅ Asset registered with ID:', assetId);

      // Step 4: Create token via factory (second transaction)
      console.log('🪙 Creating token via factory...');
      const tokenResult = await this.createToken(params, assetId, walletSigner);
      console.log('✅ Token created at:', tokenResult.tokenAddress);

      // Step 5: Save to database
      console.log('💾 Saving to database...');
      const dbResult = await this.saveToDatabase(
        params,
        assetId,
        tokenResult,
        user
      );

      return {
        success: true,
        tokenAddress: tokenResult.tokenAddress,
        assetId: assetId,
        transactionHash: tokenResult.transactionHash,
        blockNumber: tokenResult.blockNumber,
        gasUsed: tokenResult.gasUsed,
        contractId: dbResult.contractId,
        tokenizedAssetId: dbResult.tokenizedAssetId,
      };

    } catch (error: any) {
      console.error('❌ Property token creation failed:', error);
      return {
        success: false,
        error: error.message || 'Token creation failed',
        errorDetails: error,
      };
    }
  }

  /**
   * Register asset in the RWA Asset Registry
   */
  private async registerAsset(
    params: PropertyTokenParams,
    signer: ethers.Signer
  ): Promise<string> {
    const registry = this.registryContract.connect(signer);

    // Convert values to wei
    const totalValueWei = ethers.parseUnits(params.totalValue, 18);
    const tokenSupply = BigInt(params.tokenSupply);

    // Register asset
    const tx = await (registry as any).registerAsset(
      'REAL_ESTATE', // Asset type
      params.propertyName,
      params.propertySymbol,
      totalValueWei,
      tokenSupply,
      params.metadataURI
    );

    const receipt = await tx.wait();

    // Extract assetId from event
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = registry.interface.parseLog(log);
        return parsed?.name === 'AssetRegistered';
      } catch {
        return false;
      }
    });

    if (!event) {
      throw new Error('AssetRegistered event not found');
    }

    const parsed = registry.interface.parseLog(event);
    const assetId = parsed?.args[0].toString();

    if (!assetId) {
      throw new Error('Asset ID not found in event');
    }

    return assetId;
  }

  /**
   * Create token via Token Factory
   */
  private async createToken(
    params: PropertyTokenParams,
    assetId: string,
    signer: ethers.Signer
  ): Promise<{
    tokenAddress: string;
    transactionHash: string;
    blockNumber: number;
    gasUsed: string;
  }> {
    const factory = this.factoryContract.connect(signer);

    // Convert supply to wei
    const totalSupplyWei = ethers.parseUnits(params.tokenSupply, 18);

    // Create token
    const tx = await (factory as any).createToken(
      assetId,
      params.propertyName,
      params.propertySymbol,
      totalSupplyWei,
      params.ownerAddress
    );

    const receipt = await tx.wait();

    // Extract token address from event
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = factory.interface.parseLog(log);
        return parsed?.name === 'TokenCreated';
      } catch {
        return false;
      }
    });

    if (!event) {
      throw new Error('TokenCreated event not found');
    }

    const parsed = factory.interface.parseLog(event);
    const tokenAddress = parsed?.args[1]; // Second argument is token address

    if (!tokenAddress) {
      throw new Error('Token address not found in event');
    }

    return {
      tokenAddress,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    };
  }

  /**
   * Save contract deployment to database
   */
  private async saveToDatabase(
    params: PropertyTokenParams,
    assetId: string,
    tokenResult: { tokenAddress: string; transactionHash: string; blockNumber: number },
    user: AuthUser
  ): Promise<{ contractId: string; tokenizedAssetId: string }> {
    const db = await createClient(user);

    // Create BlockchainContract record
    const contract = await (db as any).blockchainContract.create({
      data: {
        contractAddress: tokenResult.tokenAddress,
        contractType: 'PROPERTY_TOKEN',
        network: 'ETHEREUM_SEPOLIA',
        chainId: this.config.chainId,
        name: params.propertyName,
        symbol: params.propertySymbol,
        deploymentBlock: BigInt(tokenResult.blockNumber),
        deploymentTx: tokenResult.transactionHash,
        deployedBy: params.ownerAddress,
        deployedAt: new Date(),
        rpcEndpoint: this.config.rpcUrl,
        explorerUrl: `${this.config.explorerUrl}/address/${tokenResult.tokenAddress}`,
        abiHash: ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(ContractABIs.RWAToken.abi))),
        isActive: true,
        isPaused: false,
        isUpgradeable: false,
        cacheEnabled: true,
        cacheTTL: 300,
        batchSize: 100,
      },
    });

    // Create TokenizedAsset record
    const tokenizedAsset = await (db as any).tokenizedAsset.create({
      data: {
        contractId: contract.id,
        tokenId: assetId,
        network: 'ETHEREUM_SEPOLIA',
        assetType: 'REAL_ESTATE',
        dataStorage: 'HYBRID',
        ownerAddress: params.ownerAddress,
        totalSupply: ethers.parseUnits(params.tokenSupply, 18),
        tokenURI: params.metadataURI,
        realEstateAssetId: params.propertyId,
        lastSyncedBlock: BigInt(tokenResult.blockNumber),
        lastSyncedAt: new Date(),
        syncStatus: 'SYNCED',
        metadata: {
          propertyName: params.propertyName,
          tokenPrice: params.tokenPrice,
          totalValue: params.totalValue,
          imageURL: params.imageURL,
          description: params.description,
        },
      },
    });

    return {
      contractId: contract.id,
      tokenizedAssetId: tokenizedAsset.id,
    };
  }

  // ========================================================================
  // TOKEN INFORMATION
  // ========================================================================

  /**
   * Get token information from blockchain
   */
  async getTokenInfo(tokenAddress: string): Promise<TokenInfo | null> {
    try {
      const token = new ethers.Contract(
        tokenAddress,
        ContractABIs.RWAToken.abi,
        this.provider
      );

      const [name, symbol, totalSupply, owner, assetId] = await Promise.all([
        token.name(),
        token.symbol(),
        token.totalSupply(),
        token.owner(),
        this.factoryContract.getAssetId(tokenAddress),
      ]);

      const isValid = await this.factoryContract.isValidToken(tokenAddress);

      return {
        tokenAddress,
        assetId: assetId.toString(),
        name,
        symbol,
        totalSupply: ethers.formatUnits(totalSupply, 18),
        owner,
        isValid,
        createdAt: new Date(), // Would need to fetch from events for accurate timestamp
      };
    } catch (error) {
      console.error('Failed to get token info:', error);
      return null;
    }
  }

  /**
   * Get all tokens created by the factory
   */
  async getAllTokens(): Promise<string[]> {
    try {
      return await this.factoryContract.getAllTokens();
    } catch (error) {
      console.error('Failed to get all tokens:', error);
      return [];
    }
  }

  /**
   * Get total number of tokens created
   */
  async getTotalTokensCount(): Promise<number> {
    try {
      const count = await this.factoryContract.getTotalTokens();
      return Number(count);
    } catch (error) {
      console.error('Failed to get token count:', error);
      return 0;
    }
  }

  // ========================================================================
  // VALIDATION
  // ========================================================================

  private validateTokenParams(params: PropertyTokenParams): void {
    if (!params.propertyName || params.propertyName.length < 3) {
      throw new Error('Property name must be at least 3 characters');
    }

    if (!params.propertySymbol || params.propertySymbol.length < 2) {
      throw new Error('Property symbol must be at least 2 characters');
    }

    if (!params.ownerAddress || !ethers.isAddress(params.ownerAddress)) {
      throw new Error('Invalid owner address');
    }

    const totalValue = parseFloat(params.totalValue);
    if (isNaN(totalValue) || totalValue <= 0) {
      throw new Error('Total value must be a positive number');
    }

    const tokenSupply = parseInt(params.tokenSupply);
    if (isNaN(tokenSupply) || tokenSupply <= 0) {
      throw new Error('Token supply must be a positive integer');
    }

    const tokenPrice = parseFloat(params.tokenPrice);
    if (isNaN(tokenPrice) || tokenPrice <= 0) {
      throw new Error('Token price must be a positive number');
    }

    if (!params.metadataURI || !params.metadataURI.startsWith('http')) {
      throw new Error('Invalid metadata URI');
    }
  }

  // ========================================================================
  // UTILITIES
  // ========================================================================

  /**
   * Estimate gas for token creation
   */
  async estimateCreationGas(
    params: PropertyTokenParams,
    walletAddress: string
  ): Promise<{
    registrationGas: bigint;
    creationGas: bigint;
    totalGas: bigint;
    estimatedCost: string; // In ETH
  }> {
    try {
      const totalValueWei = ethers.parseUnits(params.totalValue, 18);
      const tokenSupply = BigInt(params.tokenSupply);
      const totalSupplyWei = ethers.parseUnits(params.tokenSupply, 18);

      // Estimate registration gas
      const registrationGas = await this.registryContract.registerAsset.estimateGas(
        'REAL_ESTATE',
        params.propertyName,
        params.propertySymbol,
        totalValueWei,
        tokenSupply,
        params.metadataURI,
        { from: walletAddress }
      );

      // Estimate creation gas (approximate, since we need assetId)
      const creationGas = await this.factoryContract.createToken.estimateGas(
        1, // Placeholder assetId
        params.propertyName,
        params.propertySymbol,
        totalSupplyWei,
        params.ownerAddress,
        { from: walletAddress }
      );

      const totalGas = registrationGas + creationGas;
      const gasPrice = (await this.provider.getFeeData()).gasPrice || BigInt(0);
      const estimatedCost = ethers.formatEther(totalGas * gasPrice);

      return {
        registrationGas,
        creationGas,
        totalGas,
        estimatedCost,
      };
    } catch (error) {
      console.error('Gas estimation failed:', error);
      throw error;
    }
  }

  /**
   * Check if factory is paused
   */
  async isFactoryPaused(): Promise<boolean> {
    try {
      return await this.factoryContract.paused();
    } catch (error) {
      console.error('Failed to check factory status:', error);
      return true; // Assume paused on error for safety
    }
  }

  /**
   * Get factory configuration
   */
  getConfig(): FactoryConfig {
    return { ...this.config };
  }

  /**
   * Get explorer URL for transaction
   */
  getTransactionUrl(txHash: string): string {
    return `${this.config.explorerUrl}/tx/${txHash}`;
  }

  /**
   * Get explorer URL for token contract
   */
  getTokenUrl(tokenAddress: string): string {
    return `${this.config.explorerUrl}/address/${tokenAddress}`;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let factoryService: ContractFactoryService | null = null;

export function getContractFactoryService(): ContractFactoryService {
  if (!factoryService) {
    factoryService = new ContractFactoryService();
  }
  return factoryService;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ContractFactoryService;
