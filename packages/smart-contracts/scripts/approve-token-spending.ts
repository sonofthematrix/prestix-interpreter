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

// ERC20 ABI
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address, address) view returns (uint256)',
  'function approve(address, uint256) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
] as const;

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   APPROVE TOKEN SPENDING FOR MARKETPLACE                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Get parameters from environment variables
  const buyerWalletNum = process.env.BUYER_WALLET_NUM || '1';
  const paymentTokenType = (process.env.PAYMENT_TOKEN || '').toUpperCase();
  const amountArg = (process.env.AMOUNT || '').toUpperCase();
  
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
  
  if (!paymentTokenType || !amountArg) {
    console.log('❌ Usage: PAYMENT_TOKEN=<USDC|EURC> AMOUNT=<amount|MAX> [BUYER_WALLET_NUM=<1-5>] bun hardhat run scripts/approve-token-spending.ts --network sepolia');
    console.log('');
    console.log('Parameters:');
    console.log('  PAYMENT_TOKEN   : USDC or EURC (required)');
    console.log('  AMOUNT          : Amount to approve (in token units, e.g., 1000 for 1000 USDC)');
    console.log('                   Use "MAX" to approve maximum uint256');
    console.log('  BUYER_WALLET_NUM: Buyer wallet number 1-5 (default: 1)');
    console.log('                   Uses BUYER_WALLET_<NUM> and BUYER_KEY_<NUM> from .env.local');
    console.log('');
    console.log('Environment Variables Required:');
    console.log('  BUYER_WALLET_1, BUYER_WALLET_2, etc. (wallet addresses)');
    console.log('  BUYER_KEY_1, BUYER_KEY_2, etc. (private keys)');
    console.log('');
    console.log('Examples:');
    console.log('  PAYMENT_TOKEN=USDC AMOUNT=MAX BUYER_WALLET_NUM=1 bun hardhat run scripts/approve-token-spending.ts --network sepolia');
    console.log('  PAYMENT_TOKEN=EURC AMOUNT=1000 BUYER_WALLET_NUM=2 bun hardhat run scripts/approve-token-spending.ts --network sepolia');
    console.log('');
    process.exit(1);
  }

  if (paymentTokenType !== 'USDC' && paymentTokenType !== 'EURC') {
    console.log(`❌ Invalid payment token: ${paymentTokenType}`);
    console.log('   Supported tokens: USDC, EURC\n');
    process.exit(1);
  }

  if (!buyerAddress) {
    console.log(`❌ BUYER_WALLET_${buyerWalletNum} not found in environment variables`);
    console.log('   Please set BUYER_WALLET_1, BUYER_WALLET_2, etc. in .env.local\n');
    process.exit(1);
  }

  if (!buyerPrivateKey) {
    console.log(`❌ Private key not found for BUYER_WALLET_${buyerWalletNum}`);
    console.log(`   Please set BUYER_KEY_${buyerWalletNum} or BUYER_WALLET_${buyerWalletNum}_PRVT in .env.local\n`);
    process.exit(1);
  }

  const paymentTokenAddress = paymentTokenType === 'USDC' ? USDC_ADDRESS : EURC_ADDRESS;

  // Create signer from private key
  const provider = ethers.provider;
  const buyerSigner = new ethers.Wallet(buyerPrivateKey, provider);
  
  console.log(`👤 Buyer Wallet #${buyerWalletNum}: ${buyerAddress}`);
  console.log(`👤 Signer Address: ${buyerSigner.address}`);
  console.log(`📋 Configuration:`);
  console.log(`   Payment Token: ${paymentTokenType} (${paymentTokenAddress})`);
  console.log(`   Marketplace: ${MARKETPLACE_PROXY}\n`);
  
  // Verify signer matches buyer address
  if (buyerSigner.address.toLowerCase() !== buyerAddress.toLowerCase()) {
    throw new Error(`Private key does not match buyer address. Expected: ${buyerAddress}, Got: ${buyerSigner.address}`);
  }

  try {
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
    
    const paymentToken = await ethers.getContractAt(ERC20_ABI as any, paymentTokenAddress);
    const tokenDecimals = await paymentToken.decimals();
    const tokenSymbol = await paymentToken.symbol();

    // Get current balance and allowance
    const balance = await paymentToken.balanceOf(buyerSigner.address);
    const currentAllowance = await paymentToken.allowance(buyerSigner.address, MARKETPLACE_PROXY);

    console.log(`💰 Current Status:`);
    console.log(`   Balance: ${ethers.formatUnits(balance, tokenDecimals)} ${tokenSymbol}`);
    console.log(`   Current Allowance: ${ethers.formatUnits(currentAllowance, tokenDecimals)} ${tokenSymbol}\n`);

    // Determine approval amount
    let approvalAmount: bigint;
    if (amountArg === 'MAX') {
      approvalAmount = ethers.MaxUint256;
      console.log(`📝 Approving MAX amount (unlimited)\n`);
    } else {
      approvalAmount = ethers.parseUnits(amountArg, tokenDecimals);
      console.log(`📝 Approving: ${ethers.formatUnits(approvalAmount, tokenDecimals)} ${tokenSymbol}\n`);
    }

    // Check if approval is needed
    if (currentAllowance >= approvalAmount && approvalAmount !== ethers.MaxUint256) {
      console.log(`✅ Current allowance (${ethers.formatUnits(currentAllowance, tokenDecimals)} ${tokenSymbol}) is already sufficient.\n`);
      return;
    }

      // Execute approval using buyer signer
      console.log(`📤 Executing approval transaction...`);
      const paymentTokenWithSigner = paymentToken.connect(buyerSigner);
      const approveTx = await (paymentTokenWithSigner as any).approve(MARKETPLACE_PROXY, approvalAmount);
    console.log(`   Transaction Hash: ${approveTx.hash}`);
    console.log(`   Waiting for confirmation...\n`);

    const receipt = await approveTx.wait();
    console.log(`✅ Approval successful!`);
    console.log(`   Block Number: ${receipt.blockNumber}`);
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
    console.log(`   Transaction Hash: ${receipt.hash}\n`);

      // Verify new allowance
      const newAllowance = await paymentToken.allowance(buyerSigner.address, MARKETPLACE_PROXY);
    console.log(`✅ Updated Allowance:`);
    if (newAllowance === ethers.MaxUint256) {
      console.log(`   Unlimited (MAX)\n`);
    } else {
      console.log(`   ${ethers.formatUnits(newAllowance, tokenDecimals)} ${tokenSymbol}\n`);
    }

  } catch (error) {
    console.error('❌ Approval failed:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

