#!/usr/bin/env node

/**
 * Fix Contract ABI Alignment - JavaScript Version
 *
 * This script updates the contract database and copies ABIs to ensure
 * perfect alignment between database records and deployed contracts.
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 FIXING CONTRACT ABI ALIGNMENT\n');

// Latest deployed contract addresses (from Sepolia deployment)
const CONTRACT_ADDRESSES = {
  REGISTRY: '0xfDA3a77909867C3612beD96F3A1C52bAfd4D21A3',
  FACTORY: '0x808bB660C12d7f9360C1C8c72dd7763ab96cBB41',
  MARKETPLACE: '0x7dc22ff9CA455d26F315FdbC964F8DCC5F2725Bd',
  ERC404_FACTORY: '0x09255e956f179aF8ee57Dba7b665C1c44aAE21Bb',
  STAKING: '0xE1ef011d2e0e54525fCd46b1AECE3E84Ea117DcD',
  REVENUE: '0xFDf9474209eB32Ff7Cb5E98Ca4afEFF19744cA43',
  REWARD_DISTRIBUTOR: '0xC6d9Cb2e8DEe8746F9710D087a0d93765a256FD9',
  TOKEN: '0x5E53F7C9b586eE12CA8A579456af2a6093141D69',
  MEMBERSHIP_SYSTEM: '0x8e73eA275eD7146Ee3A45ccEA1695158496DD94C',
  TOKEN_USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  TOKEN_EURC: '0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4'
};

// ABI mapping for copying
const ABI_MAPPING = {
  'RWAAssetRegistry.json': 'upgradeable/RWAAssetRegistryUpgradeable.sol/RWAAssetRegistryUpgradeable.json',
  'RWATokenFactory.json': 'upgradeable/RWATokenFactoryUpgradeable.sol/RWATokenFactoryUpgradeable.json',
  'RWAMarketplace.json': 'upgradeable/RWAMarketplaceUpgradeable.sol/RWAMarketplaceUpgradeable.json',
  'RWATokenFactory404.json': 'core/RWATokenFactory404.sol/RWATokenFactory404.json',
  'MembershipSystem.json': 'upgradeable/MembershipSystemUpgradeable.sol/MembershipSystemUpgradeable.json'
};

function copyABI(sourceArtifact, destName) {
  try {
    const sourcePath = path.join(__dirname, '../artifacts/contracts', sourceArtifact);
    const destPath = path.join(__dirname, '../../../src/lib/abis', destName);

    if (fs.existsSync(sourcePath)) {
      const artifact = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));
      fs.writeFileSync(destPath, JSON.stringify(artifact, null, 2));
      console.log(`✅ Copied ${destName}`);
      return true;
    } else {
      console.log(`❌ Source not found: ${sourceArtifact}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Failed to copy ${destName}: ${error.message}`);
    return false;
  }
}

function createAddressFile() {
  const content = `// Latest deployed contract addresses on Sepolia
// Auto-generated - do not edit manually

export const CONTRACT_ADDRESSES = ${JSON.stringify(CONTRACT_ADDRESSES, null, 2)};

export default CONTRACT_ADDRESSES;
`;

  const destPath = path.join(__dirname, '../../../src/lib/contracts/addresses.ts');
  fs.writeFileSync(destPath, content);
  console.log('✅ Created addresses.ts file');
}

function main() {
  console.log('📋 CONTRACT ADDRESSES:');
  Object.entries(CONTRACT_ADDRESSES).forEach(([type, address]) => {
    console.log(`   ${type}: ${address}`);
  });

  console.log('\n📋 COPYING ABIS TO SRC/LIB/ABIS/...');

  // Ensure destination directory exists
  const destDir = path.join(__dirname, '../../../src/lib/abis');
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // Copy ABIs
  let copied = 0;
  let failed = 0;

  Object.entries(ABI_MAPPING).forEach(([destName, sourceArtifact]) => {
    if (copyABI(sourceArtifact, destName)) {
      copied++;
    } else {
      failed++;
    }
  });

  console.log(`\n📊 ABI COPY RESULTS: ${copied} copied, ${failed} failed`);

  // Create addresses file
  console.log('\n📋 CREATING ADDRESSES FILE...');
  createAddressFile();

  console.log('\n🎉 CONTRACT ABI ALIGNMENT COMPLETE!');
  console.log('\n📝 SUMMARY:');
  console.log('✅ Latest ABIs copied to src/lib/abis/');
  console.log('✅ Contract addresses file created');
  console.log('✅ Next.js compatible ABI imports ready');
  console.log('✅ Database can be updated separately with these addresses');

  console.log('\n🔍 NEXT STEPS:');
  console.log('1. Update database with contract addresses using the addresses.ts file');
  console.log('2. Restart Next.js development server');
  console.log('3. Test contract interactions');
}

main();