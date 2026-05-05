# Marketplace Token Custody Testing Guide

## Overview

This document describes the comprehensive test suite for the marketplace token custody architecture, where tokens are minted directly to the marketplace contract and transferred to buyers upon purchase.

## Test Files

### 1. Unit Tests (`test/marketplace-token-custody.spec.ts`)

**Purpose**: Comprehensive unit tests for marketplace token custody functionality.

**Test Coverage**:
- ✅ Token creation with marketplace custody
- ✅ Token creation without marketplace (backward compatibility)
- ✅ Marketplace balance verification
- ✅ Token purchase from marketplace balance
- ✅ Multiple purchases
- ✅ Payment distribution (owner receives payment)
- ✅ Insufficient balance handling
- ✅ Backward compatibility with `createToken404`

**Run Tests**:
```bash
bun run hardhat test test/marketplace-token-custody.spec.ts
```

### 2. Factory Tests (`test/rwa-token-factory-404-fixed.spec.ts`)

**Purpose**: Tests for the factory's `createToken404WithMarketplace` function.

**New Test Coverage**:
- ✅ `createToken404WithMarketplace` - minting to marketplace
- ✅ `createToken404WithMarketplace` - minting to owner (zero address)
- ✅ Approval handling (no approval when minted to marketplace)
- ✅ Approval handling (approval when minted to owner)

**Run Tests**:
```bash
bun run hardhat test test/rwa-token-factory-404-fixed.spec.ts
```

### 3. End-to-End Test Script (`scripts/test-marketplace-custody.ts`)

**Purpose**: End-to-end testing script for marketplace custody on Sepolia testnet.

**Test Flow**:
1. **Setup**: Verify asset exists in registry
2. **Token Creation**: Create token with marketplace custody (if needed)
3. **Balance Check**: Verify marketplace owns tokens
4. **Purchase**: Test token purchase from marketplace
5. **Payment Distribution**: Verify payment goes to asset owner

**Run Script**:
```bash
# Test default asset (ID 1)
bun run hardhat run scripts/test-marketplace-custody.ts --network sepolia

# Test specific asset
bun run hardhat run scripts/test-marketplace-custody.ts --network sepolia -- --assetId 5
```

## Test Scenarios

### Scenario 1: Token Creation with Marketplace Custody

**Test**: `createToken404WithMarketplace` with marketplace address

**Expected Behavior**:
- Tokens minted to marketplace address
- Owner has zero balance
- Marketplace has full supply
- No factory approval needed

**Code Example**:
```typescript
await factory.createToken404WithMarketplace(
  assetId,
  name,
  symbol,
  totalSupply,
  owner.address,      // Owner receives payment
  marketplace.address, // Marketplace receives tokens
  tokenURI
);
```

### Scenario 2: Token Purchase from Marketplace

**Test**: `purchaseTokens` transfers from marketplace balance

**Expected Behavior**:
- Marketplace balance decreases by purchase amount
- Buyer balance increases by purchase amount
- Total supply remains unchanged
- Payment sent to asset owner

**Code Example**:
```typescript
const [totalCost] = await marketplace.calculatePurchaseCost(assetId, purchaseAmount);
await marketplace.purchaseTokens(assetId, purchaseAmount, { value: totalCost });
```

### Scenario 3: Multiple Purchases

**Test**: Multiple buyers purchasing from marketplace

**Expected Behavior**:
- Each purchase decreases marketplace balance
- Each buyer receives correct amount
- Total supply remains constant
- All payments distributed correctly

### Scenario 4: Insufficient Balance Handling

**Test**: Purchase more tokens than marketplace has

**Expected Behavior**:
- Transaction reverts with "insufficient marketplace token balance"
- Marketplace balance unchanged
- Buyer balance unchanged

### Scenario 5: Backward Compatibility

**Test**: `createToken404` still works (calls `createToken404WithMarketplace` with zero address)

**Expected Behavior**:
- Tokens minted to owner (not marketplace)
- Factory has approval from owner
- Old code continues to work

## Test Execution

### Running All Tests

```bash
# Run all marketplace custody tests
bun run hardhat test test/marketplace-token-custody.spec.ts

# Run all factory tests (including new marketplace custody tests)
bun run hardhat test test/rwa-token-factory-404-fixed.spec.ts

# Run end-to-end test script
bun run hardhat run scripts/test-marketplace-custody.ts --network sepolia
```

### Running Specific Test Suites

```bash
# Test only marketplace custody creation
bun run hardhat test test/marketplace-token-custody.spec.ts --grep "createToken404WithMarketplace"

# Test only purchase flow
bun run hardhat test test/marketplace-token-custody.spec.ts --grep "Marketplace Purchase Flow"

# Test only backward compatibility
bun run hardhat test test/marketplace-token-custody.spec.ts --grep "Backward Compatibility"
```

## Test Results Interpretation

### Success Indicators

✅ **Token Creation**:
- Marketplace balance equals total supply
- Owner balance equals zero
- Token address is valid and registered

✅ **Token Purchase**:
- Buyer receives exact purchase amount
- Marketplace balance decreases correctly
- Total supply remains unchanged
- Payment transaction succeeds

✅ **Payment Distribution**:
- Asset owner receives payment (totalCost - marketplaceFee)
- Marketplace fee collected correctly
- No tokens sent to owner (only payment)

### Failure Indicators

❌ **Token Creation Failures**:
- Marketplace balance is zero (tokens not minted to marketplace)
- Owner has tokens (should be zero)
- Factory approval exists (should be zero for marketplace custody)

❌ **Purchase Failures**:
- "insufficient marketplace token balance" error
- Buyer balance doesn't increase
- Marketplace balance doesn't decrease
- Total supply changes (should remain constant)

## Integration with Existing Tests

### Compatibility with ERC404 Lifecycle Tests

The marketplace custody architecture is compatible with existing ERC404 lifecycle tests (`scripts/test-erc404-token-lifecycle.ts`). However, note that:

- Tokens must be acquired via marketplace purchase (not direct minting)
- Marketplace must have sufficient balance for testing
- NFT conversion and other ERC404 features work identically

### Compatibility with Marketplace Tests

Existing marketplace tests (`test/e2e/rwa-marketplace-token-lifecycle.spec.ts`) may need updates to account for:

- Marketplace holding tokens (not owner)
- No approval mechanism needed
- Direct `transfer()` instead of `transferFrom()`

## Troubleshooting

### Common Issues

1. **"Marketplace does not have TOKEN_CREATOR_ROLE"**
   - **Solution**: Grant `TOKEN_CREATOR_ROLE` to marketplace on factory
   - **Script**: `scripts/verify-grant-factory-role.ts`

2. **"insufficient marketplace token balance"**
   - **Solution**: Ensure tokens were minted to marketplace, not owner
   - **Check**: Verify token creation used `createToken404WithMarketplace` with marketplace address

3. **"Token not found"**
   - **Solution**: Create token before purchasing
   - **Check**: Verify asset is registered in registry

4. **Payment not received by owner**
   - **Solution**: Verify marketplace purchase transaction succeeded
   - **Check**: Check transaction receipt for payment transfer events

## Next Steps

After running tests:

1. ✅ Verify all unit tests pass
2. ✅ Verify end-to-end test script completes successfully
3. ✅ Deploy updated contracts to testnet
4. ✅ Run tests against deployed contracts
5. ✅ Monitor gas usage and optimize if needed
6. ✅ Prepare for mainnet deployment

## Related Documentation

- `MARKETPLACE_CUSTODY_IMPLEMENTATION.md` - Implementation details
- `MARKETPLACE_TOKEN_CUSTODY_ARCHITECTURE.md` - Architecture design
- `ERC404_TESTING_SOLUTION.md` - ERC404 testing guide
