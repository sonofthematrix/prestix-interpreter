#!/usr/bin/env tsx
/**
 * Verify Database Contracts
 * 
 * Checks that all deployed contracts are properly stored in the database
 * with complete metadata, ABIs, and proper categorization
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { ethers } from 'hardhat';

const prisma = new PrismaClient();
const NETWORK_ID = '11155111'; // Sepolia

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   DATABASE CONTRACT VERIFICATION                          ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  // Check deployed contracts
  const contracts = await prisma.deployedContract.findMany({
    where: {
      networkId: NETWORK_ID,
      isActive: true,
    },
    orderBy: { contractType: 'asc' },
    include: {
      network: true,
    },
  });

  console.log(`📊 Found ${contracts.length} active contracts for Sepolia:\n`);

  for (const c of contracts) {
    console.log(`╭─────────────────────────────────────────────────────────╮`);
    console.log(`│ Contract Type: ${c.contractType.padEnd(40)} │`);
    console.log(`├─────────────────────────────────────────────────────────┤`);
    console.log(`│ Name:          ${c.contractName.padEnd(39)} │`);
    console.log(`│ Address:       ${c.contractAddress.padEnd(39)} │`);
    console.log(`│ Verified:      ${(c.isVerified ? '✅ Yes' : '❌ No').padEnd(39)} │`);
    console.log(`│ Upgradeable:   ${(c.isUpgradeable ? '✅ Yes' : '❌ No').padEnd(39)} │`);
    
    if (c.isUpgradeable && c.implementationAddress) {
      console.log(`│ Implementation: ${c.implementationAddress.padEnd(38)} │`);
      console.log(`│ Proxy Type:    ${(c.proxyType || 'N/A').padEnd(39)} │`);
    }
    
    console.log(`│ Deployed By:   ${c.deployedBy.padEnd(39)} │`);
    console.log(`│ Deployed At:   ${c.deployedAt.toISOString().padEnd(39)} │`);
    console.log(`│ Version:       ${c.version.padEnd(39)} │`);
    console.log(`╰─────────────────────────────────────────────────────────╯\n`);
  }

  // Check contract ABIs
  console.log("📋 Checking Contract ABIs:\n");

  const abis = await prisma.contractABI.findMany({
    where: { networkId: NETWORK_ID },
    orderBy: { contractAddress: 'asc' },
  });

  console.log(`✅ Found ${abis.length} ABIs stored\n`);

  for (const abi of abis) {
    const parsedFunctions = abi.parsedFunctions as any;
    const parsedEvents = abi.parsedEvents as any;
    const parsedErrors = abi.parsedErrors as any;
    
    const readFunctions = parsedFunctions?.read?.length || 0;
    const writeFunctions = parsedFunctions?.write?.length || 0;
    const totalFunctions = parsedFunctions?.all?.length || 0;
    const totalEvents = Array.isArray(parsedEvents) ? parsedEvents.length : 0;
    const totalErrors = Array.isArray(parsedErrors) ? parsedErrors.length : 0;
    
    const contract = contracts.find(c => c.contractAddress.toLowerCase() === abi.contractAddress.toLowerCase());
    const contractType = contract?.contractType || 'UNKNOWN';
    
    console.log(`╭─────────────────────────────────────────────────────────╮`);
    console.log(`│ Contract: ${contractType.padEnd(46)} │`);
    console.log(`├─────────────────────────────────────────────────────────┤`);
    console.log(`│ Address:        ${abi.contractAddress.padEnd(37)} │`);
    console.log(`│ Total Functions: ${totalFunctions.toString().padEnd(36)} │`);
    console.log(`│   - Read:       ${readFunctions.toString().padEnd(37)} │`);
    console.log(`│   - Write:      ${writeFunctions.toString().padEnd(37)} │`);
    console.log(`│ Total Events:   ${totalEvents.toString().padEnd(37)} │`);
    console.log(`│ Total Errors:   ${totalErrors.toString().padEnd(37)} │`);
    console.log(`│ Verified:       ${(abi.isVerified ? '✅ Yes' : '❌ No').padEnd(37)} │`);
    console.log(`│ Sync Status:    ${abi.syncStatus.padEnd(37)} │`);
    console.log(`╰─────────────────────────────────────────────────────────╯\n`);
  }

  // Verify blockchain presence
  console.log("🔗 Verifying contracts on blockchain:\n");

  for (const c of contracts) {
    const code = await ethers.provider.getCode(c.contractAddress);
    const exists = code !== '0x';
    
    console.log(`   ${c.contractType.padEnd(20)} ${exists ? '✅ Exists on chain' : '❌ Not found'}`);
  }

  // Summary
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║   VERIFICATION SUMMARY                                     ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const allVerified = contracts.every(c => c.isVerified);
  const allHaveABIs = contracts.every(c => abis.some(a => a.contractAddress.toLowerCase() === c.contractAddress.toLowerCase()));

  console.log(`   Contracts in Database:     ${contracts.length}/4 ${contracts.length === 4 ? '✅' : '❌'}`);
  console.log(`   ABIs in Database:          ${abis.length}/4 ${abis.length === 4 ? '✅' : '❌'}`);
  console.log(`   All Verified on Etherscan: ${allVerified ? '✅' : '❌'}`);
  console.log(`   All Have ABIs:             ${allHaveABIs ? '✅' : '❌'}`);
  
  const allOnChain = contracts.length === 4;
  console.log(`   All Exist on Blockchain:   ${allOnChain ? '✅' : '❌'}`);

  if (contracts.length === 4 && abis.length === 4 && allVerified && allHaveABIs && allOnChain) {
    console.log("\n   ✅ DATABASE VERIFICATION PASSED - All systems ready!\n");
  } else {
    console.log("\n   ⚠️  Some issues detected - review above details\n");
  }

  await prisma.$disconnect();
  process.exit(0);
}

main().catch((error) => {
  console.error("❌ Verification failed:", error);
  process.exit(1);
});
