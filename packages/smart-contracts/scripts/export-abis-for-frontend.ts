#!/usr/bin/env tsx
/**
 * Export ABIs for Frontend Integration
 *
 * Run from project root: bun run export:abis
 *
 * This script:
 * 1. Loads all contract ABIs from the database
 * 2. Exports them to a frontend-accessible directory
 * 3. Creates TypeScript definitions for easy import
 * 4. Generates contract address configuration from database
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../../../src/lib/prisma';

const CHAIN_ID = 11155111; // Sepolia
const CHAIN_ID_STR = '11155111';

// Project root (script lives at packages/smart-contracts/scripts/)
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const ABI_OUTPUT_DIR = path.join(PROJECT_ROOT, 'src/lib/contracts/abis');
const CONFIG_OUTPUT_DIR = path.join(PROJECT_ROOT, 'src/lib/contracts');

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   EXPORT ABIs FOR FRONTEND INTEGRATION                    ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const db = prisma as any;

  // Get BlockchainNetwork for Sepolia (DeployedContract uses network.id)
  const network = await db.blockchainNetwork.findUnique({
    where: { chainId: CHAIN_ID },
  });
  if (!network) {
    throw new Error('BlockchainNetwork for Sepolia not found. Run seed:sepolia:ecosystem first.');
  }

  // Load all deployed contracts
  console.log("📋 Loading deployed contracts from database...\n");

  const contracts = await db.deployedContract.findMany({
    where: {
      networkId: network.id,
      isActive: true,
    } as any,
    orderBy: { contractType: 'asc' },
  });

  console.log(`✅ Found ${contracts.length} active contracts\n`);

  // Load ABIs (ContractABI uses chain ID string)
  console.log("📋 Loading ABIs from database...\n");

  const abis = await db.contractABI.findMany({
    where: { networkId: CHAIN_ID_STR } as any,
  });

  console.log(`✅ Found ${abis.length} ABIs\n`);

  // Create output directories
  console.log("📁 Creating output directories...\n");
  
  if (!fs.existsSync(ABI_OUTPUT_DIR)) {
    fs.mkdirSync(ABI_OUTPUT_DIR, { recursive: true });
    console.log(`   ✅ Created: ${ABI_OUTPUT_DIR}`);
  }

  if (!fs.existsSync(CONFIG_OUTPUT_DIR)) {
    fs.mkdirSync(CONFIG_OUTPUT_DIR, { recursive: true });
    console.log(`   ✅ Created: ${CONFIG_OUTPUT_DIR}`);
  }

  console.log();

  // Export individual ABIs
  console.log("💾 Exporting individual ABIs...\n");

  const exportedAbis: Record<string, any> = {};
  const contractsWithAbis: typeof contracts = [];

  for (const contract of contracts) {
    const abi = abis.find(a => a.contractAddress.toLowerCase() === contract.contractAddress.toLowerCase());
    
    if (!abi) {
      console.log(`   ⚠️  No ABI found for ${contract.contractType} (${contract.contractAddress}) - skipping`);
      continue;
    }

    contractsWithAbis.push(contract);

    const contractTypeClean = contract.contractType.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${contractTypeClean}.json`;
    const filePath = path.join(ABI_OUTPUT_DIR, fileName);

    const abiData = {
      contractName: contract.contractName,
      contractType: contract.contractType,
      contractAddress: contract.contractAddress,
      networkId: CHAIN_ID_STR,
      networkName: 'sepolia',
      abi: abi.abi,
      isUpgradeable: contract.isUpgradeable,
      implementationAddress: contract.implementationAddress,
      deployedAt: contract.deployedAt.toISOString(),
      verified: contract.isVerified,
      functions: {
        total: (abi.parsedFunctions as any)?.all?.length || 0,
        read: (abi.parsedFunctions as any)?.read?.length || 0,
        write: (abi.parsedFunctions as any)?.write?.length || 0,
      },
      events: Array.isArray(abi.parsedEvents) ? abi.parsedEvents.length : 0,
    };

    fs.writeFileSync(filePath, JSON.stringify(abiData, null, 2));
    console.log(`   ✅ Exported: ${fileName}`);

    exportedAbis[contract.contractType] = abiData;
  }

  // Export consolidated ABIs file
  console.log("\n💾 Exporting consolidated ABIs...\n");
  
  const consolidatedPath = path.join(ABI_OUTPUT_DIR, 'index.json');
  fs.writeFileSync(consolidatedPath, JSON.stringify(exportedAbis, null, 2));
  console.log(`   ✅ Created: index.json`);

  // Generate TypeScript index file
  console.log("\n📝 Generating TypeScript index...\n");
  
  const tsIndexContent = `/**
 * Contract ABIs - Auto-generated from database
 * 
 * DO NOT EDIT MANUALLY - Run export-abis-for-frontend.ts to regenerate
 * 
 * Last updated: ${new Date().toISOString()}
 * Network: Sepolia (${CHAIN_ID_STR})
 */

${contractsWithAbis.map(c => {
  const contractTypeClean = c.contractType.replace(/[^a-zA-Z0-9]/g, '_');
  return `import ${contractTypeClean}_ABI from './${contractTypeClean}.json';`;
}).join('\n')}

export const CONTRACT_ABIS = {
${contractsWithAbis.map(c => {
  const contractTypeClean = c.contractType.replace(/[^a-zA-Z0-9]/g, '_');
  return `  ${c.contractType}: ${contractTypeClean}_ABI,`;
}).join('\n')}
} as const;

export const CONTRACT_ADDRESSES = {
${contractsWithAbis.map(c => {
  return `  ${c.contractType}: '${c.contractAddress}' as const,`;
}).join('\n')}
} as const;

export const CONTRACT_TYPES = {
${contractsWithAbis.map(c => {
  return `  ${c.contractType}: '${c.contractType}' as const,`;
}).join('\n')}
} as const;

// Export individual ABIs
${contractsWithAbis.map(c => {
  const contractTypeClean = c.contractType.replace(/[^a-zA-Z0-9]/g, '_');
  return `export { ${contractTypeClean}_ABI };`;
}).join('\n')}

// Helper to get ABI by contract type
export function getABI(contractType: keyof typeof CONTRACT_ABIS) {
  return CONTRACT_ABIS[contractType]?.abi;
}

// Helper to get contract address by type
export function getContractAddress(contractType: keyof typeof CONTRACT_ADDRESSES) {
  return CONTRACT_ADDRESSES[contractType];
}

// Helper to create contract instance
export function getContractInstance(contractType: keyof typeof CONTRACT_ABIS, signerOrProvider: any) {
  const address = getContractAddress(contractType);
  const abi = getABI(contractType);
  
  if (!address || !abi) {
    throw new Error(\`Contract not found: \${contractType}\`);
  }
  
  // Note: Requires ethers.js v6
  return new (require('ethers').Contract)(address, abi, signerOrProvider);
}
`;

  const tsIndexPath = path.join(ABI_OUTPUT_DIR, 'index.ts');
  fs.writeFileSync(tsIndexPath, tsIndexContent);
  console.log(`   ✅ Created: index.ts`);

  // Generate contract configuration file
  console.log("\n📝 Generating contract configuration...\n");

  const configContent = `/**
 * Contract Configuration - Auto-generated from database
 * 
 * DO NOT EDIT MANUALLY - Run export-abis-for-frontend.ts to regenerate
 * 
 * Last updated: ${new Date().toISOString()}
 * Network: Sepolia (${CHAIN_ID_STR})
 * 
 * This file provides contract addresses and metadata loaded from the database.
 * The frontend should use these values instead of environment variables.
 */

export const SEPOLIA_CONTRACTS = {
${contracts.map(c => `  ${c.contractType}: {
    address: '${c.contractAddress}' as const,
    name: '${c.contractName}',
    type: '${c.contractType}',
    isUpgradeable: ${c.isUpgradeable},${c.implementationAddress ? `
    implementationAddress: '${c.implementationAddress}',` : ''}
    deployedAt: '${c.deployedAt.toISOString()}',
    verified: ${c.isVerified},
  },`).join('\n')}
} as const;

export const NETWORK_ID = '${CHAIN_ID_STR}' as const;
export const NETWORK_NAME = 'sepolia' as const;

// Helper functions
export function getContractAddress(contractType: keyof typeof SEPOLIA_CONTRACTS): string {
  return SEPOLIA_CONTRACTS[contractType]?.address;
}

export function getContractInfo(contractType: keyof typeof SEPOLIA_CONTRACTS) {
  return SEPOLIA_CONTRACTS[contractType];
}

export function getAllContracts() {
  return Object.entries(SEPOLIA_CONTRACTS).map(([type, info]) => ({
    type,
    ...info,
  }));
}

// Export individual addresses for convenience
export const REGISTRY_ADDRESS = SEPOLIA_CONTRACTS.REGISTRY.address;
export const FACTORY_ADDRESS = SEPOLIA_CONTRACTS.FACTORY.address;
export const ERC404_FACTORY_ADDRESS = SEPOLIA_CONTRACTS.ERC404_FACTORY.address;
export const MARKETPLACE_ADDRESS = SEPOLIA_CONTRACTS.MARKETPLACE.address;
`;

  const configPath = path.join(CONFIG_OUTPUT_DIR, 'sepolia-config.ts');
  fs.writeFileSync(configPath, configContent);
  console.log(`   ✅ Created: sepolia-config.ts`);

  // Create README
  console.log("\n📝 Creating README...\n");

  const readmeContent = `# Contract ABIs and Configuration

This directory contains auto-generated contract ABIs and configuration files loaded from the database.

## Files

- \`abis/\` - Individual ABI files for each contract
- \`abis/index.ts\` - TypeScript exports for all ABIs
- \`abis/index.json\` - Consolidated JSON with all ABIs
- \`sepolia-config.ts\` - Contract addresses and metadata

## Usage

### Import ABIs

\`\`\`typescript
import { CONTRACT_ABIS, CONTRACT_ADDRESSES } from '@/lib/contracts/abis';

// Get specific ABI
const registryABI = CONTRACT_ABIS.REGISTRY.abi;

// Get contract address
const registryAddress = CONTRACT_ADDRESSES.REGISTRY;
\`\`\`

### Import Configuration

\`\`\`typescript
import { SEPOLIA_CONTRACTS, getContractAddress } from '@/lib/contracts/sepolia-config';

// Get contract address
const marketplaceAddress = getContractAddress('MARKETPLACE');

// Get full contract info
const registryInfo = SEPOLIA_CONTRACTS.REGISTRY;
\`\`\`

### Create Contract Instance

\`\`\`typescript
import { getContractInstance } from '@/lib/contracts/abis';
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider(RPC_URL);
const marketplace = getContractInstance('MARKETPLACE', provider);

// Call contract functions
const fee = await marketplace.getMarketplaceFee();
\`\`\`

## Regeneration

To regenerate these files from the database:

\`\`\`bash
bun run export:abis
\`\`\`

## Database Source

All data is sourced from:
- \`deployed_contracts\` table - Contract addresses and metadata
- \`contract_abis\` table - Parsed ABIs with functions and events

**DO NOT use environment variables for contract addresses. Always load from database.**
`;

  const readmePath = path.join(CONFIG_OUTPUT_DIR, 'README.md');
  fs.writeFileSync(readmePath, readmeContent);
  console.log(`   ✅ Created: README.md`);

  // Summary
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║   ✅ EXPORT COMPLETE                                      ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  console.log(`📁 Output Directories:`);
  console.log(`   ${ABI_OUTPUT_DIR}`);
  console.log(`   ${CONFIG_OUTPUT_DIR}\n`);

  console.log(`📄 Files Created:`);
  console.log(`   ${contractsWithAbis.length} individual ABI files`);
  console.log(`   1 consolidated ABI file (index.json)`);
  console.log(`   1 TypeScript index (index.ts)`);
  console.log(`   1 config file (sepolia-config.ts)`);
  console.log(`   1 README file\n`);

  console.log(`📋 Next Steps:`);
  console.log(`   1. Import ABIs in frontend: import { CONTRACT_ABIS } from '@/lib/contracts/abis'`);
  console.log(`   2. Import addresses: import { SEPOLIA_CONTRACTS } from '@/lib/contracts/sepolia-config'`);
  console.log(`   3. NO environment variables needed!`);
  console.log(`   4. Contracts loaded from database automatically\n`);

  process.exit(0);
}

main().catch((error) => {
  console.error("❌ Export failed:", error);
  process.exit(1);
});
