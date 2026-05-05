# Registry TPT Token Configuration

## Overview

The RWAAssetRegistry contract (`0xe2d49642B5aE5D0f62dA79D572d04cA95dB2853D`) is an upgradeable proxy contract that tracks real-world assets. **The registry itself does NOT support TPT token configuration** - TPT tokens are configured on individual RWAToken contracts.

## Registry Contract Details

**Proxy Address**: `0xe2d49642B5aE5D0f62dA79D572d04cA95dB2853D`  
**Implementation**: `0x9e2eD8f46fEb7f70158f1201C06944B724e83411`  
**Proxy Admin**: `0x9d55BcFA47e88868B54C811041A942250d7F3DD9`  
**Network**: Sepolia Testnet (Chain ID: 11155111)  
**Etherscan**: https://sepolia.etherscan.io/address/0xe2d49642B5aE5D0f62dA79D572d04cA95dB2853D

## How TPT Configuration Works

### Registry Role
The registry is responsible for:
- ✅ Tracking asset metadata (title, description, price, tokens)
- ✅ Managing asset status (active, inactive, sold out, paused)
- ✅ Granting marketplace permissions
- ❌ **NOT** configuring TPT tokens

### Token Factory Role
The RWATokenFactory creates tokens but:
- ✅ Creates RWAToken contracts for assets
- ❌ **NOT** responsible for TPT configuration

### Individual Token Role
Each RWAToken contract:
- ✅ **MUST** have TPT token configured via `setTigerPalaceToken()`
- ✅ Used for dividend distribution
- ✅ Configured after token creation

## Configuration Script

Use the configuration script to set TPT token on all existing tokens:

```bash
cd smart-contracts
npx hardhat run scripts/configure-registry-tpt.ts --network sepolia
```

### What the Script Does

1. **Checks Registry** - Confirms registry doesn't support TPT (expected)
2. **Checks Factory** - Confirms factory doesn't support TPT (expected)
3. **Finds All Tokens** - Uses `getAllTokens()` from factory or `getActiveAssets()` from registry
4. **Configures Each Token** - Calls `setTigerPalaceToken()` on each token
5. **Reports Results** - Shows configured, skipped, and error counts

### Requirements

- Deployer must have `DEFAULT_ADMIN_ROLE` on each token contract
- TPT token address: `0xb0af8e94C74c2346609c3d94FCba61Ae85cf3e6e`
- Network: Sepolia (Chain ID: 11155111)

## Manual Configuration

If deployer doesn't have admin role on tokens, asset owners can configure manually:

```solidity
// Connect to token contract
RWAToken token = RWAToken(tokenAddress);

// Set TPT token (requires DEFAULT_ADMIN_ROLE)
token.setTigerPalaceToken(0xb0af8e94C74c2346609c3d94FCba61Ae85cf3e6e);
```

## Verification

Check if a token has TPT configured:

```solidity
address tpt = token.tokenizinToken();
// Should return: 0xb0af8e94C74c2346609c3d94FCba61Ae85cf3e6e
```

## Related Contracts

- **Registry**: `0xe2d49642B5aE5D0f62dA79D572d04cA95dB2853D` (proxy)
- **Token Factory**: `0x2f051A127Ab4B8b0D78aB5758E06a808a8445566` (proxy)
- **TPT Token**: `0xb0af8e94C74c2346609c3d94FCba61Ae85cf3e6e` (proxy)

## Notes

- Registry is a **proxy contract** - all calls go through proxy to implementation
- Registry tracks assets but doesn't manage token configurations
- Each token must be configured individually with TPT address
- New tokens created after configuration will still need TPT set manually (unless factory is upgraded to support it)

