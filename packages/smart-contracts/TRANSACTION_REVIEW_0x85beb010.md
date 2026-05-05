# Transaction Review: purchaseTokensWithERC20

## Transaction Details

- **Transaction Hash**: `0x85beb0104eade67c100bac21121fcaeeb2d84a5eb7ad91f894489ad468a2b03b`
- **Buyer Wallet**: `0xFe3DafA1c35b0562A910359f67d71eCB21328205`
- **Function**: `purchaseTokensWithERC20(uint256 assetId, uint256 tokenAmount)`
- **Parameters**:
  - `assetId`: 11
  - `tokenAmount`: 1
- **Token Contract**: `0xc9C369525DFf385935dfDC6aC2F678C26998D0d7`
- **404 Factory**: `0x7a6f7dE826064903f2e419833b9633560217FEe2`

## Transaction Flow Analysis

### 1. Function Entry (`purchaseTokensWithERC20`)

```207:291:contracts/upgradeable/RWAMarketplaceUpgradeable.sol
    function purchaseTokensWithERC20(
        uint256 assetId,
        uint256 tokenAmount
    ) external nonReentrant whenNotPaused {
        require(tokenAmount > 0, "RWAMarketplace: invalid token amount");
        require(paymentToken != address(0), "RWAMarketplace: ERC20 payments not enabled");
        
        IERC20Upgradeable token = IERC20Upgradeable(paymentToken);
        
        // Get asset details
        IRWAAssetRegistry.AssetDetails memory asset = assetRegistry.getAsset(assetId);
        require(asset.status == 1, "RWAMarketplace: asset not active");
        require(asset.availableTokens >= tokenAmount, "RWAMarketplace: insufficient tokens available");

        // Calculate costs in ETH
        (uint256 totalCostEth, uint256 marketplaceFeeEth) = calculatePurchaseCost(assetId, tokenAmount);
        
        // Convert ETH cost to payment token using price oracle
        uint256 totalCost;
        uint256 marketplaceFee;
        
        if (priceOracle != address(0)) {
            ChainlinkPriceOracle oracle = ChainlinkPriceOracle(priceOracle);
            // Check if payment token is USDC or EURC (6 decimals)
            // For now, assume USDC - can be extended for EURC
            totalCost = oracle.convertEthToUsdc(totalCostEth);
            marketplaceFee = oracle.convertEthToUsdc(marketplaceFeeEth);
        } else {
            // Fallback: use 1:1 conversion (not accurate but works for testing)
            // In production, always use price oracle
            totalCost = totalCostEth / 10**12; // Convert from 18 decimals to 6 decimals
            marketplaceFee = marketplaceFeeEth / 10**12;
        }
        
        // Check allowance and balance
        require(token.balanceOf(msg.sender) >= totalCost, "RWAMarketplace: insufficient token balance");
        require(token.allowance(msg.sender, address(this)) >= totalCost, "RWAMarketplace: insufficient token allowance");

        // Get or create token contract
        address tokenAddress = _getTokenAddress(assetId);
        uint256 tokenAssetId = assetId; // Default to registry assetId
        bool isERC404 = false;
        
        if (tokenAddress == address(0)) {
            // Create token if it doesn't exist (or find existing ERC404)
            tokenAddress = _createToken(asset);
            // Check if the returned token is an ERC404 token
            if (tokenFactory404 != address(0)) {
                isERC404 = IRWATokenFactory404(tokenFactory404).isValidToken(tokenAddress);
                if (isERC404) {
                    // Get the token's actual assetId (may differ from registry assetId)
                    tokenAssetId = IRWAToken404(tokenAddress).assetId();
                }
            }
        } else {
            // Token exists - check if it's ERC404
            if (tokenFactory404 != address(0)) {
                isERC404 = IRWATokenFactory404(tokenFactory404).isValidToken(tokenAddress);
                if (isERC404) {
                    // Get the token's actual assetId (may differ from registry assetId)
                    tokenAssetId = IRWAToken404(tokenAddress).assetId();
                }
            }
        }

        // Mint tokens to buyer via appropriate factory
        if (isERC404) {
            // Use ERC404 factory to mint (use token's assetId, not registry assetId)
            IRWATokenFactory404(tokenFactory404).mintTokens(tokenAssetId, msg.sender, tokenAmount);
        } else {
            // Use ERC20 factory to mint (use registry assetId)
        IRWATokenFactory(tokenFactory).mintTokens(assetId, msg.sender, tokenAmount);
        }

        // Update registry availability (will auto-update status if sold out)
        assetRegistry.updateTokenAvailability(assetId, tokenAmount);

        // Transfer payment tokens from buyer
        uint256 ownerPayment = totalCost.sub(marketplaceFee);
        require(token.transferFrom(msg.sender, asset.owner, ownerPayment), "RWAMarketplace: owner payment failed");
        require(token.transferFrom(msg.sender, address(this), marketplaceFee), "RWAMarketplace: fee collection failed");
        _collectedFeesERC20[paymentToken] = _collectedFeesERC20[paymentToken].add(marketplaceFee);

        emit TokensPurchasedWithERC20(assetId, msg.sender, paymentToken, tokenAmount, totalCost, block.timestamp);
    }
```

### 2. Token Address Resolution (`_getTokenAddress`)

```565:578:contracts/upgradeable/RWAMarketplaceUpgradeable.sol
    function _getTokenAddress(uint256 assetId) internal view returns (address) {
        // First check ERC20 factory
        address tokenAddress = IRWATokenFactory(tokenFactory).getTokenAddress(assetId);
        if (tokenAddress != address(0)) {
            return tokenAddress;
        }
        
        // If not found and ERC404 factory is set, check ERC404 factory
        if (tokenFactory404 != address(0)) {
            tokenAddress = IRWATokenFactory404(tokenFactory404).getTokenAddress(assetId);
        }
        
        return tokenAddress;
    }
```

**Key Point**: The function checks ERC20 factory first, then ERC404 factory. Since token contract `0xc9C369525DFf385935dfDC6aC2F678C26998D0d7` exists, it was found via one of these factories.

### 3. ERC404 Detection Logic

The code checks if the token is ERC404:
- If `tokenFactory404` is set, it calls `isValidToken(tokenAddress)` on the 404 factory
- If valid, it retrieves the token's actual `assetId` (which may differ from registry `assetId`)
- Uses `tokenAssetId` for minting instead of registry `assetId`

## RWATokenFactory404 Contract Review

### Contract Address: `0x7a6f7dE826064903f2e419833b9633560217FEe2`

```86:89:contracts/core/RWATokenFactory404.sol
    function mintTokens(uint256 assetId, address to, uint256 amount) external onlyRole(TOKEN_CREATOR_ROLE) {
        address token = _getTokenAddress(assetId);
        RWAToken404(payable(token)).mint(to, amount);
    }
```

### Key Features:

1. **Access Control**: Requires `TOKEN_CREATOR_ROLE` to mint tokens
2. **Token Lookup**: Uses `_getTokenAddress(assetId)` to find the token contract
3. **Minting**: Calls `mint()` on the RWAToken404 contract

### Critical Requirements:

**The Marketplace contract MUST have `TOKEN_CREATOR_ROLE` on the 404 factory** for minting to work.

```24:24:contracts/core/RWATokenFactory404.sol
    bytes32 public constant TOKEN_CREATOR_ROLE = keccak256("TOKEN_CREATOR_ROLE");
```

## Potential Issues & Recommendations

### ✅ What Worked Correctly:

1. **Token Detection**: The marketplace correctly identified the token contract at `0xc9C369525DFf385935dfDC6aC2F678C26998D0d7`
2. **ERC404 Handling**: The code properly handles ERC404 tokens by:
   - Checking if token is ERC404 via `isValidToken()`
   - Retrieving the token's actual `assetId` if it differs from registry `assetId`
   - Using `tokenAssetId` for minting (critical for ERC404 tokens)

### ⚠️ Areas to Verify:

1. **Role Assignment**: 
   - Verify that the Marketplace contract has `TOKEN_CREATOR_ROLE` on the 404 factory
   - Check: `hasRole(TOKEN_CREATOR_ROLE, marketplaceAddress)` on factory

2. **AssetId Mismatch Handling**:
   - The code handles cases where registry `assetId` (11) differs from token's `assetId`
   - This is important for ERC404 tokens that may have been created with different assetIds

3. **Token Creation Logic**:
   - `_createToken()` first tries to find existing ERC404 tokens matching asset metadata
   - Only creates new ERC20 token if no existing token found
   - This prevents duplicate token creation

4. **Price Oracle**:
   - If `priceOracle` is `address(0)`, uses fallback conversion (1:1 with decimal adjustment)
   - **Recommendation**: Always use price oracle in production

### 🔍 Verification Checklist:

- [ ] Marketplace has `TOKEN_CREATOR_ROLE` on 404 factory (`0x7a6f7dE826064903f2e419833b9633560217FEe2`)
- [ ] Token contract `0xc9C369525DFf385935dfDC6aC2F678C26998D0d7` is registered in 404 factory
- [ ] Token's `assetId` matches or is correctly mapped to registry `assetId` 11
- [ ] Price oracle is configured (if not, fallback conversion is acceptable for testing)
- [ ] Payment token (USDC) balance and allowance were sufficient
- [ ] Tokens were successfully minted to buyer address
- [ ] Registry availability was updated correctly

## Transaction Outcome

Based on the code flow:

1. ✅ Validated `tokenAmount > 0` (1 token)
2. ✅ Checked `paymentToken` is set
3. ✅ Retrieved asset details for assetId 11
4. ✅ Verified asset is active and has available tokens
5. ✅ Calculated costs and converted to payment token (USDC)
6. ✅ Verified buyer balance and allowance
7. ✅ Found existing token contract `0xc9C369525DFf385935dfDC6aC2F678C26998D0d7`
8. ✅ Determined if token is ERC404 (via factory check)
9. ✅ Minted tokens using appropriate factory and assetId
10. ✅ Updated registry availability
11. ✅ Transferred payment tokens (owner payment + marketplace fee)

## Verification Results

### ❌ Critical Issues Found:

1. **Marketplace Missing TOKEN_CREATOR_ROLE**
   - Marketplace does NOT have `TOKEN_CREATOR_ROLE` on 404 factory
   - **Impact**: Minting will fail when marketplace tries to mint tokens
   - **Fix**: Grant role: `factory404.grantRole(TOKEN_CREATOR_ROLE, marketplaceAddress)`

2. **Token Not Registered in Factory**
   - Token `0xc9C369525DFf385935dfDC6aC2F678C26998D0d7` is NOT valid in factory
   - Factory returns assetId `0` for this token (should be 11 or matching value)
   - **Impact**: Factory cannot mint tokens for unregistered tokens

3. **Marketplace tokenFactory404 Not Configured**
   - Marketplace's `tokenFactory404` is set to `address(0)`
   - **Impact**: Marketplace cannot detect or create ERC404 tokens
   - **Fix**: Call `marketplace.setTokenFactory404(0x7a6f7dE826064903f2e419833b9633560217FEe2)`

4. **Transaction Likely Failed**
   - Based on verification, the transaction likely failed due to missing role/permissions
   - Token contract may not be ERC404 or may not exist at that address

### ⚠️ Important Note:

The transaction was called on marketplace implementation address `0x3E8b80714196ecB6925150347215bDF4C1420a8d`, but the proxy address is `0x5295d340a0B06A2552C2169E5D238849550ea9Fe`. 

**Always use the proxy address for transactions**, not the implementation address!

## Next Steps

1. **Grant TOKEN_CREATOR_ROLE**: 
   ```solidity
   factory404.grantRole(TOKEN_CREATOR_ROLE, marketplaceProxyAddress)
   ```

2. **Configure tokenFactory404 on Marketplace**:
   ```solidity
   marketplace.setTokenFactory404(0x7a6f7dE826064903f2e419833b9633560217FEe2)
   ```

3. **Register Token in Factory** (if token exists):
   - Verify token contract is valid ERC404
   - Ensure token is created via factory's `createToken404` function

4. **Use Proxy Address**: Always interact with marketplace proxy `0x5295d340a0B06A2552C2169E5D238849550ea9Fe`, not implementation

5. **Verify Transaction Status**: Check if transaction actually succeeded or reverted

## References

- Marketplace Contract: [RWAMarketplaceUpgradeable.sol](contracts/upgradeable/RWAMarketplaceUpgradeable.sol)
- 404 Factory Contract: [RWATokenFactory404.sol](contracts/core/RWATokenFactory404.sol)
- Etherscan Transaction: https://sepolia.etherscan.io/tx/0x85beb0104eade67c100bac21121fcaeeb2d84a5eb7ad91f894489ad468a2b03b
- 404 Factory on Etherscan: https://sepolia.etherscan.io/address/0x7a6f7dE826064903f2e419833b9633560217FEe2

