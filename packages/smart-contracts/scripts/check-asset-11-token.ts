import 'dotenv/config';
import hre from 'hardhat';
const { ethers } = hre;

const MARKETPLACE = process.env.NEXT_PUBLIC_RWA_MARKETPLACE || '0xc9C369525DFf385935dfDC6aC2F678C26998D0d7';
const FACTORY_404 = process.env.NEXT_PUBLIC_RWA_TOKEN_FACTORY_404 || '0x7a6f7dE826064903f2e419833b9633560217FEe2';
const ASSET_ID = 11n;

async function main() {
  const marketplace = await ethers.getContractAt([
    'function _getTokenAddress(uint256 assetId) view returns (address)',
  ], MARKETPLACE);

  // Try to get token address
  let tokenAddress: string;
  try {
    tokenAddress = await marketplace._getTokenAddress(ASSET_ID);
  } catch (error: any) {
    console.log(`❌ Could not get token address: ${error.message}`);
    // Try factory directly
    const factory = await ethers.getContractAt([
      'function getTokenAddress(uint256 assetId) view returns (address)',
    ], FACTORY_404);
    tokenAddress = await factory.getTokenAddress(ASSET_ID);
  }

  console.log(`Token Address for Asset ${ASSET_ID}: ${tokenAddress}`);

  if (tokenAddress === ethers.ZeroAddress) {
    console.log(`No token exists yet - will be created on purchase\n`);
    return;
  }

  // Check token roles
  const TOKEN_ABI = [
    'function MINTER_ROLE() view returns (bytes32)',
    'function hasRole(bytes32 role, address account) view returns (bool)',
    'function name() view returns (string)',
  ];

  const token = await ethers.getContractAt(TOKEN_ABI, tokenAddress);
  const MINTER_ROLE = await token.MINTER_ROLE();
  const factoryHasRole = await token.hasRole(MINTER_ROLE, FACTORY_404);
  const marketplaceHasRole = await token.hasRole(MINTER_ROLE, MARKETPLACE);

  console.log(`\nToken Roles:`);
  console.log(`   MINTER_ROLE: ${MINTER_ROLE}`);
  console.log(`   Factory has MINTER_ROLE: ${factoryHasRole ? '✅' : '❌'}`);
  console.log(`   Marketplace has MINTER_ROLE: ${marketplaceHasRole ? '✅' : '❌'}`);

  if (!factoryHasRole && !marketplaceHasRole) {
    console.log(`\n⚠️  Neither factory nor marketplace has MINTER_ROLE on this token!`);
    console.log(`   This will cause the purchase to fail.\n`);
  }
}

main().catch(console.error);

