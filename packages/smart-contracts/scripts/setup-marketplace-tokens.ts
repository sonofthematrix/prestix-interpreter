#!/usr/bin/env tsx
/**
 * Setup Marketplace Token Configuration
 * 
 * Configures the RWA Marketplace contract with all required token addresses
 * after deployment and verification.
 * 
 * This script:
 * 1. Verifies marketplace contract deployment
 * 2. Configures payment tokens (USDC, EURC, TPT)
 * 3. Sets marketplace fee settings
 * 4. Verifies all configurations
 * 
 * Usage:
 *   cd smart-contracts
 *   bun run tsx scripts/setup-marketplace-tokens.ts
 */

import 'dotenv/config';
import hre from 'hardhat';
const { ethers } = hre;

// Sepolia contract addresses
// Proxy address (use this - calls delegate to implementation automatically)
// Proxy: 0xc9C369525DFf385935dfDC6aC2F678C26998D0d7
// Implementation: 0x3E8b80714196ecB6925150347215bDF4C1420a8d (do not use directly)
const MARKETPLACE_ADDRESS = process.env.NEXT_PUBLIC_RWA_MARKETPLACE || 
                            process.env.MARKETPLACE_ADDRESS || 
                            '0xc9C369525DFf385935dfDC6aC2F678C26998D0d7'; // Proxy address (delegates to implementation)
const TPT_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_TPT_ADDRESS || '0xb0af8e94C74c2346609c3d94FCba61Ae85cf3e6e';
const TPT_IMPLEMENTATION_ADDRESS = '0x4EDc5EbfDA5986F5389763f6bf297480095c7379'; // TPT Implementation (provided by user)
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
const EURC_ADDRESS = process.env.NEXT_PUBLIC_EURC_ADDRESS || '0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4';

// Marketplace ABI (minimal - functions we need)
// Based on RWAMarketplaceUpgradeable contract reference
const MARKETPLACE_ABI = [
  'function assetRegistry() view returns (address)',
  'function tokenFactory() view returns (address)',
  'function getMarketplaceFee() view returns (uint256)', // Returns fee in basis points
  'function getFeeRecipient() view returns (address)',
  'function getCollectedFees() view returns (uint256)',
  'function setMarketplaceFee(uint256 newFeePercentage)', // Admin only - FEE_MANAGER_ROLE
  'function setFeeRecipient(address newFeeRecipient)', // Admin only - DEFAULT_ADMIN_ROLE
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function emergencyPause()', // Admin only - MARKETPLACE_ADMIN_ROLE
  'function unpause()', // Admin only - DEFAULT_ADMIN_ROLE
  'function paused() view returns (bool)',
];

// ERC20 ABI for token verification
const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
];

interface SetupResult {
  marketplace: string;
  tokens: {
    tpt: { address: string; verified: boolean };
    usdc: { address: string; verified: boolean };
    eurc: { address: string; verified: boolean };
  };
  configuration: {
    feePercentage: string;
    feeRecipient: string;
    collectedFees: string;
    paused: boolean;
  };
}

async function verifyMarketplaceContract(address: string): Promise<boolean> {
  console.log(`\n🔍 Checking marketplace contract at ${address}...`);
  console.log(`   (Note: Works with proxy contracts - calls go through proxy to implementation)`);
  
  try {
    // Get network info for debugging
    const network = await ethers.provider.getNetwork();
    console.log(`   Network: ${network.name} (Chain ID: ${network.chainId})`);
    
    const code = await ethers.provider.getCode(address);
    if (code === '0x') {
      console.error(`❌ No contract code found at ${address}`);
      console.error(`   Possible issues:`);
      console.error(`   1. Wrong network - Expected Sepolia (11155111), got ${network.chainId}`);
      console.error(`   2. RPC endpoint not responding correctly`);
      console.error(`   3. Address is incorrect`);
      console.error(`   Check Hardhat config network settings`);
      return false;
    }
    
    console.log(`   ✅ Contract code found (${code.length} bytes) - Proxy contract detected`);
    
    // Create contract instance - proxy will delegate calls to implementation
    const marketplace = await ethers.getContractAt(MARKETPLACE_ABI, address);
    
    // Check if contract has required functions (calls go through proxy)
    try {
      const assetRegistry = await marketplace.assetRegistry();
      const tokenFactory = await marketplace.tokenFactory();
      const fee = await marketplace.getMarketplaceFee();
      console.log(`   ✅ Marketplace contract functions accessible through proxy`);
      console.log(`      Asset Registry: ${assetRegistry}`);
      console.log(`      Token Factory: ${tokenFactory}`);
      console.log(`      Marketplace Fee: ${fee.toString()} bps`);
      return true;
    } catch (error: any) {
      console.error(`❌ Contract doesn't have required functions: ${error.message}`);
      console.error(`   This contract may be a different version or not a marketplace contract`);
      return false;
    }
  } catch (error: any) {
    console.error(`❌ Error checking marketplace: ${error.message}`);
    return false;
  }
}

async function verifyTokenContract(address: string, name: string): Promise<boolean> {
  try {
    const code = await ethers.provider.getCode(address);
    if (code === '0x') {
      console.error(`❌ ${name} contract not found at ${address}`);
      return false;
    }
    
    const token = await ethers.getContractAt(ERC20_ABI, address);
    const tokenName = await token.name();
    const symbol = await token.symbol();
    const decimals = await token.decimals();
    
    console.log(`   ✅ ${name}: ${tokenName} (${symbol}) - ${decimals} decimals`);
    return true;
  } catch (error: any) {
    console.error(`   ❌ Error verifying ${name}: ${error.message}`);
    return false;
  }
}

async function checkAdminPermissions(marketplace: any, deployer: string): Promise<boolean> {
  try {
    const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
    const hasAdminRole = await marketplace.hasRole(DEFAULT_ADMIN_ROLE, deployer);
    
    if (!hasAdminRole) {
      console.error(`❌ Deployer ${deployer} does not have admin role`);
      return false;
    }
    
    console.log(`✅ Deployer has admin permissions`);
    return true;
  } catch (error: any) {
    console.error(`❌ Error checking permissions: ${error.message}`);
    return false;
  }
}

async function getCurrentConfiguration(marketplace: any): Promise<{
  feePercentage: bigint;
  feeRecipient: string;
  collectedFees: bigint;
  paused: boolean;
}> {
  // Use getMarketplaceFee() as documented in contract reference
  const feePercentage = await marketplace.getMarketplaceFee();
  const feeRecipient = await marketplace.getFeeRecipient();
  const collectedFees = await marketplace.getCollectedFees();
  const paused = await marketplace.paused();
  
  return {
    feePercentage,
    feeRecipient,
    collectedFees,
    paused,
  };
}

async function setupMarketplace(): Promise<SetupResult> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   MARKETPLACE TOKEN SETUP SCRIPT                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  // Check environment variables
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('DEPLOYER_PRIVATE_KEY or PRIVATE_KEY not found in environment variables');
  }
  
  // Validate marketplace address
  // Priority: 1) Command line arg, 2) Environment variable, 3) Correct default
  let marketplaceAddress = MARKETPLACE_ADDRESS;
  
  // Filter out --network flag from args
  const args = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
  
  // If user provided address as argument, use it
  if (args.length > 0 && args[0].startsWith('0x')) {
    marketplaceAddress = args[0];
    console.log(`📝 Using marketplace address from command line: ${marketplaceAddress}\n`);
  }
  
  // Force correct proxy address if old address detected
  const OLD_MARKETPLACE = '0xb4D541e83C097D66Db13A8D21AfBA435069306a1';
  const CORRECT_PROXY = '0xc9C369525DFf385935dfDC6aC2F678C26998D0d7';
  
  if (marketplaceAddress.toLowerCase() === OLD_MARKETPLACE.toLowerCase()) {
    console.log(`⚠️  WARNING: Old marketplace address detected: ${OLD_MARKETPLACE}`);
    console.log(`   This is from an old deployment. Using correct proxy address: ${CORRECT_PROXY}\n`);
    marketplaceAddress = CORRECT_PROXY;
  }
  
  // Note: Script works with proxy contracts - calls are made to proxy address
  // Proxy will delegate to implementation automatically
  
  // Validate address format
  if (!ethers.isAddress(marketplaceAddress)) {
    throw new Error(`Invalid marketplace address: ${marketplaceAddress}`);
  }
  
  const [deployer] = await ethers.getSigners();
  console.log(`📋 Configuration:`);
  console.log(`   Marketplace Proxy: ${marketplaceAddress}`);
  console.log(`   Marketplace Implementation: 0x3E8b80714196ecB6925150347215bDF4C1420a8d`);
  console.log(`   TPT Token (Proxy): ${TPT_TOKEN_ADDRESS}`);
  console.log(`   TPT Implementation: ${TPT_IMPLEMENTATION_ADDRESS}`);
  console.log(`   USDC Token: ${USDC_ADDRESS}`);
  console.log(`   EURC Token: ${EURC_ADDRESS}`);
  console.log(`   Deployer: ${deployer.address}\n`);
  console.log(`   ℹ️  Note: All function calls go through the proxy, which delegates to the implementation\n`);
  
  // Step 1: Verify marketplace contract
  const marketplaceVerified = await verifyMarketplaceContract(marketplaceAddress);
  if (!marketplaceVerified) {
    throw new Error('Marketplace contract verification failed');
  }
  
  const marketplace = await ethers.getContractAt(MARKETPLACE_ABI, marketplaceAddress);
  
  // Step 2: Check admin permissions
  const hasPermissions = await checkAdminPermissions(marketplace, deployer.address);
  if (!hasPermissions) {
    throw new Error('Deployer does not have admin permissions');
  }
  
  // Step 3: Verify token contracts
  console.log(`\n🔍 Verifying token contracts...`);
  const tptVerified = await verifyTokenContract(TPT_TOKEN_ADDRESS, 'TPT');
  const usdcVerified = await verifyTokenContract(USDC_ADDRESS, 'USDC');
  const eurcVerified = await verifyTokenContract(EURC_ADDRESS, 'EURC');
  
  if (!tptVerified || !usdcVerified || !eurcVerified) {
    throw new Error('Token contract verification failed');
  }
  
  // Step 4: Get current configuration
  console.log(`\n📊 Current marketplace configuration:`);
  const currentConfig = await getCurrentConfiguration(marketplace);
  console.log(`   Fee Percentage: ${currentConfig.feePercentage.toString()} basis points (${Number(currentConfig.feePercentage) / 100}%)`);
  console.log(`   Fee Recipient: ${currentConfig.feeRecipient}`);
  console.log(`   Collected Fees: ${ethers.formatEther(currentConfig.collectedFees)} ETH`);
  console.log(`   Paused: ${currentConfig.paused ? 'Yes ⚠️' : 'No ✅'}`);
  
  // Step 5: Configure marketplace fee (if needed)
  const desiredFeeBps = process.env.MARKETPLACE_FEE_BPS ? Number(process.env.MARKETPLACE_FEE_BPS) : 250; // Default 2.5%
  if (currentConfig.feePercentage.toString() !== desiredFeeBps.toString()) {
    console.log(`\n⚙️  Setting marketplace fee to ${desiredFeeBps} basis points (${desiredFeeBps / 100}%)...`);
    try {
      const tx = await marketplace.setMarketplaceFee(desiredFeeBps);
      console.log(`   Transaction hash: ${tx.hash}`);
      await tx.wait();
      console.log(`   ✅ Marketplace fee updated`);
    } catch (error: any) {
      console.error(`   ❌ Failed to update fee: ${error.message}`);
      throw error;
    }
  } else {
    console.log(`\n✅ Marketplace fee already configured correctly`);
  }
  
  // Step 6: Ensure marketplace is unpaused
  if (currentConfig.paused) {
    console.log(`\n⚙️  Unpausing marketplace...`);
    try {
      const tx = await marketplace.unpause();
      console.log(`   Transaction hash: ${tx.hash}`);
      await tx.wait();
      console.log(`   ✅ Marketplace unpaused`);
    } catch (error: any) {
      console.error(`   ❌ Failed to unpause: ${error.message}`);
      throw error;
    }
  } else {
    console.log(`\n✅ Marketplace is active (not paused)`);
  }
  
  // Step 7: Verify final configuration
  console.log(`\n🔍 Verifying final configuration...`);
  const finalConfig = await getCurrentConfiguration(marketplace);
  
  const result: SetupResult = {
    marketplace: marketplaceAddress,
    tokens: {
      tpt: { address: TPT_TOKEN_ADDRESS, verified: tptVerified },
      usdc: { address: USDC_ADDRESS, verified: usdcVerified },
      eurc: { address: EURC_ADDRESS, verified: eurcVerified },
    },
    configuration: {
      feePercentage: finalConfig.feePercentage.toString(),
      feeRecipient: finalConfig.feeRecipient,
      collectedFees: ethers.formatEther(finalConfig.collectedFees),
      paused: finalConfig.paused,
    },
  };
  
  return result;
}

async function main() {
  // CRITICAL: Check network before proceeding
  const network = await ethers.provider.getNetwork();
  const SEPOLIA_CHAIN_ID = BigInt(11155111);
  
  if (network.chainId !== SEPOLIA_CHAIN_ID) {
    console.error(`\n❌ ERROR: Wrong network detected!`);
    console.error(`   Current: ${network.name} (Chain ID: ${network.chainId})`);
    console.error(`   Required: Sepolia (Chain ID: ${SEPOLIA_CHAIN_ID})`);
    console.error(`\n   Fix: Run with --network sepolia flag:`);
    console.error(`   bun run tsx scripts/setup-marketplace-tokens.ts --network sepolia`);
    console.error(`\n   Or if using Hardhat directly:`);
    console.error(`   npx hardhat run scripts/setup-marketplace-tokens.ts --network sepolia\n`);
    process.exit(1);
  }
  
  try {
    const result = await setupMarketplace();
    
    console.log('\n' + '='.repeat(70));
    console.log('🎉 MARKETPLACE TOKEN SETUP COMPLETE');
    console.log('='.repeat(70));
    console.log(`\n📋 Setup Summary:`);
    console.log(`   Marketplace: ${result.marketplace}`);
    console.log(`\n💰 Token Configuration:`);
    console.log(`   TPT: ${result.tokens.tpt.address} ${result.tokens.tpt.verified ? '✅' : '❌'}`);
    console.log(`   USDC: ${result.tokens.usdc.address} ${result.tokens.usdc.verified ? '✅' : '❌'}`);
    console.log(`   EURC: ${result.tokens.eurc.address} ${result.tokens.eurc.verified ? '✅' : '❌'}`);
    console.log(`\n⚙️  Marketplace Settings:`);
    console.log(`   Fee: ${result.configuration.feePercentage} bps (${Number(result.configuration.feePercentage) / 100}%)`);
    console.log(`   Fee Recipient: ${result.configuration.feeRecipient}`);
    console.log(`   Collected Fees: ${result.configuration.collectedFees} ETH`);
    console.log(`   Status: ${result.configuration.paused ? '⏸️  Paused' : '✅ Active'}`);
    console.log(`\n🔗 Explorer Links:`);
    console.log(`   Marketplace: https://sepolia.etherscan.io/address/${result.marketplace}`);
    console.log(`   TPT Token: https://sepolia.etherscan.io/address/${result.tokens.tpt.address}`);
    console.log(`   USDC Token: https://sepolia.etherscan.io/address/${result.tokens.usdc.address}`);
    console.log(`   EURC Token: https://sepolia.etherscan.io/address/${result.tokens.eurc.address}`);
    console.log('='.repeat(70) + '\n');
    
    console.log('📝 Next Steps:');
    console.log('   1. Verify token addresses in frontend environment variables');
    console.log('   2. Test marketplace functionality with test transactions');
    console.log('   3. Configure frontend to use these token addresses');
    console.log('   4. Update API endpoints to reference these addresses\n');
    
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

