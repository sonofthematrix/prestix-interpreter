#!/usr/bin/env tsx

/**
 * System User Setup Script (Raw SQL)
 * 
 * Creates a system user using raw SQL to bypass ZenStack/Zod compatibility issues.
 */

import 'dotenv/config';
import { Pool } from 'pg';

const SYSTEM_USER_ID = 'system';
const SYSTEM_USER_EMAIL = 'support@tokenizin.com';

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
});

async function setupSystemUser() {
  console.log('🔧 Setting up system user...\n');

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Check if system user exists
    const existingResult = await client.query(
      `SELECT id, email, role, status FROM users WHERE id = $1 OR email = $2`,
      [SYSTEM_USER_ID, SYSTEM_USER_EMAIL]
    );

    if (existingResult.rows.length > 0) {
      const existingUser = existingResult.rows[0];
      const needsUpdate = existingUser.id !== SYSTEM_USER_ID || 
                         existingUser.email !== SYSTEM_USER_EMAIL ||
                         existingUser.role !== 'PLATFORM_ADMIN';
      
      if (needsUpdate) {
        await client.query(
          `UPDATE users SET email = $1, name = $2, role = $3, status = $4 WHERE id = $5`,
          [SYSTEM_USER_EMAIL, 'System Admin', 'PLATFORM_ADMIN', 'ACTIVE', existingUser.id]
        );
        console.log('✅ System user updated');
      }
      
      const user = needsUpdate
        ? (await client.query(`SELECT * FROM users WHERE id = $1`, [existingUser.id])).rows[0]
        : existingUser;
      
      console.log('✅ System user configured:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email || 'N/A'}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Status: ${user.status}`);
      console.log(needsUpdate ? '\n🎉 System user updated!' : '\n⚠️  System user already configured. No changes needed.');
      await client.query('COMMIT');
      return;
    }

    // Try to create system user with ID 'system'
    try {
      await client.query(
        `INSERT INTO users (id, email, name, role, status, "emailVerified", "authMethod", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, NOW(), $6, NOW(), NOW())`,
        [SYSTEM_USER_ID, SYSTEM_USER_EMAIL, 'System Account', 'PLATFORM_ADMIN', 'ACTIVE', 'system']
      );

      console.log('✅ System user created successfully:');
      console.log(`   ID: ${SYSTEM_USER_ID}`);
      console.log(`   Email: ${SYSTEM_USER_EMAIL}`);
      console.log(`   Role: PLATFORM_ADMIN`);
      console.log(`   Status: ACTIVE`);
      console.log('\n🎉 System user is ready for use!');
      await client.query('COMMIT');
    } catch (error: any) {
      // If 'system' ID conflicts, check for existing user by email
      if (error.code === '23505' && error.constraint?.includes('id')) {
        console.log('⚠️  ID "system" is already taken. Checking for existing system user...');
        
        const existingByEmail = await client.query(
          `SELECT * FROM users WHERE email = $1`,
          [SYSTEM_USER_EMAIL]
        );

        if (existingByEmail.rows.length > 0) {
          const user = existingByEmail.rows[0];
          console.log('✅ Found existing system user by email:');
          console.log(`   ID: ${user.id}`);
          console.log(`   Email: ${user.email}`);
          console.log(`   Role: ${user.role}`);
          console.log('\n⚠️  System user exists but with different ID');
          await client.query('COMMIT');
          return;
        }

        // If no system user exists, create with generated ID
        console.log('⚠️  Cannot use "system" as ID. Creating with generated CUID...');
        const result = await client.query(
          `INSERT INTO users (email, name, role, status, "emailVerified", "authMethod", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, NOW(), $5, NOW(), NOW())
           RETURNING id`,
          [SYSTEM_USER_EMAIL, 'System Account', 'PLATFORM_ADMIN', 'ACTIVE', 'system']
        );

        const newUser = result.rows[0];
        console.log('✅ System user created with generated ID:');
        console.log(`   ID: ${newUser.id}`);
        console.log(`   Email: ${SYSTEM_USER_EMAIL}`);
        console.log(`   Role: PLATFORM_ADMIN`);
        console.log('\n⚠️  IMPORTANT: Update your code to use this ID:');
        console.log(`   const systemUser = { id: '${newUser.id}', role: 'PLATFORM_ADMIN' } as AuthUser;`);
        await client.query('COMMIT');
      } else {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to setup system user:', error);
    console.error('\nError details:', error.message);
    if (error.code) {
      console.error('PostgreSQL error code:', error.code);
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
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
