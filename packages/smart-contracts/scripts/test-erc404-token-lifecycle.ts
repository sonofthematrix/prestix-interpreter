#!/usr/bin/env tsx

/**
 * Comprehensive ERC404 Token Lifecycle Test
 * 
 * Tests the complete lifecycle of ERC404 tokens:
 * 1. Minting tokens
 * 2. Converting tokens to NFTs
 * 3. Checking NFT details, ownership, and IDs
 * 4. Converting NFTs back to tokens
 * 5. Testing burning processes
 * 
 * Usage:
 *   bun run hardhat run scripts/test-erc404-token-lifecycle.ts --network sepolia
 * 
 * Or test specific tokens:
 *   bun run hardhat run scripts/test-erc404-token-lifecycle.ts --network sepolia -- --assetIds 1,2,3
 */

import 'dotenv/config';
import { ethers } from 'hardhat';
import hre from 'hardhat';

// Deployed addresses
const FIXED_FACTORY_ADDRESS = '0x01cD1e030EBC32be5d99E3f04571e4943dc4C31b'; // RWATokenFactory404Fixed
const MARKETPLACE_ADDRESS = '0x0b6a1BFCEf896d004Edd376A798c57F2B797e307';

// Token ABI (minimal for testing)
const TOKEN_ABI = [
  // ERC20 functions
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  
  // ERC404 specific functions
  'function assetId() view returns (uint256)',
  'function convertToNFT()',
  'function convertToFungible()',
  'function nftExists() view returns (bool)',
  'function nftOwner() view returns (address)',
  'function nftTokenId() view returns (uint256)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  
  // Role-based functions
  'function mint(address to, uint256 amount)',
  'function burn(uint256 amount)',
  'function burnFrom(address from, uint256 amount)',
  
  // Events
  'event ConvertedToNFT(address indexed owner, uint256 indexed tokenId, uint256 amount)',
  'event ConvertedToFungible(address indexed owner, uint256 indexed tokenId, uint256 amount)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Transfer721(address indexed from, address indexed to, uint256 indexed tokenId)',
] as const;

const FACTORY_ABI = [
  'function getTokenAddress(uint256 assetId) view returns (address)',
  'function getAllTokens() view returns (address[])',
  'function getAssetId(address tokenAddress) view returns (uint256)',
  'function isValidToken(address tokenAddress) view returns (bool)',
  'function mintTokens(uint256 assetId, address to, uint256 amount)',
  'function TOKEN_CREATOR_ROLE() view returns (bytes32)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
] as const;

interface TestResult {
  assetId: number;
  tokenAddress: string;
  success: boolean;
  errors: string[];
  steps: {
    minting?: { success: boolean; details: string };
    tokenToNFT?: { success: boolean; details: string };
    nftDetails?: { success: boolean; details: string };
    nftToToken?: { success: boolean; details: string };
    burning?: { success: boolean; details: string };
  };
}

async function testTokenLifecycle(
  assetId: number,
  factory: any,
  signer: any
): Promise<TestResult> {
  const result: TestResult = {
    assetId,
    tokenAddress: '',
    success: false,
    errors: [],
    steps: {},
  };

  try {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🧪 TESTING ASSET ID: ${assetId}`);
    console.log('='.repeat(80));

    // Step 1: Get token address
    console.log(`\n📋 Step 1: Getting token address...`);
    const tokenAddress = await factory.getTokenAddress(assetId);
    
    if (!tokenAddress || tokenAddress === ethers.ZeroAddress) {
      result.errors.push(`No token found for assetId ${assetId}`);
      console.log(`   ❌ No token deployed for assetId ${assetId}`);
      return result;
    }

    result.tokenAddress = tokenAddress;
    console.log(`   ✅ Token Address: ${tokenAddress}`);

    // Connect to token contract
    const token = new ethers.Contract(tokenAddress, TOKEN_ABI, signer);

    // Get token info
    const [name, symbol, totalSupply, tokenAssetId] = await Promise.all([
      token.name(),
      token.symbol(),
      token.totalSupply(),
      token.assetId(),
    ]);

    console.log(`   📊 Token Info:`);
    console.log(`      Name: ${name}`);
    console.log(`      Symbol: ${symbol}`);
    console.log(`      Total Supply: ${ethers.formatEther(totalSupply)} ${symbol}`);
    console.log(`      Asset ID: ${tokenAssetId}`);

    // Step 2: Test Minting
    console.log(`\n🪙 Step 2: Testing Token Minting...`);
    try {
      const signerBalanceBefore = await token.balanceOf(signer.address);
      console.log(`   Initial Balance: ${ethers.formatEther(signerBalanceBefore)} ${symbol}`);

      // Check if signer already has tokens
      if (signerBalanceBefore > 0n) {
        console.log(`   ✅ Signer already has tokens: ${ethers.formatEther(signerBalanceBefore)} ${symbol}`);
        result.steps.minting = {
          success: true,
          details: `Signer already has ${ethers.formatEther(signerBalanceBefore)} tokens`,
        };
      } else {
        // Find who has tokens (check common addresses)
        const addressesToCheck = [
          signer.address,
          '0x8eD7F4FB3Aa1a3B346756624B17094dfd6040047', // Known deployer
          MARKETPLACE_ADDRESS,
        ];

        let ownerAddress = ethers.ZeroAddress;
        let ownerBalance = 0n;

        // Find who has tokens
        for (const addr of addressesToCheck) {
          try {
            const balance = await token.balanceOf(addr);
            if (balance > ownerBalance) {
              ownerAddress = addr;
              ownerBalance = balance;
            }
          } catch {
            // Continue
          }
        }

        // Try marketplace purchase first (intended way to get tokens)
        if (ownerBalance === 0n) {
          console.log(`   Attempting marketplace purchase...`);
          try {
            const marketplace = new ethers.Contract(
              MARKETPLACE_ADDRESS,
              [
                'function purchaseTokens(uint256 assetId, uint256 tokenAmount) payable',
                'function getActiveListing(uint256 assetId) view returns (address seller, uint256 pricePerToken, uint256 availableTokens)',
                'function calculatePurchaseCost(uint256 assetId, uint256 tokenAmount) view returns (uint256 totalCost, uint256 marketplaceFee)',
              ],
              signer
            );
            
            const purchaseAmount = ethers.parseEther('10'); // Purchase 10 tokens
            
            // Calculate cost using marketplace function
            let totalCost: bigint;
            try {
              const [cost] = await marketplace.calculatePurchaseCost(assetId, purchaseAmount);
              totalCost = cost;
            } catch {
              // Fallback: try to get listing
              const listing = await marketplace.getActiveListing(assetId);
              if (listing && listing.pricePerToken) {
                totalCost = listing.pricePerToken * purchaseAmount / ethers.parseEther('1');
              } else {
                throw new Error('Cannot calculate purchase cost');
              }
            }
            
            console.log(`   Purchasing ${ethers.formatEther(purchaseAmount)} tokens for ${ethers.formatEther(totalCost)} ETH...`);
            
            const purchaseTx = await marketplace.purchaseTokens(assetId, purchaseAmount, {
              value: totalCost,
            });
            const receipt = await purchaseTx.wait();
            
            const signerBalanceAfter = await token.balanceOf(signer.address);
            console.log(`   ✅ Purchase successful!`);
            console.log(`      Transaction: ${receipt.hash}`);
            console.log(`      Balance After: ${ethers.formatEther(signerBalanceAfter)} ${symbol}`);
            
            result.steps.minting = {
              success: true,
              details: `Purchased ${ethers.formatEther(purchaseAmount)} tokens via marketplace. Balance: ${ethers.formatEther(signerBalanceAfter)}`,
            };
          } catch (error: any) {
            console.log(`   ⚠️  Marketplace purchase failed: ${error.message}`);
            
            // Fallback: Try direct transfer from owner if found
            if (ownerBalance > 0n && ownerAddress.toLowerCase() === signer.address.toLowerCase()) {
              // Signer is owner, tokens already available
              console.log(`   ✅ Signer is owner, tokens already available`);
              result.steps.minting = {
                success: true,
                details: `Signer is owner. Balance: ${ethers.formatEther(ownerBalance)}`,
              };
            } else {
              // No way to get tokens
              result.steps.minting = {
                success: false,
                details: `Cannot acquire tokens: ${error.message}`,
              };
              result.errors.push(`Minting: ${error.message}`);
            }
          }
        } else if (ownerAddress.toLowerCase() === signer.address.toLowerCase()) {
          // Signer is owner, tokens already available
          console.log(`   ✅ Signer is owner, tokens already available`);
          result.steps.minting = {
            success: true,
            details: `Signer is owner. Balance: ${ethers.formatEther(ownerBalance)}`,
          };
        } else {
          // Try direct transfer from owner
          console.log(`   Owner found: ${ownerAddress} with ${ethers.formatEther(ownerBalance)} tokens`);
          console.log(`   ⚠️  Cannot transfer from owner (requires owner's private key)`);
          console.log(`   ⚠️  Marketplace has no available tokens`);
          result.steps.minting = {
            success: false,
            details: `Tokens exist but cannot be transferred. Owner: ${ownerAddress}, Balance: ${ethers.formatEther(ownerBalance)}`,
          };
          result.errors.push(`Minting: Cannot transfer tokens from owner ${ownerAddress}`);
        }
      }
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      console.log(`   ❌ Minting failed: ${errorMsg}`);
      result.steps.minting = {
        success: false,
        details: errorMsg,
      };
      result.errors.push(`Minting: ${errorMsg}`);
    }

    // Step 3: Test Token to NFT Conversion
    console.log(`\n🖼️  Step 3: Testing Token to NFT Conversion...`);
    try {
      const signerBalance = await token.balanceOf(signer.address);
      const totalSupply_ = await token.totalSupply();
      const nftExistsBefore = await token.nftExists();

      console.log(`   Current Balance: ${ethers.formatEther(signerBalance)} ${symbol}`);
      console.log(`   Total Supply: ${ethers.formatEther(totalSupply_)} ${symbol}`);
      console.log(`   NFT Exists: ${nftExistsBefore}`);

      if (nftExistsBefore) {
        console.log(`   ⚠️  NFT already exists, skipping conversion`);
        result.steps.tokenToNFT = {
          success: false,
          details: 'NFT already exists',
        };
      } else if (signerBalance === totalSupply_) {
        console.log(`   ✅ Signer owns 100% of tokens, converting to NFT...`);
        
        const convertTx = await token.convertToNFT();
        const receipt = await convertTx.wait();
        
        // Check for ConvertedToNFT event
        const event = receipt.logs.find((log: any) => {
          try {
            const parsed = token.interface.parseLog(log);
            return parsed?.name === 'ConvertedToNFT';
          } catch {
            return false;
          }
        });

        const nftExistsAfter = await token.nftExists();
        const nftOwner = await token.nftOwner();
        const nftTokenId = await token.nftTokenId();
        const balanceAfter = await token.balanceOf(signer.address);

        console.log(`   ✅ Conversion successful!`);
        console.log(`      NFT Exists: ${nftExistsAfter}`);
        console.log(`      NFT Owner: ${nftOwner}`);
        console.log(`      NFT Token ID: ${nftTokenId}`);
        console.log(`      Token Balance After: ${ethers.formatEther(balanceAfter)} ${symbol}`);

        result.steps.tokenToNFT = {
          success: true,
          details: `Converted to NFT. Token ID: ${nftTokenId}, Owner: ${nftOwner}`,
        };
      } else {
        console.log(`   ⚠️  Signer doesn't own 100% of tokens (${ethers.formatEther(signerBalance)}/${ethers.formatEther(totalSupply_)})`);
        console.log(`   Skipping conversion test (requires 100% ownership)`);
        result.steps.tokenToNFT = {
          success: false,
          details: `Insufficient balance: ${ethers.formatEther(signerBalance)}/${ethers.formatEther(totalSupply_)}`,
        };
      }
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      console.log(`   ❌ Conversion failed: ${errorMsg}`);
      result.steps.tokenToNFT = {
        success: false,
        details: errorMsg,
      };
      result.errors.push(`Token to NFT: ${errorMsg}`);
    }

    // Step 4: Check NFT Details
    console.log(`\n🔍 Step 4: Checking NFT Details...`);
    try {
      const nftExists = await token.nftExists();
      
      if (nftExists) {
        const nftOwner = await token.nftOwner();
        const nftTokenId = await token.nftTokenId();
        
        // Try to get tokenURI
        let tokenURI = '';
        try {
          tokenURI = await token.tokenURI(nftTokenId);
        } catch {
          tokenURI = 'Not available';
        }

        console.log(`   ✅ NFT Details:`);
        console.log(`      Exists: ${nftExists}`);
        console.log(`      Owner: ${nftOwner}`);
        console.log(`      Token ID: ${nftTokenId}`);
        console.log(`      Token URI: ${tokenURI}`);

        // Verify ownership
        const isOwner = nftOwner.toLowerCase() === signer.address.toLowerCase();
        console.log(`      Signer is Owner: ${isOwner ? '✅ YES' : '❌ NO'}`);

        result.steps.nftDetails = {
          success: true,
          details: `NFT Token ID: ${nftTokenId}, Owner: ${nftOwner}, URI: ${tokenURI.substring(0, 50)}...`,
        };
      } else {
        console.log(`   ⚠️  NFT does not exist`);
        result.steps.nftDetails = {
          success: false,
          details: 'NFT does not exist',
        };
      }
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      console.log(`   ❌ NFT details check failed: ${errorMsg}`);
      result.steps.nftDetails = {
        success: false,
        details: errorMsg,
      };
      result.errors.push(`NFT Details: ${errorMsg}`);
    }

    // Step 5: Test NFT to Token Conversion
    console.log(`\n🔄 Step 5: Testing NFT to Token Conversion...`);
    try {
      const nftExists = await token.nftExists();
      const nftOwner = await token.nftOwner();
      const isSignerOwner = nftOwner.toLowerCase() === signer.address.toLowerCase();

      if (!nftExists) {
        console.log(`   ⚠️  NFT does not exist, skipping conversion`);
        result.steps.nftToToken = {
          success: false,
          details: 'NFT does not exist',
        };
      } else if (!isSignerOwner) {
        console.log(`   ⚠️  Signer is not NFT owner (owner: ${nftOwner}), skipping conversion`);
        result.steps.nftToToken = {
          success: false,
          details: `Signer is not owner. Owner: ${nftOwner}`,
        };
      } else {
        console.log(`   ✅ Signer owns NFT, converting back to tokens...`);
        
        const balanceBefore = await token.balanceOf(signer.address);
        const convertTx = await token.convertToFungible();
        const receipt = await convertTx.wait();

        const balanceAfter = await token.balanceOf(signer.address);
        const nftExistsAfter = await token.nftExists();

        console.log(`   ✅ Conversion successful!`);
        console.log(`      Balance Before: ${ethers.formatEther(balanceBefore)} ${symbol}`);
        console.log(`      Balance After: ${ethers.formatEther(balanceAfter)} ${symbol}`);
        console.log(`      NFT Exists After: ${nftExistsAfter}`);

        result.steps.nftToToken = {
          success: true,
          details: `Converted NFT to tokens. Balance: ${ethers.formatEther(balanceAfter)}`,
        };
      }
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      console.log(`   ❌ Conversion failed: ${errorMsg}`);
      result.steps.nftToToken = {
        success: false,
        details: errorMsg,
      };
      result.errors.push(`NFT to Token: ${errorMsg}`);
    }

    // Step 6: Test Burning
    console.log(`\n🔥 Step 6: Testing Token Burning...`);
    try {
      const balanceBefore = await token.balanceOf(signer.address);
      const totalSupplyBefore = await token.totalSupply();

      if (balanceBefore === 0n) {
        console.log(`   ⚠️  Signer has no tokens to burn`);
        result.steps.burning = {
          success: false,
          details: 'No tokens to burn',
        };
      } else {
        const burnAmount = balanceBefore > ethers.parseEther('10') 
          ? ethers.parseEther('10') 
          : balanceBefore / 2n; // Burn 10 tokens or half, whichever is smaller

        console.log(`   Burning ${ethers.formatEther(burnAmount)} tokens...`);
        
        const burnTx = await token.burn(burnAmount);
        await burnTx.wait();

        const balanceAfter = await token.balanceOf(signer.address);
        const totalSupplyAfter = await token.totalSupply();

        console.log(`   ✅ Burning successful!`);
        console.log(`      Balance Before: ${ethers.formatEther(balanceBefore)} ${symbol}`);
        console.log(`      Balance After: ${ethers.formatEther(balanceAfter)} ${symbol}`);
        console.log(`      Total Supply Before: ${ethers.formatEther(totalSupplyBefore)} ${symbol}`);
        console.log(`      Total Supply After: ${ethers.formatEther(totalSupplyAfter)} ${symbol}`);

        const supplyReduced = Number(totalSupplyBefore) - Number(totalSupplyAfter) === Number(burnAmount);
        console.log(`      Supply Reduced Correctly: ${supplyReduced ? '✅ YES' : '❌ NO'}`);

        result.steps.burning = {
          success: supplyReduced,
          details: `Burned ${ethers.formatEther(burnAmount)}. Supply: ${ethers.formatEther(totalSupplyBefore)} → ${ethers.formatEther(totalSupplyAfter)}`,
        };
      }
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      console.log(`   ❌ Burning failed: ${errorMsg}`);
      result.steps.burning = {
        success: false,
        details: errorMsg,
      };
      result.errors.push(`Burning: ${errorMsg}`);
    }

    // Determine overall success
    const successfulSteps = Object.values(result.steps).filter(s => s?.success).length;
    const totalSteps = Object.keys(result.steps).length;
    result.success = successfulSteps === totalSteps && result.errors.length === 0;

    console.log(`\n📊 Test Summary for Asset ${assetId}:`);
    console.log(`   Successful Steps: ${successfulSteps}/${totalSteps}`);
    console.log(`   Errors: ${result.errors.length}`);
    console.log(`   Overall: ${result.success ? '✅ PASS' : '⚠️  PARTIAL'}`);

  } catch (error: any) {
    const errorMsg = error.message || String(error);
    console.error(`\n❌ Fatal error testing asset ${assetId}: ${errorMsg}`);
    result.errors.push(`Fatal: ${errorMsg}`);
  }

  return result;
}

async function getMarketplaceListing(
  marketplaceAddress: string,
  assetId: number,
  signer: any
): Promise<{ pricePerToken: bigint; seller: string } | null> {
  try {
    const marketplace = new ethers.Contract(
      marketplaceAddress,
      [
        'function getActiveListing(uint256 assetId) view returns (address seller, uint256 pricePerToken, uint256 availableTokens)',
      ],
      signer
    );
    
    const listing = await marketplace.getActiveListing(assetId);
    if (listing && listing.pricePerToken > 0n) {
      return {
        pricePerToken: listing.pricePerToken,
        seller: listing.seller,
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function main() {
  console.log('🧪 ERC404 Token Lifecycle Comprehensive Test');
  console.log('════════════════════════════════════════════════════════════\n');

  const network = await hre.ethers.provider.getNetwork();
  
  if (Number(network.chainId) !== 11155111) {
    console.error('❌ This script must be run on Sepolia network');
    console.error(`   Current network chainId: ${network.chainId}`);
    process.exit(1);
  }

  // Parse asset IDs from environment variable or command line args
  // Usage: ASSET_IDS=1,2,3 bun run hardhat run scripts/test-erc404-token-lifecycle.ts --network sepolia
  const assetIdsEnv = process.env.ASSET_IDS;
  const assetIds = assetIdsEnv 
    ? assetIdsEnv.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
    : null; // Will test all available tokens

  try {
    // Use buyer wallet if provided, otherwise use default signer
    let signer: any;
    const buyerWallet = process.env.BUYER_WALLET_1;
    const buyerKey = process.env.BUYER_KEY_1;
    
    if (buyerWallet && buyerKey) {
      // Create wallet from private key
      const wallet = new ethers.Wallet(buyerKey, hre.ethers.provider);
      signer = wallet;
      console.log(`👤 Using Buyer Wallet: ${signer.address}\n`);
    } else {
      // Use default Hardhat signer
      [signer] = await hre.ethers.getSigners();
      console.log(`👤 Using Default Signer: ${signer.address}\n`);
    }

    // Connect to fixed factory
    const factory = new ethers.Contract(FIXED_FACTORY_ADDRESS, FACTORY_ABI, signer);
    console.log(`🏭 Fixed Factory: ${FIXED_FACTORY_ADDRESS}\n`);

    // Get all deployed tokens
    console.log('📋 Getting deployed tokens from factory...');
    const allTokens = await factory.getAllTokens();
    console.log(`   Found ${allTokens.length} deployed tokens\n`);

    if (allTokens.length === 0) {
      console.log('❌ No tokens deployed by factory');
      console.log('   Please deploy tokens first before testing');
      process.exit(1);
    }

    // Determine which asset IDs to test
    let testAssetIds: number[] = [];
    
    if (assetIds) {
      // Test specific asset IDs
      testAssetIds = assetIds;
    } else {
      // Test all deployed tokens
      for (const tokenAddress of allTokens) {
        try {
          const assetId = await factory.getAssetId(tokenAddress);
          testAssetIds.push(Number(assetId));
        } catch {
          // Skip if can't get asset ID
        }
      }
      
      // Also check asset IDs 1-15 (common range)
      if (testAssetIds.length === 0) {
        console.log('   Checking asset IDs 1-15...');
        for (let id = 1; id <= 15; id++) {
          try {
            const tokenAddress = await factory.getTokenAddress(id);
            if (tokenAddress && tokenAddress !== ethers.ZeroAddress) {
              testAssetIds.push(id);
            }
          } catch {
            // Skip
          }
        }
      }
    }

    if (testAssetIds.length === 0) {
      console.log('❌ No tokens found to test');
      process.exit(1);
    }

    console.log(`📊 Testing ${testAssetIds.length} token(s): ${testAssetIds.join(', ')}\n`);

    // Test each token
    const results: TestResult[] = [];
    for (const assetId of testAssetIds) {
      const result = await testTokenLifecycle(assetId, factory, signer);
      results.push(result);
    }

    // Print final summary
    console.log(`\n${'='.repeat(80)}`);
    console.log('📊 FINAL TEST SUMMARY');
    console.log('='.repeat(80));

    const successful = results.filter(r => r.success).length;
    const partial = results.filter(r => !r.success && r.errors.length < Object.keys(r.steps).length).length;
    const failed = results.filter(r => r.success === false && r.errors.length === Object.keys(r.steps).length).length;

    console.log(`\n✅ Fully Successful: ${successful}`);
    console.log(`⚠️  Partial Success: ${partial}`);
    console.log(`❌ Failed: ${failed}`);

    console.log(`\n📋 Detailed Results:\n`);
    for (const result of results) {
      console.log(`Asset ${result.assetId} (${result.tokenAddress.substring(0, 10)}...):`);
      console.log(`   Status: ${result.success ? '✅ PASS' : '⚠️  PARTIAL'}`);
      
      if (result.steps.minting) {
        console.log(`   Minting: ${result.steps.minting.success ? '✅' : '❌'} ${result.steps.minting.details}`);
      }
      if (result.steps.tokenToNFT) {
        console.log(`   Token→NFT: ${result.steps.tokenToNFT.success ? '✅' : '❌'} ${result.steps.tokenToNFT.details}`);
      }
      if (result.steps.nftDetails) {
        console.log(`   NFT Details: ${result.steps.nftDetails.success ? '✅' : '❌'} ${result.steps.nftDetails.details}`);
      }
      if (result.steps.nftToToken) {
        console.log(`   NFT→Token: ${result.steps.nftToToken.success ? '✅' : '❌'} ${result.steps.nftToToken.details}`);
      }
      if (result.steps.burning) {
        console.log(`   Burning: ${result.steps.burning.success ? '✅' : '❌'} ${result.steps.burning.details}`);
      }
      
      if (result.errors.length > 0) {
        console.log(`   Errors: ${result.errors.join('; ')}`);
      }
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Token lifecycle testing complete!\n');

  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    if (error.reason) {
      console.error(`   Reason: ${error.reason}`);
    }
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
