/**
 * Safe ABI Loader for Vercel Builds
 * 
 * Handles loading contract ABIs with graceful fallback during Vercel builds
 * where smart-contracts/artifacts may not be available.
 */

import path from 'path';
import { readFileSync, existsSync } from 'fs';

const projectRoot = process.cwd();
const isVercelBuild = process.env.VERCEL === '1';

/**
 * Empty ABI stub for fallback
 */
const EMPTY_ABI = { abi: [] };

/**
 * Safely load a contract ABI from artifacts
 * Returns empty ABI during Vercel builds or if file doesn't exist
 */
export function loadContractABI(artifactPath: string): { abi: any[] } {
  // During Vercel builds, artifacts are excluded - return empty ABI
  if (isVercelBuild) {
    console.warn(`⚠️  Vercel build detected - using empty ABI for ${artifactPath}`);
    return EMPTY_ABI;
  }

  try {
    const fullPath = path.join(projectRoot, artifactPath);
    
    if (!existsSync(fullPath)) {
      console.warn(`⚠️  ABI file not found: ${fullPath} - using empty ABI`);
      return EMPTY_ABI;
    }

    const content = readFileSync(fullPath, 'utf-8');
    const parsed = JSON.parse(content);
    
    return {
      abi: parsed.abi || []
    };
  } catch (error) {
    console.warn(`⚠️  Failed to load ABI from ${artifactPath}:`, error);
    return EMPTY_ABI;
  }
}

/**
 * Lazy-loaded ABI getters - only load when accessed
 */
export const ContractABIs = {
  get RWAAssetRegistry() {
    return loadContractABI('smart-contracts/artifacts/contracts/core/RWAAssetRegistry.sol/RWAAssetRegistry.json');
  },
  
  get RWATokenFactory() {
    return loadContractABI('smart-contracts/artifacts/contracts/core/RWATokenFactory.sol/RWATokenFactory.json');
  },
  
  get RWATokenFactory404() {
    return loadContractABI('smart-contracts/artifacts/contracts/core/RWATokenFactory404.sol/RWATokenFactory404.json');
  },
  
  get RWAToken() {
    return loadContractABI('smart-contracts/artifacts/contracts/core/RWAToken.sol/RWAToken.json');
  },
  
  get RWAToken404() {
    return loadContractABI('smart-contracts/artifacts/contracts/core/RWAToken404.sol/RWAToken404.json');
  },
  
  get RWAMarketplace() {
    return loadContractABI('smart-contracts/artifacts/contracts/marketplace/RWAMarketplace.sol/RWAMarketplace.json');
  },
  
  get MembershipSystem() {
    return loadContractABI('smart-contracts/artifacts/contracts/membership/MembershipSystem.sol/MembershipSystem.json');
  },
};

