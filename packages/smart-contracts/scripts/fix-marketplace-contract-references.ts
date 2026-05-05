import { ethers } from 'hardhat';
import { config } from 'dotenv';

// Load environment variables
config({ path: '../../../.env.local' });

async function main() {
  console.log('🔧 Fixing marketplace contract references...\n');

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}\n`);

  // Marketplace proxy address
  const MARKETPLACE_PROXY = '0x5295d340a0B06A2552C2169E5D238849550ea9Fe';
  console.log(`Marketplace Proxy: ${MARKETPLACE_PROXY}\n`);

  // Correct contract addresses
  const CORRECT_ADDRESSES = {
    assetRegistry: '0x7a6f7dE826064903f2e419833b9633560217FEe2', // RWAAssetRegistry
    tokenFactory: '0x7a6f7dE826064903f2e419833b9633560217FEe2',  // RWATokenFactory (same as registry)
    tokenFactory404: '0x01cD1e030EBC32be5d99E3f04571e4943dc4C31b', // RWATokenFactory404
    feeRecipient: deployer.address, // Deployer address
    marketplaceFee: 250 // 2.5% in basis points
  };

  console.log('📋 Target contract addresses:');
  Object.entries(CORRECT_ADDRESSES).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`);
  });
  console.log('');

  // Get marketplace contract instance
  const marketplace = await ethers.getContractAt('RWAMarketplaceUpgradeableSetter', MARKETPLACE_PROXY);

  console.log('🔧 Applying fixes...\n');

  try {
    // 1. Fix Asset Registry (if there's a setter function)
    console.log('1. Checking Asset Registry setter...');
    try {
      // Check if there's a setAssetRegistry function
      const currentRegistry = await marketplace.assetRegistry();
      console.log(`   Current: ${currentRegistry}`);
      console.log(`   Target:  ${CORRECT_ADDRESSES.assetRegistry}`);

      if (currentRegistry !== CORRECT_ADDRESSES.assetRegistry) {
        // Try to call setAssetRegistry if it exists
        try {
          const tx = await marketplace.setAssetRegistry(CORRECT_ADDRESSES.assetRegistry);
          await tx.wait();
          console.log('   ✅ Asset Registry updated');
        } catch (error) {
          console.log(`   ❌ No setAssetRegistry function or access denied: ${error.message}`);
        }
      } else {
        console.log('   ✅ Asset Registry already correct');
      }
    } catch (error) {
      console.log(`   ❌ Error checking Asset Registry: ${error.message}`);
    }
    console.log('');

    // 2. Fix ERC20 Token Factory (if there's a setter function)
    console.log('2. Checking ERC20 Token Factory setter...');
    try {
      const currentFactory = await marketplace.assetFactory();
      console.log(`   Current: ${currentFactory}`);
      console.log(`   Target:  ${CORRECT_ADDRESSES.tokenFactory}`);

      if (currentFactory !== CORRECT_ADDRESSES.tokenFactory) {
        try {
          const tx = await marketplace.setTokenFactory(CORRECT_ADDRESSES.tokenFactory);
          await tx.wait();
          console.log('   ✅ ERC20 Token Factory updated');
        } catch (error) {
          console.log(`   ❌ No setTokenFactory function or access denied: ${error.message}`);
        }
      } else {
        console.log('   ✅ ERC20 Token Factory already correct');
      }
    } catch (error) {
      console.log(`   ❌ Error checking ERC20 Token Factory: ${error.message}`);
    }
    console.log('');

    // 3. Fix ERC404 Token Factory (we added this setter)
    console.log('3. Checking ERC404 Token Factory...');
    try {
      const currentFactory404 = await marketplace.getTokenFactory404();
      console.log(`   Current: ${currentFactory404}`);
      console.log(`   Target:  ${CORRECT_ADDRESSES.tokenFactory404}`);

      if (currentFactory404 !== CORRECT_ADDRESSES.tokenFactory404) {
        const tx = await marketplace.setTokenFactory404(CORRECT_ADDRESSES.tokenFactory404);
        await tx.wait();
        console.log('   ✅ ERC404 Token Factory updated');
      } else {
        console.log('   ✅ ERC404 Token Factory already correct');
      }
    } catch (error) {
      console.log(`   ❌ Error updating ERC404 Token Factory: ${error.message}`);
    }
    console.log('');

    // 4. Fix Fee Recipient (if there's a setter function)
    console.log('4. Checking Fee Recipient setter...');
    try {
      const currentRecipient = await marketplace.feeRecipient();
      console.log(`   Current: ${currentRecipient}`);
      console.log(`   Target:  ${CORRECT_ADDRESSES.feeRecipient}`);

      if (currentRecipient !== CORRECT_ADDRESSES.feeRecipient) {
        try {
          const tx = await marketplace.setFeeRecipient(CORRECT_ADDRESSES.feeRecipient);
          await tx.wait();
          console.log('   ✅ Fee Recipient updated');
        } catch (error) {
          console.log(`   ❌ No setFeeRecipient function or access denied: ${error.message}`);
        }
      } else {
        console.log('   ✅ Fee Recipient already correct');
      }
    } catch (error) {
      console.log(`   ❌ Error checking Fee Recipient: ${error.message}`);
    }
    console.log('');

    // 5. Fix Marketplace Fee (if there's a setter function)
    console.log('5. Checking Marketplace Fee setter...');
    try {
      const currentFee = await marketplace.getMarketplaceFee();
      console.log(`   Current: ${currentFee} basis points (${Number(currentFee) / 100}%)`);
      console.log(`   Target:  ${CORRECT_ADDRESSES.marketplaceFee} basis points (${CORRECT_ADDRESSES.marketplaceFee / 100}%)`);

      if (currentFee !== BigInt(CORRECT_ADDRESSES.marketplaceFee)) {
        try {
          const tx = await marketplace.setMarketplaceFee(CORRECT_ADDRESSES.marketplaceFee);
          await tx.wait();
          console.log('   ✅ Marketplace Fee updated');
        } catch (error) {
          console.log(`   ❌ No setMarketplaceFee function or access denied: ${error.message}`);
        }
      } else {
        console.log('   ✅ Marketplace Fee already correct');
      }
    } catch (error) {
      console.log(`   ❌ Error checking Marketplace Fee: ${error.message}`);
    }
    console.log('');

    console.log('🎉 Contract reference fixes attempted!');
    console.log('Note: Some setters may not exist in the current contract version.');
    console.log('Run the check script again to verify current state.');

  } catch (error) {
    console.error('❌ Error fixing contract references:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });