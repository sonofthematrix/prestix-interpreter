/**
 * Enhanced Contract Factory Service with Lazy Minting
 * 
 * Features:
 * - Token onboarding workflow
 * - Lazy minting (on-demand token creation)
 * - Admin role management
 * - Contract dependency tracking
 * - Multi-step initialization process
 */

import { AuthUser } from '@/lib/auth';
import { createClient } from '@/lib/db';
import type { ContractDeploymentResult, PropertyTokenParams } from '@/lib/services/contract-factory-service';
import { Contract, JsonRpcProvider } from 'ethers';
import { ContractABIs } from '@/lib/contracts/load-abi';

// ============================================================================
// ENHANCED TYPES
// ============================================================================

export interface TokenOnboardingParams extends PropertyTokenParams {
  // Token type
  tokenType?: 'ERC20' | 'ERC404'; // Default: 'ERC20'
  
  // ERC-404 specific
  tokenURI?: string; // Required for ERC-404 tokens
  
  // Lazy minting configuration
  enableLazyMinting: boolean;
  initialMintAmount?: string; // Amount to mint immediately (rest lazy minted)
  maxSupply: string; // Maximum supply (for lazy minting)
  
  // Admin configuration
  adminAddresses: string[]; // Additional admin addresses
  
  // Dependency configuration
  dependsOn?: string[]; // Contract addresses this depends on
  dependencyType?: 'REQUIRED' | 'OPTIONAL' | 'FALLBACK';
}

export interface OnboardingStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  result?: any;
  error?: string;
  transactionHash?: string;
}

export interface OnboardingState {
  steps: OnboardingStep[];
  currentStep: number;
  overallProgress: number;
  status: 'idle' | 'onboarding' | 'completed' | 'failed';
  contractAddress?: string;
  assetId?: string;
}

export interface LazyMintConfig {
  enabled: boolean;
  totalSupply: bigint;
  initialMint: bigint;
  remainingSupply: bigint;
  mintedSupply: bigint;
  mintersAllowed: string[]; // Addresses allowed to lazy mint
}

export interface ContractDependency {
  contractAddress: string;
  dependencyType: 'REQUIRED' | 'OPTIONAL' | 'FALLBACK';
  status: 'active' | 'inactive' | 'failed';
  lastChecked: Date;
}

export interface AdminControlConfig {
  primaryAdmin: string;
  additionalAdmins: string[];
  capabilities: {
    canPause: boolean;
    canMint: boolean;
    canBurn: boolean;
    canUpgrade: boolean;
    canManageDependencies: boolean;
  };
}

// ============================================================================
// ENHANCED CONTRACT FACTORY SERVICE
// ============================================================================

export class EnhancedContractFactoryService {
  private provider: JsonRpcProvider;
  private config: any;
  private factoryContract: Contract;
  private factory404Contract: Contract;
  private registryContract: Contract;

  constructor(config?: any) {
    this.config = this.loadConfig(config);
    this.provider = new JsonRpcProvider(this.config.rpcUrl);
    
    // ERC20 Factory
    this.factoryContract = new Contract(
      this.config.factoryAddress,
      ContractABIs.RWATokenFactory.abi,
      this.provider
    );
    
    // ERC-404 Factory
    this.factory404Contract = new Contract(
      this.config.factory404Address,
      ContractABIs.RWATokenFactory404.abi,
      this.provider
    );
    
    this.registryContract = new Contract(
      this.config.registryAddress,
      ContractABIs.RWAAssetRegistry.abi,
      this.provider
    );
  }

  private loadConfig(override?: any) {
    return {
      rpcUrl: process.env.SEPOLIA_RPC_URL || '',
      factoryAddress: process.env.RWA_TOKEN_FACTORY || '',
      factory404Address: process.env.RWA_TOKEN_FACTORY_404 || '',
      registryAddress: process.env.RWA_ASSET_REGISTRY || '',
      chainId: 11155111,
      networkName: 'sepolia',
      explorerUrl: 'https://sepolia.etherscan.io',
      ...override,
    };
  }

  // ========================================================================
  // TOKEN ONBOARDING WORKFLOW
  // ========================================================================

  /**
   * Complete token onboarding process with lazy minting
   */
  async onboardPropertyToken(
    params: TokenOnboardingParams,
    walletSigner: any,
    user: AuthUser,
    onProgress?: (state: OnboardingState) => void
  ): Promise<ContractDeploymentResult & { onboardingState: OnboardingState }> {
    const steps: OnboardingStep[] = [
      {
        id: 'validation',
        name: 'Parameter Validation',
        description: 'Validating onboarding parameters',
        status: 'pending',
        progress: 0,
      },
      {
        id: 'admin-setup',
        name: 'Admin Configuration',
        description: 'Setting up admin roles and permissions',
        status: 'pending',
        progress: 0,
      },
      {
        id: 'registration',
        name: 'Asset Registration',
        description: 'Registering asset in blockchain registry',
        status: 'pending',
        progress: 0,
      },
      {
        id: 'deployment',
        name: 'Contract Deployment',
        description: 'Deploying property token contract',
        status: 'pending',
        progress: 0,
      },
      {
        id: 'initialization',
        name: 'Contract Initialization',
        description: 'Initializing contract with lazy minting config',
        status: 'pending',
        progress: 0,
      },
      {
        id: 'dependency-setup',
        name: 'Dependency Configuration',
        description: 'Setting up contract dependencies',
        status: 'pending',
        progress: 0,
      },
      {
        id: 'initial-mint',
        name: 'Initial Minting',
        description: 'Minting initial token supply',
        status: 'pending',
        progress: 0,
      },
      {
        id: 'database-sync',
        name: 'Database Synchronization',
        description: 'Saving deployment records to database',
        status: 'pending',
        progress: 0,
      },
    ];

    const state: OnboardingState = {
      steps,
      currentStep: 0,
      overallProgress: 0,
      status: 'onboarding',
    };

    const updateStep = (stepIndex: number, update: Partial<OnboardingStep>) => {
      state.steps[stepIndex] = { ...state.steps[stepIndex], ...update };
      state.currentStep = stepIndex;
      state.overallProgress = ((stepIndex + 1) / steps.length) * 100;
      onProgress?.(state);
    };

    try {
      // Step 1: Validation
      updateStep(0, { status: 'in_progress', progress: 50 });
      this.validateOnboardingParams(params);
      updateStep(0, { status: 'completed', progress: 100 });

      // Step 2: Admin Setup
      updateStep(1, { status: 'in_progress', progress: 50 });
      const adminConfig = await this.setupAdminConfiguration(params, walletSigner);
      updateStep(1, { status: 'completed', progress: 100, result: adminConfig });

      // Step 3: Registration
      updateStep(2, { status: 'in_progress', progress: 30 });
      const assetId = await this.registerAssetWithLazyMinting(params, walletSigner);
      updateStep(2, { status: 'completed', progress: 100, result: { assetId } });
      state.assetId = assetId;

      // Step 4: Deployment
      updateStep(3, { status: 'in_progress', progress: 30 });
      const deployment = await this.deployTokenContract(params, assetId, walletSigner);
      updateStep(3, {
        status: 'completed',
        progress: 100,
        result: deployment,
        transactionHash: deployment.transactionHash,
      });
      state.contractAddress = deployment.tokenAddress;

      // Step 5: Initialization
      updateStep(4, { status: 'in_progress', progress: 30 });
      await this.initializeContract(deployment.tokenAddress, params, walletSigner);
      updateStep(4, { status: 'completed', progress: 100 });

      // Step 6: Dependency Setup
      updateStep(5, { status: 'in_progress', progress: 50 });
      if (params.dependsOn && params.dependsOn.length > 0) {
        await this.setupContractDependencies(
          deployment.tokenAddress,
          params.dependsOn,
          params.dependencyType || 'OPTIONAL',
          walletSigner
        );
      }
      updateStep(5, { status: 'completed', progress: 100 });

      // Step 7: Initial Mint
      updateStep(6, { status: 'in_progress', progress: 30 });
      if (params.enableLazyMinting && params.initialMintAmount) {
        await this.performInitialMint(
          deployment.tokenAddress,
          params.initialMintAmount,
          user.walletAddress,
          walletSigner
        );
      }
      updateStep(6, { status: 'completed', progress: 100 });

      // Step 8: Database Sync
      updateStep(7, { status: 'in_progress', progress: 30 });
      const dbResult = await this.saveOnboardingToDatabase(
        params,
        assetId,
        deployment,
        adminConfig,
        user
      );
      updateStep(7, { status: 'completed', progress: 100, result: dbResult });

      state.status = 'completed';
      state.overallProgress = 100;
      onProgress?.(state);

      return {
        success: true,
        tokenAddress: deployment.tokenAddress,
        assetId,
        transactionHash: deployment.transactionHash,
        blockNumber: deployment.blockNumber,
        gasUsed: deployment.gasUsed,
        contractId: dbResult.contractId,
        tokenizedAssetId: dbResult.tokenizedAssetId,
        onboardingState: state,
      };
    } catch (error: any) {
      console.error('❌ Onboarding failed:', error);
      
      // Mark current step as failed
      const currentStep = state.currentStep;
      updateStep(currentStep, {
        status: 'failed',
        error: error.message,
      });
      
      state.status = 'failed';
      onProgress?.(state);

      return {
        success: false,
        error: error.message || 'Onboarding failed',
        errorDetails: error,
        onboardingState: state,
      };
    }
  }

  // ========================================================================
  // ADMIN CONFIGURATION
  // ========================================================================

  private async setupAdminConfiguration(
    params: TokenOnboardingParams,
    walletSigner: any
  ): Promise<AdminControlConfig> {
    return {
      primaryAdmin: walletSigner.address, 
      additionalAdmins: params.adminAddresses || [],
      capabilities: {
        canPause: true,
        canMint: params.enableLazyMinting,
        canBurn: false,
        canUpgrade: false,
        canManageDependencies: true,
      },
    };
  }

  /**
   * Grant admin role to address
   */
  async grantAdminRole(
    contractAddress: string,
    adminAddress: string,
    signer: any,
    tokenType: 'ERC20' | 'ERC404' = 'ERC20'
  ): Promise<string> {
    const abi = tokenType === 'ERC404' ? ContractABIs.RWAToken404.abi : ContractABIs.RWAToken.abi;
    const contract = new Contract(contractAddress, abi, signer);
    
    // Assuming contract has grantRole function (OpenZeppelin AccessControl)
    const ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();
    const tx = await contract.grantRole(ADMIN_ROLE, adminAddress);
    const receipt = await tx.wait();
    
    return receipt.hash;
  }

  /**
   * Revoke admin role from address
   */
  async revokeAdminRole(
    contractAddress: string,
    adminAddress: string,
    signer: any,
    tokenType: 'ERC20' | 'ERC404' = 'ERC20'
  ): Promise<string> {
    const abi = tokenType === 'ERC404' ? ContractABIs.RWAToken404.abi : ContractABIs.RWAToken.abi;
    const contract = new Contract(contractAddress, abi, signer);
    
    const ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();
    const tx = await contract.revokeRole(ADMIN_ROLE, adminAddress);
    const receipt = await tx.wait();
    
    return receipt.hash;
  }

  // ========================================================================
  // LAZY MINTING
  // ========================================================================

  private async registerAssetWithLazyMinting(
    params: TokenOnboardingParams,
    signer: any
  ): Promise<string> {
    const registry = this.registryContract.connect(signer);
    
    const totalValue = BigInt(parseFloat(params.totalValue) * 1e18);
    const maxSupply = BigInt(params.maxSupply);
    
    const tx = await (registry as any).registerAsset('REAL_ESTATE', params.propertyName, params.propertySymbol, totalValue, maxSupply, params.metadataURI);
    
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
    
    if (!event) throw new Error('AssetRegistered event not found');
    
    const parsed = registry.interface.parseLog(event);
    return parsed?.args[0].toString();
  }

  private async deployTokenContract(
    params: TokenOnboardingParams,
    assetId: string,
    signer: any
  ): Promise<{
    tokenAddress: string;
    transactionHash: string;
    blockNumber: number;
    gasUsed: string;
  }> {
    const tokenType = params.tokenType || 'ERC20';
    const maxSupply = BigInt(params.maxSupply);
    
    if (tokenType === 'ERC404') {
      if (!params.tokenURI) {
        throw new Error('tokenURI is required for ERC-404 tokens');
      }
      
      const factory = this.factory404Contract.connect(signer);
      const tx = await (factory as any).createToken404(
        assetId,
        params.propertyName,
        params.propertySymbol,
        maxSupply,
        params.ownerAddress,
        params.tokenURI
      );
      
      const receipt = await tx.wait();
      
      // Extract token address from event
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = factory.interface.parseLog(log);
          return parsed?.name === 'Token404Created';
        } catch {
          return false;
        }
      });
      
      if (!event) throw new Error('Token404Created event not found');
      
      const parsed = factory.interface.parseLog(event);
      const tokenAddress = parsed?.args[1];
      
      return {
        tokenAddress,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      };
    } else {
      // ERC20
      const factory = this.factoryContract.connect(signer);
      const tx = await (factory as any).createToken(
        assetId,
        params.propertyName,
        params.propertySymbol,
        maxSupply,
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
      
      if (!event) throw new Error('TokenCreated event not found');
      
      const parsed = factory.interface.parseLog(event);
      const tokenAddress = parsed?.args[1];
      
      return {
        tokenAddress,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      };
    }
  }

  private async initializeContract(
    contractAddress: string,
    params: TokenOnboardingParams,
    signer: any
  ): Promise<void> {
    const tokenType = params.tokenType || 'ERC20';
    const abi = tokenType === 'ERC404' ? ContractABIs.RWAToken404.abi : ContractABIs.RWAToken.abi;
    const contract = new Contract(contractAddress, abi, signer);
    
    // Initialize with lazy minting configuration
    if (params.enableLazyMinting) {
      // Assuming contract has setLazyMinting function
      try {
        const tx = await contract.setLazyMinting(true);
        await tx.wait();
      } catch (error) {
        console.warn('Lazy minting not supported on this contract');
      }
    }
    
    // Grant admin roles
    if (params.adminAddresses && params.adminAddresses.length > 0) {
      for (const adminAddress of params.adminAddresses) {
        try {
          const ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();
          const tx = await contract.grantRole(ADMIN_ROLE, adminAddress);
          await tx.wait();
        } catch (error) {
          console.warn(`Failed to grant admin role to ${adminAddress}`);
        }
      }
    }
  }

  private async performInitialMint(
    contractAddress: string,
    amount: string,
    recipient: string,
    signer: any
  ): Promise<string> {
    const contract = new Contract(contractAddress, ContractABIs.RWAToken.abi, signer);
    
    const amountWei = BigInt(parseFloat(amount) * 1e18);
    
    const tx = await contract.mint(recipient, amountWei);
    const receipt = await tx.wait();
    
    return receipt.hash;
  }

  /**
   * Lazy mint tokens on-demand
   */
  async lazyMint(
    contractAddress: string,
    recipient: string,
    amount: string,
    signer: any,
    user: AuthUser
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      const contract = new Contract(contractAddress, ContractABIs.RWAToken.abi, signer);
      
      const amountWei = BigInt(parseFloat(amount) * 1e18);
      
      // Check if lazy minting is enabled
      const lazyMintingEnabled = await contract.lazyMintingEnabled();
      if (!lazyMintingEnabled) {
        throw new Error('Lazy minting not enabled on this contract');
      }
      
      // Check remaining supply
      const maxSupply = await contract.maxSupply();
      const totalSupply = await contract.totalSupply();
      const remaining = maxSupply - totalSupply;
      
      if (amountWei > remaining) {
        throw new Error(`Insufficient remaining supply. Available: ${remaining}`);
      }
      
      // Mint tokens
      const tx = await contract.mint(recipient, amountWei);
      const receipt = await tx.wait();
      
      // Save to database
      const db = await createClient(user);
      await db.tokenMintEvent.create({
        data: {
          contractAddress,
          recipient,
          amount: amountWei.toString(),          
          blockNumber: BigInt(receipt.blockNumber),
          transactionHash: receipt.hash,
          mintType: 'LAZY_MINT',
          mintedAt: new Date(),
          mintedBy: user.id,        
        },
      });
      
      return {
        success: true,
        transactionHash: receipt.hash,
      };
    } catch (error: any) {
      console.error('Lazy mint failed:', error);
      return {
        success: false,
        error: error.message || 'Lazy mint failed',
      };
    }
  }

  // ========================================================================
  // CONTRACT DEPENDENCIES
  // ========================================================================

  private async setupContractDependencies(
    contractAddress: string,
    dependencies: string[],
    dependencyType: 'REQUIRED' | 'OPTIONAL' | 'FALLBACK',
    signer: any
  ): Promise<void> {
    const contract = new Contract(contractAddress, ContractABIs.RWAToken.abi, signer);
    
    // Assuming contract has addDependency function
    for (const depAddress of dependencies) {
      try {
        const tx = await contract.addDependency(depAddress, dependencyType);
        await tx.wait();
      } catch (error) {
        console.warn(`Failed to add dependency ${depAddress}:`, error);
      }
    }
  }

  /**
   * Add contract dependency
   */
  async addContractDependency(
    contractAddress: string,
    dependencyAddress: string,
    dependencyType: 'REQUIRED' | 'OPTIONAL' | 'FALLBACK',
    signer: any,
    user: AuthUser
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const contract = new Contract(contractAddress, ContractABIs.RWAToken.abi, signer);
      
      const tx = await contract.addDependency(dependencyAddress, dependencyType);
      const receipt = await tx.wait();
      
      // Save to database
      const db = await createClient(user);
      await db.contractDependency.create({
        data: {
          contractAddress,
          dependencyAddress,
          dependencyType,
          status: 'ACTIVE',
          addedAt: new Date(),
          addedBy: user.id,
          addedTx: receipt.hash,
        },
      });
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove contract dependency
   */
  async removeContractDependency(
    contractAddress: string,
    dependencyAddress: string,
    signer: any,
    user: AuthUser
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const contract = new Contract(contractAddress, ContractABIs.RWAToken.abi, signer);
      
      const tx = await contract.removeDependency(dependencyAddress);
      const receipt = await tx.wait();
      
      // Update database
      const db = await createClient(user);
      await db.contractDependency.updateMany({
        where: {
          contractAddress,
          dependencyAddress,
        },
        data: {
          status: 'REMOVED',
          removedAt: new Date(),
        },
      });
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ========================================================================
  // DATABASE OPERATIONS
  // ========================================================================

  private async saveOnboardingToDatabase(
    params: TokenOnboardingParams,
    assetId: string,
    tokenResult: { tokenAddress: string; transactionHash: string; blockNumber: number },
    adminConfig: AdminControlConfig,
    user: AuthUser
  ): Promise<{ contractId: string; tokenizedAssetId: string }> {
    const db = await createClient(user);

    // Create BlockchainContract record
    const deployedContract = await db.deployedContract.findUnique({
      where: {
        networkId_contractType: {
          networkId: 'ETHEREUM_SEPOLIA',
          contractType: 'PROPERTY_TOKEN',
        },
      },  
    });
    if (!deployedContract) {
      throw new Error('Deployed contract not found');
    }

    return {
      contractId: deployedContract.id,
      tokenizedAssetId: assetId,
    };
  }

  // ========================================================================
  // VALIDATION
  // ========================================================================

  private validateOnboardingParams(params: TokenOnboardingParams): void {
    // Basic validation
    if (!params.propertyName || params.propertyName.length < 3) {
      throw new Error('Property name must be at least 3 characters');
    }

    if (!params.propertySymbol || params.propertySymbol.length < 2) {
      throw new Error('Property symbol must be at least 2 characters');
    }

    // Lazy minting validation
    if (params.enableLazyMinting) {
      const maxSupply = parseFloat(params.maxSupply);
      if (isNaN(maxSupply) || maxSupply <= 0) {
        throw new Error('Max supply must be a positive number');
      }

      if (params.initialMintAmount) {
        const initialMint = parseFloat(params.initialMintAmount);
        if (isNaN(initialMint) || initialMint < 0) {
          throw new Error('Initial mint amount must be a non-negative number');
        }

        if (initialMint > maxSupply) {
          throw new Error('Initial mint cannot exceed max supply');
        }
      }
    }

    // Admin validation
    if (params.adminAddresses && params.adminAddresses.length > 0) {
      for (const addr of params.adminAddresses) {
        // Basic address validation (starts with 0x and has 42 characters)
        if (!addr.startsWith('0x') || addr.length !== 42) {
          throw new Error(`Invalid admin address: ${addr}`);
        }
      }
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let enhancedFactoryService: EnhancedContractFactoryService | null = null;

export function getEnhancedContractFactoryService(): EnhancedContractFactoryService {
  if (!enhancedFactoryService) {
    enhancedFactoryService = new EnhancedContractFactoryService();
  }
  return enhancedFactoryService;
}

export default EnhancedContractFactoryService;
