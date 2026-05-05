# Quick Fix: Disable USDC v2 Contracts

The v2 contracts require missing v1 dependencies. To compile successfully, temporarily rename these files:

## Manual Steps

Run these commands in the `smart-contracts` directory:

```bash
cd contracts/usdc/v2

# Rename files that depend on v1 contracts
mv AbstractFiatTokenV2.sol AbstractFiatTokenV2.sol.disabled
mv FiatTokenV2.sol FiatTokenV2.sol.disabled  
mv FiatTokenV2_1.sol FiatTokenV2_1.sol.disabled
mv FiatTokenV2_2.sol FiatTokenV2_2.sol.disabled
mv EIP2612.sol EIP2612.sol.disabled
mv EIP3009.sol EIP3009.sol.disabled

# Keep EIP712Domain.sol (no v1 dependency)
```

Then compile:
```bash
bun run compile
```

## Why?

These contracts depend on Circle USDC v1 contracts that weren't provided:
- `AbstractFiatTokenV1`
- `FiatTokenV1_1` 
- `Blacklistable`

## Alternative: Use Existing USDC

You don't need these contracts if you're using:
- Existing Sepolia USDC: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- MockUSDC for local testing

## Restore Later

If you get the Circle USDC v1 source code:
```bash
cd contracts/usdc/v2
mv *.disabled .
# Remove .disabled extension from filenames
```

