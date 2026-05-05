#!/usr/bin/env tsx

/**
 * Booking Transaction Analysis Script
 * Provides full transaction breakdown and three-way accounting posting for all paid bookings
 */

import { createClient } from '../src/lib/db';
import { getSystemUser } from '../src/lib/utils/system-user';

interface BookingAnalysis {
  id: string;
  bookingNumber: string;
  memberName: string;
  memberEmail: string;
  venueName: string;
  bookingType: string;
  totalAmount: number;
  currency: string;
  status: string;
  promoterReferralCode?: string;
  promoterId?: string;
  promoterName?: string;
  promoterTier?: string;
  magicLinkId?: string;
  hasMagicLinkAcceptance: boolean;
  venueShare: number;
  commissionPool: number;
  promoterEarning: number;
  platformPassive: number;
  platformFee: number;
  totalPlatformRevenue: number;
  createdAt: Date;
  paymentStatus?: string;
}

interface AccountingPosting {
  bookingId: string;
  bookingNumber: string;
  transactionType: 'VENUE_SHARE' | 'COMMISSION_POOL' | 'PROMOTER_EARNING' | 'PLATFORM_PASSIVE' | 'PLATFORM_FEE';
  amount: number;
  currency: string;
  fromAccount: string;
  toAccount: string;
  description: string;
  reference: string;
}

async function analyzeBookingTransactions() {
  console.log('🔍 Analyzing Booking Transactions...\n');

  const systemUser = await getSystemUser();
  const db = createClient({
    ...systemUser,
    role: 'PLATFORM_ADMIN' as const,
  });

  // Get all paid bookings with full details
  const bookings = await db.booking.findMany({
    where: {
      status: {
        in: ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'] // Only paid bookings
      }
    },
    include: {
      member: {
        select: {
          id: true,
          name: true,
          email: true,
          onboardedViaLinkId: true,
          onboardedByPromoter: true,
        }
      },
      venue: {
        select: {
          id: true,
          name: true,
        }
      },
      promoter: {
        include: {
          user: {
            select: {
              name: true,
            }
          }
        }
      },
      payment: {
        select: {
          id: true,
          status: true,
          stripePaymentIntentId: true,
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log(`📊 Found ${bookings.length} paid bookings\n`);

  const analyses: BookingAnalysis[] = [];
  const accountingPostings: AccountingPosting[] = [];

  for (const booking of bookings) {
    // Check if member was onboarded via magic link (accepted magic link)
    const hasMagicLinkAcceptance = !!booking.member.onboardedViaLinkId;
    const hasPromoterReferral = !!booking.member.onboardedByPromoter;

    const analysis: BookingAnalysis = {
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      memberName: booking.member.name || 'Unknown',
      memberEmail: booking.member.email || '',
      venueName: booking.venue.name,
      bookingType: booking.bookingType,
      totalAmount: Number(booking.totalAmount),
      currency: booking.currency,
      status: booking.status,
      promoterReferralCode: booking.promoterReferralCode || undefined,
      promoterId: booking.promoterId || undefined,
      promoterName: booking.promoter?.user?.name || undefined,
      promoterTier: booking.promoter?.tier || undefined,
      magicLinkId: booking.magicLinkId || undefined,
      hasMagicLinkAcceptance,
      venueShare: Number(booking.venueShare),
      commissionPool: Number(booking.commissionPool),
      promoterEarning: Number(booking.promoterEarning),
      platformPassive: Number(booking.platformPassive),
      platformFee: Number(booking.platformFee),
      totalPlatformRevenue: Number(booking.totalPlatformRevenue),
      createdAt: booking.createdAt,
      paymentStatus: booking.payment?.status,
    };

    analyses.push(analysis);

    // Generate accounting postings for three-way split
    const postings = generateAccountingPostings(analysis);
    accountingPostings.push(...postings);
  }

  // Display results
  displayTransactionBreakdown(analyses);
  displayAccountingPostings(accountingPostings);
  displaySummaryStatistics(analyses);

  return { analyses, accountingPostings };
}

function generateAccountingPostings(analysis: BookingAnalysis): AccountingPosting[] {
  const postings: AccountingPosting[] = [];

  // 1. Venue Share Posting
  postings.push({
    bookingId: analysis.id,
    bookingNumber: analysis.bookingNumber,
    transactionType: 'VENUE_SHARE',
    amount: analysis.venueShare,
    currency: analysis.currency,
    fromAccount: 'Customer Payment',
    toAccount: `Venue: ${analysis.venueName}`,
    description: `Venue share payment for ${analysis.bookingType} booking`,
    reference: `VENUE-${analysis.bookingNumber}`
  });

  // 2. Commission Pool Allocation
  postings.push({
    bookingId: analysis.id,
    bookingNumber: analysis.bookingNumber,
    transactionType: 'COMMISSION_POOL',
    amount: analysis.commissionPool,
    currency: analysis.currency,
    fromAccount: 'Customer Payment',
    toAccount: 'Commission Pool',
    description: `Commission pool allocation (10% of booking)`,
    reference: `POOL-${analysis.bookingNumber}`
  });

  // 3. Promoter Earning (if applicable)
  if (analysis.promoterEarning > 0 && analysis.promoterId) {
    postings.push({
      bookingId: analysis.id,
      bookingNumber: analysis.bookingNumber,
      transactionType: 'PROMOTER_EARNING',
      amount: analysis.promoterEarning,
      currency: analysis.currency,
      fromAccount: 'Commission Pool',
      toAccount: `Promoter: ${analysis.promoterName || 'Unknown'} (${analysis.promoterTier || 'Unknown'})`,
      description: `Promoter commission payment for ${analysis.bookingType} booking`,
      reference: `PROMOTER-${analysis.bookingNumber}`
    });
  }

  // 4. Platform Passive Revenue
  postings.push({
    bookingId: analysis.id,
    bookingNumber: analysis.bookingNumber,
    transactionType: 'PLATFORM_PASSIVE',
    amount: analysis.platformPassive,
    currency: analysis.currency,
    fromAccount: 'Commission Pool',
    toAccount: 'Platform Revenue Account',
    description: `Platform passive revenue from commission pool`,
    reference: `PLATFORM-PASSIVE-${analysis.bookingNumber}`
  });

  // 5. Platform Fee
  postings.push({
    bookingId: analysis.id,
    bookingNumber: analysis.bookingNumber,
    transactionType: 'PLATFORM_FEE',
    amount: analysis.platformFee,
    currency: analysis.currency,
    fromAccount: 'Customer Payment',
    toAccount: 'Platform Fee Account',
    description: `Platform processing fee (2.5% of booking)`,
    reference: `PLATFORM-FEE-${analysis.bookingNumber}`
  });

  return postings;
}

function displayTransactionBreakdown(analyses: BookingAnalysis[]) {
  console.log('📋 FULL TRANSACTION BREAKDOWN');
  console.log('='.repeat(120));
  console.log('');

  analyses.forEach((analysis, index) => {
    console.log(`${index + 1}. BOOKING: ${analysis.bookingNumber}`);
    console.log(`   Member: ${analysis.memberName} (${analysis.memberEmail})`);
    console.log(`   Venue: ${analysis.venueName}`);
    console.log(`   Type: ${analysis.bookingType}`);
    console.log(`   Amount: ${analysis.currency} ${(analysis.totalAmount / 100).toFixed(2)}`);
    console.log(`   Status: ${analysis.status}`);
    console.log(`   Date: ${analysis.createdAt.toISOString().split('T')[0]}`);

    if (analysis.hasMagicLinkAcceptance) {
      console.log(`   ✨ MAGIC LINK ACCEPTED: Yes (Link ID: ${analysis.magicLinkId || 'Unknown'})`);
    } else {
      console.log(`   ✨ MAGIC LINK ACCEPTED: No`);
    }

    if (analysis.promoterId) {
      console.log(`   🎯 PROMOTER REFERRED: Yes`);
      console.log(`      Promoter: ${analysis.promoterName || 'Unknown'} (${analysis.promoterTier || 'Unknown'})`);
      console.log(`      Referral Code: ${analysis.promoterReferralCode || 'N/A'}`);
    } else {
      console.log(`   🎯 PROMOTER REFERRED: No`);
    }

    console.log('');
    console.log('   💰 THREE-WAY REVENUE SPLIT:');
    console.log(`      Venue Share (87.5%): ${analysis.currency} ${(analysis.venueShare / 100).toFixed(2)}`);
    console.log(`      Commission Pool (10%): ${analysis.currency} ${(analysis.commissionPool / 100).toFixed(2)}`);
    console.log(`      Promoter Earning: ${analysis.currency} ${(analysis.promoterEarning / 100).toFixed(2)}`);
    console.log(`      Platform Passive: ${analysis.currency} ${(analysis.platformPassive / 100).toFixed(2)}`);
    console.log(`      Platform Fee (2.5%): ${analysis.currency} ${(analysis.platformFee / 100).toFixed(2)}`);
    console.log(`      Total Platform Revenue: ${analysis.currency} ${(analysis.totalPlatformRevenue / 100).toFixed(2)}`);

    console.log('');
    console.log('   ✅ SPLIT VALIDATION:');
    const totalSplit = analysis.venueShare + analysis.commissionPool + analysis.platformFee;
    const isValid = Math.abs(totalSplit - analysis.totalAmount) < 1; // Allow for rounding
    console.log(`      Expected Total: ${analysis.currency} ${(analysis.totalAmount / 100).toFixed(2)}`);
    console.log(`      Actual Split: ${analysis.currency} ${(totalSplit / 100).toFixed(2)}`);
    console.log(`      Split Valid: ${isValid ? '✅' : '❌'}`);

    console.log('');
    console.log('-'.repeat(80));
    console.log('');
  });
}

function displayAccountingPostings(postings: AccountingPosting[]) {
  console.log('📚 THREE-WAY ACCOUNTING POSTINGS');
  console.log('='.repeat(120));
  console.log('');

  const groupedByBooking = new Map<string, AccountingPosting[]>();

  // Group postings by booking
  postings.forEach(posting => {
    if (!groupedByBooking.has(posting.bookingNumber)) {
      groupedByBooking.set(posting.bookingNumber, []);
    }
    groupedByBooking.get(posting.bookingNumber)!.push(posting);
  });

  // Display grouped postings
  Array.from(groupedByBooking.entries()).forEach(([bookingNumber, bookingPostings], index) => {
    console.log(`${index + 1}. BOOKING ${bookingNumber} - ACCOUNTING ENTRIES`);
    console.log('');

    bookingPostings.forEach((posting, postingIndex) => {
      console.log(`   ${postingIndex + 1}. ${posting.transactionType}`);
      console.log(`      From: ${posting.fromAccount}`);
      console.log(`      To: ${posting.toAccount}`);
      console.log(`      Amount: ${posting.currency} ${(posting.amount / 100).toFixed(2)}`);
      console.log(`      Description: ${posting.description}`);
      console.log(`      Reference: ${posting.reference}`);
      console.log('');
    });

    console.log('-'.repeat(80));
    console.log('');
  });
}

function displaySummaryStatistics(analyses: BookingAnalysis[]) {
  console.log('📈 SUMMARY STATISTICS');
  console.log('='.repeat(120));
  console.log('');

  const totalBookings = analyses.length;
  const totalRevenue = analyses.reduce((sum, a) => sum + a.totalAmount, 0);
  const totalVenueShare = analyses.reduce((sum, a) => sum + a.venueShare, 0);
  const totalCommissionPool = analyses.reduce((sum, a) => sum + a.commissionPool, 0);
  const totalPromoterEarnings = analyses.reduce((sum, a) => sum + a.promoterEarning, 0);
  const totalPlatformPassive = analyses.reduce((sum, a) => sum + a.platformPassive, 0);
  const totalPlatformFee = analyses.reduce((sum, a) => sum + a.platformFee, 0);
  const totalPlatformRevenue = analyses.reduce((sum, a) => sum + a.totalPlatformRevenue, 0);

  const magicLinkBookings = analyses.filter(a => a.hasMagicLinkAcceptance).length;
  const promoterReferredBookings = analyses.filter(a => a.promoterId).length;
  const bookingsWithEarnings = analyses.filter(a => a.promoterEarning > 0).length;

  console.log(`Total Paid Bookings: ${totalBookings}`);
  console.log(`Total Revenue: AUD ${(totalRevenue / 100).toFixed(2)}`);
  console.log('');

  console.log('REVENUE SPLIT SUMMARY:');
  console.log(`  Venue Share (87.5%): AUD ${(totalVenueShare / 100).toFixed(2)}`);
  console.log(`  Commission Pool (10%): AUD ${(totalCommissionPool / 100).toFixed(2)}`);
  console.log(`  Promoter Earnings: AUD ${(totalPromoterEarnings / 100).toFixed(2)}`);
  console.log(`  Platform Passive: AUD ${(totalPlatformPassive / 100).toFixed(2)}`);
  console.log(`  Platform Fee (2.5%): AUD ${(totalPlatformFee / 100).toFixed(2)}`);
  console.log(`  Total Platform Revenue: AUD ${(totalPlatformRevenue / 100).toFixed(2)}`);
  console.log('');

  console.log('PROMOTER & MAGIC LINK ANALYSIS:');
  console.log(`  Bookings from Magic Link Acceptance: ${magicLinkBookings} (${((magicLinkBookings / totalBookings) * 100).toFixed(1)}%)`);
  console.log(`  Bookings with Promoter Referral: ${promoterReferredBookings} (${((promoterReferredBookings / totalBookings) * 100).toFixed(1)}%)`);
  console.log(`  Bookings with Promoter Earnings Paid: ${bookingsWithEarnings} (${((bookingsWithEarnings / totalBookings) * 100).toFixed(1)}%)`);
  console.log('');

  // Split validation
  const expectedTotal = totalVenueShare + totalCommissionPool + totalPlatformFee;
  const splitValid = Math.abs(expectedTotal - totalRevenue) < totalBookings; // Allow small rounding error per booking
  console.log(`SPLIT VALIDATION: ${splitValid ? '✅ All splits are mathematically correct' : '❌ Split discrepancies detected'}`);

  console.log('');
  console.log('='.repeat(120));
}

// Run the analysis
analyzeBookingTransactions()
  .then(() => {
    console.log('✅ Analysis complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  });