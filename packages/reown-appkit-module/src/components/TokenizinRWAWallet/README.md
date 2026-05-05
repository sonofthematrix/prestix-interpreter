# Tiger RWA Wallet Component

Comprehensive wallet management component for Tokenizin, supporting EOA and Smart Accounts with paymaster integration.

## Features

- ✅ **Multi-Account Support** - EOA and Smart Account (social connections)
- ✅ **Balance Aggregation** - Aggregate balances across multiple accounts
- ✅ **ERC404 Property Tokens** - Display property tokens with metadata
- ✅ **Transaction History** - Track and display all transactions
- ✅ **Paymaster Integration** - Sponsored transactions for eligible operations
- ✅ **Smart Account Transactions** - EIP 5792 sendCalls support

## Usage

```typescript
import { TigerRWAWallet } from '@TKNZN/reown-appkit-module';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <TigerRWAWallet
      open={isOpen}
      onOpenChange={setIsOpen}
      contractAddresses={{
        registry: '0x...',
        factory404: '0x...',
        staking: '0x...',
        paymaster: '0x...',
        usdc: '0x...',
        eurc: '0x...',
        tpt: '0x...',
      }}
    />
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | - | Whether dialog is open |
| `onOpenChange` | `(open: boolean) => void` | - | Callback when open state changes |
| `defaultTab` | `'overview' \| 'tokens' \| 'properties' \| 'history'` | `'overview'` | Default active tab |
| `showCurrencyConversion` | `boolean` | `true` | Show USD value conversion |
| `enablePaymaster` | `boolean` | `true` | Enable paymaster for sponsored transactions |
| `supportedTokens` | `TokenConfig[]` | `[ETH]` | List of supported tokens |
| `contractAddresses` | `ContractAddresses` | - | Contract addresses for marketplace |
| `onTransactionComplete` | `(tx: Transaction) => void` | - | Callback when transaction completes |
| `onTransactionError` | `(error: Error) => void` | - | Callback when transaction fails |

## UI Component Dependencies

This component requires the following UI components from the marketplace:
- `@/components/ui/dialog`
- `@/components/ui/tabs`
- `@/components/ui/card`
- `@/components/ui/button`
- `@/components/common/TigerSpinner`

These are available when the component is used within the Tokenizin marketplace.

## Environment Variables

Paymaster configuration:
- `NEXT_PUBLIC_PAYMASTER_ADDRESS` - Paymaster contract address
- `NEXT_PUBLIC_PAYMASTER_POLICY_ID` - Paymaster policy ID
- `NEXT_PUBLIC_PAYMASTER_MAX_GAS_PER_TX` - Max gas per transaction
- `NEXT_PUBLIC_PAYMASTER_MAX_GAS_PER_DAY` - Max gas per day

Token addresses:
- `NEXT_PUBLIC_USDC_ADDRESS` - USDC token address
- `NEXT_PUBLIC_EURC_ADDRESS` - EURC token address
- `NEXT_PUBLIC_TPT_ADDRESS` - TKNZN token address

## Architecture

See `ARCHITECTURE.md` for detailed architecture documentation.

## Implementation Status

See `IMPLEMENTATION_STATUS.md` for current implementation status and next steps.

