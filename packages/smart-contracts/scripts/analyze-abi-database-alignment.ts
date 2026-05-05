/**
 * ABI Database Alignment Analysis Script
 *
 * Analyzes the current state of deployed_contracts and contract_abis tables
 * and compares them with onchain deployments and ABI files.
 *
 * This script identifies:
 * - Contracts in database but not onchain
 * - Contracts onchain but not in database
 * - ABI mismatches between database and artifact files
 * - Missing or outdated ABI records
 */

import 'dotenv/config';
import { createClient } from '../../../src/lib/db';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

// System user for database operations
const systemUser = {
  id: 'system',
  email: 'system@TKNZN.pro',
  role: 'ADMIN' as const,
  name: 'System Admin'
};

// Provider for onchain verification
const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_PROJECT_ID');

// Latest deployed contract addresses (from most recent deployment)
const LATEST_DEPLOYED_CONTRACTS = {
  // Infrastructure contracts
  REGISTRY: {
    address: '0xfDA3a77909867C3612beD96F3A1C52bAfd4D21A3',
    name: 'RWAAssetRegistryUpgradeable',
    type: 'REGISTRY',
    artifactPath: 'upgradeable/RWAAssetRegistryUpgradeable.sol/RWAAssetRegistryUpgradeable.json'
  },
  FACTORY: {
    address: '0x808bB660C12d7f9360C1C8c72dd7763ab96cBB41',
    name: 'RWATokenFactoryUpgradeable',
    type: 'FACTORY',
    artifactPath: 'upgradeable/RWATokenFactoryUpgradeable.sol/RWATokenFactoryUpgradeable.json'
  },
  MARKETPLACE: {
    address: '0x7dc22ff9CA455d26F315FdbC964F8DCC5F2725Bd',
    name: 'RWAMarketplaceUpgradeable',
    type: 'MARKETPLACE',
    artifactPath: 'upgradeable/RWAMarketplaceUpgradeable.sol/RWAMarketplaceUpgradeable.json'
  },
  ERC404_FACTORY: {
    address: '0x09255e956f179aF8ee57Dba7b665C1c44aAE21Bb',
    name: 'RWATokenFactory404',
    type: 'ERC404_FACTORY',
    artifactPath: 'core/RWATokenFactory404.sol/RWATokenFactory404.json'
  },

  // Staking ecosystem
  STAKING: {
    address: '0xE1ef011d2e0e54525fCd46b1AECE3E84Ea117DcD',
    name: 'RWAStakingUpgradeable',
    type: 'STAKING',
    artifactPath: 'upgradeable/RWAStakingUpgradeable.sol/RWAStakingUpgradeable.json'
  },
  REVENUE: {
    address: '0xFDf9474209eB32Ff7Cb5E98Ca4afEFF19744cA43',
    name: 'RWARevenue',
    type: 'REVENUE',
    artifactPath: 'staking/RWARevenue.sol/RWARevenue.json'
  },
  REWARD_DISTRIBUTOR: {
    address: '0xC6d9Cb2e8DEe8746F9710D087a0d93765a256FD9',
    name: 'RWARewardDistributor',
    type: 'REWARD_DISTRIBUTOR',
    artifactPath: 'staking/RWARewardDistributor.sol/RWARewardDistributor.json'
  },

  // Token contracts
  TOKEN: {
    address: '0x5E53F7C9b586eE12CA8A579456af2a6093141D69',
    name: 'TigerPalaceToken',
    type: 'TOKEN',
    artifactPath: 'core/TigerPalaceToken.sol/TigerPalaceToken.json'
  },

  // Membership
  MEMBERSHIP_SYSTEM: {
    address: '0x8e73eA275eD7146Ee3A45ccEA1695158496DD94C',
    name: 'MembershipSystemUpgradeable',
    type: 'MEMBERSHIP_SYSTEM',
    artifactPath: 'upgradeable/MembershipSystemUpgradeable.sol/MembershipSystemUpgradeable.json'
  },

  // Payment tokens (stablecoins)
  TOKEN_USDC: {
    address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    name: 'USDC Stable Coin',
    type: 'TOKEN_USDC',
    artifactPath: null // Standard ERC20
  },
  TOKEN_EURC: {
    address: '0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4',
    name: 'EURC Stable Coin',
    type: 'TOKEN_EURC',
    artifactPath: null // Standard ERC20
  }
};

// Asset tokens (from previous deployment)
const ASSET_TOKENS = [
  { type: 'TOKEN_ASSET_1', address: '0x9C1DaAeb18f73f157c8bA783210697212f0a84c4', name: 'Beachfront Villa Paradise Token' },
  { type: 'TOKEN_ASSET_2', address: '0x611bFD5c90A268F4ABC6F5b07790E29C1b3f97d6', name: 'Mountain Resort Estate Token' },
  { type: 'TOKEN_ASSET_3', address: '0x24EA38cDcde183F6955aBEaB514aaB5917079756', name: 'Luxury Yacht Token' },
  { type: 'TOKEN_ASSET_4', address: '0xF95a6D1182cde5Ec65029174Fe2228C94551eA75', name: 'Mediterranean Coastal Villa Token' },
  { type: 'TOKEN_ASSET_5', address: '0xCbaa45De2751e5E9F173C845Ea7331912f6aB420', name: 'Urban Penthouse Suite Token' }
];

// Standard ERC20 ABI for payment tokens
const ERC20ABI = [
  {"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"}
];

function loadABI(artifactPath: string | null): any[] {
  if (!artifactPath) return ERC20ABI;

  try {
    const fullPath = path.join(process.cwd(), 'packages/smart-contracts/artifacts/contracts', artifactPath);
    const artifact = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
    return artifact.abi || [];
  } catch (error) {
    console.warn(`⚠️  Could not load ABI from ${artifactPath}:`, error.message);
    return [];
  }
}

function calculateABIHash(abi: any[]): string {
  const abiString = JSON.stringify(abi, null, 0);
  return createHash('sha256').update(abiString).digest('hex');
}

async function verifyContractOnchain(contractAddress: string): Promise<boolean> {
  try {
    const code = await provider.getCode(contractAddress);
    return code !== '0x';
  } catch (error) {
    console.warn(`⚠️  Failed to verify contract ${contractAddress} onchain:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔍 ANALYZING ABI DATABASE ALIGNMENT\n');

  const db = createClient(systemUser);

  // 1. Get current database state
  console.log('📊 FETCHING CURRENT DATABASE STATE...\n');

  const dbContracts = await db.deployedContract.findMany({
    where: { isActive: true }
  });

  const dbContractAbis = await db.contractABI.findMany();

  console.log(`📊 Database contains:`);
  console.log(`   ${dbContracts.length} active deployed contracts`);
  console.log(`   ${dbContractAbis.length} contract ABI records\n`);

  // 2. Check all expected contracts
  console.log('🔍 VERIFYING EXPECTED CONTRACTS...\n');

  const allExpectedContracts = [
    ...Object.values(LATEST_DEPLOYED_CONTRACTS),
    ...ASSET_TOKENS.map(token => ({
      address: token.address,
      name: token.name,
      type: token.type,
      artifactPath: 'core/RWAToken404Fixed.sol/RWAToken404Fixed.json' // All asset tokens use this ABI
    }))
  ];

  const issues: string[] = [];
  const updates: Array<{
    type: 'CREATE' | 'UPDATE' | 'DELETE',
    contractType: string,
    address: string,
    reason: string
  }> = [];

  for (const expectedContract of allExpectedContracts) {
    console.log(`🔍 Checking ${expectedContract.type} (${expectedContract.name})`);

    // Check if contract exists onchain
    const isDeployed = await verifyContractOnchain(expectedContract.address);
    if (!isDeployed) {
      issues.push(`❌ ${expectedContract.type} not deployed at ${expectedContract.address}`);
      updates.push({
        type: 'DELETE',
        contractType: expectedContract.type,
        address: expectedContract.address,
        reason: 'Contract not found onchain'
      });
      continue;
    }

    // Check if contract exists in database
    const dbContract = dbContracts.find(c => c.contractType === expectedContract.type);

    if (!dbContract) {
      issues.push(`❌ ${expectedContract.type} missing from database`);
      updates.push({
        type: 'CREATE',
        contractType: expectedContract.type,
        address: expectedContract.address,
        reason: 'Contract deployed but not in database'
      });
      continue;
    }

    // Check address matches
    if (dbContract.contractAddress.toLowerCase() !== expectedContract.address.toLowerCase()) {
      issues.push(`❌ ${expectedContract.type} address mismatch:`);
      issues.push(`   Database: ${dbContract.contractAddress}`);
      issues.push(`   Expected: ${expectedContract.address}`);
      updates.push({
        type: 'UPDATE',
        contractType: expectedContract.type,
        address: expectedContract.address,
        reason: `Address changed from ${dbContract.contractAddress} to ${expectedContract.address}`
      });
      continue;
    }

    // Check ABI
    const abi = loadABI(expectedContract.artifactPath);
    if (abi.length === 0) {
      issues.push(`❌ ${expectedContract.type} ABI could not be loaded`);
      continue;
    }

    const currentAbiHash = calculateABIHash(abi);
    const dbAbiRecord = dbContractAbis.find(abi => abi.contractAddress === expectedContract.address && abi.abi === JSON.stringify(abi));

    if (!dbAbiRecord) {
      issues.push(`❌ ${expectedContract.type} ABI not in database (or outdated)`);
      updates.push({
        type: 'UPDATE',
        contractType: expectedContract.type,
        address: expectedContract.address,
        reason: 'ABI needs to be updated'
      });
      continue;
    }

    console.log(`   ✅ ${expectedContract.type} verified`);
  }

  // 3. Check for obsolete contracts in database
  console.log('\n🔍 CHECKING FOR OBSOLETE CONTRACTS...\n');

  for (const dbContract of dbContracts) {
    const expectedContract = allExpectedContracts.find(c => c.type === dbContract.contractType);

    if (!expectedContract) {
      issues.push(`❌ Obsolete contract ${dbContract.contractType} in database`);
      updates.push({
        type: 'DELETE',
        contractType: dbContract.contractType,
        address: dbContract.contractAddress,
        reason: 'Contract type no longer expected'
      });
      continue;
    }

    if (dbContract.contractAddress.toLowerCase() !== expectedContract.address.toLowerCase()) {
      // Already handled above
      continue;
    }

    console.log(`   ✅ ${dbContract.contractType} still valid`);
  }

  // 4. Summary
  console.log('\n📋 ANALYSIS SUMMARY\n');

  if (issues.length === 0) {
    console.log('✅ All contracts aligned! No issues found.');
  } else {
    console.log(`⚠️  Found ${issues.length} issues:`);
    issues.forEach(issue => console.log(`   ${issue}`));
  }

  console.log(`\n📝 Required updates (${updates.length}):`);
  if (updates.length === 0) {
    console.log('   None required!');
  } else {
    updates.forEach((update, index) => {
      console.log(`   ${index + 1}. ${update.type} ${update.contractType}: ${update.reason}`);
    });
  }

  console.log('\n🎯 NEXT STEPS:');
  console.log('1. Review the analysis above');
  console.log('2. Run the fix script to apply changes');
  console.log('3. Verify all contracts work correctly');

  // Close database connection
  await db.$disconnect();

  if (issues.length > 0) {
    process.exit(1);
  }
}

main().catch(console.error);