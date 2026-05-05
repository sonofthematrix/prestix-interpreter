# Contract Verification Guide

## Overview

This guide explains how to verify the three RWA contracts deployed on Sepolia testnet on Etherscan.

## Contract Addresses

- **RWAAssetRegistry**: `0x4db4f17e4e3a67bBD8c0cD3BE83072961703Ef07`
- **RWATokenFactory**: `0x07E9a4C59c7774b2700d8e3fe3424CD9fB85aa2E`
- **RWAMarketplace**: `0x6e3bfae36b8eE8F0Ec2BA9C3CE6db1Bf61331BD0`

## Prerequisites

1. **Etherscan API Key**: Get one from [Etherscan API](https://etherscan.io/apis)
2. **Environment Variables**: Ensure `.env` file exists in `smart-contracts/` directory with:
   ```bash
   ETHERSCAN_API_KEY=your_api_key_here
   SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
   PRIVATE_KEY=your_private_key_here
   ```

## Verification Steps

### Option 1: Automated Verification Script (Recommended)

Run the verification script that automatically verifies all three contracts:

```bash
cd smart-contracts
bun run verify:sepolia:all
```

This script will:
1. Get implementation addresses from proxy addresses
2. Verify all implementation contracts
3. Attempt to verify proxy contracts (OpenZeppelin proxies are usually pre-verified)
4. Save verification results to `deployments/sepolia-verification-results.json`

### Option 2: Manual Verification

If automated verification fails, you can verify contracts manually:

#### Step 1: Get Implementation Addresses

For each proxy address, get the implementation address:

```bash
# Using Hardhat console
cd smart-contracts
bun run hardhat console --network sepolia

# In console:
const upgrades = require("@openzeppelin/hardhat-upgrades");
const impl = await upgrades.erc1967.getImplementationAddress("0x4db4f17e4e3a67bBD8c0cD3BE83072961703Ef07");
console.log("Registry Implementation:", impl);
```

#### Step 2: Verify Implementation Contracts

Verify each implementation contract (upgradeable contracts have no constructor args):

```bash
# Verify RWAAssetRegistry Implementation
bun run hardhat verify --network sepolia <IMPLEMENTATION_ADDRESS> \
  --contract contracts/upgradeable/RWAAssetRegistryUpgradeable.sol:RWAAssetRegistryUpgradeable

# Verify RWATokenFactory Implementation
bun run hardhat verify --network sepolia <IMPLEMENTATION_ADDRESS> \
  --contract contracts/upgradeable/RWATokenFactoryUpgradeable.sol:RWATokenFactoryUpgradeable

# Verify RWAMarketplace Implementation
bun run hardhat verify --network sepolia <IMPLEMENTATION_ADDRESS> \
  --contract contracts/upgradeable/RWAMarketplaceUpgradeable.sol:RWAMarketplaceUpgradeable
```

## Verification Results

After successful verification, you can view the contracts on Etherscan:

- **Proxy Contracts** (what users interact with):
  - Registry: https://sepolia.etherscan.io/address/0x4db4f17e4e3a67bBD8c0cD3BE83072961703Ef07
  - Factory: https://sepolia.etherscan.io/address/0x07E9a4C59c7774b2700d8e3fe3424CD9fB85aa2E
  - Marketplace: https://sepolia.etherscan.io/address/0x6e3bfae36b8eE8F0Ec2BA9C3CE6db1Bf61331BD0

- **Implementation Contracts**: The verification script will output the implementation addresses

## Troubleshooting

### Error: "Contract source code already verified"
This means the contract is already verified. You can view it on Etherscan.

### Error: "Failed to verify contract"
Possible causes:
1. **Wrong compiler version**: Ensure Hardhat config matches deployment compiler version
2. **Wrong optimization settings**: Check `hardhat.config.ts` optimizer settings
3. **Implementation address not found**: Ensure proxy address is correct and deployed

### Error: "ETHERSCAN_API_KEY not set"
Make sure you have:
1. Created `.env` file in `smart-contracts/` directory
2. Added `ETHERSCAN_API_KEY=your_key_here`
3. Restarted terminal/IDE to load environment variables

## Important Notes

1. **Upgradeable Contracts**: These contracts use UUPS (Universal Upgradeable Proxy Standard) pattern
   - Proxy contracts delegate calls to implementation contracts
   - Implementation contracts are what need to be verified
   - Proxy contracts are usually OpenZeppelin contracts that are pre-verified

2. **Constructor Arguments**: Upgradeable contracts don't have constructor arguments (they use initializers)
   - Implementation contracts have empty constructor args: `[]`
   - Proxy contracts have constructor args but are usually pre-verified

3. **Verification Time**: Etherscan may take a few minutes to index new contracts
   - Wait 30-60 seconds after deployment before verification
   - The verification script includes automatic delays

## Next Steps After Verification

1. Update environment variables in root `.env`:
   ```bash
   NEXT_PUBLIC_RWA_ASSET_REGISTRY_ADDRESS=0x4db4f17e4e3a67bBD8c0cD3BE83072961703Ef07
   NEXT_PUBLIC_RWA_TOKEN_FACTORY_ADDRESS=0x07E9a4C59c7774b2700d8e3fe3424CD9fB85aa2E
   NEXT_PUBLIC_RWA_MARKETPLACE_ADDRESS=0x6e3bfae36b8eE8F0Ec2BA9C3CE6db1Bf61331BD0
   ```

2. Test contract interactions in the admin dashboard
3. Verify frontend can connect to contracts
4. Test marketplace functionality

