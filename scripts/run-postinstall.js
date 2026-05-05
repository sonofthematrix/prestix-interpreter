#!/usr/bin/env node

/**
 * Postinstall script runner that gracefully handles missing patch scripts
 * This ensures Vercel builds don't fail if patch scripts aren't included in deployment
 *
 * ZenStack v3: Remove nested Zod 3 from @zenstackhq/orm so the ORM uses the project's
 * Zod 4 (z.iso.datetime required for DateTime filters). Otherwise seeds and any
 * findFirst/upsert with DateTime in the tree fail with z.iso.datetime undefined.
 */

import { existsSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const scriptsDir = __dirname;
const rootDir = join(__dirname, '..');

function runScript(scriptName, command) {
  const scriptPath = join(scriptsDir, scriptName);
  
  if (!existsSync(scriptPath)) {
    console.log(`⚠️  ${scriptName} not found, skipping (this is normal in some deployment environments)`);
    return true; // Success - script doesn't need to run
  }
  
  try {
    console.log(`🔧 Running ${scriptName}...`);
    execSync(command, { 
      stdio: 'inherit', 
      cwd: rootDir,
      env: { ...process.env }
    });
    console.log(`✅ ${scriptName} completed successfully`);
    return true;
  } catch (error) {
    console.error(`❌ ${scriptName} failed:`, error.message);
    // Don't fail the build if patch scripts fail - they're optional optimizations
    console.warn(`⚠️  Continuing despite ${scriptName} failure (patches are optional)`);
    return false;
  }
}

// Check if scripts directory exists
if (!existsSync(scriptsDir)) {
  console.log('ℹ️  Scripts directory not found, skipping patches');
  process.exit(0);
}

try {
  // ZenStack v3: ensure ORM uses project Zod 4 (removes nested zod 3 so z.iso.datetime exists)
  const nestedZod = join(rootDir, 'node_modules/@zenstackhq/orm/node_modules/zod');
  if (existsSync(nestedZod)) {
    try {
      rmSync(nestedZod, { recursive: true });
      console.log('✅ Removed nested Zod 3 from @zenstackhq/orm (ZenStack v3 uses root Zod 4)');
    } catch (_) {
      // ignore
    }
  }

  // Run patch scripts if they exist
  const patchTokenUtil = runScript('patch-tokenutil.js', 'node scripts/patch-tokenutil.js');
  const patchReownAuth = runScript('patch-reown-auth.js', 'bun scripts/patch-reown-auth.js');
  runScript('patch-phosphor-wallet.js', 'node scripts/patch-phosphor-wallet.js');

  if (!patchTokenUtil && !patchReownAuth) {
    console.log('ℹ️  No patch scripts found or executed. This is normal in some deployment environments.');
  }

  console.log('✅ Postinstall completed');
  process.exit(0);
} catch (error) {
  // Exit successfully even on error - patches are optional
  // Don't log error details to avoid noise in build logs
  console.log('ℹ️  Postinstall patches skipped (optional)');
  process.exit(0);
}
