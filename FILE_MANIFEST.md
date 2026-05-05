# AppKit SIWE Auth Module - File Manifest

This document lists all files that need to be copied from the Tokenizin project or created for the module.

## Configuration Files (Already Created)

These files are already in the module and don't need to be copied:

```
✅ package.json              - Module metadata and dependencies
✅ tsconfig.json             - TypeScript configuration
✅ next.config.js            - Next.js build configuration
✅ .env.example              - Environment variables template
✅ .gitignore                - Git ignore rules
✅ README.md                 - Main documentation
✅ SETUP_GUIDE.md            - Step-by-step setup instructions
✅ FILE_MANIFEST.md          - This file
✅ scripts/build-vercel-slim.sh  - Vercel build script
✅ scripts/setup-module.sh   - Automated setup script
```

---

## Source Files to Copy (From prestix-app/src)

### 🔴 CRITICAL - Must Copy

These 14 files are essential for authentication to work:

#### Core Auth Utilities
```
Source: src/lib/auth.ts
Destination: src/lib/auth.ts
Description: Server-side auth utilities (getCurrentUser, requireAuth)
Status: ❌ NOT INCLUDED - MUST COPY
```

```
Source: src/lib/appkit.ts
Destination: src/lib/appkit.ts
Description: AppKit modal initialization and configuration
Status: ❌ NOT INCLUDED - MUST COPY
```

```
Source: src/lib/siwe.ts
Destination: src/lib/siwe.ts
Description: SIWE message generation and verification
Status: ❌ NOT INCLUDED - MUST COPY
```

```
Source: src/lib/siwe-config.ts
Destination: src/lib/siwe-config.ts
Description: SIWE authentication flow configuration
Status: ❌ NOT INCLUDED - MUST COPY
```

```
Source: src/lib/address-utils.ts
Destination: src/lib/address-utils.ts
Description: EIP-55 checksum validation and address utilities
Status: ❌ NOT INCLUDED - MUST COPY
```

```
Source: src/lib/nextauth.config.ts
Destination: src/lib/nextauth.config.ts
Description: NextAuth.js session configuration
Status: ❌ NOT INCLUDED - MUST COPY
```

```
Source: src/lib/auth-cookie-utils.ts
Destination: src/lib/auth-cookie-utils.ts
Description: HTTP-only cookie handling and security
Status: ❌ NOT INCLUDED - MUST COPY
```

```
Source: src/lib/appkit-icon-base64.ts
Destination: src/lib/appkit-icon-base64.ts
Description: Base64-encoded app icon for AppKit modal
Status: ❌ NOT INCLUDED - MUST COPY
```

```
Source: src/lib/auth/appkit-session.ts
Destination: src/lib/auth/appkit-session.ts
Description: Zustand store for AppKit session management
Status: ❌ NOT INCLUDED - MUST COPY
```

#### API Routes
```
Source: src/app/api/auth/wallet/nonce/route.ts
Destination: src/app/api/auth/wallet/nonce/route.ts
Description: Generate SIWE nonce for wallet authentication
Status: ❌ NOT INCLUDED - MUST COPY
```

```
Source: src/app/api/auth/wallet/verify/route.ts
Destination: src/app/api/auth/wallet/verify/route.ts
Description: Verify wallet signature and create session
Status: ❌ NOT INCLUDED - MUST COPY
```

```
Source: src/app/api/auth/[...nextauth]/route.ts
Destination: src/app/api/auth/[...nextauth]/route.ts
Description: NextAuth API endpoint handler
Status: ❌ NOT INCLUDED - MUST COPY
```

#### State Management
```
Source: src/stores/appkit-session-store.ts
Destination: src/stores/appkit-session-store.ts
Description: Zustand store for AppKit session state
Status: ❌ NOT INCLUDED - MUST COPY
```

```
Source: src/server/auth.ts
Destination: src/server/auth.ts
Description: Server-side auth utilities wrapper
Status: ❌ NOT INCLUDED - MUST COPY
```

### 🟡 IMPORTANT - Highly Recommended

These 15 files enhance the auth system with components and additional features:

#### Components
```
Source: src/components/auth-provider.tsx
Destination: src/components/auth-provider.tsx
Description: Auth context provider wrapper
Status: ❌ NOT INCLUDED - RECOMMENDED
```

```
Source: src/components/auth-guard.tsx
Destination: src/components/auth-guard.tsx
Description: Higher-order component for route protection
Status: ❌ NOT INCLUDED - RECOMMENDED
```

```
Source: src/components/auth/WalletAuthHandler.tsx
Destination: src/components/auth/WalletAuthHandler.tsx
Description: Session validation and maintenance
Status: ❌ NOT INCLUDED - RECOMMENDED
```

```
Source: src/components/auth/SignInWalletHandler.tsx
Destination: src/components/auth/SignInWalletHandler.tsx
Description: Wallet sign-in UI component
Status: ❌ NOT INCLUDED - RECOMMENDED
```

```
Source: src/components/auth/HomeSessionHandler.tsx
Destination: src/components/auth/HomeSessionHandler.tsx
Description: Session persistence on page load
Status: ❌ NOT INCLUDED - RECOMMENDED
```

#### Hooks
```
Source: src/hooks/use-wallet-auth.ts
Destination: src/hooks/use-wallet-auth.ts
Description: Custom hook for wallet authentication flow
Status: ❌ NOT INCLUDED - RECOMMENDED
```

#### Additional API Routes
```
Source: src/app/api/auth/me/route.ts
Destination: src/app/api/auth/me/route.ts
Description: Get authenticated user profile
Status: ❌ NOT INCLUDED - RECOMMENDED
```

```
Source: src/app/api/auth/refresh-session/route.ts
Destination: src/app/api/auth/refresh-session/route.ts
Description: Refresh JWT token
Status: ❌ NOT INCLUDED - RECOMMENDED
```

#### Stores
```
Source: src/stores/auth-store.ts
Destination: src/stores/auth-store.ts
Description: Main authentication state store
Status: ❌ NOT INCLUDED - RECOMMENDED
```

#### Styling
```
Source: src/styles/appkit-fixes.css
Destination: src/styles/appkit-fixes.css
Description: AppKit modal styling overrides
Status: ❌ NOT INCLUDED - RECOMMENDED
```

```
Source: src/styles/auth-fixes.css
Destination: src/styles/auth-fixes.css
Description: General auth-related CSS fixes
Status: ❌ NOT INCLUDED - RECOMMENDED
```

### 🟢 SUPPORTING - Optional

These 15 files provide additional features (email OTP, 2FA, multi-wallet):

```
Source: src/app/api/auth/email/send-otp/route.ts
Source: src/app/api/auth/email/verify-otp/route.ts
Source: src/app/api/auth/wallet-2fa/message/route.ts
Source: src/app/api/auth/wallet-2fa/verify/route.ts
Source: src/app/api/auth/connect-wallet/route.ts
... (and more)
Status: ❌ NOT INCLUDED - OPTIONAL
```

---

## Files to Create (Utilities)

These files need to be created for the module to work:

### Required
```
✅ src/lib/db.ts
   Description: Prisma client initialization
   Status: NEEDS CREATION - See SETUP_GUIDE.md

✅ src/lib/reown-project-id.ts
   Description: Reown project configuration
   Status: NEEDS CREATION - See SETUP_GUIDE.md

✅ src/lib/image-loader.ts
   Description: Next.js image optimization loader
   Status: NEEDS CREATION - See SETUP_GUIDE.md

✅ src/lib/rate-limiter.ts
   Description: Request rate limiting
   Status: NEEDS CREATION - See SETUP_GUIDE.md

✅ src/lib/utils/system-user.ts
   Description: System user for database operations
   Status: NEEDS CREATION - See SETUP_GUIDE.md
```

### Optional (if using ZenStack)
```
prisma/schema.prisma
   Description: Database schema (Prisma/ZenStack)
   Status: NEEDS CREATION - Template in docs/
```

---

## Directory Structure After Setup

```
appkit-siwe-auth-module/
├── src/
│   ├── lib/
│   │   ├── auth.ts                  ← COPY
│   │   ├── appkit.ts                ← COPY
│   │   ├── siwe.ts                  ← COPY
│   │   ├── siwe-config.ts           ← COPY
│   │   ├── address-utils.ts         ← COPY
│   │   ├── nextauth.config.ts       ← COPY
│   │   ├── auth-cookie-utils.ts     ← COPY
│   │   ├── appkit-icon-base64.ts    ← COPY
│   │   ├── db.ts                    ← CREATE
│   │   ├── reown-project-id.ts      ← CREATE
│   │   ├── image-loader.ts          ← CREATE
│   │   ├── rate-limiter.ts          ← CREATE
│   │   ├── auth/
│   │   │   └── appkit-session.ts    ← COPY
│   │   ├── utils/
│   │   │   └── system-user.ts       ← CREATE
│   │   └── appkit-controllers-shim/ ← CREATE (empty)
│   │
│   ├── app/api/auth/
│   │   ├── wallet/
│   │   │   ├── nonce/route.ts       ← COPY
│   │   │   └── verify/route.ts      ← COPY
│   │   ├── [...nextauth]/route.ts   ← COPY
│   │   ├── me/route.ts              ← COPY
│   │   ├── refresh-session/route.ts ← COPY
│   │   └── email/
│   │       ├── send-otp/route.ts    ← COPY (optional)
│   │       └── verify-otp/route.ts  ← COPY (optional)
│   │
│   ├── components/
│   │   ├── auth-provider.tsx        ← COPY
│   │   ├── auth-guard.tsx           ← COPY
│   │   └── auth/
│   │       ├── WalletAuthHandler.tsx ← COPY
│   │       ├── SignInWalletHandler.tsx ← COPY
│   │       └── HomeSessionHandler.tsx ← COPY
│   │
│   ├── hooks/
│   │   └── use-wallet-auth.ts       ← COPY
│   │
│   ├── stores/
│   │   ├── appkit-session-store.ts  ← COPY
│   │   └── auth-store.ts            ← COPY
│   │
│   ├── styles/
│   │   ├── appkit-fixes.css         ← COPY
│   │   └── auth-fixes.css           ← COPY
│   │
│   └── server/
│       └── auth.ts                  ← COPY
│
├── prisma/
│   └── schema.prisma                ← CREATE
│
├── public/
│   └── images/logos/app-icon/
│       └── (copy app icon here)
│
├── scripts/
│   ├── build-vercel-slim.sh         ✅ PROVIDED
│   └── setup-module.sh              ✅ PROVIDED
│
├── package.json                     ✅ PROVIDED
├── tsconfig.json                    ✅ PROVIDED
├── next.config.js                   ✅ PROVIDED
├── .env.example                     ✅ PROVIDED
├── .gitignore                       ✅ PROVIDED
├── README.md                        ✅ PROVIDED
├── SETUP_GUIDE.md                   ✅ PROVIDED
└── FILE_MANIFEST.md                 ✅ PROVIDED (this file)
```

---

## How to Use This Manifest

1. **Review which files are provided** ✅
2. **Note which files must be copied** ← COPY
3. **Note which files must be created** ← CREATE
4. **Use SETUP_GUIDE.md for detailed instructions**

---

## Copy Command (Bash Script)

Use this script to copy all files from prestix-app:

```bash
#!/bin/bash
# scripts/copy-from-tokenizin.sh

TOKENIZIN_PATH="/path/to/prestix-app/src"
DEST_PATH="src"

echo "Copying critical files..."
cp $TOKENIZIN_PATH/lib/address-utils.ts $DEST_PATH/lib/
cp $TOKENIZIN_PATH/lib/appkit.ts $DEST_PATH/lib/
cp $TOKENIZIN_PATH/lib/siwe.ts $DEST_PATH/lib/
cp $TOKENIZIN_PATH/lib/siwe-config.ts $DEST_PATH/lib/
cp $TOKENIZIN_PATH/lib/auth.ts $DEST_PATH/lib/
cp $TOKENIZIN_PATH/lib/nextauth.config.ts $DEST_PATH/lib/
cp $TOKENIZIN_PATH/lib/auth-cookie-utils.ts $DEST_PATH/lib/
cp $TOKENIZIN_PATH/lib/appkit-icon-base64.ts $DEST_PATH/lib/
cp $TOKENIZIN_PATH/lib/auth/appkit-session.ts $DEST_PATH/lib/auth/

echo "Copying API routes..."
mkdir -p $DEST_PATH/app/api/auth/wallet/{nonce,verify}
cp $TOKENIZIN_PATH/app/api/auth/wallet/nonce/route.ts $DEST_PATH/app/api/auth/wallet/nonce/
cp $TOKENIZIN_PATH/app/api/auth/wallet/verify/route.ts $DEST_PATH/app/api/auth/wallet/verify/
cp $TOKENIZIN_PATH/app/api/auth/\[...nextauth\]/route.ts $DEST_PATH/app/api/auth/\[...nextauth\]/

echo "Copying components, hooks, and stores..."
cp $TOKENIZIN_PATH/components/auth-provider.tsx $DEST_PATH/components/
cp $TOKENIZIN_PATH/components/auth/WalletAuthHandler.tsx $DEST_PATH/components/auth/
cp $TOKENIZIN_PATH/hooks/use-wallet-auth.ts $DEST_PATH/hooks/
cp $TOKENIZIN_PATH/stores/appkit-session-store.ts $DEST_PATH/stores/

echo "✅ Copy complete! Review updated imports in SETUP_GUIDE.md"
```

---

## Verification Checklist

After copying all files, verify:

- [ ] All critical auth files exist in src/lib/
- [ ] All API routes exist in src/app/api/auth/
- [ ] All components exist in src/components/auth/
- [ ] Hooks exist in src/hooks/
- [ ] Stores exist in src/stores/
- [ ] Imports are updated (@ paths resolve correctly)
- [ ] database utilities created (db.ts, rate-limiter.ts, etc.)
- [ ] prisma/schema.prisma created
- [ ] .env.local configured with all required variables
- [ ] Database initialized (bun run db:push)
- [ ] Dev server starts (bun run dev)
- [ ] Authentication flow works end-to-end

---

**See SETUP_GUIDE.md for detailed step-by-step instructions.**
