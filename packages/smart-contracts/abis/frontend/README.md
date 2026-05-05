# Blockchain Service Integration Guide

## Overview

The Blockchain Service provides a unified interface for interacting with TigerPalace RWA contracts with automatic MetaMask function signature registration for transaction decoding.

## Features

- ✅ **Unified Contract Interface** - Single service for all contract interactions
- ✅ **MetaMask Integration** - Automatic function signature registration
- ✅ **Transaction Decoding** - Human-readable function names and parameters in MetaMask
- ✅ **Type-Safe** - Full TypeScript support
- ✅ **Proxy Address Support** - Uses proxy addresses for upgradeable contracts

## Installation

### Ethers.js Version (Recommended)

```typescript
import { BlockchainService, initializeBlockchainService } from './blockchain-service';
```

### Web3.js Version

```typescript
import { BlockchainServiceWeb3, initializeBlockchainServiceWeb3 } from './blockchain-service-web3';
```

## Quick Start

### Basic Usage

```typescript
import { ethers } from 'ethers';
import { BlockchainService } from './blockchain-service';

// Initialize provider and signer
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

// Create service instance
const service = new BlockchainService(provider, signer);

// Initialize (registers function signatures)
await service.initialize();

// Use the service
const balance = await service.getTokenBalance(userAddress);
await service.stake(1, '1000');
```

### With MetaMask Auto-Initialization

**Ethers.js:**
```typescript
import { initializeBlockchainService } from './blockchain-service';

// Automatically connects to MetaMask and initializes service
const service = await initializeBlockchainService();

// Service is ready to use
const assets = await service.getAllAssets();
```

**Web3.js:**
```typescript
import { initializeBlockchainServiceWeb3 } from './blockchain-service-web3';

// Automatically connects to MetaMask and initializes service
const service = await initializeBlockchainServiceWeb3();

// Service is ready to use
const assets = await service.getAllAssets();
```

## Function Signature Registration

### Automatic Registration

The service automatically extracts function signatures from contract ABIs and can register them with 4byte.directory for MetaMask decoding:

```typescript
const service = new BlockchainService(provider, signer);
await service.initialize();

// Register signatures with MetaMask (optional - can be done in background)
const result = await service.registerSignaturesWithMetaMask();
console.log(`Registered: ${result.registered}, Failed: ${result.failed}`);
```

### Manual Registration Script

For bulk registration, use the registration script:

```bash
bun hardhat run scripts/register-function-signatures.ts --network sepolia
```

This will:
- Extract all function signatures from deployed contracts
- Check if they exist in 4byte.directory
- Register new signatures
- Save results to `deployments/function-signature-registration.json`

## API Reference

### Token Operations

```typescript
// Get token balance
const balance = await service.getTokenBalance(address);

// Approve token spending
await service.approveToken(spenderAddress, amount);
```

### Asset Registry Operations

```typescript
// Get asset by ID
const asset = await service.getAsset(assetId);

// Get all assets
const assets = await service.getAllAssets();

// Register new asset
const txHash = await service.registerAsset({
  owner: ownerAddress,
  title: 'Property Title',
  description: 'Property Description',
  assetType: 'Real Estate',
  location: 'Location',
  price: ethers.parseEther('1000000'),
  tokenPrice: ethers.parseEther('100'),
  totalTokens: ethers.parseEther('10000'),
});
```

### Marketplace Operations

```typescript
// Purchase tokens
const txHash = await service.purchaseTokens(assetId, tokenAmount, ethValue);

// Create listing
const txHash = await service.createListing(assetId, pricePerToken, totalTokens);
```

### Staking Operations

```typescript
// Stake tokens
const txHash = await service.stake(poolId, amount);

// Claim rewards
const txHash = await service.claimRewards(stakeId);

// Get user stakes
const stakes = await service.getUserStakes(userAddress);

// Get pending rewards
const rewards = await service.getPendingRewards(userAddress, stakeId);

// Get all pools
const pools = await service.getAllPools();
```

### Revenue & Rewards

```typescript
// Get revenue stats
const stats = await service.getRevenueStats();

// Get reward pool stats
const poolStats = await service.getRewardPoolStats();
```

### Membership

```typescript
// Get membership level
const membership = await service.getMembershipLevel(userAddress);
```

## Contract Access

Access individual contracts directly:

```typescript
const contracts = service.getContracts();

// Direct contract access
await contracts.rwaMarketplace.purchaseTokens(assetId, amount);
await contracts.rwaStaking.stake(poolId, amount);
```

## MetaMask Transaction Decoding

Once function signatures are registered, MetaMask will automatically decode transactions:

**Before Registration:**
```
Data: 0x8bf0af3e0000000000000000000000000000000000000000000000000000000000000001...
```

**After Registration:**
```
Function: purchaseTokens(uint256 assetId, uint256 tokenAmount)

Parameters:
  assetId: 1
  tokenAmount: 1000000000000000000
```

## Example: Complete Integration

### Ethers.js Version

```typescript
import { initializeBlockchainService } from './blockchain-service';

async function setupApp() {
  try {
    // Initialize service
    const service = await initializeBlockchainService();
    
    // Register signatures (one-time, can be done in background)
    await service.registerSignaturesWithMetaMask();
    
    // Get user address
    const signer = service.getSigner();
    const userAddress = await signer!.getAddress();
    
    // Get user's token balance
    const balance = await service.getTokenBalance(userAddress);
    console.log(`Balance: ${balance} TPT`);
    
    // Get all assets
    const assets = await service.getAllAssets();
    console.log(`Available assets: ${assets.length}`);
    
    // Get staking pools
    const pools = await service.getAllPools();
    console.log(`Staking pools: ${pools.length}`);
    
    return service;
  } catch (error) {
    console.error('Failed to initialize:', error);
    throw error;
  }
}

// Use in React component
useEffect(() => {
  setupApp().then(setService).catch(console.error);
}, []);
```

### Web3.js Version

```typescript
import { initializeBlockchainServiceWeb3 } from './blockchain-service-web3';

async function setupApp() {
  try {
    // Initialize service
    const service = await initializeBlockchainServiceWeb3();
    
    // Register signatures (one-time, can be done in background)
    await service.registerSignaturesWithMetaMask();
    
    // Get user address
    const userAddress = service.getAccount();
    
    // Get user's token balance
    const balance = await service.getTokenBalance(userAddress);
    console.log(`Balance: ${balance} TPT`);
    
    // Get all assets
    const assets = await service.getAllAssets();
    console.log(`Available assets: ${assets.length}`);
    
    // Get staking pools
    const pools = await service.getAllPools();
    console.log(`Staking pools: ${pools.length}`);
    
    return service;
  } catch (error) {
    console.error('Failed to initialize:', error);
    throw error;
  }
}

// Use in React component
useEffect(() => {
  setupApp().then(setService).catch(console.error);
}, []);
```

## Contract Addresses

All contracts use proxy addresses (for upgradeable contracts):

- **ProxyAdmin**: `0xB8AD57FC91066Bba784186A307D9b0271ce4d789`
- **TigerPalaceToken**: `0x5E53F7C9b586eE12CA8A579456af2a6093141D69`
- **RWAAssetRegistry**: `0xA1fb017a8c89cCB76F63d2244C4a228964B50D80`
- **RWATokenFactory**: `0x25Ea8960676D017811039481A39516a7E7112133`
- **RWAMarketplace**: `0x5295d340a0B06A2552C2169E5D238849550ea9Fe`
- **RWAStaking**: `0x83897dE9eF0c7fc3003fD9602231963D1649B357`
- **RWARewardDistributor**: `0xEd4D6FdE0B663BAA5a0bc8DC3a50493D984FA833`
- **RWARevenue**: `0xd64867B8840c09e6Bc448fd2d70C0EA7b1E3D889`
- **MembershipSystem**: `0xef48e58ca2411A098F09Ac85ECe400A4f6FF03DA`

## Notes

1. **Proxy Addresses**: Always use proxy addresses for frontend integration. These remain constant even after contract upgrades.

2. **Function Signatures**: Registration with 4byte.directory may take 5-10 minutes to propagate. MetaMask will automatically use registered signatures once available.

3. **Rate Limiting**: The registration script includes rate limiting (1 second between requests) to avoid overwhelming the 4byte.directory API.

4. **Error Handling**: All contract methods throw errors that should be caught and handled appropriately in your application.

## Troubleshooting

### MetaMask Not Decoding Transactions

1. Check if signatures are registered:
   ```bash
   curl "https://www.4byte.directory/api/v1/signatures/?hex_signature=8bf0af3e"
   ```

2. Wait 5-10 minutes after registration for propagation

3. Clear MetaMask cache and refresh

### Signature Registration Fails

- Many signatures already exist in 4byte.directory (this is normal)
- Check the registration results file: `deployments/function-signature-registration.json`
- Failed registrations are often due to API rate limits or existing signatures

## Related Files

- `blockchain-service.ts` - Main service implementation
- `types.ts` - TypeScript type definitions
- `integration-example.ts` - Integration examples
- `scripts/register-function-signatures.ts` - Bulk registration script

