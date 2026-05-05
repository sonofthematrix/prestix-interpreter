# AppKit Development Setup - MetaMask Connection Issues

## 🚨 CRITICAL: MetaMask Connection Issues in DEV

**The current setup is using the PRODUCTION project ID in development, which causes MetaMask connection failures.**

## Root Cause

Your `packages/reown-appkit-module/.env.local` file contains:
```bash
NEXT_PUBLIC_PROJECT_ID=122878b95737e1300958ec73a8c0b61a
```

This is the **production** project ID, which is configured for production domains only. WalletConnect/Reown requires separate project configurations for development vs production.

## Solution

### Step 1: Create Development Project

1. Go to [Reown Cloud](https://cloud.reown.com/)
2. Create a **new project** specifically for development
3. Name it something like "TigerPalace Dev" or "ZenStack Dev"
4. Copy the new project ID

### Step 2: Configure Development Domains

In your new Reown project, add these domains:
- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `http://localhost:3001` (if using different port)
- Any Vercel preview domains you use for testing

### Step 3: Update Environment

**⚠️ IMPORTANT:** The `.env.local` file is gitignored. You need to manually edit it:

```bash
# Edit the file directly
code packages/reown-appkit-module/.env.local
```

Replace the production project ID with your development project ID:

```bash
# OLD (PRODUCTION - DON'T USE IN DEV)
NEXT_PUBLIC_PROJECT_ID=122878b95737e1300958ec73a8c0b61a

# NEW (DEVELOPMENT PROJECT ID)
NEXT_PUBLIC_PROJECT_ID=your-actual-dev-project-id-here
```

### Step 4: Restart Development Server

```bash
# Stop current server (Ctrl+C)
# Restart
bun run dev
```

## Verification

Run the diagnostic script to verify the fix:

```bash
cd packages/reown-appkit-module
bun run test-appkit-connection.ts
```

You should see:
- ✅ Development project ID detected
- ✅ No "Using fallback project ID" warning

## Testing MetaMask Connection

1. Open your app in browser (localhost:3000)
2. Click "Connect Wallet"
3. MetaMask extension should be detected
4. Connection should work without issues

## Common Issues

### Issue: Still using production project ID
**Solution:** Check that `.env.local` was actually updated and restart server

### Issue: "Project not found" error
**Solution:** Verify the project ID is correct and domains are added in Reown Cloud

### Issue: MetaMask popup doesn't appear
**Solution:** Check browser console for errors, ensure MetaMask extension is enabled

### Issue: WalletConnect works but MetaMask doesn't
**Solution:** The development project configuration is incorrect

## Additional Configuration

### Optional: Disable SIWE in Development

Add to your `.env.local`:
```bash
NEXT_PUBLIC_SIWE=false
```

This disables Sign-In with Ethereum for simpler testing.

## Troubleshooting Script

Use this script to diagnose issues:

```bash
cd packages/reown-appkit-module
bun run test-appkit-connection.ts
```

## Why This Happens

Reown/WalletConnect projects are configured per environment:
- **Production projects**: Configured for live domains
- **Development projects**: Configured for localhost and staging domains

Using production credentials in development causes:
- Wallet registry API failures
- Connection timeouts
- MetaMask detection issues
- CORS errors

## Related Files

- Configuration: `packages/reown-appkit-module/src/config/index.ts`
- Environment: `packages/reown-appkit-module/.env.local` (gitignored)
- Test script: `packages/reown-appkit-module/test-appkit-connection.ts`

## Next Steps

After fixing the project ID:
1. Test MetaMask connection in browser
2. Test WalletConnect (QR code) as fallback
3. Verify both mobile and desktop work
4. Test on different browsers (Chrome, Firefox, Safari)