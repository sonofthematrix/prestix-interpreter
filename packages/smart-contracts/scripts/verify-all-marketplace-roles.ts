import 'dotenv/config';
import hre from 'hardhat';
const { ethers } = hre;

const MARKETPLACE_PROXY = process.env.NEXT_PUBLIC_RWA_MARKETPLACE || '0xc9C369525DFf385935dfDC6aC2F678C26998D0d7';
const ROLE_HASH = '0x74f7a545c65c11839a48d7453738b30c295408df2d944516167556759ddc6d06';

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   VERIFY ALL MARKETPLACE ROLES                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const marketplace = await ethers.getContractAt([
    'function tokenFactory() view returns (address)',
    'function tokenFactory404() view returns (address)',
    'function assetRegistry() view returns (address)',
  ], MARKETPLACE_PROXY);

  const tokenFactory = await marketplace.tokenFactory();
  const tokenFactory404 = await marketplace.tokenFactory404();
  const registry = await marketplace.assetRegistry();

  console.log(`📋 Contracts:`);
  console.log(`   Marketplace: ${MARKETPLACE_PROXY}`);
  console.log(`   Token Factory: ${tokenFactory}`);
  console.log(`   Token Factory 404: ${tokenFactory404}`);
  console.log(`   Registry: ${registry}\n`);

  const FACTORY_ABI = [
    'function TOKEN_CREATOR_ROLE() view returns (bytes32)',
    'function hasRole(bytes32 role, address account) view returns (bool)',
  ];

  const REGISTRY_ABI = [
    'function MARKETPLACE_ROLE() view returns (bytes32)',
    'function hasRole(bytes32 role, address account) view returns (bool)',
  ];

  // Check ERC20 factory
  if (tokenFactory && tokenFactory !== ethers.ZeroAddress) {
    console.log(`🔍 Checking ERC20 Token Factory...`);
    const factory = await ethers.getContractAt(FACTORY_ABI, tokenFactory);
    const tokenCreatorRole = await factory.TOKEN_CREATOR_ROLE();
    const hasRole = await factory.hasRole(tokenCreatorRole, MARKETPLACE_PROXY);
    console.log(`   TOKEN_CREATOR_ROLE: ${tokenCreatorRole}`);
    console.log(`   Marketplace has role: ${hasRole ? '✅' : '❌'}`);
    console.log(`   Matches error hash: ${tokenCreatorRole.toLowerCase() === ROLE_HASH.toLowerCase() ? '✅' : '❌'}\n`);
  }

  // Check ERC404 factory
  if (tokenFactory404 && tokenFactory404 !== ethers.ZeroAddress) {
    console.log(`🔍 Checking ERC404 Token Factory...`);
    const factory404 = await ethers.getContractAt(FACTORY_ABI, tokenFactory404);
    const tokenCreatorRole404 = await factory404.TOKEN_CREATOR_ROLE();
    const hasRole404 = await factory404.hasRole(tokenCreatorRole404, MARKETPLACE_PROXY);
    console.log(`   TOKEN_CREATOR_ROLE: ${tokenCreatorRole404}`);
    console.log(`   Marketplace has role: ${hasRole404 ? '✅' : '❌'}`);
    console.log(`   Matches error hash: ${tokenCreatorRole404.toLowerCase() === ROLE_HASH.toLowerCase() ? '✅' : '❌'}\n`);
  }

  // Check registry
  console.log(`🔍 Checking Registry...`);
  const registryContract = await ethers.getContractAt(REGISTRY_ABI, registry);
  const marketplaceRole = await registryContract.MARKETPLACE_ROLE();
  const hasMarketplaceRole = await registryContract.hasRole(marketplaceRole, MARKETPLACE_PROXY);
  console.log(`   MARKETPLACE_ROLE: ${marketplaceRole}`);
  console.log(`   Marketplace has role: ${hasMarketplaceRole ? '✅' : '❌'}`);
  console.log(`   Matches error hash: ${marketplaceRole.toLowerCase() === ROLE_HASH.toLowerCase() ? '✅' : '❌'}\n`);

  // Compute expected role hash
  const computedTokenCreator = ethers.keccak256(ethers.toUtf8Bytes("TOKEN_CREATOR_ROLE"));
  const computedMarketplace = ethers.keccak256(ethers.toUtf8Bytes("MARKETPLACE_ROLE"));
  
  console.log(`📊 Role Hash Analysis:`);
  console.log(`   Error hash: ${ROLE_HASH}`);
  console.log(`   Computed TOKEN_CREATOR_ROLE: ${computedTokenCreator}`);
  console.log(`   Computed MARKETPLACE_ROLE: ${computedMarketplace}`);
  console.log(`   Error matches TOKEN_CREATOR_ROLE: ${computedTokenCreator.toLowerCase() === ROLE_HASH.toLowerCase() ? '✅' : '❌'}`);
  console.log(`   Error matches MARKETPLACE_ROLE: ${computedMarketplace.toLowerCase() === ROLE_HASH.toLowerCase() ? '✅' : '❌'}\n`);
}

main().catch(console.error);

