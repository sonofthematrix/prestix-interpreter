#!/usr/bin/env tsx

/**
 * Check Fixed Data Script
 *
 * Verifies that the financial remediation actually updated the database correctly.
 */

import 'dotenv/config';
import { createClient } from '../src/lib/db';

// System user for database operations
const systemUser = {
  id: 'system',
  email: 'system@TKNZN.pro',
  role: 'ADMIN' as const,
  name: 'System Admin'
};

const db = createClient(systemUser);

async function checkFixedData() {
  console.log('🔍 Checking if financial remediation actually fixed the data...\n');

  // Check a few bookings to see current values
  const bookings = await db.booking.findMany({
    take: 5,
    select: {
      id: true,
      totalAmount: true,
      venueShare: true,
      commissionPool: true,
      platformFee: true,
      platformPassive: true,
      totalPlatformRevenue: true
    }
  });

  console.log('Sample bookings after remediation:');
  bookings.forEach(booking => {
    const expectedVenueShare = Number(booking.totalAmount) * 0.875;
    const expectedCommissionPool = Number(booking.totalAmount) * 0.10;
    const expectedTotalPlatform = Number(booking.platformFee) + Number(booking.platformPassive);

    console.log(`Booking ${booking.id.substring(0, 8)}:`);
    console.log(`  Total: $${Number(booking.totalAmount).toLocaleString()}`);
    console.log(`  Venue Share: $${Number(booking.venueShare).toLocaleString()} (expected: $${expectedVenueShare.toLocaleString()})`);
    console.log(`  Commission Pool: $${Number(booking.commissionPool).toLocaleString()} (expected: $${expectedCommissionPool.toLocaleString()})`);
    console.log(`  Total Platform Revenue: $${Number(booking.totalPlatformRevenue).toLocaleString()} (expected: $${expectedTotalPlatform.toLocaleString()})`);

    const venueShareCorrect = Math.abs(Number(booking.venueShare) - expectedVenueShare) < 0.01;
    const commissionPoolCorrect = Math.abs(Number(booking.commissionPool) - expectedCommissionPool) < 0.01;
    const totalPlatformCorrect = Math.abs(Number(booking.totalPlatformRevenue) - expectedTotalPlatform) < 0.01;

    console.log(`  Status: ${venueShareCorrect && commissionPoolCorrect && totalPlatformCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
    console.log('');
  });

  // Check commission records
  const commissions = await db.promoterCommission.findMany({
    take: 3,
    include: {
      promoter: { select: { tier: true } }
    }
  });

  console.log('Sample commissions after remediation:');
  commissions.forEach(commission => {
    const tierSplits = {
      STARTER: { promoter: 0.50, platform: 0.50 },
      BRONZE: { promoter: 0.60, platform: 0.40 },
      SILVER: { promoter: 0.70, platform: 0.30 },
      GOLD: { promoter: 0.75, platform: 0.25 },
      ELITE: { promoter: 0.80, platform: 0.20 }
    };

    const correctSplits = tierSplits[commission.promoterTier as keyof typeof tierSplits];
    const expectedPromoterEarning = Number(commission.commissionPool) * correctSplits.promoter;
    const expectedPlatformPassive = Number(commission.commissionPool) * correctSplits.platform;

    console.log(`Commission ${commission.id.substring(0, 8)} (${commission.promoterTier}):`);
    console.log(`  Pool: $${Number(commission.commissionPool).toLocaleString()}`);
    console.log(`  Promoter Earning: $${Number(commission.promoterEarning).toLocaleString()} (expected: $${expectedPromoterEarning.toLocaleString()})`);
    console.log(`  Platform Passive: $${Number(commission.platformPassive).toLocaleString()} (expected: $${expectedPlatformPassive.toLocaleString()})`);

    const promoterCorrect = Math.abs(Number(commission.promoterEarning) - expectedPromoterEarning) < 0.01;
    const platformCorrect = Math.abs(Number(commission.platformPassive) - expectedPlatformPassive) < 0.01;

    console.log(`  Status: ${promoterCorrect && platformCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
    console.log('');
  });

  // Check promoter metrics
  const promoters = await db.promoterProfile.findMany({
    take: 3,
    select: {
      id: true,
      totalCommissionPool: true,
      totalPromoterEarnings: true
    }
  });

  console.log('Sample promoter metrics after remediation:');
  promoters.forEach(promoter => {
    console.log(`Promoter ${promoter.id.substring(0, 8)}:`);
    console.log(`  Total Commission Pool: $${Number(promoter.totalCommissionPool || 0).toLocaleString()}`);
    console.log(`  Total Promoter Earnings: $${Number(promoter.totalPromoterEarnings || 0).toLocaleString()}`);
    console.log('');
  });
}

checkFixedData().catch(console.error);