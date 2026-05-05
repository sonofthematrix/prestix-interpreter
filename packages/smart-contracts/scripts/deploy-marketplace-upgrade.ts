import { ethers } from 'hardhat';

async function main() {
  console.log('🚀 DEPLOYING MARKETPLACE UPGRADE IMPLEMENTATION');
  console.log('═════════════════════════════════════════════════════\n');

  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deployer: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH\n`);

  if (balance === 0n) {
    throw new Error('Deployer has no ETH balance');
  }

  console.log('📦 Deploying new marketplace implementation...\n');

  // Deploy the new implementation
  const MarketplaceFactory = await ethers.getContractFactory("RWAMarketplaceUpgradeable");
  const implementation = await MarketplaceFactory.deploy();

  console.log(`⏳ Deploying... Transaction: ${implementation.deploymentTransaction()?.hash}`);

  await implementation.waitForDeployment();
  const implementationAddress = await implementation.getAddress();

  console.log(`✅ New implementation deployed: ${implementationAddress}`);
  console.log(`📊 Code size: ${(await ethers.provider.getCode(implementationAddress)).length} bytes\n`);

  // Verify the deployment
  console.log('🔍 Verifying deployment...');
  const code = await ethers.provider.getCode(implementationAddress);
  if (code === '0x') {
    throw new Error(`Contract not deployed at ${implementationAddress}`);
  }

  // Test basic function calls
  try {
    const marketplaceFee = await implementation.getMarketplaceFee();
    console.log(`✅ getMarketplaceFee() works: ${marketplaceFee.toString()} basis points`);
  } catch (error: any) {
    console.log(`⚠️  getMarketplaceFee() failed (expected for uninitialized): ${error.message}`);
  }

  console.log('\n🎉 DEPLOYMENT COMPLETE');
  console.log('═════════════════════════════════════════════════════');
  console.log(`📋 New Implementation: ${implementationAddress}`);
  console.log(`🔗 Etherscan: https://sepolia.etherscan.io/address/${implementationAddress}`);
  console.log('\n📝 Next Steps:');
  console.log(`   1. Upgrade proxy: bun run scripts/upgrade-marketplace-proxy.ts ${implementationAddress}`);
  console.log('   2. Verify upgrade: bun run scripts/verify-marketplace-upgrade.ts');
  console.log('   3. Test purchase: bun run scripts/test-property-purchase.ts --asset-id 7 --buyer-wallet $BUYER_WALLET_1');

  // Save implementation address to a file for the next script
  const fs = require('fs');
  const path = require('path');
  const outputFile = path.join(__dirname, '../marketplace-implementation-address.json');
  fs.writeFileSync(outputFile, JSON.stringify({
    implementationAddress,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    network: (await ethers.provider.getNetwork()).name
  }, null, 2));

  console.log(`\n💾 Implementation address saved to: ${outputFile}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });