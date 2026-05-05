#!/usr/bin/env tsx

/**
 * Event Seeding Script - Next 2 Weeks
 *
 * Seeds comprehensive event ecosystem for the next 2 weeks including:
 * - Venue events with realistic data
 * - Promoter assignments to events
 * - Member promoter preferences
 * - Performance metrics and daily stats
 *
 * Uses ZenStack v3 createClient with system user (elevated privileges for seeding)
 */

import 'dotenv/config';
import { createClient } from '../src/lib/db';
import { addDays, addHours, setHours, setMinutes, format } from 'date-fns';

// System user for database operations (elevated privileges for seeding)
const systemUser = {
  id: 'system',
  email: 'system@TKNZN.pro',
  role: 'ADMIN' as const,
  name: 'System Admin'
};

const db = createClient(systemUser);

// Event templates with realistic data
const EVENT_TEMPLATES = [
  {
    name: "Friday Night Fever",
    description: "Ultimate nightlife experience with international DJs and premium cocktails",
    startTime: 21, // 9 PM
    duration: 6, // hours
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop"
  },
  {
    name: "Beach Club Sunset",
    description: "Rooftop party with ocean views, sunset cocktails, and live music",
    startTime: 17, // 5 PM
    duration: 8,
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop"
  },
  {
    name: "Latin Night Fever",
    description: "Salsa, bachata, and reggaeton with guest performers from South America",
    startTime: 22, // 10 PM
    duration: 5,
    imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop"
  },
  {
    name: "Pool Party Paradise",
    description: "Daytime pool party with DJ sets, water games, and tropical cocktails",
    startTime: 12, // Noon
    duration: 6,
    imageUrl: "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&h=600&fit=crop"
  },
  {
    name: "Electronic Underground",
    description: "Underground electronic music night with resident DJs and special guests",
    startTime: 23, // 11 PM
    duration: 7,
    imageUrl: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=800&h=600&fit=crop"
  },
  {
    name: "Jazz & Cocktails",
    description: "Intimate jazz session with live musicians and craft cocktails",
    startTime: 20, // 8 PM
    duration: 4,
    imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=600&fit=crop"
  },
  {
    name: "VIP Lounge Experience",
    description: "Exclusive VIP lounge with bottle service and celebrity sightings",
    startTime: 21, // 9 PM
    duration: 5,
    imageUrl: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=600&fit=crop"
  },
  {
    name: "Karaoke Night",
    description: "Fun karaoke night with prizes and themed drink specials",
    startTime: 19, // 7 PM
    duration: 4,
    imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop"
  },
  {
    name: "Live Band Showcase",
    description: "Local and international bands performing live with full sound system",
    startTime: 20, // 8 PM
    duration: 5,
    imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop"
  },
  {
    name: "Theme Party Extravaganza",
    description: "Costume party with amazing prizes and photo booth experiences",
    startTime: 21, // 9 PM
    duration: 6,
    imageUrl: "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?w=800&h=600&fit=crop"
  }
];

async function seedEventsNext2Weeks() {
  console.log('🎪 Starting comprehensive event seeding for next 2 weeks...\n');
  console.log('📍 Database:', process.env.DATABASE_URL?.substring(0, 50) + '...\n');

  // Get existing data
  const venue = await db.venueProfile.findFirst({
    where: { status: 'ACTIVE' }
  });

  if (!venue) {
    throw new Error('No active venue found. Please seed venues first.');
  }

  const promoters = await db.promoterProfile.findMany({
    where: { status: 'ACTIVE' },
    include: { user: true }
  });

  if (promoters.length === 0) {
    throw new Error('No active promoters found. Please seed promoters first.');
  }

  console.log(`🏢 Using venue: ${venue.name}`);
  console.log(`🎯 Using ${promoters.length} active promoters\n`);

  // Create some members for promoter preferences
  console.log('👥 Creating member users and profiles for promoter preferences...');
  const members = [];

  for (let i = 1; i <= 20; i++) {
    const email = `member${i}@prestix.vip`;
    let user = await db.user.findFirst({ where: { email: { equals: email } } as any });

    if (!user) {
      user = await db.user.create({
        data: {
          email,
          name: `Member ${i}`,
          role: 'MEMBER',
          status: 'ACTIVE',
          authMethod: 'email',
        } as any,
      });
    }

    // Create member profile if it doesn't exist
    let memberProfile = await db.memberProfile.findFirst({ where: { userId: { equals: user.id } } as any });

    if (!memberProfile) {
      memberProfile = await db.memberProfile.create({
        data: {
          userId: user.id,
          tier: ['BRONZE', 'SILVER', 'GOLD'][Math.floor(Math.random() * 3)] as any,
          loyaltyPoints: Math.floor(Math.random() * 1000),
          totalSpent: Math.floor(Math.random() * 5000),
        } as any,
      });
    }

    members.push(memberProfile);
  }

  console.log(`✅ Created ${members.length} member profiles\n`);

  // Generate events for next 14 days
  const events = [];
  const now = new Date();
  const startDate = addDays(now, 1); // Start from tomorrow
  const endDate = addDays(now, 14); // 14 days from now

  console.log(`📅 Generating events from ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);

  let eventCount = 0;
  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
    // Create 1-3 events per day
    const eventsPerDay = Math.floor(Math.random() * 3) + 1;

    for (let i = 0; i < eventsPerDay; i++) {
      const template = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];

      // Randomize start time slightly
      const startHour = template.startTime + (Math.random() - 0.5) * 2; // ±1 hour variation
      const startDateTime = setMinutes(setHours(date, Math.floor(startHour)), Math.floor(Math.random() * 60));

      const endDateTime = addHours(startDateTime, template.duration);

      const event = await db.venueEvent.create({
        data: {
          venueId: venue.id,
          name: template.name,
          description: template.description,
          startDateTime,
          endDateTime,
          status: Math.random() > 0.1 ? 'PUBLISHED' : 'DRAFT', // 90% published
          imageUrl: template.imageUrl
        }
      });

      events.push(event);
      eventCount++;
    }
  }

  console.log(`✅ Created ${eventCount} events\n`);

  // Assign promoters to events
  console.log('🎯 Assigning promoters to events...');
  const eventPromoters = [];

  for (const event of events) {
    // Assign 2-4 promoters per event
    const numPromoters = Math.floor(Math.random() * 3) + 2;
    const shuffledPromoters = [...promoters].sort(() => 0.5 - Math.random());
    const selectedPromoters = shuffledPromoters.slice(0, numPromoters);

    for (const promoter of selectedPromoters) {
      const eventPromoter = await db.venueEventPromoter.create({
        data: {
          venueId: venue.id,
          eventId: event.id,
          promoterId: promoter.id,
          status: Math.random() > 0.2 ? 'ACCEPTED' : 'NOMINATED', // 80% accepted
          nominatedBy: systemUser.id,
          acceptedAt: Math.random() > 0.2 ? new Date() : null
        }
      });
      eventPromoters.push(eventPromoter);
    }
  }

  console.log(`✅ Created ${eventPromoters.length} promoter-event assignments\n`);

  // Create promoter preferences for members
  console.log('🎲 Creating member promoter preferences...');
  const preferences = [];

  for (const member of members) {
    // Each member gets preferences for 3-5 random events
    const numEvents = Math.floor(Math.random() * 3) + 3;
    const shuffledEvents = [...events].sort(() => 0.5 - Math.random());
    const selectedEvents = shuffledEvents.slice(0, numEvents);

    for (const event of selectedEvents) {
      // Get promoters for this event
      const eventPromotersForEvent = eventPromoters.filter(ep => ep.eventId === event.id);
      if (eventPromotersForEvent.length < 2) continue;

      const shuffledEventPromoters = [...eventPromotersForEvent].sort(() => 0.5 - Math.random());
      const primary = shuffledEventPromoters[0];
      const challenger = shuffledEventPromoters[1];

      const preference = await db.memberPromoterPreference.create({
        data: {
          memberId: member.id,
          primaryPromoterId: primary.promoterId,
          challengerPromoterId: challenger.promoterId,
          bindingScope: 'EVENT_DATE',
          venueId: venue.id,
          eventId: event.id,
          scopeDate: event.startDateTime,
          status: Math.random() > 0.3 ? 'PENDING_CHOICE' : 'BOUND', // 70% pending
          boundPromoterId: Math.random() > 0.3 ? null : (Math.random() > 0.5 ? primary.promoterId : challenger.promoterId)
        }
      });
      preferences.push(preference);
    }
  }

  console.log(`✅ Created ${preferences.length} promoter preferences\n`);

  // Create promoter performance metrics
  console.log('📊 Creating promoter performance metrics...');
  const performances = [];

  for (const promoter of promoters) {
    const performance = await db.promoterVenuePerformance.upsert({
      where: {
        promoterId_venueId: {
          promoterId: promoter.id,
          venueId: venue.id
        }
      },
      update: {},
      create: {
        promoterId: promoter.id,
        venueId: venue.id,
        totalEventsAssigned: eventPromoters.filter(ep => ep.promoterId === promoter.id).length,
        totalEventsAttended: Math.floor(Math.random() * 10) + 5,
        totalRevenueGenerated: Math.floor(Math.random() * 5000) + 1000,
        averageRating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
        lastActiveAt: new Date()
      }
    });
    performances.push(performance);
  }

  console.log(`✅ Created ${performances.length} promoter performance records\n`);

  // Create daily metrics for the venue
  console.log('📈 Creating venue daily metrics...');
  const dailyMetrics = [];

  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
    const metric = await db.venueDailyMetrics.upsert({
      where: {
        venueId_date: {
          venueId: venue.id,
          date: date
        }
      },
      update: {},
      create: {
        venueId: venue.id,
        date,
        totalBookings: Math.floor(Math.random() * 50) + 10,
        totalRevenue: Math.floor(Math.random() * 20000) + 5000,
        totalAttendees: Math.floor(Math.random() * 200) + 50,
        averageRating: Math.floor(Math.random() * 15) / 10 + 4, // 4.0-5.5
        promoterCount: promoters.length
      }
    });
    dailyMetrics.push(metric);
  }

  console.log(`✅ Created ${dailyMetrics.length} daily venue metrics\n`);

  // Create promoter daily metrics
  console.log('📊 Creating promoter daily metrics...');
  let promoterDailyMetricsCount = 0;

  for (const promoter of promoters) {
    for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
      // Only create metrics for some days (simulating activity)
      if (Math.random() > 0.7) continue; // 30% chance of having metrics for a day

      const metric = await db.promoterDailyMetrics.upsert({
        where: {
          promoterId_date: {
            promoterId: promoter.id,
            date: date
          }
        },
        update: {},
        create: {
          promoterId: promoter.id,
          date,
          magicLinksSent: Math.floor(Math.random() * 20) + 5,
          referralsGenerated: Math.floor(Math.random() * 10) + 1,
          bookingsFromReferrals: Math.floor(Math.random() * 5),
          revenueGenerated: Math.floor(Math.random() * 500) + 50
        }
      });
      promoterDailyMetricsCount++;
    }
  }

  console.log(`✅ Created ${promoterDailyMetricsCount} promoter daily metrics\n`);

  // Summary
  console.log('🎉 Event seeding complete! Summary:');
  console.log(`   📅 Events: ${events.length}`);
  console.log(`   🎯 Event-Promoter Assignments: ${eventPromoters.length}`);
  console.log(`   👥 Members: ${members.length}`);
  console.log(`   🎲 Preferences: ${preferences.length}`);
  console.log(`   📊 Performance Records: ${performances.length}`);
  console.log(`   📈 Venue Daily Metrics: ${dailyMetrics.length}`);
  console.log(`   📊 Promoter Daily Metrics: ${promoterDailyMetricsCount}`);
  console.log('\n✅ All event-related data seeded successfully!');
}

seedEventsNext2Weeks().catch(console.error).finally(() => process.exit(0));