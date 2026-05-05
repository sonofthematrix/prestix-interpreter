# Gas Reporting Guide

## Overview

The gas reporting system automatically collects gas metrics from all test files and generates comprehensive reports showing gas consumption for all contract operations.

## Quick Start

### Generate Comprehensive Gas Report

```bash
cd smart-contracts
bun run test:gas-report
```

This will:
1. Run all test files
2. Collect gas metrics from each test
3. Generate `COMPREHENSIVE_GAS_REPORT.md` with detailed analysis
4. Export `gas-metrics.json` for programmatic access

## How It Works

### 1. Gas Reporter Utility

The `test/utils/gas-reporter.ts` module provides:
- **Singleton pattern** for collecting metrics across test files
- **File persistence** - metrics are saved to `.gas-metrics.json` after each operation
- **Report generation** - comprehensive markdown reports with statistics

### 2. Gas Helpers

The `test/utils/gas-helpers.ts` module provides:
- `measureGas()` - Measure and record gas for any transaction
- `measureGasWithLog()` - Measure gas and log to console
- **Automatic test file and test name extraction** - Intelligently extracts test names from:
  - Mocha test runner context (if available)
  - Error stack traces to locate test files
  - File parsing to extract `it()`, `test()`, and `describe()` blocks
  - Full test hierarchy including nested describe blocks

### 3. Usage in Tests

```typescript
import { measureGas } from "./utils/gas-helpers";

// In your test
it("Should stake tokens", async () => {
  const { gasUsed, receipt } = await measureGas(
    "Stake 1000 TPT",
    rwaStaking.connect(user).stake(poolId, amount),
    { poolId, amount: "1000 TPT" }
  );
  
  expect(gasUsed).to.be.lt(300000);
});
```

## Report Contents

The comprehensive gas report includes:

1. **Executive Summary**
   - Total operations tested
   - Total gas consumed
   - Test execution summary

2. **Summary by Test File**
   - Operations per file
   - Total and average gas per file

3. **Summary by Operation Type**
   - Staking operations
   - Revenue allocation
   - Pool management
   - View functions
   - etc.

4. **Detailed Breakdown**
   - Every operation with gas used
   - Test name and parameters
   - Organized by test file

5. **Top 10 Most/Least Expensive Operations**
   - Identifies optimization opportunities

6. **Gas Efficiency Analysis**
   - Average gas per operation type
   - Scalability insights

7. **Recommendations**
   - Best practices for gas optimization

## Current Test Coverage

The gas report includes metrics from:
- ✅ `ecosystem-performance.spec.ts` - Performance and gas analysis
- ✅ `ecosystem-integration.spec.ts` - End-to-end integration tests
- ✅ `core-contracts-focused.spec.ts` - Core contract functionality
- ✅ `enhanced-revenue-allocation.spec.ts` - Revenue allocation tests
- ✅ `rwa-staking-integration.spec.ts` - Staking integration tests
- ✅ `reward-distributor-contract.spec.ts` - Reward distributor tests
- ✅ `tiger-revenue-enhanced-coverage.spec.ts` - Revenue coverage tests
- ✅ `tiger-staking-error-emergency-tests.spec.ts` - Error handling tests
- ✅ `simple-staking-test.spec.ts` - Basic staking tests
- ✅ `minimal-staking-test.spec.ts` - Minimal test cases

## Adding Gas Reporting to New Tests

1. Import the helper:
```typescript
import { measureGas } from "./utils/gas-helpers";
```

2. Wrap transactions with `measureGas()`:
```typescript
await measureGas("Operation Name", txPromise, { param1: "value" });
```

3. The metrics are automatically collected and included in the comprehensive report.

## Report Files

- **`COMPREHENSIVE_GAS_REPORT.md`** - Human-readable markdown report
- **`gas-metrics.json`** - Machine-readable JSON data
- **`.gas-metrics.json`** - Temporary file (gitignored) storing metrics during test runs

## Key Metrics

From the latest report (generated automatically):
- **Total Operations:** 88 operations
- **Total Gas:** 12,210,814 gas (~12.2M gas)
- **Test Files:** 10 files
- **Tests Passed:** 125 tests
- **Success Rate:** 100%

### Operation Breakdown:
- **Staking Operations:** Average ~250K gas per stake
- **Revenue Allocation:** Average ~100K gas per allocation
- **Pool Management:** Average ~180K gas per pool operation
- **View Functions:** 0 gas (read-only operations)

> **Note:** Run `bun run test:gas-report` to regenerate the report with the latest metrics. Metrics are automatically extracted from test names using intelligent parsing.

## Best Practices

1. **Always use `measureGas()`** for transactions in tests
2. **Include descriptive operation names** for better reporting
3. **Add parameters** to help identify test scenarios
4. **Run `test:gas-report`** before releases to track gas costs
5. **Compare reports** over time to identify regressions

## Troubleshooting

### No metrics in report
- Ensure tests are using `measureGas()` from `gas-helpers`
- Check that `.gas-metrics.json` exists after running tests
- Verify tests are actually executing transactions (not just view functions)

### Test file names showing as "unknown"
- **Fixed**: The system now uses multiple fallback methods to extract test names:
  1. Mocha test runner context (if available)
  2. Error stack trace parsing to locate test files
  3. File reading to extract test names from source code
- Test names include full describe block hierarchy (e.g., `🔥 Core Operation Gas Analysis > Should measure gas costs`)
- If test names still show as "unknown", check:
  - Test files use standard Mocha `it()` or `describe()` syntax
  - Stack traces are accessible (not disabled)
  - File paths in stack traces are resolvable

### Metrics not persisting
- Check file permissions for `.gas-metrics.json`
- Ensure tests complete successfully
- Verify the gas reporter is imported correctly

## Integration with CI/CD

Add to your CI pipeline:

```yaml
- name: Generate Gas Report
  run: |
    cd smart-contracts
    bun run test:gas-report
  - name: Upload Gas Report
    uses: actions/upload-artifact@v3
    with:
      name: gas-report
      path: smart-contracts/COMPREHENSIVE_GAS_REPORT.md
```

## Future Enhancements

- [ ] Track gas costs over time (historical comparison)
- [ ] Set gas budgets and fail tests if exceeded
- [ ] Generate visual charts/graphs
- [ ] Compare gas costs across different contract versions
- [ ] Integration with gas price APIs for USD cost estimates

