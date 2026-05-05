import 'dotenv/config';
import hre from 'hardhat';
const { ethers } = hre;
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

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

// Marketplace ABI
const MARKETPLACE_ABI = [
  'function paymentToken() view returns (address)',
  'function setPaymentToken(address _paymentToken)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
] as const;

// ERC20 ABI for verification
const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
] as const;

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   CONFIGURE MARKETPLACE PAYMENT TOKEN                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Get payment token type from environment
  const paymentTokenType = (process.env.PAYMENT_TOKEN || '').toUpperCase();

  if (!paymentTokenType || (paymentTokenType !== 'USDC' && paymentTokenType !== 'EURC')) {
    console.log('❌ Usage: PAYMENT_TOKEN=<USDC|EURC> bun hardhat run scripts/configure-marketplace-payment-token.ts --network sepolia\n');
    console.log('📋 Parameters:');
    console.log('  PAYMENT_TOKEN   : USDC or EURC (required)\n');
    console.log('📝 Examples:');
    console.log('  PAYMENT_TOKEN=USDC bun hardhat run scripts/configure-marketplace-payment-token.ts --network sepolia');
    console.log('  PAYMENT_TOKEN=EURC bun hardhat run scripts/configure-marketplace-payment-token.ts --network sepolia\n');
    process.exit(1);
  }

  const paymentTokenAddress = paymentTokenType === 'USDC' ? USDC_ADDRESS : EURC_ADDRESS;

  // Get admin wallet
  const adminAddress = process.env.ADMIN_WALLET || 
                       process.env.ADMIN_WALLET_ADDRESS || 
                       process.env.WALLET_ADDRESS;
  const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY || 
                          process.env.PRIVATE_KEY;

  if (!adminAddress || !adminPrivateKey) {
    console.log('❌ Admin wallet not found in environment variables');
    console.log('   Please set ADMIN_WALLET (or ADMIN_WALLET_ADDRESS) and ADMIN_PRIVATE_KEY in .env.local\n');
    process.exit(1);
  }

  console.log(`📋 Configuration:`);
  console.log(`   Marketplace Proxy: ${MARKETPLACE_PROXY}`);
  console.log(`   Payment Token: ${paymentTokenType} (${paymentTokenAddress})`);
  console.log(`   Admin Wallet: ${adminAddress}\n`);

  try {
    // Create signer
    const provider = ethers.provider;
    const adminSigner = new ethers.Wallet(adminPrivateKey, provider);

    // Verify admin signer
    if (adminSigner.address.toLowerCase() !== adminAddress.toLowerCase()) {
      throw new Error(`Admin private key does not match admin address. Expected: ${adminAddress}, Got: ${adminSigner.address}`);
    }

    // Get marketplace contract
    const marketplace = await ethers.getContractAt(MARKETPLACE_ABI as any, MARKETPLACE_PROXY);

    // Check current payment token
    console.log(`🔍 Checking current payment token configuration...`);
    const currentPaymentToken = await marketplace.paymentToken();
    console.log(`   Current payment token: ${currentPaymentToken === ethers.ZeroAddress ? 'None (ETH only)' : currentPaymentToken}\n`);

    if (currentPaymentToken.toLowerCase() === paymentTokenAddress.toLowerCase()) {
      console.log(`✅ Marketplace is already configured with ${paymentTokenType}`);
      console.log(`   No changes needed.\n`);
      
      // Verify token contract
      const token = await ethers.getContractAt(ERC20_ABI as any, paymentTokenAddress);
      const tokenName = await token.name();
      const tokenSymbol = await token.symbol();
      const tokenDecimals = await token.decimals();
      console.log(`📋 Token Details:`);
      console.log(`   Name: ${tokenName}`);
      console.log(`   Symbol: ${tokenSymbol}`);
      console.log(`   Decimals: ${tokenDecimals}\n`);
      return;
    }

    // Check admin role
    console.log(`🔍 Checking admin permissions...`);
    const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
    const hasAdminRole = await marketplace.hasRole(DEFAULT_ADMIN_ROLE, adminSigner.address);
    
    if (!hasAdminRole) {
      console.log(`❌ Admin wallet does not have DEFAULT_ADMIN_ROLE`);
      console.log(`   Address: ${adminSigner.address}`);
      console.log(`   Role: ${DEFAULT_ADMIN_ROLE}\n`);
      console.log(`💡 Solution: Grant DEFAULT_ADMIN_ROLE to ${adminSigner.address} on the marketplace contract\n`);
      process.exit(1);
    }

    console.log(`   ✅ Admin has DEFAULT_ADMIN_ROLE\n`);

    // Verify token contract
    console.log(`🔍 Verifying ${paymentTokenType} token contract...`);
    const token = await ethers.getContractAt(ERC20_ABI as any, paymentTokenAddress);
    const tokenName = await token.name();
    const tokenSymbol = await token.symbol();
    const tokenDecimals = await token.decimals();
    console.log(`   ✅ Token verified:`);
    console.log(`      Name: ${tokenName}`);
    console.log(`      Symbol: ${tokenSymbol}`);
    console.log(`      Decimals: ${tokenDecimals}\n`);

    // Configure payment token
    console.log(`⚙️  Configuring marketplace with ${paymentTokenType}...`);
    const marketplaceWithSigner = marketplace.connect(adminSigner);
    const tx = await (marketplaceWithSigner as any).setPaymentToken(paymentTokenAddress);
    console.log(`   Transaction Hash: ${tx.hash}`);
    console.log(`   Waiting for confirmation...\n`);

    const receipt = await tx.wait();
    console.log(`✅ Marketplace configured successfully!`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}\n`);

    // Verify configuration
    console.log(`🔍 Verifying configuration...`);
    const newPaymentToken = await marketplace.paymentToken();
    
    if (newPaymentToken.toLowerCase() === paymentTokenAddress.toLowerCase()) {
      console.log(`✅ Verification successful!`);
      console.log(`   Payment token: ${newPaymentToken} (${paymentTokenType})\n`);
    } else {
      console.log(`❌ Verification failed!`);
      console.log(`   Expected: ${paymentTokenAddress}`);
      console.log(`   Got: ${newPaymentToken}\n`);
      process.exit(1);
    }

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   CONFIGURATION SUMMARY                                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`✅ Marketplace configured to accept ${paymentTokenType} payments`);
    console.log(`   Token Address: ${paymentTokenAddress}`);
    console.log(`   Token Name: ${tokenName}`);
    console.log(`   Token Symbol: ${tokenSymbol}\n`);
    console.log(`⚠️  Note: Marketplace contract only supports ONE payment token at a time`);
    console.log(`   - Currently configured: ${paymentTokenType}`);
    console.log(`   - To switch to ${paymentTokenType === 'USDC' ? 'EURC' : 'USDC'}, run:`);
    console.log(`     PAYMENT_TOKEN=${paymentTokenType === 'USDC' ? 'EURC' : 'USDC'} bun hardhat run scripts/configure-marketplace-payment-token.ts --network sepolia\n`);

  } catch (error: any) {
    console.error('❌ Configuration failed:', error.message);
    
    if (error.transaction) {
      console.error(`   Transaction hash: ${error.transaction.hash}`);
    }
    
    if (error.message.includes('AccessControl')) {
      console.log(`\n💡 Solution: Ensure admin wallet has DEFAULT_ADMIN_ROLE on the marketplace contract`);
    } else if (error.message.includes('insufficient funds')) {
      console.log(`\n💡 Solution: Ensure admin wallet has sufficient ETH for gas fees`);
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

