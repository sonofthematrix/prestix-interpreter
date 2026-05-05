#!/usr/bin/env tsx
/**
 * Verify Fresh Deployment
 * 
 * Checks that all contracts are properly deployed and configured
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { ethers } from "hardhat";

const prisma = new PrismaClient();
const NETWORK_ID = '11155111'; // Sepolia

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   FRESH DEPLOYMENT VERIFICATION                           ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  // Check deployed contracts
  const contracts = await prisma.deployedContract.findMany({
    where: {
      networkId: NETWORK_ID,
      isActive: true,
    },
    orderBy: { contractType: 'asc' },
  });

  console.log(`✅ Found ${contracts.length} active contracts on Sepolia:\n`);

  for (const c of contracts) {
    console.log(`   ${c.contractType.padEnd(20)} ${c.contractAddress}`);
    console.log(`      Name: ${c.contractName}`);
    console.log(`      Verified: ${c.isVerified ? '✅' : '❌'}`);
    console.log(`      Upgradeable: ${c.isUpgradeable ? '✅' : '❌'}`);
    if (c.implementationAddress) {
      console.log(`      Implementation: ${c.implementationAddress}`);
    }
    console.log();
  }

  // Check ABIs
  const abis = await prisma.contractABI.findMany({
    where: { networkId: NETWORK_ID },
  });

  console.log(`✅ Found ${abis.length} ABIs stored\n`);

  for (const abi of abis) {
    const parsedFunctions = abi.parsedFunctions as any;
    const parsedEvents = abi.parsedEvents as any;
    const totalFunctions = parsedFunctions?.all?.length || 0;
    const totalEvents = Array.isArray(parsedEvents) ? parsedEvents.length : 0;
    
    console.log(`   ${abi.contractAddress}`);
    console.log(`      Functions: ${totalFunctions}`);
    console.log(`      Events: ${totalEvents}`);
    console.log(`      Verified: ${abi.isVerified ? '✅' : '❌'}`);
    console.log();
  }

  // Verify on blockchain
  console.log("🔗 Verifying contracts on blockchain...\n");

  for (const c of contracts) {
    const code = await ethers.provider.getCode(c.contractAddress);
    const exists = code !== '0x';
    console.log(`   ${c.contractType.padEnd(20)} ${exists ? '✅ Exists' : '❌ Not found'}`);
  }

  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║   ✅ VERIFICATION COMPLETE                                ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  process.exit(0);
}

main().catch((error) => {
  console.error("❌ Verification failed:", error);
  process.exit(1);
});
