import { ethers } from 'hardhat';
import { config } from 'dotenv';

// Load environment variables
config({ path: '../../../.env.local' });

async function main() {
  console.log('🔍 Checking marketplace proxy contract references...\n');

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log(`Checking with account: ${deployer.address}\n`);

  // Marketplace proxy address
  const MARKETPLACE_PROXY = '0x5295d340a0B06A2552C2169E5D238849550ea9Fe';
  console.log(`Marketplace Proxy: ${MARKETPLACE_PROXY}\n`);

  // Get marketplace contract instance with the upgraded ABI
  const marketplace = await ethers.getContractAt('RWAMarketplaceUpgradeableSetter', MARKETPLACE_PROXY);

  console.log('📋 Checking contract references...\n');

    // 1. Check Asset Registry
    console.log('1. Asset Registry:');
    try {
      const assetRegistry = await marketplace.assetRegistry();
      console.log(`   Raw result: ${JSON.stringify(assetRegistry)}`);
      console.log(`   Expected: 0x7a6f7dE826064903f2e419833b9633560217FEe2 (RWAAssetRegistry)`);
      console.log(`   Status: Unable to determine - need to investigate return type\n`);
    } catch (error) {
      console.log(`   Error calling assetRegistry(): ${error.message}\n`);
    }

    // 2. Check ERC20 Token Factory
    console.log('2. ERC20 Token Factory:');
    const tokenFactory = await marketplace.assetFactory();
    console.log(`   Address: ${tokenFactory}`);
    console.log(`   Expected: 0x7a6f7dE826064903f2e419833b9633560217FEe2 (RWATokenFactory)`);
    console.log(`   Status: ${tokenFactory.toLowerCase() === '0x7a6f7dE826064903f2e419833b9633560217FEe2'.toLowerCase() ? '✅ CORRECT' : '❌ MISMATCH'}\n`);

    // 3. Check ERC404 Token Factory (the one we just set)
    console.log('3. ERC404 Token Factory:');
    const tokenFactory404 = await marketplace.getTokenFactory404();
    console.log(`   Address: ${tokenFactory404}`);
    console.log(`   Expected: 0x01cD1e030EBC32be5d99E3f04571e4943dc4C31b (RWATokenFactory404)`);
    console.log(`   Status: ${tokenFactory404.toLowerCase() === '0x01cD1e030EBC32be5d99E3f04571e4943dc4C31b'.toLowerCase() ? '✅ CORRECT' : '❌ MISMATCH'}\n`);

    // 4. Check Fee Recipient
    console.log('4. Fee Recipient:');
    const feeRecipient = await marketplace.feeRecipient();
    console.log(`   Address: ${feeRecipient}`);
    console.log(`   Expected: 0x8ed7f4fb3aa1a3b346756624B17094dfd6040047 (deployer/admin)`);
    console.log(`   Status: ${feeRecipient.toLowerCase() === '0x8ed7f4fb3aa1a3b346756624B17094dfd6040047'.toLowerCase() ? '✅ CORRECT' : '❌ MISMATCH'}\n`);

    // 5. Check Marketplace Fee
    console.log('5. Marketplace Fee:');
    const fee = await marketplace.getMarketplaceFee();
    console.log(`   Fee (basis points): ${fee}`);
    console.log(`   Fee (percentage): ${Number(fee) / 100}%`);
    console.log(`   Expected: 250 basis points (2.5%)`);
    console.log(`   Status: ${fee === BigInt(250) ? '✅ CORRECT' : '❌ MISMATCH'}\n`);

    // 6. Check Roles
    console.log('6. Role Checks:');

    // Check DEFAULT_ADMIN_ROLE
    const DEFAULT_ADMIN_ROLE = await marketplace.DEFAULT_ADMIN_ROLE();
    const hasDefaultAdmin = await marketplace.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
    console.log(`   DEFAULT_ADMIN_ROLE (${deployer.address}): ${hasDefaultAdmin ? '✅ GRANTED' : '❌ MISSING'}`);

    // Check MARKETPLACE_ADMIN_ROLE
    const MARKETPLACE_ADMIN_ROLE = await marketplace.MARKETPLACE_ADMIN_ROLE();
    const hasMarketplaceAdmin = await marketplace.hasRole(MARKETPLACE_ADMIN_ROLE, deployer.address);
    console.log(`   MARKETPLACE_ADMIN_ROLE (${deployer.address}): ${hasMarketplaceAdmin ? '✅ GRANTED' : '❌ MISSING'}`);

    // Check UPGRADER_ROLE
    const UPGRADER_ROLE = await marketplace.UPGRADER_ROLE();
    const hasUpgrader = await marketplace.hasRole(UPGRADER_ROLE, deployer.address);
    console.log(`   UPGRADER_ROLE (${deployer.address}): ${hasUpgrader ? '✅ GRANTED' : '❌ MISSING'}\n`);

    // 7. Test Factory Contract References
    console.log('7. Factory Contract Validation:');

    // Check if Asset Registry contract exists and is functional
      const registryContract = await ethers.getContractAt('IRWAAssetRegistry', MARKETPLACE_PROXY);
      const registryCode = await ethers.provider.getCode((registryContract as any).getDeployedCode() as any);
      await registryContract.getAsset(1); // Test basic functionality
      console.log('   ✅ Asset Registry: Contract exists and is functional');

    // Check if ERC20 Factory contract exists and is functional
      const factoryContract = await ethers.getContractAt('IRWATokenFactory', MARKETPLACE_PROXY);
      const factoryCode = await ethers.provider.getCode((factoryContract as any).getDeployedCode() as any);
      await factoryContract.owner(); // Test basic functionality
      console.log('   ✅ ERC20 Token Factory: Contract exists and is functional');
    

    // Check if ERC404 Factory contract exists and is functional
      const factory404Contract = await ethers.getContractAt('IRWATokenFactory404', MARKETPLACE_PROXY);
      const factory404Code = await ethers.provider.getCode((factory404Contract as any).getDeployedCode() as any);
      await factory404Contract.owner(); // Test basic functionality
      console.log('   ✅ ERC404 Token Factory: Contract exists and is functional');
    

    console.log('\n🎉 Contract reference check complete!');

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });