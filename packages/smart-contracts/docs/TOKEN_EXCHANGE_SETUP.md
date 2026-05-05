# Token Exchange Setup Guide

## Overview

The TokenExchange contract allows users to exchange TPT tokens for property tokens (ERC-404 tokens) at fixed exchange rates. This guide explains how to configure the exchange contract after deployment.

## Prerequisites

1. **TokenExchange contract deployed** - See `scripts/deploy-token-exchange.ts`
2. **TPT token address configured** - Set in constructor during deployment
3. **Property tokens created** - Property tokens must exist in RWATokenFactory
4. **Deployer has owner role** - Deployer must be the owner of TokenExchange contract

## What Needs Configuration

The TokenExchange contract requires:

1. ✅ **TPT Token Address** - Set in constructor (immutable, no action needed)
2. ⚙️ **Exchange Rates** - Set rate for each property token (TPT per property token)
3. ⚙️ **Enable Tokens** - Enable each property token for exchange
4. ⚠️ **Property Token Deposits** - Deposit property tokens to contract for liquidity

## Setup Script

### Basic Usage

```bash
cd smart-contracts
npx hardhat run scripts/setup-token-exchange.ts --network sepolia
```

### With Custom Exchange Address

```bash
npx hardhat run scripts/setup-token-exchange.ts --network sepolia -- 0xYourExchangeAddress
```

### With Custom Exchange Rate

Set the exchange rate using environment variable `EXCHANGE_RATE_BPS`:

```bash
# 100 TPT per property token (default)
EXCHANGE_RATE_BPS=10000 npx hardhat run scripts/setup-token-exchange.ts --network sepolia

# 10 TPT per property token
EXCHANGE_RATE_BPS=1000 npx hardhat run scripts/setup-token-exchange.ts --network sepolia

# 1000 TPT per property token
EXCHANGE_RATE_BPS=100000 npx hardhat run scripts/setup-token-exchange.ts --network sepolia
```

**Note**: `EXCHANGE_RATE_BPS` is in basis points (100 = 1 TPT, 10000 = 100 TPT). The script converts this to 18-decimal format.

## Environment Variables

Required in `smart-contracts/.env`:

```bash
DEPLOYER_PRIVATE_KEY=your_private_key
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID

# Contract addresses
NEXT_PUBLIC_TOKEN_EXCHANGE_ADDRESS=0xEBEcD0BB0791efBCc179F83369569f19379cCfB1
NEXT_PUBLIC_TPT_ADDRESS=0xb0af8e94C74c2346609c3d94FCba61Ae85cf3e6e
NEXT_PUBLIC_RWA_ASSET_REGISTRY=0xe2d49642B5aE5D0f62dA79D572d04cA95dB2853D
NEXT_PUBLIC_RWA_TOKEN_FACTORY=0x2f051A127Ab4B8b0D78aB5758E06a808a8445566

# Optional: Custom exchange rate (in basis points)
EXCHANGE_RATE_BPS=10000  # 100 TPT per property token
```

## What the Script Does

1. ✅ **Verifies TokenExchange contract** - Checks contract exists and has required functions
2. ✅ **Checks deployer permissions** - Verifies deployer is the owner
3. ✅ **Discovers property tokens** - Gets all property tokens from factory/registry
4. ✅ **Fetches token metadata** - Gets name, symbol, decimals for each token
5. ✅ **Shows current configuration** - Displays current rates, enabled status, balances
6. ✅ **Configures exchange rates** - Sets rate for each property token
7. ✅ **Enables property tokens** - Enables tokens for exchange
8. ✅ **Unpauses exchange** - Ensures exchange is active
9. ✅ **Verifies final configuration** - Confirms all settings are correct

## Exchange Rate Configuration

### Default Rate

The default exchange rate is **100 TPT per 1 property token** (with 18 decimals).

This means:
- User sends: 100 TPT
- User receives: 1 property token

### Custom Rates

You can set different rates per property token by modifying the script or calling `setExchangeRate` directly:

```solidity
// Set rate: 50 TPT per property token
exchange.setExchangeRate(propertyTokenAddress, ethers.parseUnits("50", 18));

// Set rate: 200 TPT per property token
exchange.setExchangeRate(propertyTokenAddress, ethers.parseUnits("200", 18));
```

### Rate Calculation

The exchange rate is stored as: **TPT amount per 1 property token** (with 18 decimals)

Formula for exchange:
```
propertyTokenAmount = (tptAmount * 1e18) / exchangeRate
```

Example:
- Exchange rate: `100e18` (100 TPT per token)
- User sends: `50e18` TPT
- User receives: `(50e18 * 1e18) / 100e18 = 0.5e18` property tokens

## Property Token Deposits

**Important**: After configuring exchange rates, you must deposit property tokens to the exchange contract for users to exchange.

### Manual Deposit

```solidity
// Approve exchange contract
propertyToken.approve(exchangeAddress, amount);

// Transfer tokens to exchange
propertyToken.transfer(exchangeAddress, amount);
```

### Using Hardhat Console

```bash
npx hardhat console --network sepolia

# Get contracts
const PropertyToken = await ethers.getContractAt("ERC20", "0xPropertyTokenAddress");
const Exchange = await ethers.getContractAt("TokenExchange", "0xExchangeAddress");

# Approve and transfer
await PropertyToken.approve(Exchange.target, ethers.parseUnits("1000", 18));
await PropertyToken.transfer(Exchange.target, ethers.parseUnits("1000", 18));
```

## Contract Functions

### Owner Functions

```solidity
// Set exchange rate for a property token
function setExchangeRate(address propertyToken, uint256 rate) external onlyOwner;

// Enable/disable a property token
function setPropertyTokenEnabled(address propertyToken, bool enabled) external onlyOwner;

// Pause/unpause exchange
function pause() external onlyOwner;
function unpause() external onlyOwner;

// Withdraw TPT or property tokens
function withdrawTPT(uint256 amount) external onlyOwner;
function withdrawPropertyTokens(address propertyToken, uint256 amount) external onlyOwner;
```

### Public Functions

```solidity
// Exchange TPT for property tokens
function exchangeTPTForPropertyToken(
    address propertyToken,
    uint256 tptAmount
) external returns (uint256);

// Calculate exchange amount
function calculateExchange(
    address propertyToken,
    uint256 tptAmount
) external view returns (uint256);

// Get exchange rate
function exchangeRates(address propertyToken) external view returns (uint256);

// Check if token is enabled
function isPropertyTokenEnabled(address propertyToken) external view returns (bool);
```

## Verification Checklist

After running the setup script, verify:

- [ ] All property tokens have exchange rates set
- [ ] All property tokens are enabled for exchange
- [ ] Exchange contract is not paused
- [ ] Property tokens are deposited to exchange contract
- [ ] Frontend environment variables are updated
- [ ] Exchange functionality tested end-to-end

## Troubleshooting

### Error: "Deployer is not the owner"

**Solution**: Ensure the deployer wallet is the owner of the TokenExchange contract. Check ownership:

```solidity
const owner = await exchange.owner();
console.log("Owner:", owner);
```

### Error: "Exchange rate not set"

**Solution**: Run the setup script to configure exchange rates for all property tokens.

### Error: "Property token not enabled"

**Solution**: The setup script enables tokens automatically. If a token is not enabled, check:

1. Exchange rate is set (required before enabling)
2. Deployer is the owner
3. Token address is correct

### Error: "Insufficient property token balance"

**Solution**: Deposit property tokens to the exchange contract:

```solidity
propertyToken.transfer(exchangeAddress, amount);
```

### No Property Tokens Found

**Solution**: Create property tokens first:

1. Register assets in RWAAssetRegistry
2. Create tokens using RWATokenFactory
3. Run setup script again

## Related Documentation

- [Token Exchange Deployment](../scripts/deploy-token-exchange.ts)
- [Token Exchange Contract](../contracts/TokenExchange.sol)
- [Phase 5 Token Exchange Complete](../../docs/PHASE_5_TOKEN_EXCHANGE_COMPLETE.md)
- [Tiger Wallet Integration Summary](../../docs/TIGER_WALLET_INTEGRATION_SUMMARY.md)

## Contract Addresses (Sepolia)

| Contract | Address | Type |
|----------|---------|------|
| **TokenExchange** | `0xEBEcD0BB0791efBCc179F83369569f19379cCfB1` | Direct |
| **TPT Token** | `0xb0af8e94C74c2346609c3d94FCba61Ae85cf3e6e` | Proxy (UUPS) |
| **RWAAssetRegistry** | `0xe2d49642B5aE5D0f62dA79D572d04cA95dB2853D` | Proxy |
| **RWATokenFactory** | `0x2f051A127Ab4B8b0D78aB5758E06a808a8445566` | Proxy |

---

**Last Updated**: 2025-01-11

