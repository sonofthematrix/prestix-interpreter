# Hardhat Configuration Fix Instructions

## Current Problem

The tests are failing because of incompatible plugin versions with Hardhat 3.0.8. The error:
```
TypeError: Class extends value undefined is not a constructor or null
at @nomicfoundation/hardhat-ethers/src/internal/errors.ts:3:41
```

This is a known incompatibility between Hardhat 3.x and the current ethers plugin versions.

## Solution: Use Hardhat 2.x (Recommended)

Hardhat 2.x is more stable and has better plugin compatibility.

### Step 1: Update package.json

Replace the hardhat version:
```json
{
  "devDependencies": {
    "hardhat": "^2.22.15",
    "@nomicfoundation/hardhat-chai-matchers": "^2.1.0",
    "@nomicfoundation/hardhat-ethers": "^3.1.0",
    "@nomicfoundation/hardhat-network-helpers": "^1.0.8",
    "@nomicfoundation/hardhat-verify": "^2.0.10",
    // ... keep other dependencies
  }
}
```

Remove `"type": "module"` from package.json (Hardhat 2.x uses CommonJS)

### Step 2: Update tsconfig.json

```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "commonjs",  // Change from ES2022 to commonjs
    "lib": ["es2022"],
    // ... rest of config
  }
}
```

### Step 3: Clean Install

```bash
cd /Users/alexshapiro/tigerpalacepro/zenstack-docs/smart-contracts
rm -rf node_modules bun run .lock
bun install
```

### Step 4: Run Tests

```bash
bun run test test/revenue-distribution-tier-testing.spec.ts
```

## Alternative: Stay with Hardhat 3.x (Not Recommended)

If you must use Hardhat 3.x, you need:

1. Keep `"type": "module"` in package.json
2. Use ES2022 modules in tsconfig.json
3. Update ALL plugins to versions compatible with Hardhat 3.x
4. The current plugin ecosystem doesn't fully support Hardhat 3.x yet

## Expected Result

After following the Hardhat 2.x solution, tests should run but may still fail due to:

1. **Contract API Mismatches**: The test fixtures are trying to deploy contracts with wrong constructor parameters
2. **Method Name Mismatches**: Tests call methods that may not exist in the current RWA contracts
3. **Initialization Mismatches**: Contract initialization patterns have changed

These are separate issues from the Hardhat/plugin compatibility problem.

## Next Steps After Hardhat Fix

Once Hardhat runs properly, you'll need to:

1. **Read actual contract ABIs** to understand correct constructor signatures
2. **Update test fixtures** to match actual contract deployment patterns
3. **Update method calls** in tests to match actual contract methods
4. **Verify contract method names** (e.g., does RWAStaking have `kageCreatePool()` or something else?)

## Quick Commands

```bash
# Fix with Hardhat 2.x (recommended)
cd smart-contracts
bun add -D hardhat@^2.22.15
# Remove "type": "module" from package.json
# Change tsconfig module to "commonjs"
rm -rf node_modules bun run .lock
bun install
bun run test test/revenue-distribution-tier-testing.spec.ts
```

## Files Modified

- `smart-contracts/package.json` - Hardhat version and type
- `smart-contracts/tsconfig.json` - Module system
- `smart-contracts/hardhat.config.ts` - Already updated for compatibility
- `smart-contracts/test/utils/proxy-fixture.ts` - Ethers v6 compatibility added
- `smart-contracts/test/utils/enhanced-revenue-fixture.ts` - Variable names updated
- `smart-contracts/test/revenue-distribution-tier-testing.spec.ts` - Variable names updated

## Contact Points

The refactoring has been completed for naming (Kage → TigerPalace/RWA), but contract API alignment is still needed.

