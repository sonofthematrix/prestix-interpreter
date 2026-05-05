#!/usr/bin/env tsx

/**
 * Comprehensive Entertainment Seeder
 * 
 * Seeds complete entertainment ecosystem:
 * - Multiple venue owners and profiles
 * - Event hosts (users)
 * - Various venue tickets/events (parties, concerts, shows)
 * - Bookings for different users
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
  console.log('🌱 Starting comprehensive entertainment seeding...\n');
  console.log('📍 Database:', process.env.DATABASE_URL?.substring(0, 50) + '...\n');

  // Create venue owners
  console.log('👥 Creating venue owners...');
  
  const venueOwner1 = await db.user.upsert({
    where: { email: 'venue@redruby.bali' as unknown as undefined },
    update: {},
    create: {
      id: 'redruby-owner',
      email: 'venue@redruby.bali',
      name: 'RedRuby Management',
      role: 'VENDOR', // VENDOR role for venue owners
      authMethod: 'email',
      status: 'ACTIVE',
    } as any,
  });

  const venueOwner2 = await db.user.upsert({
    where: { email: 'venue@skygarden.bali' as unknown as undefined },
    update: {},
    create: {
      id: 'skygarden-owner',
      email: 'venue@skygarden.bali',
      name: 'Sky Garden Management',
      role: 'VENDOR', // VENDOR role for venue owners
      authMethod: 'email',
      status: 'ACTIVE',
    } as any,
  });

  const venueOwner3 = await db.user.upsert({
    where: { email: 'venue@lacaverne.bali' as unknown as undefined },
    update: {},
    create: {
      id: 'lacaverne-owner',
      email: 'venue@lacaverne.bali',
      name: 'La Caverne Management',
      role: 'VENDOR', // VENDOR role for venue owners
      authMethod: 'email',
      status: 'ACTIVE',
    } as any,
  });

  console.log(`✅ Created ${3} venue owners\n`);

  // Create venue profiles
  console.log('🏢 Creating venue profiles...');

  const venue1 = await db.venueProfile.upsert({
    where: { userId: venueOwner1.id as unknown as undefined },
    update: {},
    create: {
      userId: venueOwner1.id,
      businessName: 'RedRuby Bali',
      businessType: 'Club',
      description: 'Premier nightclub in Seminyak, Bali. Experience luxury nightlife with world-class DJs and premium service.',
      tagline: 'Where Luxury Meets Nightlife',
      addressLine1: 'Jl. Petitenget No. 100',
      city: 'Seminyak',
      state: 'Bali',
      country: 'Indonesia',
      postalCode: '80361',
      latitude: -8.6833,
      longitude: 115.1500,
      phone: '+62 361 123456',
      email: 'info@redruby.bali',
      website: 'https://redruby.bali',
      capacity: 500,
      dressCode: 'Smart Casual',
      ageRestriction: 21,
      defaultCommissionRate: 0.875,
      status: 'VERIFIED',
      rating: 4.5,
      totalReviews: 0,
      totalBookings: 0,
      totalRevenue: 0,
      autoAcceptBookings: false,
      requireDeposit: true,
      depositPercentage: 30,
    } as any,
  });

  const venue2 = await db.venueProfile.upsert({
    where: { userId: venueOwner2.id as unknown as undefined },
    update: {},
    create: {
      userId: venueOwner2.id,
      businessName: 'Sky Garden Bali',
      businessType: 'Rooftop Club',
      description: 'Multi-level rooftop club with stunning views of Seminyak. Features multiple bars, dance floors, and VIP lounges.',
      tagline: 'Above It All',
      addressLine1: 'Jl. Legian No. 61',
      city: 'Seminyak',
      state: 'Bali',
      country: 'Indonesia',
      postalCode: '80361',
      latitude: -8.6917,
      longitude: 115.1683,
      phone: '+62 361 234567',
      email: 'info@skygarden.bali',
      website: 'https://skygarden.bali',
      capacity: 800,
      dressCode: 'Casual Chic',
      ageRestriction: 18,
      defaultCommissionRate: 0.875,
      status: 'VERIFIED',
      rating: 4.7,
      totalReviews: 0,
      totalBookings: 0,
      totalRevenue: 0,
      autoAcceptBookings: true,
      requireDeposit: false,
    } as any,
  });

  const venue3 = await db.venueProfile.upsert({
    where: { userId: venueOwner3.id as unknown as undefined },
    update: {},
    create: {
      userId: venueOwner3.id,
      businessName: 'La Caverne Bali',
      businessType: 'Beach Club',
      description: 'Exclusive beach club with cave-inspired architecture. Perfect for sunset cocktails and evening entertainment.',
      tagline: 'Hidden Paradise',
      addressLine1: 'Jl. Pantai Berawa No. 28',
      city: 'Canggu',
      state: 'Bali',
      country: 'Indonesia',
      postalCode: '80361',
      latitude: -8.6500,
      longitude: 115.1333,
      phone: '+62 361 345678',
      email: 'info@lacaverne.bali',
      website: 'https://lacaverne.bali',
      capacity: 300,
      dressCode: 'Resort Casual',
      ageRestriction: 21,
      defaultCommissionRate: 0.875,
      status: 'VERIFIED',
      rating: 4.8,
      totalReviews: 0,
      totalBookings: 0,
      totalRevenue: 0,
      autoAcceptBookings: false,
      requireDeposit: true,
      depositPercentage: 50,
    } as any,
  });

  console.log(`✅ Created ${3} venue profiles\n`);

  // Create event hosts (users who will host events)
  console.log('🎤 Creating event hosts...');

  const host1 = await db.user.upsert({
    where: { email: 'host@djmaverick.com' as unknown as undefined },
    update: {},
    create: {
      id: 'host-djmaverick',
      email: 'host@djmaverick.com',
      name: 'DJ Maverick',
      role: 'VENDOR', // VENDOR role for event hosts
      authMethod: 'email',
      status: 'ACTIVE',
    } as any,
  });

  const host2 = await db.user.upsert({
    where: { email: 'host@stellanova.com' as unknown as undefined },
    update: {},
    create: {
      id: 'host-stellanova',
      email: 'host@stellanova.com',
      name: 'Stella Nova',
      role: 'VENDOR', // VENDOR role for event hosts
      authMethod: 'email',
      status: 'ACTIVE',
    } as any,
  });

  const host3 = await db.user.upsert({
    where: { email: 'host@phoenixcrew.com' as unknown as undefined },
    update: {},
    create: {
      id: 'host-phoenix',
      email: 'host@phoenixcrew.com',
      name: 'Phoenix Crew',
      role: 'VENDOR', // VENDOR role for event hosts
      authMethod: 'email',
      status: 'ACTIVE',
    } as any,
  });

  console.log(`✅ Created ${3} event hosts\n`);

  // Create venue tickets (events)
  console.log('🎉 Creating events...');

  const venueTickets: any[] = [];
  const venues = [venue1, venue2, venue3];

  const now = new Date();
  const futureDate1 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 1 week from now
  const futureDate2 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 2 weeks from now
  const futureDate3 = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000); // 3 weeks from now

  // Events for venue 1 (RedRuby)
  const ticket1 = await db.venueTicket.create({
    data: {
      venueId: venue1.id,
      name: 'Neon Nights - Electronic Dance Party',
      description: 'Experience the best of electronic music with international DJs. Featuring multiple stages, LED shows, and premium cocktails.',
      eventDate: futureDate1,
      isRecurring: false,
      recurringDays: [],
      price: 2000000, // IDR
      currency: 'IDR',
      totalInventory: 350,
      soldCount: 0,
      inclusions: ['Premium seating', 'Bottle service', 'Skip the line'],
      images: ['/images/events/friday-party-1.jpg','/images/events/friday-party-2.jpg','/images/events/nye-special.jpg'],
      validFrom: now,
      validUntil: futureDate1,
      isActive: true,
      sortOrder: 0,
    } as any,
  });
  venueTickets.push(ticket1);
  console.log(`✅ Created event: ${ticket1.name} for ${venue1.businessName}`);

  // Events for venue 2 (Sky Garden)
  const ticket2 = await db.venueTicket.create({
    data: {
      venueId: venue2.id,
      name: 'Rooftop Sunset Sessions',
      description: 'Chill vibes with acoustic performances and sunset views. Perfect for starting your evening in style.',
      eventDate: futureDate2,
      isRecurring: false,
      recurringDays: [],
      price: 300000, // IDR
      currency: 'IDR',
      totalInventory: 180,
      soldCount: 0,
      inclusions: ['Welcome drink', 'Rooftop access'],
      images: ['/images/venues/rooftop88-1.jpg','/images/venues/rooftop88-2.jpg','/images/venues/rooftop88-3.jpg'],
      validFrom: now,
      validUntil: futureDate2,
      isActive: true,
      sortOrder: 0,
    } as any,
  });
  venueTickets.push(ticket2);
  console.log(`✅ Created event: ${ticket2.name} for ${venue2.businessName}`);

  // Events for venue 3 (La Caverne)
  const ticket3 = await db.venueTicket.create({
    data: {
      venueId: venue3.id,
      name: 'Beach House Paradise',
      description: 'Deep house vibes at our exclusive beach club. Featuring resident and guest DJs with oceanfront setting.',
      eventDate: futureDate3,
      isRecurring: false,
      recurringDays: [],
      price: 1500000, // IDR
      currency: 'IDR',
      totalInventory: 220,
      soldCount: 0,
      inclusions: ['VIP lounge access', 'Complimentary drinks', 'Beach cabana'],
      images: ['/images/venues/ocean-beach-1.jpg','/images/venues/ocean-beach-2.jpg','/images/venues/ocean-beach-3.jpg'],
      validFrom: now,
      validUntil: futureDate3,
      isActive: true,
      sortOrder: 0,
    } as any,
  });
  venueTickets.push(ticket3);
  console.log(`✅ Created event: ${ticket3.name} for ${venue3.businessName}`);

  console.log('\n🎫 Creating sample bookings...');

  const venueBookings: any[] = [];

  // Get or create sample users for bookings
  const sampleUser1 = await db.user.upsert({
    where: { email: 'demo@tokenizin.com' as unknown as undefined },
    update: {},
    create: {
      email: 'demo@tokenizin.com',
      name: 'Demo User',
      role: 'CUSTOMER',
      authMethod: 'email',
      status: 'ACTIVE',
    } as any,
  });

  // Create a confirmed booking for ticket1
  const booking1 = await db.venueBooking.create({
    data: {
      bookingNumber: `VEN-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      memberId: sampleUser1.id,
      venueId: venue1.id,
      ticketId: ticket1.id,
      bookingType: 'TICKET',
      bookingDate: futureDate1,
      bookingTime: '22:00',
      guestCount: 8,
      specialRequests: 'Bottle service included',
      subtotal: 5000000, // IDR
      serviceFee: 500000, // IDR
      tax: 500000, // IDR
      discount: 0,
      totalAmount: 6000000, // IDR
      currency: 'IDR',
      status: 'CONFIRMED',
      paymentStatus: 'COMPLETED',
      qrCode: `QR-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=QR-${Date.now()}`,
      confirmedAt: new Date().toISOString(),
    } as any,
  });
  venueBookings.push(booking1);
  console.log(`✅ Created booking: ${booking1.bookingNumber} for ${sampleUser1.name}`);

  // Create a pending booking for ticket2
  const booking2 = await db.venueBooking.create({
    data: {
      bookingNumber: `VEN-${Date.now() + 1}-${Math.random().toString(36).substring(7)}`,
      memberId: sampleUser1.id,
      venueId: venue2.id,
      ticketId: ticket2.id,
      bookingType: 'TICKET',
      bookingDate: futureDate2,
      bookingTime: '18:00',
      guestCount: 4,
      subtotal: 1200000, // IDR
      serviceFee: 120000, // IDR
      tax: 120000, // IDR
      discount: 0,
      totalAmount: 1440000, // IDR
      currency: 'IDR',
      status: 'PENDING_PAYMENT',
      paymentStatus: 'PENDING',
      qrCode: `QR-${Date.now() + 1}-${Math.random().toString(36).substring(7)}`,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=QR-${Date.now() + 1}`,
    } as any,
  });
  venueBookings.push(booking2);
  console.log(`✅ Created booking: ${booking2.bookingNumber} for ${sampleUser1.name}`);

  console.log('\n🎉 Entertainment seeding complete!');
  console.log(`\n📊 Summary:`);
  console.log(`   Venues:        ${3}`);
  console.log(`   Hosts:         ${3}`);
  console.log(`   Events:        ${venueTickets.length}`);
  console.log(`   Bookings:      ${venueBookings.length}`);
  console.log('');
}

main()
  .then(() => {
    console.log('\n✅ Seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  });
