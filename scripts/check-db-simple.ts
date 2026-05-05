/**
 * Simple script to check database for users, sessions, and wallet connections
 * Uses direct SQL queries to avoid Zod version issues
 */

import { Pool } from 'pg';
import { getNormalizedDatabaseUrl } from '../src/lib/database-url';

async function checkDatabase() {
  const dbUrl = getNormalizedDatabaseUrl(process.env.DATABASE_URL) || process.env.DATABASE_URL || '';
  
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') ? false : {
      rejectUnauthorized: false,
    },
  });

  try {
    console.log('\n🔍 Checking Database for Users, Sessions, and Wallet Connections...\n');

    // Get all users
    const usersResult = await pool.query(`
      SELECT 
        id, email, name, "walletAddress", "authMethod", 
        "lastWalletSignIn", "createdAt", "updatedAt"
      FROM users
      ORDER BY "createdAt" DESC
      LIMIT 10
    `);

    console.log(`📊 Total Users Found: ${usersResult.rows.length}\n`);

    if (usersResult.rows.length === 0) {
      console.log('⚠️  No users found in database\n');
    } else {
      for (const user of usersResult.rows) {
        console.log(`\n👤 User: ${user.name || 'Unnamed'} (${user.email || 'No email'})`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Auth Method: ${user.authMethod || 'none'}`);
        console.log(`   Wallet Address: ${user.walletAddress || 'None'}`);
        console.log(`   Last Wallet Sign In: ${user.lastWalletSignIn || 'Never'}`);
        console.log(`   Created: ${user.createdAt}`);

        // Check wallet connections (prestix_wallets)
        if (user.walletAddress) {
          let connectionsResult = { rows: [] };
          try {
            connectionsResult = await pool.query(`
              SELECT *
              FROM prestix_wallets
              WHERE "userId" = $1
            `, [user.id]);
          } catch (e) {
            // Try alternative query
            try {
              connectionsResult = await pool.query(`
                SELECT *
                FROM prestix_wallets
                WHERE "walletAddress" = $1
              `, [user.walletAddress]);
            } catch (e2) {
              console.log(`   ⚠️  Could not query prestix_wallets: ${e2.message}`);
            }
          }

          console.log(`   📱 Wallet Connections: ${connectionsResult.rows.length}`);
          for (const conn of connectionsResult.rows) {
            console.log(`      - ${conn.walletAddress}`);
            console.log(`        Primary: ${conn.isPrimary}, Verified: ${conn.isVerified}`);
            console.log(`        First Connected: ${conn.firstConnectedAt}`);
            console.log(`        Last Connected: ${conn.lastConnectedAt}`);
            console.log(`        Connection Count: ${conn.connectionCount}`);
          }

          // Check wallet sessions
          let sessionsResult = { rows: [] };
          try {
            sessionsResult = await pool.query(`
              SELECT *
              FROM wallet_sessions
              WHERE "userId" = $1
              ORDER BY "createdAt" DESC
              LIMIT 5
            `, [user.id]);
          } catch (e) {
            // Try alternative query by wallet address
            try {
              sessionsResult = await pool.query(`
                SELECT *
                FROM wallet_sessions
                WHERE "walletAddress" = $1
                ORDER BY "createdAt" DESC
                LIMIT 5
              `, [user.walletAddress]);
            } catch (e2) {
              console.log(`   ⚠️  Could not query wallet_sessions: ${e2.message}`);
            }
          }

          console.log(`   📜 Wallet Sessions: ${sessionsResult.rows.length}`);
          for (const session of sessionsResult.rows) {
            const isExpired = new Date(session.expiresAt) < new Date();
            const status = session.isActive && !isExpired ? '✅ ACTIVE' : '❌ INACTIVE';
            console.log(`      ${status} - Session: ${session.sessionId.substring(0, 16)}...`);
            console.log(`        Chain: ${session.chainId} (${session.networkName})`);
            console.log(`        Expires: ${session.expiresAt}`);
            console.log(`        Last Used: ${session.lastUsedAt || session.createdAt}`);
          }
        }
      }
    }

    // First, check what tables exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%wallet%' OR table_name LIKE '%session%' OR table_name LIKE '%user%')
      ORDER BY table_name
    `);
    
    console.log('\n📋 Available Tables:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    // Summary statistics
    console.log('\n\n📈 Summary Statistics:\n');

    // Check prestix_wallets table (might be wallet connections)
    let connectionsCount = { rows: [{ count: '0' }] };
    let verifiedCount = { rows: [{ count: '0' }] };
    try {
      connectionsCount = await pool.query('SELECT COUNT(*) as count FROM prestix_wallets');
      verifiedCount = await pool.query('SELECT COUNT(*) as count FROM prestix_wallets WHERE "isVerified" = true');
    } catch (e) {
      console.log(`   ⚠️  prestix_wallets table error: ${e.message}`);
    }

    // Check wallet_sessions table
    let sessionsCount = { rows: [{ count: '0' }] };
    let activeSessionsCount = { rows: [{ count: '0' }] };
    try {
      sessionsCount = await pool.query('SELECT COUNT(*) as count FROM wallet_sessions');
      activeSessionsCount = await pool.query(`
        SELECT COUNT(*) as count 
        FROM wallet_sessions 
        WHERE "isActive" = true AND "expiresAt" > NOW()
      `);
    } catch (e) {
      console.log(`   ⚠️  wallet_sessions table error: ${e.message}`);
    }

    console.log(`   Total Wallet Connections (prestix_wallets): ${connectionsCount.rows[0].count}`);
    console.log(`   Verified Connections: ${verifiedCount.rows[0].count}`);
    console.log(`   Total Wallet Sessions: ${sessionsCount.rows[0].count}`);
    console.log(`   Active Sessions: ${activeSessionsCount.rows[0].count}`);

    // Show all users with wallet addresses
    const usersWithWallets = await pool.query(`
      SELECT id, email, name, "walletAddress", "authMethod"
      FROM users
      WHERE "walletAddress" IS NOT NULL
    `);
    console.log(`\n   Users with Wallet Addresses: ${usersWithWallets.rows.length}`);
    usersWithWallets.rows.forEach(u => {
      console.log(`      - ${u.email || u.name || u.id}: ${u.walletAddress} (${u.authMethod})`);
    });

    // Show all wallet sessions
    if (parseInt(sessionsCount.rows[0].count) > 0) {
      const allSessions = await pool.query(`
        SELECT "userId", "walletAddress", "isActive", "expiresAt", "createdAt"
        FROM wallet_sessions
        ORDER BY "createdAt" DESC
        LIMIT 10
      `);
      console.log(`\n   Recent Wallet Sessions:`);
      allSessions.rows.forEach(s => {
        const isExpired = new Date(s.expiresAt) < new Date();
        const status = s.isActive && !isExpired ? '✅' : '❌';
        console.log(`      ${status} User: ${s.userId}, Wallet: ${s.walletAddress?.substring(0, 10)}..., Expires: ${s.expiresAt}`);
      });
    }

    // Check for social auth users
    const socialUsersCount = await pool.query(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE "authMethod" = 'social' OR email IS NOT NULL
    `);
    console.log(`   Users with Social/Email Auth: ${socialUsersCount.rows[0].count}`);

    console.log('\n✅ Database check complete!\n');
  } catch (error) {
    console.error('❌ Error checking database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

checkDatabase()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
