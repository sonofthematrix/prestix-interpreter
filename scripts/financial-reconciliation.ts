#!/usr/bin/env tsx

/**
 * Financial Reconciliation Script
 *
 * Comprehensive audit of PRESTIX financial transactions, revenue sharing, and promoter attribution.
 * Identifies inconsistencies in bookings, commissions, affiliate links, and promotional codes.
 *
 * Uses ZenStack v3 createClient with system user (elevated privileges for auditing)
 */

import 'dotenv/config';
import { createClient } from '../src/lib/db';
import { format, subDays } from 'date-fns';

// System user for database operations (elevated privileges for auditing)
const systemUser = {
  id: 'system',
  email: 'system@TKNZN.pro',
  role: 'ADMIN' as const,
  name: 'System Admin'
};

const db = createClient(systemUser);

interface ReconciliationIssue {
  type: 'ERROR' | 'WARNING' | 'INFO';
  category: string;
  description: string;
  entityId: string;
  expected?: any;
  actual?: any;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendation?: string;
}

class FinancialReconciler {
  private issues: ReconciliationIssue[] = [];
  private stats = {
    bookings: { total: 0, withPromoter: 0, withPromoCode: 0, withMagicLink: 0 },
    commissions: { total: 0, credited: 0, pending: 0 },
    promoters: { total: 0, active: 0 },
    promoCodes: { total: 0, used: 0 },
    magicLinks: { total: 0, clicked: 0 }
  };

  async reconcile(): Promise<void> {
    console.log('🔍 Starting comprehensive financial reconciliation...\n');

    // 1. Audit Bookings and Revenue Splits
    await this.auditBookings();

    // 2. Verify Promoter Commissions
    await this.auditCommissions();

    // 3. Check Affiliate Links and Magic Links
    await this.auditAffiliateLinks();

    // 4. Verify Promotional Codes
    await this.auditPromoCodes();

    // 5. Reconcile Promoter Performance Metrics
    await this.auditPromoterMetrics();

    // 6. Check for Orphaned Transactions
    await this.auditOrphanedTransactions();

    // 7. Cross-validate Revenue Totals
    await this.validateRevenueTotals();

    this.generateReport();
  }

  private async auditBookings(): Promise<void> {
    console.log('📊 Auditing bookings and revenue splits...');

    const bookings = await db.booking.findMany({
      include: {
        member: { select: { id: true, name: true, email: true } },
        venue: { select: { id: true, name: true } },
        promoCode: { select: { id: true, code: true, discountValue: true } },
        commission: { select: { id: true, promoterEarning: true, platformPassive: true, status: true } }
      }
    });

    // Get promoter details separately for bookings with promoterId
    const promoterIds = bookings.filter(b => b.promoterId).map(b => b.promoterId);
    const promoters = await db.promoterProfile.findMany({
      where: { id: { in: promoterIds as string[] } },
      include: { user: { select: { name: true } } }
    });
    const promoterMap = new Map(promoters.map(p => [p.id, p]));

    this.stats.bookings.total = bookings.length;

    for (const booking of bookings) {
      // Count attribution types
      if (booking.promoterId) this.stats.bookings.withPromoter++;
      if (booking.promoCodeId) this.stats.bookings.withPromoCode++;
      if (booking.magicLinkId) this.stats.bookings.withMagicLink++;

      // Validate revenue split calculations
      this.validateRevenueSplit(booking);

      // Check promoter attribution consistency
      this.validatePromoterAttribution(booking, promoterMap);

      // Check promotional code application
      if (booking.promoCode) {
        this.validatePromoCodeApplication(booking);
      }
    }

    console.log(`✅ Audited ${bookings.length} bookings\n`);
  }

  private validateRevenueSplit(booking: any): void {
    const { totalAmount, venueShare, commissionPool, promoterEarning, platformPassive, platformFee, totalPlatformRevenue } = booking;

    // Expected splits based on PRESTIX model:
    // - Venue: 87.5%
    // - Commission Pool: 10%
    // - Platform Fee: 2.5%
    const expectedVenueShare = totalAmount * 0.875;
    const expectedCommissionPool = totalAmount * 0.10;
    const expectedPlatformFee = totalAmount * 0.025;
    const expectedTotalPlatformRevenue = platformFee + platformPassive;

    // Check venue share
    if (Math.abs(Number(venueShare) - Number(expectedVenueShare)) > 0.01) {
      this.issues.push({
        type: 'ERROR',
        category: 'REVENUE_SPLIT',
        description: 'Venue share calculation mismatch',
        entityId: booking.id,
        expected: expectedVenueShare,
        actual: venueShare,
        impact: 'HIGH',
        recommendation: 'Recalculate venue share as totalAmount × 0.875'
      });
    }

    // Check commission pool
    if (Math.abs(Number(commissionPool) - Number(expectedCommissionPool)) > 0.01) {
      this.issues.push({
        type: 'ERROR',
        category: 'REVENUE_SPLIT',
        description: 'Commission pool calculation mismatch',
        entityId: booking.id,
        expected: expectedCommissionPool,
        actual: commissionPool,
        impact: 'HIGH',
        recommendation: 'Recalculate commission pool as totalAmount × 0.10'
      });
    }

    // Check total platform revenue
    if (Math.abs(Number(totalPlatformRevenue) - Number(expectedTotalPlatformRevenue)) > 0.01) {
      this.issues.push({
        type: 'ERROR',
        category: 'REVENUE_SPLIT',
        description: 'Total platform revenue mismatch',
        entityId: booking.id,
        expected: expectedTotalPlatformRevenue,
        actual: totalPlatformRevenue,
        impact: 'HIGH',
        recommendation: 'Recalculate as platformFee + platformPassive'
      });
    }
  }

  private validatePromoterAttribution(booking: any, promoterMap: Map<string, any>): void {
    // If booking has promoterId, it should have a commission record
    if (booking.promoterId && !booking.commission) {
      this.issues.push({
        type: 'ERROR',
        category: 'COMMISSION_MISSING',
        description: 'Booking has promoter attribution but no commission record',
        entityId: booking.id,
        impact: 'HIGH',
        recommendation: 'Create missing PromoterCommission record'
      });
    }

    // If booking has no promoter but has commission, that's an error
    if (!booking.promoterId && booking.commission) {
      this.issues.push({
        type: 'ERROR',
        category: 'INVALID_ATTRIBUTION',
        description: 'Booking has commission but no promoter attribution',
        entityId: booking.id,
        impact: 'HIGH',
        recommendation: 'Remove orphaned commission record'
      });
    }

    // Check promoter referral code consistency
    if (booking.promoterId && booking.promoterReferralCode) {
      const promoter = promoterMap.get(booking.promoterId);
      if (promoter && booking.promoterReferralCode !== promoter.referralCode) {
        this.issues.push({
          type: 'WARNING',
          category: 'REFERRAL_CODE_MISMATCH',
          description: 'Booking referral code does not match promoter',
          entityId: booking.id,
          expected: promoter.referralCode,
          actual: booking.promoterReferralCode,
          impact: 'MEDIUM',
          recommendation: 'Update to match promoter.referralCode'
        });
      }
    }
  }

  private validatePromoCodeApplication(booking: any): void {
    const { promoCode, discountAmount, baseAmount } = booking;

    if (promoCode.discountType === 'PERCENTAGE') {
      const expectedDiscount = baseAmount * (promoCode.discountValue / 100);
      if (Math.abs(Number(discountAmount) - Number(expectedDiscount)) > 0.01) {
        this.issues.push({
          type: 'ERROR',
          category: 'PROMO_CODE_DISCOUNT',
          description: 'Promotional code discount calculation mismatch',
          entityId: booking.id,
          expected: expectedDiscount,
          actual: discountAmount,
          impact: 'MEDIUM',
          recommendation: 'Recalculate discount as baseAmount × (discountValue/100)'
        });
      }
    } else if (promoCode.discountType === 'FIXED') {
      if (Number(discountAmount) !== Number(promoCode.discountValue)) {
        this.issues.push({
          type: 'ERROR',
          category: 'PROMO_CODE_DISCOUNT',
          description: 'Fixed promotional code discount mismatch',
          entityId: booking.id,
          expected: promoCode.discountValue,
          actual: discountAmount,
          impact: 'MEDIUM',
          recommendation: 'Set discount to promoCode.discountValue'
        });
      }
    }
  }

  private async auditCommissions(): Promise<void> {
    console.log('💰 Auditing promoter commissions...');

    const commissions = await db.promoterCommission.findMany({
      include: {
        promoter: { select: { id: true, tier: true } },
        booking: { select: { id: true, totalAmount: true, promoterId: true } }
      }
    });

    this.stats.commissions.total = commissions.length;

    for (const commission of commissions) {
      if (commission.status === 'CREDITED') this.stats.commissions.credited++;
      if (commission.status === 'PENDING') this.stats.commissions.pending++;

      // Validate commission calculations
      this.validateCommissionCalculation(commission);

      // Check tier-based splits
      this.validateTierSplit(commission);
    }

    console.log(`✅ Audited ${commissions.length} commission records\n`);
  }

  private validateCommissionCalculation(commission: any): void {
    const { bookingAmount, poolRate, commissionPool, promoterEarning, platformPassive } = commission;

    // Commission pool should be bookingAmount × poolRate (10%)
    const expectedPool = bookingAmount * poolRate;
    if (Math.abs(Number(commissionPool) - Number(expectedPool)) > 0.01) {
      this.issues.push({
        type: 'ERROR',
        category: 'COMMISSION_CALCULATION',
        description: 'Commission pool calculation mismatch',
        entityId: commission.id,
        expected: expectedPool,
        actual: commissionPool,
        impact: 'HIGH',
        recommendation: 'Recalculate as bookingAmount × poolRate'
      });
    }

    // Promoter earning + platform passive should equal commission pool
    const totalSplit = Number(promoterEarning) + Number(platformPassive);
    if (Math.abs(totalSplit - Number(commissionPool)) > 0.01) {
      this.issues.push({
        type: 'ERROR',
        category: 'COMMISSION_SPLIT',
        description: 'Commission split total mismatch',
        entityId: commission.id,
        expected: commissionPool,
        actual: totalSplit,
        impact: 'HIGH',
        recommendation: 'Ensure promoterEarning + platformPassive = commissionPool'
      });
    }
  }

  private validateTierSplit(commission: any): void {
    const { promoterTier, promoterSharePct, platformSharePct } = commission;

    // Tier-based share percentages (based on typical affiliate tiers)
    const expectedShares = {
      STARTER: { promoter: 0.50, platform: 0.50 },
      BRONZE: { promoter: 0.60, platform: 0.40 },
      SILVER: { promoter: 0.70, platform: 0.30 },
      GOLD: { promoter: 0.75, platform: 0.25 },
      ELITE: { promoter: 0.80, platform: 0.20 }
    };

    const expected = expectedShares[promoterTier as keyof typeof expectedShares];
    if (expected) {
      if (Math.abs(Number(promoterSharePct) - expected.promoter) > 0.01) {
        this.issues.push({
          type: 'WARNING',
          category: 'TIER_SPLIT',
          description: `Tier ${promoterTier} promoter share percentage mismatch`,
          entityId: commission.id,
          expected: expected.promoter,
          actual: promoterSharePct,
          impact: 'MEDIUM',
          recommendation: `Update to ${expected.promoter} for ${promoterTier} tier`
        });
      }

      if (Math.abs(Number(platformSharePct) - expected.platform) > 0.01) {
        this.issues.push({
          type: 'WARNING',
          category: 'TIER_SPLIT',
          description: `Tier ${promoterTier} platform share percentage mismatch`,
          entityId: commission.id,
          expected: expected.platform,
          actual: platformSharePct,
          impact: 'MEDIUM',
          recommendation: `Update to ${expected.platform} for ${promoterTier} tier`
        });
      }
    }
  }

  private async auditAffiliateLinks(): Promise<void> {
    console.log('🔗 Auditing affiliate links and magic links...');

    // Check magic links
    const magicLinks = await db.promoterMagicLink.findMany({
      include: {
        promoter: { select: { id: true } },
        _count: { select: { referrals: true } }
      }
    });

    this.stats.magicLinks.total = magicLinks.length;

    for (const link of magicLinks) {
      if (link._count.referrals > 0) this.stats.magicLinks.clicked++;

      // Check if link has required fields
      if (!link.linkToken || !link.shortCode || !link.fullUrl) {
        this.issues.push({
          type: 'ERROR',
          category: 'MAGIC_LINK_INTEGRITY',
          description: 'Magic link missing required fields',
          entityId: link.id,
          impact: 'HIGH',
          recommendation: 'Regenerate link token, short code, and full URL'
        });
      }

      // Check referral code consistency
      if (link.referralCode !== link.promoter.referralCode) {
        this.issues.push({
          type: 'WARNING',
          category: 'REFERRAL_CODE_MISMATCH',
          description: 'Magic link referral code does not match promoter',
          entityId: link.id,
          expected: link.promoter.referralCode,
          actual: link.referralCode,
          impact: 'MEDIUM',
          recommendation: 'Update to match promoter.referralCode'
        });
      }
    }

    // Check referrals
    const referrals = await db.promoterReferral.findMany({
      include: {
        promoter: { select: { id: true } },
        referredUser: { select: { id: true } }
      }
    });

    for (const referral of referrals) {
      // Check if referral has a referred user
      if (!referral.referredUserId) {
        this.issues.push({
          type: 'WARNING',
          category: 'INCOMPLETE_REFERRAL',
          description: 'Referral record without referred user',
          entityId: referral.id,
          impact: 'LOW',
          recommendation: 'Link to actual user or remove orphaned record'
        });
      }
    }

    console.log(`✅ Audited ${magicLinks.length} magic links and ${referrals.length} referrals\n`);
  }

  private async auditPromoCodes(): Promise<void> {
    console.log('🎫 Auditing promotional codes...');

    const promoCodes = await db.promoCode.findMany({
      include: {
        _count: { select: { bookingUses: true } }
      }
    });

    this.stats.promoCodes.total = promoCodes.length;

    for (const code of promoCodes) {
      if (code._count.bookingUses > 0) this.stats.promoCodes.used++;

      // Check usage limits
      if (code.maxUsages && code.usageCount > code.maxUsages) {
        this.issues.push({
          type: 'ERROR',
          category: 'PROMO_CODE_LIMIT',
          description: 'Promotional code usage exceeds limit',
          entityId: code.id,
          expected: code.maxUsages,
          actual: code.usageCount,
          impact: 'HIGH',
          recommendation: 'Deactivate code and refund excess usage'
        });
      }

      // Check expiration
      if (code.validUntil && new Date() > code.validUntil && code.isActive) {
        this.issues.push({
          type: 'WARNING',
          category: 'EXPIRED_PROMO_CODE',
          description: 'Expired promotional code still active',
          entityId: code.id,
          impact: 'MEDIUM',
          recommendation: 'Set isActive to false'
        });
      }
    }

    console.log(`✅ Audited ${promoCodes.length} promotional codes\n`);
  }

  private async auditPromoterMetrics(): Promise<void> {
    console.log('📈 Auditing promoter performance metrics...');

    const promoters = await db.promoterProfile.findMany({
      include: {
        _count: {
          select: {
            magicLinks: true,
            referrals: true,
            commissions: true
          }
        }
      }
    });

    this.stats.promoters.total = promoters.length;
    this.stats.promoters.active = promoters.filter(p => p.status === 'ACTIVE').length;

    for (const promoter of promoters) {
      // Check denormalized metrics vs actual counts
      const actualCommissions = promoter._count.commissions;

      if (Number(promoter.totalCommissionPool) === 0 && actualCommissions > 0) {
        this.issues.push({
          type: 'WARNING',
          category: 'METRICS_OUTDATED',
          description: 'Promoter has commissions but zero totalCommissionPool',
          entityId: promoter.id,
          impact: 'MEDIUM',
          recommendation: 'Recalculate denormalized metrics'
        });
      }

      // Check if metrics are stale (older than 24 hours for active promoters)
      const lastActiveThreshold = subDays(new Date(), 1);
      if (promoter.status === 'ACTIVE' && (!promoter.lastActiveAt || promoter.lastActiveAt < lastActiveThreshold)) {
        this.issues.push({
          type: 'INFO',
          category: 'STALE_METRICS',
          description: 'Active promoter metrics may be outdated',
          entityId: promoter.id,
          impact: 'LOW',
          recommendation: 'Trigger metrics refresh job'
        });
      }
    }

    console.log(`✅ Audited metrics for ${promoters.length} promoters\n`);
  }

  private async auditOrphanedTransactions(): Promise<void> {
    console.log('🔍 Auditing for orphaned transactions...');

    // Find commissions without bookings
    const orphanedCommissions = await db.$queryRaw`
      SELECT pc.id, pc."bookingId", pc."promoterId"
      FROM promoter_commissions pc
      LEFT JOIN bookings b ON pc."bookingId" = b.id
      WHERE b.id IS NULL
    `;

    if ((orphanedCommissions as any[]).length > 0) {
      for (const commission of orphanedCommissions as any[]) {
        this.issues.push({
          type: 'ERROR',
          category: 'ORPHANED_COMMISSION',
          description: 'Commission record references non-existent booking',
          entityId: commission.id,
          impact: 'HIGH',
          recommendation: 'Remove orphaned commission record'
        });
      }
    }

    // Find bookings with invalid promoter references
    const invalidPromoterBookings = await db.$queryRaw`
      SELECT b.id, b."promoterId", b."bookingNumber"
      FROM bookings b
      LEFT JOIN promoter_profiles pp ON b."promoterId" = pp.id
      WHERE b."promoterId" IS NOT NULL AND pp.id IS NULL
    `;

    if ((invalidPromoterBookings as any[]).length > 0) {
      for (const booking of invalidPromoterBookings as any[]) {
        this.issues.push({
          type: 'ERROR',
          category: 'INVALID_PROMOTER_REFERENCE',
          description: 'Booking references non-existent promoter',
          entityId: booking.id,
          impact: 'HIGH',
          recommendation: 'Clear promoterId or create missing promoter'
        });
      }
    }

    console.log(`✅ Completed orphaned transaction audit\n`);
  }

  private async validateRevenueTotals(): Promise<void> {
    console.log('💰 Validating revenue totals...');

    // Calculate total revenue from bookings
    const revenueSummary = await db.$queryRaw`
      SELECT
        SUM("totalAmount") as total_revenue,
        SUM("venueShare") as total_venue_share,
        SUM("commissionPool") as total_commission_pool,
        SUM("promoterEarning") as total_promoter_earnings,
        SUM("platformPassive") as total_platform_passive,
        SUM("platformFee") as total_platform_fees,
        SUM("totalPlatformRevenue") as total_platform_revenue
      FROM bookings
      WHERE status = 'COMPLETED'
    `;

    const totals = (revenueSummary as any[])[0];

    // Cross-validate totals
    const expectedPlatformRevenue = Number(totals.total_platform_fees || 0) + Number(totals.total_platform_passive || 0);

    if (Math.abs(Number(totals.total_platform_revenue || 0) - expectedPlatformRevenue) > 0.01) {
      this.issues.push({
        type: 'ERROR',
        category: 'REVENUE_TOTAL_MISMATCH',
        description: 'Total platform revenue calculation mismatch',
        entityId: 'GLOBAL',
        expected: expectedPlatformRevenue,
        actual: totals.total_platform_revenue,
        impact: 'HIGH',
        recommendation: 'Recalculate all booking revenue splits'
      });
    }

    // Validate commission totals match
    const commissionTotals = await db.$queryRaw`
      SELECT
        SUM("commissionPool") as total_commission_pool,
        SUM("promoterEarning") as total_promoter_earnings,
        SUM("platformPassive") as total_platform_passive
      FROM promoter_commissions
      WHERE status IN ('CREDITED', 'PENDING')
    `;

    const commTotals = (commissionTotals as any[])[0];

    if (Math.abs(Number(totals.total_commission_pool || 0) - Number(commTotals.total_commission_pool || 0)) > 0.01) {
      this.issues.push({
        type: 'ERROR',
        category: 'COMMISSION_TOTAL_MISMATCH',
        description: 'Commission pool totals mismatch between bookings and commissions',
        entityId: 'GLOBAL',
        expected: totals.total_commission_pool,
        actual: commTotals.total_commission_pool,
        impact: 'HIGH',
        recommendation: 'Sync commission records with booking data'
      });
    }

    console.log(`✅ Completed revenue total validation\n`);
  }

  private generateReport(): void {
    console.log('📋 FINANCIAL RECONCILIATION REPORT');
    console.log('=====================================\n');

    // Summary Statistics
    console.log('📊 SUMMARY STATISTICS:');
    console.log(`   Bookings: ${this.stats.bookings.total} total (${this.stats.bookings.withPromoter} with promoter, ${this.stats.bookings.withPromoCode} with promo code, ${this.stats.bookings.withMagicLink} with magic link)`);
    console.log(`   Commissions: ${this.stats.commissions.total} total (${this.stats.commissions.credited} credited, ${this.stats.commissions.pending} pending)`);
    console.log(`   Promoters: ${this.stats.promoters.total} total (${this.stats.promoters.active} active)`);
    console.log(`   Promo Codes: ${this.stats.promoCodes.total} total (${this.stats.promoCodes.used} used)`);
    console.log(`   Magic Links: ${this.stats.magicLinks.total} total (${this.stats.magicLinks.clicked} clicked)`);
    console.log('');

    // Issues by severity
    const errors = this.issues.filter(i => i.type === 'ERROR');
    const warnings = this.issues.filter(i => i.type === 'WARNING');
    const info = this.issues.filter(i => i.type === 'INFO');

    console.log('🚨 ISSUES FOUND:');
    console.log(`   ${errors.length} ERRORS (High Impact)`);
    console.log(`   ${warnings.length} WARNINGS (Medium Impact)`);
    console.log(`   ${info.length} INFO (Low Impact)`);
    console.log('');

    if (errors.length > 0) {
      console.log('🔴 CRITICAL ERRORS:');
      errors.forEach(issue => {
        console.log(`   ${issue.category}: ${issue.description}`);
        console.log(`     Entity: ${issue.entityId}`);
        console.log(`     Expected: ${issue.expected}, Actual: ${issue.actual}`);
        console.log(`     Recommendation: ${issue.recommendation}`);
        console.log('');
      });
    }

    if (warnings.length > 0) {
      console.log('🟡 WARNINGS:');
      warnings.forEach(issue => {
        console.log(`   ${issue.category}: ${issue.description}`);
        console.log(`     Entity: ${issue.entityId}`);
        console.log(`     Recommendation: ${issue.recommendation}`);
        console.log('');
      });
    }

    console.log('✅ Reconciliation complete!');
    console.log(`Total issues found: ${this.issues.length}`);
  }

  getIssues(): ReconciliationIssue[] {
    return this.issues;
  }

  getStats() {
    return this.stats;
  }
}

// Run reconciliation
async function main() {
  const reconciler = new FinancialReconciler();
  await reconciler.reconcile();

  const issues = reconciler.getIssues();
  const stats = reconciler.getStats();

  // Export issues to JSON for further analysis
  const report = {
    timestamp: new Date().toISOString(),
    stats,
    issues: issues.map(issue => ({
      ...issue,
      expected: issue.expected?.toString(),
      actual: issue.actual?.toString()
    }))
  };

  // Write report to file
  const fs = require('fs');
  fs.writeFileSync('financial-reconciliation-report.json', JSON.stringify(report, null, 2));

  console.log('\n📄 Report saved to: financial-reconciliation-report.json');

  // Exit with error code if there are critical issues
  const criticalIssues = issues.filter(i => i.type === 'ERROR' && i.impact === 'HIGH');
  if (criticalIssues.length > 0) {
    console.log(`\n❌ Found ${criticalIssues.length} critical issues requiring immediate attention!`);
    process.exit(1);
  }
}

main().catch(console.error);