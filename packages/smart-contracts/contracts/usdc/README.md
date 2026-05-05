# USDC Integration for Sepolia Testnet

## Overview

This directory contains Circle USDC (FiatToken) contracts for integration with the Tokenizin RWA Marketplace. These contracts enable USDC stablecoin payments for purchasing RWA tokens.

## Important Notes

### Missing Dependencies

The USDC v2 contracts require v1 contracts (`AbstractFiatTokenV1`, `FiatTokenV1_1`, `Blacklistable`, etc.) that were not provided in the original files. 

**Options:**
1. **Use Existing USDC on Sepolia** (Recommended): Circle has already deployed USDC on Sepolia testnet at `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
2. **Create Mock USDC**: A simplified mock ERC20 contract compatible with Solidity 0.8.x for testing
3. **Obtain Full USDC Source**: Get the complete Circle USDC source code including v1 contracts

### Solidity Version Compatibility

- **USDC Contracts**: Solidity 0.6.12
- **Project Contracts**: Solidity 0.8.23
- **Solution**: Hardhat configured to compile multiple Solidity versions

## Contract Structure

```
contracts/usdc/
├── interface/
│   ├── IERC20.sol
│   └── IERC1271.sol
├── util/
│   ├── SafeMath.sol
│   ├── Address.sol
│   ├── SafeERC20.sol
│   ├── ECRecover.sol
│   ├── SignatureChecker.sol
│   ├── MessageHashUtils.sol
│   └── EIP712.sol
├── v1/
│   └── (Missing - requires AbstractFiatTokenV1, FiatTokenV1_1, Blacklistable)
└── v2/
    ├── EIP712Domain.sol
    ├── AbstractFiatTokenV2.sol
    ├── EIP2612.sol
    ├── EIP3009.sol
    ├── FiatTokenV2.sol
    ├── FiatTokenV2_1.sol
    └── FiatTokenV2_2.sol
```

## Sepolia USDC Address

**Official Circle USDC on Sepolia**: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`

You can use this address directly in your marketplace integration without deploying your own USDC contract.

## Integration Steps

1. **Update Marketplace Contract**: Add ERC20 payment support (USDC)
2. **Configure Payment Token**: Set USDC address in marketplace
3. **Update Purchase Functions**: Support both ETH and USDC payments
4. **Test Integration**: Verify USDC transfers work correctly

## Deployment

See `scripts/deploy-usdc-sepolia.ts` for deployment script (if deploying custom USDC).

## Testing

Use the mock USDC contract (`contracts/usdc/mock/MockUSDC.sol`) for local testing.

