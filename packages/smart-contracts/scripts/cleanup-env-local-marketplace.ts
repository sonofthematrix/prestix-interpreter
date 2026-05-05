#!/usr/bin/env tsx
/**
 * Cleanup .env.local Marketplace Addresses
 * 
 * Removes duplicate and old marketplace address entries from .env.local
 * Keeps only the correct proxy address: 0x5295d340a0B06A2552C2169E5D238849550ea9Fe
 * 
 * Usage:
 *   cd smart-contracts
 *   bun run tsx scripts/cleanup-env-local-marketplace.ts
 */

import fs from 'fs';
import path from 'path';

const ENV_LOCAL_PATH = path.join(__dirname, '../../../.env.local');
const CORRECT_PROXY = '0x5295d340a0B06A2552C2169E5D238849550ea9Fe';
const OLD_ADDRESSES = [
  '0xc9C369525DFf385935dfDC6aC2F678C26998D0d7',
  '0x3E8b80714196ecB6925150347215bDF4C1420a8d',
];

function main() {
  console.log('🧹 Cleaning up .env.local marketplace addresses...\n');

  if (!fs.existsSync(ENV_LOCAL_PATH)) {
    console.log('❌ .env.local file not found at:', ENV_LOCAL_PATH);
    process.exit(1);
  }

  // Read file
  const content = fs.readFileSync(ENV_LOCAL_PATH, 'utf-8');
  const lines = content.split('\n');

  // Track which marketplace vars we've seen
  const seenVars = new Set<string>();
  const newLines: string[] = [];
  let removedCount = 0;
  let keptCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and comments
    if (!line || line.startsWith('#')) {
      newLines.push(lines[i]);
      continue;
    }

    // Check if this is a marketplace-related variable
    const isMarketplaceVar = 
      line.includes('RWA_MARKETPLACE') || 
      line.includes('MARKETPLACE') ||
      line.includes('NEXT_PUBLIC_RWA_MARKETPLACE');

    if (isMarketplaceVar) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').trim();
      const normalizedKey = key.trim();

      // Check if this is a duplicate or old address
      const isOldAddress = OLD_ADDRESSES.some(addr => 
        value.toLowerCase().includes(addr.toLowerCase())
      );
      const isDuplicate = seenVars.has(normalizedKey);
      const isCorrectAddress = value.toLowerCase().includes(CORRECT_PROXY.toLowerCase());

      if (isDuplicate || (isOldAddress && !isCorrectAddress)) {
        // Skip duplicates and old addresses (unless they're the correct one)
        console.log(`   ❌ Removing: ${normalizedKey}=${value.substring(0, 50)}...`);
        removedCount++;
        continue;
      }

      // Keep the correct address
      if (isCorrectAddress) {
        seenVars.add(normalizedKey);
        newLines.push(lines[i]);
        keptCount++;
        console.log(`   ✅ Keeping: ${normalizedKey}=${value.substring(0, 50)}...`);
      } else {
        // Keep other marketplace vars (like MARKETPLACE_FEE_BPS)
        newLines.push(lines[i]);
        keptCount++;
      }
    } else {
      // Keep non-marketplace lines
      newLines.push(lines[i]);
    }
  }

  // Write cleaned content
  const newContent = newLines.join('\n');
  fs.writeFileSync(ENV_LOCAL_PATH, newContent, 'utf-8');

  console.log(`\n✅ Cleanup complete!`);
  console.log(`   Removed: ${removedCount} duplicate/old entries`);
  console.log(`   Kept: ${keptCount} correct entries`);
  console.log(`\n📝 Updated .env.local file saved.`);
}

main();

