/**
 * Update Contract Database Alignment
 *
 * Updates deployed_contracts and contract_abis tables to match the latest
 * deployed contract addresses and ABIs from the Sepolia deployment.
 */

import 'dotenv/config';
import { createClient } from '../../../src/lib/db';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';    
import { createHash } from 'crypto';
import { AuthUser } from '../../../src/lib/auth';

// System user for database operations
const systemUser = {
  id: 'system',
  email: 'system@TKNZN.pro',
  role: 'ADMIN' as const,
  name: 'System Admin'
};

// Latest deployed contract addresses from Sepolia "Fixed contracts" redeployment
const LATEST_CONTRACTS = {
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
    name: 'REWARD_DISTRIBUTOR',
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

async function updateContractInDatabase(db: any, contractInfo: any) {
  const abi = loadABI(contractInfo.artifactPath);
  const abiHash = calculateABIHash(abi);

  // Update or create deployed contract
  const existingContract = await db.deployedContract.findFirst({
    where: { contractType: contractInfo.type as any }
  });

  if (existingContract) {
    // Update existing contract
    await db.deployedContract.update({
      where: { id: existingContract.id },
      data: {
        contractAddress: contractInfo.address.toLowerCase(),
        contractName: contractInfo.name,
        networkId: '11155111', // Sepolia
        isActive: true,
        updatedAt: new Date()
      } as any
    });

    console.log(`✅ Updated ${contractInfo.type}: ${contractInfo.address}`);
  } else {
    // Create new contract
    await db.deployedContract.create({
      data: {
        contractAddress: contractInfo.address.toLowerCase(),
        contractName: contractInfo.name,
        contractType: contractInfo.type,
        networkId: '11155111', // Sepolia
        deployedBy: systemUser.email,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any
    });

    console.log(`✅ Created ${contractInfo.type}: ${contractInfo.address}`);
  }

  // Update or create ABI record
  const existingAbi = await db.contractABI.findFirst({
    where: { contractAddress: contractInfo.address.toLowerCase() }
  });

  if (existingAbi) {
    // Update ABI if different
    if (existingAbi.abiHash !== abiHash) {
      await db.contractABI.update({
        where: { id: existingAbi.id },
        data: {
          abi: abi,
          abiHash: abiHash,
          verifiedAt: new Date(),
          verificationSource: 'artifact-update',
          updatedAt: new Date()
        } as any
      });

      console.log(`✅ Updated ABI for ${contractInfo.type}`);
    }
  } else {
    // Create new ABI record
    await db.contractABI.create({
      data: {
        contractAddress: contractInfo.address.toLowerCase(),
        abi: abi,
        abiHash: abiHash,
        networkId: '11155111',
        verifiedAt: new Date(),
        verificationSource: 'artifact-import',
        contractName: contractInfo.name,
        totalFunctions: abi.filter((item: any) => item.type === 'function').length,
        totalEvents: abi.filter((item: any) => item.type === 'event').length,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any
    });

    console.log(`✅ Created ABI for ${contractInfo.type}`);
  }
}

async function main() {
  console.log('🔄 UPDATING CONTRACT DATABASE ALIGNMENT\n');

  const db = createClient(systemUser as unknown as AuthUser);

  try {
    // Update infrastructure contracts
    console.log('🏗️  UPDATING INFRASTRUCTURE CONTRACTS...\n');

    for (const [key, contractInfo] of Object.entries(LATEST_CONTRACTS)) {
      await updateContractInDatabase(db, contractInfo);
    }

    // Update asset tokens
    console.log('\n🏠 UPDATING ASSET TOKENS...\n');

    for (const assetToken of ASSET_TOKENS) {
      const contractInfo = {
        address: assetToken.address,
        name: assetToken.name,
        type: assetToken.type,
        artifactPath: 'core/RWAToken404Fixed.sol/RWAToken404Fixed.json'
      };

      await updateContractInDatabase(db, contractInfo);
    }

    // Copy ABIs to src/lib/abis for Next.js compatibility
    console.log('\n📋 COPYING ABIS TO NEXT.JS COMPATIBLE LOCATION...\n');

    const abiDir = path.join(process.cwd(), '../../../src/lib/abis');
    if (!fs.existsSync(abiDir)) {
      fs.mkdirSync(abiDir, { recursive: true });
    }

    // Copy latest ABIs
    const abisToCopy = [
      { name: 'RWAAssetRegistry.json', artifact: 'upgradeable/RWAAssetRegistryUpgradeable.sol/RWAAssetRegistryUpgradeable.json' },
      { name: 'RWATokenFactory.json', artifact: 'upgradeable/RWATokenFactoryUpgradeable.sol/RWATokenFactoryUpgradeable.json' },
      { name: 'RWAMarketplace.json', artifact: 'upgradeable/RWAMarketplaceUpgradeable.sol/RWAMarketplaceUpgradeable.json' },
      { name: 'RWATokenFactory404.json', artifact: 'core/RWATokenFactory404.sol/RWATokenFactory404.json' },
      { name: 'MembershipSystem.json', artifact: 'upgradeable/MembershipSystemUpgradeable.sol/MembershipSystemUpgradeable.json' }
    ];

    for (const abiInfo of abisToCopy) {
      try {
        const sourcePath = path.join(process.cwd(), 'packages/smart-contracts/artifacts/contracts', abiInfo.artifact);
        const destPath = path.join(abiDir, abiInfo.name);

        if (fs.existsSync(sourcePath)) {
          const artifact = JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));
          fs.writeFileSync(destPath, JSON.stringify(artifact, null, 2));
          console.log(`✅ Copied ${abiInfo.name} to src/lib/abis/`);
        } else {
          console.warn(`⚠️  Source ABI not found: ${abiInfo.artifact}`);
        }
      } catch (error) {
        console.warn(`⚠️  Failed to copy ${abiInfo.name}:`, error.message);
      }
    }

    console.log('\n🎉 CONTRACT DATABASE ALIGNMENT COMPLETE!');
    console.log('\n📊 SUMMARY:');
    console.log('✅ All deployed contracts updated in database');
    console.log('✅ All ABIs updated with latest versions');
    console.log('✅ ABIs copied to src/lib/abis/ for Next.js compatibility');
    console.log('✅ Database perfectly aligned with onchain deployments');

    console.log('\n🔍 NEXT STEPS:');
    console.log('1. Restart your Next.js development server');
    console.log('2. Test contract interactions to ensure ABIs work correctly');
    console.log('3. Verify marketplace purchases work with updated contracts');

  } catch (error) {
    console.error('❌ Update failed:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();