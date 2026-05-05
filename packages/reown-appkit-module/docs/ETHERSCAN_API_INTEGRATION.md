# Etherscan API Integration Guide

## Overview

The Tiger Wallet module integrates with Sepolia Etherscan API to fetch on-chain wallet data including:
- ETH balances
- ERC20 token balances (USDC, EURC, TKNZN)
- ERC721/ERC404 property tokens
- Transaction history (normal and token transfers)

## API Endpoints Used

### Etherscan API Base URL
```
https://api-sepolia.etherscan.io/api
```

### Endpoints Implemented

1. **Account Balance** (`account&action=balance`)
   - Fetches ETH balance for an address
   - Returns balance in Wei

2. **Token Transfers** (`account&action=tokentx`)
   - Fetches ERC20 token transfer events
   - Used to calculate token balances and discover tokens
   - Returns transfer history with token metadata

3. **ERC721 Token Transfers** (`account&action=tokennfttx`)
   - Fetches ERC721/ERC404 token transfer events
   - Used to determine current NFT/property holdings
   - Returns transfer history with token IDs

4. **Normal Transactions** (`account&action=txlist`)
   - Fetches normal ETH transactions
   - Returns transaction history with gas info

## Environment Variables

```bash
# Required for Etherscan API access
ETHERSCAN_API_KEY=your_api_key_here
# OR
NEXT_PUBLIC_ETHERSCAN_API_KEY=your_api_key_here
```

Get your API key from: https://etherscan.io/apis

## API Routes

### `/api/tokenizin-wallet/balances`
- **Method**: GET
- **Query Params**: `address` (wallet address)
- **Returns**: ETH and token balances
- **Data Source**: Direct blockchain queries via viem + Etherscan API

### `/api/tokenizin-wallet/tokens`
- **Method**: GET
- **Query Params**: `address` (wallet address)
- **Returns**: ERC20 token list with balances
- **Data Source**: Etherscan API (`tokentx` endpoint)

### `/api/tokenizin-wallet/properties`
- **Method**: GET
- **Query Params**: `address` (wallet address)
- **Returns**: ERC721/ERC404 property tokens
- **Data Source**: Etherscan API (`tokennfttx` endpoint)

### `/api/tokenizin-wallet/transactions`
- **Method**: GET
- **Query Params**: 
  - `address` (wallet address)
  - `limit` (default: 50)
  - `includePending` (default: true)
- **Returns**: Combined normal and token transactions
- **Data Source**: Etherscan API (`txlist` + `tokentx` endpoints)

## Service Implementation

### `lib/services/etherscan-service.ts`

Provides utility functions:
- `getTokenBalances(address)` - Get ERC20 token balances
- `getERC721Tokens(address)` - Get ERC721 token holdings
- `getNormalTransactions(address)` - Get normal ETH transactions
- `getERC20Transfers(address)` - Get ERC20 transfer history
- `getAccountBalance(address)` - Get ETH balance

## Usage Example

```typescript
import { getTokenBalances, getERC721Tokens } from '@/lib/services/etherscan-service';

// Fetch token balances
const tokens = await getTokenBalances('0x8eD7F4FB3Aa1a3B346756624B17094dfd6040047');

// Fetch ERC721 holdings
const properties = await getERC721Tokens('0x8eD7F4FB3Aa1a3B346756624B17094dfd6040047');
```

## Sync Script

### `scripts/sync-wallet-onchain-data.ts`

Command-line script to sync wallet data from Etherscan:

```bash
bun run scripts/sync-wallet-onchain-data.ts 0x8eD7F4FB3Aa1a3B346756624B17094dfd6040047
```

**Output:**
- ETH balance
- ERC20 token balances
- ERC721 token holdings
- Recent transaction summary

## Rate Limits

Etherscan API has rate limits:
- **Free tier**: 5 calls/second
- **Pro tier**: Higher limits

**Recommendations:**
- Cache results when possible
- Batch requests when fetching multiple addresses
- Use backend API routes instead of direct frontend calls

## Known Token Addresses (Sepolia)

```typescript
USDC: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
EURC: 0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4
TKNZN:  0xb0af8e94C74c2346609c3d94FCba61Ae85cf3e6e
```

## Error Handling

All functions handle:
- Missing API key (returns empty arrays with warning)
- Network errors (returns empty arrays)
- Invalid addresses (validated before API calls)
- Rate limit errors (logged, returns empty arrays)

## Future Enhancements

1. **Caching Layer**: Implement Redis/cache for API responses
2. **WebSocket Updates**: Real-time balance updates
3. **Batch Queries**: Optimize multiple address queries
4. **Price Oracle**: Integrate USD value calculations
5. **ERC404 Support**: Enhanced support for ERC404 property tokens

## References

- [Etherscan API Documentation](https://docs.etherscan.io/api-endpoints)
- [Sepolia Testnet Explorer](https://sepolia.etherscan.io)
- [Example Wallet](https://sepolia.etherscan.io/address/0x8eD7F4FB3Aa1a3B346756624B17094dfd6040047)

