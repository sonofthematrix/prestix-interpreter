#!/usr/bin/env tsx

/**
 * Mint Tokens for Testing
 * 
 * Mints tokens directly via the factory for ERC404 lifecycle testing.
 * Requires deployer/admin wallet with TOKEN_CREATOR_ROLE or DEFAULT_ADMIN_ROLE.
 * 
 * Usage:
 *   BUYER_WALLET_1=0x... ASSET_IDS=1,2,3 bun run hardhat run scripts/mint-tokens-for-testing.ts --network sepolia
 * 
 * Or with explicit deployer key:
 *   DEPLOYER_KEY=0x... BUYER_WALLET_1=0x... ASSET_IDS=1,2,3 bun run hardhat run scripts/mint-tokens-for-testing.ts --network sepolia
 */

import 'dotenv/config';
import { ethers } from 'hardhat';
import hre from 'hardhat';

const FIXED_FACTORY_ADDRESS = '0x01cD1e030EBC32be5d99E3f04571e4943dc4C31b';

const FACTORY_ABI = [
  'function getTokenAddress(uint256 assetId) view returns (address)',
  'function mintTokens(uint256 assetId, address to, uint256 amount)',
  'function TOKEN_CREATOR_ROLE() view returns (bytes32)',
  'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
] as const;

const TOKEN_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
] as const;

async function main() {
  console.log('🪙 Minting Tokens for Testing');
  console.log('════════════════════════════════════════════════════════════\n');

  const buyerWallet = process.env.BUYER_WALLET_1;
  const deployerKey = process.env.DEPLOYER_KEY || process.env.PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY;

  if (!buyerWallet) {
    console.error('❌ BUYER_WALLET_1 environment variable not set');
    process.exit(1);
  }

  // Parse asset IDs
  const assetIdsEnv = process.env.ASSET_IDS;
  const assetIds = assetIdsEnv 
    ? assetIdsEnv.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
    : [1, 2, 3, 4]; // Default to all assets

  const provider = hre.ethers.provider;
  const factory = new ethers.Contract(FIXED_FACTORY_ADDRESS, FACTORY_ABI, provider);

  // Get signer
  let signer: any;
  if (deployerKey) {
    signer = new ethers.Wallet(deployerKey, provider);
    console.log(`👤 Using Deployer Wallet: ${signer.address}`);
  } else {
    [signer] = await hre.ethers.getSigners();
    console.log(`👤 Using Default Signer: ${signer.address}`);
  }

  console.log(`👤 Buyer Wallet: ${buyerWallet}\n`);

  // Check signer balance
  const ethBalance = await provider.getBalance(signer.address);
  console.log(`💰 Signer ETH Balance: ${ethers.formatEther(ethBalance)} ETH\n`);

  if (ethBalance < ethers.parseEther('0.001')) {
    console.error('❌ Signer wallet has insufficient ETH for gas');
    console.error('   Please fund the signer wallet with at least 0.001 ETH');
    process.exit(1);
  }

  // Check roles
  console.log('🔐 Checking factory roles...');
  const factoryWithSigner = factory.connect(signer);
  
  const [TOKEN_CREATOR_ROLE, DEFAULT_ADMIN_ROLE] = await Promise.all([
    factory.TOKEN_CREATOR_ROLE(),
    factory.DEFAULT_ADMIN_ROLE(),
  ]);

  const hasTokenCreatorRole = await factory.hasRole(TOKEN_CREATOR_ROLE, signer.address);
  const hasAdminRole = await factory.hasRole(DEFAULT_ADMIN_ROLE, signer.address);

  console.log(`   TOKEN_CREATOR_ROLE: ${hasTokenCreatorRole ? '✅' : '❌'}`);
  console.log(`   DEFAULT_ADMIN_ROLE: ${hasAdminRole ? '✅' : '❌'}\n`);

  if (!hasTokenCreatorRole && !hasAdminRole) {
    console.error('❌ Signer does not have TOKEN_CREATOR_ROLE or DEFAULT_ADMIN_ROLE');
    console.error('   Cannot mint tokens without proper role');
    console.error(`   Signer: ${signer.address}`);
    console.error(`   Factory: ${FIXED_FACTORY_ADDRESS}`);
    process.exit(1);
  }

  // Mint tokens for each asset
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

      // Get token info
      const [name, symbol, buyerBalance, totalSupply] = await Promise.all([
        token.name(),
        token.symbol(),
        token.balanceOf(buyerWallet),
        token.totalSupply(),
      ]);

      console.log(`   Token: ${name} (${symbol})`);
      console.log(`   Address: ${tokenAddress}`);
      console.log(`   Buyer Current Balance: ${ethers.formatEther(buyerBalance)} ${symbol}`);
      console.log(`   Total Supply: ${ethers.formatEther(totalSupply)} ${symbol}`);

      // Mint amount: 100 tokens for testing
      const mintAmount = ethers.parseEther('100');
      console.log(`\n   🪙 Minting ${ethers.formatEther(mintAmount)} ${symbol}...`);

      // Note: Fixed factory uses transferFrom, so we need to check if owner has tokens
      // For now, try minting and see what happens
      try {
        const tx = await (factoryWithSigner as any).mintTokens(assetId, buyerWallet, mintAmount);
        console.log(`   ⏳ Transaction: ${tx.hash}`);
        
        const receipt = await tx.wait();
        console.log(`   ✅ Mint confirmed in block ${receipt.blockNumber}`);

        // Verify mint
        const newBuyerBalance = await token.balanceOf(buyerWallet);
        console.log(`   ✅ Buyer new balance: ${ethers.formatEther(newBuyerBalance)} ${symbol}`);

        if (newBuyerBalance === buyerBalance) {
          console.log(`   ⚠️  Balance unchanged - mint may have failed or used transferFrom`);
          console.log(`   Note: Fixed factory uses transferFrom, requires owner to have tokens`);
        }

      } catch (error: any) {
        console.error(`   ❌ Mint failed: ${error.message}`);
        if (error.reason) {
          console.error(`      Reason: ${error.reason}`);
        }
        if (error.data) {
          console.error(`      Data: ${error.data}`);
        }
        
        // If it's an allowance/balance issue, suggest direct transfer
        if (error.message.includes('allowance') || error.message.includes('balance')) {
          console.log(`\n   💡 Suggestion: Use transfer-tokens-for-testing.ts with holder's private key`);
        }
      }

    } catch (error: any) {
      console.error(`   ❌ Error processing asset ${assetId}:`, error.message);
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ Token minting attempt complete!');
  console.log('════════════════════════════════════════════════════════════\n');
  
  // Check final balances
  console.log('📊 Final Buyer Balances:\n');
  for (const assetId of assetIds) {
    try {
      const tokenAddress = await factory.getTokenAddress(assetId);
      if (tokenAddress && tokenAddress !== ethers.ZeroAddress) {
        const token = new ethers.Contract(tokenAddress, TOKEN_ABI, provider);
        const [name, symbol, balance] = await Promise.all([
          token.name(),
          token.symbol(),
          token.balanceOf(buyerWallet),
        ]);
        
        if (balance > 0n) {
          console.log(`   Asset ${assetId} (${symbol}): ${ethers.formatEther(balance)} tokens ✅`);
        } else {
          console.log(`   Asset ${assetId} (${symbol}): 0 tokens`);
        }
      }
    } catch {
      // Skip
    }
  }

  console.log('\nYou can now run the ERC404 lifecycle test:');
  console.log(`BUYER_WALLET_1=${buyerWallet} BUYER_KEY_1=... ASSET_IDS=${assetIds.join(',')} bun run hardhat run scripts/test-erc404-token-lifecycle.ts --network sepolia\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
