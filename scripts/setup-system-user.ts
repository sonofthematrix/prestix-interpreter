#!/usr/bin/env tsx

/**
 * System User Setup Script
 * 
 * Creates a system user in the database for system-level operations.
 * This user is used by getSystemDb() for administrative operations.
 * 
 * The system user:
 * - Has id: 'system' (or a CUID if 'system' conflicts)
 * - Has role: PLATFORM_ADMIN
 * - Is marked as a system account (not for regular login)
 * - Used for background jobs, webhooks, and system operations
 * 
 * Updated for ZenStack v3 ORM
 */

import 'dotenv/config';
import { createClient } from '../src/lib/db';

const SYSTEM_USER_ID = 'system';
// ✅ CRITICAL: Must match SYSTEM_USER_EMAIL in src/lib/utils/system-user.ts
const SYSTEM_USER_EMAIL = 'support@tokenizin.com';

// System user context for elevated privileges
const systemUser = {
  id: 'temp-system',
  email: 'temp@prestix.vip',
  role: 'PLATFORM_ADMIN' as const,
  name: 'Temp System Admin'
};

const db = createClient(systemUser);

async function setupSystemUser() {
  console.log('🔧 Setting up system user...\n');

  try {
    // Check if system user already exists
    const existingUser = await db.user.findFirst({
      where: { 
        OR: [
          { id: SYSTEM_USER_ID as any },
          { email: SYSTEM_USER_EMAIL as any }
        ]
      } as any,
    });

    if (existingUser) {
      const needsUpdate = existingUser.id !== SYSTEM_USER_ID || 
                         existingUser.email !== SYSTEM_USER_EMAIL ||
                         existingUser.role !== 'PLATFORM_ADMIN';
      
      if (needsUpdate) {
        await db.user.update({
          where: { id: existingUser.id as any },
          data: { 
            email: SYSTEM_USER_EMAIL as any, 
            name: 'System Admin',
            role: 'PLATFORM_ADMIN',
            status: 'ACTIVE',
          },
        });
        console.log('✅ System user updated');
      }
      
      const user = needsUpdate
        ? await db.user.findFirst({ where: { id: existingUser.id as any } })
        : existingUser;
      
      console.log('✅ System user configured:');
      console.log(`   ID: ${user!.id}`);
      console.log(`   Email: ${user!.email || 'N/A'}`);
      console.log(`   Role: ${user!.role}`);
      console.log(`   Status: ${user!.status}`);
      console.log(needsUpdate ? '\n🎉 System user updated!' : '\n⚠️  System user already configured. No changes needed.');
      return;
    }

    // Try to create system user with ID 'system'
    try {
      const systemUser = await db.user.create({
        data: {
          id: SYSTEM_USER_ID,
          email: SYSTEM_USER_EMAIL,
          name: 'System Account',
          role: 'PLATFORM_ADMIN',
          status: 'ACTIVE',
          emailVerified: new Date(),
          // Mark as system account (not for login)
          authMethod: 'system',
        },
      });

      console.log('✅ System user created successfully:');
      console.log(`   ID: ${systemUser.id}`);
      console.log(`   Email: ${systemUser.email}`);
      console.log(`   Role: ${systemUser.role}`);
      console.log(`   Status: ${systemUser.status}`);
      console.log('\n🎉 System user is ready for use!');
    } catch (error: any) {
      // If 'system' ID conflicts, try to find an alternative
      if (error.code === 'P2002' && error.meta?.target?.includes('id')) {
        console.log('⚠️  ID "system" is already taken. Checking for existing system user...');
        
        // Look for system user by email
        const existingByEmail = await db.user.findFirst({
          where: { email: SYSTEM_USER_EMAIL as any },
        });

        if (existingByEmail) {
          console.log('✅ Found existing system user by email:');
          console.log(`   ID: ${existingByEmail.id}`);
          console.log(`   Email: ${existingByEmail.email}`);
          console.log(`   Role: ${existingByEmail.role}`);
          console.log('\n⚠️  Update your code to use this ID instead of "system"');
          console.log(`   const systemUser = { id: '${existingByEmail.id}', role: 'PLATFORM_ADMIN' } as AuthUser;`);
          return;
        }

        // If no system user exists, we need to use a CUID
        console.log('⚠️  Cannot use "system" as ID. Creating with generated CUID...');
        const systemUser = await db.user.create({
          data: {
            email: SYSTEM_USER_EMAIL as any,
            name: 'System Account',
            role: 'PLATFORM_ADMIN',
            status: 'ACTIVE',
            emailVerified: new Date(),
            authMethod: 'system',
          },
        });

        console.log('✅ System user created with generated ID:');
        console.log(`   ID: ${systemUser.id}`);
        console.log(`   Email: ${systemUser.email}`);
        console.log(`   Role: ${systemUser.role}`);
        console.log('\n⚠️  IMPORTANT: Update your code to use this ID:');
        console.log(`   const systemUser = { id: '${systemUser.id}', role: 'PLATFORM_ADMIN' } as AuthUser;`);
      } else {
        throw error;
      }
    }
  } catch (error: any) {
    console.error('❌ Failed to setup system user:', error);
    console.error('\nError details:', error.message);
    if (error.meta) {
      console.error('Meta:', JSON.stringify(error.meta, null, 2));
    }
    process.exit(1);
  }
}

// Run the setup
setupSystemUser()
  .then(() => {
    console.log('\n✅ System user setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ System user setup failed:', error);
    process.exit(1);
  });
