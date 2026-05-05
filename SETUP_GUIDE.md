# AppKit SIWE Auth Module - Complete Setup Guide

This guide walks you through setting up and deploying the standalone authentication module.

## Prerequisites

- **Node.js 18+** or **Bun 1.0+**
- **PostgreSQL 12+** (or compatible database)
- **Reown Account** (dashboard.reown.com)
- **Git**
- **~30 minutes** for complete setup

## Phase 1: File Preparation

### Step 1: Copy Source Files

The module requires copying specific files from the Tokenizin project. Run this script:

```bash
#!/bin/bash
# scripts/copy-from-tokenizin.sh

TOKENIZIN_PATH="../prestix-app/src"
DEST_PATH="src"

# Create directories
mkdir -p $DEST_PATH/{lib/auth,app/api/auth,components/auth,hooks,stores,server,styles}

# Copy critical files
echo "📋 Copying critical files..."
cp $TOKENIZIN_PATH/lib/address-utils.ts $DEST_PATH/lib/
cp $TOKENIZIN_PATH/lib/appkit.ts $DEST_PATH/lib/
cp $TOKENIZIN_PATH/lib/siwe.ts $DEST_PATH/lib/
cp $TOKENIZIN_PATH/lib/siwe-config.ts $DEST_PATH/lib/
cp $TOKENIZIN_PATH/lib/auth.ts $DEST_PATH/lib/
cp $TOKENIZIN_PATH/lib/nextauth.config.ts $DEST_PATH/lib/
cp $TOKENIZIN_PATH/lib/auth-cookie-utils.ts $DEST_PATH/lib/
cp $TOKENIZIN_PATH/lib/appkit-icon-base64.ts $DEST_PATH/lib/
cp $TOKENIZIN_PATH/lib/auth/appkit-session.ts $DEST_PATH/lib/auth/

echo "✅ Critical files copied"

# Copy API routes
echo "📋 Copying API routes..."
mkdir -p $DEST_PATH/app/api/auth/wallet/{nonce,verify}
mkdir -p $DEST_PATH/app/api/auth/{me,refresh-session,email/{send-otp,verify-otp}}

cp $TOKENIZIN_PATH/app/api/auth/wallet/nonce/route.ts $DEST_PATH/app/api/auth/wallet/nonce/
cp $TOKENIZIN_PATH/app/api/auth/wallet/verify/route.ts $DEST_PATH/app/api/auth/wallet/verify/
cp $TOKENIZIN_PATH/app/api/auth/\[...nextauth\]/route.ts $DEST_PATH/app/api/auth/\[...nextauth\]/
cp $TOKENIZIN_PATH/app/api/auth/me/route.ts $DEST_PATH/app/api/auth/me/
cp $TOKENIZIN_PATH/app/api/auth/refresh-session/route.ts $DEST_PATH/app/api/auth/refresh-session/

echo "✅ API routes copied"

# Copy components
echo "📋 Copying components..."
cp $TOKENIZIN_PATH/components/auth-provider.tsx $DEST_PATH/components/
cp $TOKENIZIN_PATH/components/auth-guard.tsx $DEST_PATH/components/
cp $TOKENIZIN_PATH/components/auth/WalletAuthHandler.tsx $DEST_PATH/components/auth/
cp $TOKENIZIN_PATH/components/auth/SignInWalletHandler.tsx $DEST_PATH/components/auth/
cp $TOKENIZIN_PATH/components/auth/HomeSessionHandler.tsx $DEST_PATH/components/auth/

echo "✅ Components copied"

# Copy hooks and stores
echo "📋 Copying hooks and stores..."
cp $TOKENIZIN_PATH/hooks/use-wallet-auth.ts $DEST_PATH/hooks/
cp $TOKENIZIN_PATH/stores/appkit-session-store.ts $DEST_PATH/stores/
cp $TOKENIZIN_PATH/stores/auth-store.ts $DEST_PATH/stores/

echo "✅ Hooks and stores copied"

# Copy styles
echo "📋 Copying styles..."
cp $TOKENIZIN_PATH/styles/appkit-fixes.css $DEST_PATH/styles/
cp $TOKENIZIN_PATH/styles/auth-fixes.css $DEST_PATH/styles/

echo "✅ Styles copied"

# Copy server utilities
echo "📋 Copying server utilities..."
cp $TOKENIZIN_PATH/server/auth.ts $DEST_PATH/server/

echo "✅ Server utilities copied"

echo ""
echo "✨ All files copied successfully!"
echo "📝 Next: Update import paths to match new structure"
```

### Step 2: Update Import Paths

Most imports use `@/` prefix which maps to `src/`. Verify `tsconfig.json` has correct path mappings.

For files that import from outside src, update them:

```typescript
// OLD (Tokenizin project)
import { db } from '@/lib/db';
import { createClient } from '@/lib/db';
import { getSystemUser } from '@/lib/utils/system-user';

// NEW (Auth module - adapt as needed)
import { db } from '@/lib/db';  // Create this utility
// OR use Prisma directly:
import { PrismaClient } from '@prisma/client';
```

### Step 3: Create Missing Utilities

Some files need new utilities created for the module:

**File: `src/lib/db.ts`**
```typescript
import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

export const db =
  global.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = db;
}
```

**File: `src/lib/reown-project-id.ts`**
```typescript
export const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID!;

if (!projectId) {
  throw new Error('NEXT_PUBLIC_REOWN_PROJECT_ID is required');
}

export const REOWN_APP_NAME = process.env.NEXT_PUBLIC_REOWN_APP_NAME || 'Auth App';
```

**File: `src/lib/image-loader.ts`**
```typescript
export default function imageLoader({ src, width, quality }: any) {
  return `${src}?w=${width}&q=${quality || 75}`;
}
```

**File: `src/lib/rate-limiter.ts`**
```typescript
import { createHash } from 'crypto';

interface RateLimiter {
  checkLimit(clientId: string): boolean;
  getResetTime(clientId: string): number;
}

function createRateLimiter(
  maxRequests: number,
  windowMs: number
): RateLimiter {
  const requests = new Map<string, number[]>();

  return {
    checkLimit(clientId: string): boolean {
      const now = Date.now();
      const clientRequests = requests.get(clientId) || [];
      const recentRequests = clientRequests.filter(
        (time) => now - time < windowMs
      );

      if (recentRequests.length >= maxRequests) {
        return false;
      }

      recentRequests.push(now);
      requests.set(clientId, recentRequests);
      return true;
    },

    getResetTime(clientId: string): number {
      const clientRequests = requests.get(clientId) || [];
      if (clientRequests.length === 0) return 0;
      const oldest = Math.min(...clientRequests);
      return Math.max(0, oldest + windowMs - Date.now());
    },
  };
}

export const rateLimiters = {
  nonceGeneration: createRateLimiter(10, 60000), // 10/minute
  signatureVerification: createRateLimiter(5, 60000), // 5/minute
  emailOtp: createRateLimiter(3, 15 * 60000), // 3 per 15 min
};

export function getClientIdentifier(request: any): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : '127.0.0.1';
  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}
```

**File: `src/lib/utils/system-user.ts`**
```typescript
export async function getSystemUser() {
  // Return system user for database operations
  // In a real app, this might be an actual system user from DB
  return {
    id: 'system',
    role: 'ADMIN',
  };
}
```

---

## Phase 2: Environment Configuration

### Step 1: Generate Secrets

```bash
# Generate NEXTAUTH_SECRET
NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo "NEXTAUTH_SECRET=$NEXTAUTH_SECRET" >> .env.local

# Add other required variables
cat >> .env.local <<EOF
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_REOWN_PROJECT_ID=<get-from-dashboard.reown.com>
DATABASE_URL=postgresql://user:pass@localhost:5432/appkit_auth
NEXT_PUBLIC_REOWN_APP_NAME=My Auth App
EOF
```

### Step 2: Reown Setup

1. Visit [dashboard.reown.com](https://dashboard.reown.com)
2. Create a new project
3. Copy the Project ID
4. Enable features:
   - Email (OTP)
   - Social: Google
   - Wallets: MetaMask, WalletConnect
5. Set redirect URLs:
   - `http://localhost:3000`
   - `https://yourdomain.com` (for production)

---

## Phase 3: Database Setup

### PostgreSQL Setup

```bash
# Create database
createdb appkit_auth

# Update CONNECTION string
export DATABASE_URL="postgresql://user:password@localhost:5432/appkit_auth"
```

### Prisma Schema

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                  String    @id @default(cuid())
  email               String?   @unique
  name                String?
  walletAddress       String?   @unique @db.VarChar(42)
  walletType          String?
  chainId             Int?
  networkName         String?
  ensName             String?
  authMethod          String?
  role                String    @default("CUSTOMER")
  profileImageUrl     String?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  lastLoginAt         DateTime?

  @@index([walletAddress])
  @@index([email])
  @@index([createdAt])
}

model Session {
  id            String    @id @default(cuid())
  sessionToken  String    @unique
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expires       DateTime
  createdAt     DateTime  @default(now())

  @@index([userId])
}
```

### Run Migrations

```bash
# Install Prisma
bun install -D prisma @prisma/client

# Initialize
bunx prisma init

# Create migration
bunx prisma migrate dev --name init

# Generate client
bunx prisma generate
```

---

## Phase 4: Installation & Testing

### Install Dependencies

```bash
# Using Bun (recommended)
bun install

# Or npm
npm install

# Or yarn
yarn install
```

### Start Development Server

```bash
bun run dev

# Server starts on http://localhost:3000
```

### Test Authentication

1. **Open browser:** http://localhost:3000
2. **Click "Connect Wallet"**
3. **Select wallet** (MetaMask, etc.)
4. **Approve connection**
5. **Sign message** when prompted
6. **Verify session** created

---

## Phase 5: Build & Deployment

### Local Build

```bash
bun run build
bun run start
```

### Vercel Deployment

```bash
# 1. Install Vercel CLI
bun install -g vercel

# 2. Build optimized package
bun run build:vercel:slim

# 3. Deploy
vercel deploy --prebuilt --prod --archive=tgz

# 4. Add environment variables in Vercel dashboard:
# - NEXTAUTH_SECRET
# - NEXT_PUBLIC_REOWN_PROJECT_ID
# - DATABASE_URL
# - All other env vars from .env.local
```

### Production Checklist

- [ ] NEXTAUTH_SECRET is secure and random
- [ ] DATABASE_URL points to production database
- [ ] NEXT_PUBLIC_REOWN_PROJECT_ID is configured
- [ ] Email service configured (if using email OTP)
- [ ] RPC endpoints configured for production
- [ ] CORS settings configured
- [ ] SSL certificate enabled
- [ ] Monitoring/logging enabled
- [ ] Database backups configured
- [ ] Rate limiting tested

---

## Troubleshooting

### "Module not found" errors

**Solution:** Ensure all critical files are copied and imports are correct

```bash
# Check file exists
ls src/lib/appkit.ts  # Should exist

# Verify imports in copied files
grep -r "@/lib" src/  # Should all resolve
```

### Database connection issues

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Check DATABASE_URL format
echo $DATABASE_URL  # Should be: postgresql://user:pass@host:port/db
```

### AppKit not loading

```bash
# Check browser console for errors
# Verify NEXT_PUBLIC_REOWN_PROJECT_ID is set
echo $NEXT_PUBLIC_REOWN_PROJECT_ID

# Restart dev server
bun run dev
```

### Authentication failing

1. Check network tab for API errors
2. Verify nonce endpoint returns valid SIWE message
3. Check signature format (should be 0x... hex)
4. Verify chain ID matches

---

## Quick Reference

```bash
# Development
bun run dev              # Start dev server
bun run build           # Build for production
bun run start           # Run production build

# Database
bun run db:push         # Apply schema to database
bun run db:migrate      # Run migrations
bun run db:studio       # Open Prisma Studio UI

# Testing
bun run test:auth       # Run unit tests
bun run test:e2e        # Run end-to-end tests

# Deployment
bun run build:vercel:slim  # Build for Vercel
vercel deploy --prebuilt --prod --archive=tgz  # Deploy to Vercel
```

---

## Next Steps

1. ✅ Complete setup above
2. 📚 Read [ARCHITECTURE.md](./ARCHITECTURE.md)
3. 🔐 Review [SECURITY.md](./SECURITY.md)
4. 🚀 Deploy to production

---

**Need help?** Check [README.md](./README.md) or open an issue on GitHub.
