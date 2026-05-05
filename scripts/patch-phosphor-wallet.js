#!/usr/bin/env node

/**
 * Patch @phosphor-icons/webcomponents PhWallet.mjs to avoid empty height/width.
 * Error: <svg> attribute height: Unexpected end of attribute. Expected length, "".
 * Cause: this.size can be "" in some contexts; template becomes height="" which is invalid.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PhWalletPath = path.join(
  __dirname,
  '../node_modules/@phosphor-icons/webcomponents/dist/icons/PhWallet.mjs'
);

if (!fs.existsSync(PhWalletPath)) {
  console.warn('⚠️  PhWallet.mjs not found, skipping (run bun install first)');
  process.exit(0);
}

let content = fs.readFileSync(PhWalletPath, 'utf8');

if (content.includes('const s = this.size || "1em"')) {
  console.log('✅ PhWallet.mjs already patched');
  process.exit(0);
}

const bad = `  render() {
    var r;
    return h\`<svg
      xmlns="http://www.w3.org/2000/svg"
      width="\${this.size}"
      height="\${this.size}"`;
const good = `  render() {
    var r;
    const s = this.size || "1em";
    return h\`<svg
      xmlns="http://www.w3.org/2000/svg"
      width="\${s}"
      height="\${s}"`;

if (!content.includes(bad)) {
  console.warn('⚠️  PhWallet.mjs: expected pattern not found (package may have changed)');
  process.exit(0);
}

content = content.replace(bad, good);
fs.writeFileSync(PhWalletPath, content, 'utf8');
console.log('✅ Patched PhWallet.mjs to prevent empty SVG height/width');
