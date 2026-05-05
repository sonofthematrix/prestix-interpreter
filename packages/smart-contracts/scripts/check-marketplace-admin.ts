import 'dotenv/config';
import hre from 'hardhat';
const { ethers } = hre;

const MARKETPLACE_PROXY = process.env.NEXT_PUBLIC_RWA_MARKETPLACE || '0xc9C369525DFf385935dfDC6aC2F678C26998D0d7';
const PROXY_ADMIN = process.env.NEXT_PUBLIC_PROXY_ADMIN_ADDRESS || '0x9d55BcFA47e88868B54C811041A942250d7F3DD9';

// Marketplace ABI
const MARKETPLACE_ABI = [
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
  'function getRoleMemberCount(bytes32 role) view returns (uint256)',
  'function getRoleMember(bytes32 role, uint256 index) view returns (address)',
] as const;

// ProxyAdmin ABI
const PROXY_ADMIN_ABI = [
  'function owner() view returns (address)',
] as const;

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   CHECK MARKETPLACE ADMIN ROLE                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`📋 Configuration:`);
  console.log(`   Marketplace Proxy: ${MARKETPLACE_PROXY}`);
  console.log(`   ProxyAdmin: ${PROXY_ADMIN}\n`);

  try {
    const marketplace = await ethers.getContractAt(MARKETPLACE_ABI as any, MARKETPLACE_PROXY);
    const proxyAdmin = await ethers.getContractAt(PROXY_ADMIN_ABI as any, PROXY_ADMIN);

    // Get DEFAULT_ADMIN_ROLE
    const DEFAULT_ADMIN_ROLE = await marketplace.DEFAULT_ADMIN_ROLE();
    console.log(`🔍 DEFAULT_ADMIN_ROLE: ${DEFAULT_ADMIN_ROLE}\n`);

    // Check ProxyAdmin owner
    console.log(`🔍 Checking ProxyAdmin owner...`);
    const proxyAdminOwner = await proxyAdmin.owner();
    console.log(`   ProxyAdmin Owner: ${proxyAdminOwner}\n`);

    // Check if ProxyAdmin owner has admin role
    const proxyAdminOwnerHasRole = await marketplace.hasRole(DEFAULT_ADMIN_ROLE, proxyAdminOwner);
    console.log(`   ProxyAdmin Owner has DEFAULT_ADMIN_ROLE: ${proxyAdminOwnerHasRole ? '✅ Yes' : '❌ No'}\n`);

    // Try to get role member count
    try {
      const roleMemberCount = await marketplace.getRoleMemberCount(DEFAULT_ADMIN_ROLE);
      console.log(`📊 Role Members: ${roleMemberCount.toString()}\n`);
      
      if (roleMemberCount > 0n) {
        console.log(`👥 Addresses with DEFAULT_ADMIN_ROLE:`);
        for (let i = 0; i < roleMemberCount; i++) {
          const member = await marketplace.getRoleMember(DEFAULT_ADMIN_ROLE, i);
          console.log(`   ${i + 1}. ${member}`);
        }
        console.log('');
      }
    } catch (error) {
      console.log(`⚠️  Could not enumerate role members (contract may not support getRoleMemberCount)\n`);
    }

    // Check admin wallet
    const adminWallet = process.env.ADMIN_WALLET || process.env.ADMIN_WALLET_ADDRESS;
    if (adminWallet) {
      const adminHasRole = await marketplace.hasRole(DEFAULT_ADMIN_ROLE, adminWallet);
      console.log(`🔍 Admin Wallet: ${adminWallet}`);
      console.log(`   Has DEFAULT_ADMIN_ROLE: ${adminHasRole ? '✅ Yes' : '❌ No'}\n`);
    }

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   SUMMARY                                                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    if (proxyAdminOwnerHasRole) {
      console.log(`✅ ProxyAdmin Owner (${proxyAdminOwner}) has DEFAULT_ADMIN_ROLE`);
      console.log(`   Use this wallet to grant roles or configure payment tokens\n`);
    } else {
      console.log(`❌ ProxyAdmin Owner does not have DEFAULT_ADMIN_ROLE`);
      console.log(`   Need to find who initialized the marketplace contract\n`);
    }

  } catch (error: any) {
    console.error('❌ Check failed:', error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

