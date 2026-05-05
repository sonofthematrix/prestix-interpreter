# Token Transfer Instructions for ERC404 Testing

## Current Situation

### Token Ownership
- **All tokens are owned by**: `0xc9C369525DFf385935dfDC6aC2F678C26998D0d7`
- **Deployer wallet**: `0x8eD7F4FB3Aa1a3B346756624B17094dfd6040047` (has factory roles but doesn't own tokens)
- **Buyer wallet**: `0xfe3dafa1c35b0562a910359f67d71ecb21328205` (needs tokens for testing)

### Token Holdings
- Asset 1: 1000.0 ASSET1 (100%)
- Asset 2: 2000.0 ASSET2 (100%)
- Asset 3: 500.0 ASSET3 (100%)
- Asset 4: 1000000.0 ASSET4 (100%)

## Solution Options

### Option 1: Direct Transfer (Requires Holder's Private Key) ✅ Recommended

If you have access to the private key for `0xc9C369525DFf385935dfDC6aC2F678C26998D0d7`:

```bash
cd packages/smart-contracts
HOLDER_KEY=<private_key_of_0xc9C369525DFf385935dfDC6aC2F678C26998D0d7> \
BUYER_WALLET_1=0xfe3dafa1c35b0562a910359f67d71ecb21328205 \
ASSET_IDS=1,2,3 \
bun run hardhat run scripts/transfer-tokens-for-testing.ts --network sepolia
```

This will transfer 100 tokens (or 10% of balance) from the holder to the buyer wallet for each asset.

### Option 2: Factory Mint (Requires Owner Approval)

The fixed factory uses `transferFrom`, which requires:
1. Token owner (`0xc9C369525DFf385935dfDC6aC2F678C26998D0d7`) to approve the factory
2. Factory to transfer from owner to buyer

**This won't work** unless you have the owner's private key to approve the factory.

### Option 3: Deploy New Test Token

Deploy a new ERC404 token specifically for testing:

```bash
cd packages/smart-contracts
# Use factory to deploy new token
# Mint tokens directly to buyer wallet during deployment
```

## Scripts Available

### 1. `transfer-tokens-for-testing.ts`
**Purpose**: Transfer tokens directly from holder to buyer  
**Requires**: Holder's private key (`HOLDER_KEY`)  
**Usage**:
```bash
HOLDER_KEY=0x... BUYER_WALLET_1=0x... ASSET_IDS=1,2,3 \
bun run hardhat run scripts/transfer-tokens-for-testing.ts --network sepolia
```

### 2. `mint-tokens-for-testing.ts`
**Purpose**: Mint tokens via factory (uses transferFrom)  
**Requires**: Deployer with TOKEN_CREATOR_ROLE  
**Status**: ⚠️ Fails because owner hasn't approved factory  
**Usage**:
```bash
BUYER_WALLET_1=0x... ASSET_IDS=1,2,3 \
bun run hardhat run scripts/mint-tokens-for-testing.ts --network sepolia
```

### 3. `test-erc404-token-lifecycle.ts`
**Purpose**: Comprehensive ERC404 lifecycle testing  
**Requires**: Buyer wallet with tokens  
**Usage**:
```bash
BUYER_WALLET_1=0x... BUYER_KEY_1=0x... ASSET_IDS=1,2,3 \
bun run hardhat run scripts/test-erc404-token-lifecycle.ts --network sepolia
```

## Next Steps

1. **Identify holder's private key**: Check if `0xc9C369525DFf385935dfDC6aC2F678C26998D0d7` matches any known deployer/admin wallet
2. **If you have the key**: Use `transfer-tokens-for-testing.ts` to transfer tokens
3. **If you don't have the key**: 
   - Check environment variables for deployer/admin keys
   - Or deploy a new test token via factory
   - Or fix the marketplace contract to allow purchases

## Checking Environment Variables

The holder address might match one of these environment variables:
- `ADMIN_PRIVATE_KEY`
- `PRIVATE_KEY`
- `TGR_DEPLOY_PRVT_KEY`
- `DEPLOYER_PRIVATE_KEY`

Check if any of these correspond to `0xc9C369525DFf385935dfDC6aC2F678C26998D0d7`:

```bash
# Check deployer address from private key
node -e "const { ethers } = require('ethers'); const wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY); console.log(wallet.address);"
```

## Testing After Token Transfer

Once tokens are transferred, run the comprehensive lifecycle test:

```bash
cd packages/smart-contracts
BUYER_WALLET_1=0xfe3dafa1c35b0562a910359f67d71ecb21328205 \
BUYER_KEY_1=f9ac6eb25ad51dd9c4d5605e9e2d97ed712f255267b2cd4b9455e2c08772d09b \
ASSET_IDS=1,2,3 \
bun run hardhat run scripts/test-erc404-token-lifecycle.ts --network sepolia
```

This will test:
1. ✅ Token minting (already have tokens)
2. ✅ Token → NFT conversion (requires 100% ownership)
3. ✅ NFT details (ownership, token ID, metadata)
4. ✅ NFT → Token conversion
5. ✅ Token burning
