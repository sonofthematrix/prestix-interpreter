#!/usr/bin/env tsx
/**
 * Frontend Configuration Verification Script
 * 
 * Verifies that frontend environment variables match the deployed contract addresses.
 * Checks API endpoints and frontend code for correct token addresses.
 * 
 * Usage:
 *   cd smart-contracts
 *   bun run tsx scripts/verify-frontend-config.ts
 *   OR
 *   npx hardhat run scripts/verify-frontend-config.ts --network sepolia
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';

// Load addresses from deployment file
function loadDeploymentAddresses(): any {
  const deploymentPath = path.join(__dirname, '../deployed-addresses-proxy.json');
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment file not found: ${deploymentPath}`);
  }
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  return deployment.addresses;
}

const addresses = loadDeploymentAddresses();
const MARKETPLACE_PROXY = addresses.RWAMarketplace;
const MARKETPLACE_IMPLEMENTATION = addresses.RWAMarketplace_Implementation;
const TPT_TOKEN_PROXY = addresses.KAGE || addresses.TPT || '0xb0af8e94C74c2346609c3d94FCba61Ae85cf3e6e'; // Fallback for TPT
const TPT_IMPLEMENTATION = addresses.KAGE_Implementation || '0x4EDc5EbfDA5986F5389763f6bf297480095c7379'; // Fallback
const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'; // Test USDC
const EURC_ADDRESS = '0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4'; // Test EURC

interface ConfigCheck {
  name: string;
  envVar: string;
  expected: string;
  actual?: string;
  status: 'missing' | 'correct' | 'incorrect' | 'not-set';
  file?: string;
  line?: number;
}

const checks: ConfigCheck[] = [];

function checkEnvFile(filePath: string, isRoot: boolean = false): void {
  // Resolve paths correctly - go up from smart-contracts/scripts to project root
  const projectRoot = path.resolve(__dirname, '../..');
  const fullPath = isRoot ? path.join(projectRoot, filePath) : path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`   ⚠️  ${filePath} not found at ${fullPath}`);
    return;
  }
  
  console.log(`   ✅ Found ${filePath} at ${fullPath}`);
  const content = fs.readFileSync(fullPath, 'utf-8');
  
  // Debug: Show first few lines if file is very small
  if (content.length < 500) {
    console.log(`   📄 Content preview: ${content.substring(0, 200)}...`);
  }
  
  // Check each required variable
  const requiredVars = [
    { name: 'Marketplace Proxy', var: 'NEXT_PUBLIC_RWA_MARKETPLACE', expected: MARKETPLACE_PROXY },
    { name: 'TPT Token', var: 'NEXT_PUBLIC_TPT_ADDRESS', expected: TPT_TOKEN_PROXY },
    { name: 'USDC Token', var: 'NEXT_PUBLIC_USDC_ADDRESS', expected: USDC_ADDRESS },
    { name: 'EURC Token', var: 'NEXT_PUBLIC_EURC_ADDRESS', expected: EURC_ADDRESS },
  ];
  
  for (const { name, var: envVar, expected } of requiredVars) {
    // Match env var with optional whitespace, =, and value (handles comments after value)
    const regex = new RegExp(`^\\s*${envVar}\\s*=\\s*([^\\s#]+)`, 'm');
    const match = content.match(regex);
    
    if (match) {
      const actual = match[1].trim();
      const status = actual.toLowerCase() === expected.toLowerCase() ? 'correct' : 'incorrect';
      checks.push({
        name,
        envVar,
        expected,
        actual,
        status,
        file: filePath,
      });
    } else {
      // Check if variable exists but commented out
      const commentedRegex = new RegExp(`^\\s*#.*${envVar}`, 'm');
      const isCommented = content.match(commentedRegex);
      
      checks.push({
        name,
        envVar,
        expected,
        status: isCommented ? 'not-set' : 'not-set',
        file: filePath,
      });
    }
  }
}

function checkCodeFiles(): void {
  console.log('\n📝 Checking code files for hardcoded addresses...\n');
  
  const codeFiles = [
    'packages/reown-appkit-module/src/app/api/tiger-wallet/balances/route.ts',
    'packages/reown-appkit-module/src/components/TigerRWAWallet/hooks/useTigerWalletData.ts',
    'src/app/api/tiger-wallet/balances/route.ts', // Also check root src directory
  ];
  
  for (const filePath of codeFiles) {
    // Resolve from project root (go up from smart-contracts/scripts)
    const projectRoot = path.resolve(__dirname, '../..');
    const fullPath = path.join(projectRoot, filePath);
    if (!fs.existsSync(fullPath)) {
      console.log(`   ⚠️  ${filePath} not found`);
      continue;
    }
    
    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');
    
    // Check for hardcoded addresses
    const hardcodedAddresses = [
      { name: 'USDC', address: USDC_ADDRESS },
      { name: 'EURC', address: EURC_ADDRESS },
      { name: 'TPT', address: TPT_TOKEN_PROXY },
      { name: 'Marketplace', address: MARKETPLACE_PROXY },
    ];
    
    for (const { name, address } of hardcodedAddresses) {
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(address)) {
          // Check if it's a fallback default (acceptable) or hardcoded (needs env var)
          if (lines[i].includes('process.env') || lines[i].includes('||')) {
            // It's using env var with fallback - this is OK
            continue;
          } else {
            console.log(`   ⚠️  ${filePath}:${i + 1} - Hardcoded ${name} address found (should use env var)`);
          }
        }
      }
    }
  }
}

function generateEnvTemplate(): string {
  return `# Tiger Palace Pro - Sepolia Testnet Contract Addresses
# Generated by verify-frontend-config.ts

# Marketplace Contract (Proxy - use this address)
NEXT_PUBLIC_RWA_MARKETPLACE=${MARKETPLACE_PROXY}

# Token Addresses
NEXT_PUBLIC_TPT_ADDRESS=${TPT_TOKEN_PROXY}
NEXT_PUBLIC_USDC_ADDRESS=${USDC_ADDRESS}
NEXT_PUBLIC_EURC_ADDRESS=${EURC_ADDRESS}

# RPC Configuration
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
# OR use public RPC:
# SEPOLIA_RPC_URL=https://rpc.sepolia.org

# Optional: Marketplace Configuration
MARKETPLACE_FEE_BPS=250
`;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   FRONTEND CONFIGURATION VERIFICATION                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log('📋 Contract Addresses (from setup script):');
  console.log(`   Marketplace Proxy: ${MARKETPLACE_PROXY}`);
  console.log(`   TPT Token Proxy: ${TPT_TOKEN_PROXY}`);
  console.log(`   USDC Token: ${USDC_ADDRESS}`);
  console.log(`   EURC Token: ${EURC_ADDRESS}\n`);
  
  console.log('🔍 Checking environment files...\n');
  
  // Check root .env files
  checkEnvFile('.env', true);
  checkEnvFile('.env.local', true);
  
  // Check smart-contracts .env files
  checkEnvFile('.env', false);
  checkEnvFile('.env.local', false);
  
  // Check packages/reown-appkit-module .env files
  const appkitEnvPath = path.join(process.cwd(), 'packages/reown-appkit-module');
  if (fs.existsSync(path.join(appkitEnvPath, '.env'))) {
    checkEnvFile('packages/reown-appkit-module/.env', true);
  }
  if (fs.existsSync(path.join(appkitEnvPath, '.env.local'))) {
    checkEnvFile('packages/reown-appkit-module/.env.local', true);
  }
  
  // Check code files
  checkCodeFiles();
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(70) + '\n');
  
  const correct = checks.filter(c => c.status === 'correct').length;
  const incorrect = checks.filter(c => c.status === 'incorrect').length;
  const missing = checks.filter(c => c.status === 'not-set' || c.status === 'missing').length;
  
  console.log(`✅ Correct: ${correct}`);
  console.log(`❌ Incorrect: ${incorrect}`);
  console.log(`⚠️  Missing/Not Set: ${missing}\n`);
  
  if (incorrect > 0 || missing > 0) {
    console.log('📝 Issues Found:\n');
    
    for (const check of checks) {
      if (check.status === 'incorrect') {
        console.log(`❌ ${check.name} (${check.envVar})`);
        console.log(`   Expected: ${check.expected}`);
        console.log(`   Found: ${check.actual}`);
        console.log(`   File: ${check.file}\n`);
      } else if (check.status === 'not-set' || check.status === 'missing') {
        console.log(`⚠️  ${check.name} (${check.envVar}) - Not set`);
        console.log(`   Expected: ${check.expected}`);
        console.log(`   File: ${check.file || 'Not found'}\n`);
      }
    }
    
    console.log('\n💡 Solution: Create or update .env.local file with:');
    console.log('='.repeat(70));
    console.log(generateEnvTemplate());
    console.log('='.repeat(70));
  } else {
    console.log('✅ All environment variables are correctly configured!\n');
  }
  
  console.log('📝 Next Steps:');
  console.log('   1. ✅ Verify token addresses in frontend environment variables');
  console.log('   2. 🔄 Test marketplace functionality with test transactions');
  console.log('   3. ✅ Configure frontend to use these token addresses');
  console.log('   4. ✅ Update API endpoints to reference these addresses');
  console.log('\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });

