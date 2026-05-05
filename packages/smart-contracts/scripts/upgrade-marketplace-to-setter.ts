#!/usr/bin/env tsx

/**
 * Upgrade Marketplace to Setter Version
 *
 * This script upgrades the marketplace proxy to use the RWAMarketplaceUpgradeableSetter
 * implementation, which includes the setTokenFactory404 setter function.
 */

import { ethers, upgrades } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('🔄 Upgrading marketplace to setter version...\n');

  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);
  console.log('Balance:', ethers.formatEther(await deployer.provider.getBalance(deployer.address)), 'ETH\n');

  // Load deployed addresses
  const addressesPath = path.join(__dirname, '../deployed-addresses-fresh.json');
  const addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));

  const marketplaceProxy = addresses.marketplace?.proxy || addresses.marketplace;
  const newFactoryAddress = addresses.RWATokenFactory404.address;

  if (!marketplaceProxy) {
    throw new Error('Marketplace proxy address not found');
  }

  console.log('Marketplace proxy:', marketplaceProxy);
  console.log('New factory address:', newFactoryAddress);
  console.log();

  // Deploy new implementation
  console.log('📝 Deploying RWAMarketplaceUpgradeableSetter implementation...');
  const MarketplaceSetter = await ethers.getContractFactory('RWAMarketplaceUpgradeableSetter');
  const newImplementation = await MarketplaceSetter.deploy();

  console.log('⏳ Waiting for deployment...');
  await newImplementation.waitForDeployment();

  const implementationAddress = await newImplementation.getAddress();
  console.log('✅ New implementation deployed at:', implementationAddress);

  // Upgrade the proxy
  console.log('🔄 Upgrading marketplace proxy...');
  const MarketplaceProxy = await ethers.getContractFactory('RWAMarketplaceUpgradeableSetter');
  const proxy = MarketplaceProxy.attach(marketplaceProxy);

  // Grant UPGRADER_ROLE to deployer if needed
  const UPGRADER_ROLE = await proxy.UPGRADER_ROLE();
  const hasUpgraderRole = await proxy.hasRole(UPGRADER_ROLE, deployer.address);

  if (!hasUpgraderRole) {
    console.log('🔐 Granting UPGRADER_ROLE to deployer...');
    await proxy.grantRole(UPGRADER_ROLE, deployer.address);
    console.log('✅ UPGRADER_ROLE granted');
  }

  // Upgrade to new implementation
  console.log('📈 Upgrading proxy to new implementation...');
  const upgradeTx = await proxy.upgradeTo(implementationAddress);
  console.log('⏳ Upgrade transaction submitted:', upgradeTx.hash);

  await upgradeTx.wait();
  console.log('✅ Proxy upgraded successfully');

  // Verify the upgrade
  const currentImpl = await upgrades.erc1967.getImplementationAddress(marketplaceProxy);
  if (currentImpl.toLowerCase() !== implementationAddress.toLowerCase()) {
    throw new Error('Implementation upgrade verification failed');
  }

  console.log('✅ Implementation upgrade verified');

  // Now use the setter function to update the factory
  console.log('🔧 Updating factory address using setter...');
  const setFactoryTx = await proxy.setTokenFactory404(newFactoryAddress);
  console.log('⏳ Factory update transaction submitted:', setFactoryTx.hash);

  await setFactoryTx.wait();
  console.log('✅ Factory address updated');

  // Verify the factory update
  const currentFactory = await proxy.assetFactory404();
  if (currentFactory.toLowerCase() !== newFactoryAddress.toLowerCase()) {
    throw new Error('Factory address update verification failed');
  }

  console.log('✅ Factory address verified');

  // Grant TOKEN_CREATOR_ROLE to marketplace on new factory
  console.log('🔐 Granting TOKEN_CREATOR_ROLE to marketplace on factory...');
  const RWATokenFactory404 = await ethers.getContractFactory('RWATokenFactory404');
  const factory = RWATokenFactory404.attach(newFactoryAddress);

  const TOKEN_CREATOR_ROLE = await factory.TOKEN_CREATOR_ROLE();
  const grantRoleTx = await factory.grantRole(TOKEN_CREATOR_ROLE, marketplaceProxy);
  console.log('⏳ Role grant transaction submitted:', grantRoleTx.hash);

  await grantRoleTx.wait();
  console.log('✅ TOKEN_CREATOR_ROLE granted');

  // Verify role assignment
  const hasRole = await factory.hasRole(TOKEN_CREATOR_ROLE, marketplaceProxy);
  if (!hasRole) {
    throw new Error('Role assignment verification failed');
  }

  console.log('✅ Role assignment verified');

  // Update deployment info
  const deploymentInfo = {
    contractName: 'RWAMarketplaceUpgradeableSetter',
    address: implementationAddress,
    proxy: marketplaceProxy,
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
    network: await ethers.provider.getNetwork(),
    upgradeType: 'setter-upgrade',
    newFactory: newFactoryAddress,
  };

  addresses.RWAMarketplaceUpgradeableSetter = deploymentInfo;
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));

  console.log('\n🎉 Marketplace upgrade completed successfully!');
  console.log('Proxy address:', marketplaceProxy);
  console.log('New implementation:', implementationAddress);
  console.log('New factory address:', newFactoryAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Upgrade failed:', error);
    process.exit(1);
  });