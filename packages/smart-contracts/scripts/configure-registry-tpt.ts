#!/usr/bin/env tsx
/**
 * Configure Registry Contract with TPT Token
 * 
 * Sets the TPT token address in the RWAAssetRegistry contract (if supported)
 * or configures TPT token for all existing RWA tokens created by the factory.
 * 
 * Usage:
 *   cd smart-contracts
 *   npx hardhat run scripts/configure-registry-tpt.ts --network sepolia
 */

import 'dotenv/config';
import hre from 'hardhat';
const { ethers } = hre;

// Contract addresses
// Registry Proxy: 0xe2d49642B5aE5D0f62dA79D572d04cA95dB2853D (confirmed on Etherscan)
// Implementation: 0x9e2eD8f46fEb7f70158f1201C06944B724e83411
// Proxy Admin: 0x9d55BcFA47e88868B54C811041A942250d7F3DD9
const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_RWA_ASSET_REGISTRY || 
                        process.env.RWA_ASSET_REGISTRY || 
                        '0xe2d49642B5aE5D0f62dA79D572d04cA95dB2853D'; // Proxy address (use this)
const TPT_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_TPT_ADDRESS || 
                         process.env.TPT_TOKEN_ADDRESS || 
                         '0xb0af8e94C74c2346609c3d94FCba61Ae85cf3e6e';
const TOKEN_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_RWA_TOKEN_FACTORY || 
                              process.env.RWA_TOKEN_FACTORY || 
                              '0x2f051A127Ab4B8b0D78aB5758E06a808a8445566'; // Proxy address

// Minimal ABIs
const REGISTRY_ABI = [
  'function setTokenizinToken(address tptAddress)',
  'function tokenizinToken() view returns (address)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
];

const FACTORY_ABI = [
  'function getTokenAddress(uint256 assetId) view returns (address)',
  'function getAllTokens() view returns (address[])',
  'function isValidToken(address tokenAddress) view returns (bool)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
];

const REGISTRY_ABI_FULL = [
  'function getActiveAssets() view returns (uint256[])',
  'function getAsset(uint256 assetId) view returns (tuple(uint256 id, address owner, string title, string description, string assetType, string location, uint256 price, uint256 tokenPrice, uint256 totalTokens, uint256 availableTokens, uint256 soldTokens, uint8 status, uint256 createdAt, uint256 updatedAt))',
];

const TOKEN_ABI = [
  'function setTokenizinToken(address tptAddress)',
  'function tokenizinToken() view returns (address)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
];

const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';

async function checkAndSetTPTInRegistry(): Promise<boolean> {
  console.log('\n🔍 Checking RWAAssetRegistry for TPT token configuration...');
  console.log(`   Registry Proxy: ${REGISTRY_ADDRESS}`);
  console.log(`   Implementation: 0x9e2eD8f46fEb7f70158f1201C06944B724e83411`);
  console.log(`   Proxy Admin: 0x9d55BcFA47e88868B54C811041A942250d7F3DD9`);
  console.log('   ℹ️  Registry contract does not support TPT token configuration');
  console.log('   (TPT token is configured on individual RWAToken contracts, not the registry)');
  console.log('   (Registry only tracks asset metadata - tokens handle their own TPT configuration)');
  return false;
}

async function checkAndSetTPTInFactory(): Promise<boolean> {
  console.log('\n🔍 Checking RWATokenFactory for TPT token configuration...');
  console.log('   ℹ️  Factory contract does not support TPT token configuration');
  console.log('   (TPT token is configured on individual RWAToken contracts after creation)');
  return false;
}

async function configureExistingTokens(): Promise<number> {
  console.log('\n🔍 Configuring TPT token for existing RWA tokens...');
  
  try {
    const factory = await ethers.getContractAt(FACTORY_ABI, TOKEN_FACTORY_ADDRESS);
    const registry = await ethers.getContractAt(REGISTRY_ABI_FULL, REGISTRY_ADDRESS);
    const [deployer] = await ethers.getSigners();
    
    // Get all tokens from factory
    let tokenAddresses: string[] = [];
    try {
      tokenAddresses = await factory.getAllTokens();
      console.log(`   Found ${tokenAddresses.length} token(s) in factory`);
    } catch (error: any) {
      console.log(`   ⚠️  Could not get tokens from factory: ${error.message.substring(0, 100)}`);
      
      // Fallback: Try to get tokens from registry active assets
      try {
        const activeAssetIds = await registry.getActiveAssets();
        console.log(`   Found ${activeAssetIds.length} active asset(s) in registry`);
        
        for (const assetId of activeAssetIds) {
          try {
            const tokenAddress = await factory.getTokenAddress(assetId);
            if (tokenAddress !== ethers.ZeroAddress) {
              tokenAddresses.push(tokenAddress);
            }
          } catch {
            // Skip if token doesn't exist for this asset
          }
        }
        console.log(`   Found ${tokenAddresses.length} token(s) via registry`);
      } catch (regError: any) {
        console.log(`   ⚠️  Could not get tokens from registry: ${regError.message.substring(0, 100)}`);
        return 0;
      }
    }
    
    if (tokenAddresses.length === 0) {
      console.log('   ℹ️  No tokens found to configure');
      return 0;
    }
    
    let configuredCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const tokenAddress of tokenAddresses) {
      try {
        const token = await ethers.getContractAt(TOKEN_ABI, tokenAddress);
        
        // Check current TPT
        const currentTPT = await token.tokenizinToken();
        
        if (currentTPT.toLowerCase() === TPT_TOKEN_ADDRESS.toLowerCase()) {
          console.log(`   ✅ ${tokenAddress.substring(0, 10)}... already configured`);
          continue;
        }
        
        if (currentTPT === ethers.ZeroAddress) {
          console.log(`   ⚙️  Configuring ${tokenAddress.substring(0, 10)}... (TPT not set)`);
        } else {
          console.log(`   ⚙️  Updating ${tokenAddress.substring(0, 10)}... (current: ${currentTPT.substring(0, 10)}...)`);
        }
        
        // Check if deployer has admin role
        const hasAdminRole = await token.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
        
        if (!hasAdminRole) {
          console.log(`   ⚠️  ${tokenAddress.substring(0, 10)}... - deployer does not have admin role`);
          skippedCount++;
          continue;
        }
        
        // Set TPT token
        const tx = await token.setTigerPalaceToken(TPT_TOKEN_ADDRESS);
        console.log(`      Transaction: ${tx.hash}`);
        await tx.wait();
        configuredCount++;
        console.log(`   ✅ ${tokenAddress.substring(0, 10)}... configured successfully`);
        
      } catch (error: any) {
        errorCount++;
        const errorMsg = error.message || String(error);
        if (errorMsg.includes('setTokenizinToken')) {
          console.log(`   ⚠️  ${tokenAddress.substring(0, 10)}... - contract does not support setTokenizinToken`);
        } else {
          console.log(`   ❌ ${tokenAddress.substring(0, 10)}... - Error: ${errorMsg.substring(0, 80)}`);
        }
      }
    }
    
    console.log(`\n   📊 Results: ${configuredCount} configured, ${skippedCount} skipped, ${errorCount} errors`);
    
    return configuredCount;
  } catch (error: any) {
    console.error(`   ❌ Error configuring tokens: ${error.message}`);
    return 0;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   REGISTRY TPT TOKEN CONFIGURATION                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  // Check network
  const network = await ethers.provider.getNetwork();
  const SEPOLIA_CHAIN_ID = BigInt(11155111);
  
  if (network.chainId !== SEPOLIA_CHAIN_ID) {
    console.error(`\n❌ ERROR: Wrong network detected!`);
    console.error(`   Current: ${network.name} (Chain ID: ${network.chainId})`);
    console.error(`   Required: Sepolia (Chain ID: ${SEPOLIA_CHAIN_ID})`);
    console.error(`\n   Fix: Use Hardhat with --network sepolia flag:`);
    console.error(`   npx hardhat run scripts/configure-registry-tpt.ts --network sepolia\n`);
    process.exit(1);
  }
  
  console.log(`✅ Connected to Sepolia network (Chain ID: ${network.chainId})\n`);
  
  const [deployer] = await ethers.getSigners();
  console.log(`📋 Configuration:`);
  console.log(`   Registry Proxy: ${REGISTRY_ADDRESS}`);
  console.log(`      Implementation: 0x9e2eD8f46fEb7f70158f1201C06944B724e83411`);
  console.log(`      Proxy Admin: 0x9d55BcFA47e88868B54C811041A942250d7F3DD9`);
  console.log(`   Token Factory Proxy: ${TOKEN_FACTORY_ADDRESS}`);
  console.log(`   TPT Token Proxy: ${TPT_TOKEN_ADDRESS}`);
  console.log(`   Deployer: ${deployer.address}\n`);
  
  // Try to configure registry
  const registryConfigured = await checkAndSetTPTInRegistry();
  
  // Try to configure factory
  const factoryConfigured = await checkAndSetTPTInFactory();
  
  // Configure existing tokens
  const tokensConfigured = await configureExistingTokens();
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 CONFIGURATION SUMMARY');
  console.log('='.repeat(70));
  console.log(`   Registry TPT Configured: ${registryConfigured ? '✅ Yes' : '⚠️  Not supported/needed'}`);
  console.log(`   Factory TPT Configured: ${factoryConfigured ? '✅ Yes' : '⚠️  Not supported/needed'}`);
  console.log(`   Existing Tokens Configured: ${tokensConfigured} token(s)`);
  console.log('='.repeat(70) + '\n');
  
  console.log('📝 Notes:');
  console.log('   - Individual RWA tokens need TPT configured for dividend distribution');
  console.log('   - New tokens created after factory configuration will use the factory TPT');
  console.log('   - Existing tokens may need manual configuration by asset owners');
  console.log('\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Configuration failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  });

