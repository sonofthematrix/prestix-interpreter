/**
 * Blockchain Service with ABI Integration
 * 
 * Provides a unified service for interacting with TigerPalace RWA contracts.
 * Includes MetaMask function signature registration for transaction decoding.
 * 
 * Usage:
 *   import { BlockchainService } from './blockchain-service';
 *   const service = new BlockchainService(provider, signer);
 *   await service.initialize();
 */

import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, ContractAddresses } from './types';

// Import contract ABIs
import ProxyAdminABI from './ProxyAdmin.json';
import TokenizinTokenABI from './TokenizinToken.json';
import RWAAssetRegistryABI from './RWAAssetRegistry.json';
import RWATokenFactoryABI from './RWATokenFactory.json';
import RWAMarketplaceABI from './RWAMarketplace.json';
import RWAStakingABI from './RWAStaking.json';
import RWARewardDistributorABI from './RWARewardDistributor.json';
import RWARevenueABI from './RWARevenue.json';
import MembershipSystemABI from './MembershipSystem.json';

interface ContractInstances {
  proxyAdmin: ethers.Contract;
  tokenizinToken: ethers.Contract;
  rwaAssetRegistry: ethers.Contract;
  rwaTokenFactory: ethers.Contract;
  rwaMarketplace: ethers.Contract;
  rwaStaking: ethers.Contract;
  rwaRewardDistributor: ethers.Contract;
  rwaRevenue: ethers.Contract;
  membershipSystem: ethers.Contract;
}

/**
 * Register function signatures with MetaMask for transaction decoding
 */
export class FunctionSignatureRegistry {
  private signatures: Map<string, string> = new Map();

  /**
   * Extract function signatures from ABI and register with MetaMask
   */
  async registerContract(contractName: string, abi: any[]): Promise<void> {
    for (const item of abi) {
      if (item.type === 'function' && item.stateMutability !== 'view' && item.stateMutability !== 'pure') {
        // Build function signature
        const paramTypes = item.inputs.map((input: any) => input.type).join(',');
        const textSignature = `${item.name}(${paramTypes})`;

        // Calculate function selector
        const hash = ethers.keccak256(ethers.toUtf8Bytes(textSignature));
        const hexSignature = hash.slice(0, 10); // 0x + 8 hex chars = 4 bytes

        this.signatures.set(hexSignature, textSignature);
      }
    }
  }

  /**
   * Register all signatures with MetaMask via 4byte.directory
   */
  async registerWithMetaMask(): Promise<{ registered: number; failed: number }> {
    let registered = 0;
    let failed = 0;

    for (const [hexSignature, textSignature] of this.signatures.entries()) {
      try {
        // Check if already exists
        const exists = await this.checkSignatureExists(hexSignature);
        if (exists) {
          registered++;
          continue;
        }

        // Register with 4byte.directory
        const response = await fetch('https://www.4byte.directory/api/v1/signatures/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            hex_signature: hexSignature.slice(2), // Remove 0x prefix
            text_signature: textSignature,
          }),
        });

        if (response.ok) {
          registered++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return { registered, failed };
  }

  /**
   * Check if signature exists in 4byte.directory
   */
  private async checkSignatureExists(hexSignature: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://www.4byte.directory/api/v1/signatures/?hex_signature=${hexSignature.slice(2)}`
      );
      const data = await response.json();
      return data.count > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get all registered signatures
   */
  getSignatures(): Map<string, string> {
    return this.signatures;
  }
}

/**
 * Blockchain Service for TigerPalace RWA Ecosystem
 */
export class BlockchainService {
  private provider: ethers.Provider;
  private signer: ethers.Signer | null;
  private contracts: ContractInstances;
  private signatureRegistry: FunctionSignatureRegistry;
  private addresses: ContractAddresses;

  constructor(provider: ethers.Provider, signer: ethers.Signer | null = null, addresses?: ContractAddresses) {
    this.provider = provider;
    this.signer = signer;
    this.addresses = addresses || CONTRACT_ADDRESSES;
    this.signatureRegistry = new FunctionSignatureRegistry();

    // Initialize contracts with proxy addresses
    this.contracts = {
      proxyAdmin: new ethers.Contract(
        this.addresses.ProxyAdmin,
        ProxyAdminABI.abi,
        signer || provider
      ),
      tokenizinToken: new ethers.Contract(
        this.addresses.TokenizinToken,
        TokenizinTokenABI.abi,
        signer || provider
      ),
      rwaAssetRegistry: new ethers.Contract(
        this.addresses.RWAAssetRegistry,
        RWAAssetRegistryABI.abi,
        signer || provider
      ),
      rwaTokenFactory: new ethers.Contract(
        this.addresses.RWATokenFactory,
        RWATokenFactoryABI.abi,
        signer || provider
      ),
      rwaMarketplace: new ethers.Contract(
        this.addresses.RWAMarketplace,
        RWAMarketplaceABI.abi,
        signer || provider
      ),
      rwaStaking: new ethers.Contract(
        this.addresses.RWAStaking,
        RWAStakingABI.abi,
        signer || provider
      ),
      rwaRewardDistributor: new ethers.Contract(
        this.addresses.RWARewardDistributor,
        RWARewardDistributorABI.abi,
        signer || provider
      ),
      rwaRevenue: new ethers.Contract(
        this.addresses.RWARevenue,
        RWARevenueABI.abi,
        signer || provider
      ),
      membershipSystem: new ethers.Contract(
        this.addresses.MembershipSystem,
        MembershipSystemABI.abi,
        signer || provider
      ),
    };
  }

  /**
   * Initialize service and register function signatures
   */
  async initialize(): Promise<void> {
    console.log('🔧 Initializing Blockchain Service...');

    // Register function signatures from all contracts
    await this.signatureRegistry.registerContract('ProxyAdmin', ProxyAdminABI.abi);
    await this.signatureRegistry.registerContract('TokenizinToken', TokenizinTokenABI.abi);
    await this.signatureRegistry.registerContract('RWAAssetRegistry', RWAAssetRegistryABI.abi);
    await this.signatureRegistry.registerContract('RWATokenFactory', RWATokenFactoryABI.abi);
    await this.signatureRegistry.registerContract('RWAMarketplace', RWAMarketplaceABI.abi);
    await this.signatureRegistry.registerContract('RWAStaking', RWAStakingABI.abi);
    await this.signatureRegistry.registerContract('RWARewardDistributor', RWARewardDistributorABI.abi);
    await this.signatureRegistry.registerContract('RWARevenue', RWARevenueABI.abi);
    await this.signatureRegistry.registerContract('MembershipSystem', MembershipSystemABI.abi);

    console.log(`✅ Registered ${this.signatureRegistry.getSignatures().size} function signatures`);

    // Optionally register with 4byte.directory (can be done in background)
    // await this.signatureRegistry.registerWithMetaMask();
  }

  /**
   * Register function signatures with MetaMask (call this once on app startup)
   */
  async registerSignaturesWithMetaMask(): Promise<{ registered: number; failed: number }> {
    console.log('📤 Registering function signatures with 4byte.directory...');
    const result = await this.signatureRegistry.registerWithMetaMask();
    console.log(`✅ Registered: ${result.registered}, Failed: ${result.failed}`);
    return result;
  }

  // ==================== Contract Getters ====================

  getContracts(): ContractInstances {
    return this.contracts;
  }

  getProvider(): ethers.Provider {
    return this.provider;
  }

  getSigner(): ethers.Signer | null {
    return this.signer;
  }

  getAddresses(): ContractAddresses {
    return this.addresses;
  }

  // ==================== Token Operations ====================

  async getTokenBalance(address: string): Promise<string> {
    const balance = await this.contracts.tokenizinToken.balanceOf(address);
    return ethers.formatEther(balance);
  }

  async approveToken(spender: string, amount: string): Promise<void> {
    if (!this.signer) throw new Error('Signer required for transactions');
    const tx = await this.contracts.tokenizinToken.approve(spender, ethers.parseEther(amount));
    await tx.wait();
  }

  // ==================== Asset Registry Operations ====================

  async getAsset(assetId: number): Promise<any> {
    return await this.contracts.rwaAssetRegistry.getAsset(assetId);
  }

  async getAllAssets(): Promise<any[]> {
    return await this.contracts.rwaAssetRegistry.getAllAssets();
  }

  async registerAsset(params: {
    owner: string;
    title: string;
    description: string;
    assetType: string;
    location: string;
    price: bigint;
    tokenPrice: bigint;
    totalTokens: bigint;
  }): Promise<string> {
    if (!this.signer) throw new Error('Signer required for transactions');
    const tx = await this.contracts.rwaAssetRegistry.registerAsset(
      params.owner,
      params.title,
      params.description,
      params.assetType,
      params.location,
      params.price,
      params.tokenPrice,
      params.totalTokens
    );
    const receipt = await tx.wait();
    return receipt.hash;
  }

  // ==================== Marketplace Operations ====================

  async purchaseTokens(assetId: number, tokenAmount: string, value?: string): Promise<string> {
    if (!this.signer) throw new Error('Signer required for transactions');
    const tx = await this.contracts.rwaMarketplace.purchaseTokens(
      assetId,
      ethers.parseEther(tokenAmount),
      { value: value ? ethers.parseEther(value) : undefined }
    );
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async createListing(assetId: number, pricePerToken: string, totalTokens: string): Promise<string> {
    if (!this.signer) throw new Error('Signer required for transactions');
    const tx = await this.contracts.rwaMarketplace.createListing(
      assetId,
      ethers.parseEther(pricePerToken),
      ethers.parseEther(totalTokens)
    );
    const receipt = await tx.wait();
    return receipt.hash;
  }

  // ==================== Staking Operations ====================

  async stake(poolId: number, amount: string): Promise<string> {
    if (!this.signer) throw new Error('Signer required for transactions');
    const tx = await this.contracts.rwaStaking.stake(poolId, ethers.parseEther(amount));
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async claimRewards(stakeId: number): Promise<string> {
    if (!this.signer) throw new Error('Signer required for transactions');
    const tx = await this.contracts.rwaStaking.claimRewards(stakeId);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async getUserStakes(address: string): Promise<any[]> {
    return await this.contracts.rwaStaking.getUserStakes(address);
  }

  async getPendingRewards(address: string, stakeId: number): Promise<string> {
    const rewards = await this.contracts.rwaStaking.getPendingRewards(address, stakeId);
    return ethers.formatEther(rewards);
  }

  async getAllPools(): Promise<any[]> {
    return await this.contracts.rwaStaking.getAllPools();
  }

  // ==================== Revenue Operations ====================

  async getRevenueStats(): Promise<any> {
    return await this.contracts.rwaRevenue.getRevenueStats();
  }

  // ==================== Reward Distributor Operations ====================

  async getRewardPoolStats(): Promise<any> {
    return await this.contracts.rwaRewardDistributor.getRewardPoolStats();
  }

  // ==================== Membership Operations ====================

  async getMembershipLevel(address: string): Promise<any> {
    return await this.contracts.membershipSystem.getMembershipLevel(address);
  }
}

/**
 * Initialize blockchain service with MetaMask
 */
export async function initializeBlockchainService(): Promise<BlockchainService> {
  if (typeof window !== 'undefined' && !(window as any).ethereum) {
    throw new Error('MetaMask not found. Please install MetaMask extension.');
  }

  const provider = new ethers.BrowserProvider((window as any)?.ethereum);
  const signer = await provider.getSigner();
  const service = new BlockchainService(provider, signer);

  await service.initialize();

  // Register signatures with MetaMask (optional - can be done in background)
  await service.registerSignaturesWithMetaMask();

  return service;
}

