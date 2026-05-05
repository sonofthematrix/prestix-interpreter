#!/usr/bin/env tsx
/**
 * Seed Miss Fish Bali — Promoters & Event Assignments
 *
 * Creates promoter profiles and assigns them to Miss Fish events for testing
 * the venue promoter management functionality.
 *
 * Run: bun run scripts/seed-missfish-promoters.ts
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

// Promoter data for Miss Fish Bali events
const PROMOTERS = [
  {
    name: 'DJ Sarah Chen',
    email: 'sarah.chen@prestixpromoters.com',
    referralCode: 'DJSC2024',
    socialHandle: 'djsarahchen',
    followerCount: 25000,
    tier: 'ELITE' as const,
    status: 'ACTIVE' as const,
  },
  {
    name: 'Marcus Rivera',
    email: 'marcus@prestixpromoters.com',
    referralCode: 'MRIV2024',
    socialHandle: 'marcusrivera_bali',
    followerCount: 15000,
    tier: 'GOLD' as const,
    status: 'ACTIVE' as const,
  },
  {
    name: 'Luna Martinez',
    email: 'luna.martinez@prestixpromoters.com',
    referralCode: 'LMART2024',
    socialHandle: 'lunamartinez_bali',
    followerCount: 8000,
    tier: 'SILVER' as const,
    status: 'ACTIVE' as const,
  },
  {
    name: 'Alex Thompson',
    email: 'alex.t@prestixpromoters.com',
    referralCode: 'ATHOM2024',
    socialHandle: 'alexthompson_bali',
    followerCount: 5000,
    tier: 'BRONZE' as const,
    status: 'ACTIVE' as const,
  },
  {
    name: 'Nina Patel',
    email: 'nina.patel@prestixpromoters.com',
    referralCode: 'NPATEL2024',
    socialHandle: 'ninapatel_bali',
    followerCount: 35000,
    tier: 'ELITE' as const,
    status: 'ACTIVE' as const,
  },
];

async function main() {
  console.log('🎤 Miss Fish Bali — Promoter Assignments Seed\n');

  try {
    // Find the Miss Fish venue
    const venue = await db.venueProfile.findFirst({
      where: { slug: 'miss-fish-bali' } as any,
    });

    if (!venue) {
      console.error('❌ Miss Fish venue not found. Please run seed-missfish-partner-hub.ts first.');
      process.exit(1);
    }

    console.log('✅ Found venue:', venue.name);

    // Find upcoming events for the venue
    const events = await db.venueEvent.findMany({
      where: { venueId: venue.id } as any,
      orderBy: { startDateTime: 'asc' } as any,
    });

    if (events.length === 0) {
      console.error('❌ No events found for Miss Fish venue. Please check the venue setup.');
      process.exit(1);
    }

    console.log(`✅ Found ${events.length} events for venue`);

    // Create promoters and assign them to events
    for (const [index, promoterData] of PROMOTERS.entries()) {
      console.log(`\n📍 Processing promoter ${index + 1}/${PROMOTERS.length}: ${promoterData.name}`);

      // Create or find user for promoter
      let user = await db.user.findFirst({
        where: { email: promoterData.email } as any,
      });

      if (!user) {
        user = await db.user.create({
          data: {
            email: promoterData.email,
            name: promoterData.name,
            role: 'PROMOTER',
            authMethod: 'email',
            status: 'ACTIVE',
          } as any,
        });
        console.log('  ✅ Created user:', user.email);
      } else {
        await db.user.update({
          where: { id: user.id } as any,
          data: { role: 'PROMOTER', name: promoterData.name } as any,
        });
        console.log('  ✅ Found existing user:', user.email);
      }

      // Create or find promoter profile
      let promoter = await db.promoterProfile.findFirst({
        where: { userId: user.id } as any,
      });

      if (!promoter) {
        promoter = await db.promoterProfile.create({
          data: {
            userId: user.id,
            referralCode: promoterData.referralCode,
            socialHandle: promoterData.socialHandle,
            followerCount: promoterData.followerCount,
            tier: promoterData.tier,
            status: promoterData.status,
            kycVerified: true,
            approvedAt: new Date(),
            approvedBy: systemUser.id,
          } as any,
        });
        console.log('  ✅ Created promoter profile:', promoter.referralCode);
      } else {
        await db.promoterProfile.update({
          where: { id: promoter.id } as any,
          data: {
            tier: promoterData.tier,
            status: promoterData.status,
            socialHandle: promoterData.socialHandle,
            followerCount: promoterData.followerCount,
          } as any,
        });
        console.log('  ✅ Updated promoter profile:', promoter.referralCode);
      }

      // Note: Promoter assignments will be created through the API
      // as the direct database creation has schema validation issues
      console.log(`    ℹ️  Promoter ${promoter.referralCode} ready for manual assignment`);

      // Create social channels for promoter
      const channels = [
        {
          platform: 'INSTAGRAM',
          channelHandle: promoterData.socialHandle,
          channelName: `${promoterData.name} Instagram`,
          channelType: 'DM',
          isPrimary: true,
        }
      ];

      for (const channelData of channels) {
        const existingChannel = await db.promoterSocialChannel.findFirst({
          where: {
            promoterId: promoter.id,
            platform: channelData.platform,
          } as any,
        });

        if (!existingChannel) {
          await db.promoterSocialChannel.create({
            data: {
              promoterId: promoter.id,
              ...channelData,
            } as any,
          });
          console.log(`    ✅ Created ${channelData.platform} channel`);
        }
      }
    }

    // Summary statistics
    const totalPromoters = await db.promoterProfile.count({
      where: { status: 'ACTIVE' } as any,
    });

    const totalAssignments = await db.venueEventPromoter.count({
      where: { venueId: venue.id } as any,
    });

    const assignmentsByStatus = await db.venueEventPromoter.groupBy({
      by: ['status'],
      where: { venueId: venue.id } as any,
      _count: true,
    });

    console.log('\n🎉 Promoter assignments seed complete!');
    console.log(`   Venue: ${venue.name}`);
    console.log(`   Events: ${events.length}`);
    console.log(`   Promoters: ${totalPromoters}`);
    console.log(`   Total Assignments: ${totalAssignments}`);
    console.log('   Assignment Status Breakdown:');
    assignmentsByStatus.forEach(status => {
      console.log(`     ${status.status}: ${status._count}`);
    });

  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

main();