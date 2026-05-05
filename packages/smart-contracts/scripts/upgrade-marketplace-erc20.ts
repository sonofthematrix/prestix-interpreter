#!/usr/bin/env tsx
/**
 * Upgrade Marketplace to Support ERC20 Payments
 * 
 * This script upgrades the marketplace contract to add USDC/EURC payment support.
 * 
 * Usage:
 *   cd smart-contracts
 *   bun hardhat run scripts/upgrade-marketplace-erc20.ts --network sepolia [USDC|EURC]
 */

import 'dotenv/config';
import hre from 'hardhat';
const { ethers } = hre;
import fs from 'fs';
import path from 'path';

const DEPLOYED_ADDRESSES_FILE = path.join(__dirname, '../deployed-addresses-proxy.json');

// Sepolia payment token addresses
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
const EURC_ADDRESS = process.env.NEXT_PUBLIC_EURC_ADDRESS || '0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4';

function loadDeployedAddresses(): any {
  try {
    if (fs.existsSync(DEPLOYED_ADDRESSES_FILE)) {
      const data = fs.readFileSync(DEPLOYED_ADDRESSES_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading deployed addresses:', error);
  }
  return null;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   UPGRADE MARKETPLACE FOR ERC20 PAYMENTS                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const deployed = loadDeployedAddresses();
  if (!deployed || !deployed.addresses) {
    throw new Error('Deployed addresses not found');
  }

  const marketplaceAddress = deployed.addresses.RWAMarketplace;
  const proxyAdminAddress = deployed.addresses.ProxyAdmin;

  if (!marketplaceAddress || !proxyAdminAddress) {
    throw new Error('Required contract addresses not found');
  }

  // Get payment token type from environment variable or default to USDC
  const paymentTokenType = (process.env.PAYMENT_TOKEN || 'USDC').toUpperCase();
  const paymentTokenAddress = paymentTokenType === 'USDC' ? USDC_ADDRESS : EURC_ADDRESS;

  console.log(`📋 Configuration:`);
  console.log(`   Marketplace: ${marketplaceAddress}`);
  console.log(`   Payment Token: ${paymentTokenType} (${paymentTokenAddress})`);
  console.log(`   ProxyAdmin: ${proxyAdminAddress}\n`);

  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deployer: ${deployer.address}\n`);

  // Deploy new implementation
  console.log(`📦 Deploying new marketplace implementation...`);
  const MarketplaceFactory = await ethers.getContractFactory('RWAMarketplaceUpgradeable');
  const newImplementation = await MarketplaceFactory.deploy();
  await newImplementation.waitForDeployment();
  const newImplAddress = await newImplementation.getAddress();
  console.log(`   ✅ New implementation: ${newImplAddress}\n`);

  // Upgrade proxy (marketplace uses UUPS, upgrade directly)
  console.log(`⬆️  Upgrading marketplace proxy (UUPS pattern)...`);
  const marketplace = await ethers.getContractAt('RWAMarketplaceUpgradeable', marketplaceAddress);
  
  // Check if deployer has UPGRADER_ROLE
  const UPGRADER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("UPGRADER_ROLE"));
  const hasUpgraderRole = await marketplace.hasRole(UPGRADER_ROLE, deployer.address);
  
  if (!hasUpgraderRole) {
    throw new Error(`Deployer ${deployer.address} does not have UPGRADER_ROLE`);
  }
  
  const upgradeTx = await marketplace.upgradeTo(newImplAddress);
  await upgradeTx.wait();
  console.log(`   ✅ Upgraded: ${upgradeTx.hash}\n`);

  // Configure payment token (marketplace instance already created above)
  console.log(`🔧 Configuring payment token...`);
  const setTokenTx = await marketplace.setPaymentToken(paymentTokenAddress);
  await setTokenTx.wait();
  console.log(`   ✅ Payment token set: ${setTokenTx.hash}\n`);

  // Verify
  const configuredToken = await marketplace.paymentToken();
  console.log(`✅ Verification:`);
  console.log(`   Configured Payment Token: ${configuredToken}`);
  console.log(`   Match: ${configuredToken.toLowerCase() === paymentTokenAddress.toLowerCase() ? '✅' : '❌'}\n`);

  console.log('🎉 Marketplace upgrade complete!\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Upgrade failed:', error);
    process.exit(1);
  });

