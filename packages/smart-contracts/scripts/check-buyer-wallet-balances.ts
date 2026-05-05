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

const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
const EURC_ADDRESS = process.env.NEXT_PUBLIC_EURC_ADDRESS || '0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4';

// ERC20 ABI
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
] as const;

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   CHECK BUYER WALLET BALANCES                               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const provider = ethers.provider;
  const usdc = await ethers.getContractAt(ERC20_ABI as any, USDC_ADDRESS);
  const eurc = await ethers.getContractAt(ERC20_ABI as any, EURC_ADDRESS);

  console.log(`📋 Checking Buyer Wallets 1-5...\n`);

  const wallets: Array<{
    num: number;
    address: string;
    ethBalance: string;
    usdcBalance: string;
    eurcBalance: string;
    hasEth: boolean;
    hasTokens: boolean;
  }> = [];

  for (let i = 1; i <= 5; i++) {
    const address = process.env[`BUYER_WALLET_${i}`] || process.env[`BAYER_WALLET_${i}`];
    
    if (!address) {
      console.log(`⚠️  BUYER_WALLET_${i} not found - skipping\n`);
      continue;
    }

    try {
      const ethBalance = await provider.getBalance(address);
      const usdcBalance = await usdc.balanceOf(address);
      const eurcBalance = await eurc.balanceOf(address);
      
      const usdcDecimals = await usdc.decimals();
      const eurcDecimals = await eurc.decimals();

      wallets.push({
        num: i,
        address,
        ethBalance: ethers.formatEther(ethBalance),
        usdcBalance: ethers.formatUnits(usdcBalance, usdcDecimals),
        eurcBalance: ethers.formatUnits(eurcBalance, eurcDecimals),
        hasEth: ethBalance > 0n,
        hasTokens: usdcBalance > 0n || eurcBalance > 0n,
      });
    } catch (error) {
      console.log(`❌ Error checking BUYER_WALLET_${i}: ${error instanceof Error ? error.message : String(error)}\n`);
    }
  }

  if (wallets.length === 0) {
    console.log('❌ No buyer wallets found in environment variables\n');
    return;
  }

  // Display results
  for (const wallet of wallets) {
    console.log(`📦 Buyer Wallet #${wallet.num}: ${wallet.address}`);
    console.log(`   ETH: ${wallet.ethBalance} ETH ${wallet.hasEth ? '✅' : '❌ (needs funding)'}`);
    console.log(`   USDC: ${wallet.usdcBalance} USDC ${parseFloat(wallet.usdcBalance) > 0 ? '✅' : '❌ (needs funding)'}`);
    console.log(`   EURC: ${wallet.eurcBalance} EURC ${parseFloat(wallet.eurcBalance) > 0 ? '✅' : '❌ (needs funding)'}`);
    console.log('');
  }

  // Summary
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   SUMMARY                                                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const walletsWithEth = wallets.filter(w => w.hasEth).length;
  const walletsWithTokens = wallets.filter(w => w.hasTokens).length;

  console.log(`📊 Statistics:`);
  console.log(`   Total Wallets Checked: ${wallets.length}`);
  console.log(`   Wallets with ETH: ${walletsWithEth}/${wallets.length} ${walletsWithEth === wallets.length ? '✅' : '⚠️'}`);
  console.log(`   Wallets with Tokens: ${walletsWithTokens}/${wallets.length} ${walletsWithTokens === wallets.length ? '✅' : '⚠️'}\n`);

  if (walletsWithEth < wallets.length) {
    console.log(`⚠️  Wallets needing ETH funding:`);
    wallets.filter(w => !w.hasEth).forEach(w => {
      console.log(`   - BUYER_WALLET_${w.num}: ${w.address}`);
    });
    console.log('');
  }

  if (walletsWithTokens < wallets.length) {
    console.log(`💡 Wallets can be funded with:`);
    console.log(`   - Sepolia ETH (for gas fees)`);
    console.log(`   - USDC (${USDC_ADDRESS})`);
    console.log(`   - EURC (${EURC_ADDRESS})\n`);
  }

  // Recommendations
  if (walletsWithEth === wallets.length && walletsWithTokens === wallets.length) {
    console.log(`✅ All wallets are funded and ready for purchases!\n`);
  } else {
    console.log(`📝 Next Steps:`);
    if (walletsWithEth < wallets.length) {
      console.log(`   1. Fund wallets with Sepolia ETH (for gas fees)`);
    }
    if (walletsWithTokens < wallets.length) {
      console.log(`   2. Fund wallets with USDC or EURC (for purchases)`);
    }
    console.log(`   3. Run approval script: PAYMENT_TOKEN=USDC AMOUNT=MAX BUYER_WALLET_NUM=1 bun hardhat run scripts/approve-token-spending.ts --network sepolia`);
    console.log(`   4. Run purchase script: ASSET_ID=9 PAYMENT_TOKEN=USDC TOKEN_AMOUNT=1 BUYER_WALLET_NUM=1 bun hardhat run scripts/purchase-with-usdc-eurc.ts --network sepolia\n`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

