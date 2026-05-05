/**
 * Contract Database Alignment Verification Script
 *
 * Run from project root: bun run verify:contracts:alignment
 *
 * Verifies that all deployed contracts in the database match the onchain state
 * and that ABI files are properly stored and aligned.
 */

import 'dotenv/config';
import { prisma } from '../../../src/lib/prisma';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

// Project root (script lives at packages/smart-contracts/scripts/)
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const CHAIN_ID = 11155111; // Sepolia
const CHAIN_ID_STR = '11155111';

// Provider for onchain verification
const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_PROJECT_ID');

// Latest Sepolia deployed contract addresses (from DEPLOYMENT_COMPLETE_SUMMARY.md)
const EXPECTED_CONTRACTS: Record<string, string> = {
  REGISTRY: '0xF1f235CD451637d446AfF963dF512D80B8b8Bbae',
  FACTORY: '0xB1e4945502B2ad72c0ff067B1B8E9EF9be10CBd0',
  ERC404_FACTORY: '0x41CC47BC79F645840f5051B909E0f4E633E363Af',
  MARKETPLACE: '0x033c3B60f713027Fa9bE06A461Aa4DC1C348cEcB',
  TOKEN_USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  TOKEN_EURC: '0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4',
  TOKEN_TPT: '0x064682F1555d3baD3Dab5eDD0DEe45372F23a570'
};

// Asset tokens (from ASSET_TOKENS_VERIFIED.md)
const ASSET_TOKENS = [
  { type: 'TOKEN_ASSET_1', address: '0x883BeD27A00f4513AC52606f3fc7Aeb398AA717d' },
  { type: 'TOKEN_ASSET_2', address: '0xaCfF6abcd5e04E2ae792cBcd8fD87A15dCC04789' },
  { type: 'TOKEN_ASSET_3', address: '0xFd25B46C4eC742Ea04a2E5450A001D18f7De2251' },
  { type: 'TOKEN_ASSET_4', address: '0x2F74DBEb8f96fBe5779AdDdD4Dfb39b93722BC3c' }
];

async function verifyContractOnchain(contractAddress: string): Promise<boolean> {
  try {
    const code = await provider.getCode(contractAddress);
    return code !== '0x';
  } catch (error) {
    console.warn(`⚠️  Failed to verify contract ${contractAddress}:`, error.message);
    return false;
  }
}

function loadABIFromFile(contractType: string): any[] {
  const abiPaths: Record<string, string | null> = {
    REGISTRY: 'core/RWAAssetRegistryUpgradeable.sol/RWAAssetRegistryUpgradeable.json',
    FACTORY: 'upgradeable/RWATokenFactoryUpgradeable.sol/RWATokenFactoryUpgradeable.json',
    MARKETPLACE: 'marketplace/RWAMarketplaceUpgradeableSetter.sol/RWAMarketplaceUpgradeableSetter.json',
    ERC404_FACTORY: 'core/RWATokenFactory404Fixed.sol/RWATokenFactory404Fixed.json',
    TOKEN_USDC: null,
    TOKEN_EURC: null,
    TOKEN_TPT: 'TokenizinToken.sol/TokenizinToken.json',
    TOKEN_ASSET_1: 'core/RWAToken404Fixed.sol/RWAToken404Fixed.json',
    TOKEN_ASSET_2: 'core/RWAToken404Fixed.sol/RWAToken404Fixed.json',
    TOKEN_ASSET_3: 'core/RWAToken404Fixed.sol/RWAToken404Fixed.json',
    TOKEN_ASSET_4: 'core/RWAToken404Fixed.sol/RWAToken404Fixed.json'
  };

  const abiPath = abiPaths[contractType];
  if (!abiPath) return [];

  try {
    const fullPath = path.join(PROJECT_ROOT, 'packages/smart-contracts/artifacts/contracts', abiPath);
    const artifact = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
    return artifact.abi || [];
  } catch (error) {
    console.warn(`⚠️  Could not load ABI for ${contractType}:`, (error as Error).message);
    return [];
  }
}

function sortKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sortKeys);
  return Object.keys(obj)
    .sort()
    .reduce((acc, k) => {
      acc[k] = sortKeys(obj[k]);
      return acc;
    }, {} as Record<string, any>);
}

function calculateABIHash(abi: any[]): string {
  const normalized = sortKeys(abi);
  const abiString = JSON.stringify(normalized);
  return createHash('sha256').update(abiString).digest('hex');
}

async function getDbContracts(): Promise<Array<{ contractAddress: string; contractType: string }>> {
  const network = await (prisma as any).blockchainNetwork.findUnique({
    where: { chainId: CHAIN_ID },
  });
  if (!network) return [];

  const contracts = await (prisma as any).deployedContract.findMany({
    where: { networkId: network.id, isActive: true },
    select: { contractAddress: true, contractType: true },
  });
  return contracts.map((c: any) => ({
    contractAddress: c.contractAddress.toLowerCase(),
    contractType: c.contractType,
  }));
}

async function getDbABI(contractAddress: string): Promise<any[] | null> {
  const abiRecord = await (prisma as any).contractABI.findFirst({
    where: {
      contractAddress: contractAddress.toLowerCase(),
      networkId: CHAIN_ID_STR,
    },
    select: { abi: true },
  });
  if (!abiRecord?.abi) return null;
  return Array.isArray(abiRecord.abi) ? abiRecord.abi : [];
}

async function main() {
  console.log('🔍 VERIFYING CONTRACT DATABASE ALIGNMENT\n');

  try {
    // Get all contracts from database (using Prisma, no system user)
    const dbContracts = await getDbContracts();
    console.log(`📊 Database contains ${dbContracts.length} contracts\n`);

    const issues: string[] = [];
    const updates: Array<{
      type: 'CREATE' | 'UPDATE' | 'DELETE',
      contractType: string,
      address: string,
      reason: string
    }> = [];

    // Check all expected contracts
    console.log('🔍 CHECKING EXPECTED CONTRACTS...\n');

    // Check infrastructure contracts
    for (const [contractType, expectedAddress] of Object.entries(EXPECTED_CONTRACTS)) {
      console.log(`🔍 Checking ${contractType}...`);

      // Find in database
      const dbContract = dbContracts.find(c => c.contractType === contractType);

      if (!dbContract) {
        issues.push(`❌ ${contractType} missing from database`);
        updates.push({
          type: 'CREATE',
          contractType,
          address: expectedAddress,
          reason: 'Contract deployed but not in database'
        });
        continue;
      }

      // Check address matches
      if (dbContract.contractAddress.toLowerCase() !== expectedAddress.toLowerCase()) {
        issues.push(`❌ ${contractType} address mismatch:`);
        issues.push(`   Database: ${dbContract.contractAddress}`);
        issues.push(`   Expected: ${expectedAddress}`);
        updates.push({
          type: 'UPDATE',
          contractType,
          address: expectedAddress,
          reason: `Address changed from ${dbContract.contractAddress}`
        });
        continue;
      }

      // Verify onchain deployment
      const isDeployed = await verifyContractOnchain(expectedAddress);
      if (!isDeployed) {
        issues.push(`❌ ${contractType} not deployed onchain at ${expectedAddress}`);
        updates.push({
          type: 'DELETE',
          contractType,
          address: expectedAddress,
          reason: 'Contract not found onchain'
        });
        continue;
      }

      // Check ABI
      const dbAbi = await getDbABI(expectedAddress);
      const fileAbi = loadABIFromFile(contractType);

      if (!dbAbi || dbAbi.length === 0) {
        issues.push(`❌ ${contractType} ABI missing from database`);
        updates.push({
          type: 'UPDATE',
          contractType,
          address: expectedAddress,
          reason: 'ABI missing from database'
        });
        continue;
      }

      if (fileAbi.length > 0) {
        const dbAbiHash = calculateABIHash(dbAbi);
        const fileAbiHash = calculateABIHash(fileAbi);

        if (dbAbiHash !== fileAbiHash) {
          issues.push(`❌ ${contractType} ABI mismatch with artifact file`);
          updates.push({
            type: 'UPDATE',
            contractType,
            address: expectedAddress,
            reason: 'ABI needs to be updated from artifact'
          });
          continue;
        }
      }

      console.log(`   ✅ ${contractType} verified`);
    }

    // Check asset tokens
    console.log('\n🔍 CHECKING ASSET TOKENS...\n');

    for (const assetToken of ASSET_TOKENS) {
      const { type: contractType, address } = assetToken;
      console.log(`🔍 Checking ${contractType}...`);

      // Find in database
      const dbContract = dbContracts.find(c => c.contractType === contractType);

      if (!dbContract) {
        issues.push(`❌ ${contractType} missing from database`);
        updates.push({
          type: 'CREATE',
          contractType,
          address,
          reason: 'Asset token deployed but not in database'
        });
        continue;
      }

      // Check address matches
      if (dbContract.contractAddress.toLowerCase() !== address.toLowerCase()) {
        issues.push(`❌ ${contractType} address mismatch:`);
        issues.push(`   Database: ${dbContract.contractAddress}`);
        issues.push(`   Expected: ${address}`);
        updates.push({
          type: 'UPDATE',
          contractType,
          address,
          reason: `Address changed from ${dbContract.contractAddress}`
        });
        continue;
      }

      // Verify onchain deployment
      const isDeployed = await verifyContractOnchain(address);
      if (!isDeployed) {
        issues.push(`❌ ${contractType} not deployed onchain`);
        updates.push({
          type: 'DELETE',
          contractType,
          address,
          reason: 'Asset token not found onchain'
        });
        continue;
      }

      // Check ABI
      const dbAbi = await getDbABI(address);
      const fileAbi = loadABIFromFile(contractType);

      if (!dbAbi || dbAbi.length === 0) {
        issues.push(`❌ ${contractType} ABI missing from database`);
        updates.push({
          type: 'UPDATE',
          contractType,
          address,
          reason: 'ABI missing from database'
        });
        continue;
      }

      if (fileAbi.length > 0) {
        const dbAbiHash = calculateABIHash(dbAbi);
        const fileAbiHash = calculateABIHash(fileAbi);

        if (dbAbiHash !== fileAbiHash) {
          issues.push(`❌ ${contractType} ABI mismatch with artifact file`);
          updates.push({
            type: 'UPDATE',
            contractType,
            address,
            reason: 'ABI needs to be updated from artifact'
          });
          continue;
        }
      }

      console.log(`   ✅ ${contractType} verified`);
    }

    // Check for obsolete contracts in database
    console.log('\n🔍 CHECKING FOR OBSOLETE CONTRACTS...\n');

    // Include aliases (FACTORY_404=ERC404_FACTORY, TOKEN_TKNZN=TOKEN_TPT)
    const allExpectedTypes = [
      ...Object.keys(EXPECTED_CONTRACTS),
      ...ASSET_TOKENS.map(t => t.type),
      'FACTORY_404', 'TOKEN_TKNZN'
    ];

    for (const dbContract of dbContracts) {
      if (!allExpectedTypes.includes(dbContract.contractType)) {
        issues.push(`❌ Obsolete contract ${dbContract.contractType} in database`);
        updates.push({
          type: 'DELETE',
          contractType: dbContract.contractType,
          address: dbContract.contractAddress,
          reason: 'Contract type no longer expected'
        });
      } else {
        console.log(`   ✅ ${dbContract.contractType} still valid`);
      }
    }

    // Summary
    console.log('\n📋 VERIFICATION SUMMARY\n');

    if (issues.length === 0) {
      console.log('✅ All contracts perfectly aligned!');
      console.log('   - All expected contracts found in database');
      console.log('   - All addresses match onchain deployments');
      console.log('   - All ABIs properly stored and current');
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

    console.log('\n🎯 RECOMMENDED NEXT STEPS:');
    if (updates.length > 0) {
      console.log('1. Run the contract database fix script');
      console.log('2. Regenerate and copy ABI files to src/lib/abis/');
      console.log('3. Verify all contracts work correctly');
    } else {
      console.log('1. Copy latest ABIs to src/lib/abis/ for Next.js compatibility');
      console.log('2. Run comprehensive system verification');
    }

    process.exit(issues.length > 0 ? 1 : 0);

  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

main();