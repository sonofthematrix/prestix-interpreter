# ABI Generation Summary

## Overview

All ABIs for deployed contracts on Sepolia have been successfully generated from compiled artifacts.

## Generated Files

### Individual Contract ABIs

**Main ABIs Directory (`abis/`):**
- `ProxyAdmin.json` - Full ABI with metadata
- `TigerPalaceToken.json` - Full ABI with metadata
- `RWAAssetRegistry.json` - Full ABI with metadata
- `RWATokenFactory.json` - Full ABI with metadata
- `RWAMarketplace.json` - Full ABI with metadata
- `RWAStaking.json` - Full ABI with metadata
- `RWARewardDistributor.json` - Full ABI with metadata
- `RWARevenue.json` - Full ABI with metadata
- `MembershipSystem.json` - Full ABI with metadata

**Frontend ABIs Directory (`abis/frontend/`):**
- `ProxyAdmin.json` - Minimal ABI for frontend
- `TigerPalaceToken.json` - Minimal ABI for frontend
- `RWAAssetRegistry.json` - Minimal ABI for frontend
- `RWATokenFactory.json` - Minimal ABI for frontend
- `RWAMarketplace.json` - Minimal ABI for frontend
- `RWAStaking.json` - Minimal ABI for frontend
- `RWARewardDistributor.json` - Minimal ABI for frontend
- `RWARevenue.json` - Minimal ABI for frontend
- `MembershipSystem.json` - Minimal ABI for frontend
- `TigerPalaceEcosystem-Frontend.json` - Combined ecosystem ABI
- `types.ts` - TypeScript type definitions
- `integration-example.ts` - Frontend integration example

**Network-Specific ABIs (`abis/sepolia/`):**
- Individual contract ABIs for Sepolia network

**Ecosystem ABI:**
- `abis/TigerPalaceEcosystem.json` - Complete ecosystem ABI with all contracts

## Contract Addresses (Use PROXY addresses for frontend)

| Contract | Proxy Address | Implementation Address |
|----------|--------------|----------------------|
| **ProxyAdmin** | `0xB8AD57FC91066Bba784186A307D9b0271ce4d789` | N/A |
| **TigerPalaceToken** | `0x5E53F7C9b586eE12CA8A579456af2a6093141D69` | `0x4A207b4302562DEFD9eCcf6Af3727D562FF9eD2C` |
| **RWAAssetRegistry** | `0xA1fb017a8c89cCB76F63d2244C4a228964B50D80` | `0x0cFDc1d5B5BAF41d07D207ACAD28dDC4D7092F96` |
| **RWATokenFactory** | `0x25Ea8960676D017811039481A39516a7E7112133` | `0x0b6120e21e98FedED4b54aA9Ca86B58953dd84b2` |
| **RWAMarketplace** | `0x5295d340a0B06A2552C2169E5D238849550ea9Fe` | `0x6432709B40350cc74D3147B8aeB4181CF3F0197D` |
| **RWAStaking** | `0x83897dE9eF0c7fc3003fD9602231963D1649B357` | `0x1e36c8940F7DEa536C8483A465719A3eeaE606ad` |
| **RWARewardDistributor** | `0xEd4D6FdE0B663BAA5a0bc8DC3a50493D984FA833` | N/A (Direct deployment) |
| **RWARevenue** | `0xd64867B8840c09e6Bc448fd2d70C0EA7b1E3D889` | N/A (Direct deployment) |
| **MembershipSystem** | `0xef48e58ca2411A098F09Ac85ECe400A4f6FF03DA` | `0x1083A8fd80419664A51dCaf1AC11fEE37Ada61cF` |

## Usage

### Frontend Integration

```typescript
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from './abis/frontend/types';
import RWAMarketplaceABI from './abis/frontend/RWAMarketplace.json';

// Initialize contract
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const marketplace = new ethers.Contract(
  CONTRACT_ADDRESSES.RWAMarketplace,
  RWAMarketplaceABI.abi,
  signer
);

// Use the contract
const assets = await marketplace.getAllAssets();
```

### Using the Integration Helper

```typescript
import { TigerPalaceRWAIntegration } from './abis/frontend/integration-example';

const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const rwa = new TigerPalaceRWAIntegration(provider, signer);

// Get user's token balance
const balance = await rwa.getTokenBalance(userAddress);

// Stake tokens
await rwa.stake(1, '1000');
```

## Important Notes

1. **Use Proxy Addresses**: Always use proxy addresses (not implementation addresses) for frontend integration. Proxy addresses are upgradeable and will remain constant even after upgrades.

2. **ABI Source**: All ABIs are generated from compiled artifacts, ensuring they match the deployed contracts exactly.

3. **Network**: All addresses are for Sepolia testnet (Chain ID: 11155111).

4. **TypeScript Support**: TypeScript types are included in `abis/frontend/types.ts` for type-safe contract interactions.

5. **Ecosystem ABI**: The combined `TigerPalaceEcosystem-Frontend.json` contains all contracts in a single file for convenience.

## Regenerating ABIs

To regenerate ABIs after contract changes:

```bash
# Compile contracts first
bun hardhat compile

# Generate ABIs
bun hardhat run scripts/generate-deployed-contracts-abis.ts --network sepolia
```

## File Structure

```
abis/
├── ProxyAdmin.json
├── TigerPalaceToken.json
├── RWAAssetRegistry.json
├── RWATokenFactory.json
├── RWAMarketplace.json
├── RWAStaking.json
├── RWARewardDistributor.json
├── RWARevenue.json
├── MembershipSystem.json
├── TigerPalaceEcosystem.json
├── frontend/
│   ├── ProxyAdmin.json
│   ├── TigerPalaceToken.json
│   ├── RWAAssetRegistry.json
│   ├── RWATokenFactory.json
│   ├── RWAMarketplace.json
│   ├── RWAStaking.json
│   ├── RWARewardDistributor.json
│   ├── RWARevenue.json
│   ├── MembershipSystem.json
│   ├── TigerPalaceEcosystem-Frontend.json
│   ├── types.ts
│   └── integration-example.ts
└── sepolia/
    ├── ProxyAdmin.json
    ├── TigerPalaceToken.json
    ├── ... (all contracts)
```

## Summary

✅ **9 Contracts** - ABIs generated
✅ **3 Output Directories** - Main, frontend, and network-specific
✅ **TypeScript Types** - Generated for type-safe integration
✅ **Integration Example** - Complete frontend integration helper class
✅ **Ecosystem ABI** - Combined ABI for all contracts

All ABIs are ready for frontend integration!

