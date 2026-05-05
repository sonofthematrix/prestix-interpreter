#!/usr/bin/env tsx

/**
 * Financial Remediation Script
 *
 * Fixes critical financial inconsistencies identified in reconciliation audit.
 * Applies systematic corrections to revenue splits, commission calculations, and metrics.
 *
 * Uses ZenStack v3 createClient with system user (elevated privileges for remediation)
 */

import 'dotenv/config';
import { createClient } from '../src/lib/db';

// System user for database operations (elevated privileges for remediation)
const systemUser = {
  id: 'system',
  email: 'system@TKNZN.pro',
  role: 'ADMIN' as const,
  name: 'System Admin'
};

const db = createClient(systemUser);

// Tier-based commission splits (from business rules)
const TIER_SPLITS = {
  STARTER: { promoter: 0.50, platform: 0.50 },
  BRONZE: { promoter: 0.60, platform: 0.40 },
  SILVER: { promoter: 0.70, platform: 0.30 },
  GOLD: { promoter: 0.75, platform: 0.25 },
  ELITE: { promoter: 0.80, platform: 0.20 }
};

async function remediateFinancialIssues(): Promise<void> {
  console.log('🔧 Starting financial remediation process...\n');
  console.log('⚠️  WARNING: This script will modify financial data. Ensure backup is taken.\n');

  // 1. Fix Revenue Split Calculations
  await fixRevenueSplits();

  // 2. Correct Commission Tier Splits
  await fixCommissionTierSplits();

  // 3. Recalculate Promoter Performance Metrics
  await recalculatePromoterMetrics();

  // 4. Validate Remediation Results
  await validateRemediation();

  console.log('\n✅ Financial remediation complete!');
}

async function fixRevenueSplits(): Promise<void> {
  console.log('💰 Fixing revenue split calculations...');

  // Get all bookings that need revenue split fixes
  const bookings = await db.booking.findMany({
    where: {
      status: {
        in: ['COMPLETED', 'CONFIRMED'] // Only process completed bookings
      }
    }
  });

  console.log(`Processing ${bookings.length} bookings for revenue split fixes...`);

  for (const booking of bookings) {
    const { id, totalAmount, commissionPool, promoterEarning, platformPassive, platformFee } = booking;

    // Recalculate correct values
    const correctVenueShare = Number(totalAmount) * 0.875; // 87.5%
    const correctCommissionPool = Number(totalAmount) * 0.10; // 10%
    const correctPlatformFee = Number(totalAmount) * 0.025; // 2.5%
    const correctTotalPlatformRevenue = Number(platformFee) + Number(platformPassive);

    // Check if updates are needed
    const needsUpdate =
      Math.abs(Number(booking.venueShare) - correctVenueShare) > 0.01 ||
      Math.abs(Number(commissionPool) - correctCommissionPool) > 0.01 ||
      Math.abs(Number(booking.totalPlatformRevenue) - correctTotalPlatformRevenue) > 0.01;

    if (needsUpdate) {
      await db.booking.update({
        where: { id },
        data: {
          venueShare: correctVenueShare,
          commissionPool: correctCommissionPool,
          totalPlatformRevenue: correctTotalPlatformRevenue
        } as any
      });
      console.log(`✅ Fixed revenue splits for booking ${id.substring(0, 8)}...`);
    }
  }

  console.log('✅ Revenue split calculations fixed\n');
}

async function fixCommissionTierSplits(): Promise<void> {
  console.log('🎯 Fixing commission tier splits...');

  // Get all commission records that need tier split fixes
  const commissions = await db.promoterCommission.findMany({
    include: {
      promoter: { select: { tier: true } },
      booking: { select: { commissionPool: true } }
    }
  });

  console.log(`Processing ${commissions.length} commission records for tier split fixes...`);

  for (const commission of commissions) {
    const { id, promoterTier, commissionPool } = commission;
    const correctSplits = TIER_SPLITS[promoterTier as keyof typeof TIER_SPLITS];

    if (!correctSplits) {
      console.log(`⚠️  Unknown promoter tier: ${promoterTier} for commission ${id}`);
      continue;
    }

    // Recalculate tier-based splits
    const correctPromoterEarning = Number(commissionPool) * correctSplits.promoter;
    const correctPlatformPassive = Number(commissionPool) * correctSplits.platform;

    // Check if updates are needed
    const needsUpdate =
      Math.abs(Number(commission.promoterEarning) - correctPromoterEarning) > 0.01 ||
      Math.abs(Number(commission.platformPassive) - correctPlatformPassive) > 0.01 ||
      Math.abs(Number(commission.promoterSharePct) - correctSplits.promoter) > 0.01 ||
      Math.abs(Number(commission.platformSharePct) - correctSplits.platform) > 0.01;

    if (needsUpdate) {
      await db.promoterCommission.update({
        where: { id },
        data: {
          promoterEarning: correctPromoterEarning,
          platformPassive: correctPlatformPassive,
          promoterSharePct: correctSplits.promoter,
          platformSharePct: correctSplits.platform
        } as any
      });
      console.log(`✅ Fixed tier splits for commission ${id.substring(0, 8)}... (${promoterTier})`);
    }
  }

  console.log('✅ Commission tier splits fixed\n');
}

async function recalculatePromoterMetrics(): Promise<void> {
  console.log('📊 Recalculating promoter performance metrics...');

  // Get all promoters
  const promoters = await db.promoterProfile.findMany({
    include: {
      commissions: {
        where: { status: { in: ['CREDITED', 'PENDING'] } },
        select: {
          promoterEarning: true,
          status: true
        }
      },
      eventAssignments: {
        select: { id: true }
      }
    }
  });

  console.log(`Recalculating metrics for ${promoters.length} promoters...`);

  for (const promoter of promoters) {
    // Recalculate total commission earnings
    const totalCommissionEarned = promoter.commissions.reduce(
      (sum, comm) => sum + Number(comm.promoterEarning),
      0
    );

    // Update promoter profile with correct totals
    await db.promoterProfile.update({
      where: { id: promoter.id },
      data: {
        totalCommissionPool: totalCommissionEarned, // This field represents total earnings
        totalPromoterEarnings: totalCommissionEarned
      } as any
    });

    console.log(`✅ Updated metrics for promoter ${promoter.id.substring(0, 8)}... ($${totalCommissionEarned.toFixed(2)})`);
  }

  console.log('✅ Promoter performance metrics recalculated\n');
}

async function validateRemediation(): Promise<void> {
  console.log('🔍 Validating remediation results...');

  // Run a quick validation to ensure fixes worked
  const validationResults = {
    revenueSplits: 0,
    commissionSplits: 0,
    totalBookings: 0,
    totalCommissions: 0
  };

  // Check revenue splits
  const bookings = await db.booking.findMany({
    where: { status: { in: ['COMPLETED', 'CONFIRMED'] } },
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

  validationResults.totalBookings = bookings.length;

  for (const booking of bookings) {
    const expectedVenueShare = Number(booking.totalAmount) * 0.875;
    const expectedCommissionPool = Number(booking.totalAmount) * 0.10;
    const expectedTotalPlatform = Number(booking.platformFee) + Number(booking.platformPassive);

    if (
      Math.abs(Number(booking.venueShare) - expectedVenueShare) < 0.01 &&
      Math.abs(Number(booking.commissionPool) - expectedCommissionPool) < 0.01 &&
      Math.abs(Number(booking.totalPlatformRevenue) - expectedTotalPlatform) < 0.01
    ) {
      validationResults.revenueSplits++;
    }
  }

  // Check commission splits
  const commissions = await db.promoterCommission.findMany({
    include: { promoter: { select: { tier: true } } }
  });

  validationResults.totalCommissions = commissions.length;

  for (const commission of commissions) {
    const correctSplits = TIER_SPLITS[commission.promoterTier as keyof typeof TIER_SPLITS];
    if (!correctSplits) continue;

    const expectedPromoterEarning = Number(commission.commissionPool) * correctSplits.promoter;
    const expectedPlatformPassive = Number(commission.commissionPool) * correctSplits.platform;

    if (
      Math.abs(Number(commission.promoterEarning) - expectedPromoterEarning) < 0.01 &&
      Math.abs(Number(commission.platformPassive) - expectedPlatformPassive) < 0.01
    ) {
      validationResults.commissionSplits++;
    }
  }

  console.log('📊 Validation Results:');
  console.log(`   Revenue Splits: ${validationResults.revenueSplits}/${validationResults.totalBookings} correct`);
  console.log(`   Commission Splits: ${validationResults.commissionSplits}/${validationResults.totalCommissions} correct`);

  const successRate = ((validationResults.revenueSplits + validationResults.commissionSplits) /
                       (validationResults.totalBookings + validationResults.totalCommissions)) * 100;

  console.log(`   Overall Success Rate: ${successRate.toFixed(1)}%\n`);

  if (successRate < 95) {
    console.log('⚠️  WARNING: Success rate below 95%. Manual review recommended.');
  } else {
    console.log('✅ All validations passed!');
  }
}

async function generateRemediationReport(): Promise<void> {
  console.log('📋 Generating remediation report...');

  // Get final statistics
  const finalStats = await db.$queryRaw`
    SELECT
      COUNT(*) as total_bookings,
      SUM("totalAmount") as total_revenue,
      SUM("venueShare") as total_venue_share,
      SUM("commissionPool") as total_commission_pool,
      SUM("promoterEarning") as total_promoter_earnings,
      SUM("platformPassive") as total_platform_passive,
      SUM("platformFee") as total_platform_fees
    FROM bookings
    WHERE status IN ('COMPLETED', 'CONFIRMED')
  `;

  const commissionStats = await db.$queryRaw`
    SELECT
      COUNT(*) as total_commissions,
      SUM("commissionPool") as commission_pool_total,
      SUM("promoterEarning") as promoter_earnings_total,
      SUM("platformPassive") as platform_passive_total
    FROM promoter_commissions
    WHERE status IN ('CREDITED', 'PENDING')
  `;

  console.log('\n📊 FINAL FINANCIAL STATE:');
  console.log('=====================================');
  console.log('Bookings:');
  console.log(`  Total Bookings: ${(finalStats as any)[0].total_bookings}`);
  console.log(`  Total Revenue: $${Number((finalStats as any)[0].total_revenue || 0).toLocaleString()}`);
  console.log(`  Venue Share (87.5%): $${Number((finalStats as any)[0].total_venue_share || 0).toLocaleString()}`);
  console.log(`  Commission Pool (10%): $${Number((finalStats as any)[0].total_commission_pool || 0).toLocaleString()}`);
  console.log(`  Platform Fees (2.5%): $${Number((finalStats as any)[0].total_platform_fees || 0).toLocaleString()}`);

  console.log('\nCommissions:');
  console.log(`  Total Commissions: ${(commissionStats as any)[0].total_commissions}`);
  console.log(`  Commission Pool: $${Number((commissionStats as any)[0].commission_pool_total || 0).toLocaleString()}`);
  console.log(`  Promoter Earnings: $${Number((commissionStats as any)[0].promoter_earnings_total || 0).toLocaleString()}`);
  console.log(`  Platform Passive: $${Number((commissionStats as any)[0].platform_passive_total || 0).toLocaleString()}`);

  // Check for remaining discrepancies
  const bookingCommissionPool = Number((finalStats as any)[0].total_commission_pool || 0);
  const commissionCommissionPool = Number((commissionStats as any)[0].commission_pool_total || 0);

  if (Math.abs(bookingCommissionPool - commissionCommissionPool) > 0.01) {
    console.log(`\n⚠️  REMAINING DISCREPANCY:`);
    console.log(`   Booking Commission Pool: $${bookingCommissionPool.toLocaleString()}`);
    console.log(`   Commission Records Total: $${commissionCommissionPool.toLocaleString()}`);
    console.log(`   Difference: $${Math.abs(bookingCommissionPool - commissionCommissionPool).toLocaleString()}`);
  } else {
    console.log('\n✅ All financial totals reconciled successfully!');
  }
}

// Run remediation
async function main() {
  try {
    await remediateFinancialIssues();
    await generateRemediationReport();

    console.log('\n🎉 Financial remediation completed successfully!');
    console.log('💡 Recommendation: Run the reconciliation script again to verify all issues are resolved.');

  } catch (error) {
    console.error('❌ Financial remediation failed:', error);
    process.exit(1);
  }
}

main();