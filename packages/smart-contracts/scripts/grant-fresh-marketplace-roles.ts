import 'dotenv/config';
import { ethers } from 'ethers';

async function grantFreshMarketplaceRoles() {
  console.log('🔐 GRANT FRESH MARKETPLACE ROLES');
  console.log('=================================\n');

  // Load deployed addresses
  const fs = require('fs');
  const path = require('path');
  const deploymentPath = path.resolve(__dirname, '../packages/smart-contracts/deployed-addresses-fresh.json');

  if (!fs.existsSync(deploymentPath)) {
    console.error('❌ Deployment data not found. Please run contract deployment first.');
    process.exit(1);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  console.log('📋 Loaded deployment data:');
  console.log(`   Registry: ${deployment.registry.proxy}`);
  console.log(`   Factory: ${deployment.factory.proxy}`);
  console.log(`   Factory404: ${deployment.factory404}`);
  console.log(`   Marketplace: ${deployment.marketplace.proxy}\n`);

  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  console.log(`👤 Deployer: ${wallet.address}`);
  const balance = await provider.getBalance(wallet.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH\n`);

  // Load ABIs
  const registryABI = require('../packages/smart-contracts/artifacts/contracts/upgradeable/RWAAssetRegistryUpgradeable.sol/RWAAssetRegistryUpgradeable.json').abi;
  const factoryABI = require('../packages/smart-contracts/artifacts/contracts/upgradeable/RWATokenFactoryUpgradeable.sol/RWATokenFactoryUpgradeable.json').abi;
  const factory404ABI = require('../packages/smart-contracts/artifacts/contracts/core/RWATokenFactory404.sol/RWATokenFactory404.json').abi;

  // Create contract instances
  const registry = new ethers.Contract(deployment.registry.proxy, registryABI, wallet);
  const factory = new ethers.Contract(deployment.factory.proxy, factoryABI, wallet);
  const factory404 = new ethers.Contract(deployment.factory404, factory404ABI, wallet);

  console.log('🎭 STEP 1: GRANT MARKETPLACE_ROLE ON REGISTRY');
  console.log('==============================================\n');

  try {
    // Get MARKETPLACE_ROLE from registry
    const MARKETPLACE_ROLE = await registry.MARKETPLACE_ROLE();
    console.log(`   MARKETPLACE_ROLE: ${MARKETPLACE_ROLE}`);

    // Check if role is already granted
    const hasRole = await registry.hasRole(MARKETPLACE_ROLE, deployment.marketplace.proxy);
    if (hasRole) {
      console.log('   ✅ Marketplace already has MARKETPLACE_ROLE on registry\n');
    } else {
      // Grant the role
      console.log('   ⚙️ Granting MARKETPLACE_ROLE to marketplace...');
      const tx = await registry.grantRole(MARKETPLACE_ROLE, deployment.marketplace.proxy);
      console.log(`   Transaction: ${tx.hash}`);
      await tx.wait();
      console.log('   ✅ MARKETPLACE_ROLE granted successfully\n');
    }
  } catch (error) {
    console.error('❌ Failed to grant MARKETPLACE_ROLE on registry:', error);
    process.exit(1);
  }

  console.log('🎭 STEP 2: GRANT TOKEN_CREATOR_ROLE ON FACTORY');
  console.log('===============================================\n');

  try {
    // Get TOKEN_CREATOR_ROLE from factory
    const TOKEN_CREATOR_ROLE = await factory.TOKEN_CREATOR_ROLE();
    console.log(`   TOKEN_CREATOR_ROLE: ${TOKEN_CREATOR_ROLE}`);

    // Check if role is already granted
    const hasRole = await factory.hasRole(TOKEN_CREATOR_ROLE, deployment.marketplace.proxy);
    if (hasRole) {
      console.log('   ✅ Marketplace already has TOKEN_CREATOR_ROLE on factory\n');
    } else {
      // Grant the role
      console.log('   ⚙️ Granting TOKEN_CREATOR_ROLE to marketplace...');
      const tx = await factory.grantRole(TOKEN_CREATOR_ROLE, deployment.marketplace.proxy);
      console.log(`   Transaction: ${tx.hash}`);
      await tx.wait();
      console.log('   ✅ TOKEN_CREATOR_ROLE granted successfully\n');
    }
  } catch (error) {
    console.error('❌ Failed to grant TOKEN_CREATOR_ROLE on factory:', error);
    process.exit(1);
  }

  console.log('🎭 STEP 3: GRANT TOKEN_CREATOR_ROLE ON FACTORY404');
  console.log('=================================================\n');

  try {
    // Get TOKEN_CREATOR_ROLE from factory404
    const TOKEN_CREATOR_ROLE = await factory404.TOKEN_CREATOR_ROLE();
    console.log(`   TOKEN_CREATOR_ROLE: ${TOKEN_CREATOR_ROLE}`);

    // Check if role is already granted
    const hasRole = await factory404.hasRole(TOKEN_CREATOR_ROLE, deployment.marketplace.proxy);
    if (hasRole) {
      console.log('   ✅ Marketplace already has TOKEN_CREATOR_ROLE on factory404\n');
    } else {
      // Grant the role
      console.log('   ⚙️ Granting TOKEN_CREATOR_ROLE to marketplace...');
      const tx = await factory404.grantRole(TOKEN_CREATOR_ROLE, deployment.marketplace.proxy);
      console.log(`   Transaction: ${tx.hash}`);
      await tx.wait();
      console.log('   ✅ TOKEN_CREATOR_ROLE granted successfully\n');
    }
  } catch (error) {
    console.error('❌ Failed to grant TOKEN_CREATOR_ROLE on factory404:', error);
    process.exit(1);
  }

  console.log('🔍 STEP 4: VERIFY ALL ROLES');
  console.log('===========================\n');

  try {
    // Verify registry role
    const MARKETPLACE_ROLE = await registry.MARKETPLACE_ROLE();
    const registryRoleGranted = await registry.hasRole(MARKETPLACE_ROLE, deployment.marketplace.proxy);
    console.log(`   Registry MARKETPLACE_ROLE: ${registryRoleGranted ? '✅' : '❌'}`);

    // Verify factory role
    const factoryTokenCreatorRole = await factory.TOKEN_CREATOR_ROLE();
    const factoryRoleGranted = await factory.hasRole(factoryTokenCreatorRole, deployment.marketplace.proxy);
    console.log(`   Factory TOKEN_CREATOR_ROLE: ${factoryRoleGranted ? '✅' : '❌'}`);

    // Verify factory404 role
    const factory404TokenCreatorRole = await factory404.TOKEN_CREATOR_ROLE();
    const factory404RoleGranted = await factory404.hasRole(factory404TokenCreatorRole, deployment.marketplace.proxy);
    console.log(`   Factory404 TOKEN_CREATOR_ROLE: ${factory404RoleGranted ? '✅' : '❌'}`);

    const allRolesGranted = registryRoleGranted && factoryRoleGranted && factory404RoleGranted;

    if (allRolesGranted) {
      console.log('\n✅ ALL MARKETPLACE ROLES GRANTED SUCCESSFULLY!');
      console.log('================================================');
      console.log('\n🧪 Next Steps:');
      console.log('   1. Register assets in registry');
      console.log('   2. Deploy ERC404 tokens for assets');
      console.log('   3. Create marketplace listings');
      console.log('   4. Store deployment data in database');
      console.log('   5. Verify complete deployment\n');

      process.exit(0);
    } else {
      console.error('\n❌ SOME ROLES WERE NOT GRANTED CORRECTLY');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Failed to verify roles:', error);
    process.exit(1);
  }
}

async function main() {
  try {
    await grantFreshMarketplaceRoles();
  } catch (error) {
    console.error('❌ GRANT MARKETPLACE ROLES FAILED:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
