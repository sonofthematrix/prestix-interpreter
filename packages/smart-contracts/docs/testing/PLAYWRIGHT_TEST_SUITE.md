# Playwright Test Suite for Marketplace Purchase Flow

## Overview

Comprehensive end-to-end test suite covering the complete marketplace purchase flow, including ETH and ERC20 (USDC/EURC) purchases, error handling, and API verification.

## Test Files Created

### 1. Main Test Suite
**File**: `tests/e2e/marketplace-purchase-flow.spec.ts`

Comprehensive test suite with 20+ test cases covering:
- ETH purchase flow (4 tests)
- USDC/EURC purchase flow (6 tests)
- Error handling and edge cases (5 tests)
- API recording verification (3 tests)
- Purchase page tests (3 tests)
- Integration tests (2 tests)

### 2. Test Helpers
**File**: `tests/e2e/helpers/marketplace-test-helpers.ts`

Reusable helper functions for:
- Blockchain interactions (balance, allowance, cost calculation)
- Wallet address retrieval
- API monitoring
- Transaction confirmation waiting
- Token amount formatting

### 3. Documentation
**File**: `tests/e2e/README.md`

Complete documentation including:
- Setup instructions
- Running tests
- Troubleshooting guide
- CI/CD examples

## Test Coverage

### ✅ ETH Purchase Flow
- [x] Purchase dialog display
- [x] Cost calculation verification
- [x] Balance validation
- [x] Transaction execution

### ✅ USDC/EURC Purchase Flow
- [x] Payment token selection
- [x] Cost calculation in payment token
- [x] Balance and allowance checks
- [x] Approval flow handling
- [x] Purchase execution after approval
- [x] Balance validation before purchase

### ✅ Error Handling
- [x] Invalid token amount (zero, negative)
- [x] Amount exceeding available tokens
- [x] Payment token mismatch
- [x] Network errors
- [x] Transaction rejection

### ✅ API Recording
- [x] Purchase recording after transaction
- [x] Payment token information in API
- [x] API error handling

### ✅ Purchase Page
- [x] Page load verification
- [x] Cost calculation on page
- [x] USDC purchase on dedicated page

### ✅ Integration
- [x] Full end-to-end flow
- [x] Marketplace configuration verification

## Running Tests

### Quick Start
```bash
# Run all marketplace purchase tests
bun run test:e2e marketplace-purchase-flow

# Run in headed mode (see browser)
playwright test tests/e2e/marketplace-purchase-flow.spec.ts --headed

# Run specific test
playwright test tests/e2e/marketplace-purchase-flow.spec.ts -g "ETH purchase"
```

### Environment Variables
```bash
# Required
NEXT_PUBLIC_RWA_MARKETPLACE=0x...
NEXT_PUBLIC_USDC_ADDRESS=0x...
NEXT_PUBLIC_EURC_ADDRESS=0x...
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://...

# Optional (for custom test data)
TEST_ASSET_ID=11
TEST_TOKEN_AMOUNT=1
```

## Test Structure

### Test Organization
```
tests/e2e/
├── marketplace-purchase-flow.spec.ts    # Main test suite
├── helpers/
│   └── marketplace-test-helpers.ts     # Helper functions
└── README.md                            # Documentation
```

### Test Suites
1. **ETH Purchase Flow** - Native ETH purchases
2. **USDC/EURC Purchase Flow** - ERC20 token purchases
3. **Error Handling** - Edge cases and errors
4. **API Recording** - Backend verification
5. **Purchase Page** - Dedicated route tests
6. **Integration** - End-to-end flows

## Key Features

### 1. Wallet Connection Handling
- Automatic wallet connection detection
- Support for MetaMask and AppKit
- Wallet modal interaction

### 2. Payment Method Selection
- ETH payment option
- USDC payment option
- EURC payment option
- Stripe payment option (for future tests)

### 3. Cost Calculation Verification
- ETH cost calculation using `calculatePurchaseCost`
- USDC/EURC cost calculation using `calculatePurchaseCostInPaymentToken`
- Fee breakdown verification
- Subtotal and total verification

### 4. Balance and Allowance Checks
- ETH balance verification
- ERC20 token balance verification
- Token allowance verification
- Insufficient balance error handling

### 5. Approval Flow
- Detection of insufficient allowance
- Approval button visibility
- Approval transaction handling
- Purchase button enablement after approval

### 6. Transaction Execution
- Purchase button click
- Transaction confirmation handling
- Transaction status monitoring
- Success message verification

### 7. API Verification
- API call monitoring
- Purchase recording verification
- Payment token information verification
- Error handling verification

## Helper Functions

### Blockchain Interactions
```typescript
// Get blockchain client
const client = getBlockchainClient();

// Get wallet balance
const balance = await getETHBalance(address);
const tokenBalance = await getTokenBalance(tokenAddress, walletAddress);

// Get token allowance
const allowance = await getTokenAllowance(tokenAddress, owner, spender);

// Calculate purchase cost
const cost = await calculatePurchaseCostETH(assetId, tokenAmount);
const paymentTokenCost = await calculatePurchaseCostInPaymentToken(assetId, tokenAmount);
```

### Verification Functions
```typescript
// Verify sufficient balance
const balanceCheck = await verifySufficientBalance(
  walletAddress,
  'USDC',
  requiredAmount
);

// Verify token allowance
const allowanceCheck = await verifyTokenAllowance(
  tokenAddress,
  ownerAddress,
  requiredAmount
);
```

### Monitoring Functions
```typescript
// Monitor API calls
const apiCall = await monitorPurchaseAPICall(page, 30000);

// Wait for transaction confirmation
const tx = await waitForTransactionConfirmation(page, 60000);
```

## Test Scenarios

### Happy Path Scenarios
1. ✅ ETH purchase with sufficient balance
2. ✅ USDC purchase with sufficient balance and allowance
3. ✅ EURC purchase with approval flow
4. ✅ Purchase recorded in API

### Error Scenarios
1. ✅ Insufficient ETH balance
2. ✅ Insufficient USDC balance
3. ✅ Insufficient token allowance
4. ✅ Invalid token amount
5. ✅ Amount exceeding available tokens
6. ✅ Payment token mismatch
7. ✅ Network errors
8. ✅ Transaction rejection

### Edge Cases
1. ✅ Zero token amount
2. ✅ Very large token amount
3. ✅ Payment token not configured
4. ✅ Marketplace payment token mismatch

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: E2E Marketplace Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: bun install
      - run: bun run dev &
      - run: playwright install chromium
      - run: playwright test tests/e2e/marketplace-purchase-flow.spec.ts
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## Troubleshooting

### Common Issues

1. **Wallet Not Connected**
   - Ensure wallet extension is installed
   - Check `ensureWalletConnected()` helper
   - Verify wallet is unlocked

2. **Insufficient Balance**
   - Fund test wallet with ETH
   - Fund test wallet with USDC/EURC
   - Use Sepolia faucets

3. **Network Errors**
   - Check RPC endpoint configuration
   - Verify network connectivity
   - Increase timeout values

4. **Transaction Timeouts**
   - Increase test timeouts
   - Check RPC endpoint reliability
   - Verify gas prices

## Best Practices

1. **Test Isolation**: Each test is independent
2. **Error Handling**: Comprehensive error scenario coverage
3. **Helper Functions**: Reusable utilities for common operations
4. **Documentation**: Clear test descriptions and comments
5. **CI/CD Ready**: Tests can run in automated environments

## Related Documentation

- [Frontend Integration Guide](./FRONTEND_INTEGRATION_GUIDE.md)
- [Integration Complete](./INTEGRATION_COMPLETE.md)
- [Purchase Script](../../scripts/purchase-with-usdc-eurc.ts)
- [Test README](../../../../tests/e2e/README.md)

## Next Steps

1. ✅ Test suite created
2. ✅ Helper functions implemented
3. ✅ Documentation written
4. ⏭️ Run tests in development environment
5. ⏭️ Fix any issues found
6. ⏭️ Add to CI/CD pipeline
7. ⏭️ Monitor test results

## Summary

The Playwright test suite provides comprehensive coverage of the marketplace purchase flow, including:
- **23 test cases** covering all major scenarios
- **Helper functions** for blockchain and API interactions
- **Error handling** for edge cases
- **API verification** for purchase recording
- **CI/CD ready** configuration

All tests are designed to be:
- **Independent** - Each test can run standalone
- **Reliable** - Proper waits and error handling
- **Maintainable** - Clear structure and documentation
- **Comprehensive** - Cover happy paths and error cases

