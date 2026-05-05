import 'dotenv/config';
import hre from 'hardhat';
const { ethers } = hre;
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
const rootEnvLocalPath = path.join(__dirname, "../../../.env.local");
const rootEnvPath = path.join(__dirname, "../../../.env");
const localEnvLocalPath = path.join(__dirname, "../.env.local");
const localEnvPath = path.join(__dirname, "../.env");

if (fs.existsSync(rootEnvLocalPath)) {
  dotenv.config({ path: rootEnvLocalPath });
} else if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else if (fs.existsSync(localEnvLocalPath)) {
  dotenv.config({ path: localEnvLocalPath });
} else if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
} else {
  dotenv.config();
}

// Use NEW marketplace address
const MARKETPLACE_PROXY = process.env.NEXT_PUBLIC_RWA_MARKETPLACE || 
                           process.env.NEXT_PUBLIC_RWA_MARKETPLACE_ADDRESS ||
                           '0xdaCB7b371297d2d2d1E4Bf3E724e514664753a38';

const REGISTRY_ABI = [
  'function grantRole(bytes32 role, address account)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function MARKETPLACE_ROLE() view returns (bytes32)',
] as const;

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   GRANT MARKETPLACE ROLE TO REGISTRY                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Get admin wallet
  const adminAddress = process.env.ADMIN_WALLET || 
                       process.env.ADMIN_WALLET_ADDRESS || 
                       process.env.WALLET_ADDRESS;
  const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY || 
                          process.env.PRIVATE_KEY;

  if (!adminAddress || !adminPrivateKey) {
    console.log('❌ Admin wallet not found\n');
    process.exit(1);
  }

  // Get marketplace's registry address from marketplace contract
  let registryAddress: string;
  try {
  const marketplace = await ethers.getContractAt([
    'function assetRegistry() view returns (address)',
  ], MARKETPLACE_PROXY);
    registryAddress = await marketplace.assetRegistry();
    console.log(`✅ Retrieved registry address from marketplace: ${registryAddress}\n`);
  } catch (error: any) {
    // Fallback to environment variable or default
    registryAddress = process.env.NEXT_PUBLIC_RWA_ASSET_REGISTRY || 
                     '0xf499a41F3dAeC24dae0a4E40dC965dB89E28fb28';
    console.log(`⚠️  Could not get registry from marketplace, using configured: ${registryAddress}\n`);
  }

  console.log(`📋 Configuration:`);
  console.log(`   Marketplace Proxy: ${MARKETPLACE_PROXY}`);
  console.log(`   Registry Address: ${registryAddress}`);
  console.log(`   Admin Wallet: ${adminAddress}\n`);

  try {
    const adminSigner = new ethers.Wallet(adminPrivateKey, ethers.provider);
    const registry = await ethers.getContractAt(REGISTRY_ABI as any, registryAddress);

    // Get MARKETPLACE_ROLE
    const MARKETPLACE_ROLE = await registry.MARKETPLACE_ROLE();
    console.log(`🔍 MARKETPLACE_ROLE: ${MARKETPLACE_ROLE}\n`);

    // Check if marketplace already has the role
    const hasRole = await registry.hasRole(MARKETPLACE_ROLE, MARKETPLACE_PROXY);
    if (hasRole) {
      console.log(`✅ Marketplace already has MARKETPLACE_ROLE\n`);
      return;
    }

    // Grant role
    console.log(`⚙️  Granting MARKETPLACE_ROLE to marketplace...`);
    const registryWithSigner = registry.connect(adminSigner);
    const tx = await (registryWithSigner as any).grantRole(MARKETPLACE_ROLE, MARKETPLACE_PROXY);
    console.log(`   Transaction Hash: ${tx.hash}`);
    console.log(`   Waiting for confirmation...\n`);

    const receipt = await tx.wait();
    console.log(`✅ Role granted successfully!`);
    console.log(`   Block: ${receipt.blockNumber}\n`);

    // Verify
    const newHasRole = await registry.hasRole(MARKETPLACE_ROLE, MARKETPLACE_PROXY);
    if (newHasRole) {
      console.log(`✅ Verification successful: Marketplace now has MARKETPLACE_ROLE\n`);
    } else {
      console.log(`❌ Verification failed\n`);
      process.exit(1);
    }

  } catch (error: any) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);

