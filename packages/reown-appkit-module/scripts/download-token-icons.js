#!/usr/bin/env node
/**
 * Download Token Icons Script
 * 
 * Downloads token icons from official sources and saves them to public/tokens/
 * 
 * Usage: bun run scripts/download-token-icons.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOKEN_ICONS = {
  ETH: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
  USDC: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png',
  EURC: 'https://assets.coingecko.com/coins/images/26045/large/euro-coin.png',
  // TKNZN will need to be created manually or from contract
};

const TOKENS_DIR = path.join(__dirname, '../public/tokens');

async function downloadIcon(symbol, url) {
  try {
    console.log(`📥 Downloading ${symbol} icon from ${url}...`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download ${symbol}: ${response.status} ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    const filePath = path.join(TOKENS_DIR, `${symbol.toLowerCase()}.png`);
    
    fs.writeFileSync(filePath, Buffer.from(buffer));
    console.log(`✅ Saved ${symbol} icon to ${filePath}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to download ${symbol} icon:`, error.message);
    return false;
  }
}

async function main() {
  // Create tokens directory if it doesn't exist
  if (!fs.existsSync(TOKENS_DIR)) {
    fs.mkdirSync(TOKENS_DIR, { recursive: true });
    console.log(`📁 Created directory: ${TOKENS_DIR}`);
  }
  
  console.log('🚀 Starting token icon download...\n');
  
  const results = await Promise.all(
    Object.entries(TOKEN_ICONS).map(([symbol, url]) => 
      downloadIcon(symbol, url).then(success => ({ symbol, success }))
    )
  );
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`\n📊 Download Summary:`);
  console.log(`   ✅ Successful: ${successful}`);
  console.log(`   ❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log(`\n⚠️  Some icons failed to download. You may need to:`);
    console.log(`   1. Download them manually from the URLs above`);
    console.log(`   2. Save them as ${TOKENS_DIR}/{symbol}.png`);
    console.log(`   3. For TKNZN, create a custom icon or use contract metadata`);
  }
  
  console.log(`\n💡 Note: TKNZN (Tokenizin Token) icon needs to be created manually`);
  console.log(`   Save it as: ${TOKENS_DIR}/daoble.png`);
}

main().catch(console.error);

