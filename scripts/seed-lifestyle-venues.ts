#!/usr/bin/env tsx
/**
 * Seed Lifestyle Venues, Tickets, and Bookings
 *
 * This script seeds the database with:
 * - Venue profiles (nightclubs, restaurants, bars)
 * - Venue tickets (events with pricing)
 * - Venue bookings (customer bookings for tickets)
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

async function main() {
  console.log('🎭 Starting Lifestyle Venues Seeding...\n');

  try {
    // ========================================
    // STEP 1: VERIFY USERS EXIST
    // ========================================
            console.log('👥 Step 1: Verifying users exist...');

            const users = await db.user.findMany({
              take: 5,
              where: {
                OR: [
                  { email: { contains: '@tokenizin.com' } },
                  { email: { contains: '@example.com' } },
                ],
              } as any,
            });

    if (users.length === 0) {
      console.log('⚠️  No users found. Creating test users...');

      const testUsers = [
        {
          email: 'member1@tokenizin.com',
          name: 'John Smith',
          role: 'CUSTOMER',
          authMethod: 'email',
          status: 'ACTIVE',
        },
        {
          email: 'member2@tokenizin.com',
          name: 'Sarah Johnson',
          role: 'CUSTOMER',
          authMethod: 'email',
          status: 'ACTIVE',
        },
        {
          email: 'member3@tokenizin.com',
          name: 'Michael Chen',
          role: 'CUSTOMER',
          authMethod: 'email',
          status: 'ACTIVE',
        },
      ];

              for (const userData of testUsers) {
                await db.user.upsert({
                  where: { email: userData.email as unknown as undefined },
                  update: {},
                  create: userData as any,
                });
              }

              // Re-fetch users
              const createdUsers = await db.user.findMany({
                where: {
                  email: { in: testUsers.map((u) => u.email) } as any,
                },
              });
      users.push(...createdUsers);
    }

    console.log(`✅ Found ${users.length} users\n`);

    // ========================================
    // STEP 2: CREATE VENUE PROFILES
    // ========================================
    console.log('🏢 Step 2: Creating venue profiles...');

    const venueProfiles: any[] = [];

                const venuesData = [
                  {
                    userId: users[0].id,
                    businessName: 'The Golden Tiger',
                    businessType: 'Nightclub',
                    description:
                      'Premier nightclub featuring international DJs and VIP bottle service. Experience luxury nightlife at its finest.',
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
                    gallery: [
                      '/images/venues/golden-tiger-1.jpg',
                      '/images/venues/golden-tiger-2.jpg',
                      '/images/venues/golden-tiger-3.jpg'
                    ],
                    dressCode: 'Smart Casual',
                    ageRestriction: 18,
                  },
                  {
                    userId: users[1].id,
                    businessName: 'Rooftop 88',
                    businessType: 'Bar',
                    description:
                      'Sophisticated rooftop bar with panoramic city views, craft cocktails, and live acoustic music every weekend.',
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
                      Sunday: { open: '17:00', close: '22:00' },
                    },
                    gallery: [
                      '/images/venues/rooftop88-1.jpg',
                      '/images/venues/rooftop88-2.jpg',
                      '/images/venues/rooftop88-3.jpg'
                    ],
                    dressCode: 'Smart Casual',
                    ageRestriction: 18,
                  },
                  {
                    userId: users[2].id,
                    businessName: 'Ocean Beach Club',
                    businessType: 'Beach Club',
                    description:
                      'Exclusive beach club with cabanas, infinity pool, and Mediterranean cuisine. Perfect for day-to-night experiences.',
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
                    gallery: [
                      '/images/venues/ocean-beach-1.jpg',
                      '/images/venues/ocean-beach-2.jpg',
                      '/images/venues/ocean-beach-3.jpg'
                    ],
                    dressCode: 'Resort Casual',
                    ageRestriction: 21,
                  },
                ];

                for (const venueData of venuesData) {
                  const venue = await db.venueProfile.upsert({
                    where: { userId: venueData.userId as unknown as undefined },
                    update: {},
                    create: venueData as any,
                  });
                  venueProfiles.push(venue);
                  console.log(`✅ Created venue: ${venue.businessName}`);
                }

    // ========================================
    // STEP 2.5: CREATE VENUE TABLES
    // ========================================
    console.log('\n🪑 Step 2.5: Creating venue tables...');

    const venueTables: any[] = [];

    for (const venue of venueProfiles) {
      const tablesData = [
        {
          venueId: venue.id,
          name: 'VIP Booth 1',
          description: 'Premium booth with bottle service and dedicated host',
          tableNumber: 'VB1',
          minCapacity: 2,
          maxCapacity: 6,
          price: 500,
          currency: 'AUD',
          minimumSpend: 800,
          inclusions: ['Bottle service', 'Mixers', 'VIP Entry', 'Dedicated host'],
          location: 'Main Floor',
          features: ['View', 'Private', 'Bottle Service'],
          isActive: true,
          sortOrder: 0,
        },
        {
          venueId: venue.id,
          name: 'Skybox Table',
          description: 'Elevated table with panoramic views',
          tableNumber: 'SBT1',
          minCapacity: 4,
          maxCapacity: 10,
          price: 1200,
          currency: 'AUD',
          minimumSpend: 1500,
          inclusions: ['Bottle service', 'Champagne', 'VIP Entry', 'Reserved parking'],
          location: 'Mezzanine',
          features: ['View', 'Private', 'Premium'],
          isActive: true,
          sortOrder: 1,
        },
        {
          venueId: venue.id,
          name: 'Standard Booth',
          description: 'Comfortable booth for smaller groups',
          tableNumber: 'SB1',
          minCapacity: 2,
          maxCapacity: 4,
          price: 250,
          currency: 'AUD',
          minimumSpend: 400,
          inclusions: ['Entry', '1 Bottle', 'Mixers'],
          location: 'Main Floor',
          features: ['Standard'],
          isActive: true,
          sortOrder: 2,
        },
      ];

      for (const tableData of tablesData) {
        const existing = await db.venueTable.findFirst({
          where: {
            venueId: venue.id,
            name: tableData.name,
          } as any,
        });
        if (!existing) {
          const table = await db.venueTable.create({
            data: tableData as any,
          });
          venueTables.push(table);
          console.log(`✅ Created table: ${table.name} for ${venue.businessName}`);
        }
      }
    }

    // ========================================
    // STEP 3: CREATE VENUE TICKETS (EVENTS)
    // ========================================
    console.log('\n📋 Step 3: Creating venue tickets (events)...');

    const venueTickets: any[] = [];

    // Use future dates so events show as "upcoming" in venue-tickets API
    const now = new Date();
    const futureDate = (daysAhead: number) => {
      const d = new Date(now);
      d.setDate(d.getDate() + daysAhead);
      d.setHours(20, 0, 0, 0);
      return d;
    };

    for (const venue of venueProfiles) {
      const ticketsForVenue = [
        {
          venueId: venue.id,
          name: 'Friday Night Party',
          description:
            'Join us for an amazing Friday night party with live DJ and special drinks',
          eventDate: futureDate(7),
          isRecurring: false,
          recurringDays: [],
          price: 50.0,
          currency: 'AUD',
          originalPrice: 70.0,
          totalInventory: 100,
          soldCount: 0,
          inclusions: ['Entry', '1 Free Drink', 'Access to VIP Area'],
          images: ['/images/events/friday-party-1.jpg'],
          validFrom: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          validUntil: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
          isActive: true,
          sortOrder: 0,
        },
        {
          venueId: venue.id,
          name: 'Saturday DJ Night',
          description: 'Dance the night away with resident DJs',
          eventDate: null,
          isRecurring: true,
          recurringDays: ['Saturday'],
          price: 40.0,
          currency: 'AUD',
          originalPrice: null,
          totalInventory: null, // Unlimited
          soldCount: 0,
          inclusions: ['Entry', 'Coat Check'],
          images: ['/images/events/saturday-dj-1.jpg'],
          validFrom: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          validUntil: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
          isActive: true,
          sortOrder: 1,
        },
        {
          venueId: venue.id,
          name: 'New Years Eve Special',
          description: 'Ring in the new year with champagne and celebrations',
          eventDate: futureDate(30),
          isRecurring: false,
          recurringDays: [],
          price: 150.0,
          currency: 'AUD',
          originalPrice: 200.0,
          totalInventory: 50,
          soldCount: 0,
          inclusions: ['Entry', 'Champagne Toast', 'Midnight Buffet', 'Party Favors'],
          images: ['/images/events/nye-special.jpg'],
          validFrom: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          validUntil: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
          isActive: true,
          sortOrder: 2,
        },
      ];

      const existingCount = await db.venueTicket.count({
        where: { venueId: venue.id } as any,
      });
      if (existingCount >= 3) {
        console.log(`⏭️  Skipping tickets for ${venue.businessName} (already has ${existingCount})`);
        continue;
      }
      for (const ticketData of ticketsForVenue) {
        const ticket = await db.venueTicket.create({
          data: ticketData as any,
        });
        venueTickets.push(ticket);
        console.log(`✅ Created ticket: ${ticket.name} for ${venue.businessName}`);
      }
    }

    // ========================================
    // STEP 4: CREATE VENUE BOOKINGS
    // ========================================
    console.log('\n🎫 Step 4: Creating venue bookings...');

    const venueBookings: any[] = [];

    // Create bookings for specific event tickets (not recurring)
    const specificTickets = venueTickets.filter((ticket) => !ticket.isRecurring);

    for (const ticket of specificTickets.slice(0, 3)) {
      // Create 2-3 bookings per ticket
      const bookingsCount = Math.floor(Math.random() * 2) + 2;

      for (let i = 0; i < bookingsCount; i++) {
        const member = users[i % users.length];
        const guestCount = Math.floor(Math.random() * 4) + 1;

        const booking = await db.venueBooking.create({
          data: {
            bookingNumber: `VEN-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            memberId: member.id,
            venueId: ticket.venueId,
            ticketId: ticket.id,
            bookingType: 'TICKET',
            bookingDate: ticket.eventDate || new Date(),
            bookingTime: '20:00',
            guestCount,
            specialRequests: i === 0 ? 'Please reserve seats near the stage' : null,
            subtotal: ticket.price,
            serviceFee: ticket.price * 0.1,
            tax: ticket.price * 0.1,
            discount: 0,
            totalAmount: ticket.price * 1.2,
            currency: ticket.currency,
            status: i % 3 === 0 ? 'CONFIRMED' : i % 3 === 1 ? 'PENDING_PAYMENT' : 'COMPLETED',
            paymentStatus: i % 3 === 0 ? 'COMPLETED' : i % 3 === 1 ? 'PENDING' : 'COMPLETED',
            qrCode: `QR-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=QR-${Date.now()}`,
            confirmedAt: i % 3 === 0 ? new Date().toISOString() : null,
            completedAt: i % 3 === 2 ? new Date().toISOString() : null,
          } as any,
        });

        venueBookings.push(booking);
        console.log(`✅ Created booking: ${booking.bookingNumber} for ${member.name}`);
      }
    }

    // ========================================
    // SUMMARY
    // ========================================
    console.log('\n✅ Lifestyle Venues Seeding Complete!\n');
    console.log('📊 Summary:');
    console.log(`   Venues:   ${venueProfiles.length}`);
    console.log(`   Tables:   ${venueTables.length}`);
    console.log(`   Tickets:  ${venueTickets.length}`);
    console.log(`   Bookings: ${venueBookings.length}`);
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
