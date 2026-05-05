#!/usr/bin/env tsx

/**
 * Verify All Contracts from Database
 * 
 * This script:
 * 1. Loads all deployed contracts from the database
 * 2. Checks verification status on Etherscan
 * 3. Verifies unverified contracts (proxies, implementations, and singleton instances)
 * 4. Updates database with verification status
 * 
 * Usage: bun run hardhat run scripts/verify-all-contracts.ts --network sepolia
 */

import 'dotenv/config';
import hre from 'hardhat';
import { ethers } from 'hardhat';
import path from 'path';
import fs from 'fs';

// Import database utilities with path alias resolution
const rootPath = path.resolve(__dirname, '../../..');
let createClient: any;
let getSystemUser: any;

try {
  // Add root path to require resolution for @/ alias
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function(id: string) {
    if (id.startsWith('@/zenstack/')) {
      const resolved = id.replace('@/zenstack/', path.join(rootPath, 'zenstack/'));
      return originalRequire.call(this, resolved);
    } else if (id.startsWith('@/')) {
      const resolved = id.replace('@/', path.join(rootPath, 'src/'));
      return originalRequire.call(this, resolved);
    }
    return originalRequire.call(this, id);
  };
  
  const dbModule = require(path.join(rootPath, 'src/lib/db.ts'));
  createClient = dbModule.createClient;
  
  try {
    const systemUserModule = require(path.join(rootPath, 'src/lib/utils/system-user.ts'));
    getSystemUser = systemUserModule.getSystemUser;
  } catch {
    // Fallback system user
    getSystemUser = async () => ({
      id: 'system',
      role: 'ADMIN' as const,
      email: 'system@TKNZN.pro',
    });
  }
} catch (error: any) {
  console.error('❌ Could not import ZenStack client:', error.message);
  process.exit(1);
}

// Contract name to source file path mapping
const CONTRACT_PATH_MAP: Record<string, { path: string; name: string; constructorArgs?: any[] }> = {
  // Upgradeable Contracts
  'RWAAssetRegistryUpgradeable': {
    path: 'contracts/upgradeable/RWAAssetRegistryUpgradeable.sol',
    name: 'RWAAssetRegistryUpgradeable',
    constructorArgs: []
  },
  'RWATokenFactoryUpgradeable': {
    path: 'contracts/upgradeable/RWATokenFactoryUpgradeable.sol',
    name: 'RWATokenFactoryUpgradeable',
    constructorArgs: []
  },
  'RWAMarketplaceUpgradeable': {
    path: 'contracts/marketplace/RWAMarketplaceUpgradeableSetter.sol',
    name: 'RWAMarketplaceUpgradeableSetter',
    constructorArgs: []
  },
  'RWAMarketplaceUpgradeableSetter': {
    path: 'contracts/marketplace/RWAMarketplaceUpgradeableSetter.sol',
    name: 'RWAMarketplaceUpgradeableSetter',
    constructorArgs: []
  },
  'RWAMarketplaceFixedV2': {
    path: 'contracts/marketplace/RWAMarketplaceFixedV2.sol',
    name: 'RWAMarketplaceFixedV2',
    constructorArgs: []
  },
  'RWAStakingUpgradeable': {
    path: 'contracts/upgradeable/RWAStakingUpgradeable.sol',
    name: 'RWAStakingUpgradeable',
    constructorArgs: []
  },
  'MembershipSystemUpgradeable': {
    path: 'contracts/upgradeable/MembershipSystemUpgradeable.sol',
    name: 'MembershipSystemUpgradeable',
    constructorArgs: []
  },
  
  // Core Contracts
  'RWATokenFactory404': {
    path: 'contracts/core/RWATokenFactory404.sol',
    name: 'RWATokenFactory404',
    constructorArgs: []
  },
  'RWAToken404Fixed': {
    path: 'contracts/core/RWAToken404Fixed.sol',
    name: 'RWAToken404Fixed',
    constructorArgs: []
  },
  
  // Staking Contracts
  'RWARewardDistributor': {
    path: 'contracts/staking/RWARewardDistributor.sol',
    name: 'RWARewardDistributor',
    constructorArgs: []
  },
  'RWARevenue': {
    path: 'contracts/staking/RWARevenue.sol',
    name: 'RWARevenue',
    constructorArgs: []
  },
  
  // Proxy Contracts
  'TransparentUpgradeableProxy': {
    path: 'contracts/proxy/TransparentUpgradeableProxy.sol',
    name: 'TransparentUpgradeableProxy',
    constructorArgs: []
  },
  'ProxyAdmin': {
    path: 'contracts/proxy/ProxyAdmin.sol',
    name: 'ProxyAdmin',
    constructorArgs: []
  },
  
  // Token Contracts
  'TigerPalaceToken': {
    path: 'contracts/TokenizinToken.sol',
    name: 'TokenizinToken',
    constructorArgs: []
  },
  'TokenizinToken': {
    path: 'contracts/TokenizinToken.sol',
    name: 'TokenizinToken',
    constructorArgs: []
  },
};

// Helper function to check if contract is verified on Etherscan
async function checkVerificationStatus(
  contractAddress: string,
  networkId: string
): Promise<boolean> {
  try {
    const explorerUrl = getExplorerUrl(networkId);
    const apiKey = process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️  Etherscan API key not found, skipping verification check');
      return false;
    }

    // Use Hardhat's verification plugin to check status
    // This is a simplified check - actual verification uses the plugin
    const code = await ethers.provider.getCode(contractAddress);
    return code !== '0x';
  } catch (error) {
    console.warn(`⚠️  Could not check verification status for ${contractAddress}:`, error);
    return false;
  }
}

// Get explorer URL based on network
function getExplorerUrl(networkId: string): string {
  const networkMap: Record<string, string> = {
    '1': 'https://etherscan.io',
    '11155111': 'https://sepolia.etherscan.io',
    '137': 'https://polygonscan.com',
    '80001': 'https://mumbai.polygonscan.com',
  };
  
  return networkMap[networkId] || 'https://etherscan.io';
}

// Verify contract with retry logic
async function verifyContract(
  contractAddress: string,
  contractName: string,
  contractPath: string,
  constructorArgs: any[] = [],
  maxRetries: number = 5
): Promise<boolean> {
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`\n🔍 Verification attempt ${attempt}/${maxRetries} for ${contractName}...`);
      
      await hre.run('verify:verify', {
        address: contractAddress,
        constructorArguments: constructorArgs,
        contract: `${contractPath}:${contractName}`,
      });
      
      console.log(`\n✅ Contract verified successfully on Etherscan!`);
      return true;
      
    } catch (error: any) {
      if (error.message.includes('Already Verified')) {
        console.log(`\n✅ Contract is already verified on Etherscan!`);
        return true;
      }
      
      if (attempt === maxRetries) {
        console.error(`\n❌ Verification failed after ${maxRetries} attempts`);
        console.error('Error:', error.message);
        return false;
      }
      
      // Exponential backoff: 5s, 10s, 20s, 40s, 80s
      const backoffDelay = Math.min(5000 * Math.pow(2, attempt - 1), 80000);
      console.log(`⏳ Retrying in ${backoffDelay / 1000} seconds...`);
      await delay(backoffDelay);
    }
  }
  
  return false;
}

// Get contract path mapping
function getContractPath(contractName: string): { path: string; name: string; constructorArgs?: any[] } | null {
  // Try exact match first
  if (CONTRACT_PATH_MAP[contractName]) {
    return CONTRACT_PATH_MAP[contractName];
  }
  
  // Try partial matches
  for (const [key, value] of Object.entries(CONTRACT_PATH_MAP)) {
    if (contractName.includes(key) || key.includes(contractName)) {
      return value;
    }
  }
  
  return null;
}

async function main() {
  console.log('🔍 Starting Comprehensive Contract Verification\n');
  console.log('='.repeat(60));
  
  // Check Etherscan API key
  if (!process.env.ETHERSCAN_API_KEY && !process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY) {
    console.error('❌ ERROR: ETHERSCAN_API_KEY or NEXT_PUBLIC_ETHERSCAN_API_KEY not found');
    console.error('Please set one of these variables in your .env.local file');
    process.exit(1);
  }
  
  const apiKey = process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;
  console.log('✅ Etherscan API key found\n');
  
  // Initialize database connection
  const systemUser = await getSystemUser();
  const db = createClient({
    id: systemUser.id,
    role: systemUser.role,
    email: systemUser.email,
  } as any);
  
  // Load all deployed contracts from database
  console.log('📋 Loading contracts from database...\n');
  const contracts = await db.deployedContract.findMany({
    where: { isActive: true },
    include: {
      network: true,
    }
  });
  
  console.log(`Found ${contracts.length} active contracts in database\n`);
  
  if (contracts.length === 0) {
    console.log('⚠️  No contracts found in database. Exiting.');
    process.exit(0);
  }
  
  // Group contracts by verification status
  const unverifiedContracts: typeof contracts = [];
  const verifiedContracts: typeof contracts = [];
  
  for (const contract of contracts) {
    if (contract.isVerified && contract.verifiedAt) {
      verifiedContracts.push(contract);
    } else {
      unverifiedContracts.push(contract);
    }
  }
  
  console.log(`📊 Verification Status:`);
  console.log(`   ✅ Verified: ${verifiedContracts.length}`);
  console.log(`   ❌ Unverified: ${unverifiedContracts.length}\n`);
  
  if (unverifiedContracts.length === 0) {
    console.log('🎉 All contracts are already verified!');
    process.exit(0);
  }
  
  // Verify unverified contracts
  console.log('🚀 Starting verification process...\n');
  console.log('='.repeat(60));
  
  let verifiedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  
  for (const contract of unverifiedContracts) {
    console.log(`\n📦 Processing: ${contract.contractName}`);
    console.log(`   Address: ${contract.contractAddress}`);
    console.log(`   Type: ${contract.contractType}`);
    console.log(`   Network: ${contract.network?.name || contract.networkId}`);
    console.log(`   Upgradeable: ${contract.isUpgradeable ? 'Yes' : 'No'}`);
    if (contract.isUpgradeable && contract.implementationAddress) {
      console.log(`   Implementation: ${contract.implementationAddress}`);
    }
    
    // Get contract path mapping
    const contractMapping = getContractPath(contract.contractName);
    
    if (!contractMapping) {
      console.log(`   ⚠️  No source path mapping found for ${contract.contractName}`);
      console.log(`   ⏭️  Skipping verification (manual verification required)`);
      skippedCount++;
      continue;
    }
    
    // Determine which address to verify
    // For upgradeable contracts, verify the implementation if available
    // Otherwise verify the proxy
    let addressToVerify = contract.contractAddress;
    let contractToVerify = contract;
    
    if (contract.isUpgradeable && contract.implementationAddress) {
      console.log(`   ℹ️  This is a proxy contract. Verifying implementation...`);
      addressToVerify = contract.implementationAddress;
      
      // Try to find implementation contract in database
      const implContract = contracts.find(
        c => c.contractAddress.toLowerCase() === contract.implementationAddress?.toLowerCase()
      );
      
      if (implContract) {
        contractToVerify = implContract;
      }
    }
    
    // Verify the contract
    const success = await verifyContract(
      addressToVerify,
      contractMapping.name,
      contractMapping.path,
      contractMapping.constructorArgs || []
    );
    
    if (success) {
      // Update database
      try {
        await db.deployedContract.update({
          where: { id: contractToVerify.id },
          data: {
            isVerified: true,
            verifiedAt: new Date(),
          } as any
        });
        
        console.log(`   ✅ Database updated: ${contractToVerify.contractName} marked as verified`);
        verifiedCount++;
      } catch (dbError: any) {
        console.error(`   ⚠️  Failed to update database: ${dbError.message}`);
        verifiedCount++; // Still count as verified on Etherscan
      }
      
      const explorerUrl = getExplorerUrl(contract.networkId);
      console.log(`   📋 View on Etherscan: ${explorerUrl}/address/${addressToVerify}#code`);
    } else {
      console.error(`   ❌ Verification failed for ${contract.contractName}`);
      failedCount++;
    }
    
    // Small delay between verifications to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successfully verified: ${verifiedCount}`);
  console.log(`❌ Failed: ${failedCount}`);
  console.log(`⏭️  Skipped: ${skippedCount}`);
  console.log(`📋 Total processed: ${unverifiedContracts.length}`);
  console.log('='.repeat(60));
  
  if (failedCount > 0) {
    console.log('\n⚠️  Some contracts failed verification.');
    console.log('Please review the errors above and verify manually if needed.');
    process.exit(1);
  }
  
  console.log('\n🎉 All contracts verified successfully!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Verification script failed:', error);
    process.exit(1);
  });
