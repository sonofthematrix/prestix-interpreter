#!/usr/bin/env tsx

/**
 * Seed Public Lifestyle Navigation
 * Adds navigation items for public-facing lifestyle pages (separate from admin entertainment)
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
  category: 'LIFESTYLE';
  description: string;
  parentId?: string;
  sortOrder: number;
  authRequired?: boolean;
}

const lifestyleNavItems: NavItem[] = [
  // LIFESTYLE TOP-LEVEL GROUP (Public-facing)
  {
    id: 'lifestyle-group',
    title: 'Lifestyle',
    href: '/rentals',
    icon: 'sparkles',
    category: 'LIFESTYLE',
    description: 'Premium venues, events and entertainment',
    sortOrder: 200,
    authRequired: false,
  },

  // VENUES & EVENTS (Public)
  {
    id: 'lifestyle-venues',
    title: 'Venues',
    href: '/rentals/venues',
    icon: 'building',
    category: 'LIFESTYLE',
    description: 'Discover premium venues and locations',
    parentId: 'lifestyle-group',
    sortOrder: 210,
    authRequired: false,
  },
  {
    id: 'lifestyle-events',
    title: 'Events',
    href: '/rentals/events',
    icon: 'calendar',
    category: 'LIFESTYLE',
    description: 'Browse upcoming events and experiences',
    parentId: 'lifestyle-group',
    sortOrder: 211,
    authRequired: false,
  },
  {
    id: 'lifestyle-tickets',
    title: 'Tickets',
    href: '/rentals/tickets',
    icon: 'ticket',
    category: 'LIFESTYLE',
    description: 'Purchase tickets and passes',
    parentId: 'lifestyle-group',
    sortOrder: 212,
    authRequired: false,
  },

  // MY BOOKINGS (Requires Auth)
  {
    id: 'lifestyle-my-bookings',
    title: 'My Bookings',
    href: '/rentals/my-bookings',
    icon: 'user-check',
    category: 'LIFESTYLE',
    description: 'View and manage your bookings',
    parentId: 'lifestyle-group',
    sortOrder: 220,
    authRequired: true,
  },
];

async function seedLifestyleNav() {
  console.log('🎭 Seeding Public Lifestyle Navigation...\n');

  const db = createClient(systemUser as any);

  try {
    // Check existing items
    const existing = await db.navigationItem.findMany({
      where: { category: 'LIFESTYLE' as any },
    });

    const existingIds = new Set(existing.map((item: any) => item.id));

    let createdCount = 0;
    let skippedCount = 0;

    for (const item of lifestyleNavItems) {
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
          authRequired: item.authRequired ?? false,
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
    console.log(`   📋 Total lifestyle items: ${lifestyleNavItems.length}`);

    // Verify the lifestyle group
    const lifestyleGroup = await db.navigationItem.findUnique({
      where: { id: 'lifestyle-group' as unknown as undefined },
      include: { children: true } as any,
    });

    if (lifestyleGroup) {
      console.log(
        `\n🎭 Lifestyle group has ${(lifestyleGroup.children as any[])?.length ?? 0} children`
      );
    }

    console.log('\n✅ Lifestyle navigation seeding completed!\n');
  } catch (error) {
    console.error('❌ Error seeding navigation:', error);
    throw error;
  }
}

seedLifestyleNav()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
