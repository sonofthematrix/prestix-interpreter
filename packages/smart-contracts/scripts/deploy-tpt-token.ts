/**
 * Deploy Upgradeable Tiger Palace Token (TPT) to Sepolia Testnet
 *
 * This script:
 * 1. Deploys the TigerPalaceToken implementation contract
 * 2. Deploys an ERC1967 proxy pointing to the implementation
 * 3. Initializes the proxy with admin address
 * 4. Mints 10 million TPT to admin wallet
 * 5. Saves deployment info to JSON file
 * 6. Updates .env.local with TPT address
 *
 * Requirements:
 * - NEXT_PUBLIC_ADMIN_WALLET_ADDRESS must be set in .env.local
 * - Deployer wallet must have Sepolia ETH
 *
 * Usage:
 *   npx hardhat run scripts/deploy-tpt-token.ts --network sepolia
 */

import { ethers, upgrades } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function main() {
  console.log('\n🚀 Deploying Upgradeable Tiger Palace Token (TPT)...\n');

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log('Deploying with account:', deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Account balance:', ethers.formatEther(balance), 'ETH');

  // Get admin wallet address from environment
  const adminWalletAddress =
    process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS ||
    process.env.ADMIN_WALLET_ADDRESS ||
    process.env.FEE_RECIPIENT;

  if (!adminWalletAddress || adminWalletAddress === '0x0000000000000000000000000000000000000000') {
    throw new Error(
      '❌ NEXT_PUBLIC_ADMIN_WALLET_ADDRESS or ADMIN_WALLET_ADDRESS not set in .env.local'
    );
  }

  console.log('Admin Wallet Address:', adminWalletAddress);
  console.log('');

  // Verify admin address is valid
  if (!ethers.isAddress(adminWalletAddress)) {
    throw new Error('❌ Invalid admin wallet address');
  }

  console.log('📝 Deploying TigerPalaceToken (upgradeable)...');

  // Deploy upgradeable contract using OpenZeppelin Upgrades plugin
  const TigerPalaceToken = await ethers.getContractFactory('TigerPalaceToken');

  const tptToken = await upgrades.deployProxy(
    TigerPalaceToken,
    [adminWalletAddress], // initializer arguments
    {
      initializer: 'initialize',
      kind: 'uups', // Use UUPS proxy pattern
    }
  );

  await tptToken.waitForDeployment();

  const tptAddress = await tptToken.getAddress();
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(tptAddress);

  console.log('\n✅ TigerPalaceToken deployed successfully!');
  console.log('');
  console.log('📋 Deployment Details:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Proxy Address:', tptAddress);
  console.log('Implementation Address:', implementationAddress);
  console.log('Admin Wallet:', adminWalletAddress);
  console.log('Network:', 'sepolia');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Verify initial mint
  const totalSupply = await tptToken.totalSupply();
  const adminBalance = await tptToken.balanceOf(adminWalletAddress);
  const maxSupply = await tptToken.MAX_SUPPLY();
  const remainingSupply = await tptToken.remainingSupply();

  console.log('');
  console.log('📊 Token Details:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Token Name:', await tptToken.name());
  console.log('Token Symbol:', await tptToken.symbol());
  console.log('Decimals:', await tptToken.decimals());
  console.log('Total Supply:', ethers.formatUnits(totalSupply, 18), 'TPT');
  console.log('Max Supply:', ethers.formatUnits(maxSupply, 18), 'TPT');
  console.log('Remaining Supply:', ethers.formatUnits(remainingSupply, 18), 'TPT');
  console.log('Admin Balance:', ethers.formatUnits(adminBalance, 18), 'TPT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Verify roles
  const DEFAULT_ADMIN_ROLE = await tptToken.DEFAULT_ADMIN_ROLE();
  const MINTER_ROLE = await tptToken.MINTER_ROLE();
  const PAUSER_ROLE = await tptToken.PAUSER_ROLE();
  const UPGRADER_ROLE = await tptToken.UPGRADER_ROLE();

  const hasAdminRole = await tptToken.hasRole(DEFAULT_ADMIN_ROLE, adminWalletAddress);
  const hasMinterRole = await tptToken.hasRole(MINTER_ROLE, adminWalletAddress);
  const hasPauserRole = await tptToken.hasRole(PAUSER_ROLE, adminWalletAddress);
  const hasUpgraderRole = await tptToken.hasRole(UPGRADER_ROLE, adminWalletAddress);

  console.log('');
  console.log('🔐 Role Verification:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin has DEFAULT_ADMIN_ROLE:', hasAdminRole ? '✅' : '❌');
  console.log('Admin has MINTER_ROLE:', hasMinterRole ? '✅' : '❌');
  console.log('Admin has PAUSER_ROLE:', hasPauserRole ? '✅' : '❌');
  console.log('Admin has UPGRADER_ROLE:', hasUpgraderRole ? '✅' : '❌');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Save deployment info
  const deploymentInfo = {
    network: 'sepolia',
    chainId: '11155111',
    proxyAddress: tptAddress,
    implementationAddress: implementationAddress,
    adminWallet: adminWalletAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
    tokenDetails: {
      name: await tptToken.name(),
      symbol: await tptToken.symbol(),
      decimals: await tptToken.decimals(),
      totalSupply: ethers.formatUnits(totalSupply, 18),
      maxSupply: ethers.formatUnits(maxSupply, 18),
      initialMint: ethers.formatUnits(adminBalance, 18),
    },
  };

  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(process.cwd(), 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment info to JSON file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const deploymentFile = path.join(deploymentsDir, `tpt-token-sepolia-${timestamp}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

  console.log('');
  console.log('📄 Deployment info saved to:', deploymentFile);

  // Update .env.local
  const envPath = path.join(process.cwd(), '.env.local');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');
  }

  // Update or add TPT_ADDRESS
  const tptAddressPattern = /^NEXT_PUBLIC_TPT_ADDRESS=.*$/m;
  if (tptAddressPattern.test(envContent)) {
    envContent = envContent.replace(tptAddressPattern, `NEXT_PUBLIC_TPT_ADDRESS=${tptAddress}`);
  } else {
    envContent += `\nNEXT_PUBLIC_TPT_ADDRESS=${tptAddress}\n`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env.local updated with TPT_ADDRESS');

  console.log('');
  console.log('✅ Deployment complete!');
  console.log('');
  console.log('📋 Next Steps:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('1. Verify contract on Etherscan:');
  console.log(`   npx hardhat verify --network sepolia ${implementationAddress}`);
  console.log('');
  console.log('2. Deploy TokenExchange contract:');
  console.log('   npx hardhat run scripts/deploy-token-exchange.ts --network sepolia');
  console.log('');
  console.log('3. Test the token:');
  console.log('   - Check balance on Etherscan');
  console.log('   - Try transfer');
  console.log('   - Test minting (as admin)');
  console.log('');
  console.log('4. Upgrade contract (if needed):');
  console.log('   npx hardhat run scripts/upgrade-tpt-token.ts --network sepolia');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Display useful contract info
  console.log('📝 Contract Info for Frontend:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Token Address: ${tptAddress}`);
  console.log(`Symbol: TPT`);
  console.log(`Decimals: 18`);
  console.log(`Max Supply: 100,000,000 TPT`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  console.log('🔗 Useful Links:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Proxy: https://sepolia.etherscan.io/address/${tptAddress}`);
  console.log(`Implementation: https://sepolia.etherscan.io/address/${implementationAddress}`);
  console.log(`Admin Wallet: https://sepolia.etherscan.io/address/${adminWalletAddress}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Deployment failed:\n');
    console.error(error);
    process.exit(1);
  });
