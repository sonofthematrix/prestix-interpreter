#!/usr/bin/env tsx

/**
 * Check Existing Data Script
 *
 * Inspects current database state to understand dependencies for event seeding
 */

import 'dotenv/config';
import { createClient } from '../src/lib/db';

// System user for database operations (elevated privileges for seeding)
const systemUser = {
  id: 'system',
  email: 'system@TKNZN.pro',
  role: 'ADMIN' as const,
  name: 'System Admin'
};

const db = createClient(systemUser);

async function checkExistingData() {
  console.log('🔍 Checking existing data for event seeding...\n');

  // Check venues
  const venues = await db.venueProfile.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      city: true,
      venueType: true,
      userId: true,
      _count: {
        select: {
          events: true,
          eventPromoters: true
        }
      }
    }
  });

  console.log(`🏢 Found ${venues.length} venue profiles:`);
  venues.forEach(venue => {
    console.log(`  - ${venue.name} (${venue.slug}) - ${venue.status} - ${venue._count.events} events`);
  });

  // Check promoters
  const promoters = await db.promoterProfile.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true
        }
      },
      eventAssignments: {
        select: {
          id: true
        }
      },
      venuePerformances: {
        select: {
          id: true
        }
      }
    }
  });

  console.log(`\n🎯 Found ${promoters.length} promoter profiles:`);
  promoters.forEach(promoter => {
    console.log(`  - ${promoter.user.name} (${promoter.user.email}) - ${promoter.status}/${promoter.tier} - ${promoter.eventAssignments.length} event assignments`);
  });

  // Check members for promoter preferences
  const members = await db.memberProfile.findMany({
    select: {
      id: true,
      userId: true,
      _count: {
        select: {
          promoterPreferences: true
        }
      }
    },
    take: 10
  });

  console.log(`\n👥 Found ${members.length} member profiles (showing first 10):`);
  members.forEach(member => {
    console.log(`  - ${member.id} - ${member._count.promoterPreferences} promoter preferences`);
  });

  // Check existing events
  const existingEvents = await db.venueEvent.findMany({
    select: {
      id: true,
      name: true,
      venueId: true,
      startDateTime: true,
      status: true,
      _count: {
        select: {
          promoters: true,
          preferences: true
        }
      }
    },
    orderBy: {
      startDateTime: 'asc'
    }
  });

  console.log(`\n📅 Found ${existingEvents.length} existing events:`);
  existingEvents.forEach(event => {
    console.log(`  - ${event.name} (${event.startDateTime.toISOString()}) - ${event.status} - ${event._count.promoters} promoters`);
  });

  console.log('\n✅ Data inspection complete!');
}

checkExistingData().catch(console.error).finally(() => process.exit(0));