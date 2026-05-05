/**
 * Script to check user sessions and wallet connections in the database
 */

import { createClient } from '../src/lib/db';
import { sessionManager } from '../src/lib/services/session-manager';
import { getSystemUser } from '../src/lib/utils/system-user';

async function checkSessionsAndWallet() {
  try {
    const systemUser = getSystemUser();
    const db = createClient(systemUser);

    console.log('\n🔍 Checking Database for Sessions and Wallet Connections...\n');

    // Get all users
    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        walletAddress: true,
        authMethod: true,
        lastWalletSignIn: true,
        createdAt: true,
      } as any,
      orderBy: {
        createdAt: 'desc',
      } as any,
    });

    console.log(`📊 Total Users: ${users.length}\n`);

    if (users.length === 0) {
      console.log('⚠️  No users found in database');
      return;
    }

    // Display users
    for (const user of users) {
      console.log(`\n👤 User: ${user.name || 'Unnamed'} (${user.email || 'No email'})`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Auth Method: ${user.authMethod || 'none'}`);
      console.log(`   Wallet Address: ${user.walletAddress || 'None'}`);
      console.log(`   Last Wallet Sign In: ${user.lastWalletSignIn || 'Never'}`);
      console.log(`   Created: ${user.createdAt}`);

      // Check wallet connections for this user
      if (user.walletAddress) {
        const walletConnections = await db.walletConnection.findMany({
          where: {
            userId: user.id,
          } as any,
        });

        console.log(`   📱 Wallet Connections: ${walletConnections.length}`);
        for (const conn of walletConnections) {
          console.log(`      - ${conn.walletAddress}`);
          console.log(`        Primary: ${conn.isPrimary}, Verified: ${conn.isVerified}`);
          console.log(`        First Connected: ${conn.firstConnectedAt}`);
          console.log(`        Last Connected: ${conn.lastConnectedAt}`);
          console.log(`        Connection Count: ${conn.connectionCount}`);
        }

        // Check active wallet sessions
        const activeSession = await sessionManager.getActiveSession(user.walletAddress);
        if (activeSession) {
          console.log(`   ✅ Active Wallet Session Found:`);
          console.log(`      Session ID: ${activeSession.sessionId.substring(0, 16)}...`);
          console.log(`      Chain ID: ${activeSession.chainId}`);
          console.log(`      Network: ${activeSession.networkName}`);
          console.log(`      Expires: ${activeSession.expiresAt}`);
          console.log(`      Last Used: ${activeSession.lastUsedAt}`);
        } else {
          console.log(`   ⚠️  No active wallet session found`);
        }

        // Check all wallet sessions for this user
        const allSessions = await db.walletSession.findMany({
          where: {
            userId: user.id,
          } as any,
          orderBy: {
            createdAt: 'desc',
          } as any,
          take: 5,
        });

        console.log(`   📜 Recent Wallet Sessions: ${allSessions.length}`);
        for (const session of allSessions) {
          const isExpired = new Date(session.expiresAt) < new Date();
          const status = session.isActive && !isExpired ? '✅ ACTIVE' : '❌ INACTIVE';
          console.log(`      ${status} - Created: ${session.createdAt}, Expires: ${session.expiresAt}`);
        }
      }
    }

    // Summary statistics
    console.log('\n\n📈 Summary Statistics:\n');

    const totalConnections = await db.walletConnection.count();
    const verifiedConnections = await db.walletConnection.count({
      where: {
        isVerified: true,
      } as any,
    });

    const totalSessions = await db.walletSession.count();
    const activeSessions = await db.walletSession.count({
      where: {
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      } as any,
    });

    console.log(`   Total Wallet Connections: ${totalConnections}`);
    console.log(`   Verified Connections: ${verifiedConnections}`);
    console.log(`   Total Wallet Sessions: ${totalSessions}`);
    console.log(`   Active Sessions: ${activeSessions}`);

    // Check for users with social auth
    const socialUsers = users.filter(u => u.authMethod === 'social' || u.email?.includes('@'));
    console.log(`\n   Users with Social Auth: ${socialUsers.length}`);

    console.log('\n✅ Database check complete!\n');
  } catch (error) {
    console.error('❌ Error checking database:', error);
    throw error;
  }
}

// Run the check
checkSessionsAndWallet()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
