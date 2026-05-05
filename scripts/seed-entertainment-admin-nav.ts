#!/usr/bin/env tsx

/**
 * Seed Entertainment/Venue Admin Navigation
 * Adds navigation items for all venue/entertainment-related admin pages to the database
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

interface NavItem {
  id: string;
  title: string;
  href: string;
  icon: string;
  category: 'ADMIN';
  description: string;
  parentId?: string;
  sortOrder: number;
}

const entertainmentNavItems: NavItem[] = [
  // ENTERTAINMENT TOP-LEVEL GROUP
  {
    id: 'entertainment-group',
    title: 'Entertainment',
    href: '/admin/entertainment',
    icon: 'sparkles',
    category: 'ADMIN',
    description: 'Venue and entertainment management',
    sortOrder: 400,
  },

  // VENUE MANAGEMENT
  {
    id: 'venue-profile',
    title: 'Venue Profiles',
    href: '/admin/venueProfile',
    icon: 'building',
    category: 'ADMIN',
    description: 'Manage venue profiles and settings',
    parentId: 'entertainment-group',
    sortOrder: 410,
  },
  {
    id: 'venue-staff',
    title: 'Venue Staff',
    href: '/admin/venueStaff',
    icon: 'users',
    category: 'ADMIN',
    description: 'Manage venue staff members',
    parentId: 'entertainment-group',
    sortOrder: 411,
  },
  {
    id: 'venue-table',
    title: 'Venue Tables',
    href: '/admin/venueTable',
    icon: 'layout',
    category: 'ADMIN',
    description: 'Manage table configurations',
    parentId: 'entertainment-group',
    sortOrder: 412,
  },
  {
    id: 'venue-availability',
    title: 'Venue Availability',
    href: '/admin/venueAvailability',
    icon: 'calendar',
    category: 'ADMIN',
    description: 'Manage venue availability schedules',
    parentId: 'entertainment-group',
    sortOrder: 413,
  },
  {
    id: 'venue-table-availability',
    title: 'Table Availability',
    href: '/admin/venueTableAvailability',
    icon: 'calendar-check',
    category: 'ADMIN',
    description: 'Manage table booking availability',
    parentId: 'entertainment-group',
    sortOrder: 414,
  },

  // BOOKINGS & TICKETS
  {
    id: 'venue-booking',
    title: 'Venue Bookings',
    href: '/admin/venueBooking',
    icon: 'calendar-check',
    category: 'ADMIN',
    description: 'Manage venue bookings and reservations',
    parentId: 'entertainment-group',
    sortOrder: 420,
  },
  {
    id: 'venue-ticket',
    title: 'Venue Tickets',
    href: '/admin/venueTicket',
    icon: 'ticket',
    category: 'ADMIN',
    description: 'Manage venue tickets and passes',
    parentId: 'entertainment-group',
    sortOrder: 421,
  },
  {
    id: 'booking-dispute',
    title: 'Booking Disputes',
    href: '/admin/bookingDispute',
    icon: 'alert-circle',
    category: 'ADMIN',
    description: 'Handle booking disputes and issues',
    parentId: 'entertainment-group',
    sortOrder: 422,
  },
  {
    id: 'booking-payment',
    title: 'Booking Payments',
    href: '/admin/bookingPayment',
    icon: 'credit-card',
    category: 'ADMIN',
    description: 'Track booking payment transactions',
    parentId: 'entertainment-group',
    sortOrder: 423,
  },

  // HOST MANAGEMENT
  {
    id: 'host-booking',
    title: 'Host Bookings',
    href: '/admin/hostBooking',
    icon: 'user-check',
    category: 'ADMIN',
    description: 'Manage host booking assignments',
    parentId: 'entertainment-group',
    sortOrder: 430,
  },
  {
    id: 'venue-host-assignment',
    title: 'Host Assignments',
    href: '/admin/venueHostAssignment',
    icon: 'link',
    category: 'ADMIN',
    description: 'Assign hosts to venues',
    parentId: 'entertainment-group',
    sortOrder: 431,
  },
  {
    id: 'host-earnings',
    title: 'Host Earnings',
    href: '/admin/hostEarnings',
    icon: 'dollar-sign',
    category: 'ADMIN',
    description: 'Track host earnings and commissions',
    parentId: 'entertainment-group',
    sortOrder: 432,
  },
  {
    id: 'host-payout',
    title: 'Host Payouts',
    href: '/admin/hostPayout',
    icon: 'arrow-up-circle',
    category: 'ADMIN',
    description: 'Process host payments',
    parentId: 'entertainment-group',
    sortOrder: 433,
  },
  {
    id: 'host-review',
    title: 'Host Reviews',
    href: '/admin/hostReview',
    icon: 'star',
    category: 'ADMIN',
    description: 'Manage host reviews and ratings',
    parentId: 'entertainment-group',
    sortOrder: 434,
  },

  // PARTY GIRL PROFILES
  {
    id: 'party-girl-profile',
    title: 'Party Girl Profiles',
    href: '/admin/partyGirlProfile',
    icon: 'user',
    category: 'ADMIN',
    description: 'Manage party girl profiles',
    parentId: 'entertainment-group',
    sortOrder: 440,
  },
  {
    id: 'party-girl-photo',
    title: 'Party Girl Photos',
    href: '/admin/partyGirlPhoto',
    icon: 'image',
    category: 'ADMIN',
    description: 'Manage party girl photo galleries',
    parentId: 'entertainment-group',
    sortOrder: 441,
  },
  {
    id: 'party-girl-availability',
    title: 'Party Girl Availability',
    href: '/admin/partyGirlAvailability',
    icon: 'calendar',
    category: 'ADMIN',
    description: 'Manage availability schedules',
    parentId: 'entertainment-group',
    sortOrder: 442,
  },

  // PROMOTER MANAGEMENT
  {
    id: 'promoter-profile',
    title: 'Promoter Profiles',
    href: '/admin/promoterProfile',
    icon: 'megaphone',
    category: 'ADMIN',
    description: 'Manage promoter profiles',
    parentId: 'entertainment-group',
    sortOrder: 450,
  },
  {
    id: 'promoter-referral',
    title: 'Promoter Referrals',
    href: '/admin/promoterReferral',
    icon: 'user-plus',
    category: 'ADMIN',
    description: 'Track promoter referrals',
    parentId: 'entertainment-group',
    sortOrder: 451,
  },
  {
    id: 'promoter-commission',
    title: 'Promoter Commissions',
    href: '/admin/promoterCommission',
    icon: 'percent',
    category: 'ADMIN',
    description: 'Manage promoter commission structures',
    parentId: 'entertainment-group',
    sortOrder: 452,
  },
  {
    id: 'promoter-payout',
    title: 'Promoter Payouts',
    href: '/admin/promoterPayout',
    icon: 'arrow-up-circle',
    category: 'ADMIN',
    description: 'Process promoter payments',
    parentId: 'entertainment-group',
    sortOrder: 453,
  },
  {
    id: 'promoter-bonus',
    title: 'Promoter Bonuses',
    href: '/admin/promoterBonus',
    icon: 'gift',
    category: 'ADMIN',
    description: 'Manage performance bonuses',
    parentId: 'entertainment-group',
    sortOrder: 454,
  },
  {
    id: 'promoter-asset',
    title: 'Promoter Assets',
    href: '/admin/promoterAsset',
    icon: 'folder',
    category: 'ADMIN',
    description: 'Promoter marketing assets',
    parentId: 'entertainment-group',
    sortOrder: 455,
  },

  // MEMBER WALLETS
  {
    id: 'member-wallet',
    title: 'Member Wallets',
    href: '/admin/memberWallet',
    icon: 'wallet',
    category: 'ADMIN',
    description: 'Manage member wallet accounts',
    parentId: 'entertainment-group',
    sortOrder: 460,
  },
  {
    id: 'member-wallet-transaction',
    title: 'Wallet Transactions',
    href: '/admin/memberWalletTransaction',
    icon: 'repeat',
    category: 'ADMIN',
    description: 'Track wallet transactions',
    parentId: 'entertainment-group',
    sortOrder: 461,
  },

  // ANALYTICS & REVIEWS
  {
    id: 'venue-daily-metrics',
    title: 'Venue Metrics',
    href: '/admin/venueDailyMetrics',
    icon: 'trending-up',
    category: 'ADMIN',
    description: 'Daily venue performance metrics',
    parentId: 'entertainment-group',
    sortOrder: 470,
  },
  {
    id: 'promoter-daily-metrics',
    title: 'Promoter Metrics',
    href: '/admin/promoterDailyMetrics',
    icon: 'bar-chart',
    category: 'ADMIN',
    description: 'Daily promoter performance metrics',
    parentId: 'entertainment-group',
    sortOrder: 471,
  },
  {
    id: 'venue-review',
    title: 'Venue Reviews',
    href: '/admin/venueReview',
    icon: 'star',
    category: 'ADMIN',
    description: 'Manage venue reviews and ratings',
    parentId: 'entertainment-group',
    sortOrder: 472,
  },
  {
    id: 'venue-settlement',
    title: 'Venue Settlements',
    href: '/admin/venueSettlement',
    icon: 'file-check',
    category: 'ADMIN',
    description: 'Financial settlement records',
    parentId: 'entertainment-group',
    sortOrder: 473,
  },
];

async function seedEntertainmentNav() {
  console.log('🎭 Seeding Entertainment Admin Navigation...\n');

  const db = createClient(systemUser as any);

  try {
    // Check existing items
    const existing = await db.navigationItem.findMany({
      where: { category: 'ADMIN' as any },
    });

    const existingIds = new Set(existing.map((item: any) => item.id));

    let createdCount = 0;
    let skippedCount = 0;

    for (const item of entertainmentNavItems) {
      if (existingIds.has(item.id)) {
        console.log(`⏭️  Skipping ${item.title} (already exists)`);
        skippedCount++;
        continue;
      }

      console.log(`✅ Creating ${item.title} (${item.href})`);

      await db.navigationItem.create({
        data: {
          id: item.id,
          title: item.title,
          href: item.href,
          icon: item.icon,
          authRequired: true, // All admin pages require auth
          description: item.description,
          category: item.category,
          parentId: item.parentId || null,
          sortOrder: item.sortOrder,
          isActive: true,
        } as any,
      });

      createdCount++;
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Created: ${createdCount} navigation items`);
    console.log(`   ⏭️  Skipped: ${skippedCount} (already exist)`);
    console.log(`   📋 Total entertainment items: ${entertainmentNavItems.length}`);

    // Verify the entertainment group
    const entertainmentGroup = await db.navigationItem.findUnique({
      where: { id: 'entertainment-group' as unknown as undefined },
      include: { children: true } as any,
    });

    if (entertainmentGroup) {
      console.log(
        `\n🎭 Entertainment group has ${(entertainmentGroup.children as any[])?.length ?? 0} children`
      );
    }

    console.log('\n✅ Entertainment navigation seeding completed!\n');
  } catch (error) {
    console.error('❌ Error seeding navigation:', error);
    throw error;
  }
}

seedEntertainmentNav()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
