/**
 * Comprehensive ABI Generation Script
 *
 * Generates complete ABIs and documentation for all deployed contracts
 * using actual compiled artifacts and deployment addresses.
 *
 * Usage: bun run hardhat run scripts/generate-comprehensive-abis.ts --network sepolia
 */

import fs from 'fs';
import path from 'path';
import { ethers } from 'hardhat';

interface ContractABI {
  contractName: string;
  abi: any[];
  bytecode: string;
  address: string;
  network: string;
  deployment?: string;
}

interface EcosystemABI {
  ecosystem: string;
  version: string;
  network: string;
  chainId: number;
  generated: string;
  contracts: {
    [key: string]: ContractABI;
  };
}

async function generateComprehensiveABIs() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║   COMPREHENSIVE ABI GENERATION                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Load deployment addresses
  const addressesPath = path.join(__dirname, '../deployed-addresses-proxy.json');
  if (!fs.existsSync(addressesPath)) {
    throw new Error(`Deployment addresses file not found: ${addressesPath}`);
  }

  const deploymentData = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
  const addresses = deploymentData.addresses;
  const network = deploymentData.network || 'sepolia';

  console.log(`📡 Network: ${network}`);
  console.log(`📋 Loading ${Object.keys(addresses).length} contract addresses...\n`);

  // Get network info
  const provider = ethers.provider;
  const networkInfo = await provider.getNetwork();

  // Contract mappings - maps deployment names to artifact paths
  const contractMappings = {
    // RWA Ecosystem
    RWAAssetRegistry: 'contracts/upgradeable/RWAAssetRegistryUpgradeable.sol:RWAAssetRegistryUpgradeable',
    RWATokenFactory: 'contracts/upgradeable/RWATokenFactoryUpgradeable.sol:RWATokenFactoryUpgradeable',
    RWATokenFactory404: 'contracts/core/RWATokenFactory404.sol:RWATokenFactory404',
    RWAMarketplace: 'contracts/upgradeable/RWAMarketplaceUpgradeable.sol:RWAMarketplaceUpgradeable',
    RWAStaking: 'contracts/upgradeable/RWAStakingUpgradeable.sol:RWAStakingUpgradeable',
    RWARewardDistributor: 'contracts/staking/RWARewardDistributor.sol:RWARewardDistributor',
    RWARevenue: 'contracts/staking/RWARevenue.sol:RWARevenue',
    MembershipSystem: 'contracts/upgradeable/MembershipSystemUpgradeable.sol:MembershipSystemUpgradeable',

    // Infrastructure
    ProxyAdmin: 'contracts/proxy/ProxyAdmin.sol:ProxyAdmin',

    // Implementation addresses (for reference)
    RWAAssetRegistry_Implementation: 'contracts/upgradeable/RWAAssetRegistryUpgradeable.sol:RWAAssetRegistryUpgradeable',
    RWATokenFactory_Implementation: 'contracts/upgradeable/RWATokenFactoryUpgradeable.sol:RWATokenFactoryUpgradeable',
    RWAMarketplace_Implementation: 'contracts/upgradeable/RWAMarketplaceUpgradeable.sol:RWAMarketplaceUpgradeable',
    RWAStaking_Implementation: 'contracts/upgradeable/RWAStakingUpgradeable.sol:RWAStakingUpgradeable',
    MembershipSystem_Implementation: 'contracts/upgradeable/MembershipSystemUpgradeable.sol:MembershipSystemUpgradeable',

    // Staking Ecosystem (if available)
    TigerStaking: 'contracts/staking/RWAStaking.sol:RWAStaking', // Fallback to non-upgradeable
    TigerRevenue: 'contracts/staking/RWARevenue.sol:RWARevenue',
    RewardDistributor: 'contracts/staking/RWARewardDistributor.sol:RWARewardDistributor',
    KAGE: 'contracts/TigerPalaceToken.sol:TigerPalaceToken',
    TPT: 'contracts/TigerPalaceToken.sol:TigerPalaceToken',
  };

  // Create output directories
  const abisDir = path.join(__dirname, '../abis');
  const frontendDir = path.join(abisDir, 'frontend');
  const docsDir = path.join(__dirname, '../docs');

  [abisDir, frontendDir, docsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  const ecosystemABI: EcosystemABI = {
    ecosystem: 'TigerPalace RWA Ecosystem',
    version: '2.0.0',
    network,
    chainId: Number(networkInfo.chainId),
    generated: new Date().toISOString(),
    contracts: {}
  };

  console.log('🔧 Generating ABIs from artifacts...\n');

  // Generate ABIs for each contract
  for (const [contractKey, artifactPath] of Object.entries(contractMappings)) {
    const address = addresses[contractKey];

    if (!address) {
      console.log(`⚠️  No address found for ${contractKey}, skipping...`);
      continue;
    }

    try {
      // Load artifact
      const artifact = await hre.artifacts.readArtifact(artifactPath);

      const contractABI: ContractABI = {
        contractName: contractKey,
        abi: artifact.abi,
        bytecode: artifact.bytecode,
        address,
        network,
        deployment: deploymentData.timestamp || new Date().toISOString()
      };

      // Save individual ABI file
      const abiFile = path.join(abisDir, `${contractKey}.json`);
      fs.writeFileSync(abiFile, JSON.stringify(contractABI, null, 2));
      console.log(`✅ Generated ${contractKey}.json`);

      // Save minimal ABI (just the ABI array) for frontend
      const minimalAbiFile = path.join(frontendDir, `${contractKey}_ABI.json`);
      fs.writeFileSync(minimalAbiFile, JSON.stringify(artifact.abi, null, 2));

      // Add to ecosystem
      ecosystemABI.contracts[contractKey] = contractABI;

    } catch (error) {
      console.log(`❌ Failed to generate ABI for ${contractKey}:`, error.message);
    }
  }

  // Save ecosystem ABI
  const ecosystemFile = path.join(abisDir, 'TigerPalaceEcosystem.json');
  fs.writeFileSync(ecosystemFile, JSON.stringify(ecosystemABI, null, 2));
  console.log(`✅ Generated TigerPalaceEcosystem.json (comprehensive ecosystem)`);

  // Generate TypeScript definitions
  console.log('\n📝 Generating TypeScript definitions...');
  const tsDefinitions = generateTypeScriptDefinitions(addresses, network, networkInfo.chainId);
  const tsFile = path.join(frontendDir, 'contracts.ts');
  fs.writeFileSync(tsFile, tsDefinitions);
  console.log(`✅ Generated contracts.ts (TypeScript definitions)`);

  // Generate React hooks
  console.log('\n⚛️  Generating React hooks...');
  const hooksCode = generateReactHooks(addresses, network);
  const hooksFile = path.join(frontendDir, 'hooks.ts');
  fs.writeFileSync(hooksFile, hooksCode);
  console.log(`✅ Generated hooks.ts (React integration hooks)`);

  // Generate Viem integration
  console.log('\n📦 Generating Viem integration...');
  const viemCode = generateViemIntegration(addresses, network);
  const viemFile = path.join(frontendDir, 'viem.ts');
  fs.writeFileSync(viemFile, viemCode);
  console.log(`✅ Generated viem.ts (Viem integration)`);

  // Generate Wagmi integration
  console.log('\n🎣 Generating Wagmi integration...');
  const wagmiCode = generateWagmiIntegration(addresses, network);
  const wagmiFile = path.join(frontendDir, 'wagmi.ts');
  fs.writeFileSync(wagmiFile, wagmiCode);
  console.log(`✅ Generated wagmi.ts (Wagmi integration)`);

  // Update frontend integration file
  console.log('\n🔄 Updating frontend integration file...');
  const updatedFrontendIntegration = generateUpdatedFrontendIntegration(addresses, network);
  const frontendIntegrationFile = path.join(__dirname, '../frontend-integration/rwa-contracts.ts');
  fs.writeFileSync(frontendIntegrationFile, updatedFrontendIntegration);
  console.log(`✅ Updated frontend-integration/rwa-contracts.ts`);

  // Generate comprehensive documentation
  console.log('\n📚 Generating comprehensive documentation...');
  const documentation = generateComprehensiveDocumentation(ecosystemABI);
  const docsFile = path.join(docsDir, 'ABI_INTEGRATION_GUIDE.md');
  fs.writeFileSync(docsFile, documentation);
  console.log(`✅ Generated docs/ABI_INTEGRATION_GUIDE.md`);

  // Generate API documentation
  const apiDocs = generateAPIDocumentation(ecosystemABI);
  const apiDocsFile = path.join(docsDir, 'CONTRACT_API_REFERENCE.md');
  fs.writeFileSync(apiDocsFile, apiDocs);
  console.log(`✅ Generated docs/CONTRACT_API_REFERENCE.md`);

  console.log('\n🎉 ABI Generation Complete!');
  console.log('=====================================');
  console.log(`📁 ABIs Directory: ${abisDir}`);
  console.log(`🌐 Frontend Directory: ${frontendDir}`);
  console.log(`📚 Docs Directory: ${docsDir}`);

  console.log('\n📋 Generated Files:');
  console.log('  🔧 Individual Contract ABIs:');
  Object.keys(ecosystemABI.contracts).forEach(name => {
    console.log(`    • ${name}.json`);
  });

  console.log('\n  🌐 Ecosystem Files:');
  console.log('    • TigerPalaceEcosystem.json (complete ecosystem)');
  console.log('    • frontend/contracts.ts (TypeScript definitions)');
  console.log('    • frontend/hooks.ts (React hooks)');
  console.log('    • frontend/viem.ts (Viem integration)');
  console.log('    • frontend/wagmi.ts (Wagmi integration)');

  console.log('\n  📚 Documentation:');
  console.log('    • docs/ABI_INTEGRATION_GUIDE.md');
  console.log('    • docs/CONTRACT_API_REFERENCE.md');

  console.log('\n✅ Ready for frontend integration!');
  console.log(`🔗 Use these ABIs to connect your frontend to the ${network} deployment`);
}

function generateTypeScriptDefinitions(addresses: any, network: string, chainId: number): string {
  const contractNames = Object.keys(addresses);

  return `// Tiger Palace RWA Ecosystem - TypeScript Definitions
// Auto-generated for ${network} network (Chain ID: ${chainId})
// Generated: ${new Date().toISOString()}

import type { Address } from 'viem';

// ============================================================================
// Contract Addresses
// ============================================================================

export const CONTRACT_ADDRESSES = {
  ${network}: {
${contractNames.map(name => `    ${name}: '${addresses[name]}' as Address,`).join('\n')}
  },
} as const;

export type ContractAddresses = typeof CONTRACT_ADDRESSES.${network};

// ============================================================================
// Type Definitions
// ============================================================================

export interface Asset {
  id: bigint;
  owner: Address;
  title: string;
  description: string;
  assetType: string;
  location: string;
  price: bigint;
  tokenPrice: bigint;
  totalTokens: bigint;
  availableTokens: bigint;
  soldTokens: bigint;
  status: number;
  createdAt: bigint;
  updatedAt: bigint;
}

export interface TokenInfo {
  assetId: bigint;
  tokenAddress: Address;
  name: string;
  symbol: string;
  totalSupply: bigint;
  decimals: number;
  isERC404: boolean;
}

export interface PoolInfo {
  poolId: bigint;
  name: string;
  duration: bigint;
  multiplier: bigint;
  active: boolean;
  totalStaked: bigint;
  totalRewards: bigint;
}

export interface UserStake {
  stakeId: bigint;
  poolId: bigint;
  amount: bigint;
  startTime: bigint;
  endTime: bigint;
  claimed: boolean;
  rewards: bigint;
}

export interface RewardStats {
  totalRewardPool: bigint;
  distributedRewards: bigint;
  pendingRewards: bigint;
  availableBalance: bigint;
}

export interface RevenueStats {
  totalAllocated: bigint;
  totalDistributed: bigint;
  pendingRevenue: bigint;
  marketplaceFees: bigint;
  propertyDividends: bigint;
}

// ============================================================================
// Event Types
// ============================================================================

export interface ContractEvents {
  // Asset Registry Events
  AssetRegistered: {
    assetId: bigint;
    owner: Address;
    title: string;
    price: bigint;
  };

  // Marketplace Events
  TokensPurchased: {
    buyer: Address;
    assetId: bigint;
    amount: bigint;
    totalPrice: bigint;
  };

  TokensSold: {
    seller: Address;
    assetId: bigint;
    amount: bigint;
    totalReceived: bigint;
  };

  // Staking Events
  Staked: {
    user: Address;
    poolId: bigint;
    amount: bigint;
    stakeId: bigint;
  };

  RewardsClaimed: {
    user: Address;
    stakeId: bigint;
    amount: bigint;
  };

  // Revenue Events
  RevenueAllocated: {
    poolId: bigint;
    amount: bigint;
    source: string;
  };

  RevenueDistributed: {
    poolId: bigint;
    amount: bigint;
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format token amount for display
 */
export function formatTokenAmount(amount: bigint, decimals: number = 18): string {
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  return fractionStr ? \`\${whole}.\${fractionStr}\` : whole.toString();
}

/**
 * Parse token amount from string
 */
export function parseTokenAmount(amount: string, decimals: number = 18): bigint {
  const [whole, fraction = ''] = amount.split('.');
  const wholePart = BigInt(whole || '0') * BigInt(10 ** decimals);
  const fractionPart = BigInt((fraction.padEnd(decimals, '0')).slice(0, decimals));
  return wholePart + fractionPart;
}

/**
 * Check if address is a valid Ethereum address
 */
export function isValidAddress(address: string): address is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Shorten address for display
 */
export function shortenAddress(address: Address, chars: number = 4): string {
  return \`\${address.slice(0, chars + 2)}...\${address.slice(-chars)}\`;
}

// ============================================================================
// Network Configuration
// ============================================================================

export const NETWORK_CONFIG = {
  ${network}: {
    chainId: ${chainId},
    name: '${network.charAt(0).toUpperCase() + network.slice(1)} Testnet',
    rpcUrl: '${network === 'sepolia' ? 'https://rpc.sepolia.org' : 'https://rpc.sepolia.org'}',
    blockExplorer: '${network === 'sepolia' ? 'https://sepolia.etherscan.io' : 'https://sepolia.etherscan.io'}',
    contracts: CONTRACT_ADDRESSES.${network},
  },
} as const;

export type NetworkConfig = typeof NETWORK_CONFIG.${network};
`;
}

function generateReactHooks(addresses: any, network: string): string {
  return `// Tiger Palace RWA Ecosystem - React Hooks
// Auto-generated for ${network} network
// Generated: ${new Date().toISOString()}

import { useContractRead, useContractWrite, useWaitForTransaction } from 'wagmi';
import { CONTRACT_ADDRESSES } from './contracts';

// ============================================================================
// Asset Registry Hooks
// ============================================================================

export function useAsset(assetId: bigint) {
  return useContractRead({
    address: CONTRACT_ADDRESSES.${network}.RWAAssetRegistry,
    abi: [], // Import from generated ABI
    functionName: 'getAsset',
    args: [assetId],
    enabled: assetId > 0n,
  });
}

export function useRegisterAsset() {
  const { write, data } = useContractWrite({
    address: CONTRACT_ADDRESSES.${network}.RWAAssetRegistry,
    abi: [], // Import from generated ABI
    functionName: 'registerAsset',
  });

  const { isLoading } = useWaitForTransaction({
    hash: data?.hash,
  });

  return {
    registerAsset: write,
    isLoading,
    hash: data?.hash,
  };
}

// ============================================================================
// Marketplace Hooks
// ============================================================================

export function useBuyTokens() {
  const { write, data } = useContractWrite({
    address: CONTRACT_ADDRESSES.${network}.RWAMarketplace,
    abi: [], // Import from generated ABI
    functionName: 'buyTokens',
  });

  const { isLoading } = useWaitForTransaction({
    hash: data?.hash,
  });

  return {
    buyTokens: write,
    isLoading,
    hash: data?.hash,
  };
}

export function useSellTokens() {
  const { write, data } = useContractWrite({
    address: CONTRACT_ADDRESSES.${network}.RWAMarketplace,
    abi: [], // Import from generated ABI
    functionName: 'sellTokens',
  });

  const { isLoading } = useWaitForTransaction({
    hash: data?.hash,
  });

  return {
    sellTokens: write,
    isLoading,
    hash: data?.hash,
  };
}

// ============================================================================
// Staking Hooks
// ============================================================================

export function useUserStakes(userAddress?: \`0x\${string}\`) {
  return useContractRead({
    address: CONTRACT_ADDRESSES.${network}.RWAStaking,
    abi: [], // Import from generated ABI
    functionName: 'getUserStakes',
    args: userAddress ? [userAddress] : undefined,
    enabled: !!userAddress,
  });
}

export function useStake() {
  const { write, data } = useContractWrite({
    address: CONTRACT_ADDRESSES.${network}.RWAStaking,
    abi: [], // Import from generated ABI
    functionName: 'stake',
  });

  const { isLoading } = useWaitForTransaction({
    hash: data?.hash,
  });

  return {
    stake: write,
    isLoading,
    hash: data?.hash,
  };
}

export function useClaimRewards() {
  const { write, data } = useContractWrite({
    address: CONTRACT_ADDRESSES.${network}.RWAStaking,
    abi: [], // Import from generated ABI
    functionName: 'claimRewards',
  });

  const { isLoading } = useWaitForTransaction({
    hash: data?.hash,
  });

  return {
    claimRewards: write,
    isLoading,
    hash: data?.hash,
  };
}

export function useAllPools() {
  return useContractRead({
    address: CONTRACT_ADDRESSES.${network}.RWAStaking,
    abi: [], // Import from generated ABI
    functionName: 'getAllPools',
  });
}

// ============================================================================
// Revenue Hooks
// ============================================================================

export function useRevenueStats() {
  return useContractRead({
    address: CONTRACT_ADDRESSES.${network}.RWARevenue,
    abi: [], // Import from generated ABI
    functionName: 'getRevenueStats',
  });
}

// ============================================================================
// Token Hooks
// ============================================================================

export function useTokenBalance(tokenAddress: \`0x\${string}\`, userAddress?: \`0x\${string}\`) {
  return useContractRead({
    address: tokenAddress,
    abi: [], // ERC20 ABI
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    enabled: !!userAddress,
  });
}

export function useTokenAllowance(
  tokenAddress: \`0x\${string}\`,
  owner?: \`0x\${string}\`,
  spender?: \`0x\${string}\`
) {
  return useContractRead({
    address: tokenAddress,
    abi: [], // ERC20 ABI
    functionName: 'allowance',
    args: owner && spender ? [owner, spender] : undefined,
    enabled: !!(owner && spender),
  });
}

export function useApproveToken() {
  const { write, data } = useContractWrite({
    abi: [], // ERC20 ABI
    functionName: 'approve',
  });

  const { isLoading } = useWaitForTransaction({
    hash: data?.hash,
  });

  return {
    approve: write,
    isLoading,
    hash: data?.hash,
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

export function useContractAddress(contractName: keyof typeof CONTRACT_ADDRESSES.${network}) {
  return CONTRACT_ADDRESSES.${network}[contractName];
}

export function useNetworkConfig() {
  return {
    chainId: ${network === 'sepolia' ? 11155111 : 11155111},
    name: '${network.charAt(0).toUpperCase() + network.slice(1)} Testnet',
    rpcUrl: '${network === 'sepolia' ? 'https://rpc.sepolia.org' : 'https://rpc.sepolia.org'}',
    blockExplorer: '${network === 'sepolia' ? 'https://sepolia.etherscan.io' : 'https://sepolia.etherscan.io'}',
  };
}
`;
}

function generateViemIntegration(addresses: any, network: string): string {
  const contractNames = Object.keys(addresses);

  return `// Tiger Palace RWA Ecosystem - Viem Integration
// Auto-generated for ${network} network
// Generated: ${new Date().toISOString()}

import { createPublicClient, createWalletClient, http, type Address } from 'viem';
import { sepolia } from 'viem/chains';
import { CONTRACT_ADDRESSES } from './contracts';

// ============================================================================
// Viem Client Setup
// ============================================================================

export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http('${network === 'sepolia' ? 'https://rpc.sepolia.org' : 'https://rpc.sepolia.org'}'),
});

export function createWalletClient(privateKey: \`0x\${string}\`) {
  return createWalletClient({
    chain: sepolia,
    transport: http('${network === 'sepolia' ? 'https://rpc.sepolia.org' : 'https://rpc.sepolia.org'}'),
    account: privateKey,
  });
}

// ============================================================================
// Contract Instances
// ============================================================================

${contractNames.map(name => `
// ${name}
export const ${name}Contract = {
  address: CONTRACT_ADDRESSES.${network}.${name} as Address,
  abi: [], // Import ABI from generated JSON files
} as const;
`).join('\n')}

// ============================================================================
// Read Functions
// ============================================================================

export async function getAsset(assetId: bigint) {
  return await publicClient.readContract({
    ...RWAAssetRegistryContract,
    functionName: 'getAsset',
    args: [assetId],
  });
}

export async function getUserStakes(userAddress: Address) {
  return await publicClient.readContract({
    ...RWAStakingContract,
    functionName: 'getUserStakes',
    args: [userAddress],
  });
}

export async function getAllPools() {
  return await publicClient.readContract({
    ...RWAStakingContract,
    functionName: 'getAllPools',
  });
}

export async function getTokenBalance(tokenAddress: Address, userAddress: Address) {
  return await publicClient.readContract({
    address: tokenAddress,
    abi: [], // ERC20 ABI
    functionName: 'balanceOf',
    args: [userAddress],
  });
}

export async function getRevenueStats() {
  return await publicClient.readContract({
    ...RWARevenueContract,
    functionName: 'getRevenueStats',
  });
}

// ============================================================================
// Write Functions (requires wallet client)
// ============================================================================

export async function stake(walletClient: any, poolId: bigint, amount: bigint) {
  const { request } = await publicClient.simulateContract({
    ...RWAStakingContract,
    functionName: 'stake',
    args: [poolId, amount],
    account: walletClient.account,
  });

  return await walletClient.writeContract(request);
}

export async function buyTokens(walletClient: any, assetId: bigint, amount: bigint, value: bigint) {
  const { request } = await publicClient.simulateContract({
    ...RWAMarketplaceContract,
    functionName: 'buyTokens',
    args: [assetId, amount],
    value,
    account: walletClient.account,
  });

  return await walletClient.writeContract(request);
}

export async function approveToken(walletClient: any, tokenAddress: Address, spender: Address, amount: bigint) {
  const { request } = await publicClient.simulateContract({
    address: tokenAddress,
    abi: [], // ERC20 ABI
    functionName: 'approve',
    args: [spender, amount],
    account: walletClient.account,
  });

  return await walletClient.writeContract(request);
}

export async function claimRewards(walletClient: any, stakeId: bigint) {
  const { request } = await publicClient.simulateContract({
    ...RWAStakingContract,
    functionName: 'claimRewards',
    args: [stakeId],
    account: walletClient.account,
  });

  return await walletClient.writeContract(request);
}

// ============================================================================
// Event Listeners
// ============================================================================

export function watchStakingEvents(onEvent: (event: any) => void) {
  return publicClient.watchContractEvent({
    ...RWAStakingContract,
    eventName: 'Staked',
    onLogs: (logs) => {
      logs.forEach((log) => onEvent(log));
    },
  });
}

export function watchMarketplaceEvents(onEvent: (event: any) => void) {
  return publicClient.watchContractEvent({
    ...RWAMarketplaceContract,
    eventName: 'TokensPurchased',
    onLogs: (logs) => {
      logs.forEach((log) => onEvent(log));
    },
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

export async function getBlockNumber() {
  return await publicClient.getBlockNumber();
}

export async function getGasPrice() {
  return await publicClient.getGasPrice();
}

export async function estimateGas(tx: any) {
  return await publicClient.estimateGas(tx);
}
`;
}

function generateWagmiIntegration(addresses: any, network: string): string {
  return `// Tiger Palace RWA Ecosystem - Wagmi Integration
// Auto-generated for ${network} network
// Generated: ${new Date().toISOString()}

import { useContractRead, useContractWrite, useWaitForTransaction, usePublicClient } from 'wagmi';
import { CONTRACT_ADDRESSES } from './contracts';

// ============================================================================
// Custom Hooks for RWA Ecosystem
// ============================================================================

export function useAssetRegistry() {
  const publicClient = usePublicClient();

  const getAsset = (assetId: bigint) => {
    return useContractRead({
      address: CONTRACT_ADDRESSES.${network}.RWAAssetRegistry,
      abi: [], // Import from generated ABI
      functionName: 'getAsset',
      args: [assetId],
      enabled: !!assetId,
    });
  };

  const registerAsset = () => {
    const { write, data } = useContractWrite({
      address: CONTRACT_ADDRESSES.${network}.RWAAssetRegistry,
      abi: [], // Import from generated ABI
      functionName: 'registerAsset',
    });

    const { isLoading } = useWaitForTransaction({
      hash: data?.hash,
    });

    return { registerAsset: write, isLoading, hash: data?.hash };
  };

  return { getAsset, registerAsset };
}

export function useMarketplace() {
  const buyTokens = () => {
    const { write, data } = useContractWrite({
      address: CONTRACT_ADDRESSES.${network}.RWAMarketplace,
      abi: [], // Import from generated ABI
      functionName: 'buyTokens',
    });

    const { isLoading } = useWaitForTransaction({
      hash: data?.hash,
    });

    return { buyTokens: write, isLoading, hash: data?.hash };
  };

  const sellTokens = () => {
    const { write, data } = useContractWrite({
      address: CONTRACT_ADDRESSES.${network}.RWAMarketplace,
      abi: [], // Import from generated ABI
      functionName: 'sellTokens',
    });

    const { isLoading } = useWaitForTransaction({
      hash: data?.hash,
    });

    return { sellTokens: write, isLoading, hash: data?.hash };
  };

  return { buyTokens, sellTokens };
}

export function useStaking() {
  const getUserStakes = (userAddress?: \`0x\${string}\`) => {
    return useContractRead({
      address: CONTRACT_ADDRESSES.${network}.RWAStaking,
      abi: [], // Import from generated ABI
      functionName: 'getUserStakes',
      args: userAddress ? [userAddress] : undefined,
      enabled: !!userAddress,
    });
  };

  const getAllPools = () => {
    return useContractRead({
      address: CONTRACT_ADDRESSES.${network}.RWAStaking,
      abi: [], // Import from generated ABI
      functionName: 'getAllPools',
    });
  };

  const stake = () => {
    const { write, data } = useContractWrite({
      address: CONTRACT_ADDRESSES.${network}.RWAStaking,
      abi: [], // Import from generated ABI
      functionName: 'stake',
    });

    const { isLoading } = useWaitForTransaction({
      hash: data?.hash,
    });

    return { stake: write, isLoading, hash: data?.hash };
  };

  const claimRewards = () => {
    const { write, data } = useContractWrite({
      address: CONTRACT_ADDRESSES.${network}.RWAStaking,
      abi: [], // Import from generated ABI
      functionName: 'claimRewards',
    });

    const { isLoading } = useWaitForTransaction({
      hash: data?.hash,
    });

    return { claimRewards: write, isLoading, hash: data?.hash };
  };

  return { getUserStakes, getAllPools, stake, claimRewards };
}

export function useRevenue() {
  const getRevenueStats = () => {
    return useContractRead({
      address: CONTRACT_ADDRESSES.${network}.RWARevenue,
      abi: [], // Import from generated ABI
      functionName: 'getRevenueStats',
    });
  };

  return { getRevenueStats };
}

export function useToken(tokenAddress?: \`0x\${string}\`) {
  const getBalance = (userAddress?: \`0x\${string}\`) => {
    return useContractRead({
      address: tokenAddress,
      abi: [], // ERC20 ABI
      functionName: 'balanceOf',
      args: userAddress ? [userAddress] : undefined,
      enabled: !!(tokenAddress && userAddress),
    });
  };

  const getAllowance = (owner?: \`0x\${string}\`, spender?: \`0x\${string}\`) => {
    return useContractRead({
      address: tokenAddress,
      abi: [], // ERC20 ABI
      functionName: 'allowance',
      args: owner && spender ? [owner, spender] : undefined,
      enabled: !!(tokenAddress && owner && spender),
    });
  };

  const approve = () => {
    const { write, data } = useContractWrite({
      address: tokenAddress,
      abi: [], // ERC20 ABI
      functionName: 'approve',
    });

    const { isLoading } = useWaitForTransaction({
      hash: data?.hash,
    });

    return { approve: write, isLoading, hash: data?.hash };
  };

  return { getBalance, getAllowance, approve };
}

// ============================================================================
// Configuration
// ============================================================================

export const wagmiConfig = {
  chains: [sepolia],
  connectors: [
    // Add your connectors here
  ],
  publicClient: ({ chainId }) => {
    if (chainId === 11155111) {
      return createPublicClient({
        chain: sepolia,
        transport: http('${network === 'sepolia' ? 'https://rpc.sepolia.org' : 'https://rpc.sepolia.org'}'),
      });
    }
    throw new Error(\`Unsupported chainId: \${chainId}\`);
  },
};

// ============================================================================
// Types
// ============================================================================

export interface Asset {
  id: bigint;
  owner: \`0x\${string}\`;
  title: string;
  description: string;
  assetType: string;
  location: string;
  price: bigint;
  tokenPrice: bigint;
  totalTokens: bigint;
  availableTokens: bigint;
  soldTokens: bigint;
  status: number;
  createdAt: bigint;
  updatedAt: bigint;
}

export interface Pool {
  poolId: bigint;
  name: string;
  duration: bigint;
  multiplier: bigint;
  active: boolean;
  totalStaked: bigint;
  totalRewards: bigint;
}

export interface UserStake {
  stakeId: bigint;
  poolId: bigint;
  amount: bigint;
  startTime: bigint;
  endTime: bigint;
  claimed: boolean;
  rewards: bigint;
}
`;
}

function generateUpdatedFrontendIntegration(addresses: any, network: string): string {
  const contractNames = Object.keys(addresses);

  return `/**
 * RWA Contract Interfaces for Frontend DAPP Integration
 * Tiger Palace RWA Marketplace
 *
 * This file provides TypeScript interfaces and helper functions for interacting
 * with RWA smart contracts from the frontend DAPP.
 *
 * Auto-generated from deployment addresses for ${network} network
 * Generated: ${new Date().toISOString()}
 */

import { Address } from 'viem';

// ============================================================================
// Contract Addresses
// ============================================================================

export const CONTRACT_ADDRESSES = {
  // ${network.charAt(0).toUpperCase() + network.slice(1)} Testnet (current deployment)
  ${network}: {
${contractNames.map(name => `    ${name}: '${addresses[name]}' as Address,`).join('\n')}
  },
  // Mainnet (to be deployed)
  mainnet: {
${contractNames.map(name => `    ${name}: '0x0000000000000000000000000000000000000000' as Address, // TODO: Update after mainnet deployment`).join('\n')}
  },
} as const;

// ============================================================================
// Type Definitions
// ============================================================================

export interface RealEstateAsset {
  id: number;
  owner: Address;
  title: string;
  description: string;
  assetType: string;
  location: string;
  price: bigint;
  tokenPrice: bigint;
  totalTokens: bigint;
  availableTokens: bigint;
  soldTokens: bigint;
  status: number; // 0=DRAFT, 1=ACTIVE, 2=SOLD
  createdAt: bigint;
  updatedAt: bigint;
}

export interface TokenInfo {
  assetId: number;
  tokenAddress: Address;
  name: string;
  symbol: string;
  totalSupply: bigint;
  isERC404: boolean;
  nftExists?: boolean;
  nftOwner?: Address;
  nftTokenId?: number;
}

export interface UserTokenBalance {
  assetId: number;
  tokenAddress: Address;
  balance: bigint;
  isNFT: boolean;
  nftTokenId?: number;
}

export interface PoolInfo {
  poolId: number;
  name: string;
  duration: bigint;
  multiplier: bigint; // Basis points (10000 = 100%)
  active: boolean;
  totalStaked: bigint;
  totalRewards: bigint;
}

export interface UserStake {
  stakeId: number;
  poolId: number;
  amount: bigint;
  startTime: bigint;
  endTime: bigint;
  claimed: boolean;
  rewards: bigint;
}

export interface RewardStats {
  totalRewardPool: bigint;
  distributedRewards: bigint;
  pendingRewards: bigint;
  availableBalance: bigint;
}

export interface RevenueStats {
  totalAllocated: bigint;
  totalDistributed: bigint;
  pendingRevenue: bigint;
  marketplaceFees: bigint;
  propertyDividends: bigint;
}

// ============================================================================
// Contract ABIs (Complete - loaded from generated files)
// ============================================================================

// Import ABIs from generated files
import RWA_ASSET_REGISTRY_ABI from '../abis/frontend/RWAAssetRegistry_ABI.json';
import RWA_TOKEN_FACTORY_ABI from '../abis/frontend/RWATokenFactory_ABI.json';
import RWA_TOKEN_404_ABI from '../abis/frontend/RWATokenFactory404_ABI.json';
import RWA_MARKETPLACE_ABI from '../abis/frontend/RWAMarketplace_ABI.json';
import RWA_STAKING_ABI from '../abis/frontend/RWAStaking_ABI.json';
import RWA_REWARD_DISTRIBUTOR_ABI from '../abis/frontend/RWARewardDistributor_ABI.json';
import RWA_REVENUE_ABI from '../abis/frontend/RWARevenue_ABI.json';
import MEMBERSHIP_SYSTEM_ABI from '../abis/frontend/MembershipSystem_ABI.json';

export { RWA_ASSET_REGISTRY_ABI };
export { RWA_TOKEN_FACTORY_ABI };
export { RWA_TOKEN_404_ABI };
export { RWA_MARKETPLACE_ABI };
export { RWA_STAKING_ABI };
export { RWA_REWARD_DISTRIBUTOR_ABI };
export { RWA_REVENUE_ABI };
export { MEMBERSHIP_SYSTEM_ABI };

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format token amount for display
 */
export function formatTokenAmount(amount: bigint, decimals: number = 18): string {
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  const fractionStr = fraction.toString().padStart(decimals, '0');
  return \`\${whole}.\${fractionStr}\`;
}

/**
 * Parse token amount from string
 */
export function parseTokenAmount(amount: string, decimals: number = 18): bigint {
  const [whole, fraction = ''] = amount.split('.');
  const wholePart = BigInt(whole || '0') * BigInt(10 ** decimals);
  const fractionPart = BigInt((fraction.padEnd(decimals, '0')).slice(0, decimals));
  return wholePart + fractionPart;
}

/**
 * Check if user owns 100% of tokens (can convert to NFT)
 */
export async function canConvertToNFT(
  tokenAddress: Address,
  userAddress: Address,
  totalSupply: bigint
): Promise<boolean> {
  // This would use wagmi/viem to read contract
  // Implementation depends on your chosen library
  return false; // Placeholder
}

/**
 * Get token type (ERC20 or ERC-404)
 */
export async function getTokenType(tokenAddress: Address): Promise<'ERC20' | 'ERC404'> {
  // Check if token has ERC-404 functions
  // Implementation depends on your chosen library
  return 'ERC404'; // Placeholder
}

/**
 * Get contract address for current network
 */
export function getContractAddress(contractName: keyof typeof CONTRACT_ADDRESSES.${network}): Address {
  return CONTRACT_ADDRESSES.${network}[contractName];
}

/**
 * Check if running on supported network
 */
export function isSupportedNetwork(chainId: number): boolean {
  return chainId === ${network === 'sepolia' ? 11155111 : 11155111}; // ${network} chain ID
}

// ============================================================================
// Database Schema Alignment
// ============================================================================

/**
 * Sync contract data to database schema
 *
 * The RealEstateAsset model in schema.zmodel should include:
 * - assetId: Int? @unique (from RWAAssetRegistry)
 * - tokenAddress: String? (RWAToken contract address)
 * - nftTokenId: Int? (ERC-404 NFT token ID if converted)
 * - tokenizationStatus: TokenizationStatus
 * - isNFT: Boolean @default(false)
 * - nftOwner: String? (Current NFT owner address)
 * - contractAddress: String? (RWAToken contract address)
 * - isOnChain: Boolean @default(false)
 * - lastSyncedAt: DateTime?
 */

export interface DatabaseSyncData {
  assetId: number;
  tokenAddress: Address;
  tokenizationStatus: 'NOT_TOKENIZED' | 'PENDING_TOKENIZATION' | 'TOKENIZED' | 'NFT_CONVERTED' | 'BURNED';
  isNFT: boolean;
  nftOwner?: Address;
  nftTokenId?: number;
  lastSyncedAt: Date;
}

// ============================================================================
// Network Configuration
// ============================================================================

export const NETWORK_CONFIG = {
  ${network}: {
    chainId: ${network === 'sepolia' ? 11155111 : 11155111},
    name: '${network.charAt(0).toUpperCase() + network.slice(1)} Testnet',
    rpcUrl: '${network === 'sepolia' ? 'https://rpc.sepolia.org' : 'https://rpc.sepolia.org'}',
    blockExplorer: '${network === 'sepolia' ? 'https://sepolia.etherscan.io' : 'https://sepolia.etherscan.io'}',
    contracts: CONTRACT_ADDRESSES.${network},
  },
} as const;
`;
}

function generateComprehensiveDocumentation(ecosystemABI: EcosystemABI): string {
  return `# Tiger Palace RWA Ecosystem - Frontend Integration Guide

## Overview

This guide provides comprehensive documentation for integrating the Tiger Palace RWA (Real World Asset) ecosystem into your frontend application.

**Network**: ${ecosystemABI.network} (Chain ID: ${ecosystemABI.chainId})
**Version**: ${ecosystemABI.version}
**Generated**: ${new Date().toISOString()}

## 🚀 Quick Start

### 1. Install Dependencies

\`\`\`bash
npm install wagmi viem @wagmi/core @wagmi/vue ethers
# or
yarn add wagmi viem @wagmi/core @wagmi/vue ethers
# or
bun add wagmi viem @wagmi/core @wagmi/vue ethers
\`\`\`

### 2. Configure Wagmi

\`\`\`typescript
import { createConfig, WagmiProvider } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { createPublicClient, http } from 'viem';

export const config = createConfig({
  chains: [sepolia],
  client: ({ chain }) => ({
    chain,
    transport: http('${ecosystemABI.network === 'sepolia' ? 'https://rpc.sepolia.org' : 'https://rpc.sepolia.org'}'),
  }),
});
\`\`\`

### 3. Import Contract Addresses and ABIs

\`\`\`typescript
import { CONTRACT_ADDRESSES, RWA_MARKETPLACE_ABI, RWA_STAKING_ABI } from './abis/frontend/contracts';
import { useStaking, useMarketplace } from './abis/frontend/hooks';
\`\`\`

## 📋 Contract Addresses

| Contract | Address | Description |
|----------|---------|-------------|
${Object.entries(ecosystemABI.contracts).map(([name, contract]) =>
  `| ${name} | \`${contract.address}\` | ${name.replace(/([A-Z])/g, ' $1').toLowerCase()} |`
).join('\n')}

## 🔧 Core Contracts

### RWAAssetRegistry

**Purpose**: Manages real estate asset registrations and metadata.

**Key Functions**:
- \`registerAsset(owner, title, description, assetType, location, price, tokenPrice, totalTokens)\`
- \`getAsset(assetId)\` - Get asset details
- \`updateAsset(assetId, ...)\` - Update asset information
- \`getNextAssetId()\` - Get next available asset ID

**Events**:
- \`AssetRegistered(assetId, owner, title, price)\`
- \`AssetUpdated(assetId, updater, timestamp)\`

### RWATokenFactory

**Purpose**: Creates ERC-404 tokens for real estate assets.

**Key Functions**:
- \`createToken(assetId, name, symbol, totalSupply, owner)\`
- \`getTokenAddress(assetId)\` - Get token address for asset
- \`getAllTokens()\` - Get all created tokens
- \`mint(assetId, to, amount)\` - Mint additional tokens

**Events**:
- \`TokenCreated(assetId, tokenAddress, name, symbol, totalSupply)\`
- \`TokenMinted(assetId, to, amount)\`

### RWAMarketplace

**Purpose**: Handles token buying and selling with fees.

**Key Functions**:
- \`buyTokens(assetId, amount)\` - Purchase tokens (payable)
- \`sellTokens(assetId, amount, minPrice)\` - Sell tokens
- \`getTokenPrice(assetId)\` - Get current token price
- \`getMarketplaceFee()\` - Get current fee percentage

**Events**:
- \`TokensPurchased(buyer, assetId, amount, totalPrice)\`
- \`TokensSold(seller, assetId, amount, totalReceived)\`

### RWAStaking

**Purpose**: Multi-pool staking system with revenue sharing.

**Key Functions**:
- \`createPool(name, duration, multiplier)\` - Create new staking pool
- \`stake(poolId, amount)\` - Stake tokens in pool
- \`claimRewards(stakeId)\` - Claim staking rewards
- \`getUserStakes(user)\` - Get user's stakes
- \`getAllPools()\` - Get all available pools

**Events**:
- \`PoolCreated(poolId, name, duration, multiplier)\`
- \`Staked(user, poolId, amount, stakeId)\`
- \`RewardsClaimed(user, stakeId, amount)\`

### RWARevenue

**Purpose**: Distributes revenue from marketplace fees and property dividends.

**Key Functions**:
- \`allocateRevenue(poolId, amount, source)\` - Allocate revenue to pool
- \`distributeRevenue(poolId, amount)\` - Distribute revenue to stakers
- \`claimRevenue(poolId)\` - Claim revenue share
- \`getRevenueStats()\` - Get revenue statistics

**Events**:
- \`RevenueAllocated(poolId, amount, source)\`
- \`RevenueDistributed(poolId, amount)\`
- \`RevenueClaimed(user, poolId, amount)\`

### RWARewardDistributor

**Purpose**: Manages reward token distribution and fee collection.

**Key Functions**:
- \`addRewards(amount, source)\` - Add rewards to pool
- \`distributeRewards(amount)\` - Distribute rewards to stakers
- \`collectMarketplaceFees(amount)\` - Collect marketplace fees
- \`getRewardPoolStats()\` - Get reward pool statistics

## 🪝 React Hooks

### Staking Hooks

\`\`\`typescript
import { useStaking } from './abis/frontend/hooks';

function StakingComponent() {
  const { getUserStakes, getAllPools, stake, claimRewards } = useStaking();

  // Get user's stakes
  const { data: stakes } = getUserStakes(userAddress);

  // Get available pools
  const { data: pools } = getAllPools();

  // Stake tokens
  const { stake: stakeTokens, isLoading } = stake();

  const handleStake = async (poolId: number, amount: string) => {
    await stakeTokens({
      args: [BigInt(poolId), parseEther(amount)],
    });
  };

  return (
    <div>
      <h2>Your Stakes</h2>
      {stakes?.map((stake, index) => (
        <div key={index}>
          Pool {stake.poolId}: {formatEther(stake.amount)} tokens
          <button onClick={() => claimRewards({ args: [stake.stakeId] })}>
            Claim Rewards
          </button>
        </div>
      ))}
    </div>
  );
}
\`\`\`

### Marketplace Hooks

\`\`\`typescript
import { useMarketplace } from './abis/frontend/hooks';

function MarketplaceComponent() {
  const { buyTokens, sellTokens } = useMarketplace();

  const { buyTokens: purchaseTokens, isLoading: buying } = buyTokens();
  const { sellTokens: sellUserTokens, isLoading: selling } = sellTokens();

  const handleBuy = async (assetId: number, amount: string, price: string) => {
    await purchaseTokens({
      args: [BigInt(assetId), parseEther(amount)],
      value: parseEther(price),
    });
  };

  return (
    <div>
      <button
        onClick={() => handleBuy(1, '100', '10')}
        disabled={buying}
      >
        Buy 100 Tokens for 10 ETH
      </button>
    </div>
  );
}
\`\`\`

## 📦 Viem Integration

### Reading Contract Data

\`\`\`typescript
import { publicClient, getUserStakes, getAllPools } from './abis/frontend/viem';

async function loadStakingData(userAddress: \`0x\${string}\`) {
  const [stakes, pools] = await Promise.all([
    getUserStakes(userAddress),
    getAllPools(),
  ]);

  return { stakes, pools };
}
\`\`\`

### Writing to Contracts

\`\`\`typescript
import { createWalletClient, stake } from './abis/frontend/viem';

const walletClient = createWalletClient('0x...privateKey...');

async function stakeTokens(poolId: number, amount: string) {
  const hash = await stake(walletClient, BigInt(poolId), parseEther(amount));
  console.log('Transaction hash:', hash);
}
\`\`\`

## 🔄 Event Listening

### Wagmi Event Hooks

\`\`\`typescript
import { useContractEvent } from 'wagmi';

function useStakingEvents() {
  useContractEvent({
    address: CONTRACT_ADDRESSES.${ecosystemABI.network}.RWAStaking,
    abi: RWA_STAKING_ABI,
    eventName: 'Staked',
    listener: (event) => {
      console.log('New stake:', event);
    },
  });

  useContractEvent({
    address: CONTRACT_ADDRESSES.${ecosystemABI.network}.RWAStaking,
    abi: RWA_STAKING_ABI,
    eventName: 'RewardsClaimed',
    listener: (event) => {
      console.log('Rewards claimed:', event);
    },
  });
}
\`\`\`

### Viem Event Watching

\`\`\`typescript
import { watchStakingEvents } from './abis/frontend/viem';

const unwatch = watchStakingEvents((event) => {
  console.log('Staking event:', event);
});

// Stop watching
// unwatch();
\`\`\`

## 💰 Token Operations

### ERC-20 Token Interactions

\`\`\`typescript
import { useToken } from './abis/frontend/hooks';

function TokenComponent({ tokenAddress, userAddress }: {
  tokenAddress: \`0x\${string}\`;
  userAddress: \`0x\${string}\`;
}) {
  const { getBalance, getAllowance, approve } = useToken(tokenAddress);

  const { data: balance } = getBalance(userAddress);
  const { data: allowance } = getAllowance(userAddress, stakingContractAddress);
  const { approve: approveTokens } = approve();

  const handleApprove = async (amount: string) => {
    await approveTokens({
      args: [stakingContractAddress, parseEther(amount)],
    });
  };

  return (
    <div>
      <p>Balance: {balance ? formatEther(balance) : '0'} tokens</p>
      <p>Allowance: {allowance ? formatEther(allowance) : '0'} tokens</p>
      <button onClick={() => handleApprove('1000')}>
        Approve 1000 tokens
      </button>
    </div>
  );
}
\`\`\`

### ERC-404 Token Features

\`\`\`typescript
// Check if user can convert to NFT (owns 100% of supply)
const canConvert = await canConvertToNFT(tokenAddress, userAddress, totalSupply);

// Convert between fungible and NFT states
if (canConvert) {
  // Use contract write functions for conversion
}
\`\`\`

## 🛠️ Utility Functions

### Token Amount Formatting

\`\`\`typescript
import { formatTokenAmount, parseTokenAmount } from './abis/frontend/contracts';

// Format for display
const displayAmount = formatTokenAmount(BigInt('1000000000000000000')); // "1.0"

// Parse from user input
const weiAmount = parseTokenAmount('1.5'); // 1500000000000000000n
\`\`\`

### Address Validation

\`\`\`typescript
import { isValidAddress, shortenAddress } from './abis/frontend/contracts';

if (isValidAddress(userInput)) {
  console.log('Valid address:', shortenAddress(userInput));
}
\`\`\`

## 📊 Pool Information

### Pool Types

1. **Short-term Pool**: 30 days, 10% APY
2. **Medium-term Pool**: 90 days, 25% APY
3. **Long-term Pool**: 180 days, 50% APY
4. **Premium Pool**: 365 days, 100% APY

### Pool Configuration

\`\`\`typescript
interface PoolConfig {
  poolId: number;
  name: string;
  duration: number; // seconds
  multiplier: number; // basis points (10000 = 100%)
  active: boolean;
  totalStaked: string;
  totalRewards: string;
}
\`\`\`

## 🔐 Access Control

### Roles and Permissions

- **DEFAULT_ADMIN_ROLE**: Full administrative access
- **POOL_MANAGER_ROLE**: Can create and manage staking pools
- **REWARD_MANAGER_ROLE**: Can distribute rewards
- **TOKEN_CREATOR_ROLE**: Can create new tokens

### Contract Ownership

All contracts use OpenZeppelin's Ownable pattern with role-based access control.

## 🚨 Error Handling

### Common Errors

\`\`\`typescript
try {
  await stake({ args: [poolId, amount] });
} catch (error) {
  if (error.message.includes('PoolNotActive')) {
    console.error('Selected pool is not active');
  } else if (error.message.includes('InsufficientBalance')) {
    console.error('Insufficient token balance');
  } else {
    console.error('Transaction failed:', error);
  }
}
\`\`\`

## 📈 Gas Optimization

### Efficient Contract Calls

- Batch multiple operations when possible
- Use multicall for reading multiple values
- Estimate gas before sending transactions
- Monitor gas prices for optimal timing

### Example Gas Estimation

\`\`\`typescript
import { estimateGas } from './abis/frontend/viem';

const gasEstimate = await estimateGas({
  to: CONTRACT_ADDRESSES.${ecosystemABI.network}.RWAStaking,
  data: encodeFunctionData({
    abi: RWA_STAKING_ABI,
    functionName: 'stake',
    args: [poolId, amount],
  }),
});
\`\`\`

## 🔍 Testing

### Unit Tests

Run contract unit tests:
\`\`\`bash
bun run test
\`\`\`

### Integration Tests

Run integration tests:
\`\`\`bash
bun run test:staking:integration
bun run test:dividend-staking
\`\`\`

## 📚 Additional Resources

- [Contract API Reference](./CONTRACT_API_REFERENCE.md)
- [Deployment Addresses](../deployed-addresses-proxy.json)
- [Contract ABIs](../abis/)
- [Generated TypeScript Types](../abis/frontend/contracts.ts)

---

**Generated**: ${new Date().toISOString()}
**Network**: ${ecosystemABI.network}
**Version**: ${ecosystemABI.version}
`;
}

function generateAPIDocumentation(ecosystemABI: EcosystemABI): string {
  return `# Tiger Palace RWA Ecosystem - Contract API Reference

## Overview

Complete API reference for all deployed contracts in the Tiger Palace RWA ecosystem.

**Network**: ${ecosystemABI.network} (Chain ID: ${ecosystemABI.chainId})
**Generated**: ${new Date().toISOString()}

## 📋 Contracts Summary

${Object.entries(ecosystemABI.contracts).map(([name, contract]) =>
  `### ${name}\n**Address**: \`${contract.address}\`\n**Type**: ${contract.contractName.includes('Implementation') ? 'Implementation' : 'Proxy'}\n\n`
).join('')}

---

## 🔧 RWAAssetRegistry

**Address**: \`${ecosystemABI.contracts.RWAAssetRegistry?.address}\`

### Write Functions

#### registerAsset
\`\`\`solidity
function registerAsset(
    address owner,
    string memory title,
    string memory description,
    string memory assetType,
    string memory location,
    uint256 price,
    uint256 tokenPrice,
    uint256 totalTokens
) external returns (uint256 assetId)
\`\`\`

Registers a new real estate asset.

**Parameters:**
- \`owner\`: Address of the asset owner
- \`title\`: Asset title
- \`description\`: Asset description
- \`assetType\`: Type of real estate (apartment, house, commercial, etc.)
- \`location\`: Geographic location
- \`price\`: Total asset price in wei
- \`tokenPrice\`: Price per token in wei
- \`totalTokens\`: Total number of tokens to create

**Returns:** Asset ID (uint256)

**Events:** \`AssetRegistered(assetId, owner, title, price)\`

#### updateAsset
\`\`\`solidity
function updateAsset(
    uint256 assetId,
    string memory title,
    string memory description,
    string memory location,
    uint256 price,
    uint256 tokenPrice
) external
\`\`\`

Updates asset information.

**Parameters:**
- \`assetId\`: Asset ID to update
- \`title\`: New title
- \`description\`: New description
- \`location\`: New location
- \`price\`: New total price
- \`tokenPrice\`: New token price

**Events:** \`AssetUpdated(assetId, msg.sender, block.timestamp)\`

### Read Functions

#### getAsset
\`\`\`solidity
function getAsset(uint256 assetId) external view returns (
    uint256 id,
    address owner,
    string memory title,
    string memory description,
    string memory assetType,
    string memory location,
    uint256 price,
    uint256 tokenPrice,
    uint256 totalTokens,
    uint256 availableTokens,
    uint256 soldTokens,
    uint8 status,
    uint256 createdAt,
    uint256 updatedAt
)
\`\`\`

Gets complete asset information.

**Returns:** Asset struct with all properties

#### getNextAssetId
\`\`\`solidity
function getNextAssetId() external view returns (uint256)
\`\`\`

Gets the next available asset ID.

**Returns:** Next asset ID

---

## 🏭 RWATokenFactory

**Address**: \`${ecosystemABI.contracts.RWATokenFactory?.address}\`

### Write Functions

#### createToken
\`\`\`solidity
function createToken(
    uint256 assetId,
    string memory name,
    string memory symbol,
    uint256 totalSupply,
    address owner
) external returns (address tokenAddress)
\`\`\`

Creates a new ERC-404 token for an asset.

**Parameters:**
- \`assetId\`: Associated asset ID
- \`name\`: Token name
- \`symbol\`: Token symbol
- \`totalSupply\`: Total token supply
- \`owner\`: Initial token owner

**Returns:** Token contract address

**Events:** \`TokenCreated(assetId, tokenAddress, name, symbol, totalSupply)\`

### Read Functions

#### getTokenAddress
\`\`\`solidity
function getTokenAddress(uint256 assetId) external view returns (address)
\`\`\`

Gets token address for an asset.

**Parameters:**
- \`assetId\`: Asset ID

**Returns:** Token contract address

#### getAllTokens
\`\`\`solidity
function getAllTokens() external view returns (address[] memory)
\`\`\`

Gets all created token addresses.

**Returns:** Array of token addresses

---

## 🏪 RWAMarketplace

**Address**: \`${ecosystemABI.contracts.RWAMarketplace?.address}\`

### Write Functions

#### buyTokens
\`\`\`solidity
function buyTokens(uint256 assetId, uint256 amount) external payable
\`\`\`

Purchases tokens for an asset.

**Parameters:**
- \`assetId\`: Asset ID to purchase tokens for
- \`amount\`: Number of tokens to purchase

**Value:** Total payment in ETH (must equal amount * tokenPrice)

**Events:** \`TokensPurchased(msg.sender, assetId, amount, msg.value)\`

#### sellTokens
\`\`\`solidity
function sellTokens(
    uint256 assetId,
    uint256 amount,
    uint256 minPrice
) external
\`\`\`

Sells tokens back to the marketplace.

**Parameters:**
- \`assetId\`: Asset ID
- \`amount\`: Number of tokens to sell
- \`minPrice\`: Minimum price per token (slippage protection)

**Events:** \`TokensSold(msg.sender, assetId, amount, totalReceived)\`

### Read Functions

#### getTokenPrice
\`\`\`solidity
function getTokenPrice(uint256 assetId) external view returns (uint256)
\`\`\`

Gets current token price for an asset.

**Returns:** Price per token in wei

#### getMarketplaceFee
\`\`\`solidity
function getMarketplaceFee() external view returns (uint256)
\`\`\`

Gets current marketplace fee percentage.

**Returns:** Fee in basis points (e.g., 250 = 2.5%)

---

## 💰 RWAStaking

**Address**: \`${ecosystemABI.contracts.RWAStaking?.address}\`

### Write Functions

#### createPool
\`\`\`solidity
function createPool(
    string memory name,
    uint256 duration,
    uint256 multiplier
) external returns (uint256 poolId)
\`\`\`

Creates a new staking pool.

**Parameters:**
- \`name\`: Pool name
- \`duration\`: Lock duration in seconds
- \`multiplier\`: Reward multiplier in basis points

**Returns:** Pool ID

**Events:** \`PoolCreated(poolId, name, duration, multiplier)\`

#### stake
\`\`\`solidity
function stake(uint256 poolId, uint256 amount) external
\`\`\`

Stakes tokens in a pool.

**Parameters:**
- \`poolId\`: Pool ID to stake in
- \`amount\`: Amount of tokens to stake

**Events:** \`Staked(msg.sender, poolId, amount, stakeId)\`

#### claimRewards
\`\`\`solidity
function claimRewards(uint256 stakeId) external
\`\`\`

Claims rewards for a stake.

**Parameters:**
- \`stakeId\`: Stake ID to claim rewards for

**Events:** \`RewardsClaimed(msg.sender, stakeId, amount)\`

### Read Functions

#### getUserStakes
\`\`\`solidity
function getUserStakes(address user) external view returns (
    uint256[] memory stakeIds,
    uint256[] memory poolIds,
    uint256[] memory amounts,
    uint256[] memory startTimes,
    uint256[] memory endTimes,
    bool[] memory claimed,
    uint256[] memory rewards
)
\`\`\`

Gets all stakes for a user.

**Returns:** Arrays containing stake information

#### getAllPools
\`\`\`solidity
function getAllPools() external view returns (
    uint256[] memory poolIds,
    string[] memory names,
    uint256[] memory durations,
    uint256[] memory multipliers,
    bool[] memory actives,
    uint256[] memory totalStakeds,
    uint256[] memory totalRewardss
)
\`\`\`

Gets all staking pools.

**Returns:** Arrays containing pool information

#### getPool
\`\`\`solidity
function getPool(uint256 poolId) external view returns (
    uint256 id,
    string memory name,
    uint256 duration,
    uint256 multiplier,
    bool active,
    uint256 totalStaked,
    uint256 totalRewards
)
\`\`\`

Gets information for a specific pool.

**Returns:** Pool struct

---

## 💵 RWARevenue

**Address**: \`${ecosystemABI.contracts.RWARevenue?.address}\`

### Write Functions

#### allocateRevenue
\`\`\`solidity
function allocateRevenue(
    uint256 poolId,
    uint256 amount,
    string memory source
) external
\`\`\`

Allocates revenue to a staking pool.

**Parameters:**
- \`poolId\`: Pool ID to allocate to
- \`amount\`: Amount of revenue to allocate
- \`source\`: Revenue source description

**Events:** \`RevenueAllocated(poolId, amount, source)\`

#### distributeRevenue
\`\`\`solidity
function distributeRevenue(uint256 poolId, uint256 amount) external
\`\`\`

Distributes allocated revenue to stakers.

**Parameters:**
- \`poolId\`: Pool ID
- \`amount\`: Amount to distribute

**Events:** \`RevenueDistributed(poolId, amount)\`

#### claimRevenue
\`\`\`solidity
function claimRevenue(uint256 poolId) external
\`\`\`

Claims revenue share for the caller.

**Parameters:**
- \`poolId\`: Pool ID to claim from

**Events:** \`RevenueClaimed(msg.sender, poolId, amount)\`

### Read Functions

#### getRevenueStats
\`\`\`solidity
function getRevenueStats() external view returns (
    uint256 totalAllocated,
    uint256 totalDistributed,
    uint256 pendingRevenue,
    uint256 marketplaceFees,
    uint256 propertyDividends,
    uint256 stakingRewards
)
\`\`\`

Gets comprehensive revenue statistics.

**Returns:** Revenue statistics struct

#### getPoolRevenueStats
\`\`\`solidity
function getPoolRevenueStats(uint256 poolId) external view returns (
    uint256 allocated,
    uint256 distributed,
    uint256 pending
)
\`\`\`

Gets revenue statistics for a specific pool.

**Returns:** Pool revenue statistics

---

## 🎁 RWARewardDistributor

**Address**: \`${ecosystemABI.contracts.RWARewardDistributor?.address}\`

### Write Functions

#### addRewards
\`\`\`solidity
function addRewards(uint256 amount, string memory source) external
\`\`\`

Adds rewards to the reward pool.

**Parameters:**
- \`amount\`: Amount of rewards to add
- \`source\`: Reward source description

**Events:** \`RewardsAdded(amount, source)\`

#### distributeRewards
\`\`\`solidity
function distributeRewards(uint256 amount) external
\`\`\`

Distributes rewards to stakers.

**Parameters:**
- \`amount\`: Amount to distribute

**Events:** \`RewardsDistributed(amount, stakingContract)\`

### Read Functions

#### getRewardPoolStats
\`\`\`solidity
function getRewardPoolStats() external view returns (
    uint256 totalRewardPool,
    uint256 distributedRewards,
    uint256 pendingRewards,
    uint256 totalRevenueCollected,
    uint256 marketplaceFeesCollected,
    uint256 propertyDividendsCollected
)
\`\`\`

Gets comprehensive reward pool statistics.

**Returns:** Reward pool statistics

#### getAvailableBalance
\`\`\`solidity
function getAvailableBalance() external view returns (uint256)
\`\`\`

Gets available reward token balance.

**Returns:** Available balance

---

## 👥 MembershipSystem

**Address**: \`${ecosystemABI.contracts.MembershipSystem?.address}\`

### Write Functions

#### createMembership
\`\`\`solidity
function createMembership(
    address member,
    string memory tier,
    uint256 duration
) external
\`\`\`

Creates a membership for a user.

**Parameters:**
- \`member\`: Member address
- \`tier\`: Membership tier
- \`duration\`: Membership duration in seconds

**Events:** \`MembershipCreated(member, membershipId, tier, expiry)\`

#### renewMembership
\`\`\`solidity
function renewMembership(uint256 membershipId, uint256 duration) external
\`\`\`

Renews an existing membership.

**Parameters:**
- \`membershipId\`: Membership ID to renew
- \`duration\`: Additional duration in seconds

**Events:** \`MembershipRenewed(membershipId, newExpiry)\`

### Read Functions

#### getMembership
\`\`\`solidity
function getMembership(uint256 membershipId) external view returns (
    uint256 id,
    address member,
    string memory tier,
    uint256 createdAt,
    uint256 expiresAt,
    bool active
)
\`\`\`

Gets membership information.

**Returns:** Membership struct

#### getUserMemberships
\`\`\`solidity
function getUserMemberships(address user) external view returns (uint256[] memory)
\`\`\`

Gets all membership IDs for a user.

**Returns:** Array of membership IDs

---

## 🔐 Access Control

### Roles

- \`DEFAULT_ADMIN_ROLE\`: Full administrative access
- \`POOL_MANAGER_ROLE\`: Pool creation and management
- \`REWARD_MANAGER_ROLE\`: Reward distribution
- \`TOKEN_CREATOR_ROLE\`: Token creation
- \`MARKETPLACE_ROLE\`: Marketplace operations

### Role Management

\`\`\`solidity
function grantRole(bytes32 role, address account) external
function revokeRole(bytes32 role, address account) external
function hasRole(bytes32 role, address account) external view returns (bool)
\`\`\`

---

## 📊 Data Structures

### Asset Struct
\`\`\`solidity
struct Asset {
    uint256 id;
    address owner;
    string title;
    string description;
    string assetType;
    string location;
    uint256 price;
    uint256 tokenPrice;
    uint256 totalTokens;
    uint256 availableTokens;
    uint256 soldTokens;
    uint8 status;
    uint256 createdAt;
    uint256 updatedAt;
}
\`\`\`

### Pool Struct
\`\`\`solidity
struct Pool {
    uint256 poolId;
    string name;
    uint256 duration;
    uint256 multiplier;
    bool active;
    uint256 totalStaked;
    uint256 totalRewards;
}
\`\`\`

### Stake Struct
\`\`\`solidity
struct Stake {
    uint256 stakeId;
    uint256 poolId;
    uint256 amount;
    uint256 startTime;
    uint256 endTime;
    bool claimed;
    uint256 rewards;
}
\`\`\`

---

## 🚨 Error Messages

### Common Errors

- \`AssetNotFound\`: Asset does not exist
- \`PoolNotActive\`: Pool is not active
- \`InsufficientBalance\`: Insufficient token balance
- \`UnauthorizedAccess\`: Missing required role
- \`InvalidAmount\`: Invalid amount parameter
- \`TransferFailed\`: Token transfer failed

---

**Generated**: ${new Date().toISOString()}
**Network**: ${ecosystemABI.network}
**Version**: ${ecosystemABI.version}
`;
}

/**
 * Main execution
 */
async function main() {
  await generateComprehensiveABIs();
}

main()
  .then(() => {
    console.log('\n🎉 Comprehensive ABI generation completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Comprehensive ABI generation failed:', error);
    process.exit(1);
  });
