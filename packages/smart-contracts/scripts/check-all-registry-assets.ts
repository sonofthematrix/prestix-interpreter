#!/usr/bin/env tsx

import { ethers } from 'hardhat';

async function main() {
  const REGISTRY_ADDRESS = "0x4f641965145c93c81614e47dce16224d5eb2fcf9";
  const registry = await ethers.getContractAt("contracts/core/RWAAssetRegistryUpgradeable.sol:RWAAssetRegistryUpgradeable", REGISTRY_ADDRESS);
  
  console.log("🔍 Checking Registry for Assets 1-4...\n");
  
  const assetData = [
    { id: 1, expectedTitle: 'Luxury Beachfront Villa Bali', expectedToken: '0x883bed27a00f4513ac52606f3fc7aeb398aa717d' },
    { id: 2, expectedTitle: 'Mediterranean Coastal Villa', expectedToken: '0xacff6abcd5e04e2ae792cbcd8fd87a15dcc04789' },
    { id: 3, expectedTitle: 'Luxury Superyacht', expectedToken: '0xfd25b46c4ec742ea04a2e5450a001d18f7de2251' },
    { id: 4, expectedTitle: 'Modern Mountain Estate', expectedToken: '0x2f74dbeb8f96fbe5779adddd4dfb39b93722bc3c' },
  ];
  
  const issues: string[] = [];
  
  for (const expected of assetData) {
    console.log(`\n📋 Asset ID ${expected.id}:`);
    
    try {
      const asset = await registry.getAsset(expected.id);
      
      console.log(`  Registry Title: ${asset.title}`);
      console.log(`  Registry Token: ${asset.tokenAddress || 'NOT SET'}`);
      console.log(`  Expected Title: ${expected.expectedTitle}`);
      console.log(`  Expected Token: ${expected.expectedToken}`);
      
      // Check for mismatches
      const titleMatch = asset.title === expected.expectedTitle;
      const tokenMatch = asset.tokenAddress && asset.tokenAddress.toLowerCase() === expected.expectedToken.toLowerCase();
      
      if (!titleMatch) {
        console.log(`  ❌ TITLE MISMATCH`);
        issues.push(`Asset ${expected.id}: Title mismatch (registry="${asset.title}", expected="${expected.expectedTitle}")`);
      } else {
        console.log(`  ✅ Title matches`);
      }
      
      if (!tokenMatch) {
        console.log(`  ❌ TOKEN ADDRESS MISMATCH OR NOT SET`);
        issues.push(`Asset ${expected.id}: Token address ${asset.tokenAddress ? 'mismatch' : 'not set'} (registry="${asset.tokenAddress || 'NOT SET'}", expected="${expected.expectedToken}")`);
      } else {
        console.log(`  ✅ Token address matches`);
      }
      
    } catch (error: any) {
      console.error(`  ❌ Error: ${error.message}`);
      issues.push(`Asset ${expected.id}: Failed to check - ${error.message}`);
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  if (issues.length > 0) {
    console.log(`\n❌ Found ${issues.length} issue(s):\n`);
    issues.forEach((issue, i) => console.log(`${i + 1}. ${issue}`));
    console.log(`\n⚠️ Blockchain registry needs updates!`);
  } else {
    console.log(`\n✅ All assets perfectly aligned!`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
