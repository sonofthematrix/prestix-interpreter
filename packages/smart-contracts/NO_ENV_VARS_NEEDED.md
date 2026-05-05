# ⚠️ IMPORTANT: Environment Variables NOT Needed!

**Date:** January 16, 2026  
**Update:** Database-First Architecture Implemented

---

## 🚫 Do NOT Update Environment Variables

**The NEW_ENV_VARIABLES.txt file is now OBSOLETE.**

We have migrated to a **database-first architecture** where:
- ✅ Contract addresses are stored in the database
- ✅ ABIs are exported to the frontend automatically
- ✅ No environment variables are needed for contract addresses

---

## ✅ What to Use Instead

### For Frontend Code

```typescript
// Import contract addresses
import { 
  REGISTRY_ADDRESS,
  FACTORY_ADDRESS,
  ERC404_FACTORY_ADDRESS,
  MARKETPLACE_ADDRESS,
} from '@/lib/contracts/sepolia-config';

// Import ABIs
import { CONTRACT_ABIS, getContractInstance } from '@/lib/contracts/abis';

// Create contract instance (address + ABI loaded automatically)
const marketplace = getContractInstance('MARKETPLACE', signer);
```

### For Scripts

```typescript
// Load from database
import { createClient } from '@/lib/db';

const db = createClient(systemUser);
const contracts = await db.deployedContract.findMany({
  where: { networkId: '11155111', isActive: true } as any
});

const registry = contracts.find(c => c.contractType === 'REGISTRY');
const registryAddress = registry.contractAddress;
```

---

## 📁 Generated Files Location

All contract data is now available at:

```
src/lib/contracts/
├── sepolia-config.ts       ← Contract addresses & metadata
└── abis/
    ├── index.ts            ← ABIs with TypeScript types
    ├── REGISTRY.json       ← Individual ABIs
    ├── FACTORY.json
    ├── ERC404_FACTORY.json
    └── MARKETPLACE.json
```

---

## 🔄 How to Regenerate

When contracts are redeployed or updated:

```bash
cd packages/smart-contracts

# Step 1: Activate contracts in database (if needed)
bun run tsx scripts/activate-fresh-contracts.ts

# Step 2: Export to frontend
bun run tsx scripts/export-abis-for-frontend.ts

# Step 3: Restart frontend
cd ../../
rm -rf .next/
bun run dev
```

---

## 🎯 Key Benefits

### ✅ No More Environment Variables
- No `.env.local` updates needed
- No `NEXT_PUBLIC_*` variables required
- Simpler configuration management

### ✅ Single Source of Truth
- Database is authoritative
- Frontend always in sync
- No stale addresses

### ✅ Type Safety
- TypeScript definitions auto-generated
- Compile-time validation
- IDE autocomplete

### ✅ Version Control
- Generated files can be committed
- Track contract address changes
- Full audit trail in git

---

## 📝 Migration Guide

### Old Code (Environment Variables)

```typescript
// ❌ OLD - Don't do this anymore
const marketplaceAddress = process.env.NEXT_PUBLIC_RWA_MARKETPLACE;
const registryAddress = process.env.NEXT_PUBLIC_RWA_ASSET_REGISTRY;
```

### New Code (Database-First)

```typescript
// ✅ NEW - Do this instead
import { MARKETPLACE_ADDRESS, REGISTRY_ADDRESS } from '@/lib/contracts/sepolia-config';

// Or use helper functions
import { getContractAddress } from '@/lib/contracts/sepolia-config';
const marketplaceAddress = getContractAddress('MARKETPLACE');
```

---

## 🗑️ Files to Ignore/Delete

These files are now obsolete:
- ❌ `NEW_ENV_VARIABLES.txt` - Environment variables not needed
- ❌ Any `.env` entries for contract addresses - Use database exports instead

These files contain old deployment info:
- ⚠️  `deployed-addresses*.json` - Replaced by database + generated configs

---

## ✅ What You Need to Know

1. **Contract addresses** come from `src/lib/contracts/sepolia-config.ts`
2. **ABIs** come from `src/lib/contracts/abis/index.ts`
3. **NO** environment variables needed
4. **Regenerate** anytime with `export-abis-for-frontend.ts`

---

## 📋 Quick Reference

### Get Contract Address
```typescript
import { getContractAddress } from '@/lib/contracts/sepolia-config';
const address = getContractAddress('MARKETPLACE');
```

### Get ABI
```typescript
import { getABI } from '@/lib/contracts/abis';
const abi = getABI('MARKETPLACE');
```

### Create Contract Instance
```typescript
import { getContractInstance } from '@/lib/contracts/abis';
const marketplace = getContractInstance('MARKETPLACE', signer);
```

---

## 🎊 Summary

**Environment variables for contract addresses are NO LONGER USED!**

✅ Database stores all contract data  
✅ Frontend imports from generated files  
✅ Type-safe and easy to maintain  
✅ Single source of truth established

**See `DATABASE_FIRST_ARCHITECTURE.md` for complete documentation.**
