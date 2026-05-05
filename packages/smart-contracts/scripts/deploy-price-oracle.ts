#!/usr/bin/env tsx
/**
 * Deploy Chainlink Price Oracle
 * 
 * Deploys the ChainlinkPriceOracle contract for ETH/USDC and ETH/EURC conversion.
 * 
 * Usage:
 *   cd smart-contracts
 *   bun hardhat run scripts/deploy-price-oracle.ts --network sepolia
 */

import 'dotenv/config';
import hre from 'hardhat';
const { ethers } = hre;

// Sepolia Chainlink Price Feed Addresses
const ETH_USD_PRICE_FEED = '0x694AA1769357215DE4FAC081bf1f309aDC325306'; // Sepolia ETH/USD

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   DEPLOY CHAINLINK PRICE ORACLE                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deployer: ${deployer.address}\n`);

  console.log(`📋 Configuration:`);
  console.log(`   ETH/USD Price Feed: ${ETH_USD_PRICE_FEED}\n`);

  // Deploy price oracle
  console.log(`📦 Deploying ChainlinkPriceOracle...`);
  const OracleFactory = await ethers.getContractFactory('ChainlinkPriceOracle');
  const oracle = await OracleFactory.deploy(ETH_USD_PRICE_FEED);
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log(`   ✅ Deployed: ${oracleAddress}\n`);

  // Test price feed
  console.log(`🧪 Testing price feed...`);
  try {
    const ethUsdPrice = await oracle.getEthUsdPrice();
    console.log(`   ETH/USD Price: $${ethers.formatEther(ethUsdPrice)}\n`);
    
    // Test conversion
    const testEthAmount = ethers.parseEther('0.001'); // 0.001 ETH
    const usdcAmount = await oracle.convertEthToUsdc(testEthAmount);
    console.log(`   Test Conversion:`);
    console.log(`   0.001 ETH = ${ethers.formatUnits(usdcAmount, 6)} USDC\n`);
  } catch (error: any) {
    console.log(`   ⚠️  Price feed test failed: ${error.message}\n`);
  }

  console.log('🎉 Price oracle deployment complete!\n');
  console.log(`📝 Next Steps:`);
  console.log(`   1. Set price oracle on marketplace:`);
  console.log(`      bun hardhat run scripts/set-marketplace-oracle.ts --network sepolia ${oracleAddress}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  });

