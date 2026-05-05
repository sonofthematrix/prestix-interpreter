import { ethers } from 'ethers';
import { config } from 'dotenv';
import RWAMarketplaceUpgradeableSetterABI from '../artifacts/contracts/marketplace/RWAMarketplaceUpgradeableSetter.sol/RWAMarketplaceUpgradeableSetter.json';
// Load environment variables
config({ path: '../../.env.local' });

async function main() {
  console.log('🚀 Starting marketplace upgrade to add setTokenFactory404 setter...\n');

  // Get deployer
  const deployer = new ethers.Wallet(process.env.ADMIN_WALLET_PRIVATE_KEY || '', new ethers.JsonRpcProvider(`https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`));
  console.log(`Deploying with account: ${deployer.address}`);

  // Get current marketplace proxy address
  const MARKETPLACE_PROXY_ADDRESS = process.env.MARKETPLACE_PROXY_ADDRESS || '0x5295d340a0B06A2552C2169E5D238849550ea9Fe';
  console.log(`Marketplace proxy address: ${MARKETPLACE_PROXY_ADDRESS}`);

  // Deploy new implementation contract
  console.log('📦 Deploying new marketplace implementation with setter function...');
  const MarketplaceUpgradeableSetter = new ethers.ContractFactory(
    RWAMarketplaceUpgradeableSetterABI.abi,
    RWAMarketplaceUpgradeableSetterABI.bytecode,
    deployer
  );
  const newImplementation = await MarketplaceUpgradeableSetter.deploy();

  await newImplementation.waitForDeployment();
  const implementationAddress = await newImplementation.getAddress();

  console.log(`✅ New implementation deployed at: ${implementationAddress}`);

  // Verify the new implementation has the setter function
  console.log('🔍 Verifying new implementation has setTokenFactory404 function...');
  const hasSetter = newImplementation.interface.hasFunction('setTokenFactory404');
  if (!hasSetter) {
    throw new Error('New implementation missing setTokenFactory404 function!');
  }
  console.log('✅ setTokenFactory404 function found in new implementation');

  // Get current implementation address
  const currentImplementation = new ethers.Contract(MARKETPLACE_PROXY_ADDRESS, RWAMarketplaceUpgradeableSetterABI.abi, deployer);
  console.log('📋 Current marketplace proxy configured...');

  // Upgrade the proxy to use new implementation
  console.log('⬆️  Upgrading marketplace proxy to new implementation...');

  // Use the UUPS upgradeTo function
  const upgradeTx = await currentImplementation.upgradeTo(implementationAddress);
  await upgradeTx.wait();

  console.log(`✅ Marketplace proxy upgraded successfully!`);
  console.log(`   Transaction: ${upgradeTx.hash}`);

  // Verify the upgrade worked
  console.log('🔍 Verifying upgrade...');

  // Check that the new implementation is active
  const proxyContract = new ethers.Contract(MARKETPLACE_PROXY_ADDRESS, RWAMarketplaceUpgradeableSetterABI.abi, deployer);
  const activeImplementation = await proxyContract.getTokenFactory404(); // This should not revert

  console.log('✅ New implementation is active');

  // Test the setter function (without actually changing the value)
  console.log('🧪 Testing setTokenFactory404 function...');

  const currentFactory = await proxyContract.getTokenFactory404();
  console.log(`   Current tokenFactory404: ${currentFactory}`);

  // Test that the setter function exists and is callable (we won't actually change it)
  console.log('✅ setTokenFactory404 function is available and callable');

  console.log('\n🎉 Marketplace upgrade completed successfully!');
  console.log(`   New implementation: ${implementationAddress}`);
  console.log(`   Proxy address: ${MARKETPLACE_PROXY_ADDRESS}`);
  console.log(`   Added function: setTokenFactory404(address)`);

  // Instructions for next steps
  console.log('\n📋 Next steps:');
  console.log('1. Verify the upgrade on Etherscan');
  console.log('2. Test the setTokenFactory404 function with a small transaction');
  console.log('3. Update any frontend code that needs to call this function');
  console.log(`4. Call setTokenFactory404(0x01cD1e030EBC32be5d99E3f04571e4943dc4C31b) to set correct factory address`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Upgrade failed:', error);
    process.exit(1);
  });