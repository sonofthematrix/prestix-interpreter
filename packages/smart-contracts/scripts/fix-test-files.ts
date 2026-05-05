#!/usr/bin/env node
/**
 * Test File Auto-Fix Script
 * 
 * Automatically fixes common issues in test files:
 * - Pool ID fixes (0 → 1)
 * - Function name replacements
 * - Access control fixes
 */

import * as fs from 'fs';
import * as path from 'path';

interface FixPattern {
  pattern: RegExp;
  replacement: string | ((match: string, ...args: string[]) => string);
  description: string;
}

const FIX_PATTERNS: FixPattern[] = [
  // Pool ID fixes - more comprehensive patterns
  {
    pattern: /(const|let)\s+poolId\s*=\s*0\s*;?\s*(?:\/\/.*)?$/gm,
    replacement: '$1 poolId = 1; // First pool (pools start at ID 1)',
    description: 'Fix pool ID variable declaration 0 → 1'
  },
  {
    pattern: /poolId\s*=\s*0\s*;?\s*\/\/\s*Default pool/gi,
    replacement: 'poolId = 1; // First pool (pools start at ID 1)',
    description: 'Fix pool ID 0 → 1 with comment'
  },
  {
    pattern: /poolId\s*=\s*0\s*;?\s*\/\/\s*First pool/gi,
    replacement: 'poolId = 1; // First pool',
    description: 'Fix pool ID 0 → 1'
  },
  {
    pattern: /\.stake\(\s*0\s*,/g,
    replacement: '.stake(1,',
    description: 'Fix stake pool ID 0 → 1'
  },
  {
    pattern: /\.stake\(defaultPoolId\s*,/g,
    replacement: '.stake(defaultPoolId,',
    description: 'Keep defaultPoolId (should be fixed in fixture)'
  },
  {
    pattern: /defaultPoolId\s*=\s*0\s*;?/g,
    replacement: 'defaultPoolId = 1;',
    description: 'Fix defaultPoolId variable 0 → 1'
  },
  {
    pattern: /getPool\(\s*0\s*\)/g,
    replacement: 'getPool(1)',
    description: 'Fix getPool(0) → getPool(1)'
  },
  {
    pattern: /getUserStakes.*filter.*poolId\s*===\s*0/g,
    replacement: (match: string) => match.replace(/poolId\s*===\s*0/, 'poolId === 1'),
    description: 'Fix filter poolId === 0 → 1'
  },
  
  // Function name fixes
  {
    pattern: /\.userWithdraw\(/g,
    replacement: '.claimRewards(',
    description: 'Fix userWithdraw → claimRewards'
  },
  {
    pattern: /\.kageGetIndividualStakeInfo\(/g,
    replacement: '.getUserStake(',
    description: 'Fix kageGetIndividualStakeInfo → getUserStake'
  },
  {
    pattern: /\.poolInfo\(/g,
    replacement: '.getPool(',
    description: 'Fix poolInfo → getPool'
  },
  {
    pattern: /\.kageTotalStaked\(/g,
    replacement: '.getStats().totalStaked',
    description: 'Fix kageTotalStaked → getStats().totalStaked'
  },
  {
    pattern: /\.rwaCreatePool\(/g,
    replacement: '.createPool(',
    description: 'Fix rwaCreatePool → createPool (needs parameter adjustment)'
  },
  {
    pattern: /\.kageCreatePool\(/g,
    replacement: '.createPool(',
    description: 'Fix kageCreatePool → createPool (needs parameter adjustment)'
  },
  {
    pattern: /\.rwaPause\(\)/g,
    replacement: '.pause()',
    description: 'Fix rwaPause → pause'
  },
  {
    pattern: /\.rwaUnpause\(\)/g,
    replacement: '.unpause()',
    description: 'Fix rwaUnpause → unpause'
  },
  
  // Access control fixes
  {
    pattern: /await\s+TigerStaking\.createPool\(/g,
    replacement: 'await TigerStaking.connect(deployer).createPool(',
    description: 'Add deployer connection for createPool'
  },
  {
    pattern: /await\s+TigerStaking\.pause\(\)/g,
    replacement: 'await TigerStaking.connect(deployer).pause()',
    description: 'Add deployer connection for pause'
  },
  {
    pattern: /await\s+TigerStaking\.unpause\(\)/g,
    replacement: 'await TigerStaking.connect(deployer).unpause()',
    description: 'Add deployer connection for unpause'
  },
  {
    pattern: /await\s+TigerStaking\.distributeRewards\(/g,
    replacement: 'await TigerStaking.connect(deployer).distributeRewards(',
    description: 'Add deployer connection for distributeRewards'
  },
  {
    pattern: /await\s+TigerStaking\.updatePoolConfig\(/g,
    replacement: 'await TigerStaking.connect(deployer).updatePoolConfig(',
    description: 'Add deployer connection for updatePoolConfig'
  },
];

// Special fixes that need context awareness
const CONTEXTUAL_FIXES = [
  {
    // Fix createPool parameter format
    pattern: /\.createPool\(\s*ethers\.parseEther\(["'](\d+)["']\)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g,
    replacement: (match: string, minStaked: string, apy: string, penaltyRate: string) => {
      // Convert APY to basis points multiplier
      const apyNum = parseInt(apy);
      const multiplier = apyNum >= 10000 ? apyNum : apyNum * 100;
      const duration = 30 * 24 * 60 * 60; // 30 days default
      return `.createPool("Pool ${Date.now()}", ${duration}, ${multiplier})`;
    },
    description: 'Fix createPool parameter format'
  },
  {
    // Fix getUserStake parameter order (user, stakeId) not (user, poolId, stakeId)
    pattern: /\.getUserStake\(\s*([^,]+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g,
    replacement: '.getUserStake($1, $3)',
    description: 'Fix getUserStake parameter order'
  },
];

function applyFixes(content: string, filePath: string): { content: string; fixes: string[] } {
  let fixedContent = content;
  const appliedFixes: string[] = [];

  // Apply simple pattern replacements
  for (const fix of FIX_PATTERNS) {
    const matches = fixedContent.match(fix.pattern);
    if (matches && matches.length > 0) {
      if (typeof fix.replacement === 'function') {
        fixedContent = fixedContent.replace(fix.pattern, fix.replacement as any);
      } else {
        fixedContent = fixedContent.replace(fix.pattern, fix.replacement);
      }
      appliedFixes.push(`${fix.description}: ${matches.length} occurrence(s)`);
    }
  }

  // Apply contextual fixes
  for (const fix of CONTEXTUAL_FIXES) {
    const matches = fixedContent.match(fix.pattern);
    if (matches && matches.length > 0) {
      if (typeof fix.replacement === 'function') {
        fixedContent = fixedContent.replace(fix.pattern, fix.replacement as any);
        appliedFixes.push(`${fix.description}: ${matches.length} occurrence(s)`);
      }
    }
  }

  return { content: fixedContent, fixes: appliedFixes };
}

function getAllTestFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllTestFiles(filePath, fileList);
    } else if (file.endsWith('.spec.ts')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

async function fixTestFiles() {
  // Determine test directory - handle both root and smart-contracts directory execution
  const currentDir = process.cwd();
  let testDir: string;
  
  // Check if we're in smart-contracts directory (test dir exists here)
  const testDirInCurrent = path.join(currentDir, 'test');
  if (fs.existsSync(testDirInCurrent)) {
    testDir = testDirInCurrent;
  } else {
    // Otherwise, assume we're in root and test is in smart-contracts/test
    testDir = path.join(currentDir, 'smart-contracts', 'test');
  }
  
  // Check if test directory exists
  if (!fs.existsSync(testDir)) {
    console.error(`❌ Test directory not found: ${testDir}`);
    console.error(`   Current directory: ${currentDir}`);
    console.error(`   Tried: ${testDirInCurrent}`);
    process.exit(1);
  }
  
  const testFiles = getAllTestFiles(testDir);

  console.log(`🔍 Found ${testFiles.length} test files to check\n`);

  let totalFixed = 0;
  const results: Array<{ file: string; fixes: string[] }> = [];

  for (const filePath of testFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const { content: fixedContent, fixes } = applyFixes(content, filePath);

      if (fixes.length > 0) {
        fs.writeFileSync(filePath, fixedContent, 'utf-8');
        totalFixed++;
        results.push({ file: path.relative(testDir, filePath), fixes });
        console.log(`✅ Fixed: ${path.relative(testDir, filePath)}`);
        fixes.forEach(fix => console.log(`   - ${fix}`));
      }
    } catch (error: any) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Files checked: ${testFiles.length}`);
  console.log(`   Files fixed: ${totalFixed}`);
  console.log(`   Files unchanged: ${testFiles.length - totalFixed}`);

  // Write summary report
  const reportDir = currentDir.endsWith('smart-contracts') ? currentDir : path.join(currentDir, 'smart-contracts');
  const reportPath = path.join(reportDir, 'TEST_FIX_REPORT.md');
  const report = `# Test Fix Report

Generated: ${new Date().toISOString()}

## Summary
- Files checked: ${testFiles.length}
- Files fixed: ${totalFixed}
- Files unchanged: ${testFiles.length - totalFixed}

## Fixed Files

${results.map(r => `### ${r.file}\n${r.fixes.map(f => `- ${f}`).join('\n')}`).join('\n\n')}
`;

  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log(`\n📝 Report written to: ${reportPath}`);
}

// Run if executed directly
// Bun doesn't support require.main, so always run
fixTestFiles().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});

export { fixTestFiles, applyFixes };

