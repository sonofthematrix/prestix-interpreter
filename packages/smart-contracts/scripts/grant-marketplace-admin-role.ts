import 'dotenv/config';
import hre from 'hardhat';
const { ethers } = hre;
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables - check multiple locations
const rootEnvLocalPath = path.join(__dirname, "../../../.env.local");
const rootEnvPath = path.join(__dirname, "../../../.env");
const localEnvLocalPath = path.join(__dirname, "../.env.local");
const localEnvPath = path.join(__dirname, "../.env");

// Priority: root .env.local > root .env > local .env.local > local .env
if (fs.existsSync(rootEnvLocalPath)) {
  dotenv.config({ path: rootEnvLocalPath });
} else if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else if (fs.existsSync(localEnvLocalPath)) {
  dotenv.config({ path: localEnvLocalPath });
} else if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else {
  dotenv.config(); // Fallback to default
}

const MARKETPLACE_PROXY = process.env.NEXT_PUBLIC_RWA_MARKETPLACE || '0xc9C369525DFf385935dfDC6aC2F678C26998D0d7';

// Marketplace ABI
const MARKETPLACE_ABI = [
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function grantRole(bytes32 role, address account)',
  'function getRoleAdmin(bytes32 role) view returns (bytes32)',
  'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
] as const;

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   GRANT MARKETPLACE ADMIN ROLE                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Get target address (who to grant role to)
  const targetAddress = process.env.TARGET_ADDRESS || process.env.ADMIN_WALLET || process.env.ADMIN_WALLET_ADDRESS;

  if (!targetAddress) {
    console.log('❌ Usage: TARGET_ADDRESS=<address> bun hardhat run scripts/grant-marketplace-admin-role.ts --network sepolia\n');
    console.log('📋 Parameters:');
    console.log('  TARGET_ADDRESS   : Address to grant DEFAULT_ADMIN_ROLE to (required)');
    console.log('                    Or set ADMIN_WALLET in .env.local\n');
    console.log('📝 Example:');
    console.log('  TARGET_ADDRESS=0x8eD7F4FB3Aa1a3B346756624B17094dfd6040047 bun hardhat run scripts/grant-marketplace-admin-role.ts --network sepolia\n');
    process.exit(1);
  }

  // Get deployer/admin wallet (who will grant the role)
  const deployerAddress = process.env.ADMIN_WALLET || 
                          process.env.ADMIN_WALLET_ADDRESS || 
                          process.env.WALLET_ADDRESS;
  const deployerPrivateKey = process.env.ADMIN_PRIVATE_KEY || 
                             process.env.PRIVATE_KEY ||
                             process.env.DEPLOYER_PRIVATE_KEY;

  if (!deployerAddress || !deployerPrivateKey) {
    console.log('❌ Deployer wallet not found in environment variables');
    console.log('   Please set ADMIN_WALLET (or ADMIN_WALLET_ADDRESS) and ADMIN_PRIVATE_KEY in .env.local\n');
    process.exit(1);
  }

  console.log(`📋 Configuration:`);
  console.log(`   Marketplace Proxy: ${MARKETPLACE_PROXY}`);
  console.log(`   Target Address: ${targetAddress}`);
  console.log(`   Deployer Address: ${deployerAddress}\n`);

  try {
    // Create signer
    const provider = ethers.provider;
    const deployerSigner = new ethers.Wallet(deployerPrivateKey, provider);

    // Verify deployer signer
    if (deployerSigner.address.toLowerCase() !== deployerAddress.toLowerCase()) {
      throw new Error(`Deployer private key does not match deployer address. Expected: ${deployerAddress}, Got: ${deployerSigner.address}`);
    }

    // Get marketplace contract
    const marketplace = await ethers.getContractAt(MARKETPLACE_ABI as any, MARKETPLACE_PROXY);

    // Get DEFAULT_ADMIN_ROLE
    const DEFAULT_ADMIN_ROLE = await marketplace.DEFAULT_ADMIN_ROLE();
    console.log(`🔍 Checking roles...`);
    console.log(`   DEFAULT_ADMIN_ROLE: ${DEFAULT_ADMIN_ROLE}\n`);

    // Check if deployer has admin role
    const deployerHasAdmin = await marketplace.hasRole(DEFAULT_ADMIN_ROLE, deployerSigner.address);
    
    if (!deployerHasAdmin) {
      console.log(`❌ Deployer does not have DEFAULT_ADMIN_ROLE`);
      console.log(`   Deployer: ${deployerSigner.address}`);
      console.log(`   Cannot grant role to others without admin role\n`);
      console.log(`💡 Solution: Use the wallet that deployed the marketplace contract`);
      console.log(`   Or find who has DEFAULT_ADMIN_ROLE and use that wallet\n`);
      process.exit(1);
    }

    console.log(`   ✅ Deployer has DEFAULT_ADMIN_ROLE\n`);

    // Check if target already has admin role
    const targetHasAdmin = await marketplace.hasRole(DEFAULT_ADMIN_ROLE, targetAddress);
    
    if (targetHasAdmin) {
      console.log(`✅ Target address already has DEFAULT_ADMIN_ROLE`);
      console.log(`   Address: ${targetAddress}\n`);
      return;
    }

    // Grant role
    console.log(`⚙️  Granting DEFAULT_ADMIN_ROLE to ${targetAddress}...`);
    const marketplaceWithSigner = marketplace.connect(deployerSigner);
    const tx = await (marketplaceWithSigner as any).grantRole(DEFAULT_ADMIN_ROLE, targetAddress);
    console.log(`   Transaction Hash: ${tx.hash}`);
    console.log(`   Waiting for confirmation...\n`);

    const receipt = await tx.wait();
    console.log(`✅ Role granted successfully!`);
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}\n`);

    // Verify role was granted
    console.log(`🔍 Verifying role grant...`);
    const newTargetHasAdmin = await marketplace.hasRole(DEFAULT_ADMIN_ROLE, targetAddress);
    
    if (newTargetHasAdmin) {
      console.log(`✅ Verification successful!`);
      console.log(`   ${targetAddress} now has DEFAULT_ADMIN_ROLE\n`);
    } else {
      console.log(`❌ Verification failed!`);
      console.log(`   Role may not have been granted correctly\n`);
      process.exit(1);
    }

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   SUMMARY                                                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`✅ DEFAULT_ADMIN_ROLE granted to ${targetAddress}`);
    console.log(`   This address can now configure payment tokens and manage marketplace settings\n`);

  } catch (error: any) {
    console.error('❌ Grant role failed:', error.message);
    
    if (error.transaction) {
      console.error(`   Transaction hash: ${error.transaction.hash}`);
    }
    
    if (error.message.includes('AccessControl')) {
      console.log(`\n💡 Solution: Ensure deployer wallet has DEFAULT_ADMIN_ROLE on the marketplace contract`);
    } else if (error.message.includes('insufficient funds')) {
      console.log(`\n💡 Solution: Ensure deployer wallet has sufficient ETH for gas fees`);
    }
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

