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
  'function transfer(address, uint256) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
] as const;

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   FUND BUYER WALLET FROM ADMIN                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Get parameters from environment variables
  const buyerWalletNum = process.env.BUYER_WALLET_NUM || '1';
  const ethAmountStr = process.env.ETH_AMOUNT || '0.05'; // Default 0.05 ETH
  const usdcAmountStr = process.env.USDC_AMOUNT || '50'; // Default 50 USDC
  const eurcAmountStr = process.env.EURC_AMOUNT || '50'; // Default 50 EURC
  const useMax = process.env.USE_MAX === 'true'; // Use maximum available if true

  // Get admin wallet
  const adminAddress = process.env.ADMIN_WALLET || 
                       process.env.ADMIN_WALLET_ADDRESS || 
                       process.env.WALLET_ADDRESS;
  const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;

  // Get buyer wallet address
  const buyerAddress = process.env[`BUYER_WALLET_${buyerWalletNum}`] || 
                       process.env[`BAYER_WALLET_${buyerWalletNum}`];

  if (!adminAddress || !adminPrivateKey) {
    console.log('❌ Admin wallet not found in environment variables');
    console.log('   Please set ADMIN_WALLET (or ADMIN_WALLET_ADDRESS) and ADMIN_PRIVATE_KEY in .env.local\n');
    process.exit(1);
  }

  if (!buyerAddress) {
    console.log(`❌ BUYER_WALLET_${buyerWalletNum} not found in environment variables`);
    console.log('   Please set BUYER_WALLET_1, BUYER_WALLET_2, etc. in .env.local\n');
    process.exit(1);
  }

  // Create signers
  const provider = ethers.provider;
  const adminSigner = new ethers.Wallet(adminPrivateKey, provider);

  // Verify admin signer
  if (adminSigner.address.toLowerCase() !== adminAddress.toLowerCase()) {
    throw new Error(`Admin private key does not match admin address. Expected: ${adminAddress}, Got: ${adminSigner.address}`);
  }

  console.log(`👤 Admin Wallet: ${adminSigner.address}`);
  console.log(`👤 Buyer Wallet #${buyerWalletNum}: ${buyerAddress}`);
  console.log(`📋 Transfer Amounts:`);
  console.log(`   ETH: ${ethAmountStr} ETH`);
  console.log(`   USDC: ${usdcAmountStr} USDC`);
  console.log(`   EURC: ${eurcAmountStr} EURC\n`);

  try {
    // Check admin balances
    console.log(`💰 Checking admin balances...`);
    const adminEthBalance = await provider.getBalance(adminSigner.address);
    const usdc = await ethers.getContractAt(ERC20_ABI as any, USDC_ADDRESS);
    const eurc = await ethers.getContractAt(ERC20_ABI as any, EURC_ADDRESS);
    
    const usdcDecimals = await usdc.decimals();
    const eurcDecimals = await eurc.decimals();
    
    const adminUsdcBalance = await usdc.balanceOf(adminSigner.address);
    const adminEurcBalance = await eurc.balanceOf(adminSigner.address);

    console.log(`   ETH: ${ethers.formatEther(adminEthBalance)} ETH`);
    console.log(`   USDC: ${ethers.formatUnits(adminUsdcBalance, usdcDecimals)} USDC`);
    console.log(`   EURC: ${ethers.formatUnits(adminEurcBalance, eurcDecimals)} EURC\n`);

    // Parse transfer amounts
    let ethAmount = ethers.parseEther(ethAmountStr);
    let usdcAmount = ethers.parseUnits(usdcAmountStr, usdcDecimals);
    let eurcAmount = ethers.parseUnits(eurcAmountStr, eurcDecimals);

    // If USE_MAX=true, use maximum available (leave some for gas)
    if (useMax) {
      // Leave 0.01 ETH for admin gas fees
      const minEthReserve = ethers.parseEther('0.01');
      ethAmount = adminEthBalance > minEthReserve ? adminEthBalance - minEthReserve : 0n;
      usdcAmount = adminUsdcBalance;
      eurcAmount = adminEurcBalance;
      console.log(`📋 Using maximum available amounts (leaving reserve for gas)...\n`);
    }

    // Check if admin has sufficient balance
    if (adminEthBalance < ethAmount) {
      console.log(`⚠️  Insufficient ETH balance. Have: ${ethers.formatEther(adminEthBalance)} ETH, Requested: ${ethAmountStr} ETH`);
      console.log(`   Adjusting to available balance: ${ethers.formatEther(adminEthBalance)} ETH\n`);
      ethAmount = adminEthBalance;
    }

    if (adminUsdcBalance < usdcAmount) {
      console.log(`⚠️  Insufficient USDC balance. Have: ${ethers.formatUnits(adminUsdcBalance, usdcDecimals)} USDC, Requested: ${usdcAmountStr} USDC`);
      console.log(`   Adjusting to available balance: ${ethers.formatUnits(adminUsdcBalance, usdcDecimals)} USDC\n`);
      usdcAmount = adminUsdcBalance;
    }

    if (adminEurcBalance < eurcAmount) {
      console.log(`⚠️  Insufficient EURC balance. Have: ${ethers.formatUnits(adminEurcBalance, eurcDecimals)} EURC, Requested: ${eurcAmountStr} EURC`);
      console.log(`   Adjusting to available balance: ${ethers.formatUnits(adminEurcBalance, eurcDecimals)} EURC\n`);
      eurcAmount = adminEurcBalance;
    }

    // Skip transfers if amount is zero
    if (ethAmount === 0n && usdcAmount === 0n && eurcAmount === 0n) {
      throw new Error('No funds available to transfer');
    }

    console.log(`📋 Final Transfer Amounts:`);
    if (ethAmount > 0n) console.log(`   ETH: ${ethers.formatEther(ethAmount)} ETH`);
    if (usdcAmount > 0n) console.log(`   USDC: ${ethers.formatUnits(usdcAmount, usdcDecimals)} USDC`);
    if (eurcAmount > 0n) console.log(`   EURC: ${ethers.formatUnits(eurcAmount, eurcDecimals)} EURC`);
    console.log('');

    // Transfer ETH
    if (ethAmount > 0n) {
      console.log(`📤 Transferring ETH...`);
      const ethTx = await adminSigner.sendTransaction({
        to: buyerAddress,
        value: ethAmount,
      });
      console.log(`   Transaction Hash: ${ethTx.hash}`);
      const ethReceipt = await ethTx.wait();
      console.log(`   ✅ ETH transferred in block ${ethReceipt.blockNumber}\n`);
    } else {
      console.log(`⏭️  Skipping ETH transfer (amount is 0)\n`);
    }

    // Transfer USDC
    if (usdcAmount > 0n) {
      console.log(`📤 Transferring USDC...`);
      const usdcWithSigner = usdc.connect(adminSigner);
      const usdcTx = await (usdcWithSigner as any).transfer(buyerAddress, usdcAmount);
      console.log(`   Transaction Hash: ${usdcTx.hash}`);
      const usdcReceipt = await usdcTx.wait();
      console.log(`   ✅ USDC transferred in block ${usdcReceipt.blockNumber}\n`);
    } else {
      console.log(`⏭️  Skipping USDC transfer (amount is 0)\n`);
    }

    // Transfer EURC
    if (eurcAmount > 0n) {
      console.log(`📤 Transferring EURC...`);
      const eurcWithSigner = eurc.connect(adminSigner);
      const eurcTx = await (eurcWithSigner as any).transfer(buyerAddress, eurcAmount);
      console.log(`   Transaction Hash: ${eurcTx.hash}`);
      const eurcReceipt = await eurcTx.wait();
      console.log(`   ✅ EURC transferred in block ${eurcReceipt.blockNumber}\n`);
    } else {
      console.log(`⏭️  Skipping EURC transfer (amount is 0)\n`);
    }

    // Check updated balances
    console.log(`💰 Updated Buyer Wallet Balances:`);
    const buyerEthBalance = await provider.getBalance(buyerAddress);
    const buyerUsdcBalance = await usdc.balanceOf(buyerAddress);
    const buyerEurcBalance = await eurc.balanceOf(buyerAddress);

    console.log(`   ETH: ${ethers.formatEther(buyerEthBalance)} ETH ✅`);
    console.log(`   USDC: ${ethers.formatUnits(buyerUsdcBalance, usdcDecimals)} USDC ✅`);
    console.log(`   EURC: ${ethers.formatUnits(buyerEurcBalance, eurcDecimals)} EURC ✅\n`);

    console.log(`✅ Funding complete! Buyer wallet #${buyerWalletNum} is ready for testing.\n`);

  } catch (error) {
    console.error('❌ Transfer failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('insufficient funds')) {
        console.log('\n💡 Solution: Ensure admin wallet has sufficient balances');
      } else if (error.message.includes('private key')) {
        console.log('\n💡 Solution: Verify ADMIN_PRIVATE_KEY matches ADMIN_WALLET address');
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

