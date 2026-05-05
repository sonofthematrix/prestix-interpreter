import { ethers } from "hardhat";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Load environment variables - check multiple locations
const rootEnvLocalPath = path.join(__dirname, "../../../.env.local");
const rootEnvPath = path.join(__dirname, "../../../.env");
const localEnvLocalPath = path.join(__dirname, "../.env.local");
const localEnvPath = path.join(__dirname, "../.env");

// Priority: root .env.local > root .env > local .env.local > local .env
if (fs.existsSync(rootEnvLocalPath)) {
  dotenv.config({ path: rootEnvLocalPath });
} else if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else if (fs.existsSync(localEnvLocalPath)) {
  dotenv.config({ path: localEnvLocalPath });
} else if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else {
  dotenv.config(); // Fallback to default
}

const MARKETPLACE_PROXY = process.env.NEXT_PUBLIC_RWA_MARKETPLACE || '0xc9C369525DFf385935dfDC6aC2F678C26998D0d7';
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
const EURC_ADDRESS = process.env.NEXT_PUBLIC_EURC_ADDRESS || '0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4';
// Use registry address from environment (should match marketplace's registry)
// Default to marketplace's actual registry: 0xe2d49642B5aE5D0f62dA79D572d04cA95dB2853D
const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_RWA_ASSET_REGISTRY || 
  process.env.RWA_ASSET_REGISTRY || 
  '0xe2d49642B5aE5D0f62dA79D572d04cA95dB2853D'; // Marketplace's actual registry

// ERC20 ABI for balance, allowance, and approve
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address, address) view returns (uint256)',
  'function approve(address, uint256) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
] as const;

// Marketplace ABI
const MARKETPLACE_ABI = [
  'function purchaseTokensWithERC20(uint256 assetId, uint256 tokenAmount)',
  'function calculatePurchaseCost(uint256 assetId, uint256 tokenAmount) view returns (uint256 totalCost, uint256 marketplaceFee)',
  'function calculatePurchaseCostInPaymentToken(uint256 assetId, uint256 tokenAmount) view returns (uint256 totalCost, uint256 marketplaceFee)',
  'function paymentToken() view returns (address)',
  'function assetRegistry() view returns (address)',
] as const;

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   PURCHASE TOKENS WITH USDC/EURC                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Get parameters from environment variables
  const buyerWalletNum = process.env.BUYER_WALLET_NUM || '1';
  const assetIdStr = process.env.ASSET_ID;
  const paymentTokenType = (process.env.PAYMENT_TOKEN || '').toUpperCase();
  const tokenAmountStr = process.env.TOKEN_AMOUNT || '1';
  
  // Get buyer wallet address and private key from environment
  // Support multiple naming conventions:
  // - BUYER_WALLET_<NUM> / BUYER_WALLET_<NUM>_PRVT (preferred)
  // - BUYER_WALLET_<NUM> / BUYER_KEY_<NUM> (your current naming)
  // - BAYER_WALLET_<NUM> / BAYER_WALLET_<NUM>_PRVT (typo variant)
  const buyerAddress = process.env[`BUYER_WALLET_${buyerWalletNum}`] || 
                       process.env[`BAYER_WALLET_${buyerWalletNum}`];
  const buyerPrivateKey = process.env[`BUYER_WALLET_${buyerWalletNum}_PRVT`] || 
                          process.env[`BUYER_KEY_${buyerWalletNum}`] ||
                          process.env[`BAYER_WALLET_${buyerWalletNum}_PRVT`];
  
  if (!assetIdStr || !paymentTokenType) {
    console.log('❌ Usage: ASSET_ID=<id> PAYMENT_TOKEN=<USDC|EURC> [BUYER_WALLET_NUM=<1-5>] [TOKEN_AMOUNT=<amount>] bun hardhat run scripts/purchase-with-usdc-eurc.ts --network sepolia');
    console.log('');
    console.log('Parameters:');
    console.log('  ASSET_ID        : Asset ID to purchase tokens for (required)');
    console.log('  PAYMENT_TOKEN   : USDC or EURC (required)');
    console.log('  BUYER_WALLET_NUM: Buyer wallet number 1-5 (default: 1)');
    console.log('                    Uses BUYER_WALLET_<NUM> and BUYER_WALLET_<NUM>_PRVT from .env.local');
    console.log('  TOKEN_AMOUNT    : Number of tokens to purchase (default: 1)');
    console.log('');
    console.log('Environment Variables Required:');
    console.log('  BUYER_WALLET_1, BUYER_WALLET_2, etc. (wallet addresses)');
    console.log('  BUYER_WALLET_1_PRVT, BUYER_WALLET_2_PRVT, etc. (private keys)');
    console.log('');
    console.log('Examples:');
    console.log('  ASSET_ID=9 PAYMENT_TOKEN=USDC TOKEN_AMOUNT=1 bun hardhat run scripts/purchase-with-usdc-eurc.ts --network sepolia');
    console.log('  ASSET_ID=10 PAYMENT_TOKEN=EURC BUYER_WALLET_NUM=2 TOKEN_AMOUNT=5 bun hardhat run scripts/purchase-with-usdc-eurc.ts --network sepolia');
    console.log('');
    process.exit(1);
  }

  if (!buyerAddress) {
    console.log(`❌ BUYER_WALLET_${buyerWalletNum} not found in environment variables`);
    console.log('   Please set BUYER_WALLET_1, BUYER_WALLET_2, etc. in .env.local');
    console.log('   Checking root .env.local and packages/smart-contracts/.env.local\n');
    
    // Debug: Show what env vars are available
    const availableBuyerVars = Object.keys(process.env).filter(key => 
      key.startsWith('BUYER_WALLET') || key.startsWith('BAYER_WALLET')
    );
    if (availableBuyerVars.length > 0) {
      console.log('   Found these buyer wallet variables:');
      availableBuyerVars.forEach(key => console.log(`     - ${key}`));
      console.log('');
    }
    process.exit(1);
  }

  if (!buyerPrivateKey) {
    console.log(`❌ BUYER_WALLET_${buyerWalletNum}_PRVT not found in environment variables`);
    console.log(`   Please set BUYER_WALLET_${buyerWalletNum}_PRVT in .env.local`);
    console.log('   Note: Variable name should be BUYER_WALLET_<NUM>_PRVT (not BAYER)\n');
    
    // Check for common typos
    const typoVar = process.env[`BAYER_WALLET_${buyerWalletNum}_PRVT`];
    if (typoVar) {
      console.log(`   ⚠️  Found BAYER_WALLET_${buyerWalletNum}_PRVT (typo - should be BUYER_WALLET_${buyerWalletNum}_PRVT)`);
      console.log('   Please fix the variable name in .env.local\n');
    }
    process.exit(1);
  }

  // Create signer from private key
  const provider = ethers.provider;
  const buyerSigner = new ethers.Wallet(buyerPrivateKey, provider);
  
  const assetId = BigInt(assetIdStr);
  const tokenAmount = BigInt(tokenAmountStr);

  // Validate payment token
  if (paymentTokenType !== 'USDC' && paymentTokenType !== 'EURC') {
    console.log(`❌ Invalid payment token: ${paymentTokenType}`);
    console.log('   Supported tokens: USDC, EURC\n');
    process.exit(1);
  }

  const paymentTokenAddress = paymentTokenType === 'USDC' ? USDC_ADDRESS : EURC_ADDRESS;

  console.log(`📋 Configuration:`);
  console.log(`   Buyer Address: ${buyerAddress}`);
  console.log(`   Asset ID: ${assetId}`);
  console.log(`   Payment Token: ${paymentTokenType} (${paymentTokenAddress})`);
  console.log(`   Token Amount: ${tokenAmount}`);
  console.log(`   Marketplace: ${MARKETPLACE_PROXY}\n`);

  try {
    console.log(`👤 Buyer Wallet #${buyerWalletNum}: ${buyerAddress}`);
    console.log(`👤 Signer Address: ${buyerSigner.address}\n`);
    
    // Verify signer matches buyer address
    if (buyerSigner.address.toLowerCase() !== buyerAddress.toLowerCase()) {
      throw new Error(`Private key does not match buyer address. Expected: ${buyerAddress}, Got: ${buyerSigner.address}`);
    }
    
    // Check ETH balance first (needed for gas)
    const ethBalance = await ethers.provider.getBalance(buyerSigner.address);
    console.log(`💰 ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);
    
    if (ethBalance === 0n) {
      console.log(`\n❌ Insufficient ETH balance for gas fees`);
      console.log(`   Buyer wallet needs ETH to pay for transaction gas`);
      console.log(`   Wallet: ${buyerSigner.address}`);
      console.log(`   Please fund this wallet with Sepolia ETH\n`);
      throw new Error('Insufficient ETH balance for gas fees');
    }
    console.log('');

    // Load contracts
    const marketplace = await ethers.getContractAt(MARKETPLACE_ABI as any, MARKETPLACE_PROXY);
    const paymentToken = await ethers.getContractAt(ERC20_ABI as unknown as any[], paymentTokenAddress);
    const registry = await ethers.getContractAt('RWAAssetRegistry', REGISTRY_ADDRESS);

    // Get payment token info
    const tokenSymbol = await paymentToken.symbol();
    const tokenName = await paymentToken.name();
    const tokenDecimals = await paymentToken.decimals();
    console.log(`💰 Payment Token Info:`);
    console.log(`   Name: ${tokenName}`);
    console.log(`   Symbol: ${tokenSymbol}`);
    console.log(`   Decimals: ${tokenDecimals}`);
    console.log(`   Address: ${paymentTokenAddress}\n`);

    // Check marketplace payment token configuration
    const marketplacePaymentToken = await marketplace.paymentToken();
    console.log(`🔍 Marketplace Payment Token: ${marketplacePaymentToken}`);
    
    if (marketplacePaymentToken === ethers.ZeroAddress) {
      console.log(`⚠️  WARNING: Marketplace payment token is not configured (zero address)`);
      console.log(`   ERC20 payments are not enabled. You need to:`);
      console.log(`   1. Set payment token on marketplace contract`);
      console.log(`   2. Or use ETH payments instead\n`);
      throw new Error('Marketplace ERC20 payments not configured. Payment token must be set first.');
    } else if (marketplacePaymentToken.toLowerCase() !== paymentTokenAddress.toLowerCase()) {
      console.log(`⚠️  WARNING: Marketplace is configured for ${marketplacePaymentToken}, but you're using ${paymentTokenAddress}`);
      console.log(`   Purchase may fail if marketplace doesn't accept this token.\n`);
    } else {
      console.log(`   ✅ Marketplace accepts ${paymentTokenType}\n`);
    }

    // Get asset details from marketplace's registry (not the script's registry)
    console.log(`📦 Fetching asset details...`);
    // Use marketplace's registry address to ensure we're reading from the correct registry
    const marketplaceRegistryAddress = await marketplace.assetRegistry();
    const REGISTRY_ABI_FOR_MARKETPLACE = [
      'function getAsset(uint256) view returns (tuple(uint256 id, address owner, string title, string description, string assetType, string location, uint256 price, uint256 tokenPrice, uint256 totalTokens, uint256 availableTokens, uint256 soldTokens, uint8 status, uint256 createdAt, uint256 updatedAt))',
    ];
    const marketplaceRegistry = await ethers.getContractAt(REGISTRY_ABI_FOR_MARKETPLACE, marketplaceRegistryAddress);
    const asset = await marketplaceRegistry.getAsset(assetId);
    const assetStatus = Number(asset.status); // Convert BigInt to number for comparison
    console.log(`   Title: ${asset.title}`);
    console.log(`   Status: ${assetStatus === 1 ? '✅ Active' : `❌ Inactive (${assetStatus})`}`);
    console.log(`   Available Tokens: ${asset.availableTokens.toString()}`);
    console.log(`   Token Price: ${ethers.formatEther(asset.tokenPrice)} ETH\n`);

    if (assetStatus !== 1) {
      throw new Error(`Asset is not active (status: ${assetStatus})`);
    }

    if (asset.availableTokens < tokenAmount) {
      throw new Error(`Insufficient tokens available. Available: ${asset.availableTokens}, Requested: ${tokenAmount}`);
    }

    // Calculate purchase cost in payment token
    console.log(`💵 Calculating purchase cost...`);
    let totalCost: bigint;
    let marketplaceFee: bigint;
    
    try {
      // Try to use calculatePurchaseCostInPaymentToken if available
      const costResult = await (marketplace as any).calculatePurchaseCostInPaymentToken(assetId, tokenAmount);
      totalCost = costResult[0];
      marketplaceFee = costResult[1];
      console.log(`   Total Cost (${tokenSymbol}): ${ethers.formatUnits(totalCost, tokenDecimals)} ${tokenSymbol}`);
      console.log(`   Marketplace Fee (${tokenSymbol}): ${ethers.formatUnits(marketplaceFee, tokenDecimals)} ${tokenSymbol}\n`);
    } catch (error) {
      // Fallback to ETH calculation if payment token calculation fails
      console.log(`   ⚠️  Payment token cost calculation failed, using ETH calculation...`);
      const [totalCostEth, marketplaceFeeEth] = await marketplace.calculatePurchaseCost(assetId, tokenAmount);
      console.log(`   Total Cost (ETH): ${ethers.formatEther(totalCostEth)} ETH`);
      console.log(`   Marketplace Fee (ETH): ${ethers.formatEther(marketplaceFeeEth)} ETH\n`);
      
      // Convert ETH to payment token (approximate: 1 ETH = 3000 USDC/EURC)
      // This is a fallback - actual conversion should use price oracle
      const ethToTokenRate = 3000n; // Approximate rate
      totalCost = (totalCostEth * ethToTokenRate) / (10n ** (18n - BigInt(tokenDecimals)));
      marketplaceFee = (marketplaceFeeEth * ethToTokenRate) / (10n ** (18n - BigInt(tokenDecimals)));
      console.log(`   Estimated Cost (${tokenSymbol}): ~${ethers.formatUnits(totalCost, tokenDecimals)} ${tokenSymbol}`);
      console.log(`   (Using approximate conversion rate - actual may differ)\n`);
    }

    // Check buyer's token balance
    console.log(`💳 Checking buyer balance and allowance...`);
    const buyerBalance = await paymentToken.balanceOf(buyerSigner.address);
    const buyerAllowance = await paymentToken.allowance(buyerSigner.address, MARKETPLACE_PROXY);
    
    console.log(`   Balance: ${ethers.formatUnits(buyerBalance, tokenDecimals)} ${tokenSymbol}`);
    console.log(`   Current Allowance: ${ethers.formatUnits(buyerAllowance, tokenDecimals)} ${tokenSymbol}\n`);

    // Check if approval is needed
    if (buyerAllowance < totalCost) {
      console.log(`⚠️  Insufficient allowance. Need to approve marketplace to spend tokens.`);
      console.log(`   Required Allowance: ${ethers.formatUnits(totalCost, tokenDecimals)} ${tokenSymbol}`);
      console.log(`   Current Allowance: ${ethers.formatUnits(buyerAllowance, tokenDecimals)} ${tokenSymbol}\n`);
      
      console.log(`💡 To approve, run:`);
      console.log(`   PAYMENT_TOKEN=${paymentTokenType} AMOUNT=MAX BUYER_WALLET_NUM=${buyerWalletNum} bun hardhat run scripts/approve-token-spending.ts --network sepolia\n`);
      
      throw new Error('Insufficient token allowance. Please approve marketplace to spend tokens first.');
    }

    if (buyerBalance < totalCost) {
      throw new Error(`Insufficient token balance. Balance: ${ethers.formatUnits(buyerBalance, tokenDecimals)} ${tokenSymbol}, Required: ${ethers.formatUnits(totalCost, tokenDecimals)} ${tokenSymbol}`);
    }

    console.log(`✅ Balance and allowance sufficient\n`);

    // Execute purchase using buyer signer
    console.log(`📤 Executing purchase transaction...`);
    console.log(`   Using buyer wallet: ${buyerSigner.address}\n`);
    
    // Connect marketplace to buyer signer
    const marketplaceWithBuyer = marketplace.connect(buyerSigner);
    
    const purchaseTx = await (marketplaceWithBuyer as any).purchaseTokensWithERC20(
      assetId,
      tokenAmount
    );
    
    console.log(`   Transaction Hash: ${purchaseTx.hash}`);
    console.log(`   Waiting for confirmation...\n`);
    
    const receipt = await purchaseTx.wait();
    console.log(`✅ Purchase successful!`);
    console.log(`   Block Number: ${receipt.blockNumber}`);
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
    console.log(`   Transaction Hash: ${receipt.hash}\n`);
    
    // Check updated balances
    const newBuyerBalance = await paymentToken.balanceOf(buyerSigner.address);
    console.log(`💰 Updated Balance:`);
    console.log(`   ${tokenSymbol} Balance: ${ethers.formatUnits(newBuyerBalance, tokenDecimals)} ${tokenSymbol}`);
    console.log(`   Spent: ${ethers.formatUnits(buyerBalance - newBuyerBalance, tokenDecimals)} ${tokenSymbol}\n`);

  } catch (error) {
    console.error('❌ Purchase failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('allowance')) {
        console.log('\n💡 Solution: Approve marketplace to spend tokens first');
      } else if (error.message.includes('balance')) {
        console.log('\n💡 Solution: Ensure buyer has sufficient token balance');
      } else if (error.message.includes('not active')) {
        console.log('\n💡 Solution: Asset must be active to purchase');
      }
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

