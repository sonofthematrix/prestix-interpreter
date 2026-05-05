#!/usr/bin/env tsx
/**
 * Seed Promoters, Referred Users, Bookings, Commissions, Wallets & Settlements
 *
 * Revenue split (partner agreement specification in schema/docs):
 *   - 87.5% → Venue (venueShare)
 *   - 10%   → Promoter commission pool (commissionPool), then split by tier:
 *     STARTER 60% promoter / 40% platform, BRONZE 68/32, SILVER 75/25, GOLD 83/17, ELITE 90/10
 *   - 2.5%  → Platform fee (platformFee)
 *
 * Creates: CommissionSplitConfig, 6 promoter users+profiles, referred members,
 * PromoterReferral, PromoCode, Bookings with promoter attribution, BookingPayment,
 * PromoterCommission, PrestixWallet, WalletTransaction, VenueSettlement, WalletWithdrawal.
 *
 * Run after seed-missfish-partner-hub (requires venue, tables, tickets).
 * Uses ZenStack createClient(systemUser). Run: bun run db:seed:promoters
 */

import 'dotenv/config';
import { createClient } from '../src/lib/db';

const systemUser = {
  id: 'system',
  email: 'system@TKNZN.pro',
  role: 'PLATFORM_ADMIN' as const,
  name: 'System Admin',
};

const db = createClient(systemUser);

const SYSTEM_EMAIL = 'system@TKNZN.pro';

const VENUE_PCT = 0.875;
const POOL_PCT = 0.1;
const PLATFORM_FEE_PCT = 0.025;

const TIER_SPLITS: Record<string, { promoterPct: number; platformPct: number; minBookings: number; maxBookings: number | null }> = {
  STARTER: { promoterPct: 0.6, platformPct: 0.4, minBookings: 0, maxBookings: 24 },
  BRONZE: { promoterPct: 0.68, platformPct: 0.32, minBookings: 25, maxBookings: 49 },
  SILVER: { promoterPct: 0.75, platformPct: 0.25, minBookings: 50, maxBookings: 99 },
  GOLD: { promoterPct: 0.83, platformPct: 0.17, minBookings: 100, maxBookings: 249 },
  ELITE: { promoterPct: 0.9, platformPct: 0.1, minBookings: 250, maxBookings: null },
};

function bookingNumber(seq: number): string {
  const d = new Date();
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, '');
  return `PX-${ymd}-${String(seq).padStart(4, '0')}`;
}

async function ensureSystemUser(): Promise<string> {
  const u = await db.user.findFirst({ where: { email: { equals: SYSTEM_EMAIL } } as any });
  if (u) return u.id;
  const created = await db.user.create({
    data: {
      email: SYSTEM_EMAIL,
      name: 'System Admin',
      role: 'PLATFORM_ADMIN',
      status: 'ACTIVE',
      authMethod: 'email',
    } as any,
  });
  console.log('✅ System user created');
  return created.id;
}

async function seedCommissionSplitConfig() {
  const tiers = ['STARTER', 'BRONZE', 'SILVER', 'GOLD', 'ELITE'] as const;
  for (const tier of tiers) {
    const cfg = TIER_SPLITS[tier];
    const existing = await db.commissionSplitConfig.findFirst({ where: { tier: { equals: tier } } as any });
    if (existing) {
      await db.commissionSplitConfig.update({
        where: { id: existing.id } as any,
        data: {
          promoterSharePct: cfg.promoterPct,
          platformSharePct: cfg.platformPct,
          minBookings: cfg.minBookings,
          maxBookings: cfg.maxBookings ?? undefined,
        } as any,
      });
    } else {
      await db.commissionSplitConfig.create({
        data: {
          tier,
          promoterSharePct: cfg.promoterPct,
          platformSharePct: cfg.platformPct,
          minBookings: cfg.minBookings,
          maxBookings: cfg.maxBookings ?? undefined,
          description: `${tier} tier`,
          isActive: true,
        } as any,
      });
    }
  }
  console.log('✅ CommissionSplitConfig (5 tiers)');
}

async function getOrCreateVenueAndTickets(systemId: string): Promise<{ venueId: string; ticketIds: string[]; tableIds: string[] }> {
  const venue = await db.venueProfile.findFirst({ where: { slug: { equals: 'miss-fish-bali' } } as any });
  if (!venue) {
    console.warn('⚠️ Run db:seed:missfish first. Creating minimal venue for promoter seed.');
    const owner = await db.user.create({
      data: {
        email: 'venue@missfishbali.com',
        name: 'Miss Fish Bali Management',
        role: 'VENUE_ADMIN',
        status: 'ACTIVE',
        authMethod: 'email',
      } as any,
    });
    const v = await db.venueProfile.create({
      data: {
        userId: owner.id,
        slug: 'miss-fish-bali',
        name: 'Miss Fish Bali',
        venueType: 'LOUNGE',
        status: 'ACTIVE',
        city: 'Bali',
        country: 'Indonesia',
        currency: 'IDR',
      } as any,
    });
    const t1 = await db.venueTable.create({
      data: {
        venueId: v.id,
        name: 'Lounge Standard',
        tableNumber: 'L1',
        tableType: 'STANDARD',
        minCapacity: 2,
        maxCapacity: 6,
        basePrice: 2_500_000,
        minimumSpend: 4_000_000,
        currency: 'IDR',
        isActive: true,
      } as any,
    });
    const tk1 = await db.venueTicket.create({
      data: {
        venueId: v.id,
        name: 'International Series',
        price: 150_000,
        currency: 'IDR',
        totalInventory: 200,
        isActive: true,
      } as any,
    });
    return { venueId: v.id, ticketIds: [tk1.id], tableIds: [t1.id] };
  }
  const tables = await db.venueTable.findMany({ where: { venueId: { equals: venue.id } } as any, take: 3 });
  const tickets = await db.venueTicket.findMany({ where: { venueId: { equals: venue.id } } as any, take: 3 });
  return {
    venueId: venue.id,
    ticketIds: tickets.map((t) => t.id),
    tableIds: tables.map((t) => t.id),
  };
}

async function main() {
  console.log('🎯 Promoter & transactions seed (ZenStack v3)\n');

  const systemId = await ensureSystemUser();
  await seedCommissionSplitConfig();

  const { venueId, ticketIds, tableIds } = await getOrCreateVenueAndTickets(systemId);

  const promoterEmails = ['promo1@prestix.vip', 'promo2@prestix.vip', 'promo3@prestix.vip', 'promo4@prestix.vip', 'promo5@prestix.vip', 'promo6@prestix.vip'];
  const promoterNames = ['Alex Promo', 'Sam Curator', 'Jordan Nights', 'Casey Vibe', 'Riley Social', 'Morgan Events'];
  const referralCodes = ['PX-PROMO1', 'PX-PROMO2', 'PX-PROMO3', 'PX-PROMO4', 'PX-PROMO5', 'PX-PROMO6'];
  const tiers = ['STARTER', 'STARTER', 'BRONZE', 'SILVER', 'GOLD', 'ELITE'] as const;

  const promoters: { userId: string; profileId: string; referralCode: string; tier: string }[] = [];

  for (let i = 0; i < 6; i++) {
    let user = await db.user.findFirst({ where: { email: { equals: promoterEmails[i] } } as any });
    if (!user) {
      user = await db.user.create({
        data: {
          email: promoterEmails[i],
          name: promoterNames[i],
          role: 'PROMOTER',
          status: 'ACTIVE',
          authMethod: 'email',
        } as any,
      });
    }
    let profile = await db.promoterProfile.findFirst({ where: { userId: { equals: user!.id } } as any });
    if (!profile) {
      profile = await db.promoterProfile.create({
        data: {
          userId: user!.id,
          status: 'ACTIVE',
          tier: tiers[i],
          referralCode: referralCodes[i],
          referralLink: `https://prestix.vip/join/${referralCodes[i]}`,
          socialHandle: `@${promoterNames[i].replace(' ', '').toLowerCase()}`,
          followerCount: 5000 + i * 3000,
          applicationNotes: 'Seeded promoter for hub testing.',
          approvedAt: new Date(),
          approvedBy: systemId,
          totalMagicLinksCreated: 0,
          totalReferralClicks: 0,
          totalRegistrations: 0,
          totalBookings: 0,
          totalGrossRevenue: 0,
          totalCommissionPool: 0,
          totalPromoterEarnings: 0,
          totalPlatformPassive: 0,
          lifetimeWithdrawals: 0,
        } as any,
      });
    }
    promoters.push({ userId: user!.id, profileId: profile!.id, referralCode: referralCodes[i], tier: tiers[i] });
  }
  console.log('✅ 6 promoter users + profiles');

  const members: { userId: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const promoter = promoters[i % promoters.length];
    const email = `member${i + 1}@prestix.vip`;
    let user = await db.user.findFirst({ where: { email: { equals: email } } as any });
    if (!user) {
      user = await db.user.create({
        data: {
          email,
          name: `Member ${i + 1}`,
          role: 'MEMBER',
          status: 'ACTIVE',
          authMethod: 'email',
          onboardedByPromoter: promoter.profileId,
        } as any,
      });
    }
    members.push({ userId: user!.id });
  }
  console.log('✅ 12 referred member users');

  for (const p of promoters) {
    const existing = await db.promoCode.findFirst({ where: { code: { equals: p.referralCode } } as any });
    if (!existing) {
      await db.promoCode.create({
        data: {
          code: p.referralCode,
          description: `Promoter ${p.referralCode} referral`,
          discountType: 'PERCENTAGE',
          discountValue: 0,
          isActive: true,
          createdBy: systemId,
        } as any,
      });
    }
  }
  console.log('✅ PromoCode records');

  for (let i = 0; i < members.length; i++) {
    const promoter = promoters[i % promoters.length];
    const ref = await db.promoterReferral.findFirst({
      where: { referredUserId: { equals: members[i].userId } as any, promoterId: { equals: promoter.profileId } as any },
    });
    if (!ref) {
      await db.promoterReferral.create({
        data: {
          promoterId: promoter.profileId,
          referredUserId: members[i].userId,
          promoCode: promoter.referralCode,
          firstVisitAt: new Date(Date.now() - (i + 1) * 86400000),
          registeredAt: new Date(Date.now() - i * 86400000),
        } as any,
      });
    }
  }
  console.log('✅ PromoterReferral records');

  const currency = 'IDR';
  let bookingSeq = 1;
  const createdBookings: { id: string; memberId: string; promoterId: string; promoterTier: string; totalAmount: number }[] = [];

  for (let i = 0; i < 20; i++) {
    const promoter = promoters[i % promoters.length];
    const member = members[i % members.length];
    const totalAmount = [150_000, 250_000, 500_000, 1_200_000, 4_000_000][i % 5];
    const venueShare = Math.round(totalAmount * VENUE_PCT * 100) / 100;
    const commissionPool = Math.round(totalAmount * POOL_PCT * 100) / 100;
    const platformFee = Math.round(totalAmount * PLATFORM_FEE_PCT * 100) / 100;
    const tierCfg = TIER_SPLITS[promoter.tier];
    const promoterEarning = Math.round(commissionPool * tierCfg.promoterPct * 100) / 100;
    const platformPassive = Math.round(commissionPool * tierCfg.platformPct * 100) / 100;
    const totalPlatformRevenue = platformFee + platformPassive;

    const bn = bookingNumber(bookingSeq++);
    const existing = await db.booking.findFirst({ where: { bookingNumber: { equals: bn } } as any });
    if (existing) continue;

    const ticketId = ticketIds[i % ticketIds.length];
    const tableId = tableIds[i % tableIds.length];
    const bookingDate = new Date();
    bookingDate.setDate(bookingDate.getDate() - (i % 14));

    const booking = await db.booking.create({
      data: {
        bookingNumber: bn,
        memberId: member.userId,
        venueId,
        bookingType: i % 3 === 0 ? 'EVENT_TICKET' : 'TABLE_RESERVATION',
        tableId: i % 3 === 0 ? undefined : tableId,
        ticketId: i % 3 === 0 ? ticketId : undefined,
        bookingDate,
        startTime: '21:00',
        endTime: '02:00',
        guestCount: 2 + (i % 4),
        baseAmount: totalAmount,
        addOnsAmount: 0,
        discountAmount: 0,
        taxAmount: 0,
        totalAmount,
        currency,
        venueShare,
        commissionPool,
        promoterEarning,
        platformPassive,
        platformFee,
        totalPlatformRevenue,
        promoterReferralCode: promoter.referralCode,
        promoterId: promoter.profileId,
        paymentRail: 'STRIPE_CARD',
        status: 'CONFIRMED',
        isFirstBooking: i < 6,
      } as any,
    });
    createdBookings.push({ id: booking.id, memberId: member.userId, promoterId: promoter.profileId, promoterTier: promoter.tier, totalAmount });
  }
  console.log('✅ Bookings with revenue split:', createdBookings.length);

  for (const b of createdBookings) {
    const booking = await db.booking.findUnique({ where: { id: b.id } as any });
    if (!booking) continue;
    const payExists = await db.bookingPayment.findFirst({ where: { bookingId: { equals: booking.id } } as any });
    if (payExists) continue;
    await db.bookingPayment.create({
      data: {
        bookingId: booking.id,
        amount: Number(booking.totalAmount),
        currency: booking.currency,
        rail: 'STRIPE_CARD',
        status: 'COMPLETED',
        processedAt: new Date(),
      } as any,
    });
  }
  console.log('✅ BookingPayment records');

  const tierConfigs = await db.commissionSplitConfig.findMany({});
  const tierMap: Record<string, { promoterSharePct: number; platformSharePct: number }> = {};
  for (const t of tierConfigs) {
    tierMap[t.tier] = { promoterSharePct: Number(t.promoterSharePct), platformSharePct: Number(t.platformSharePct) };
  }
  for (const b of createdBookings) {
    const booking = await db.booking.findUnique({ where: { id: b.id } as any });
    if (!booking) continue;
    const payment = await db.bookingPayment.findFirst({ where: { bookingId: { equals: booking.id } } as any });
    if (!payment || payment.status !== 'COMPLETED') continue;
    const exists = await db.promoterCommission.findFirst({ where: { bookingId: { equals: booking.id } } as any });
    if (exists) continue;
    const cfg = tierMap[b.promoterTier] || tierMap.STARTER;
    const pool = Number(booking.commissionPool);
    const promoterEarning = Math.round(pool * cfg.promoterSharePct * 100) / 100;
    const platformPassive = Math.round(pool * cfg.platformSharePct * 100) / 100;
    await db.promoterCommission.create({
      data: {
        promoterId: b.promoterId,
        bookingId: booking.id,
        bookingAmount: booking.totalAmount,
        poolRate: POOL_PCT,
        commissionPool: pool,
        promoterTier: b.promoterTier as any,
        promoterSharePct: cfg.promoterSharePct,
        platformSharePct: cfg.platformSharePct,
        promoterEarning,
        platformPassive,
        currency: booking.currency,
        paymentRail: 'STRIPE_CARD',
        status: 'CREDITED',
        creditedAt: new Date(),
      } as any,
    });
  }
  console.log('✅ PromoterCommission records');

  for (const p of promoters) {
    const walletExists = await db.prestixWallet.findFirst({ where: { promoterId: { equals: p.profileId } } as any });
    if (!walletExists) {
      await db.prestixWallet.create({
        data: {
          userId: p.userId,
          promoterId: p.profileId,
          balance: 0,
          pendingBalance: 0,
          currency: 'AUD',
          status: 'ACTIVE',
        } as any,
      });
    }
  }
  const wallets = await db.prestixWallet.findMany({ where: { promoterId: { not: null } } as any });
  for (const w of wallets) {
    if (!w.promoterId) continue;
    const commissions = await db.promoterCommission.findMany({
      where: { promoterId: { equals: w.promoterId } as any, status: { equals: 'CREDITED' } as any },
    });
    let runningBalance = 0;
    for (const c of commissions) {
      const amt = Number(c.promoterEarning);
      runningBalance += amt;
      const refId = `comm-${c.id}`;
      const txExists = await db.walletTransaction.findFirst({
        where: { walletId: { equals: w.id } as any, referenceId: { equals: refId } as any },
      });
      if (!txExists) {
        await db.walletTransaction.create({
          data: {
            walletId: w.id,
            type: 'COMMISSION_EARNED',
            amount: amt,
            balance: runningBalance,
            currency: c.currency,
            description: `Commission from booking ${c.bookingId}`,
            referenceId: refId,
            referenceType: 'PromoterCommission',
            rail: 'STRIPE_CARD',
            ledgerEntryIds: [],
          } as any,
        });
      }
    }
    await db.prestixWallet.update({
      where: { id: w.id } as any,
      data: { balance: runningBalance } as any,
    });
  }
  console.log('✅ PrestixWallet + WalletTransaction (COMMISSION_EARNED)');

  const periodEnd = new Date();
  const periodStart = new Date(periodEnd);
  periodStart.setDate(periodStart.getDate() - 14);
  const settlementNumber = `SET-${periodStart.toISOString().slice(0, 10)}-${venueId.slice(-6)}`;
  const existingSettlement = await db.venueSettlement.findFirst({ where: { settlementNumber: { equals: settlementNumber } } as any });
  if (!existingSettlement) {
    const bookingsInPeriod = await db.booking.findMany({
      where: {
        venueId: { equals: venueId } as any,
        status: { equals: 'CONFIRMED' } as any,
        bookingDate: { gte: periodStart, lte: periodEnd },
      } as any,
    });
    const grossRevenue = bookingsInPeriod.reduce((s, b) => s + Number(b.totalAmount), 0);
    const venueShareSum = bookingsInPeriod.reduce((s, b) => s + Number(b.venueShare), 0);
    const platformFeeSum = bookingsInPeriod.reduce((s, b) => s + Number(b.platformFee), 0);
    const promoterCommissionsSum = bookingsInPeriod.reduce((s, b) => s + Number(b.commissionPool), 0);
    const platformPassiveSum = bookingsInPeriod.reduce((s, b) => s + Number(b.platformPassive), 0);
    await db.venueSettlement.create({
      data: {
        venueId,
        settlementNumber,
        periodStart,
        periodEnd,
        grossRevenue,
        totalBookings: bookingsInPeriod.length,
        stripeFees: 0,
        platformFee: platformFeeSum,
        platformPassive: platformPassiveSum,
        promoterCommissions: promoterCommissionsSum,
        refunds: 0,
        adjustments: 0,
        taxCollected: 0,
        netSettlement: venueShareSum,
        currency: 'IDR',
        status: 'COMPLETED',
        processedAt: new Date(),
        bookingBreakdown: bookingsInPeriod.map((b) => ({ id: b.id, totalAmount: Number(b.totalAmount) })) as any,
      } as any,
    });
    console.log('✅ VenueSettlement:', settlementNumber);
  }

  for (let i = 0; i < 3; i++) {
    const w = wallets[i];
    if (!w) continue;
    const amount = Number(w.balance) * 0.5;
    if (amount < 1) continue;
    const existingWithdrawal = await db.walletWithdrawal.findFirst({
      where: { walletId: { equals: w.id } as any, status: { equals: 'COMPLETED' } as any },
    });
    if (existingWithdrawal) continue;
    await db.walletWithdrawal.create({
      data: {
        walletId: w.id,
        amount,
        currency: w.currency,
        method: 'stripe_connect',
        status: 'COMPLETED',
        processedAt: new Date(),
        transactionRef: `WDR-${w.id.slice(-8)}`,
      } as any,
    });
    await db.prestixWallet.update({
      where: { id: w.id } as any,
      data: { balance: Number(w.balance) - amount } as any,
    });
  }
  console.log('✅ WalletWithdrawal (claimed) for 3 promoters');

  for (const p of promoters) {
    const commissions = await db.promoterCommission.findMany({ where: { promoterId: { equals: p.profileId } } as any });
    const totalBookings = commissions.length;
    const totalCommissionPool = commissions.reduce((s, c) => s + Number(c.commissionPool), 0);
    const totalPromoterEarnings = commissions.reduce((s, c) => s + Number(c.promoterEarning), 0);
    const totalPlatformPassive = commissions.reduce((s, c) => s + Number(c.platformPassive), 0);
    const bookings = await db.booking.findMany({ where: { promoterId: { equals: p.profileId } } as any });
    const totalGrossRevenue = bookings.reduce((s, b) => s + Number(b.totalAmount), 0);
    const wallet = await db.prestixWallet.findFirst({ where: { promoterId: { equals: p.profileId } } as any });
    let lifetimeWithdrawals = 0;
    if (wallet) {
      const withdrawals = await db.walletWithdrawal.findMany({
        where: { walletId: { equals: wallet.id } as any, status: { equals: 'COMPLETED' } as any },
      });
      lifetimeWithdrawals = withdrawals.reduce((s, w) => s + Number(w.amount), 0);
    }
    await db.promoterProfile.update({
      where: { id: p.profileId } as any,
      data: {
        totalBookings,
        totalCommissionPool,
        totalPromoterEarnings,
        totalPlatformPassive,
        totalGrossRevenue,
        totalRegistrations: 12,
        lifetimeWithdrawals,
      } as any,
    });
  }
  console.log('✅ Promoter aggregates updated');

  console.log('\n🎉 Promoter & transactions seed complete.');
  console.log('   Promoters: 6 | Members: 12 | Bookings: 20 | Commissions credited | Settlements & withdrawals seeded.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
