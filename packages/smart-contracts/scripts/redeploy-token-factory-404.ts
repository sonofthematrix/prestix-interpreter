#!/usr/bin/env tsx

/**
 * Redeploy RWATokenFactory404 with Fixed mintTokens Function
 *
 * This script redeploys the RWATokenFactory404 contract with the corrected
 * mintTokens function that mints tokens instead of transferring existing ones.
 */

import { ethers } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('🔄 Redeploying RWATokenFactory404 with fixed mintTokens function...\n');

  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);
  console.log('Balance:', ethers.formatEther(await deployer.provider.getBalance(deployer.address)), 'ETH\n');

  // Deploy new RWATokenFactory404
  console.log('📝 Deploying RWATokenFactory404...');
  const RWATokenFactory404 = await ethers.getContractFactory('RWATokenFactory404');
  const factory = await RWATokenFactory404.deploy();

  console.log('⏳ Waiting for deployment...');
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log('✅ RWATokenFactory404 deployed at:', factoryAddress);

  // Save deployment info to file
  const deploymentInfo = {
    contractName: 'RWATokenFactory404',
    address: factoryAddress,
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
    network: await ethers.provider.getNetwork(),
  };

  // Save to deployed-addresses-fresh.json
  const addressesPath = path.join(__dirname, '../deployed-addresses-fresh.json');
  let addresses = {};
  if (fs.existsSync(addressesPath)) {
    addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
  }
  addresses.RWATokenFactory404 = deploymentInfo;
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));

  // Grant roles
  console.log('🔐 Granting TOKEN_CREATOR_ROLE to deployer...');
  const TOKEN_CREATOR_ROLE = await factory.TOKEN_CREATOR_ROLE();
  await factory.grantRole(TOKEN_CREATOR_ROLE, deployer.address);

  console.log('✅ TOKEN_CREATOR_ROLE granted to deployer');

  console.log('\n🎉 RWATokenFactory404 redeployment completed!');
  console.log('New factory address:', factoryAddress);

  // Verify deployment
  console.log('\n🔍 Verifying deployment...');
  const code = await ethers.provider.getCode(factoryAddress);
  if (code === '0x') {
    throw new Error('Contract deployment failed - no code at address');
  }

  console.log('✅ Contract code verified at address');

  // Test basic functionality
  const hasRole = await factory.hasRole(TOKEN_CREATOR_ROLE, deployer.address);
  if (!hasRole) {
    throw new Error('Role assignment failed');
  }

  console.log('✅ Role verification passed');
  console.log('\n🚀 RWATokenFactory404 redeployment successful!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });