/**
 * Deploy TokenExchange Contract
 *
 * This script deploys the TokenExchange contract for swapping TPT tokens with property tokens
 */

import { ethers } from 'hardhat';
import { TokenExchange } from '../typechain-types';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('\n🚀 Deploying TokenExchange Contract...\n');

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log('Deploying with account:', deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Account balance:', ethers.formatEther(balance), 'ETH\n');

  // Get TPT token address from environment
  const TPT_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_TPT_ADDRESS || process.env.TPT_TOKEN_ADDRESS;

  if (!TPT_TOKEN_ADDRESS || TPT_TOKEN_ADDRESS === '0x0000000000000000000000000000000000000000') {
    throw new Error('❌ TPT_TOKEN_ADDRESS not set in environment variables');
  }

  console.log('TPT Token Address:', TPT_TOKEN_ADDRESS);

  // Deploy TokenExchange
  console.log('\n📝 Deploying TokenExchange...');
  const TokenExchangeFactory = await ethers.getContractFactory('TokenExchange');
  const tokenExchange = await TokenExchangeFactory.deploy(TPT_TOKEN_ADDRESS) as unknown as TokenExchange;

  await tokenExchange.waitForDeployment();
  const exchangeAddress = await tokenExchange.getAddress();

  console.log('✅ TokenExchange deployed to:', exchangeAddress);

  // Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    tokenExchange: exchangeAddress,
    tptToken: TPT_TOKEN_ADDRESS,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
  };

  const deploymentsDir = path.join(process.cwd(), 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentPath = path.join(
    deploymentsDir,
    `token-exchange-${deploymentInfo.network}-${Date.now()}.json`
  );

  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log('\n📄 Deployment info saved to:', deploymentPath);

  // Update .env.local file
  console.log('\n📝 Updating .env.local...');
  const envPath = path.join(process.cwd(), '.env.local');
  let envContent = fs.readFileSync(envPath, 'utf8');

  // Add or update NEXT_PUBLIC_TOKEN_EXCHANGE_ADDRESS
  if (envContent.includes('NEXT_PUBLIC_TOKEN_EXCHANGE_ADDRESS=')) {
    envContent = envContent.replace(
      /NEXT_PUBLIC_TOKEN_EXCHANGE_ADDRESS=.*/,
      `NEXT_PUBLIC_TOKEN_EXCHANGE_ADDRESS=${exchangeAddress}`
    );
  } else {
    envContent += `\n# Token Exchange Contract\nNEXT_PUBLIC_TOKEN_EXCHANGE_ADDRESS=${exchangeAddress}\n`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env.local updated with TOKEN_EXCHANGE_ADDRESS');

  console.log('\n✅ Deployment complete!');
  console.log('\n📋 Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TokenExchange:', exchangeAddress);
  console.log('TPT Token:', TPT_TOKEN_ADDRESS);
  console.log('Network:', deploymentInfo.network);
  console.log('Chain ID:', deploymentInfo.chainId);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  console.log('\n📝 Next Steps:');
  console.log('1. ✅ Run setup script to configure exchange rates and enable tokens:');
  console.log(`   npx hardhat run scripts/setup-token-exchange.ts --network sepolia`);
  console.log('\n2. ⚠️  Deposit property tokens to the contract for liquidity:');
  console.log(`   propertyToken.transfer(${exchangeAddress}, amount);`);
  console.log('\n3. ✅ Test the exchange:');
  console.log(`   tptToken.approve(${exchangeAddress}, amount);`);
  console.log(`   tokenExchange.exchangeTPTForPropertyToken(propertyTokenAddress, tptAmount);`);

  console.log('\n📚 Documentation:');
  console.log('   See smart-contracts/docs/TOKEN_EXCHANGE_SETUP.md for detailed setup guide');

  console.log('\n🔍 Verify contract on Etherscan:');
  console.log(`npx hardhat verify --network sepolia ${exchangeAddress} ${TPT_TOKEN_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  });
