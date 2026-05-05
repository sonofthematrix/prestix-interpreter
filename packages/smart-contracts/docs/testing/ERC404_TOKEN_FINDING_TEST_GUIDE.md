# ERC404 Token Finding Test Guide

This guide explains how to test and verify that the upgraded marketplace contract correctly finds existing ERC404 tokens before creating new ones.

## Overview

After upgrading the marketplace contract, it now supports:
- **ERC404 Token Finding**: Checks for existing ERC404 tokens before creating new ones
- **Duplicate Prevention**: Ensures only one token contract exists per asset
- **Correct Token Usage**: Uses the correct token address for all purchases

## Prerequisites

1. Marketplace contract upgraded with ERC404 support
2. ERC404 factory address configured in marketplace
3. At least one asset registered in the asset registry
4. Sufficient ETH balance for test purchases

## Test Scripts

### 1. Test ERC404 Token Finding

**Purpose**: Comprehensive test of ERC404 token finding functionality

**Usage**:
```bash
cd packages/smart-contracts
bun hardhat run scripts/test-erc404-token-finding.ts --network sepolia [assetId]
```

**Example**:
```bash
bun hardhat run scripts/test-erc404-token-finding.ts --network sepolia 1
```

**What it tests**:
1. ✅ Checks for existing ERC404 tokens
2. ✅ Purchases tokens and verifies token finding
3. ✅ Verifies no duplicate tokens are created
4. ✅ Confirms second purchase uses same token
5. ✅ Validates token balances

**Expected Output**:
```
╔════════════════════════════════════════════════════════════╗
║   TEST ERC404 TOKEN FINDING FUNCTIONALITY                 ║
╚════════════════════════════════════════════════════════════╝

✅ Test 1: Check for existing ERC404 token
✅ Test 2: Purchase uses existing ERC404 token
✅ Test 3: No duplicate tokens
✅ Test 4: Second purchase uses same token
✅ Test 5: Token balances correct

📊 Results: 5/5 tests passed
🎉 All tests passed! ERC404 token finding is working correctly.
```

### 2. Monitor Marketplace Purchases

**Purpose**: Monitor recent purchases to verify correct token usage

**Usage**:
```bash
cd packages/smart-contracts
bun hardhat run scripts/monitor-marketplace-purchases.ts --network sepolia [blockRange]
```

**Example**:
```bash
# Monitor last 1000 blocks (default)
bun hardhat run scripts/monitor-marketplace-purchases.ts --network sepolia

# Monitor last 5000 blocks
bun hardhat run scripts/monitor-marketplace-purchases.ts --network sepolia 5000
```

**What it monitors**:
- Recent purchase events
- Token addresses used per asset
- Duplicate token detection
- Purchase statistics

**Expected Output**:
```
╔════════════════════════════════════════════════════════════╗
║   MONITOR MARKETPLACE PURCHASES                           ║
╚════════════════════════════════════════════════════════════╝

📋 Purchase Summary:
   Purchase 1:
      Block: 12345678
      Transaction: 0x...
      Asset ID: 1
      Buyer: 0x...
      Token Amount: 10
      Total Cost: 0.1 ETH
      Token Address: 0x...

✅ Verification Results:
   Unique Assets Purchased: 1
   Total Purchases: 1
   Assets with Valid Tokens: 1
   Duplicates Found: ✅ No

✅ All purchases verified - ERC404 token finding is working correctly!
```

## Testing Workflow

### Step 1: Initial Test

Run the comprehensive test script to verify functionality:

```bash
bun hardhat run scripts/test-erc404-token-finding.ts --network sepolia 1
```

**What to verify**:
- ✅ All 5 tests pass
- ✅ No duplicate tokens created
- ✅ Same token used for multiple purchases
- ✅ Token balances are correct

### Step 2: Monitor Real Purchases

After real users make purchases, monitor them:

```bash
bun hardhat run scripts/monitor-marketplace-purchases.ts --network sepolia 5000
```

**What to check**:
- ✅ Each asset uses only one token address
- ✅ No duplicate tokens detected
- ✅ Purchase events are properly emitted
- ✅ Token addresses match factory records

### Step 3: Continuous Monitoring

Set up periodic monitoring (e.g., daily):

```bash
# Add to cron or scheduled task
0 0 * * * cd /path/to/packages/smart-contracts && bun hardhat run scripts/monitor-marketplace-purchases.ts --network sepolia 10000
```

## Troubleshooting

### Issue: Duplicate Tokens Detected

**Symptoms**:
- Test script shows duplicate tokens
- Monitor script reports multiple token addresses for same asset

**Possible Causes**:
1. ERC404 factory not configured correctly
2. Marketplace upgrade not completed
3. Token finding logic not working

**Solution**:
1. Verify ERC404 factory address:
   ```bash
   # Check marketplace configuration
   bun hardhat run scripts/check-marketplace-config.ts --network sepolia
   ```

2. Re-run upgrade script:
   ```bash
   bun hardhat run scripts/upgrade-marketplace-erc404.ts --network sepolia
   ```

3. Verify factory is set:
   ```typescript
   const factory = await marketplace.getTokenFactory404();
   console.log('Factory:', factory);
   ```

### Issue: Token Not Found

**Symptoms**:
- Test script reports "Token address not found"
- Purchases fail with token errors

**Possible Causes**:
1. Token not created yet
2. Factory not returning correct address
3. Asset ID mismatch

**Solution**:
1. Check if token exists in factory:
   ```typescript
   const tokenAddress = await factory404.getTokenAddress(assetId);
   console.log('Token:', tokenAddress);
   ```

2. Verify asset exists:
   ```typescript
   const asset = await registry.getAsset(assetId);
   console.log('Asset:', asset);
   ```

3. Create token manually if needed:
   ```typescript
   await factory404.createToken(assetId, ...);
   ```

### Issue: Test Script Fails

**Symptoms**:
- Test script exits with errors
- Cannot connect to contracts

**Possible Causes**:
1. Network connection issues
2. Wrong contract addresses
3. Insufficient balance

**Solution**:
1. Check network connection:
   ```bash
   # Verify RPC endpoint
   curl -X POST -H "Content-Type: application/json" \
     --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
     $SEPOLIA_RPC_URL
   ```

2. Verify contract addresses in `.env.local`:
   ```bash
   grep -E "^(NEXT_PUBLIC_RWA_MARKETPLACE|NEXT_PUBLIC_RWA_TOKEN_FACTORY_404)" .env.local
   ```

3. Check account balance:
   ```bash
   bun hardhat run scripts/check-balance.ts --network sepolia
   ```

## Success Criteria

✅ **All tests pass**: All 5 test cases in test script pass

✅ **No duplicates**: Monitor script shows no duplicate tokens

✅ **Correct tokens**: All purchases use the correct token address

✅ **Balances correct**: Token balances match purchase amounts

✅ **Events emitted**: Purchase events are properly logged

## Next Steps

After successful testing:

1. **Document Results**: Record test results and any issues found

2. **Monitor Production**: Set up continuous monitoring for production purchases

3. **Update Frontend**: Ensure frontend uses correct token addresses

4. **User Testing**: Test with real users and monitor purchases

5. **Performance Monitoring**: Track gas costs and transaction times

## Related Scripts

- `scripts/upgrade-marketplace-erc404.ts` - Upgrade marketplace contract
- `scripts/test-token-purchase.ts` - Basic token purchase test
- `scripts/test-purchase-usdc-eurc.ts` - ERC20 payment test

## Support

For issues or questions:
1. Check contract logs on Etherscan
2. Review test output for specific errors
3. Verify environment variables are set correctly
4. Check network connectivity and RPC endpoints

