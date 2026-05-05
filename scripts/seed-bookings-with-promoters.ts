#!/usr/bin/env tsx
/**
 * Seed Bookings with Promoter Attribution
 *
 * Links existing bookings (without promoter) to available promoters using their
 * referral codes. Updates promoterId, promoterReferralCode, and recomputes
 * promoterEarning/platformPassive based on promoter tier.
 *
 * Run after: db:seed:missfish, db:seed:promoters (or db:seed:promoters for Miss Fish promoters)
 * Run: bun run scripts/seed-bookings-with-promoters.ts
 */

import "dotenv/config";
import { createClient } from "../src/lib/db";

const systemUser = {
  id: "system",
  email: "system@TKNZN.pro",
  role: "PLATFORM_ADMIN" as const,
  name: "System Admin",
};

const db = createClient(systemUser);

const POOL_PCT = 0.1;
const PLATFORM_FEE_PCT = 0.025;

const TIER_SPLITS: Record<
  string,
  { promoterPct: number; platformPct: number }
> = {
  STARTER: { promoterPct: 0.6, platformPct: 0.4 },
  BRONZE: { promoterPct: 0.68, platformPct: 0.32 },
  SILVER: { promoterPct: 0.75, platformPct: 0.25 },
  GOLD: { promoterPct: 0.83, platformPct: 0.17 },
  ELITE: { promoterPct: 0.9, platformPct: 0.1 },
};

async function main() {
  console.log("🎫 Seed Bookings with Promoter Attribution\n");

  try {
    // 1. Get all active promoters with their referral codes
    const promoters = await db.promoterProfile.findMany({
      where: { status: { equals: "ACTIVE" } } as any,
      include: { user: { select: { name: true } } },
      orderBy: { tier: "desc" } as any,
    });

    if (promoters.length === 0) {
      console.error(
        "❌ No active promoters found. Run db:seed:promoters or seed-missfish-promoters first."
      );
      process.exit(1);
    }

    console.log(`✅ Found ${promoters.length} promoters`);
    console.log(
      "   Promo codes (users enter these to nominate promoter):\n"
    );
    for (const p of promoters) {
      console.log(
        `   • ${p.referralCode} — ${p.user?.name ?? "Promoter"} (${p.tier})`
      );
    }
    console.log("");

    // 2. Get bookings without promoter
    const bookingsWithoutPromoter = await db.booking.findMany({
      where: { promoterId: null } as any,
      include: {
        venue: { select: { id: true, name: true } },
        member: { select: { id: true, email: true, name: true } },
      },
      orderBy: { bookingDate: "desc" } as any,
      take: 20,
    });

    if (bookingsWithoutPromoter.length === 0) {
      console.log(
        "ℹ️  All bookings already have promoter attribution. Nothing to do."
      );
      process.exit(0);
    }

    console.log(
      `📋 Found ${bookingsWithoutPromoter.length} bookings without promoter`
    );

    // 3. Assign promoters to a subset (round-robin)
    let updated = 0;
    for (let i = 0; i < Math.min(bookingsWithoutPromoter.length, 12); i++) {
      const booking = bookingsWithoutPromoter[i];
      const promoter = promoters[i % promoters.length];
      const tier = promoter.tier;
      const tierCfg = TIER_SPLITS[tier] ?? TIER_SPLITS.STARTER;

      const totalAmount = Number(booking.totalAmount);
      const commissionPool = Math.round(totalAmount * POOL_PCT * 100) / 100;
      const promoterEarning = Math.round(
        commissionPool * tierCfg.promoterPct * 100
      ) / 100;
      const platformPassive = Math.round(
        commissionPool * tierCfg.platformPct * 100
      ) / 100;
      const platformFee = Math.round(totalAmount * PLATFORM_FEE_PCT * 100) / 100;
      const totalPlatformRevenue = platformFee + platformPassive;

      await db.booking.update({
        where: { id: booking.id } as any,
        data: {
          promoterId: promoter.id,
          promoterReferralCode: promoter.referralCode,
          promoterEarning,
          platformPassive,
          platformFee,
          totalPlatformRevenue,
        } as any,
      });

      updated++;
      console.log(
        `   ✅ ${booking.bookingNumber} → ${promoter.referralCode} (${promoter.user?.name})`
      );
    }

    // 4. Create PromoterCommission records for updated bookings
    for (let i = 0; i < updated; i++) {
      const booking = bookingsWithoutPromoter[i];
      const promoter = promoters[i % promoters.length];
      const tierCfg = TIER_SPLITS[promoter.tier] ?? TIER_SPLITS.STARTER;
      const commissionPool = Number(booking.totalAmount) * POOL_PCT;
      const promoterEarning = commissionPool * tierCfg.promoterPct;
      const platformPassive = commissionPool * tierCfg.platformPct;

      const exists = await db.promoterCommission.findFirst({
        where: { bookingId: { equals: booking.id } } as any,
      });
      if (exists) continue;

      await db.promoterCommission.create({
        data: {
          promoterId: promoter.id,
          bookingId: booking.id,
          bookingAmount: booking.totalAmount,
          poolRate: POOL_PCT,
          commissionPool,
          promoterTier: promoter.tier,
          promoterSharePct: tierCfg.promoterPct,
          platformSharePct: tierCfg.platformPct,
          promoterEarning,
          platformPassive,
          currency: booking.currency,
          paymentRail: "STRIPE_CARD",
          status: "CREDITED",
          creditedAt: new Date(),
        } as any,
      });
    }
    console.log(`\n✅ Created PromoterCommission records for ${updated} bookings`);

    console.log("\n🎉 Seed complete!");
    console.log("\n📌 Promo codes for users to nominate promoters:");
    for (const p of promoters) {
      console.log(`   ${p.referralCode} — ${p.user?.name ?? "Promoter"} (${p.tier})`);
    }
  } catch (err) {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  }
}

main();
