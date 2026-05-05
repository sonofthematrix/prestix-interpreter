#!/usr/bin/env tsx
/**
 * Set Price Oracle on Marketplace
 * 
 * Sets the ChainlinkPriceOracle address on the marketplace contract.
 * 
 * Usage:
 *   cd smart-contracts
 *   bun hardhat run scripts/set-marketplace-oracle.ts --network sepolia [oracle-address]
 */

import 'dotenv/config';
import hre from 'hardhat';
const { ethers } = hre;
import fs from 'fs';
import path from 'path';

const DEPLOYED_ADDRESSES_FILE = path.join(__dirname, '../deployed-addresses-proxy.json');

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
  console.log('║   SET PRICE ORACLE ON MARKETPLACE                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const deployed = loadDeployedAddresses();
  if (!deployed || !deployed.addresses) {
    throw new Error('Deployed addresses not found');
  }

  const marketplaceAddress = deployed.addresses.RWAMarketplace;
  const oracleAddress = process.env.ORACLE_ADDRESS || process.argv[2];

  if (!oracleAddress) {
    throw new Error('Oracle address required. Usage: bun hardhat run scripts/set-marketplace-oracle.ts --network sepolia <oracle-address>');
  }

  console.log(`📋 Configuration:`);
  console.log(`   Marketplace: ${marketplaceAddress}`);
  console.log(`   Oracle: ${oracleAddress}\n`);

  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deployer: ${deployer.address}\n`);

  // Set price oracle
  console.log(`🔧 Setting price oracle...`);
  const marketplace = await ethers.getContractAt('RWAMarketplaceUpgradeable', marketplaceAddress);
  const setOracleTx = await marketplace.setPriceOracle(oracleAddress);
  await setOracleTx.wait();
  console.log(`   ✅ Oracle set: ${setOracleTx.hash}\n`);

  // Verify
  const configuredOracle = await marketplace.getPriceOracle();
  console.log(`✅ Verification:`);
  console.log(`   Configured Oracle: ${configuredOracle}`);
  console.log(`   Match: ${configuredOracle.toLowerCase() === oracleAddress.toLowerCase() ? '✅' : '❌'}\n`);

  console.log('🎉 Price oracle configuration complete!\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Configuration failed:', error);
    process.exit(1);
  });

