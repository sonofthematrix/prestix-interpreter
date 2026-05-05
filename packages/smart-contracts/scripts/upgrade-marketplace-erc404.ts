#!/usr/bin/env tsx
/**
 * Upgrade Marketplace to Support ERC404 Token Finding
 * 
 * This script upgrades the marketplace contract to add ERC404 token finding functionality.
 * After upgrade, the marketplace will check for existing ERC404 tokens before creating new ones.
 * 
 * Usage:
 *   cd packages/smart-contracts
 *   bun hardhat run scripts/upgrade-marketplace-erc404.ts --network sepolia
 * 
 * Requirements:
 *   - SEPOLIA_URL or SEPOLIA_RPC_URL must be set in .env.local
 *   - Deployer must have UPGRADER_ROLE on the marketplace proxy
 */

import 'dotenv/config';
import hre from 'hardhat';
const { ethers, upgrades } = hre;

// Contract addresses (Sepolia)
const MARKETPLACE_PROXY = process.env.NEXT_PUBLIC_RWA_MARKETPLACE || '0x5295d340a0B06A2552C2169E5D238849550ea9Fe';
const FACTORY_404 = process.env.NEXT_PUBLIC_RWA_TOKEN_FACTORY_404 || '0x7a6f7dE826064903f2e419833b9633560217FEe2';
const PROXY_ADMIN = process.env.NEXT_PUBLIC_PROXY_ADMIN_ADDRESS || '0xB8AD57FC91066Bba784186A307D9b0271ce4d789';

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   UPGRADE MARKETPLACE FOR ERC404 SUPPORT                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deployer: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`   Balance: ${ethers.formatEther(balance)} ETH\n`);

  console.log(`📋 Configuration:`);
  console.log(`   Marketplace Proxy: ${MARKETPLACE_PROXY}`);
  console.log(`   ERC404 Factory: ${FACTORY_404}`);
  console.log(`   ProxyAdmin: ${PROXY_ADMIN}\n`);

  // Get marketplace instance
  const marketplace = await ethers.getContractAt('RWAMarketplaceUpgradeable', MARKETPLACE_PROXY);
  
  // Check if deployer has UPGRADER_ROLE (UUPS pattern)
  const UPGRADER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("UPGRADER_ROLE"));
  const hasUpgraderRole = await marketplace.hasRole(UPGRADER_ROLE, deployer.address);
  
  console.log(`🔐 Checking upgrade permissions...`);
  console.log(`   Has UPGRADER_ROLE: ${hasUpgraderRole}`);
  
  if (!hasUpgraderRole) {
    // Try ProxyAdmin upgrade (TransparentProxy pattern)
    console.log(`   Checking ProxyAdmin ownership...`);
    const ProxyAdmin = await ethers.getContractAt('ProxyAdmin', PROXY_ADMIN);
    const proxyAdminOwner = await ProxyAdmin.owner();
    console.log(`   ProxyAdmin Owner: ${proxyAdminOwner}`);
    
    if (proxyAdminOwner.toLowerCase() !== deployer.address.toLowerCase()) {
      throw new Error(`Deployer ${deployer.address} doesn't have upgrade permissions`);
    }
    console.log(`   ✅ Using ProxyAdmin for upgrade (TransparentProxy pattern)\n`);
  } else {
    console.log(`   ✅ Using UUPS pattern for upgrade\n`);
  }

  // Deploy new implementation
  console.log(`📦 Deploying new marketplace implementation...`);
  const MarketplaceFactory = await ethers.getContractFactory('RWAMarketplaceUpgradeable');
  const newImplementation = await MarketplaceFactory.deploy();
  await newImplementation.waitForDeployment();
  const newImplAddress = await newImplementation.getAddress();
  console.log(`   ✅ New implementation: ${newImplAddress}\n`);

  // Upgrade proxy
  console.log(`⬆️  Upgrading marketplace proxy...`);
  let upgradeTx;
  
  if (hasUpgraderRole) {
    // UUPS pattern - upgrade directly
    upgradeTx = await marketplace.upgradeTo(newImplAddress);
  } else {
    // TransparentProxy pattern - upgrade via ProxyAdmin
    const ProxyAdmin = await ethers.getContractAt('ProxyAdmin', PROXY_ADMIN);
    upgradeTx = await ProxyAdmin.upgrade(MARKETPLACE_PROXY, newImplAddress);
  }
  
  console.log(`   Transaction hash: ${upgradeTx.hash}`);
  console.log(`   Waiting for confirmation...`);
  const upgradeReceipt = await upgradeTx.wait();
  console.log(`   ✅ Upgraded: ${upgradeTx.hash}`);
  console.log(`   Gas Used: ${upgradeReceipt.gasUsed.toString()}\n`);

  // Set ERC404 factory address
  console.log(`🔧 Setting ERC404 factory address...`);
  const setFactoryTx = await marketplace.setTokenFactory404(FACTORY_404);
  console.log(`   Transaction hash: ${setFactoryTx.hash}`);
  console.log(`   Waiting for confirmation...`);
  await setFactoryTx.wait();
  console.log(`   ✅ ERC404 factory set: ${setFactoryTx.hash}\n`);

  // Verify configuration
  console.log(`✅ Verification:`);
  const configuredFactory404 = await marketplace.getTokenFactory404();
  const factory404Str = typeof configuredFactory404 === 'string' ? configuredFactory404 : String(configuredFactory404);
  console.log(`   Configured ERC404 Factory: ${factory404Str}`);
  console.log(`   Match: ${factory404Str.toLowerCase() === FACTORY_404.toLowerCase() ? '✅' : '❌'}\n`);

  // Verify implementation address
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(MARKETPLACE_PROXY);
  console.log(`   Implementation Address: ${implementationAddress}`);
  console.log(`   Match: ${implementationAddress.toLowerCase() === newImplAddress.toLowerCase() ? '✅' : '❌'}\n`);

  console.log('🎉 Marketplace upgrade complete!\n');
  console.log('📝 Next Steps:');
  console.log('   1. Test marketplace purchase flow with existing ERC404 tokens');
  console.log('   2. Verify no duplicate tokens are created');
  console.log('   3. Monitor purchases to ensure correct tokens are used');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Upgrade failed:', error);
    
    // Provide helpful error messages for common issues
    if (error.message?.includes('522') || error.message?.includes('timeout')) {
      console.error('\n💡 RPC Connection Issue Detected:');
      console.error('   The RPC endpoint may be down or unreachable.');
      console.error('   Try one of these solutions:');
      console.error('   1. Update SEPOLIA_URL in .env.local to use a different provider:');
      console.error('      SEPOLIA_URL=https://ethereum-sepolia-rpc.publicnode.com');
      console.error('   2. Or use Infura with your API key:');
      console.error('      SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY');
      console.error('   3. Or use Alchemy:');
      console.error('      SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY');
    }
    
    process.exit(1);
  });
