#!/usr/bin/env tsx

/**
 * Deploy Test Token for ERC404 Testing
 * 
 * Deploys a new ERC404 token specifically for testing the ERC404 lifecycle.
 * Mints tokens directly to the buyer wallet during deployment.
 * 
 * Usage:
 *   BUYER_WALLET_1=0x... ASSET_ID=99 bun run hardhat run scripts/deploy-test-token-for-testing.ts --network sepolia
 */

import 'dotenv/config';
import { ethers } from 'hardhat';
import hre from 'hardhat';

const FIXED_FACTORY_ADDRESS = '0x01cD1e030EBC32be5d99E3f04571e4943dc4C31b';
const REGISTRY_ADDRESS = '0x50f67C0632b74f78094623233aAFf7cc4666576F';

const FACTORY_ABI = [
  'function createToken404(uint256 assetId, string memory name, string memory symbol, uint256 totalSupply, address owner, string memory tokenURI) returns (address)',
  'function getTokenAddress(uint256 assetId) view returns (address)',
] as const;

const REGISTRY_ABI = [
  'function registerAsset(address owner, string calldata title, string calldata description, string calldata assetType, string calldata location, uint256 price, uint256 tokenPrice, uint256 totalTokens) external returns (uint256 assetId)',
] as const;

const TOKEN_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
] as const;

async function main() {
  console.log('🪙 Deploying Test Token for ERC404 Testing');
  console.log('════════════════════════════════════════════════════════════\n');

  const buyerWallet = process.env.BUYER_WALLET_1;
  const assetId = parseInt(process.env.ASSET_ID || '99'); // Use high ID to avoid conflicts
  const deployerKey = process.env.DEPLOYER_KEY || process.env.PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY;

  if (!buyerWallet) {
    console.error('❌ BUYER_WALLET_1 environment variable not set');
    process.exit(1);
  }

  const provider = hre.ethers.provider;
  let signer: any;

  if (deployerKey) {
    signer = new ethers.Wallet(deployerKey, provider);
    console.log(`👤 Using Deployer Wallet: ${signer.address}`);
  } else {
    [signer] = await hre.ethers.getSigners();
    console.log(`👤 Using Default Signer: ${signer.address}`);
  }

  console.log(`👤 Buyer Wallet: ${buyerWallet}`);
  console.log(`📋 Test Asset ID: ${assetId}\n`);

  // Check if asset ID already exists
  const factory = new ethers.Contract(FIXED_FACTORY_ADDRESS, FACTORY_ABI, provider);
  try {
    const existingToken = await factory.getTokenAddress(assetId);
    if (existingToken && existingToken !== ethers.ZeroAddress) {
      console.log(`⚠️  Asset ID ${assetId} already has a token: ${existingToken}`);
      console.log(`   Using existing token instead of deploying new one.\n`);
      
      // Check buyer balance
      const token = new ethers.Contract(existingToken, TOKEN_ABI, provider);
      const balance = await token.balanceOf(buyerWallet);
      console.log(`   Buyer balance: ${ethers.formatEther(balance)} tokens`);
      
      if (balance > 0n) {
        console.log(`\n✅ Buyer already has tokens! You can proceed with testing.\n`);
        return;
      } else {
        console.log(`\n⚠️  Buyer has no tokens. You'll need to transfer or mint tokens.\n`);
        return;
      }
    }
  } catch {
    // Asset doesn't exist, proceed with deployment
  }

  // Check signer balance
  const ethBalance = await provider.getBalance(signer.address);
  console.log(`💰 Signer ETH Balance: ${ethers.formatEther(ethBalance)} ETH\n`);

  if (ethBalance < ethers.parseEther('0.01')) {
    console.error('❌ Signer wallet has insufficient ETH for deployment');
    console.error('   Please fund the signer wallet with at least 0.01 ETH');
    process.exit(1);
  }

  // Step 1: Register asset in registry
  console.log('📝 Step 1: Registering asset in registry...');
  const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, signer);
  
  const testAsset = {
    title: `Test Asset ${assetId}`,
    description: `Test asset for ERC404 lifecycle testing - Asset ID ${assetId}`,
    assetType: 'REAL_ESTATE',
    location: 'Test Location',
    price: ethers.parseEther('100'), // 100 ETH total
    tokenPrice: ethers.parseEther('0.1'), // 0.1 ETH per token
    totalTokens: ethers.parseEther('1000'), // 1000 tokens
  };

  try {
    const registerTx = await registry.registerAsset(
      signer.address, // owner
      testAsset.title,
      testAsset.description,
      testAsset.assetType,
      testAsset.location,
      testAsset.price,
      testAsset.tokenPrice,
      testAsset.totalTokens
    );
    
    console.log(`   ⏳ Registration transaction: ${registerTx.hash}`);
    const registerReceipt = await registerTx.wait();
    console.log(`   ✅ Asset registered in block ${registerReceipt.blockNumber}\n`);

    // Extract asset ID from events if needed
    // For now, we'll use the provided assetId
  } catch (error: any) {
    console.error(`   ❌ Registration failed: ${error.message}`);
    if (error.reason) {
      console.error(`      Reason: ${error.reason}`);
    }
    console.log(`\n   ⚠️  Continuing with token deployment anyway...\n`);
  }

  // Step 2: Deploy token via factory
  console.log('🏭 Step 2: Deploying ERC404 token via factory...');
  const factoryWithSigner = factory.connect(signer);

  const tokenName = `Test Asset ${assetId}`;
  const tokenSymbol = `TEST${assetId}`;
  const totalSupply = ethers.parseEther('1000'); // 1000 tokens
  const tokenURI = `https://api.tigerpalace.pro/assets/${assetId}/metadata.json`;

  try {
    const deployTx = await (factoryWithSigner as any).createToken404(
      assetId,
      tokenName,
      tokenSymbol,
      totalSupply,
      buyerWallet, // Mint directly to buyer wallet
      tokenURI
    );

    console.log(`   ⏳ Deployment transaction: ${deployTx.hash}`);
    const deployReceipt = await deployTx.wait();
    console.log(`   ✅ Token deployed in block ${deployReceipt.blockNumber}`);

    // Get token address
    const tokenAddress = await factory.getTokenAddress(assetId);
    console.log(`   📍 Token Address: ${tokenAddress}\n`);

    // Verify buyer balance
    const token = new ethers.Contract(tokenAddress, TOKEN_ABI, provider);
    const [name, symbol, buyerBalance, totalSupplyOnChain] = await Promise.all([
      token.name(),
      token.symbol(),
      token.balanceOf(buyerWallet),
      token.totalSupply(),
    ]);

    console.log('📊 Token Details:');
    console.log(`   Name: ${name}`);
    console.log(`   Symbol: ${symbol}`);
    console.log(`   Total Supply: ${ethers.formatEther(totalSupplyOnChain)} ${symbol}`);
    console.log(`   Buyer Balance: ${ethers.formatEther(buyerBalance)} ${symbol}\n`);

    if (buyerBalance > 0n) {
      console.log('✅ Success! Buyer wallet has tokens for testing.\n');
      console.log('You can now run the ERC404 lifecycle test:');
      console.log(`BUYER_WALLET_1=${buyerWallet} BUYER_KEY_1=... ASSET_IDS=${assetId} \\`);
      console.log(`bun run hardhat run scripts/test-erc404-token-lifecycle.ts --network sepolia\n`);
    } else {
      console.log('⚠️  Buyer wallet has no tokens.');
      console.log('   The factory may have minted tokens to a different address.');
      console.log('   Check the factory deployment logic.\n');
    }

  } catch (error: any) {
    console.error(`   ❌ Token deployment failed: ${error.message}`);
    if (error.reason) {
      console.error(`      Reason: ${error.reason}`);
    }
    if (error.data) {
      console.error(`      Data: ${error.data}`);
    }
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
