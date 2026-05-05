# E2E Test Suite Fixes - Summary

## Issues Identified

### 1. ❌ Asset ID Format Mismatch
**Problem**: Tests were using numeric asset ID "11" (blockchain ID), but the API expects UUID strings (database ID).

**Error**: `GET /api/realEstateAsset/11?include=relations 404`

**Root Cause**: 
- Marketplace routes use database UUIDs: `/marketplace/{uuid}`
- API route `/api/realEstateAsset/[id]` expects UUID format
- Tests were using blockchain asset ID instead

### 2. ❌ No Test Asset Setup
**Problem**: Tests assumed a specific asset ID exists without verification.

**Fix**: Created dynamic asset fetching from marketplace API

### 3. ❌ Wallet Connection Logic
**Problem**: Wallet connection detection was unreliable.

**Fix**: Improved wallet detection and connection flow

### 4. ❌ Navigation Timing Issues
**Problem**: Tests didn't wait for API responses before proceeding.

**Fix**: Added proper wait conditions for API calls

## Fixes Applied

### 1. Dynamic Asset Fetching (`tests/e2e/helpers/test-asset-setup.ts`)

Created helper to fetch valid test assets:
- Fetches from `/api/real-estate-assets`
- Finds assets with blockchain registration (`propertyId`)
- Returns both database UUID and blockchain ID
- Falls back gracefully if no perfect match

### 2. Test Suite Updates (`tests/e2e/marketplace-purchase-flow.spec.ts`)

**Changes**:
- ✅ Added `beforeAll` hook to fetch test asset once
- ✅ Replaced all `TEST_ASSET_ID` references with dynamic `testAssetId`
- ✅ Added `test.skip()` checks when asset unavailable
- ✅ Improved wallet connection detection
- ✅ Enhanced navigation with API response waiting
- ✅ Better error handling throughout

### 3. Improved Helper Functions

**`ensureWalletConnected()`**:
- Checks for existing connection first
- Better selector matching for wallet buttons
- Handles multiple wallet types (MetaMask, WalletConnect, etc.)
- Non-blocking (tests continue if wallet unavailable)

**`navigateToAsset()`**:
- Waits for API response before proceeding
- Verifies page loaded correctly (checks for 404)
- Better timeout handling
- Logging for debugging

## Test Execution Flow

1. **Before All Tests**:
   ```
   Fetch test asset from /api/real-estate-assets
   → Find asset with propertyId (blockchain registered)
   → Store database UUID and blockchain ID
   ```

2. **Before Each Test**:
   ```
   Navigate to /marketplace
   → Attempt wallet connection (non-blocking)
   → Skip test if no asset available
   ```

3. **During Tests**:
   ```
   Navigate to /marketplace/{uuid}
   → Wait for API response
   → Verify page loaded
   → Execute test actions
   ```

## Running Tests

```bash
# Run all marketplace purchase flow tests
bun run playwright test tests/e2e/marketplace-purchase-flow.spec.ts

# Run with UI (headed mode)
bun run playwright test tests/e2e/marketplace-purchase-flow.spec.ts --headed

# Run specific test
bun run playwright test tests/e2e/marketplace-purchase-flow.spec.ts -g "should display purchase dialog"

# Debug mode
bun run playwright test tests/e2e/marketplace-purchase-flow.spec.ts --debug
```

## Prerequisites

1. **Development Server Running**:
   ```bash
   bun run dev
   ```

2. **Test Assets Available**:
   - At least one asset with `status: 'ACTIVE'`
   - Asset should have `propertyId` (blockchain registered)
   - Asset should have `availableTokens > 0`

3. **Environment Variables**:
   ```bash
   NEXT_PUBLIC_HOST=http://localhost:3000
   NEXT_PUBLIC_RWA_MARKETPLACE=0x...
   NEXT_PUBLIC_USDC_ADDRESS=0x...
   NEXT_PUBLIC_EURC_ADDRESS=0x...
   ```

## Expected Behavior

### ✅ Success Case
- Test fetches valid asset from marketplace
- Navigates to asset page successfully
- API returns 200 OK
- Tests proceed normally

### ⚠️ Warning Case (No Perfect Asset)
- Falls back to first available asset
- Tests continue but may fail if asset not blockchain-registered
- Logs warning message

### ❌ Failure Case (No Assets)
- All tests skipped with message: "No test asset available"
- No test failures, just skipped tests

## Debugging Tips

1. **Check Test Asset**:
   ```typescript
   // Add to test
   console.log('Test Asset:', testAsset);
   console.log('Database ID:', testAssetId);
   console.log('Blockchain ID:', blockchainAssetId);
   ```

2. **Verify API Response**:
   ```bash
   curl http://localhost:3000/api/real-estate-assets?limit=10&status=ACTIVE
   ```

3. **Check Asset Page**:
   ```bash
   # Replace {uuid} with actual asset UUID
   curl http://localhost:3000/api/realEstateAsset/{uuid}?include=relations
   ```

4. **View Test Traces**:
   ```bash
   bun run playwright show-trace playwright-report/trace.zip
   ```

## Next Steps

1. ✅ Fix asset ID format mismatch
2. ✅ Add dynamic asset fetching
3. ✅ Improve wallet connection
4. ✅ Add proper wait conditions
5. ⏳ Add more robust error handling
6. ⏳ Add test data seeding for CI/CD
7. ⏳ Add visual regression tests
8. ⏳ Add performance benchmarks

## Related Files

- `tests/e2e/marketplace-purchase-flow.spec.ts` - Main test suite
- `tests/e2e/helpers/test-asset-setup.ts` - Asset fetching helper
- `tests/e2e/helpers/marketplace-test-helpers.ts` - Blockchain helpers
- `playwright.config.ts` - Playwright configuration
- `src/app/api/realEstateAsset/[id]/route.ts` - Asset API route

