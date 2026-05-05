#!/usr/bin/env tsx
/**
 * Test ERC404 Token Finding Functionality
 * 
 * This script tests the upgraded marketplace contract to verify:
 * 1. Marketplace can find existing ERC404 tokens before creating new ones
 * 2. No duplicate tokens are created when purchasing
 * 3. Correct tokens are used for purchases
 * 
 * Usage:
 *   cd packages/smart-contracts
 *   bun hardhat run scripts/test-erc404-token-finding.ts --network sepolia [assetId]
 * 
 * Example:
 *   bun hardhat run scripts/test-erc404-token-finding.ts --network sepolia 1
 */

import 'dotenv/config';
import hre from 'hardhat';
const { ethers, upgrades } = hre;

// Contract addresses from environment
const MARKETPLACE_PROXY = process.env.NEXT_PUBLIC_RWA_MARKETPLACE || '0xc9C369525DFf385935dfDC6aC2F678C26998D0d7';
const FACTORY_404 = process.env.NEXT_PUBLIC_RWA_TOKEN_FACTORY_404 || '0x7a6f7dE826064903f2e419833b9633560217FEe2';
const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_RWA_ASSET_REGISTRY || '0xe2d49642B5aE5D0f62dA79D572d04cA95dB2853D';

interface TestResult {
  test: string;
  passed: boolean;
  details: string;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   TEST ERC404 TOKEN FINDING FUNCTIONALITY                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const signers = await ethers.getSigners();
  if (signers.length < 1) {
    throw new Error(`No signers available. Check Hardhat network configuration.`);
  }
  
  // Use deployer for all operations if only one signer available
  const deployer = signers[0];
  const buyer1 = signers[1] || signers[0]; // Use deployer if buyer1 not available
  const buyer2 = signers[2] || signers[0]; // Use deployer if buyer2 not available
  
  console.log(`👤 Test Accounts:`);
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   Buyer 1: ${buyer1.address}${buyer1 === deployer ? ' (using deployer)' : ''}`);
  console.log(`   Buyer 2: ${buyer2.address}${buyer2 === deployer ? ' (using deployer)' : ''}\n`);

  // Get asset ID from args, environment variable, or use default
  const assetIdArg = process.argv[2] || process.env.ASSET_ID;
  const assetId = assetIdArg ? BigInt(assetIdArg) : null;
  
  if (!assetId) {
    console.log('❌ Asset ID required');
    console.log('   Usage: ASSET_ID=1 bun hardhat run scripts/test-erc404-token-finding.ts --network sepolia');
    console.log('   Or: bun tsx scripts/test-erc404-token-finding.ts 1');
    console.log('   Example: ASSET_ID=1 bun hardhat run scripts/test-erc404-token-finding.ts --network sepolia\n');
    process.exit(1);
  }

  console.log(`📋 Configuration:`);
  console.log(`   Marketplace Proxy: ${MARKETPLACE_PROXY}`);
  console.log(`   ERC404 Factory: ${FACTORY_404}`);
  console.log(`   Asset Registry: ${REGISTRY_ADDRESS}`);
  console.log(`   Asset ID: ${assetId}\n`);

  const results: TestResult[] = [];

  try {
    // Load contract instances
    console.log(`🔗 Loading contract instances...`);
    const marketplace = await ethers.getContractAt('RWAMarketplaceUpgradeable', MARKETPLACE_PROXY);
    const factory404 = await ethers.getContractAt('RWATokenFactory404', FACTORY_404);
    const registry = await ethers.getContractAt('RWAAssetRegistry', REGISTRY_ADDRESS);

    // Verify ERC404 factory is configured
    const configuredFactory = await marketplace.getTokenFactory404();
    if (configuredFactory.toLowerCase() !== FACTORY_404.toLowerCase()) {
      throw new Error(`ERC404 factory not configured correctly. Expected: ${FACTORY_404}, Got: ${configuredFactory}`);
    }
    console.log(`   ✅ ERC404 factory configured: ${configuredFactory}\n`);

    // Get asset details
    console.log(`🔍 Fetching asset details...`);
    const asset = await registry.getAsset(assetId);
    console.log(`   Title: ${asset.title}`);
    console.log(`   Status: ${asset.status}`);
    console.log(`   Available Tokens: ${asset.availableTokens.toString()}`);
    console.log(`   Token Price: ${ethers.formatEther(asset.tokenPrice)} ETH\n`);

    if (Number(asset.status) !== 1) {
      throw new Error(`Asset ${assetId} is not ACTIVE (status: ${asset.status})`);
    }

    // Test 1: Check if ERC404 token exists for this asset
    console.log(`\n📝 Test 1: Check for existing ERC404 token`);
    console.log(`   Checking factory for token address...`);
    
    let existingTokenAddress: string | null = null;
    try {
      existingTokenAddress = await factory404.getTokenAddress(assetId);
      if (existingTokenAddress && existingTokenAddress !== ethers.ZeroAddress) {
        console.log(`   ✅ Found existing ERC404 token: ${existingTokenAddress}`);
        
        // Verify token is valid
        const isValid = await factory404.isValidToken(existingTokenAddress);
        console.log(`   Token valid: ${isValid}`);
        
        if (isValid) {
          const tokenContract = await ethers.getContractAt('RWAToken404', existingTokenAddress);
          const tokenAssetId = await tokenContract.assetId();
          console.log(`   Token assetId: ${tokenAssetId.toString()}`);
          
          results.push({
            test: 'Check for existing ERC404 token',
            passed: true,
            details: `Found existing token: ${existingTokenAddress}`
          });
        } else {
          results.push({
            test: 'Check for existing ERC404 token',
            passed: false,
            details: `Token found but invalid: ${existingTokenAddress}`
          });
        }
      } else {
        console.log(`   ℹ️  No existing ERC404 token found (will be created on first purchase)`);
        results.push({
          test: 'Check for existing ERC404 token',
          passed: true,
          details: 'No existing token (expected for new assets)'
        });
      }
    } catch (error: any) {
      console.log(`   ⚠️  Error checking for token: ${error.message}`);
      results.push({
        test: 'Check for existing ERC404 token',
        passed: false,
        details: `Error: ${error.message}`
      });
    }

    // Test 2: Purchase tokens and verify token finding
    console.log(`\n📝 Test 2: Purchase tokens and verify ERC404 token finding`);
    
    const purchaseAmount = 10n;
    const [totalCost, marketplaceFee] = await marketplace.calculatePurchaseCost(assetId, purchaseAmount);
    
    console.log(`   Purchase Amount: ${purchaseAmount} tokens`);
    console.log(`   Total Cost: ${ethers.formatEther(totalCost)} ETH`);
    console.log(`   Marketplace Fee: ${ethers.formatEther(marketplaceFee)} ETH`);
    
    // Check buyer balance
    const buyerBalance = await ethers.provider.getBalance(buyer1.address);
    if (buyerBalance < totalCost) {
      throw new Error(`Insufficient balance. Required: ${ethers.formatEther(totalCost)} ETH, Have: ${ethers.formatEther(buyerBalance)} ETH`);
    }

    console.log(`   Executing purchase...`);
    const purchaseTx = await (marketplace.connect(buyer1) as any).purchaseTokens(
      assetId,
      purchaseAmount,
      { value: totalCost }
    );
    
    console.log(`   Transaction: ${purchaseTx.hash}`);
    console.log(`   Waiting for confirmation...`);
    const receipt = await purchaseTx.wait();
    console.log(`   ✅ Purchase confirmed in block ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}\n`);

    // Verify token address after purchase
    const tokenAddressAfterPurchase = await factory404.getTokenAddress(assetId);
    console.log(`   Token address after purchase: ${tokenAddressAfterPurchase}`);
    
    if (existingTokenAddress && existingTokenAddress !== ethers.ZeroAddress) {
      // If token existed before, verify same token is used
      if (tokenAddressAfterPurchase.toLowerCase() === existingTokenAddress.toLowerCase()) {
        console.log(`   ✅ Same token used (no duplicate created)`);
        results.push({
          test: 'Purchase uses existing ERC404 token',
          passed: true,
          details: `Same token used: ${tokenAddressAfterPurchase}`
        });
      } else {
        console.log(`   ❌ Different token address! Duplicate may have been created`);
        console.log(`   Expected: ${existingTokenAddress}`);
        console.log(`   Got: ${tokenAddressAfterPurchase}`);
        results.push({
          test: 'Purchase uses existing ERC404 token',
          passed: false,
          details: `Token mismatch! Expected: ${existingTokenAddress}, Got: ${tokenAddressAfterPurchase}`
        });
      }
    } else {
      // Token was created, verify it's valid
      const isValid = await factory404.isValidToken(tokenAddressAfterPurchase);
      if (isValid) {
        console.log(`   ✅ New ERC404 token created and validated`);
        results.push({
          test: 'Purchase creates valid ERC404 token',
          passed: true,
          details: `Token created: ${tokenAddressAfterPurchase}`
        });
      } else {
        console.log(`   ❌ Token created but invalid`);
        results.push({
          test: 'Purchase creates valid ERC404 token',
          passed: false,
          details: `Token invalid: ${tokenAddressAfterPurchase}`
        });
      }
    }

    // Test 3: Verify no duplicate tokens
    console.log(`\n📝 Test 3: Verify no duplicate tokens created`);
    
    const allTokens = await factory404.getAllTokens();
    const tokenCount = allTokens.filter(
      (addr: string) => addr.toLowerCase() === tokenAddressAfterPurchase.toLowerCase()
    ).length;
    
    console.log(`   Total tokens in factory: ${allTokens.length}`);
    console.log(`   Occurrences of this token: ${tokenCount}`);
    
    if (tokenCount === 1) {
      console.log(`   ✅ No duplicates found`);
      results.push({
        test: 'No duplicate tokens',
        passed: true,
        details: `Token appears ${tokenCount} time(s) in factory`
      });
    } else {
      console.log(`   ❌ Duplicate found! Token appears ${tokenCount} times`);
      results.push({
        test: 'No duplicate tokens',
        passed: false,
        details: `Token appears ${tokenCount} time(s) - should be 1`
      });
    }

    // Test 4: Second purchase uses same token
    console.log(`\n📝 Test 4: Second purchase uses same token`);
    
    const purchaseAmount2 = 5n;
    const [totalCost2] = await marketplace.calculatePurchaseCost(assetId, purchaseAmount2);
    
    console.log(`   Second Purchase Amount: ${purchaseAmount2} tokens`);
    console.log(`   Total Cost: ${ethers.formatEther(totalCost2)} ETH`);
    
    const purchaseTx2 = await (marketplace.connect(buyer2) as any).purchaseTokens(
      assetId,
      purchaseAmount2,
      { value: totalCost2 }
    );
    
    console.log(`   Transaction: ${purchaseTx2.hash}`);
    const receipt2 = await purchaseTx2.wait();
    console.log(`   ✅ Second purchase confirmed in block ${receipt2.blockNumber}\n`);

    // Verify same token address
    const tokenAddressAfterPurchase2 = await factory404.getTokenAddress(assetId);
    console.log(`   Token address after second purchase: ${tokenAddressAfterPurchase2}`);
    
    if (tokenAddressAfterPurchase2.toLowerCase() === tokenAddressAfterPurchase.toLowerCase()) {
      console.log(`   ✅ Same token used for second purchase`);
      results.push({
        test: 'Second purchase uses same token',
        passed: true,
        details: `Same token: ${tokenAddressAfterPurchase2}`
      });
    } else {
      console.log(`   ❌ Different token used!`);
      console.log(`   First purchase: ${tokenAddressAfterPurchase}`);
      console.log(`   Second purchase: ${tokenAddressAfterPurchase2}`);
      results.push({
        test: 'Second purchase uses same token',
        passed: false,
        details: `Token mismatch! First: ${tokenAddressAfterPurchase}, Second: ${tokenAddressAfterPurchase2}`
      });
    }

    // Test 5: Verify token balances
    console.log(`\n📝 Test 5: Verify token balances`);
    
    if (tokenAddressAfterPurchase && tokenAddressAfterPurchase !== ethers.ZeroAddress) {
      const tokenContract = await ethers.getContractAt('RWAToken404', tokenAddressAfterPurchase);
      
      const buyer1Balance = await tokenContract.balanceOf(buyer1.address);
      const buyer2Balance = await tokenContract.balanceOf(buyer2.address);
      
      console.log(`   Buyer 1 balance: ${buyer1Balance.toString()} tokens`);
      console.log(`   Buyer 2 balance: ${buyer2Balance.toString()} tokens`);
      
      if (buyer1Balance >= purchaseAmount && buyer2Balance >= purchaseAmount2) {
        console.log(`   ✅ Balances correct`);
        results.push({
          test: 'Token balances correct',
          passed: true,
          details: `Buyer1: ${buyer1Balance}, Buyer2: ${buyer2Balance}`
        });
      } else {
        console.log(`   ❌ Balance mismatch`);
        results.push({
          test: 'Token balances correct',
          passed: false,
          details: `Buyer1: ${buyer1Balance} (expected >= ${purchaseAmount}), Buyer2: ${buyer2Balance} (expected >= ${purchaseAmount2})`
        });
      }
    } else {
      results.push({
        test: 'Token balances correct',
        passed: false,
        details: 'Token address not found'
      });
    }

    // Summary
    console.log(`\n╔════════════════════════════════════════════════════════════╗`);
    console.log(`║   TEST SUMMARY                                                ║`);
    console.log(`╚════════════════════════════════════════════════════════════╝\n`);
    
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    
    results.forEach((result, index) => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} Test ${index + 1}: ${result.test}`);
      console.log(`   ${result.details}\n`);
    });
    
    console.log(`📊 Results: ${passed}/${total} tests passed\n`);
    
    if (passed === total) {
      console.log(`🎉 All tests passed! ERC404 token finding is working correctly.\n`);
    } else {
      console.log(`⚠️  Some tests failed. Please review the results above.\n`);
    }

    // View transactions
    console.log(`📝 View transactions on Etherscan:`);
    console.log(`   Purchase 1: https://sepolia.etherscan.io/tx/${purchaseTx.hash}`);
    console.log(`   Purchase 2: https://sepolia.etherscan.io/tx/${purchaseTx2.hash}\n`);

  } catch (error: any) {
    console.error(`\n❌ Test failed: ${error.message}`);
    if (error.reason) {
      console.error(`   Reason: ${error.reason}`);
    }
    console.error(`\nStack trace:`, error.stack);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  });

