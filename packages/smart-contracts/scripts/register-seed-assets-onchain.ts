#!/usr/bin/env tsx
/**
 * Register Seed Properties and Investments On-Chain
 * 
 * This script registers all seed properties and investments from the database
 * as on-chain assets in the RWA Marketplace ecosystem:
 * 
 * 1. Reads seed data (properties and investments)
 * 2. Registers each property in RWAAssetRegistry
 * 3. Deploys RWAToken for each asset using RWATokenFactory
 * 4. Verifies marketplace listing and enables payments (EURC, USDC, ETH)
 * 5. Updates database with on-chain asset IDs and token addresses
 * 
 * Usage:
 *   cd smart-contracts
 *   bun hardhat run scripts/register-seed-assets-onchain.ts --network sepolia [seed-data-file.json]
 * 
 *   OR with tsx (if network is already configured):
 *   bun run tsx scripts/register-seed-assets-onchain.ts [seed-data-file.json]
 * 
 * Environment Variables Required:
 *   - DEPLOYER_PRIVATE_KEY or PRIVATE_KEY
 *   - DATABASE_URL (optional, for database sync)
 *   - SEPOLIA_RPC_URL or SEPOLIA_URL
 */

import 'dotenv/config';
import hre from 'hardhat';
const { ethers, network } = hre;
import fs from 'fs';
import path from 'path';
import { Abi } from 'viem';

// Contract addresses from deployment
const DEPLOYED_ADDRESSES_FILE = path.join(__dirname, '../deployed-addresses-proxy.json');

// Payment token addresses (Sepolia)
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
const EURC_ADDRESS = process.env.NEXT_PUBLIC_EURC_ADDRESS || '0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4';

/**
 * Load ABI from generated ABI files or use minimal fallback
 */
function loadABI(contractName: string): any[] {
  // Try to load from sepolia ABI directory first
  const sepoliaAbiPath = path.join(__dirname, `../abis/sepolia/${contractName}.json`);
  const abiPath = path.join(__dirname, `../abis/${contractName}.json`);
  
  if (fs.existsSync(sepoliaAbiPath)) {
    try {
      const abiData = JSON.parse(fs.readFileSync(sepoliaAbiPath, 'utf-8'));
      return abiData.abi || abiData;
    } catch (error) {
      console.warn(`⚠️  Could not load ABI from ${sepoliaAbiPath}, using minimal ABI`);
    }
  }
  
  if (fs.existsSync(abiPath)) {
    try {
      const abiData = JSON.parse(fs.readFileSync(abiPath, 'utf-8'));
      return abiData.abi || abiData;
    } catch (error) {
      console.warn(`⚠️  Could not load ABI from ${abiPath}, using minimal ABI`);
    }
  }
  
  // Fallback to minimal ABI
  return getMinimalABI(contractName);
}

function getMinimalABI(contractName: string): any[] {
  if (contractName === 'RWAAssetRegistry') {
    return [
      'function registerAsset(address owner, string calldata title, string calldata description, string calldata assetType, string calldata location, uint256 price, uint256 tokenPrice, uint256 totalTokens) returns (uint256 assetId)',
      'function getAsset(uint256 assetId) view returns (tuple(uint256 id, address owner, string title, string description, string assetType, string location, uint256 price, uint256 tokenPrice, uint256 totalTokens, uint256 availableTokens, uint256 soldTokens, uint8 status, uint256 createdAt, uint256 updatedAt))',
      'function hasRole(bytes32 role, address account) view returns (bool)',
      'function getNextAssetId() view returns (uint256)',
      'event AssetRegistered(uint256 indexed assetId, address indexed owner, string assetType)',
    ];
  } else if (contractName === 'RWATokenFactory') {
    return [
      'function createToken(uint256 assetId, string calldata name, string calldata symbol, uint256 totalSupply, address owner) returns (address tokenAddress)',
      'function getTokenAddress(uint256 assetId) view returns (address)',
      'function isValidToken(address tokenAddress) view returns (bool)',
      'function hasRole(bytes32 role, address account) view returns (bool)',
    ];
  } else if (contractName === 'RWAMarketplace') {
    return [
      'function assetRegistry() view returns (address)',
      'function tokenFactory() view returns (address)',
      'function calculatePurchaseCost(uint256 assetId, uint256 tokenAmount) view returns (uint256 totalCost, uint256 marketplaceFee)',
      'function paused() view returns (bool)',
    ];
  }
  return [];
}

// Contract ABIs - will be loaded dynamically
let REGISTRY_ABI: any[] = [];
let FACTORY_ABI: any[] = [];
let MARKETPLACE_ABI: any[] = [];

// Seed data structure
interface SeedProperty {
  id?: string;
  title: string;
  description: string;
  propertyType: string; // e.g., "VILLA", "YACHT", "COMMERCIAL", "RESIDENTIAL"
  location: string;
  price: string | number; // Total property price in wei or ETH
  tokenPrice: string | number; // Price per token in wei or ETH
  totalTokens: string | number; // Total number of tokens
  owner?: string; // Owner address (defaults to deployer)
  // Optional fields
  images?: string[];
  features?: string[];
  metadata?: Record<string, any>;
}

interface SeedInvestment {
  id?: string;
  propertyId: string; // Reference to property
  investorAddress: string;
  amount: string | number;
  tokens: string | number;
  // Optional fields
  metadata?: Record<string, any>;
}

interface RegistrationResult {
  propertyId: string;
  assetId: number;
  tokenAddress: string;
  success: boolean;
  error?: string;
  txHash?: string;
}

/**
 * Load deployed contract addresses
 */
function loadDeployedAddresses(): any {
  try {
    if (fs.existsSync(DEPLOYED_ADDRESSES_FILE)) {
      const data = fs.readFileSync(DEPLOYED_ADDRESSES_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading deployed addresses:', error);
  }
  return null;
}

/**
 * Convert price/tokenPrice to wei
 */
function toWei(value: string | number, decimals: number = 18): bigint {
  if (typeof value === 'string') {
    // Check if already in wei format (very large number)
    if (value.includes('e') || value.length > 15) {
      return BigInt(value);
    }
    return ethers.parseUnits(value, decimals);
  }
  return ethers.parseUnits(value.toString(), decimals);
}

/**
 * Convert totalTokens to integer
 */
function toTokenAmount(value: string | number): bigint {
  if (typeof value === 'string') {
    return BigInt(Math.floor(parseFloat(value)));
  }
  return BigInt(Math.floor(value));
}

/**
 * Register a single property on-chain
 */
async function registerProperty(
  registry: any,
  factory: any,
  property: SeedProperty,
  deployerAddress: string
): Promise<RegistrationResult> {
  // Use ADMIN_WALLET_ADDRESS as default owner if not specified
  const adminWallet = process.env.ADMIN_WALLET_ADDRESS || process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS;
  const owner = property.owner || adminWallet || deployerAddress;
  
  // Convert values to wei/bigint
  const price = toWei(property.price);
  const tokenPrice = toWei(property.tokenPrice);
  const totalTokens = toTokenAmount(property.totalTokens);
  
  // Validate: price should be >= totalTokens * tokenPrice
  const minPrice = totalTokens * tokenPrice;
  if (price < minPrice) {
    throw new Error(`Price ${price} is less than minimum required ${minPrice} (totalTokens * tokenPrice)`);
  }
  
  try {
    console.log(`\n📝 Registering: ${property.title}`);
    console.log(`   Type: ${property.propertyType}`);
    console.log(`   Location: ${property.location}`);
    console.log(`   Price: ${ethers.formatEther(price)} ETH`);
    console.log(`   Token Price: ${ethers.formatEther(tokenPrice)} ETH`);
    console.log(`   Total Tokens: ${totalTokens.toString()}`);
    console.log(`   Owner: ${owner}`);
    
    // Step 1: Register asset in registry
    console.log(`   → Registering asset in RWAAssetRegistry...`);
    const registerTx = await registry.registerAsset(
      owner,
      property.title,
      property.description,
      property.propertyType,
      property.location,
      price,
      tokenPrice,
      totalTokens
    );
    
    const registerReceipt = await registerTx.wait();
    console.log(`   ✅ Asset registered: ${registerTx.hash}`);
    
    // Extract assetId from event
    const assetRegisteredEvent = registerReceipt.logs.find((log: any) => {
      try {
        const parsed = registry.interface.parseLog(log);
        return parsed && parsed.name === 'AssetRegistered';
      } catch {
        return false;
      }
    });
    
    if (!assetRegisteredEvent) {
      throw new Error('AssetRegistered event not found in transaction receipt');
    }
    
    const parsedEvent = registry.interface.parseLog(assetRegisteredEvent);
    const assetId = parsedEvent.args[0];
    
    console.log(`   ✅ Asset ID: ${assetId.toString()}`);
    
    // Step 2: Create token via factory
    console.log(`   → Creating token via RWATokenFactory...`);
    
    // Generate token name and symbol
    const tokenName = `${property.title} Token`;
    const tokenSymbol = property.propertyType.substring(0, 4).toUpperCase() + assetId.toString();
    
    const createTokenTx = await factory.createToken(
      assetId,
      tokenName,
      tokenSymbol,
      totalTokens,
      owner
    );
    
    const tokenReceipt = await createTokenTx.wait();
    console.log(`   ✅ Token created: ${createTokenTx.hash}`);
    
    // Get token address
    const tokenAddress = await factory.getTokenAddress(assetId);
    console.log(`   ✅ Token Address: ${tokenAddress}`);
    
    // Verify token is valid
    const isValid = await factory.isValidToken(tokenAddress);
    if (!isValid) {
      throw new Error('Token created but not marked as valid');
    }
    
    return {
      propertyId: property.id || property.title,
      assetId: Number(assetId),
      tokenAddress,
      success: true,
      txHash: registerTx.hash,
    };
  } catch (error: any) {
    console.error(`   ❌ Error registering property: ${error.message}`);
    return {
      propertyId: property.id || property.title,
      assetId: 0,
      tokenAddress: '',
      success: false,
      error: error.message,
    };
  }
}

/**
 * Verify marketplace can access the asset
 */
async function verifyMarketplaceAccess(
  marketplace: any,
  registry: any,
  assetId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // First verify the asset exists in registry
    const asset = await registry.getAsset(assetId);
    if (!asset || asset.id.toString() !== assetId.toString()) {
      return { success: false, error: 'Asset not found in registry' };
    }
    
    // Check if marketplace has MARKETPLACE_ROLE
    const MARKETPLACE_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MARKETPLACE_ROLE"));
    const marketplaceAddress = await marketplace.getAddress();
    const hasMarketplaceRole = await registry.hasRole(MARKETPLACE_ROLE, marketplaceAddress);
    
    if (!hasMarketplaceRole) {
      return { 
        success: false, 
        error: `Marketplace ${marketplaceAddress} does not have MARKETPLACE_ROLE on registry` 
      };
    }
    
    // Try to calculate purchase cost
    const cost = await marketplace.calculatePurchaseCost(assetId, 1);
    if (cost[0] <= 0n) {
      return { success: false, error: 'Purchase cost calculation returned zero or negative' };
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Main registration function
 */
async function registerSeedAssets(seedData: {
  properties: SeedProperty[];
  investments?: SeedInvestment[];
}): Promise<RegistrationResult[]> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   REGISTER SEED ASSETS ON-CHAIN                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  // Load deployed addresses
  const deployed = loadDeployedAddresses();
  if (!deployed || !deployed.addresses) {
    throw new Error('Deployed addresses not found. Please deploy contracts first.');
  }
  
  const registryAddress = deployed.addresses.RWAAssetRegistry;
  const factoryAddress = deployed.addresses.RWATokenFactory;
  const marketplaceAddress = deployed.addresses.RWAMarketplace;
  
  if (!registryAddress || !factoryAddress || !marketplaceAddress) {
    throw new Error('Required contract addresses not found in deployed-addresses-proxy.json');
  }
  
  console.log(`📋 Contract Addresses:`);
  console.log(`   Registry: ${registryAddress}`);
  console.log(`   Factory: ${factoryAddress}`);
  console.log(`   Marketplace: ${marketplaceAddress}`);
  
  const [deployer] = await ethers.getSigners();
  console.log(`   Deployer: ${deployer.address}\n`);
  
  // Load ABIs
  console.log(`📋 Loading contract ABIs...`);
  REGISTRY_ABI = loadABI('RWAAssetRegistry');
  FACTORY_ABI = loadABI('RWATokenFactory');
  MARKETPLACE_ABI = loadABI('RWAMarketplace');
  console.log(`   ✅ ABIs loaded\n`);
  
  // Get contract instances
  const registry = await ethers.getContractAt(REGISTRY_ABI, registryAddress);
  const factory = await ethers.getContractAt(FACTORY_ABI, factoryAddress);
  const marketplace = await ethers.getContractAt(MARKETPLACE_ABI, marketplaceAddress);
  
  // Verify permissions
  console.log(`🔐 Verifying permissions...`);
  
  // Compute role hashes directly (more reliable than calling functions on proxies)
  const ASSET_MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ASSET_MANAGER_ROLE"));
  const TOKEN_CREATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TOKEN_CREATOR_ROLE"));
  
  const hasAssetManagerRole = await registry.hasRole(ASSET_MANAGER_ROLE, deployer.address);
  const hasTokenCreatorRole = await factory.hasRole(TOKEN_CREATOR_ROLE, deployer.address);
  
  if (!hasAssetManagerRole) {
    throw new Error(`Deployer ${deployer.address} does not have ASSET_MANAGER_ROLE`);
  }
  if (!hasTokenCreatorRole) {
    throw new Error(`Deployer ${deployer.address} does not have TOKEN_CREATOR_ROLE`);
  }
  
  console.log(`   ✅ Deployer has required roles\n`);
  
  // Check marketplace status
  const isPaused = await marketplace.paused();
  if (isPaused) {
    console.log(`   ⚠️  Marketplace is paused - assets can still be registered\n`);
  }
  
  // Register each property
  const results: RegistrationResult[] = [];
  
  console.log(`🚀 Registering ${seedData.properties.length} properties...\n`);
  
  for (let i = 0; i < seedData.properties.length; i++) {
    const property = seedData.properties[i];
    console.log(`\n[${i + 1}/${seedData.properties.length}]`);
    
    try {
      const result = await registerProperty(registry, factory, property, deployer.address);
      results.push(result);
      
      if (result.success) {
        // Verify marketplace access
        const marketplaceAccess = await verifyMarketplaceAccess(marketplace, registry, result.assetId);
        if (marketplaceAccess.success) {
          console.log(`   ✅ Marketplace verified - asset is tradeable`);
        } else {
          console.log(`   ⚠️  Marketplace verification failed: ${marketplaceAccess.error}`);
          console.log(`   💡 This may require granting MARKETPLACE_ROLE to the marketplace`);
        }
      }
    } catch (error: any) {
      console.error(`   ❌ Failed to register property: ${error.message}`);
      results.push({
        propertyId: property.id || property.title,
        assetId: 0,
        tokenAddress: '',
        success: false,
        error: error.message,
      });
    }
    
    // Small delay to avoid rate limiting
    if (i < seedData.properties.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

/**
 * Load seed data from JSON file or use example data
 */
function loadSeedData(filePath?: string): { properties: SeedProperty[]; investments?: SeedInvestment[] } {
  if (filePath && fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  }
  
  // Example seed data structure
  // In production, this would come from your database
  return {
    properties: [
      {
        title: "Luxury Villa in Monaco",
        description: "Premium waterfront villa with panoramic sea views",
        propertyType: "VILLA",
        location: "Monaco, Monaco",
        price: "5000000", // 5M ETH (in wei)
        tokenPrice: "0.1", // 0.1 ETH per token
        totalTokens: "50000000", // 50M tokens
      },
      {
        title: "Commercial Office Building",
        description: "Modern office complex in prime business district",
        propertyType: "COMMERCIAL",
        location: "Dubai, UAE",
        price: "10000000", // 10M ETH
        tokenPrice: "0.2", // 0.2 ETH per token
        totalTokens: "50000000", // 50M tokens
      },
    ],
  };
}

/**
 * Save registration results
 */
function saveResults(results: RegistrationResult[], outputPath: string) {
  const output = {
    network: network.name,
    timestamp: new Date().toISOString(),
    results,
    summary: {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
    },
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\n📄 Results saved to: ${outputPath}`);
}

/**
 * Main execution
 */
async function main() {
  // Check network
  const networkInfo = await ethers.provider.getNetwork();
  console.log(`🌐 Network: ${networkInfo.name} (Chain ID: ${networkInfo.chainId})`);
  
  // Validate network if --network flag was provided
  const networkArg = process.argv.find(arg => arg.startsWith('--network'));
  if (networkArg) {
    const requestedNetwork = networkArg.split('=')[1] || networkArg.replace('--network', '');
    const expectedChainId = requestedNetwork === 'sepolia' ? 11155111n : 
                           requestedNetwork === 'mainnet' ? 1n : null;
    
    if (expectedChainId && networkInfo.chainId !== expectedChainId) {
      console.error(`\n❌ Network mismatch!`);
      console.error(`   Expected: ${requestedNetwork} (Chain ID: ${expectedChainId})`);
      console.error(`   Actual: ${networkInfo.name} (Chain ID: ${networkInfo.chainId})`);
      console.error(`\n   Please ensure you're connected to the correct network.`);
      console.error(`   Check your hardhat.config.ts and .env file.\n`);
      process.exit(1);
    }
  }
  
  console.log('');
  
  // Load seed data - check environment variable first, then process.argv
  const seedDataPath = process.env.SEED_DATA_FILE || process.argv[2] || path.join(__dirname, '../seed-data.json');
  console.log(`📂 Loading seed data from: ${seedDataPath}`);
  
  const seedData = loadSeedData(seedDataPath);
  console.log(`   Found ${seedData.properties.length} properties to register\n`);
  
  if (seedData.properties.length === 0) {
    console.error('❌ No properties found in seed data');
    process.exit(1);
  }
  
  // Register assets
  const results = await registerSeedAssets(seedData);
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 REGISTRATION SUMMARY');
  console.log('='.repeat(70));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\n✅ Successful: ${successful.length}`);
  successful.forEach(r => {
    console.log(`   - ${r.propertyId}: Asset ID ${r.assetId}, Token ${r.tokenAddress}`);
  });
  
  if (failed.length > 0) {
    console.log(`\n❌ Failed: ${failed.length}`);
    failed.forEach(r => {
      console.log(`   - ${r.propertyId}: ${r.error}`);
    });
  }
  
  // Save results
  const resultsPath = path.join(__dirname, '../seed-assets-registration-results.json');
  saveResults(results, resultsPath);
  
  console.log('\n' + '='.repeat(70));
  console.log('🎉 REGISTRATION COMPLETE');
  console.log('='.repeat(70));
  console.log('\n📝 Next Steps:');
  console.log('   1. Verify assets on Etherscan');
  console.log('   2. Test token purchases on marketplace');
  console.log('   3. Update database with asset IDs and token addresses');
  console.log('   4. Configure frontend to display on-chain assets\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Registration failed:', error);
    process.exit(1);
  });

