# AppKitSignButton Component

A button component that handles wallet signature based on account type from `useAppKitAccount()`.

## Features

- ✅ **Automatic Account Type Detection** - Checks if account is EOA or social
- ✅ **EOA Signature** - Requests signature for Externally Owned Accounts
- ✅ **Social Account Skip** - Automatically skips signature for social accounts
- ✅ **Multiple Signing Methods** - Falls back from wagmi to ethereum provider
- ✅ **User Rejection Handling** - Gracefully handles user rejection
- ✅ **Loading States** - Shows spinner while signing
- ✅ **SSR Safe** - Uses 'use client' directive for client-only rendering

## Usage

### Basic Usage

```tsx
import { AppKitSignButton } from '@TKNZN/reown-appkit-module';

function MyComponent() {
  return (
    <AppKitSignButton
      onSuccess={(signature) => {
        if (signature === 'social-account-no-signature') {
          // Handle social account login
          console.log('Social account - no signature needed');
        } else {
          // Handle EOA signature
          console.log('EOA signature:', signature);
          // Verify signature on server
        }
      }}
      onError={(error) => {
        console.error('Signature error:', error);
      }}
    />
  );
}
```

### Custom Message

```tsx
<AppKitSignButton
  message="Sign in to access premium features"
  onSuccess={(signature) => {
    console.log('Signed:', signature);
  }}
/>
```

### Custom Styling

```tsx
<AppKitSignButton
  className="w-full px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
  onSuccess={(signature) => {
    console.log('Signed:', signature);
  }}
/>
```

### Custom Button Content

```tsx
<AppKitSignButton
  onSuccess={(signature) => {
    console.log('Signed:', signature);
  }}
>
  <span className="flex items-center gap-2">
    <LockIcon className="w-5 h-5" />
    Sign & Continue
  </span>
</AppKitSignButton>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onSuccess` | `(signature: string) => void` | - | Callback when signature succeeds. For social accounts, receives `'social-account-no-signature'` |
| `onError` | `(error: Error) => void` | - | Callback when signature fails (not called for user rejection) |
| `message` | `string` | `'Sign in to Tokenizin'` | Message to sign |
| `className` | `string` | - | Custom CSS classes |
| `disabled` | `boolean` | `false` | Disable button |
| `children` | `React.ReactNode` | - | Custom button content |

## Account Type Detection

The component uses `useAppKitAccount()` to detect account type:

### EOA Account
```json
{
  "allAccounts": [
    {
      "namespace": "eip155",
      "address": "0x8eD7F4FB3Aa1a3B346756624B17094dfd6040047",
      "type": "eoa"
    }
  ],
  "isConnected": true
}
```
**Behavior**: Requests signature via `personal_sign`

### Social Account
```json
{
  "allAccounts": [
    {
      "type": "social"
    }
  ],
  "isConnected": true
}
```
**Behavior**: Skips signature, calls `onSuccess('social-account-no-signature')`

## Button States

- **Not Connected**: Shows "Connect Wallet First" (disabled)
- **EOA Account**: Shows "Sign Message"
- **Social Account**: Shows "Continue (Social Account)"
- **Signing**: Shows spinner with "Signing..."
- **Custom Content**: Uses `children` prop if provided

## Signature Flow

1. **Check Connection** - Verifies wallet is connected
2. **Detect Account Type** - Checks `allAccounts[0].type`
3. **EOA Path**:
   - Try `wagmi.signMessageAsync()` first
   - Fall back to `ethereum.request({ method: 'personal_sign' })`
   - Call `onSuccess(signature)`
4. **Social Path**:
   - Skip signature
   - Call `onSuccess('social-account-no-signature')`

## Error Handling

- **User Rejection**: Not treated as error, silently returns
- **Connection Error**: Calls `onError` with error message
- **Signing Error**: Calls `onError` with error details

## Integration Example

```tsx
import { AppKitSignButton } from '@TKNZN/reown-appkit-module';
import { useRouter } from 'next/navigation';

function SignInPage() {
  const router = useRouter();

  const handleSuccess = async (signature: string) => {
    if (signature === 'social-account-no-signature') {
      // Social account - verify on server without signature
      const response = await fetch('/api/auth/social-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountType: 'social' }),
      });
      if (response.ok) {
        router.push('/dashboard');
      }
    } else {
      // EOA account - verify signature on server
      const response = await fetch('/api/auth/wallet/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature }),
      });
      if (response.ok) {
        router.push('/dashboard');
      }
    }
  };

  return (
    <div>
      <h1>Sign In</h1>
      <AppKitSignButton
        onSuccess={handleSuccess}
        onError={(error) => {
          console.error('Sign in failed:', error);
        }}
      />
    </div>
  );
}
```

## Related Components

- `TigerPalaceConnectButton` - Connect wallet button
- `TigerPalaceAccountButton` - Account info button
- `TigerPalaceNetworkButton` - Network switcher button

## Related Hooks

- `useAppKitAccount()` - Get account information
- `useAppKitNetwork()` - Get network information
- `useAppKitTheme()` - Get theme information

