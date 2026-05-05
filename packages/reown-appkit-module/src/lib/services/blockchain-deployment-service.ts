/**
 * Blockchain Deployment Service
 * 
 * Handles smart contract deployment to Sepolia Testnet via Hardhat
 * Only ADMIN users with matching wallet addresses can deploy
 */

// Hardhat imports - hardhat is optional dependency
// @ts-expect-error - hardhat may not be installed, ethers/upgrades come from plugins
import { ethers, upgrades } from 'hardhat';
import { ContractTransactionResponse } from 'ethers';
import fs from 'fs';
import path from 'path';
import { createClient } from '@/lib/db';
import type { AuthUser } from '@/lib/auth';

export interface DeploymentConfig {
  contractType: 'REGISTRY' | 'FACTORY' | 'MARKETPLACE' | 'MEMBERSHIP';
  networkId: string;
  deployerAddress: string;
  deploymentParams?: Record<string, any>;
}

export interface DeploymentResult {
  contractAddress: string;
  implementationAddress?: string;
  proxyAdminAddress?: string;
  deploymentTx: string;
  deploymentBlock: bigint;
  network: string;
  chainId: number;
  abi: any[];
  explorerUrl: string;
}

export class BlockchainDeploymentService {
  /**
   * Verify admin deployment permissions
   */
  static async verifyAdminPermissions(user: AuthUser): Promise<{
    wallet: ethers.Wallet;
    privateKey: string;
  }> {
    // 1. Check role
    if (user.role !== 'ADMIN') {
      throw new Error('Admin role required for contract deployment');
    }

    // 2. Check wallet address
    const adminWallet = process.env.ADMIN_WALLET_ADDRESS;
    if (!adminWallet) {
      throw new Error('ADMIN_WALLET_ADDRESS not configured');
    }

    const userWalletAddress = user.walletAddress?.toLowerCase();
    if (!userWalletAddress || userWalletAddress !== adminWallet.toLowerCase()) {
      throw new Error(
        `Wallet address mismatch. Expected: ${adminWallet}, Got: ${userWalletAddress || 'none'}`
      );
    }

    // 3. Check private key
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('PRIVATE_KEY not configured');
    }

    // 4. Verify wallet matches private key
    const wallet = new ethers.Wallet(privateKey);
    if (wallet.address.toLowerCase() !== adminWallet.toLowerCase()) {
      throw new Error('Private key does not match wallet address');
    }

    return { wallet, privateKey };
  }

  /**
   * Deploy contract to Sepolia Testnet
   */
  static async deployContract(
    config: DeploymentConfig,
    user: AuthUser
  ): Promise<DeploymentResult> {
    // Verify admin permissions
    const { wallet } = await this.verifyAdminPermissions(user);

    // Load network configuration
    const network = await ethers.provider.getNetwork();
    if (network.chainId !== BigInt(11155111)) {
      throw new Error(`Invalid network. Expected Sepolia (11155111), got ${network.chainId}`);
    }

    // Get network info from database
    const db = await createClient(user);
    const networkConfig = await db.blockchainNetwork.findUnique({
      where: { chainId: Number(network.chainId) },
    });

    if (!networkConfig) {
      throw new Error(`Network configuration not found for chain ID ${network.chainId}`);
    }

    // Deploy based on contract type
    let result: DeploymentResult;

    switch (config.contractType) {
      case 'REGISTRY':
        result = await this.deployRegistry(config, wallet, networkConfig.explorerUrl);
        break;
      case 'FACTORY':
        result = await this.deployFactory(config, wallet, networkConfig.explorerUrl);
        break;
      case 'MARKETPLACE':
        result = await this.deployMarketplace(config, wallet, networkConfig.explorerUrl);
        break;
      case 'MEMBERSHIP':
        result = await this.deployMembership(config, wallet, networkConfig.explorerUrl);
        break;
      default:
        throw new Error(`Unknown contract type: ${config.contractType}`);
    }

    // Save to database
    await this.saveDeploymentRecord(result, config, user, networkConfig.id);

    return result;
  }

  /**
   * Deploy RWAAssetRegistryUpgradeable
   */
  private static async deployRegistry(
    config: DeploymentConfig,
    wallet: ethers.Wallet,
    explorerUrl: string
  ): Promise<DeploymentResult> {
    console.log('🚀 Deploying RWAAssetRegistryUpgradeable...');

    const Registry = await ethers.getContractFactory('RWAAssetRegistryUpgradeable');
    const registry = await upgrades.deployProxy(
      Registry,
      [wallet.address],
      {
        kind: 'transparent',
        initializer: 'initialize',
      }
    );

    await registry.waitForDeployment();
    const proxyAddress = await registry.getAddress();
    const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    const proxyAdminAddress = await upgrades.erc1967.getAdminAddress(proxyAddress);

    const deployTx = registry.deploymentTransaction();
    if (!deployTx) {
      throw new Error('Deployment transaction not found');
    }

    const receipt = await deployTx.wait();
    const deploymentBlock = receipt?.blockNumber || BigInt(0);

    // Load ABI
    const abi = await this.loadContractABI('RWAAssetRegistryUpgradeable');

    return {
      contractAddress: proxyAddress,
      implementationAddress,
      proxyAdminAddress,
      deploymentTx: deployTx.hash,
      deploymentBlock,
      network: 'sepolia',
      chainId: 11155111,
      abi,
      explorerUrl: `${explorerUrl}/address/${proxyAddress}`,
    };
  }

  /**
   * Deploy RWATokenFactoryUpgradeable
   */
  private static async deployFactory(
    config: DeploymentConfig,
    wallet: ethers.Wallet,
    explorerUrl: string
  ): Promise<DeploymentResult> {
    console.log('🚀 Deploying RWATokenFactoryUpgradeable...');

    const Factory = await ethers.getContractFactory('RWATokenFactoryUpgradeable');
    const factory = await upgrades.deployProxy(
      Factory,
      [wallet.address],
      {
        kind: 'transparent',
        initializer: 'initialize',
      }
    );

    await factory.waitForDeployment();
    const proxyAddress = await factory.getAddress();
    const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    const proxyAdminAddress = await upgrades.erc1967.getAdminAddress(proxyAddress);

    const deployTx = factory.deploymentTransaction();
    if (!deployTx) {
      throw new Error('Deployment transaction not found');
    }

    const receipt = await deployTx.wait();
    const deploymentBlock = receipt?.blockNumber || BigInt(0);

    // Load ABI
    const abi = await this.loadContractABI('RWATokenFactoryUpgradeable');

    return {
      contractAddress: proxyAddress,
      implementationAddress,
      proxyAdminAddress,
      deploymentTx: deployTx.hash,
      deploymentBlock,
      network: 'sepolia',
      chainId: 11155111,
      abi,
      explorerUrl: `${explorerUrl}/address/${proxyAddress}`,
    };
  }

  /**
   * Deploy RWAMarketplaceUpgradeable
   */
  private static async deployMarketplace(
    config: DeploymentConfig,
    wallet: ethers.Wallet,
    explorerUrl: string
  ): Promise<DeploymentResult> {
    console.log('🚀 Deploying RWAMarketplaceUpgradeable...');

    // Get registry and factory addresses from config
    const registryAddress = config.deploymentParams?.registryAddress;
    const factoryAddress = config.deploymentParams?.factoryAddress;
    const feeRecipient = config.deploymentParams?.feeRecipient || process.env.FEE_RECIPIENT || wallet.address;

    if (!registryAddress || !factoryAddress) {
      throw new Error('Registry and Factory addresses required for Marketplace deployment');
    }

    const Marketplace = await ethers.getContractFactory('RWAMarketplaceUpgradeable');
    const marketplace = await upgrades.deployProxy(
      Marketplace,
      [registryAddress, factoryAddress, feeRecipient, wallet.address],
      {
        kind: 'transparent',
        initializer: 'initialize',
      }
    );

    await marketplace.waitForDeployment();
    const proxyAddress = await marketplace.getAddress();
    const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    const proxyAdminAddress = await upgrades.erc1967.getAdminAddress(proxyAddress);

    const deployTx = marketplace.deploymentTransaction();
    if (!deployTx) {
      throw new Error('Deployment transaction not found');
    }

    const receipt = await deployTx.wait();
    const deploymentBlock = receipt?.blockNumber || BigInt(0);

    // Configure permissions
    const registry = await ethers.getContractAt('RWAAssetRegistryUpgradeable', registryAddress);
    const factory = await ethers.getContractAt('RWATokenFactoryUpgradeable', factoryAddress);

    // Grant marketplace role to marketplace contract
    const addMarketplaceTx = await registry.addMarketplace(proxyAddress);
    await addMarketplaceTx.wait();
    console.log('🔐 Granted MARKETPLACE_ROLE to marketplace on registry');

    // Grant token creator role to marketplace
    const addTokenCreatorTx = await factory.addTokenCreator(proxyAddress);
    await addTokenCreatorTx.wait();
    console.log('🔐 Granted TOKEN_CREATOR_ROLE to marketplace on factory');

    // Optional: Set marketplace fee
    const marketplaceFeeBps = config.deploymentParams?.marketplaceFeeBps || process.env.MARKETPLACE_FEE_BPS;
    if (marketplaceFeeBps) {
      const setFeeTx = await marketplace.setMarketplaceFee(parseInt(marketplaceFeeBps));
      await setFeeTx.wait();
      console.log(`💸 Marketplace fee set to ${marketplaceFeeBps} bps`);
    }

    // Load ABI
    const abi = await this.loadContractABI('RWAMarketplaceUpgradeable');

    return {
      contractAddress: proxyAddress,
      implementationAddress,
      proxyAdminAddress,
      deploymentTx: deployTx.hash,
      deploymentBlock,
      network: 'sepolia',
      chainId: 11155111,
      abi,
      explorerUrl: `${explorerUrl}/address/${proxyAddress}`,
    };
  }

  /**
   * Deploy MembershipSystemUpgradeable
   */
  private static async deployMembership(
    config: DeploymentConfig,
    wallet: ethers.Wallet,
    explorerUrl: string
  ): Promise<DeploymentResult> {
    console.log('🚀 Deploying MembershipSystemUpgradeable...');

    const Membership = await ethers.getContractFactory('MembershipSystemUpgradeable');
    const membership = await upgrades.deployProxy(
      Membership,
      [wallet.address],
      {
        kind: 'transparent',
        initializer: 'initialize',
      }
    );

    await membership.waitForDeployment();
    const proxyAddress = await membership.getAddress();
    const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    const proxyAdminAddress = await upgrades.erc1967.getAdminAddress(proxyAddress);

    const deployTx = membership.deploymentTransaction();
    if (!deployTx) {
      throw new Error('Deployment transaction not found');
    }

    const receipt = await deployTx.wait();
    const deploymentBlock = receipt?.blockNumber || BigInt(0);

    // Load ABI
    const abi = await this.loadContractABI('MembershipSystemUpgradeable');

    return {
      contractAddress: proxyAddress,
      implementationAddress,
      proxyAdminAddress,
      deploymentTx: deployTx.hash,
      deploymentBlock,
      network: 'sepolia',
      chainId: 11155111,
      abi,
      explorerUrl: `${explorerUrl}/address/${proxyAddress}`,
    };
  }

  /**
   * Load contract ABI from artifacts
   */
  private static async loadContractABI(contractName: string): Promise<any[]> {
    try {
      const artifactsPath = path.join(
        process.cwd(),
        'smart-contracts',
        'artifacts',
        'contracts',
        '**',
        `${contractName}.json`
      );

      const files = await fs.promises.readdir(
        path.join(process.cwd(), 'smart-contracts', 'artifacts', 'contracts'),
        { recursive: true }
      );

      const contractFile = files.find((f) => f.includes(contractName) && f.endsWith('.json'));

      if (!contractFile) {
        throw new Error(`ABI not found for ${contractName}`);
      }

      const fullPath = path.join(
        process.cwd(),
        'smart-contracts',
        'artifacts',
        'contracts',
        contractFile
      );

      const artifact = JSON.parse(await fs.promises.readFile(fullPath, 'utf-8'));
      return artifact.abi || [];
    } catch (error) {
      console.error(`Failed to load ABI for ${contractName}:`, error);
      return [];
    }
  }

  /**
   * Save deployment record to database
   */
  private static async saveDeploymentRecord(
    result: DeploymentResult,
    config: DeploymentConfig,
    user: AuthUser,
    networkId: string
  ): Promise<void> {
    const db = await createClient(user);

    // Calculate ABI hash for versioning
    const abiHash = this.calculateABIHash(result.abi);

    await db.deployedContract.create({
      data: {
        networkId,
        contractType: config.contractType,
        contractName: this.getContractName(config.contractType),
        contractAddress: result.contractAddress,
        isUpgradeable: true,
        proxyType: 'TRANSPARENT',
        implementationAddress: result.implementationAddress,
        proxyAdminAddress: result.proxyAdminAddress,
        deployedBy: user.walletAddress || config.deployerAddress,
        deploymentTx: result.deploymentTx,
        deploymentBlock: result.deploymentBlock,
        deployedAt: new Date(),
        abiHash,
        version: '1.0.0',
        isActive: true,
        isVerified: false,
        adminAddresses: [user.walletAddress || config.deployerAddress] as any,
      },
    });
  }

  /**
   * Calculate hash of ABI for versioning
   */
  private static calculateABIHash(abi: any[]): string {
    const abiString = JSON.stringify(abi);
    // Simple hash - in production, use crypto.createHash('sha256')
    return Buffer.from(abiString).toString('base64').substring(0, 32);
  }

  /**
   * Get contract name from type
   */
  private static getContractName(contractType: string): string {
    const names: Record<string, string> = {
      REGISTRY: 'RWAAssetRegistryUpgradeable',
      FACTORY: 'RWATokenFactoryUpgradeable',
      MARKETPLACE: 'RWAMarketplaceUpgradeable',
      MEMBERSHIP: 'MembershipSystemUpgradeable',
    };
    return names[contractType] || contractType;
  }
}

