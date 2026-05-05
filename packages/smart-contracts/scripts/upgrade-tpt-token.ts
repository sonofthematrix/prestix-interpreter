/**
 * Upgrade Tiger Palace Token (TPT) Implementation
 *
 * This script upgrades the TigerPalaceToken implementation while preserving:
 * - Proxy address (stays the same)
 * - Token balances and state
 * - Admin roles and permissions
 *
 * Requirements:
 * - NEXT_PUBLIC_TPT_ADDRESS must be set in .env.local
 * - Deployer must have UPGRADER_ROLE on the proxy
 *
 * Usage:
 *   npx hardhat run scripts/upgrade-tpt-token.ts --network sepolia
 */

import { ethers, upgrades } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function main() {
  console.log('\n🔄 Upgrading Tiger Palace Token (TPT)...\n');

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log('Upgrading with account:', deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Account balance:', ethers.formatEther(balance), 'ETH');

  // Get TPT proxy address from environment
  const tptProxyAddress = process.env.NEXT_PUBLIC_TPT_ADDRESS;
  if (!tptProxyAddress || tptProxyAddress === '0x0000000000000000000000000000000000000000') {
    throw new Error('❌ NEXT_PUBLIC_TPT_ADDRESS not set in .env.local');
  }

  console.log('TPT Proxy Address:', tptProxyAddress);
  console.log('');

  // Get current implementation address
  const currentImplementation = await upgrades.erc1967.getImplementationAddress(tptProxyAddress);
  console.log('Current Implementation:', currentImplementation);

  // Get current state before upgrade
  const tptToken = await ethers.getContractAt('TigerPalaceToken', tptProxyAddress);
  const totalSupplyBefore = await tptToken.totalSupply();
  const nameBefore = await tptToken.name();
  const symbolBefore = await tptToken.symbol();

  console.log('');
  console.log('📊 Current State:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Name:', nameBefore);
  console.log('Symbol:', symbolBefore);
  console.log('Total Supply:', ethers.formatUnits(totalSupplyBefore, 18), 'TPT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Verify deployer has UPGRADER_ROLE
  const UPGRADER_ROLE = await tptToken.UPGRADER_ROLE();
  const hasUpgraderRole = await tptToken.hasRole(UPGRADER_ROLE, deployer.address);

  if (!hasUpgraderRole) {
    throw new Error(`❌ Deployer ${deployer.address} does not have UPGRADER_ROLE`);
  }

  console.log('');
  console.log('✅ Deployer has UPGRADER_ROLE');

  console.log('');
  console.log('📝 Deploying new implementation...');

  // Deploy upgraded implementation
  const TigerPalaceTokenV2 = await ethers.getContractFactory('TigerPalaceToken');

  const upgradedToken = await upgrades.upgradeProxy(tptProxyAddress, TigerPalaceTokenV2, {
    kind: 'uups',
  });

  await upgradedToken.waitForDeployment();

  const newImplementation = await upgrades.erc1967.getImplementationAddress(tptProxyAddress);

  console.log('\n✅ TigerPalaceToken upgraded successfully!');
  console.log('');
  console.log('📋 Upgrade Details:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Proxy Address:', tptProxyAddress, '(unchanged)');
  console.log('Old Implementation:', currentImplementation);
  console.log('New Implementation:', newImplementation);
  console.log('Network:', 'sepolia');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Verify state preservation
  const totalSupplyAfter = await upgradedToken.totalSupply();
  const nameAfter = await upgradedToken.name();
  const symbolAfter = await upgradedToken.symbol();

  console.log('');
  console.log('✅ State Verification:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Name preserved:', nameBefore === nameAfter ? '✅' : '❌');
  console.log('Symbol preserved:', symbolBefore === symbolAfter ? '✅' : '❌');
  console.log(
    'Supply preserved:',
    totalSupplyBefore.toString() === totalSupplyAfter.toString() ? '✅' : '❌'
  );
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Save upgrade info
  const upgradeInfo = {
    network: 'sepolia',
    chainId: '11155111',
    proxyAddress: tptProxyAddress,
    oldImplementation: currentImplementation,
    newImplementation: newImplementation,
    upgrader: deployer.address,
    timestamp: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
    stateVerification: {
      namePreserved: nameBefore === nameAfter,
      symbolPreserved: symbolBefore === symbolAfter,
      supplyPreserved: totalSupplyBefore.toString() === totalSupplyAfter.toString(),
    },
  };

  // Create upgrades directory if it doesn't exist
  const upgradesDir = path.join(process.cwd(), 'deployments', 'upgrades');
  if (!fs.existsSync(upgradesDir)) {
    fs.mkdirSync(upgradesDir, { recursive: true });
  }

  // Save upgrade info to JSON file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const upgradeFile = path.join(upgradesDir, `tpt-token-upgrade-${timestamp}.json`);
  fs.writeFileSync(upgradeFile, JSON.stringify(upgradeInfo, null, 2));

  console.log('');
  console.log('📄 Upgrade info saved to:', upgradeFile);

  console.log('');
  console.log('✅ Upgrade complete!');
  console.log('');
  console.log('📋 Next Steps:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. Verify new implementation on Etherscan:');
  console.log(`   npx hardhat verify --network sepolia ${newImplementation}`);
  console.log('');
  console.log('2. Test the upgraded contract:');
  console.log('   - Check balances are preserved');
  console.log('   - Test new functionality');
  console.log('   - Verify all roles still work');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  console.log('🔗 Useful Links:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Proxy: https://sepolia.etherscan.io/address/${tptProxyAddress}`);
  console.log(`Old Implementation: https://sepolia.etherscan.io/address/${currentImplementation}`);
  console.log(`New Implementation: https://sepolia.etherscan.io/address/${newImplementation}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
}

// Execute upgrade
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Upgrade failed:\n');
    console.error(error);
    process.exit(1);
  });
