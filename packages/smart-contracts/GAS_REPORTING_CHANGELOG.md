# Gas Reporting System Changelog

## [Latest] - Test Name Extraction Fix

### Fixed
- **Test name extraction**: Fixed issue where test names were showing as "unknown"
- Implemented multi-layered test name extraction:
  1. Mocha test runner context access
  2. Error stack trace parsing to locate test files
  3. File reading and parsing to extract test names and describe blocks
- Test names now include full describe block hierarchy (e.g., `🔥 Core Operation Gas Analysis > Should measure gas costs`)

### Improved
- Enhanced stack trace parsing with multiple pattern matching
- Better file path resolution (handles both absolute and relative paths)
- Improved describe block collection (searches up to 200 lines back)
- More robust error handling for file reading operations

### Documentation
- Updated `GAS_REPORTING_GUIDE.md` with test name extraction details
- Created comprehensive documentation in `docs/implementation/testing/gas-reporting-system.md`
- Added troubleshooting section for test name extraction

## Previous Versions

### Initial Implementation
- Created `gas-reporter.ts` singleton for metric collection
- Created `gas-helpers.ts` with `measureGas()` function
- Created `generate-gas-report.ts` script for report generation
- Implemented file persistence for metrics across test runs
- Generated comprehensive markdown reports with statistics

