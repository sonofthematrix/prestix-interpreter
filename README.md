# AppKit SIWE Authentication Module

A production-ready, modular authentication system for Next.js applications featuring:

- **SIWE Wallet Authentication** - Sign-In with Ethereum (MetaMask, WalletConnect, and more)
- **Email OTP** - One-time password via email
- **Google Social Login** - OAuth2 integration
- **Session Management** - JWT-based sessions with 30-day expiry
- **Rate Limiting** - Protection against brute force attacks
- **Security-Hardened** - HTTP-only cookies, CSRF protection, EIP-55 checksum validation
- **Multi-Wallet Support** - Connect multiple wallets per account
- **2FA Support** - Optional two-factor authentication with wallet

## Quick Start

### 1. Installation

```bash
# Clone or copy the module
git clone https://github.com/tokenizin/appkit-siwe-auth.git
cd appkit-siwe-auth

# Install dependencies with Bun (recommended)
bun install

# Or with npm/yarn
npm install
# or
yarn install
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env.local

# Edit with your configuration
nano .env.local
```

**Required environment variables:**
```
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_REOWN_PROJECT_ID=<from-dashboard.reown.com>
DATABASE_URL=postgresql://user:password@localhost:5432/appkit_auth
```

### 3. Database Setup

```bash
# Initialize Prisma
bunx prisma init

# Run migrations
bun run db:push

# (Optional) Seed test data
bun run db:seed
```

### 4. Development

```bash
# Start development server
bun run dev

# Server runs on http://localhost:3000
# API available at http://localhost:3000/api/auth
```

### 5. Build & Deploy

```bash
# Local build with Next.js
bun run build

# Start production server
bun run start

# Or, for Vercel deployment:
rm -rf .next && bun run build:vercel:slim && vercel deploy --prebuilt --prod --archive=tgz
```

---

## Architecture Overview

### Authentication Flows

#### SIWE Wallet Authentication (Primary)
```
User → AppKit Modal → Wallet Connection
  → getNonce() → Signature Request
  → User Signs → verifyMessage()
  → Session Created → useSession()
```

#### Email OTP (Secondary)
```
User → Email Input → Send OTP
  → User Confirms Code → verifyOTP()
  → Session Created
```

#### Google Social Login (Secondary)
```
User → Google Button → OAuth Flow
  → Reown handles flow → Session Created
```

### File Structure

```
src/
├── lib/                    # Core utilities
│   ├── appkit.ts          # AppKit initialization
│   ├── siwe.ts            # SIWE implementation
│   ├── siwe-config.ts     # SIWE flow configuration
│   ├── auth.ts            # Session utilities
│   ├── address-utils.ts   # EIP-55 validation
│   └── nextauth.config.ts # NextAuth setup
│
├── app/api/auth/          # API Routes
│   ├── wallet/
│   │   ├── nonce/         # Generate SIWE nonce
│   │   └── verify/        # Verify signature
│   ├── email/
│   │   ├── send-otp/      # Send OTP
│   │   └── verify-otp/    # Verify OTP
│   ├── [...nextauth]/     # NextAuth API
│   ├── me/                # Get current user
│   └── refresh-session/   # Refresh token
│
├── components/auth/       # React components
│   ├── auth-provider.tsx
│   ├── WalletAuthHandler.tsx
│   ├── SignInWalletHandler.tsx
│   ├── HomeSessionHandler.tsx
│   └── [other auth components]
│
├── hooks/                 # Custom hooks
│   └── use-wallet-auth.ts
│
├── stores/                # Zustand stores
│   ├── appkit-session-store.ts
│   ├── auth-store.ts
│   └── [other stores]
│
├── styles/                # CSS files
│   ├── appkit-fixes.css
│   └── auth-fixes.css
│
└── server/                # Server utilities
    └── auth.ts
```

---

## Configuration

### Reown AppKit Setup

1. **Create Project at [dashboard.reown.com](https://dashboard.reown.com)**
2. **Enable Features:**
   - Social & Email Login (Email = OTP)
   - Google OAuth
   - Wallet Connect
3. **Update Redirect URLs:**
   - `http://localhost:3000` (dev)
   - `https://yourdomain.com` (production)
4. **Copy Project ID** → `NEXT_PUBLIC_REOWN_PROJECT_ID`

### Database Setup

This module uses Prisma ORM with ZenStack for access control.

**Supported Databases:**
- PostgreSQL (recommended)
- MySQL
- SQLite (dev/testing only)
- SQL Server
- MongoDB

**Initialize:**
```bash
# Create schema (if using ZenStack)
touch schema.zmodel

# Or use existing Prisma schema
npx prisma init
```

### Email Service (Optional)

For OTP delivery, configure one of:
- **Resend** (recommended)
- **SendGrid**
- **AWS SES**
- **Mailgun**

```bash
# .env.local
EMAIL_SERVICE_PROVIDER=resend
EMAIL_SERVICE_API_KEY=your_key
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
```

---

## API Endpoints

### Authentication Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/wallet/nonce` | GET | Generate SIWE nonce |
| `/api/auth/wallet/verify` | POST | Verify wallet signature |
| `/api/auth/email/send-otp` | POST | Send OTP to email |
| `/api/auth/email/verify-otp` | POST | Verify OTP code |
| `/api/auth/me` | GET | Get current user |
| `/api/auth/refresh-session` | POST | Refresh JWT token |
| `/api/auth/[...nextauth]` | GET/POST | NextAuth API |

### Example: SIWE Wallet Auth

```typescript
// 1. Get nonce
const { message, nonce } = await fetch(
  '/api/auth/wallet/nonce?address=0x...'
).then(r => r.json());

// 2. Sign message (in wallet)
const signature = await walletClient.signMessage({ message });

// 3. Verify and create session
const { user, session } = await fetch(
  '/api/auth/wallet/verify',
  {
    method: 'POST',
    body: JSON.stringify({ walletAddress, signature, message, nonce })
  }
).then(r => r.json());

// 4. Use session
const { data: session } = useSession();
console.log('Authenticated as:', session.user.email);
```

---

## Security Features

### Rate Limiting
- Nonce generation: 10 requests/minute per IP
- Signature verification: 5 requests/minute per IP
- Email OTP: 3 attempts per 15 minutes

### Cryptographic Security
- EIP-55 checksum validation
- Signature recovery byte normalization
- Smart contract wallet support (EIP-1271)
- Message expiration (15 minutes)

### Session Security
- HTTP-only cookies (no JavaScript access)
- Secure flag in production (HTTPS only)
- SameSite=Lax (CSRF protection)
- 30-day JWT expiry
- Automatic refresh mechanism

### Network Security
- Chain ID validation
- Domain/origin matching
- CORS configuration
- Content Security Policy headers

---

## Usage Examples

### In Next.js Server Component

```typescript
import { getCurrentUser } from '@/lib/auth';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <p>Wallet: {user.walletAddress}</p>
      <p>Role: {user.role}</p>
    </div>
  );
}
```

### In React Client Component

```typescript
'use client';

import { useSession } from 'next-auth/react';
import { useWalletAuth } from '@/hooks/use-wallet-auth';

export function AuthStatus() {
  const { data: session } = useSession();
  const { authenticateWithWallet, disconnectWallet } = useWalletAuth();

  if (session) {
    return (
      <div>
        <p>Logged in as: {session.user.email}</p>
        <button onClick={() => disconnectWallet()}>Sign Out</button>
      </div>
    );
  }

  return (
    <button onClick={authenticateWithWallet}>
      Connect Wallet
    </button>
  );
}
```

### Protecting Routes

```typescript
import { AuthGuard } from '@/components/auth-guard';

export function AdminPage() {
  return (
    <AuthGuard requiredRole="ADMIN">
      <div>Admin content</div>
    </AuthGuard>
  );
}
```

---

## Testing

### Unit Tests

```bash
# Run test suite
bun run test:auth

# Watch mode
bun test --watch
```

### E2E Tests

```bash
# Run Playwright tests
bun run test:e2e

# Headless mode
bun run test:e2e:headed

# Debug mode
bun run test:e2e:debug
```

### Manual Testing

**Wallet Connection:**
1. Open http://localhost:3000/login
2. Click "Connect Wallet"
3. Select MetaMask (or other wallet)
4. Approve connection
5. Sign message when prompted

**Email OTP:**
1. Click "Sign in with Email"
2. Enter email address
3. Check email for OTP code
4. Enter code and submit

**Google Login:**
1. Click "Sign in with Google"
2. Complete Google OAuth flow
3. Approve permissions

---

## Deployment

### Vercel

```bash
# 1. Build optimized package
bun run build:vercel:slim

# 2. Deploy to Vercel
vercel deploy --prebuilt --prod --archive=tgz

# 3. Set environment variables in Vercel dashboard
# NEXTAUTH_SECRET, NEXT_PUBLIC_REOWN_PROJECT_ID, DATABASE_URL, etc.

# 4. Verify deployment
vercel env pull  # Pull environment variables
vercel logs --tail  # Watch logs
```

### Docker

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN bun install
RUN bun run build

# Runtime stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next ./next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
RUN bun install --production

EXPOSE 3000
CMD ["bun", "start"]
```

```bash
# Build and run
docker build -t appkit-auth .
docker run -p 3000:3000 \
  -e NEXTAUTH_SECRET=... \
  -e DATABASE_URL=... \
  appkit-auth
```

### Self-Hosted

```bash
# Build
bun run build

# Start
NODE_ENV=production bun start

# Using process manager (PM2)
pm2 start "bun start" --name="appkit-auth"
pm2 save
pm2 startup
```

---

## Environment Variables Reference

### Core (Required)
- `NEXTAUTH_SECRET` - Secret for JWT signing (generate: `openssl rand -base64 32`)
- `NEXTAUTH_URL` - Application URL (used for OAuth redirects)
- `NEXT_PUBLIC_REOWN_PROJECT_ID` - Reown/AppKit project ID
- `DATABASE_URL` - Database connection string

### AppKit Configuration (Optional)
- `NEXT_PUBLIC_REOWN_APP_NAME` - App name displayed in modal
- `NEXT_PUBLIC_ETHEREUM_RPC_URL` - Custom Ethereum RPC endpoint
- `NEXT_PUBLIC_SEPOLIA_RPC_URL` - Custom Sepolia testnet RPC
- `NEXT_PUBLIC_HOST` - Fallback application host

### Email Service (Optional)
- `EMAIL_SERVICE_PROVIDER` - Service provider (resend, sendgrid, etc.)
- `EMAIL_SERVICE_API_KEY` - API key for email service
- `EMAIL_FROM_ADDRESS` - From address for emails

### Development (Optional)
- `NEXT_PUBLIC_ENVIRONMENT` - Environment name (development, staging, production)
- `LOG_LEVEL` - Logging level (debug, info, warn, error)

---

## Troubleshooting

### "AppKit modal not initialized"
**Solution:** Restart dev server after installing dependencies
```bash
bun run dev
```

### "NEXTAUTH_SECRET is not set"
**Solution:** Generate and add secret:
```bash
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)" >> .env.local
```

### "Invalid Ethereum address format"
**Solution:** Ensure address is valid:
```typescript
import { toChecksumAddress } from '@/lib/address-utils';
const checksummed = toChecksumAddress(address);
```

### "Signature verification failed"
**Solution:** Check:
1. Request domain matches signing domain
2. Chain ID matches in request and signature
3. Message hasn't expired (15 minute window)

### "Session not persisting"
**Solution:** Check DevTools → Application → Cookies for `next-auth.session-token`

For more troubleshooting, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## Performance Optimization

### Recommended Settings

```typescript
// next.config.js
experimental: {
  webpackBuildWorker: true,  // Parallel webpack compilation
  webpackMemoryOptimizations: true,  // Reduce memory usage
  optimizePackageImports: ['lucide-react', '@radix-ui/react-*'],
}
```

### Database Optimization

```sql
-- Create indexes for auth queries
CREATE INDEX idx_users_wallet ON users(walletAddress);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_token ON sessions(sessionToken);
```

### Bundle Size

Current bundle size (optimized):
- Main: ~45 KB gzipped
- Auth API routes: ~15 KB gzipped
- Total (with deps): ~250 MB (Vercel limit: 250 MB)

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License - see LICENSE file for details

---

## Support

- 📚 **Documentation:** [See docs folder](./docs)
- 🐛 **Issues:** [GitHub Issues](https://github.com/tokenizin/appkit-siwe-auth/issues)
- 💬 **Discussions:** [GitHub Discussions](https://github.com/tokenizin/appkit-siwe-auth/discussions)
- 📧 **Email:** support@tokenizin.com

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history and updates.

---

**Built with ❤️ by the Tokenizin team**

Last updated: March 2, 2026
