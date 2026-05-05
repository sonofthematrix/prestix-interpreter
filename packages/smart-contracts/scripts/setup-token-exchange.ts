#!/usr/bin/env tsx
/**
 * Token Exchange Setup Script
 * 
 * Configures the TokenExchange contract with:
 * - Exchange rates for all property tokens
 * - Enables property tokens for exchange
 * - Verifies contract configuration
 * 
 * Usage:
 *   cd smart-contracts
 *   npx hardhat run scripts/setup-token-exchange.ts --network sepolia
 * 
 * With custom exchange address:
 *   npx hardhat run scripts/setup-token-exchange.ts --network sepolia -- 0xYourExchangeAddress
 * 
 * With custom exchange rate (in TPT per property token):
 *   EXCHANGE_RATE_BPS=10000 npx hardhat run scripts/setup-token-exchange.ts --network sepolia
 *   (10000 = 100 TPT per property token, 1000 = 10 TPT per property token)
 */

import 'dotenv/config';
import hre from 'hardhat';
const { ethers } = hre;

// Contract addresses
const TOKEN_EXCHANGE_ADDRESS = process.env.NEXT_PUBLIC_TOKEN_EXCHANGE_ADDRESS || 
                               process.env.TOKEN_EXCHANGE_ADDRESS || 
                               '0xEBEcD0BB0791efBCc179F83369569f19379cCfB1';
const TPT_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_TPT_ADDRESS || 
                         process.env.TPT_TOKEN_ADDRESS || 
                         '0xb0af8e94C74c2346609c3d94FCba61Ae85cf3e6e';
const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_RWA_ASSET_REGISTRY || 
                        process.env.RWA_ASSET_REGISTRY || 
                        '0xe2d49642B5aE5D0f62dA79D572d04cA95dB2853D';
const TOKEN_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_RWA_TOKEN_FACTORY || 
                              process.env.RWA_TOKEN_FACTORY || 
                              '0x2f051A127Ab4B8b0D78aB5758E06a808a8445566';

// Default exchange rate: 100 TPT per 1 property token (with 18 decimals)
// Can be overridden with EXCHANGE_RATE_BPS environment variable
// EXCHANGE_RATE_BPS=10000 means 100 TPT per property token (10000 / 100 = 100)
// EXCHANGE_RATE_BPS=1000 means 10 TPT per property token (1000 / 100 = 10)
const DEFAULT_EXCHANGE_RATE = process.env.EXCHANGE_RATE_BPS 
  ? ethers.parseUnits((Number(process.env.EXCHANGE_RATE_BPS) / 100).toString(), 18)
  : ethers.parseUnits('100', 18); // 100 TPT per property token

// Minimal ABIs
const EXCHANGE_ABI = [
  'function tptToken() view returns (address)',
  'function setExchangeRate(address propertyToken, uint256 rate)',
  'function setPropertyTokenEnabled(address propertyToken, bool enabled)',
  'function exchangeRates(address propertyToken) view returns (uint256)',
  'function isPropertyTokenEnabled(address propertyToken) view returns (bool)',
  'function getPropertyTokens() view returns (address[])',
  'function getPropertyTokenCount() view returns (uint256)',
  'function getPropertyTokenBalance(address propertyToken) view returns (uint256)',
  'function owner() view returns (address)',
  'function paused() view returns (bool)',
  'function unpause()',
] as const;

const REGISTRY_ABI = [
  'function getActiveAssets() view returns (uint256[])',
  'function getActiveAssetsCount() view returns (uint256)',
  'function getActiveAssetId(uint256 index) view returns (uint256)',
  'function getNextAssetId() view returns (uint256)',
  'function getAsset(uint256 assetId) view returns (tuple(uint256 id, address owner, string title, string description, string assetType, string location, uint256 price, uint256 tokenPrice, uint256 totalTokens, uint256 availableTokens, uint256 soldTokens, uint8 status, uint256 createdAt, uint256 updatedAt))',
] as const;

const FACTORY_ABI = [
  'function getTokenAddress(uint256 assetId) view returns (address)',
  'function getAllTokens() view returns (address[])',
  'function isValidToken(address tokenAddress) view returns (bool)',
] as const;

const FACTORY_404_ADDRESS = process.env.NEXT_PUBLIC_RWA_TOKEN_FACTORY_404 || 
                            process.env.RWA_TOKEN_FACTORY_404 || 
                            '0xdC2AE75dC0D14E2f450156bE83c1F71920b6a896';

const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address account) view returns (uint256)',
] as const;

interface TokenInfo {
  address: string;
  assetId?: bigint;
  name?: string;
  symbol?: string;
  exchangeRate?: bigint;
  enabled?: boolean;
  balance?: bigint;
}

async function verifyExchangeContract(address: string): Promise<boolean> {
  console.log(`\n🔍 Verifying TokenExchange contract at ${address}...`);
  
  try {
    const network = await ethers.provider.getNetwork();
    console.log(`   Network: ${network.name} (Chain ID: ${network.chainId})`);
    
    const code = await ethers.provider.getCode(address);
    if (code === '0x') {
      console.error(`❌ No contract code found at ${address}`);
      return false;
    }
    
    console.log(`   ✅ Contract code found (${code.length} bytes)`);
    
    const exchange = await ethers.getContractAt(EXCHANGE_ABI as any, address);
    
    try {
      const tptToken = await exchange.tptToken();
      const owner = await exchange.owner();
      const paused = await exchange.paused();
      
      console.log(`   ✅ TokenExchange contract verified`);
      console.log(`      TPT Token: ${tptToken}`);
      console.log(`      Owner: ${owner}`);
      console.log(`      Paused: ${paused ? 'Yes ⚠️' : 'No ✅'}`);
      
      return true;
    } catch (error: any) {
      console.error(`❌ Contract doesn't have required functions: ${error.message}`);
      return false;
    }
  } catch (error: any) {
    console.error(`❌ Error verifying exchange: ${error.message}`);
    return false;
  }
}

async function getPropertyTokens(): Promise<TokenInfo[]> {
  console.log('\n🔍 Discovering property tokens...');
  
  try {
    const factory = await ethers.getContractAt(FACTORY_ABI as any, TOKEN_FACTORY_ADDRESS);
    const factory404 = await ethers.getContractAt(FACTORY_ABI as any, FACTORY_404_ADDRESS);
    const registry = await ethers.getContractAt(REGISTRY_ABI as any, REGISTRY_ADDRESS);
    
    let tokenAddresses: string[] = [];
    const tokenInfoMap: Map<string, TokenInfo> = new Map();
    
    // Method 1: Try to get all tokens from factory
    try {
      const factoryTokens = await factory.getAllTokens();
      console.log(`   ✅ Found ${factoryTokens.length} token(s) from RWATokenFactory.getAllTokens()`);
      for (const addr of factoryTokens) {
        if (addr !== ethers.ZeroAddress && !tokenInfoMap.has(addr)) {
          tokenAddresses.push(addr);
          tokenInfoMap.set(addr, { address: addr });
        }
      }
    } catch (error: any) {
      console.log(`   ⚠️  RWATokenFactory.getAllTokens() failed: ${error.message.substring(0, 80)}`);
    }
    
    // Method 2: Try to get all tokens from factory404
    try {
      const factory404Tokens = await factory404.getAllTokens();
      console.log(`   ✅ Found ${factory404Tokens.length} token(s) from RWATokenFactory404.getAllTokens()`);
      for (const addr of factory404Tokens) {
        if (addr !== ethers.ZeroAddress && !tokenInfoMap.has(addr)) {
          tokenAddresses.push(addr);
          tokenInfoMap.set(addr, { address: addr });
        }
      }
    } catch (error: any) {
      console.log(`   ⚠️  RWATokenFactory404.getAllTokens() failed: ${error.message.substring(0, 80)}`);
    }
    
    // Method 3: Get tokens from registry active assets (via factory)
    try {
      let activeAssetIds: bigint[] = [];
      
      // Try getActiveAssets() first
      try {
        activeAssetIds = await registry.getActiveAssets();
        console.log(`   ✅ Found ${activeAssetIds.length} active asset(s) from registry.getActiveAssets()`);
      } catch {
        // Fallback: Try getActiveAssetsCount() and iterate
        try {
          const count = await registry.getActiveAssetsCount();
          console.log(`   ✅ Found ${count.toString()} active asset(s) from registry.getActiveAssetsCount()`);
          for (let i = 0; i < Number(count); i++) {
            try {
              const assetId = await registry.getActiveAssetId(i);
              activeAssetIds.push(assetId);
            } catch {
              break;
            }
          }
        } catch {
          // Last resort: Try getNextAssetId() and iterate through all IDs
          try {
            const nextId = await registry.getNextAssetId();
            console.log(`   ℹ️  Registry has ${nextId.toString()} total asset ID(s)`);
            for (let i = 1; i < Number(nextId); i++) {
              try {
                const asset = await registry.getAsset(i);
                if (asset && asset.status === 1) { // ACTIVE status
                  activeAssetIds.push(BigInt(i));
                }
              } catch {
                // Skip invalid asset IDs
              }
            }
          } catch (err: any) {
            console.log(`   ⚠️  Could not enumerate assets: ${err.message.substring(0, 80)}`);
          }
        }
      }
      
      // Query factory for each asset ID
      for (const assetId of activeAssetIds) {
        try {
          // Try RWATokenFactory first
          const tokenAddress = await factory.getTokenAddress(assetId);
          if (tokenAddress !== ethers.ZeroAddress && !tokenInfoMap.has(tokenAddress)) {
            tokenAddresses.push(tokenAddress);
            tokenInfoMap.set(tokenAddress, { address: tokenAddress, assetId });
          }
        } catch {
          // Try RWATokenFactory404
          try {
            const tokenAddress404 = await factory404.getTokenAddress(assetId);
            if (tokenAddress404 !== ethers.ZeroAddress && !tokenInfoMap.has(tokenAddress404)) {
              tokenAddresses.push(tokenAddress404);
              tokenInfoMap.set(tokenAddress404, { address: tokenAddress404, assetId });
            }
          } catch {
            // Skip if token doesn't exist for this asset
          }
        }
      }
      
      if (activeAssetIds.length > 0) {
        console.log(`   ✅ Found ${tokenAddresses.length} token(s) via registry enumeration`);
      }
    } catch (regError: any) {
      console.log(`   ⚠️  Registry enumeration failed: ${regError.message.substring(0, 100)}`);
    }
    
    // Remove duplicates
    tokenAddresses = Array.from(new Set(tokenAddresses));
    
    if (tokenAddresses.length === 0) {
      console.log('   ℹ️  No property tokens found');
      console.log('   💡 Tip: Create property tokens first by:');
      console.log('      1. Register assets in RWAAssetRegistry');
      console.log('      2. Create tokens using RWATokenFactory or RWATokenFactory404');
      return [];
    }
    
    console.log(`\n   📊 Total unique property tokens found: ${tokenAddresses.length}`);
    
    // Get token metadata
    console.log(`\n📋 Fetching token metadata...`);
    for (const tokenAddress of tokenAddresses) {
      try {
        const token = await ethers.getContractAt(ERC20_ABI as any, tokenAddress);
        const [name, symbol, decimals] = await Promise.all([
          token.name().catch(() => 'Unknown'),
          token.symbol().catch(() => 'UNK'),
          token.decimals().catch(() => 18),
        ]);
        
        const info = tokenInfoMap.get(tokenAddress) || { address: tokenAddress };
        info.name = name;
        info.symbol = symbol;
        tokenInfoMap.set(tokenAddress, info);
        
        console.log(`   ✅ ${tokenAddress.substring(0, 10)}... - ${name} (${symbol})`);
      } catch (error: any) {
        console.log(`   ⚠️  ${tokenAddress.substring(0, 10)}... - Error fetching metadata: ${error.message.substring(0, 60)}`);
        const info = tokenInfoMap.get(tokenAddress) || { address: tokenAddress };
        tokenInfoMap.set(tokenAddress, info);
      }
    }
    
    return Array.from(tokenInfoMap.values());
  } catch (error: any) {
    console.error(`❌ Error discovering property tokens: ${error.message}`);
    return [];
  }
}

async function getCurrentExchangeConfiguration(exchange: any, tokens: TokenInfo[]): Promise<void> {
  console.log('\n📊 Current exchange configuration:');
  
  for (const token of tokens) {
    try {
      const [rate, enabled, balance] = await Promise.all([
        exchange.exchangeRates(token.address).catch(() => BigInt(0)),
        exchange.isPropertyTokenEnabled(token.address).catch(() => false),
        exchange.getPropertyTokenBalance(token.address).catch(() => BigInt(0)),
      ]);
      
      token.exchangeRate = rate;
      token.enabled = enabled;
      token.balance = balance;
      
      const rateFormatted = rate > BigInt(0) ? ethers.formatUnits(rate, 18) : '0';
      const balanceFormatted = balance > BigInt(0) ? ethers.formatUnits(balance, 18) : '0';
      
      console.log(`   ${token.symbol || 'UNK'} (${token.address.substring(0, 10)}...):`);
      console.log(`      Rate: ${rateFormatted} TPT per token ${rate > BigInt(0) ? '✅' : '❌'}`);
      console.log(`      Enabled: ${enabled ? 'Yes ✅' : 'No ❌'}`);
      console.log(`      Balance: ${balanceFormatted} tokens ${balance > BigInt(0) ? '✅' : '⚠️  (needs deposit)'}`);
    } catch (error: any) {
      console.log(`   ⚠️  ${token.address.substring(0, 10)}... - Error: ${error.message.substring(0, 60)}`);
    }
  }
}

async function configureExchangeRates(exchange: any, tokens: TokenInfo[], exchangeRate: bigint): Promise<number> {
  console.log(`\n⚙️  Configuring exchange rates (${ethers.formatUnits(exchangeRate, 18)} TPT per property token)...`);
  
  let configuredCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  for (const token of tokens) {
    try {
      const currentRate = await exchange.exchangeRates(token.address);
      
      if (currentRate === exchangeRate) {
        console.log(`   ✅ ${token.symbol || 'UNK'} (${token.address.substring(0, 10)}...) - Rate already set`);
        skippedCount++;
        continue;
      }
      
      if (currentRate > BigInt(0)) {
        console.log(`   ⚙️  ${token.symbol || 'UNK'} (${token.address.substring(0, 10)}...) - Updating rate from ${ethers.formatUnits(currentRate, 18)} to ${ethers.formatUnits(exchangeRate, 18)} TPT`);
      } else {
        console.log(`   ⚙️  ${token.symbol || 'UNK'} (${token.address.substring(0, 10)}...) - Setting rate to ${ethers.formatUnits(exchangeRate, 18)} TPT`);
      }
      
      const tx = await exchange.setExchangeRate(token.address, exchangeRate);
      console.log(`      Transaction: ${tx.hash}`);
      await tx.wait();
      
      configuredCount++;
      console.log(`   ✅ Rate configured successfully`);
    } catch (error: any) {
      errorCount++;
      console.log(`   ❌ ${token.address.substring(0, 10)}... - Error: ${error.message.substring(0, 80)}`);
    }
  }
  
  console.log(`\n   📊 Results: ${configuredCount} configured, ${skippedCount} skipped, ${errorCount} errors`);
  
  return configuredCount;
}

async function enablePropertyTokens(exchange: any, tokens: TokenInfo[]): Promise<number> {
  console.log(`\n⚙️  Enabling property tokens for exchange...`);
  
  let enabledCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  for (const token of tokens) {
    try {
      const currentRate = await exchange.exchangeRates(token.address);
      if (currentRate === BigInt(0)) {
        console.log(`   ⚠️  ${token.symbol || 'UNK'} (${token.address.substring(0, 10)}...) - Skipping (exchange rate not set)`);
        skippedCount++;
        continue;
      }
      
      const isEnabled = await exchange.isPropertyTokenEnabled(token.address);
      if (isEnabled) {
        console.log(`   ✅ ${token.symbol || 'UNK'} (${token.address.substring(0, 10)}...) - Already enabled`);
        skippedCount++;
        continue;
      }
      
      console.log(`   ⚙️  Enabling ${token.symbol || 'UNK'} (${token.address.substring(0, 10)}...)`);
      const tx = await exchange.setPropertyTokenEnabled(token.address, true);
      console.log(`      Transaction: ${tx.hash}`);
      await tx.wait();
      
      enabledCount++;
      console.log(`   ✅ Enabled successfully`);
    } catch (error: any) {
      errorCount++;
      console.log(`   ❌ ${token.address.substring(0, 10)}... - Error: ${error.message.substring(0, 80)}`);
    }
  }
  
  console.log(`\n   📊 Results: ${enabledCount} enabled, ${skippedCount} skipped, ${errorCount} errors`);
  
  return enabledCount;
}

async function unpauseExchange(exchange: any): Promise<boolean> {
  try {
    const paused = await exchange.paused();
    if (!paused) {
      console.log(`\n✅ Exchange is active (not paused)`);
      return true;
    }
    
    console.log(`\n⚙️  Unpausing exchange...`);
    const tx = await exchange.unpause();
    console.log(`   Transaction: ${tx.hash}`);
    await tx.wait();
    console.log(`✅ Exchange unpaused successfully!`);
    return true;
  } catch (error: any) {
    console.error(`❌ Error unpausing exchange: ${error.message}`);
    return false;
  }
}

async function setupTokenExchange(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   TOKEN EXCHANGE SETUP SCRIPT                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  // Check network
  const network = await ethers.provider.getNetwork();
  const SEPOLIA_CHAIN_ID = BigInt(11155111);
  
  if (network.chainId !== SEPOLIA_CHAIN_ID) {
    console.error(`\n❌ ERROR: Wrong network detected!`);
    console.error(`   Current: ${network.name} (Chain ID: ${network.chainId})`);
    console.error(`   Required: Sepolia (Chain ID: ${SEPOLIA_CHAIN_ID})`);
    console.error(`\n   Fix: Use Hardhat with --network sepolia flag:`);
    console.error(`   npx hardhat run scripts/setup-token-exchange.ts --network sepolia\n`);
    process.exit(1);
  }
  
  // Get exchange address from command line if provided
  let exchangeAddress = TOKEN_EXCHANGE_ADDRESS;
  const args = process.argv.slice(2);
  if (args.length > 0 && args[0].startsWith('0x')) {
    exchangeAddress = args[0];
    console.log(`📝 Using exchange address from command line: ${exchangeAddress}\n`);
  }
  
  const [deployer] = await ethers.getSigners();
  console.log(`📋 Configuration:`);
  console.log(`   Token Exchange: ${exchangeAddress}`);
  console.log(`   TPT Token: ${TPT_TOKEN_ADDRESS}`);
  console.log(`   Registry: ${REGISTRY_ADDRESS}`);
  console.log(`   Token Factory: ${TOKEN_FACTORY_ADDRESS}`);
  console.log(`   Token Factory404: ${FACTORY_404_ADDRESS}`);
  console.log(`   Default Exchange Rate: ${ethers.formatUnits(DEFAULT_EXCHANGE_RATE, 18)} TPT per property token`);
  console.log(`   Deployer: ${deployer.address}\n`);
  
  // Verify exchange contract
  const exchangeVerified = await verifyExchangeContract(exchangeAddress);
  if (!exchangeVerified) {
    throw new Error('TokenExchange contract verification failed');
  }
  
  const exchange = await ethers.getContractAt(EXCHANGE_ABI as any, exchangeAddress);
  
  // Check deployer is owner
  const owner = await exchange.owner();
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error(`Deployer (${deployer.address}) is not the owner (${owner})`);
  }
  
  // Get property tokens
  const tokens = await getPropertyTokens();
  if (tokens.length === 0) {
    console.log('\n⚠️  No property tokens found. Exchange will be configured but no tokens will be set up.');
    console.log('   Create property tokens first, then run this script again.\n');
    return;
  }
  
  // Get current configuration
  await getCurrentExchangeConfiguration(exchange, tokens);
  
  // Configure exchange rates
  const ratesConfigured = await configureExchangeRates(exchange, tokens, DEFAULT_EXCHANGE_RATE);
  
  // Enable property tokens
  const tokensEnabled = await enablePropertyTokens(exchange, tokens);
  
  // Unpause if needed
  await unpauseExchange(exchange);
  
  // Final verification
  console.log(`\n🔍 Verifying final configuration...`);
  await getCurrentExchangeConfiguration(exchange, tokens);
  
  console.log('\n' + '='.repeat(70));
  console.log('🎉 TOKEN EXCHANGE SETUP COMPLETE');
  console.log('='.repeat(70));
  console.log(`\n📋 Setup Summary:`);
  console.log(`   Exchange Contract: ${exchangeAddress}`);
  console.log(`   Property Tokens Found: ${tokens.length}`);
  console.log(`   Exchange Rates Configured: ${ratesConfigured}`);
  console.log(`   Tokens Enabled: ${tokensEnabled}`);
  console.log(`\n🔗 Explorer Links:`);
  console.log(`   Exchange: https://sepolia.etherscan.io/address/${exchangeAddress}`);
  console.log(`   TPT Token: https://sepolia.etherscan.io/address/${TPT_TOKEN_ADDRESS}`);
  console.log('='.repeat(70));
  
  console.log('\n📝 Next Steps:');
  console.log('   1. ✅ Deposit property tokens to exchange contract for liquidity');
  console.log('      propertyToken.transfer(exchangeAddress, amount);');
  console.log('   2. ✅ Test exchange functionality');
  console.log('      tptToken.approve(exchangeAddress, amount);');
  console.log('      exchange.exchangeTPTForPropertyToken(propertyTokenAddress, tptAmount);');
  console.log('   3. ✅ Verify frontend environment variables are updated');
  console.log('='.repeat(70) + '\n');
}

async function main() {
  try {
    await setupTokenExchange();
  } catch (error: any) {
    console.error('\n❌ Setup failed:', error.message);
    if (error.transaction) {
      console.error('   Transaction hash:', error.transaction.hash);
    }
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

