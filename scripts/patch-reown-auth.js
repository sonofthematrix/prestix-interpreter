#!/usr/bin/env node

/**
 * Patch ReownAuthentication to prioritize window.location.origin for /auth/v1/* requests
 *
 * This ensures that ReownAuthentication always uses our local /auth/v1/nonce and /auth/v1/authenticate
 * endpoints instead of api.web3modal.org, enabling EIP-1271 support for embedded/social wallets.
 *
 * Patches BOTH:
 * 1. packages/reown-appkit-module (local package, if present)
 * 2. node_modules/@reown/appkit-controllers (the bundle Next.js actually uses)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

function isMainModule() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return fileURLToPath(import.meta.url) === path.resolve(entry);
  } catch {
    return false;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REOWN_AUTH_TS = path.join(
  __dirname,
  '../packages/reown-appkit-module/features/siwx/reown-authentication/ReownAuthentication.ts'
);

const REOWN_AUTH_JS = path.join(
  __dirname,
  '../node_modules/@reown/appkit-controllers/dist/esm/src/features/siwx/reown-authentication/ReownAuthentication.js'
);

// Pattern used in packages ReownAuthentication.ts (alreadyPatchedPattern defined before use)
const alreadyPatchedPattern = /const apiUrl\s*=\s*\([^)]*window\.location[^)]*\)\s*\|\|\s*\([^)]*process\.env\.NEXT_PUBLIC_W3M_API_URL[^)]*\)\s*\|\|\s*'https:\/\/api\.web3modal\.org'/s;

/**
 * Patch node_modules ReownAuthentication.js so nonce/authenticate/me use app origin.
 * Next.js bundles this file; the packages/ copy is not used by the app.
 */
function patchNodeModulesReownAuth() {
  if (!fs.existsSync(REOWN_AUTH_JS)) {
    console.warn('⚠️  node_modules ReownAuthentication.js not found, skipping (run npm install first)');
    return;
  }

  let content = fs.readFileSync(REOWN_AUTH_JS, 'utf8');

  // Current origin first: use window.location.origin when in browser so we never use build-time localhost on production.
  const runtimeOriginFirst =
    "const w = typeof window !== 'undefined' && window.location && window.location.origin;\n        const apiUrl = w || (typeof window !== 'undefined' && window.__appkit_auth_origin__) || (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_W3M_API_URL) || ConstantsUtil.W3M_API_URL;\n        const url = new URL(" +
    "`${apiUrl}/auth/v1/${String(key)}`);";

  if (content.includes("const apiUrl = w ||")) {
    console.log('✅ node_modules ReownAuthentication.js already patched (origin first)');
    return;
  }

  const originalLine = "const url = new URL(`${ConstantsUtil.W3M_API_URL}/auth/v1/${String(key)}`);";
  const oldPatchedTwoLine =
    "const apiUrl = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_W3M_API_URL) || (typeof window !== 'undefined' && window.__appkit_auth_origin__) || (typeof window !== 'undefined' && window.location && window.location.origin) || ConstantsUtil.W3M_API_URL;\n        const url = new URL(`${apiUrl}/auth/v1/${String(key)}`);";

  if (content.includes("const w = typeof window !== 'undefined'")) {
    content = content.replace(
      /const w = typeof window !== 'undefined' && window\.location && window\.location\.origin;\s*\n\s*const apiUrl = \([^)]+\) \|\| \([^)]+\) \|\| \([^)]+\) \|\| \([^)]+\) \|\| ConstantsUtil\.W3M_API_URL;\s*\n\s*const url = new URL\([^)]+\);/,
      runtimeOriginFirst
    );
  }
  if (!content.includes("const apiUrl = w ||")) {
    if (content.includes(oldPatchedTwoLine)) {
      content = content.replace(oldPatchedTwoLine, runtimeOriginFirst);
    } else if (content.includes(originalLine)) {
      content = content.replace(originalLine, runtimeOriginFirst);
    } else if (content.includes("const apiUrl = (typeof process !== 'undefined'")) {
      content = content.replace(
        /const apiUrl = \(typeof process !== 'undefined'[^;]+;\s*\n\s*const url = new URL\([^)]+\);/,
        runtimeOriginFirst
      );
    } else {
      console.warn('⚠️  node_modules ReownAuthentication.js: URL block not found (package version may have changed)');
      return;
    }
  }
  fs.writeFileSync(REOWN_AUTH_JS, content, 'utf8');
  console.log('✅ Patched node_modules ReownAuthentication.js (current origin first)');
}

function patchReownAuthentication() {
  if (!fs.existsSync(REOWN_AUTH_TS)) {
    console.warn('⚠️  ReownAuthentication.ts not found, skipping packages patch');
  } else {
    patchPackagesReownAuth();
  }
  patchNodeModulesReownAuth();
}

function patchPackagesReownAuth() {
  let content = fs.readFileSync(REOWN_AUTH_TS, 'utf8');

  if (content.includes('__patched_reown_auth__') || alreadyPatchedPattern.test(content)) {
    console.log('✅ packages ReownAuthentication.ts already patched');
    return;
  }

  const apiUrlPattern = /const apiUrl\s*=\s*\([^)]*process\.env\.NEXT_PUBLIC_W3M_API_URL[^)]*\)\s*\|\|\s*\([^)]*window\.location[^)]*\)\s*\|\|\s*'https:\/\/api\.web3modal\.org'/s;
  
  const patchedApiUrl = `const apiUrl =
      // ✅ PATCHED: Prioritize window.location.origin for /auth/v1/* requests to enable EIP-1271 support
      // This ensures embedded/social wallets use our local endpoints instead of Reown Cloud
      // Reordered to check window.location.origin FIRST, then env var, then fallback to Reown Cloud
      (typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : null) ||
      (typeof process.env.NEXT_PUBLIC_W3M_API_URL === 'string' && process.env.NEXT_PUBLIC_W3M_API_URL.length > 0
        ? process.env.NEXT_PUBLIC_W3M_API_URL
        : null) ||
      'https://api.web3modal.org'
      
      // Mark as patched
      // @ts-ignore
      const __patched_reown_auth__ = true;`;

  if (apiUrlPattern.test(content)) {
    content = content.replace(apiUrlPattern, patchedApiUrl);
    fs.writeFileSync(REOWN_AUTH_TS, content, 'utf8');
    console.log('✅ Patched packages ReownAuthentication.ts for auth/v1 origin');
  } else {
    const flexiblePattern = /const apiUrl\s*=\s*\([^)]*\)\s*\|\|\s*\([^)]*\)\s*\|\|\s*'https:\/\/api\.web3modal\.org'/s;
    if (flexiblePattern.test(content)) {
      const match = content.match(flexiblePattern);
      if (match) {
        const original = match[0];
        if (original.includes('window.location') && original.includes('process.env.NEXT_PUBLIC_W3M_API_URL')) {
          content = content.replace(flexiblePattern, patchedApiUrl);
          fs.writeFileSync(REOWN_AUTH_TS, content, 'utf8');
          console.log('✅ Patched packages ReownAuthentication.ts (flexible match)');
        } else {
          console.warn('⚠️  packages ReownAuthentication.ts: apiUrl order unexpected');
        }
      }
    } else {
      console.warn('⚠️  packages ReownAuthentication.ts: apiUrl pattern not found');
    }
  }
}

if (isMainModule()) {
  patchReownAuthentication();
}

export { patchReownAuthentication };
