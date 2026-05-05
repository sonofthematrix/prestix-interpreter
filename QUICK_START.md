# AppKit SIWE Auth Module - Quick Start (5 Minutes)

Fast-track to get the module running locally.

## TL;DR

```bash
# 1. Install
bun install

# 2. Configure
cp .env.example .env.local
# Edit .env.local: Add NEXTAUTH_SECRET, REOWN_PROJECT_ID, DATABASE_URL

# 3. Copy files from prestix-app
bash scripts/copy-from-tokenizin.sh

# 4. Setup database
bun run db:push

# 5. Run
bun run dev
# → Open http://localhost:3000
```

---

## Detailed Steps

### Step 1: Install (2 min)

```bash
# Clone module or navigate to directory
cd appkit-siwe-auth-module

# Install dependencies
bun install
# Or: npm install / yarn install

# Verify installation
bun --version  # Shows Bun version
ls node_modules/@reown/appkit  # Should exist
```

### Step 2: Environment (1 min)

```bash
# Copy template
cp .env.example .env.local

# Generate secret
NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo "NEXTAUTH_SECRET=$NEXTAUTH_SECRET" >> .env.local

# Update remaining variables in .env.local:
# - NEXTAUTH_URL = http://localhost:3000
# - NEXT_PUBLIC_REOWN_PROJECT_ID = (from dashboard.reown.com)
# - DATABASE_URL = postgresql://user:pass@localhost:5432/db

nano .env.local  # Edit your values
```

### Step 3: Copy Source Files (1 min)

```bash
# Update path to prestix-app location
TOKENIZIN_PATH="../prestix-app/src"

# Create directories
mkdir -p src/{lib/auth,app/api/auth,components/auth,hooks,stores,server,styles}

# Copy critical files
cp $TOKENIZIN_PATH/lib/appkit.ts src/lib/
cp $TOKENIZIN_PATH/lib/siwe.ts src/lib/
cp $TOKENIZIN_PATH/lib/siwe-config.ts src/lib/
cp $TOKENIZIN_PATH/lib/auth.ts src/lib/
cp $TOKENIZIN_PATH/lib/address-utils.ts src/lib/
cp $TOKENIZIN_PATH/lib/nextauth.config.ts src/lib/
cp $TOKENIZIN_PATH/lib/auth-cookie-utils.ts src/lib/
cp $TOKENIZIN_PATH/lib/appkit-icon-base64.ts src/lib/
cp $TOKENIZIN_PATH/lib/auth/appkit-session.ts src/lib/auth/

# Copy API routes
mkdir -p src/app/api/auth/wallet/{nonce,verify}
cp $TOKENIZIN_PATH/app/api/auth/wallet/nonce/route.ts src/app/api/auth/wallet/nonce/
cp $TOKENIZIN_PATH/app/api/auth/wallet/verify/route.ts src/app/api/auth/wallet/verify/
cp $TOKENIZIN_PATH/app/api/auth/\[...nextauth\]/route.ts src/app/api/auth/\[...nextauth\]/

# Copy components and hooks
cp $TOKENIZIN_PATH/components/auth-provider.tsx src/components/
cp $TOKENIZIN_PATH/hooks/use-wallet-auth.ts src/hooks/
cp $TOKENIZIN_PATH/stores/appkit-session-store.ts src/stores/

# Or use the provided script:
# bash scripts/copy-from-tokenizin.sh
```

### Step 4: Database (1 min)

```bash
# Ensure PostgreSQL is running
psql postgres -c "CREATE DATABASE appkit_auth_db;"

# Create schema
mkdir -p prisma
# Copy schema from docs/prisma-schema.example to prisma/schema.prisma

# Apply to database
bun run db:push
# Or: npx prisma db push
```

### Step 5: Start (0 min)

```bash
bun run dev
# → http://localhost:3000
```

---

## Testing the Setup

### 1. Check Server Started
```bash
curl http://localhost:3000
# Should return HTML
```

### 2. Check API Endpoint
```bash
curl http://localhost:3000/api/auth/session
# Should return session data (empty or with user)
```

### 3. Test in Browser
1. Open http://localhost:3000/login
2. Click "Connect Wallet"
3. Select MetaMask (or other wallet)
4. Sign message
5. Should redirect to dashboard

---

## Troubleshooting

### "Cannot find module @/lib/appkit"
→ Files not copied. Run copy script from step 3.

### "DATABASE_URL is not set"
→ Add DATABASE_URL to .env.local

### "NEXTAUTH_SECRET is missing"
→ Add NEXTAUTH_SECRET to .env.local (or run: `openssl rand -base64 32`)

### "AppKit modal not showing"
→ Check NEXT_PUBLIC_REOWN_PROJECT_ID is set correctly

### "Database connection failed"
→ Verify PostgreSQL running: `psql postgres`

---

## Next Steps

✅ **Done with Quick Start?** Continue with:

1. **Full documentation:** Read [README.md](./README.md)
2. **Detailed setup:** Follow [SETUP_GUIDE.md](./SETUP_GUIDE.md)
3. **File reference:** See [FILE_MANIFEST.md](./FILE_MANIFEST.md)
4. **Deploy to production:** See [README.md#Deployment](./README.md#deployment)

---

## Common Commands

```bash
# Development
bun run dev           # Start dev server
bun run build        # Build for production
bun run start        # Run production build

# Database
bun run db:push      # Apply schema changes
bun run db:studio    # Open Prisma UI

# Testing
bun run test:auth    # Run tests
bun run test:e2e     # Run E2E tests

# Deployment
bun run build:vercel:slim  # Build for Vercel
vercel deploy --prebuilt --prod --archive=tgz  # Deploy
```

---

**⏱️ Total time: ~5 minutes**

Questions? See the full [README.md](./README.md) or [SETUP_GUIDE.md](./SETUP_GUIDE.md).
