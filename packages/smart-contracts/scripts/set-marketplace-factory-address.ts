import { ethers } from 'hardhat';
import { config } from 'dotenv';

// Load environment variables
config({ path: '../../../.env.local' });

async function main() {
  console.log('🔧 Setting correct TokenFactory404 address on marketplace...\n');

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);

  // Marketplace proxy address
  const MARKETPLACE_PROXY = '0x5295d340a0B06A2552C2169E5D238849550ea9Fe';
  console.log(`Marketplace proxy: ${MARKETPLACE_PROXY}`);

  // Correct factory address
  const CORRECT_FACTORY_ADDRESS = '0x01cD1e030EBC32be5d99E3f04571e4943dc4C31b';
  console.log(`Setting factory to: ${CORRECT_FACTORY_ADDRESS}`);

  // Get marketplace contract instance
  const marketplace = await ethers.getContractAt('RWAMarketplaceUpgradeableSetter', MARKETPLACE_PROXY);

  // Check current factory address
  const currentFactory = await marketplace.getTokenFactory404();
  console.log(`Current factory address: ${currentFactory}`);

  if (currentFactory.toLowerCase() === CORRECT_FACTORY_ADDRESS.toLowerCase()) {
    console.log('✅ Factory address is already correct!');
    return;
  }

  // Set the correct factory address
  console.log('📝 Setting new factory address...');
  const tx = await marketplace.setTokenFactory404(CORRECT_FACTORY_ADDRESS);
  await tx.wait();

  console.log(`✅ Factory address updated successfully!`);
  console.log(`   Transaction: ${tx.hash}`);

  // Verify the change
  const newFactory = await marketplace.getTokenFactory404();
  console.log(`   New factory address: ${newFactory}`);

  if (newFactory.toLowerCase() === CORRECT_FACTORY_ADDRESS.toLowerCase()) {
    console.log('✅ Factory address verified successfully!');
  } else {
    throw new Error(`❌ Factory address update failed. Expected: ${CORRECT_FACTORY_ADDRESS}, Got: ${newFactory}`);
  }

  console.log('\n🎉 Marketplace factory address update completed!');
  console.log(`   Marketplace: ${MARKETPLACE_PROXY}`);
  console.log(`   Factory: ${CORRECT_FACTORY_ADDRESS}`);

  // Additional verification
  console.log('\n🔍 Additional verification:');
  console.log(`   - Factory contract exists: ${await ethers.provider.getCode(CORRECT_FACTORY_ADDRESS) !== '0x' ? '✅' : '❌'}`);
  console.log(`   - Marketplace has DEFAULT_ADMIN_ROLE: ${await marketplace.hasRole(await marketplace.DEFAULT_ADMIN_ROLE(), deployer.address) ? '✅' : '❌'}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error setting factory address:', error);
    process.exit(1);
  });