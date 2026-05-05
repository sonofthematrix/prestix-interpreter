# Tiger RWA Wallet Architecture

## Overview

The Tiger RWA Wallet is a comprehensive wallet management component that consolidates all wallet-related functionality into a single, unified interface. It supports both EOA (Externally Owned Accounts) and Smart Accounts (social connections), with paymaster integration for sponsored transactions.

## Component Structure

```
packages/reown-appkit-module/src/components/TigerRWAWallet/
├── TigerRWAWallet.tsx              # Main component
├── tabs/
│   ├── OverviewTab.tsx             # Overview with aggregated balances
│   ├── TokensTab.tsx               # Native & ERC20 tokens
│   ├── PropertiesTab.tsx           # ERC404 property tokens
│   └── HistoryTab.tsx              # Transaction history
├── hooks/
│   ├── useSmartAccount.ts          # Smart Account detection & capabilities
│   ├── usePaymaster.ts             # Paymaster integration
│   ├── useBalanceAggregation.ts    # Multi-account balance aggregation
│   ├── useERC404Tokens.ts          # ERC404 property token fetching
│   └── useTransactionHistory.ts   # Transaction history tracking
├── utils/
│   ├── smartAccount.ts             # Smart Account utilities
│   ├── paymaster.ts                # Paymaster utilities
│   ├── balanceAggregation.ts       # Balance aggregation logic
│   └── currencyConversion.ts       # Currency conversion utilities
└── types.ts                        # TypeScript types
```

## Key Features

### 1. Account Type Support

- **EOA (Externally Owned Account)**: Traditional wallet (MetaMask, etc.)
- **Smart Account**: Social connections (Google, Apple, etc.) via ERC-4337

### 2. Transaction Methods

- **EOA**: Standard `sendTransaction` via wagmi
- **Smart Account**: `sendCalls` (EIP 5792) for batch transactions
- **Paymaster**: Sponsored gas for eligible transactions

### 3. Balance Aggregation

- Aggregate balances across multiple accounts
- Support for multiple smart accounts per user
- Currency conversion (ETH, USDC, EURC, TKNZN)
- Real-time balance updates

### 4. ERC404 Property Tokens

- Fetch property tokens from Registry contract
- Display with metadata (title, image, price)
- Support for multiple properties
- Token balance tracking

### 5. Transaction History

- Track all transactions (EOA and Smart Account)
- Transaction status monitoring
- Confirmation tracking
- Historical activity display

## Integration Points

### AppKit Integration

```typescript
import { useAppKitAccount, useAppKit } from '@reown/appkit/react';
import { useAccount, useWalletClient } from 'wagmi';
```

### Wagmi Integration

```typescript
import { 
  useSendTransaction,
  useReadContract,
  useReadContracts,
  useWaitForTransactionReceipt
} from 'wagmi';
```

### Smart Account Detection

```typescript
// Check if account supports EIP 5792 (sendCalls)
const capabilities = await walletClient?.getCapabilities();
const supportsSendCalls = capabilities?.wallet?.includes('sendCalls');
```

### Paymaster Integration

```typescript
// Check if transaction is eligible for sponsorship
const isEligible = await checkPaymasterEligibility(transaction);
if (isEligible) {
  // Use paymaster for gas sponsorship
  transaction.paymaster = paymasterAddress;
  transaction.paymasterData = paymasterData;
}
```

## Usage Example

```typescript
import { TigerRWAWallet } from '@TKNZN/reown-appkit-module';

function MyComponent() {
  return (
    <TigerRWAWallet
      open={isOpen}
      onOpenChange={setIsOpen}
      // Optional props
      defaultTab="overview"
      showCurrencyConversion={true}
      enablePaymaster={true}
    />
  );
}
```

## Props Interface

```typescript
interface TigerRWAWalletProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'overview' | 'tokens' | 'properties' | 'history';
  showCurrencyConversion?: boolean;
  enablePaymaster?: boolean;
  supportedTokens?: TokenConfig[];
  contractAddresses?: ContractAddresses;
}
```

## State Management

- Uses Zustand for wallet state
- React Query for data fetching
- Wagmi for blockchain interactions
- AppKit for wallet connection

## Error Handling

- Graceful fallbacks for unsupported features
- Clear error messages for users
- Retry mechanisms for failed transactions
- Transaction status monitoring

## Performance Optimizations

- Lazy loading of tabs
- Memoized balance calculations
- Debounced balance updates
- Efficient contract reads (batch queries)

## Security Considerations

- Paymaster policy validation
- Transaction simulation before execution
- Gas limit validation
- Address validation and sanitization

