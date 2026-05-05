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

const MARKETPLACE_PROXY = process.env.NEXT_PUBLIC_RWA_MARKETPLACE || '0xc9C369525DFf385935dfDC6aC2F678C26998D0d7';
const TOKEN_FACTORY = process.env.NEXT_PUBLIC_RWA_TOKEN_FACTORY || '0x...'; // Will get from marketplace
const TOKEN_FACTORY_404 = process.env.NEXT_PUBLIC_RWA_TOKEN_FACTORY_404 || '0x7a6f7dE826064903f2e419833b9633560217FEe2';

const FACTORY_ABI = [
  'function grantRole(bytes32 role, address account)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function TOKEN_CREATOR_ROLE() view returns (bytes32)',
  'function TOKEN_MANAGER_ROLE() view returns (bytes32)',
] as const;

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   GRANT TOKEN CREATOR ROLE TO MARKETPLACE                ║');
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

  // Get factory addresses from marketplace
  const marketplace = await ethers.getContractAt([
    'function tokenFactory() view returns (address)',
    'function tokenFactory404() view returns (address)',
  ], MARKETPLACE_PROXY);
  
  const tokenFactoryAddress = await marketplace.tokenFactory();
  const tokenFactory404Address = await marketplace.tokenFactory404();

  console.log(`📋 Configuration:`);
  console.log(`   Marketplace Proxy: ${MARKETPLACE_PROXY}`);
  console.log(`   Token Factory: ${tokenFactoryAddress}`);
  console.log(`   Token Factory 404: ${tokenFactory404Address}`);
  console.log(`   Admin Wallet: ${adminAddress}\n`);

  try {
    const adminSigner = new ethers.Wallet(adminPrivateKey, ethers.provider);

    // Grant role to ERC20 factory
    if (tokenFactoryAddress && tokenFactoryAddress !== ethers.ZeroAddress) {
      console.log(`🔍 Checking ERC20 Token Factory...`);
      const factory = await ethers.getContractAt(FACTORY_ABI as any, tokenFactoryAddress);
      
      // Check TOKEN_CREATOR_ROLE (for createToken)
      try {
        const TOKEN_CREATOR_ROLE = await factory.TOKEN_CREATOR_ROLE();
        const hasCreatorRole = await factory.hasRole(TOKEN_CREATOR_ROLE, MARKETPLACE_PROXY);
        if (hasCreatorRole) {
          console.log(`   ✅ Marketplace already has TOKEN_CREATOR_ROLE`);
        } else {
          console.log(`   ⚙️  Granting TOKEN_CREATOR_ROLE to marketplace...`);
          const factoryWithSigner = factory.connect(adminSigner);
          const tx = await (factoryWithSigner as any).grantRole(TOKEN_CREATOR_ROLE, MARKETPLACE_PROXY);
          await tx.wait();
          console.log(`   ✅ TOKEN_CREATOR_ROLE granted!`);
        }
      } catch (error: any) {
        console.log(`   ⚠️  Could not check TOKEN_CREATOR_ROLE: ${error.message}`);
      }
      
      // Check TOKEN_MANAGER_ROLE (for mintTokens in upgradeable factory)
      try {
        const TOKEN_MANAGER_ROLE = await factory.TOKEN_MANAGER_ROLE();
        const hasManagerRole = await factory.hasRole(TOKEN_MANAGER_ROLE, MARKETPLACE_PROXY);
        if (hasManagerRole) {
          console.log(`   ✅ Marketplace already has TOKEN_MANAGER_ROLE\n`);
        } else {
          console.log(`   ⚙️  Granting TOKEN_MANAGER_ROLE to marketplace...`);
          const factoryWithSigner = factory.connect(adminSigner);
          const tx = await (factoryWithSigner as any).grantRole(TOKEN_MANAGER_ROLE, MARKETPLACE_PROXY);
          await tx.wait();
          console.log(`   ✅ TOKEN_MANAGER_ROLE granted!\n`);
        }
      } catch (error: any) {
        // TOKEN_MANAGER_ROLE might not exist in non-upgradeable factories
        console.log(`   ℹ️  Factory doesn't have TOKEN_MANAGER_ROLE (non-upgradeable factory)\n`);
      }
    }

    // Grant role to ERC404 factory
    if (tokenFactory404Address && tokenFactory404Address !== ethers.ZeroAddress) {
      console.log(`🔍 Checking ERC404 Token Factory...`);
      const factory404 = await ethers.getContractAt(FACTORY_ABI as any, tokenFactory404Address);
      
      // Check TOKEN_CREATOR_ROLE (for createToken)
      try {
        const TOKEN_CREATOR_ROLE_404 = await factory404.TOKEN_CREATOR_ROLE();
        const hasCreatorRole404 = await factory404.hasRole(TOKEN_CREATOR_ROLE_404, MARKETPLACE_PROXY);
        if (hasCreatorRole404) {
          console.log(`   ✅ Marketplace already has TOKEN_CREATOR_ROLE`);
        } else {
          console.log(`   ⚙️  Granting TOKEN_CREATOR_ROLE to marketplace...`);
          const factory404WithSigner = factory404.connect(adminSigner);
          const tx404 = await (factory404WithSigner as any).grantRole(TOKEN_CREATOR_ROLE_404, MARKETPLACE_PROXY);
          await tx404.wait();
          console.log(`   ✅ TOKEN_CREATOR_ROLE granted!`);
        }
      } catch (error: any) {
        console.log(`   ⚠️  Could not check TOKEN_CREATOR_ROLE: ${error.message}`);
      }
      
      // Check TOKEN_MANAGER_ROLE (for mintTokens in upgradeable factory)
      try {
        const TOKEN_MANAGER_ROLE_404 = await factory404.TOKEN_MANAGER_ROLE();
        const hasManagerRole404 = await factory404.hasRole(TOKEN_MANAGER_ROLE_404, MARKETPLACE_PROXY);
        if (hasManagerRole404) {
          console.log(`   ✅ Marketplace already has TOKEN_MANAGER_ROLE\n`);
        } else {
          console.log(`   ⚙️  Granting TOKEN_MANAGER_ROLE to marketplace...`);
          const factory404WithSigner = factory404.connect(adminSigner);
          const tx404 = await (factory404WithSigner as any).grantRole(TOKEN_MANAGER_ROLE_404, MARKETPLACE_PROXY);
          await tx404.wait();
          console.log(`   ✅ TOKEN_MANAGER_ROLE granted!\n`);
        }
      } catch (error: any) {
        // TOKEN_MANAGER_ROLE might not exist in non-upgradeable factories
        console.log(`   ℹ️  Factory doesn't have TOKEN_MANAGER_ROLE (non-upgradeable factory)\n`);
      }
    }

    console.log(`✅ All roles granted successfully!\n`);

  } catch (error: any) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);

