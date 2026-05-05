#!/usr/bin/env tsx

/**
 * Transfer Tokens for Testing
 * 
 * Transfers tokens from the current holder to the buyer wallet for ERC404 lifecycle testing.
 * 
 * Usage:
 *   HOLDER_KEY=0x... BUYER_WALLET_1=0x... ASSET_IDS=1,2,3 bun run hardhat run scripts/transfer-tokens-for-testing.ts --network sepolia
 */

import 'dotenv/config';
import { ethers } from 'hardhat';
import hre from 'hardhat';

const FIXED_FACTORY_ADDRESS = '0x01cD1e030EBC32be5d99E3f04571e4943dc4C31b';
const TOKEN_HOLDER_ADDRESS = '0xc9C369525DFf385935dfDC6aC2F678C26998D0d7'; // Current token holder

const FACTORY_ABI = [
  'function getTokenAddress(uint256 assetId) view returns (address)',
] as const;

const TOKEN_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
] as const;

async function main() {
  console.log('🔄 Transferring Tokens for Testing');
  console.log('════════════════════════════════════════════════════════════\n');

  const buyerWallet = process.env.BUYER_WALLET_1;
  const holderKey = process.env.HOLDER_KEY;

  if (!buyerWallet) {
    console.error('❌ BUYER_WALLET_1 environment variable not set');
    process.exit(1);
  }

  if (!holderKey) {
    console.error('❌ HOLDER_KEY environment variable not set');
    console.error('   This should be the private key of the token holder wallet');
    console.error(`   Current holder: ${TOKEN_HOLDER_ADDRESS}`);
    process.exit(1);
  }

  // Parse asset IDs
  const assetIdsEnv = process.env.ASSET_IDS;
  const assetIds = assetIdsEnv 
    ? assetIdsEnv.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
    : [1, 2, 3, 4]; // Default to all assets

  const provider = hre.ethers.provider;
  const factory = new ethers.Contract(FIXED_FACTORY_ADDRESS, FACTORY_ABI, provider);

  // Create holder wallet
  const holderWallet = new ethers.Wallet(holderKey, provider);
  
  if (holderWallet.address.toLowerCase() !== TOKEN_HOLDER_ADDRESS.toLowerCase()) {
    console.error(`❌ HOLDER_KEY does not match expected holder address`);
    console.error(`   Expected: ${TOKEN_HOLDER_ADDRESS}`);
    console.error(`   Got: ${holderWallet.address}`);
    process.exit(1);
  }

  console.log(`👤 Holder Wallet: ${holderWallet.address}`);
  console.log(`👤 Buyer Wallet: ${buyerWallet}\n`);

  // Check holder balance
  const ethBalance = await provider.getBalance(holderWallet.address);
  console.log(`💰 Holder ETH Balance: ${ethers.formatEther(ethBalance)} ETH\n`);

  if (ethBalance < ethers.parseEther('0.001')) {
    console.error('❌ Holder wallet has insufficient ETH for gas');
    console.error('   Please fund the holder wallet with at least 0.001 ETH');
    process.exit(1);
  }

  // Transfer tokens for each asset
  for (const assetId of assetIds) {
    try {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Asset ${assetId}`);
      console.log('='.repeat(80));

      // Get token address
      const tokenAddress = await factory.getTokenAddress(assetId);
      if (!tokenAddress || tokenAddress === ethers.ZeroAddress) {
        console.log(`   ⚠️  Token not found for asset ${assetId}`);
        continue;
      }

      const token = new ethers.Contract(tokenAddress, TOKEN_ABI, provider);
      const tokenWithHolder = token.connect(holderWallet);

      // Get token info
      const [name, symbol, holderBalance, buyerBalance] = await Promise.all([
        token.name(),
        token.symbol(),
        token.balanceOf(holderWallet.address),
        token.balanceOf(buyerWallet),
      ]);

      console.log(`   Token: ${name} (${symbol})`);
      console.log(`   Address: ${tokenAddress}`);
      console.log(`   Holder Balance: ${ethers.formatEther(holderBalance)} ${symbol}`);
      console.log(`   Buyer Balance: ${ethers.formatEther(buyerBalance)} ${symbol}`);

      if (holderBalance === 0n) {
        console.log(`   ⚠️  Holder has no tokens to transfer`);
        continue;
      }

      // Transfer amount: 100 tokens or 10% of balance, whichever is smaller
      const transferAmount = holderBalance > ethers.parseEther('1000')
        ? ethers.parseEther('100')
        : holderBalance / 10n;

      console.log(`\n   📤 Transferring ${ethers.formatEther(transferAmount)} ${symbol}...`);

      // Transfer tokens
      const tx = await (tokenWithHolder as any).transfer(buyerWallet, transferAmount);
      console.log(`   ⏳ Transaction: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`   ✅ Transfer confirmed in block ${receipt.blockNumber}`);

      // Verify transfer
      const newBuyerBalance = await token.balanceOf(buyerWallet);
      console.log(`   ✅ Buyer new balance: ${ethers.formatEther(newBuyerBalance)} ${symbol}`);

    } catch (error: any) {
      console.error(`   ❌ Error transferring tokens for asset ${assetId}:`, error.message);
      if (error.reason) {
        console.error(`      Reason: ${error.reason}`);
      }
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ Token transfer complete!');
  console.log('════════════════════════════════════════════════════════════\n');
  console.log('You can now run the ERC404 lifecycle test:');
  console.log(`BUYER_WALLET_1=${buyerWallet} BUYER_KEY_1=... ASSET_IDS=${assetIds.join(',')} bun run hardhat run scripts/test-erc404-token-lifecycle.ts --network sepolia\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
