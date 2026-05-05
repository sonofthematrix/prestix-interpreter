#!/usr/bin/env tsx
/**
 * Seed Party Girl Profiles Across Multiple Venues
 *
 * This script seeds the database with:
 * - Party girl profiles with realistic data
 * - Multiple venue assignments (working across venues)
 * - Availability schedules
 * - Profile photos
 * - Host earnings records
 * - Performance metrics
 *
 * Uses ZenStack v3 createClient with system user (elevated privileges for seeding)
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

// Party Girl Profile Data
const PARTY_GIRL_PROFILES = [
  {
    displayName: 'Sophia Chen',
    bio: 'Professional host with 3+ years experience in high-end venues. Fluent in English, Mandarin, and Cantonese. Specializing in VIP table service and event coordination.',
    age: 26,
    nationality: 'Australian',
    languages: ['English', 'Mandarin', 'Cantonese'],
    profilePhoto: '/images/party-girls/sophia-chen.jpg',
    hourlyRate: 150.00,
    currency: 'AUD',
    minimumHours: 3,
    services: ['VIP Hosting', 'Table Service', 'Event Coordination', 'Bottle Service'],
    verificationStatus: 'VERIFIED' as const,
    idVerified: true,
    photoVerified: true,
    rating: 4.85,
    totalReviews: 127,
    totalBookings: 245,
    completionRate: 98.5,
    isActive: true,
    acceptsLastMinute: true,
    advanceBookingDays: 14,
  },
  {
    displayName: 'Isabella Martinez',
    bio: 'Experienced nightlife professional with a passion for creating unforgettable experiences. Specializing in dance parties and mixology assistance.',
    age: 24,
    nationality: 'Spanish',
    languages: ['English', 'Spanish', 'Italian'],
    profilePhoto: '/images/party-girls/isabella-martinez.jpg',
    hourlyRate: 120.00,
    currency: 'AUD',
    minimumHours: 2,
    services: ['Dance Partner', 'Mixology Assistant', 'VIP Hosting', 'Event Photography'],
    verificationStatus: 'VERIFIED' as const,
    idVerified: true,
    photoVerified: true,
    rating: 4.72,
    totalReviews: 89,
    totalBookings: 178,
    completionRate: 96.8,
    isActive: true,
    acceptsLastMinute: false,
    advanceBookingDays: 7,
  },
  {
    displayName: 'Yuki Tanaka',
    bio: 'Sophisticated host with expertise in Japanese hospitality culture. Perfect for corporate events and high-profile gatherings.',
    age: 28,
    nationality: 'Japanese',
    languages: ['English', 'Japanese', 'Korean'],
    profilePhoto: '/images/party-girls/yuki-tanaka.jpg',
    hourlyRate: 180.00,
    currency: 'AUD',
    minimumHours: 4,
    services: ['Corporate Hosting', 'VIP Concierge', 'Cultural Translation', 'Premium Service'],
    verificationStatus: 'VERIFIED' as const,
    idVerified: true,
    photoVerified: true,
    rating: 4.93,
    totalReviews: 156,
    totalBookings: 312,
    completionRate: 99.2,
    isActive: true,
    acceptsLastMinute: false,
    advanceBookingDays: 21,
  },
  {
    displayName: 'Emma Thompson',
    bio: 'Dynamic and energetic host specializing in beach club events and outdoor parties. Expert in creating fun, relaxed atmospheres.',
    age: 23,
    nationality: 'Australian',
    languages: ['English', 'French'],
    profilePhoto: '/images/party-girls/emma-thompson.jpg',
    hourlyRate: 110.00,
    currency: 'AUD',
    minimumHours: 2,
    services: ['Beach Events', 'Outdoor Hosting', 'Social Media Content', 'Group Coordination'],
    verificationStatus: 'VERIFIED' as const,
    idVerified: true,
    photoVerified: true,
    rating: 4.68,
    totalReviews: 73,
    totalBookings: 142,
    completionRate: 95.3,
    isActive: true,
    acceptsLastMinute: true,
    advanceBookingDays: 5,
  },
  {
    displayName: 'Aria Patel',
    bio: 'Multilingual host with extensive experience in luxury venues. Specializing in international clientele and cultural bridge-building.',
    age: 27,
    nationality: 'Indian',
    languages: ['English', 'Hindi', 'Arabic', 'French'],
    profilePhoto: '/images/party-girls/aria-patel.jpg',
    hourlyRate: 165.00,
    currency: 'AUD',
    minimumHours: 3,
    services: ['International Relations', 'VIP Hosting', 'Cultural Liaison', 'Premium Events'],
    verificationStatus: 'VERIFIED' as const,
    idVerified: true,
    photoVerified: true,
    rating: 4.88,
    totalReviews: 134,
    totalBookings: 267,
    completionRate: 97.9,
    isActive: true,
    acceptsLastMinute: false,
    advanceBookingDays: 10,
  },
];

// Photo collections for each party girl
const PHOTO_COLLECTIONS = [
  [
    '/images/party-girls/sophia-chen-1.jpg',
    '/images/party-girls/sophia-chen-2.jpg',
    '/images/party-girls/sophia-chen-3.jpg',
  ],
  [
    '/images/party-girls/isabella-martinez-1.jpg',
    '/images/party-girls/isabella-martinez-2.jpg',
    '/images/party-girls/isabella-martinez-3.jpg',
  ],
  [
    '/images/party-girls/yuki-tanaka-1.jpg',
    '/images/party-girls/yuki-tanaka-2.jpg',
    '/images/party-girls/yuki-tanaka-3.jpg',
  ],
  [
    '/images/party-girls/emma-thompson-1.jpg',
    '/images/party-girls/emma-thompson-2.jpg',
    '/images/party-girls/emma-thompson-3.jpg',
  ],
  [
    '/images/party-girls/aria-patel-1.jpg',
    '/images/party-girls/aria-patel-2.jpg',
    '/images/party-girls/aria-patel-3.jpg',
  ],
];

async function main() {
  console.log('👯 Starting Party Girl Multi-Venue Seeding...\n');

  try {
    // ========================================
    // STEP 1: VERIFY USERS EXIST
    // ========================================
    console.log('👥 Step 1: Verifying users exist...');

    let users = await db.user.findMany({
      take: 10,
      where: {
        OR: [
          { email: { contains: '@tokenizin.com' } },
          { email: { contains: '@example.com' } },
        ],
      } as any,
    });

    if (users.length < 5) {
      console.log('⚠️  Insufficient users found. Creating party girl users...');

      const partyGirlUsers = PARTY_GIRL_PROFILES.map((profile, index) => ({
        email: `${profile.displayName.toLowerCase().replace(' ', '.')}@tokenizin.com`,
        name: profile.displayName,
        role: 'HOST',
        authMethod: 'email',
        status: 'ACTIVE',
      }));

      for (const userData of partyGirlUsers) {
        await db.user.upsert({
          where: { email: userData.email as unknown as undefined },
          update: {},
          create: userData as any,
        });
      }

      // Re-fetch users
      users = await db.user.findMany({
        where: {
          email: { in: partyGirlUsers.map(u => u.email) } as any,
        },
      });
    }

    console.log(`✅ Found ${users.length} users\n`);

    // ========================================
    // STEP 2: GET OR CREATE VENUE PROFILES
    // ========================================
    console.log('🏢 Step 2: Loading venue profiles...');

    let venueProfiles = await db.venueProfile.findMany({
      take: 10,
    });

    if (venueProfiles.length === 0) {
      console.log('⚠️  No venues found. Creating default venues...');

      const defaultVenues = [
        {
          userId: users[0].id,
          businessName: 'The Golden Tiger',
          businessType: 'Nightclub',
          description: 'Premier nightclub featuring international DJs and VIP bottle service.',
          tagline: 'Where Legends Are Made',
          capacity: 500,
          addressLine1: '123 Collins Street',
          city: 'Melbourne',
          state: 'VIC',
          country: 'Australia',
          postalCode: '3000',
          phone: '+61 3 9000 1234',
          email: 'info@goldentiger.com.au',
          website: 'https://goldentiger.com.au',
          status: 'VERIFIED',
          operatingHours: {
            Thursday: { open: '20:00', close: '03:00' },
            Friday: { open: '20:00', close: '04:00' },
            Saturday: { open: '20:00', close: '04:00' },
          },
        },
        {
          userId: users[1 % users.length].id,
          businessName: 'Rooftop 88',
          businessType: 'Bar',
          description: 'Sophisticated rooftop bar with panoramic city views.',
          tagline: 'Melbourne Above The Clouds',
          capacity: 200,
          addressLine1: '456 Swanston Street',
          city: 'Melbourne',
          state: 'VIC',
          country: 'Australia',
          postalCode: '3000',
          phone: '+61 3 9000 5678',
          email: 'reservations@rooftop88.com.au',
          website: 'https://rooftop88.com.au',
          status: 'VERIFIED',
          operatingHours: {
            Wednesday: { open: '17:00', close: '23:00' },
            Thursday: { open: '17:00', close: '23:00' },
            Friday: { open: '17:00', close: '01:00' },
            Saturday: { open: '17:00', close: '01:00' },
          },
        },
        {
          userId: users[2 % users.length].id,
          businessName: 'Ocean Beach Club',
          businessType: 'Beach Club',
          description: 'Exclusive beach club with cabanas and infinity pool.',
          tagline: 'Paradise By The Sea',
          capacity: 300,
          addressLine1: '789 Beach Road',
          city: 'St Kilda',
          state: 'VIC',
          country: 'Australia',
          postalCode: '3182',
          phone: '+61 3 9000 9876',
          email: 'bookings@oceanbeachclub.com.au',
          website: 'https://oceanbeachclub.com.au',
          status: 'VERIFIED',
          operatingHours: {
            Friday: { open: '12:00', close: '23:00' },
            Saturday: { open: '12:00', close: '23:00' },
            Sunday: { open: '12:00', close: '22:00' },
          },
        },
      ];

      for (const venueData of defaultVenues) {
        const venue = await db.venueProfile.create({
          data: venueData as any,
        });
        venueProfiles.push(venue);
        console.log(`✅ Created venue: ${venue.businessName}`);
      }
    }

    console.log(`✅ Found ${venueProfiles.length} venues\n`);

    // ========================================
    // STEP 3: CREATE PARTY GIRL PROFILES
    // ========================================
    console.log('💃 Step 3: Creating party girl profiles...');

    const partyGirlProfiles: any[] = [];

    for (let i = 0; i < PARTY_GIRL_PROFILES.length && i < users.length; i++) {
      const profileData = PARTY_GIRL_PROFILES[i];
      const user = users[i];

      const profile = await db.partyGirlProfile.upsert({
        where: { userId: user.id as unknown as undefined },
        update: {},
        create: {
          userId: user.id,
          ...profileData,
          verifiedAt: new Date().toISOString(),
        } as any,
      });

      partyGirlProfiles.push(profile);
      console.log(`✅ Created profile: ${profile.displayName}`);
    }

    // ========================================
    // STEP 4: ADD PROFILE PHOTOS
    // ========================================
    console.log('\n📸 Step 4: Adding profile photos...');

    for (let i = 0; i < partyGirlProfiles.length; i++) {
      const profile = partyGirlProfiles[i];
      const photoUrls = PHOTO_COLLECTIONS[i];

      for (const photoUrl of photoUrls) {
        await db.partyGirlPhoto.create({
          data: {
            profileId: profile.id,
            url: photoUrl,
            sortOrder: photoUrls.indexOf(photoUrl),
            isVerified: true,
            verifiedAt: new Date().toISOString() as any,
            isProfilePhoto: photoUrls.indexOf(photoUrl) === 0,
          } as any,
        });
      }

      console.log(`✅ Added ${photoUrls.length} photos for ${profile.displayName}`);
    }

    // ========================================
    // STEP 5: CREATE VENUE ASSIGNMENTS (MULTI-VENUE)
    // ========================================
    console.log('\n🏢 Step 5: Creating venue assignments (multi-venue)...');

    const venueAssignments: any[] = [];

    // Assign each party girl to multiple venues
    for (const profile of partyGirlProfiles) {
      // Assign to 2-3 random venues
      const numVenues = Math.floor(Math.random() * 2) + 2; // 2-3 venues
      const shuffledVenues = [...venueProfiles].sort(() => Math.random() - 0.5);
      const assignedVenues = shuffledVenues.slice(0, numVenues);

      for (const venue of assignedVenues) {
        // Use upsert to handle re-runs (avoid duplicate key errors)
        const assignment = await db.venueHostAssignment.upsert({
          where: {
            venueId_hostId: {
              venueId: venue.id,
              hostId: profile.id,
            },
          } as any,
          create: {
            venueId: venue.id,
            hostId: profile.id,
            venueCommission: 0.20, // 20% commission to venue
            isActive: true,
          } as any,
          update: {
            isActive: true,
            venueCommission: 0.20,
          } as any,
        });

        venueAssignments.push(assignment);
        console.log(`✅ Assigned ${profile.displayName} to ${venue.businessName}`);
      }
    }

    // ========================================
    // STEP 6: CREATE AVAILABILITY SCHEDULES
    // ========================================
    console.log('\n📅 Step 6: Creating availability schedules...');

    const availabilityRecords: any[] = [];

    for (const profile of partyGirlProfiles) {
      // Create availability for next 30 days
      const today = new Date();
      
      for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
        const date = new Date(today);
        date.setDate(today.getDate() + dayOffset);
        
        // Skip some random days to make it realistic
        if (Math.random() > 0.7) continue;

        // Select ONE time slot per day (schema has unique constraint on profileId+date)
        const timeSlots = [
          { start: '18:00', end: '22:00' },
          { start: '22:00', end: '02:00' },
          { start: '14:00', end: '18:00' },
        ];

        const selectedSlot = timeSlots[Math.floor(Math.random() * timeSlots.length)];

        // Randomly assign to one of the party girl's venues
        const profileAssignments = venueAssignments.filter(a => a.hostId === profile.id);
        const randomAssignment = profileAssignments[Math.floor(Math.random() * profileAssignments.length)];

        const availability = await db.partyGirlAvailability.upsert({
          where: {
            profileId_date: {
              profileId: profile.id,
              date: date.toISOString() as any,
            }
          } as any,
          create: {
            profileId: profile.id,
            date: date.toISOString() as any,
            status: 'AVAILABLE',
            startTime: selectedSlot.start,
            endTime: selectedSlot.end,
            preferredVenueId: randomAssignment?.venueId || null,
          } as any,
          update: {
            status: 'AVAILABLE',
            startTime: selectedSlot.start,
            endTime: selectedSlot.end,
            preferredVenueId: randomAssignment?.venueId || null,
          } as any,
        });

        availabilityRecords.push(availability);
      }

      console.log(`✅ Created availability schedule for ${profile.displayName}`);
    }

    // ========================================
    // STEP 7: CREATE SAMPLE EARNINGS RECORDS
    // ========================================
    console.log('\n💰 Step 7: Creating sample earnings records...');

    const earningsRecords: any[] = [];

    for (const profile of partyGirlProfiles) {
      // Create 5-10 earnings records for past bookings
      const numEarnings = Math.floor(Math.random() * 6) + 5;

      for (let i = 0; i < numEarnings; i++) {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - Math.floor(Math.random() * 60));

        const hours = Math.floor(Math.random() * 4) + 2; // 2-6 hours
        const grossAmount = parseFloat(profile.hourlyRate.toString()) * hours;
        const venueCommission = grossAmount * 0.20; // 20% to venue
        const platformFee = grossAmount * 0.10; // 10% platform fee
        const netAmount = grossAmount - venueCommission - platformFee;

        const earnings = await db.hostEarnings.create({
          data: {
            hostId: profile.id,
            hostBookingId: `BOOKING-${Date.now()}-${i}`, // Mock booking ID
            grossAmount: grossAmount,
            venueCommission: venueCommission,
            platformFee: platformFee,
            netEarnings: netAmount,
            status: Math.random() > 0.5 ? 'CREDITED' : 'PENDING',
            creditedAt: Math.random() > 0.5 ? pastDate.toISOString() as any : null,
          } as any,
        });

        earningsRecords.push(earnings);
      }

      console.log(`✅ Created ${numEarnings} earnings records for ${profile.displayName}`);
    }

    // ========================================
    // SUMMARY
    // ========================================
    console.log('\n✅ Party Girl Multi-Venue Seeding Complete!\n');
    console.log('📊 Summary:');
    console.log(`   Party Girls:      ${partyGirlProfiles.length}`);
    console.log(`   Photos:           ${partyGirlProfiles.length * 3}`);
    console.log(`   Venues:           ${venueProfiles.length}`);
    console.log(`   Venue Assignments: ${venueAssignments.length}`);
    console.log(`   Availability:     ${availabilityRecords.length}`);
    console.log(`   Earnings Records: ${earningsRecords.length}`);
    console.log('');
    console.log('🎯 Key Features:');
    console.log('   • Each party girl works at 2-3 venues');
    console.log('   • 30-day availability schedules');
    console.log('   • Verified profiles with photos');
    console.log('   • Historical earnings records');
    console.log('   • Realistic commission splits');
    console.log('');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
