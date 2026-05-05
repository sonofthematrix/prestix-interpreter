/**
 * Blockchain Service with Web3.js Integration
 * 
 * Provides a unified service for interacting with TigerPalace RWA contracts using Web3.js.
 * Includes MetaMask function signature registration for transaction decoding.
 * 
 * Usage:
 *   import { BlockchainServiceWeb3 } from './blockchain-service-web3';
 *   const service = new BlockchainServiceWeb3(web3, account);
 *   await service.initialize();
 */

import Web3 from 'web3';
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
  proxyAdmin: any;
  tokenizinToken: any;
  rwaAssetRegistry: any;
  rwaTokenFactory: any;
  rwaMarketplace: any;
  rwaStaking: any;
  rwaRewardDistributor: any;
  rwaRevenue: any;
  membershipSystem: any;
}

/**
 * Register function signatures with MetaMask for transaction decoding
 */
export class FunctionSignatureRegistryWeb3 {
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

        // Calculate function selector using Web3
        const web3 = new Web3();
        const hash = web3.utils.keccak256(textSignature);
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
      return (data as { count: number })?.count > 0;
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
 * Blockchain Service for TigerPalace RWA Ecosystem (Web3.js version)
 */
export class BlockchainServiceWeb3 {
  private web3: Web3;
  private account: string;
  private contracts: ContractInstances;
  private signatureRegistry: FunctionSignatureRegistryWeb3;
  private addresses: ContractAddresses;

  constructor(web3: Web3, account: string, addresses?: ContractAddresses) {
    this.web3 = web3;
    this.account = account;
    this.addresses = addresses || CONTRACT_ADDRESSES;
    this.signatureRegistry = new FunctionSignatureRegistryWeb3();

    // Initialize contracts with proxy addresses
    this.contracts = {
      proxyAdmin: new web3.eth.Contract(ProxyAdminABI.abi as any, this.addresses.ProxyAdmin),
      tokenizinToken: new web3.eth.Contract(TokenizinTokenABI.abi as any, this.addresses.TokenizinToken),
      rwaAssetRegistry: new web3.eth.Contract(RWAAssetRegistryABI.abi as any, this.addresses.RWAAssetRegistry),
      rwaTokenFactory: new web3.eth.Contract(RWATokenFactoryABI.abi as any, this.addresses.RWATokenFactory),
      rwaMarketplace: new web3.eth.Contract(RWAMarketplaceABI.abi as any, this.addresses.RWAMarketplace),
      rwaStaking: new web3.eth.Contract(RWAStakingABI.abi as any, this.addresses.RWAStaking),
      rwaRewardDistributor: new web3.eth.Contract(RWARewardDistributorABI.abi as any, this.addresses.RWARewardDistributor),
      rwaRevenue: new web3.eth.Contract(RWARevenueABI.abi as any, this.addresses.RWARevenue),
      membershipSystem: new web3.eth.Contract(MembershipSystemABI.abi as any, this.addresses.MembershipSystem),
    };
  }

  /**
   * Initialize service and register function signatures
   */
  async initialize(): Promise<void> {
    console.log('🔧 Initializing Blockchain Service (Web3.js)...');

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

  getWeb3(): Web3 {
    return this.web3;
  }

  getAccount(): string {
    return this.account;
  }

  getAddresses(): ContractAddresses {
    return this.addresses;
  }

  // ==================== Token Operations ====================

  async getTokenBalance(address: string): Promise<string> {
    const balance = await this.contracts.tokenizinToken.methods.balanceOf(address).call();
    return this.web3.utils.fromWei(balance, 'ether');
  }

  async approveToken(spender: string, amount: string): Promise<string> {
    const tx = await this.contracts.tokenizinToken.methods
      .approve(spender, this.web3.utils.toWei(amount, 'ether'))
      .send({ from: this.account });
    return tx.transactionHash;
  }

  // ==================== Asset Registry Operations ====================

  async getAsset(assetId: number): Promise<any> {
    return await this.contracts.rwaAssetRegistry.methods.getAsset(assetId).call();
  }

  async getAllAssets(): Promise<any[]> {
    return await this.contracts.rwaAssetRegistry.methods.getAllAssets().call();
  }

  async registerAsset(params: {
    owner: string;
    title: string;
    description: string;
    assetType: string;
    location: string;
    price: string;
    tokenPrice: string;
    totalTokens: string;
  }): Promise<string> {
    const tx = await this.contracts.rwaAssetRegistry.methods
      .registerAsset(
        params.owner,
        params.title,
        params.description,
        params.assetType,
        params.location,
        this.web3.utils.toWei(params.price, 'ether'),
        this.web3.utils.toWei(params.tokenPrice, 'ether'),
        this.web3.utils.toWei(params.totalTokens, 'ether')
      )
      .send({ from: this.account });
    return tx.transactionHash;
  }

  // ==================== Marketplace Operations ====================

  async purchaseTokens(assetId: number, tokenAmount: string, value?: string): Promise<string> {
    const tx = await this.contracts.rwaMarketplace.methods
      .purchaseTokens(assetId, this.web3.utils.toWei(tokenAmount, 'ether'))
      .send({
        from: this.account,
        value: value ? this.web3.utils.toWei(value, 'ether') : '0',
      });
    return tx.transactionHash;
  }

  async createListing(assetId: number, pricePerToken: string, totalTokens: string): Promise<string> {
    const tx = await this.contracts.rwaMarketplace.methods
      .createListing(
        assetId,
        this.web3.utils.toWei(pricePerToken, 'ether'),
        this.web3.utils.toWei(totalTokens, 'ether')
      )
      .send({ from: this.account });
    return tx.transactionHash;
  }

  // ==================== Staking Operations ====================

  async stake(poolId: number, amount: string): Promise<string> {
    const tx = await this.contracts.rwaStaking.methods
      .stake(poolId, this.web3.utils.toWei(amount, 'ether'))
      .send({ from: this.account });
    return tx.transactionHash;
  }

  async claimRewards(stakeId: number): Promise<string> {
    const tx = await this.contracts.rwaStaking.methods.claimRewards(stakeId).send({ from: this.account });
    return tx.transactionHash;
  }

  async getUserStakes(address: string): Promise<any[]> {
    return await this.contracts.rwaStaking.methods.getUserStakes(address).call();
  }

  async getPendingRewards(address: string, stakeId: number): Promise<string> {
    const rewards = await this.contracts.rwaStaking.methods.getPendingRewards(address, stakeId).call();
    return this.web3.utils.fromWei(rewards, 'ether');
  }

  async getAllPools(): Promise<any[]> {
    return await this.contracts.rwaStaking.methods.getAllPools().call();
  }

  // ==================== Revenue Operations ====================

  async getRevenueStats(): Promise<any> {
    return await this.contracts.rwaRevenue.methods.getRevenueStats().call();
  }

  // ==================== Reward Distributor Operations ====================

  async getRewardPoolStats(): Promise<any> {
    return await this.contracts.rwaRewardDistributor.methods.getRewardPoolStats().call();
  }

  // ==================== Membership Operations ====================

  async getMembershipLevel(address: string): Promise<any> {
    return await this.contracts.membershipSystem.methods.getMembershipLevel(address).call();
  }
}

/**
 * Initialize blockchain service with Web3 and MetaMask
 */
export async function initializeBlockchainServiceWeb3(): Promise<BlockchainServiceWeb3> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('MetaMask not found. Please install MetaMask extension.');
  }

  const web3 = new Web3((window as any).ethereum);
  
  // Request account access
  const accounts = await web3.eth.requestAccounts();
  const account = accounts[0];

  const service = new BlockchainServiceWeb3(web3, account);
  await service.initialize();

  // Register signatures with MetaMask
  await service.registerSignaturesWithMetaMask();

  return service;
}

