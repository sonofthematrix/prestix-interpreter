import { renameSync, existsSync } from 'fs';
import { join } from 'path';

const v2Dir = join(__dirname, '../contracts/usdc/v2');
const filesToDisable = [
  'AbstractFiatTokenV2.sol',
  'FiatTokenV2.sol',
  'FiatTokenV2_1.sol',
  'FiatTokenV2_2.sol',
  'EIP2612.sol',
  'EIP3009.sol'
];

console.log('📦 Disabling USDC v2 contracts that require missing v1 dependencies...\n');
console.log(`Working directory: ${process.cwd()}`);
console.log(`Target directory: ${v2Dir}\n`);

let moved = 0;
for (const file of filesToDisable) {
  const filePath = join(v2Dir, file);
  const disabledPath = join(v2Dir, `${file}.disabled`);
  
  if (existsSync(filePath)) {
    try {
      renameSync(filePath, disabledPath);
      console.log(`✅ Renamed: ${file} → ${file}.disabled`);
      moved++;
    } catch (error: any) {
      console.error(`❌ Failed to rename ${file}: ${error.message}`);
    }
  } else {
    console.log(`⚠️  File not found: ${file}`);
  }
}

console.log(`\n✅ Disabled ${moved} files`);
console.log('💡 You can now run: bun run compile');
console.log('💡 To restore: Remove .disabled extension from filenames');

