# Marketplace Token Custody Implementation

## Overview

This document describes the implementation of marketplace token custody architecture, where tokens are minted directly to the marketplace contract, which then transfers them to buyers upon purchase.

## Changes Made

### 1. Factory Contract (`RWATokenFactory404Fixed.sol`)

#### New Function: `createToken404WithMarketplace`
- **Purpose**: Create ERC404 tokens with optional marketplace custody
- **Parameters**:
  - `marketplace`: If provided (non-zero), tokens are minted to marketplace; if `address(0)`, tokens are minted to owner (backward compatibility)
- **Behavior**:
  - If `marketplace != address(0)`: Tokens minted to marketplace, no approval needed
  - If `marketplace == address(0)`: Tokens minted to owner, factory approves itself (backward compatibility)

#### Updated Function: `createToken404`
- Now calls `createToken404WithMarketplace` with `marketplace = address(0)` for backward compatibility

### 2. Interface (`IRWAToken404.sol`)

#### Added Interface Method
```solidity
function createToken404WithMarketplace(
    uint256 assetId,
    string calldata name,
    string calldata symbol,
    uint256 totalSupply,
    address owner,
    address marketplace,
    string calldata tokenURI
) external returns (address tokenAddress);
```

### 3. Marketplace Contract (`RWAMarketplaceUpgradeable.sol`)

#### Updated Purchase Functions

**`purchaseTokens` (ETH payments)** and **`purchaseTokensWithERC20` (ERC20 payments)**:

**Before:**
```solidity
// Transfer from asset owner (required approval)
IRWAToken404(tokenAddress).transferFrom(asset.owner, msg.sender, tokenAmount);
```

**After:**
```solidity
// Transfer from marketplace's own balance (marketplace owns tokens)
IERC20Upgradeable tokenContract = IERC20Upgradeable(tokenAddress);
uint256 marketplaceBalance = tokenContract.balanceOf(address(this));
require(marketplaceBalance >= tokenAmount, "RWAMarketplace: insufficient marketplace token balance");
require(tokenContract.transfer(msg.sender, tokenAmount), "RWAMarketplace: token transfer failed");
```

**Key Changes:**
- ✅ Marketplace checks its own balance before transferring
- ✅ Uses standard ERC20 `transfer` method (marketplace owns tokens)
- ✅ No approval needed (marketplace is the owner)

#### Updated Token Creation Function

**`_createToken` Function:**

**Before:**
```solidity
// Only created ERC20 tokens
return IRWATokenFactory(tokenFactory).createToken(...);
```

**After:**
```solidity
// If ERC404 factory available, create ERC404 token minted to marketplace
if (tokenFactory404 != address(0)) {
    return IRWATokenFactory404(tokenFactory404).createToken404WithMarketplace(
        asset.id,
        asset.title,
        symbol,
        asset.totalTokens,
        asset.owner,        // Owner receives payment
        address(this),     // Marketplace receives tokens
        tokenURI
    );
}
// Fallback to ERC20 if ERC404 factory not available
return IRWATokenFactory(tokenFactory).createToken(...);
```

**Key Changes:**
- ✅ Creates ERC404 tokens when factory is available
- ✅ Mints tokens directly to marketplace (`address(this)`)
- ✅ Owner still receives payment but doesn't hold tokens
- ✅ Maintains backward compatibility with ERC20 tokens

#### Helper Function

**`_uintToString` Function:**
- Added helper to convert `uint256` to `string` for tokenURI construction

## Architecture Benefits

### 1. **Eliminates Approval Issues**
- **Before**: Required owner to approve marketplace for each token transfer
- **After**: Marketplace owns tokens, no approval needed

### 2. **Simplified Token Flow**
- **Before**: Owner → (approve) → Marketplace → (transferFrom) → Buyer
- **After**: Owner → (mint to marketplace) → Marketplace → (transfer) → Buyer

### 3. **Gas Efficiency**
- **Before**: Multiple transactions (approval + transferFrom)
- **After**: Single mint transaction, then simple transfers

### 4. **Better Security**
- Marketplace has full control over token inventory
- No risk of approval mismatches or insufficient allowances
- Clear separation: owner receives payment, marketplace manages tokens

## Migration Path

### For Existing Tokens

Existing tokens minted to owners can continue to work using the old `mintTokens` function (which uses `transferFrom`). The new custody model applies only to newly created tokens.

### For New Tokens

When creating new tokens via `_createToken`:
1. If ERC404 factory is available → Creates ERC404 token minted to marketplace
2. If ERC404 factory not available → Creates ERC20 token (existing behavior)

## Testing Checklist

- [ ] Verify ERC404 tokens are minted to marketplace address
- [ ] Verify marketplace balance check works correctly
- [ ] Verify token transfers from marketplace to buyers succeed
- [ ] Verify payment still goes to asset owner
- [ ] Verify backward compatibility with ERC20 tokens
- [ ] Verify existing tokens (minted to owner) still work via `mintTokens`

## Deployment Notes

1. **Factory Deployment**: Deploy updated `RWATokenFactory404Fixed` contract
2. **Marketplace Upgrade**: Upgrade marketplace to new version
3. **Factory Configuration**: Ensure marketplace has `TOKEN_CREATOR_ROLE` on factory
4. **Testing**: Test token creation and purchase flow before production use

## Related Files

- `contracts/core/RWATokenFactory404Fixed.sol` - Factory with marketplace custody support
- `contracts/upgradeable/RWAMarketplaceUpgradeable.sol` - Marketplace with custody transfers
- `contracts/interfaces/IRWAToken404.sol` - Updated interface
- `MARKETPLACE_TOKEN_CUSTODY_ARCHITECTURE.md` - Architecture design document
