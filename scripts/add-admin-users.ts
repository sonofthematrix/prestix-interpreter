#!/usr/bin/env tsx
/**
 * Add or update admin users in the database.
 * Grants PLATFORM_ADMIN role to users matching the specified wallet addresses and emails.
 *
 * Usage: bun run scripts/add-admin-users.ts
 *       bun run seed:admin-users
 *
 * Admin users to add (hardcoded - also configure via ADMIN_WALLET, ADMIN_EMAILS env vars):
 * - 0xaed5d9f6a4ec4e8aa6a4f3976fc5c205bcfa0070 (reward2learn@gmail.com)
 * - 0x2adc9c05181aa2188d59091aa6d7c5bfcc25ad31 (alex@tokenizin.com)
 * 
 * Updated for ZenStack v3 ORM and PRESTIX.VIP schema
 */

import 'dotenv/config';
import { normalizeEnv } from './lib/normalize-database-url.js';
import { createClient } from '@/lib/db';
import { toChecksumAddress } from '@/lib/address-utils';

normalizeEnv();

const ADMIN_USERS = [
  {
    walletAddress: '0xaed5d9f6a4ec4e8aa6a4f3976fc5c205bcfa0070',
    email: 'reward2learn@gmail.com',
    name: 'Reward2Learn Admin',
  },
  {
    walletAddress: '0x2adc9c05181aa2188d59091aa6d7c5bfcc25ad31',
    email: 'alex@tokenizin.com',
    name: 'Alex Admin',
  },
] as const;

// System user context for elevated privileges
const systemUser = {
  id: 'system',
  email: 'system@prestix.vip',
  role: 'PLATFORM_ADMIN' as const,
  name: 'System Admin'
};

async function main() {
  console.log('🔐 Adding/updating admin users...\n');

  const db = createClient(systemUser);
  let updated = 0;
  let created = 0;

  for (const admin of ADMIN_USERS) {
    const checksummedWallet = toChecksumAddress(admin.walletAddress);
    const walletLower = admin.walletAddress.toLowerCase();

    // Find by wallet address first (try checksummed and lowercase)
    let user =
      (await db.user.findFirst({ where: { walletAddress: checksummedWallet } })) ||
      (await db.user.findFirst({ where: { walletAddress: walletLower } }));

    // Fallback: find by email
    if (!user && admin.email) {
      user = await db.user.findFirst({ where: { email: admin.email } });
    }

    if (user) {
      const needsUpdate =
        user.role !== 'PLATFORM_ADMIN' ||
        (user.walletAddress?.toLowerCase() !== walletLower && user.walletAddress !== checksummedWallet) ||
        (admin.email && user.email !== admin.email);

      if (needsUpdate) {
        await db.user.update({
          where: { id: user.id },
          data: {
            role: 'PLATFORM_ADMIN',
            ...(user.walletAddress?.toLowerCase() !== walletLower && {
              walletAddress: checksummedWallet,
            }),
            ...(admin.email && user.email !== admin.email && { email: admin.email }),
            ...(admin.name && user.name !== admin.name && { name: admin.name }),
            status: 'ACTIVE',
          },
        });
        updated++;
        console.log(
          `✅ Updated: ${admin.email || checksummedWallet} → PLATFORM_ADMIN (wallet: ${checksummedWallet})`
        );
      } else {
        console.log(`ℹ️ Already admin: ${admin.email || checksummedWallet}`);
      }
    } else {
      // Create new user with PLATFORM_ADMIN role
      await db.user.create({
        data: {
          email: admin.email || `${walletLower}@wallet.local`,
          name: admin.name || `Admin ${checksummedWallet.slice(0, 10)}...`,
          walletAddress: checksummedWallet,
          role: 'PLATFORM_ADMIN',
          status: 'ACTIVE',
          authMethod: 'wallet',
        },
      });
      created++;
      console.log(
        `✅ Created: ${admin.email || checksummedWallet} as PLATFORM_ADMIN (wallet: ${checksummedWallet})`
      );
    }
  }

  console.log(`\n📊 Summary: ${created} created, ${updated} updated`);
  console.log('✅ Admin users script complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
