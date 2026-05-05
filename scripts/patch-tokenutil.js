#!/usr/bin/env node

/**
 * Postinstall script to patch @reown/appkit-utils TokenUtil.js
 * 
 * This script patches the TokenUtil.js file to prevent "Cannot read properties of null (reading 'asset')" errors
 * by using lazy initialization instead of accessing .asset during module initialization.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tokenUtilPath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@reown',
  'appkit-utils',
  'dist',
  'esm',
  'src',
  'TokenUtil.js'
);

const patchedContent = `// ✅ PATCHED: This file has been patched to prevent "Cannot read properties of null (reading 'asset')" errors
// Original file tried to access baseUSDC.asset and baseSepoliaUSDC.asset during module initialization,
// but these can be null. This patched version uses lazy initialization.

// Lazy initialization - only access baseUSDC/baseSepoliaUSDC when actually needed
let _tokenAddressesCache = null;

function getTokenAddressesBySymbol() {
  if (_tokenAddressesCache) {
    return _tokenAddressesCache;
  }
  
  // Safe access to .asset property - return undefined if null
  const safeGetAsset = (obj) => {
    if (!obj || obj === null || obj === undefined) return undefined;
    try {
      return obj.asset;
    } catch (e) {
      return undefined;
    }
  };
  
  let baseUSDC = null;
  let baseSepoliaUSDC = null;
  
  try {
    // Use require() - webpack will transpile this correctly
    // The lazy getter ensures this only runs when TOKEN_ADDRESSES_BY_SYMBOL is accessed
    const controllersModule = require('@reown/appkit-controllers');
    if (controllersModule) {
      baseUSDC = controllersModule.baseUSDC || null;
      baseSepoliaUSDC = controllersModule.baseSepoliaUSDC || null;
    }
  } catch (e) {
    // If import fails, baseUSDC and baseSepoliaUSDC will remain null
    // This is safe - safeGetAsset will handle null values
  }
  
  _tokenAddressesCache = {
    USDC: {
      8453: safeGetAsset(baseUSDC),
      84532: safeGetAsset(baseSepoliaUSDC)
    }
  };
  
  return _tokenAddressesCache;
}

export const TokenUtil = {
  get TOKEN_ADDRESSES_BY_SYMBOL() {
    return getTokenAddressesBySymbol();
  },
  getTokenSymbolByAddress(tokenAddress) {
    if (!tokenAddress) {
      return undefined;
    }
    const addresses = TokenUtil.TOKEN_ADDRESSES_BY_SYMBOL;
    const [symbol] = Object.entries(addresses).find(([_, addressesByChain]) => 
      Object.values(addressesByChain).includes(tokenAddress)
    ) ?? [];
    return symbol;
  }
};
//# sourceMappingURL=TokenUtil.js.map
`;

try {
  // Check if the file exists
  if (fs.existsSync(tokenUtilPath)) {
    // Read the original file to check if it's already patched
    const originalContent = fs.readFileSync(tokenUtilPath, 'utf8');
    
    if (originalContent.includes('✅ PATCHED')) {
      console.log('✅ [patch-tokenutil] TokenUtil.js is already patched');
    } else {
      // Backup the original file
      const backupPath = tokenUtilPath + '.backup';
      if (!fs.existsSync(backupPath)) {
        fs.writeFileSync(backupPath, originalContent, 'utf8');
        console.log('📦 [patch-tokenutil] Created backup of original TokenUtil.js');
      }
      
      // Write the patched version
      fs.writeFileSync(tokenUtilPath, patchedContent, 'utf8');
      console.log('✅ [patch-tokenutil] Successfully patched TokenUtil.js');
    }
  } else {
    console.warn('⚠️ [patch-tokenutil] TokenUtil.js not found at:', tokenUtilPath);
    console.warn('⚠️ [patch-tokenutil] This is normal if @reown/appkit-utils is not installed yet');
  }
} catch (error) {
  console.error('❌ [patch-tokenutil] Error patching TokenUtil.js:', error.message);
  process.exit(1);
}
