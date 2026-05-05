#!/usr/bin/env tsx
/**
 * PRESTIX.VIP Entertainment Module Master Seeder
 * 
 * Complete seeding pipeline for all Entertainment/Lifestyle entities
 * Organized in 5 phases for progressive data population
 * 
 * Usage:
 *   bun run seed:entertainment:master           # All phases
 *   bun run seed:entertainment:master --phase=1 # Phase 1 only
 *   bun run seed:entertainment:master --phase=1,2,3 # Multiple phases
 * 
 * Updated for ZenStack v3 ORM and PRESTIX.VIP schema
 */

import 'dotenv/config';
import { createClient } from '../src/lib/db';

// System user for elevated privileges during seeding
const systemUser = {
  id: 'system',
  email: 'system@prestix.vip',
  role: 'PLATFORM_ADMIN' as const,
  name: 'System Admin'
};

const db = createClient(systemUser);

// Seeding statistics
const stats = {
  venueStaff: 0,
  venueTables: 0,
  venueAvailability: 0,
  tableAvailability: 0,
  enhancedBookings: 0,
  bookingPayments: 0,
  bookingDisputes: 0,
  promoterProfiles: 0,
  promoterReferrals: 0,
  promoterCommissions: 0,
  promoterMilestones: 0,
  memberWallets: 0,
  walletTransactions: 0,
  hostPayouts: 0,
  hostReviews: 0,
  venueMetrics: 0,
  promoterMetrics: 0,
  venueReviews: 0,
  venueSettlements: 0,
  vipAlerts: 0,
};

// Parse command line arguments
function getPhases(): number[] {
  const args = process.argv.slice(2);
  const phaseArg = args.find(arg => arg.startsWith('--phase='));
  
  if (!phaseArg) {
    return [1, 2, 3, 4, 5]; // All phases
  }
  
  const phaseStr = phaseArg.replace('--phase=', '');
  return phaseStr.split(',').map(p => parseInt(p.trim()));
}

// ============================================================================
// PHASE 1: CORE ENTITIES
// ============================================================================

async function seedVenueStaff() {
  console.log('\n📋 Seeding Venue Staff...');
  
  const venues = await db.venueProfile.findMany({
    select: { id: true, name: true }
  });
  
  if (venues.length === 0) {
    console.log('⚠️  No venues found. Run venue seeding first.');
    return;
  }
  
  const staffRoles = [
    { role: 'Manager', permissions: ['view_bookings', 'manage_tables', 'check_in_guests', 'manage_staff', 'view_financials'] },
    { role: 'Host', permissions: ['view_bookings', 'check_in_guests', 'manage_tables'] },
    { role: 'Host', permissions: ['view_bookings', 'check_in_guests', 'manage_tables'] },
    { role: 'Server', permissions: ['view_bookings', 'manage_orders'] },
    { role: 'Security', permissions: ['view_bookings', 'check_in_guests', 'incident_management'] },
  ];
  
  for (const venue of venues) {
    console.log(`  Adding staff for ${venue.name}...`);
    
    for (const staffRole of staffRoles) {
      // Create user for staff member
      const randomId = Math.random().toString(36).substring(2, 6);
      const venueSlug = (venue.name as string).toLowerCase().replace(/\s+/g, '');
      const email = `${venueSlug}-${staffRole.role.toLowerCase()}-${randomId}@prestix.vip`;
      
      const firstNames = ['Alex', 'Sarah', 'Michael', 'Emma', 'David', 'Sophie', 'James', 'Lisa', 'Tom', 'Maria'];
      const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Martinez', 'Wilson'];
      const randomFirstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const randomLastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      
      const user = await db.user.create({
        data: {
          email,
          name: `${randomFirstName} ${randomLastName}`,
          role: 'VENUE_STAFF',
          status: 'ACTIVE',
          emailVerified: new Date(),
        },
      });
      
      // Create venue staff record
      await db.venueStaff.create({
        data: {
          venueId: venue.id,
          userId: user.id,
          role: staffRole.role,
          permissions: staffRole.permissions,
          isActive: true,
        },
      });
      
      stats.venueStaff++;
    }
  }
  
  console.log(`✅ Created ${stats.venueStaff} venue staff members`);
}

async function seedVenueTables() {
  console.log('\n🪑 Seeding Venue Tables...');
  
  const venues = await db.venueProfile.findMany({
    select: { id: true, name: true, venueType: true }
  });
  
  if (venues.length === 0) {
    console.log('⚠️  No venues found.');
    return;
  }
  
  const tableTemplates = {
    'NIGHTCLUB': [
      { name: 'VIP Booth 1', minCap: 6, maxCap: 10, price: 3000, location: 'Mezzanine', features: ['Bottle Service', 'Private', 'Dance Floor View'], tableType: 'BOOTH' },
      { name: 'VIP Booth 2', minCap: 6, maxCap: 10, price: 3000, location: 'Mezzanine', features: ['Bottle Service', 'Private', 'Dance Floor View'], tableType: 'BOOTH' },
      { name: 'VIP Booth 3', minCap: 8, maxCap: 12, price: 4000, location: 'Upper Level', features: ['Bottle Service', 'Private', 'Premium View', 'Balcony'], tableType: 'ULTRA_VIP' },
      { name: 'Main Floor Table 1', minCap: 4, maxCap: 8, price: 1500, location: 'Main Floor', features: ['Dance Floor Access', 'Bottle Service'], tableType: 'STANDARD' },
      { name: 'Main Floor Table 2', minCap: 4, maxCap: 8, price: 1500, location: 'Main Floor', features: ['Dance Floor Access', 'Bottle Service'], tableType: 'STANDARD' },
      { name: 'Main Floor Table 3', minCap: 4, maxCap: 8, price: 1500, location: 'Main Floor', features: ['Dance Floor Access', 'Bottle Service'], tableType: 'STANDARD' },
      { name: 'Bar Table 1', minCap: 2, maxCap: 4, price: 800, location: 'Bar Area', features: ['Bar Access', 'Standing Table'], tableType: 'STANDARD' },
      { name: 'Bar Table 2', minCap: 2, maxCap: 4, price: 800, location: 'Bar Area', features: ['Bar Access', 'Standing Table'], tableType: 'STANDARD' },
    ],
    'ROOFTOP': [
      { name: 'Skybox 1', minCap: 8, maxCap: 12, price: 3500, location: 'Sky Deck', features: ['Bottle Service', 'Private', 'Sunset View', 'Premium'], tableType: 'ULTRA_VIP' },
      { name: 'Skybox 2', minCap: 8, maxCap: 12, price: 3500, location: 'Sky Deck', features: ['Bottle Service', 'Private', 'Sunset View', 'Premium'], tableType: 'ULTRA_VIP' },
      { name: 'Rooftop Table 1', minCap: 4, maxCap: 6, price: 1800, location: 'Main Deck', features: ['Bottle Service', 'City View'], tableType: 'PREMIUM' },
      { name: 'Rooftop Table 2', minCap: 4, maxCap: 6, price: 1800, location: 'Main Deck', features: ['Bottle Service', 'City View'], tableType: 'PREMIUM' },
      { name: 'Rooftop Table 3', minCap: 4, maxCap: 6, price: 1800, location: 'Main Deck', features: ['Bottle Service', 'City View'], tableType: 'PREMIUM' },
      { name: 'Lounge Area 1', minCap: 6, maxCap: 10, price: 2200, location: 'Lounge', features: ['Bottle Service', 'Outdoor', 'Comfortable Seating'], tableType: 'PREMIUM' },
    ],
    'BEACH_CLUB': [
      { name: 'Beachfront Cabana 1', minCap: 6, maxCap: 10, price: 3200, location: 'Beachfront', features: ['Bottle Service', 'Private', 'Beach Access', 'Daybed'], tableType: 'CABANA' },
      { name: 'Beachfront Cabana 2', minCap: 6, maxCap: 10, price: 3200, location: 'Beachfront', features: ['Bottle Service', 'Private', 'Beach Access', 'Daybed'], tableType: 'CABANA' },
      { name: 'Pool Deck Table 1', minCap: 4, maxCap: 8, price: 1600, location: 'Pool Deck', features: ['Bottle Service', 'Pool View'], tableType: 'PREMIUM' },
      { name: 'Pool Deck Table 2', minCap: 4, maxCap: 8, price: 1600, location: 'Pool Deck', features: ['Bottle Service', 'Pool View'], tableType: 'PREMIUM' },
      { name: 'Beach Table 1', minCap: 4, maxCap: 6, price: 1200, location: 'Beach', features: ['Beach Service', 'Ocean View'], tableType: 'STANDARD' },
      { name: 'Beach Table 2', minCap: 4, maxCap: 6, price: 1200, location: 'Beach', features: ['Beach Service', 'Ocean View'], tableType: 'STANDARD' },
      { name: 'Sunset Lounge', minCap: 8, maxCap: 12, price: 2800, location: 'Upper Deck', features: ['Bottle Service', 'Private', 'Sunset View', 'Premium'], tableType: 'ULTRA_VIP' },
    ],
  };
  
  for (const venue of venues) {
    console.log(`  Adding tables for ${venue.name}...`);

    const templates = tableTemplates[venue.venueType as keyof typeof tableTemplates] || tableTemplates['NIGHTCLUB'];
    
    for (let i = 0; i < templates.length; i++) {
      const template = templates[i];
      const tableNumber = `T-${String(i + 1).padStart(3, '0')}`;
      
      // Check if table already exists by name
      const existing = await db.venueTable.findFirst({
        where: {
          venueId: venue.id,
          name: template.name
        } as any
      });

      if (existing) {
        console.log(`    ℹ️  Table "${template.name}" already exists, skipping`);
        continue;
      }

      await db.venueTable.create({
        data: {
          venueId: venue.id,
          name: template.name,
          description: `Premium ${template.name.toLowerCase()} with ${template.features.join(', ').toLowerCase()}`,
          tableNumber: tableNumber || undefined,
          minCapacity: template.minCap,
          maxCapacity: template.maxCap,
          basePrice: template.price,
          currency: 'AUD',
          minimumSpend: template.price * 0.25,
          inclusions: ['Bottle service', 'Mixers', 'VIP entry', 'Dedicated server'],
          images: [],
          location: template.location || undefined,
          features: template.features,
          tableType: template.tableType,
          isActive: true,
          sortOrder: i,
        } as any,
      });
      
      stats.venueTables++;
    }
  }
  
  console.log(`✅ Created ${stats.venueTables} venue tables`);
}

async function seedVenueAvailability() {
  console.log('\n📅 Seeding Venue Availability (90 days)...');
  
  const venues = await db.venueProfile.findMany({
    select: { id: true, name: true }
  });
  
  if (venues.length === 0) {
    console.log('⚠️  No venues found.');
    return;
  }
  
  for (const venue of venues) {
    console.log(`  Creating availability for ${venue.name}...`);
    
    for (let dayOffset = 0; dayOffset < 90; dayOffset++) {
      const date = new Date();
      date.setDate(date.getDate() + dayOffset);
      date.setHours(0, 0, 0, 0); // Normalize to date only
      
      // Random closures (10% chance)
      const isOpen = Math.random() > 0.1;
      const reason = !isOpen ? ['Holiday', 'Private Event', 'Maintenance'][Math.floor(Math.random() * 3)] : null;
      
      await db.venueAvailability.create({
        data: {
          venueId: venue.id,
          date,
          isOpen,
          openTime: isOpen ? '18:00' : undefined,
          closeTime: isOpen ? '03:00' : undefined,
          reason: reason || undefined,
        } as any,
      });
      
      stats.venueAvailability++;
    }
  }
  
  console.log(`✅ Created ${stats.venueAvailability} venue availability records`);
}

async function seedVenueTableAvailability() {
  console.log('\n🗓️  Seeding Table Availability (60 days)...');
  
  const tables = await db.venueTable.findMany({
    select: { id: true, tableNumber: true, venueId: true }
  });
  
  if (tables.length === 0) {
    console.log('⚠️  No tables found.');
    return;
  }
  
  const timeSlots = ['afternoon', 'evening', 'late_night'];
  
  for (const table of tables) {
    for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
      const date = new Date();
      date.setDate(date.getDate() + dayOffset);
      date.setHours(0, 0, 0, 0); // Normalize to date only
      
      for (const timeSlot of timeSlots) {
        // 80% available, 20% reserved
        const isAvailable = Math.random() > 0.2;
        const reason = !isAvailable ? 'Reserved for VIP' : null;
        
        await db.venueTableAvailability.create({
          data: {
            tableId: table.id,
            date,
            timeSlot: timeSlot || undefined,
            isAvailable,
            reason: reason || undefined,
          } as any,
        });
        
        stats.tableAvailability++;
      }
    }
  }
  
  console.log(`✅ Created ${stats.tableAvailability} table availability records`);
}

// ============================================================================
// PHASE 2: BOOKING EXPANSION
// ============================================================================

async function seedEnhancedBookings() {
  console.log('\n🎫 Seeding Enhanced Bookings (TABLE_RESERVATION, HOST_BOOKING, PACKAGE types)...');
  
  const venues = await db.venueProfile.findMany({
    select: { id: true, name: true }
  });
  
  const tables = await db.venueTable.findMany({
    select: { id: true, venueId: true, basePrice: true }
  });
  
  const hosts = await db.hostProfile.findMany({
    where: {
      status: 'ACTIVE',
      isActive: true
    } as any,
    select: { id: true, userId: true, hourlyRate: true }
  });
  
  const members = await db.user.findMany({
    where: { role: 'MEMBER' } as any,
    select: { id: true }
  });
  
  if (venues.length === 0 || members.length === 0) {
    console.log('⚠️  Missing required data.');
    return;
  }
  
  // Create 20 TABLE_RESERVATION bookings
  for (let i = 0; i < 20; i++) {
    const table = tables[Math.floor(Math.random() * tables.length)];
    const member = members[Math.floor(Math.random() * members.length)];
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 30) + 1);
    futureDate.setHours(0, 0, 0, 0);
    
    const guestCount = Math.floor(Math.random() * 6) + 4; // 4-10 guests
    
    // Ensure price is a number (might be Decimal from DB)
    const basePrice = typeof table.basePrice === 'number' ? table.basePrice : parseFloat(table.basePrice as unknown as string);
    const addOnsAmount = 0;
    const discountAmount = 0;
    const taxAmount = basePrice * 0.1;
    const totalAmount = basePrice + addOnsAmount + taxAmount - discountAmount;
    
    const bookingNumber = `PX-TBL-${futureDate.toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    await db.booking.create({
      data: {
        bookingNumber,
        memberId: member.id,
        venueId: table.venueId,
        tableId: table.id,
        bookingType: 'TABLE_RESERVATION',
        bookingDate: futureDate,
        startTime: ['20:00', '21:00', '22:00'][Math.floor(Math.random() * 3)],
        guestCount,
        baseAmount: basePrice,
        addOnsAmount,
        discountAmount,
        taxAmount,
        totalAmount,
        currency: 'AUD',
        status: ['CONFIRMED', 'CONFIRMED', 'CONFIRMED', 'PENDING_PAYMENT'][Math.floor(Math.random() * 4)],
        paymentRail: 'STRIPE_CARD',
        specialNotes: [
          'Champagne on ice',
          'Birthday celebration',
          'Anniversary dinner',
          'Corporate event',
          null,
        ][Math.floor(Math.random() * 5)] || undefined,
      } as any,
    });
    
    stats.enhancedBookings++;
  }
  
  // Create 15 HOST_BOOKING bookings (if hosts available)
  if (hosts.length > 0) {
    for (let i = 0; i < 15; i++) {
      const venue = venues[Math.floor(Math.random() * venues.length)];
      const host = hosts[Math.floor(Math.random() * hosts.length)];
      const member = members[Math.floor(Math.random() * members.length)];
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 30) + 1);
      futureDate.setHours(0, 0, 0, 0);
      
      const hours = Math.floor(Math.random() * 3) + 3; // 3-6 hours
      const hourlyRate = typeof host.hourlyRate === 'number' ? host.hourlyRate : parseFloat(host.hourlyRate as unknown as string);
      const guestCount = Math.floor(Math.random() * 4) + 2; // 2-6 guests
      const baseAmount = hourlyRate * hours;
      const addOnsAmount = 0;
      const discountAmount = 0;
      const taxAmount = baseAmount * 0.1;
      const totalAmount = baseAmount + addOnsAmount + taxAmount - discountAmount;
      
      const bookingNumber = `PX-HOST-${futureDate.toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      // Create HostBooking record
      await db.hostBooking.create({
        data: {
          hostId: host.id,
          memberId: member.id,
          date: futureDate,
          startTime: ['20:00', '21:00', '22:00'][Math.floor(Math.random() * 3)],
          endTime: '02:00',
          durationHours: hours,
          hourlyRate,
          totalAmount,
          currency: 'AUD',
          status: ['CONFIRMED', 'CONFIRMED', 'CONFIRMED', 'PENDING_PAYMENT'][Math.floor(Math.random() * 4)],
          notes: `${hours} hours host service`,
        },
      });
      
      stats.enhancedBookings++;
    }
  }
  
  // Create 10 PACKAGE bookings (TABLE_RESERVATION + HOST_BOOKING)
  if (hosts.length > 0 && tables.length > 0) {
    for (let i = 0; i < 10; i++) {
      const table = tables[Math.floor(Math.random() * tables.length)];
      const host = hosts[Math.floor(Math.random() * hosts.length)];
      const member = members[Math.floor(Math.random() * members.length)];
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 30) + 1);
      futureDate.setHours(0, 0, 0, 0);
      
      const hours = 4; // Standard package: 4 hours
      const hourlyRate = typeof host.hourlyRate === 'number' ? host.hourlyRate : parseFloat(host.hourlyRate as unknown as string);
      const guestCount = Math.floor(Math.random() * 6) + 6; // 6-12 guests
      
      // Ensure price is a number (might be Decimal from DB)
      const tablePrice = typeof table.basePrice === 'number' ? table.basePrice : parseFloat(table.basePrice as unknown as string);
      const hostPrice = hourlyRate * hours;
      const baseAmount = tablePrice + hostPrice;
      const addOnsAmount = 0;
      const discountAmount = baseAmount * 0.05; // 5% package discount
      const taxAmount = (baseAmount - discountAmount) * 0.1;
      const totalAmount = baseAmount + addOnsAmount + taxAmount - discountAmount;
      
      const bookingNumber = `PX-PKG-${futureDate.toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      await db.booking.create({
        data: {
          bookingNumber,
          memberId: member.id,
          venueId: table.venueId,
          tableId: table.id,
          bookingType: 'PACKAGE',
          bookingDate: futureDate,
          startTime: ['20:00', '21:00'][Math.floor(Math.random() * 2)],
          guestCount,
          baseAmount,
          addOnsAmount,
          discountAmount,
          taxAmount,
          totalAmount,
          currency: 'AUD',
          status: 'CONFIRMED',
          paymentRail: 'STRIPE_CARD',
          specialNotes: 'VIP treatment, bottle service, host for 4 hours',
        },
      });
      
      stats.enhancedBookings++;
    }
  }
  
  console.log(`✅ Created ${stats.enhancedBookings} enhanced bookings`);
}

async function seedBookingPayments() {
  console.log('\n💳 Seeding Booking Payments...');
  
  const bookings = await db.booking.findMany({
    select: { id: true, totalAmount: true, currency: true, status: true }
  });
  
  if (bookings.length === 0) {
    console.log('⚠️  No bookings found.');
    return;
  }
  
  const paymentRails = ['STRIPE_CARD', 'STRIPE_CARD', 'STRIPE_CARD', 'CRYPTO_USDC', 'WALLET_BALANCE']; // Weighted distribution
  
  for (const booking of bookings) {
    // Check if payment already exists
    const existingPayment = await db.bookingPayment.findFirst({
      where: { bookingId: booking.id } as any
    });

    if (existingPayment) {
      console.log(`    ℹ️  Payment for booking ${booking.id} already exists, skipping`);
      continue;
    }

    // Select payment rail
    const rail = paymentRails[Math.floor(Math.random() * paymentRails.length)] as 'STRIPE_CARD' | 'CRYPTO_USDC' | 'WALLET_BALANCE';
    
    // Determine status based on booking status
    const status = booking.status === 'CONFIRMED' || booking.status === 'COMPLETED' ? 'COMPLETED' : 
                   booking.status === 'PENDING_PAYMENT' ? 'PENDING' : 'FAILED';
    
    const amount = typeof booking.totalAmount === 'number' ? booking.totalAmount : parseFloat(booking.totalAmount as unknown as string);
    
    await db.bookingPayment.create({
      data: {
        bookingId: booking.id,
        amount,
        currency: booking.currency || 'AUD',
        rail,
        status,
        stripePaymentIntentId: rail === 'STRIPE_CARD' ? `pi_${Math.random().toString(36).substring(2, 26)}` : undefined,
        cryptoTxHash: rail.startsWith('CRYPTO_') ? `0x${Math.random().toString(16).substring(2, 66)}` : undefined,
        cryptoNetwork: rail.startsWith('CRYPTO_') ? 'POLYGON_MAINNET' : undefined,
        processedAt: status === 'COMPLETED' ? new Date() : undefined,
        failedAt: status === 'FAILED' ? new Date() : undefined,
        failureReason: status === 'FAILED' ? 'Insufficient funds' : undefined,
      } as any,
    });
    
    stats.bookingPayments++;
  }
  
  console.log(`✅ Created ${stats.bookingPayments} booking payments`);
}

async function seedBookingDisputes() {
  console.log('\n⚖️  Seeding Booking Disputes (sample)...');

  const bookings = await db.booking.findMany({
    where: { status: 'CONFIRMED' } as any,
    select: { id: true, memberId: true },
    take: 30,
  });

  if (bookings.length === 0) {
    console.log('⚠️  No confirmed bookings found.');
    return;
  }

  // Create disputes for 5-10% of bookings
  const disputeCount = Math.min(Math.floor(bookings.length * 0.08), 5);

  const reasons = [
    'Table not ready upon arrival',
    'Charged for items not ordered',
    'Reserved table given to another party',
    'Venue closed unexpectedly',
    'Service quality did not meet expectations'
  ];

  const descriptions = [
    'Table was not ready upon arrival, waited 45 minutes despite confirmation',
    'Charged for multiple bottles of champagne that were never ordered or delivered',
    'Despite having a confirmed reservation, our table was given to another party',
    'Venue closed unexpectedly due to equipment failure with no prior notification',
    'Service was extremely slow and staff was unprofessional throughout the evening'
  ];

  for (let i = 0; i < disputeCount; i++) {
    const booking = bookings[i];
    const reasonIndex = Math.floor(Math.random() * reasons.length);

    // Check if dispute already exists
    const existing = await db.bookingDispute.findFirst({
      where: { bookingId: booking.id } as any
    });

    if (existing) {
      console.log(`    ℹ️  Dispute for booking ${booking.id} already exists, skipping`);
      continue;
    }

    await db.bookingDispute.create({
      data: {
        bookingId: booking.id,
        initiatedBy: 'MEMBER',
        initiatedByUserId: booking.memberId,
        reason: reasons[reasonIndex],
        description: descriptions[reasonIndex],
        evidence: [],
        status: ['OPEN', 'UNDER_REVIEW', 'RESOLVED_MEMBER_FAVOR'][Math.floor(Math.random() * 3)],
        resolution: 'Partial refund issued, venue credit applied for future visit',
        refundAmount: Math.floor(Math.random() * 400) + 100, // $100-$500
        resolvedAt: new Date(),
      } as any,
    });
    
    stats.bookingDisputes++;
  }
  
  console.log(`✅ Created ${stats.bookingDisputes} booking disputes`);
}

// ═════════════════════════════════════════════════════════════
// PHASE 3: PROMOTER SYSTEM
// ═════════════════════════════════════════════════════════════

async function seedPromoterProfiles() {
  console.log('\n🎯 Seeding Promoter Profiles...');
  
  const members = await db.user.findMany({
    where: { role: 'MEMBER' } as any,
    take: 10,
    select: { id: true, email: true, name: true },
  });

  const statuses = ['PENDING_APPROVAL', 'ACTIVE', 'ACTIVE', 'SUSPENDED'];
  const tiers = ['STARTER', 'BRONZE', 'SILVER', 'GOLD', 'ELITE'];
  
  for (let i = 0; i < Math.min(8, members.length); i++) {
    const member = members[i];
    const displayNames = ['Elite Nights', 'Party Master', 'VIP Connect', 'Nightlife Pro', 'Event Maestro'];
    const displayName = displayNames[i % displayNames.length] + ` ${member.name?.toString().split(' ')[0] || 'Pro'}`;
    
    const existing = await db.promoterProfile.findFirst({
      where: { userId: member.id } as any
    });
    
    if (existing) {
      console.log(`    ℹ️  Promoter profile for user ${member.id} already exists, skipping`);
      continue;
    }
    
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const tier = status === 'ACTIVE' ? tiers[Math.floor(Math.random() * tiers.length)] : 'STARTER';
    
    await db.promoterProfile.create({
      data: {
        userId: member.id,
        status,
        tier,
        socialHandle: `@${displayName.toLowerCase().replace(/\s/g, '')}`,
        followerCount: Math.floor(Math.random() * 50000) + 5000,
        referralCode: `PROMO${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        approvedAt: status === 'ACTIVE' ? new Date() : undefined,
      } as any,
    });
    
    stats.promoterProfiles++;
  }
  
  console.log(`✅ Created ${stats.promoterProfiles} promoter profiles`);
}

async function seedPromoterReferrals() {
  console.log('\n🔗 Seeding Promoter Referrals...');
  
  const promoters = await db.promoterProfile.findMany({
    where: { status: 'ACTIVE' } as any,
    select: { id: true, userId: true, referralCode: true },
  });
  
  if (promoters.length === 0) {
    console.log('    ℹ️  No approved promoters found, skipping');
    return;
  }
  
  const customers = await db.user.findMany({
    where: { role: 'MEMBER' } as any,
    take: 20,
    select: { id: true },
  });
  
  for (const customer of customers) {
    if (Math.random() > 0.3) continue; // 30% are referred by promoters
    
    const promoter = promoters[Math.floor(Math.random() * promoters.length)];
    
    // Check if referral already exists
    const existing = await db.promoterReferral.findFirst({
      where: { 
        promoterId: promoter.id,
        referredUserId: customer.id,
      } as any,
    });
    
    if (existing) continue;
    
    await db.promoterReferral.create({
      data: {
        promoterId: promoter.id,
        referredUserId: customer.id,
        promoCode: promoter.referralCode,
        firstBookingAt: Math.random() > 0.5 ? new Date() : undefined,
      } as any,
    });
    
    stats.promoterReferrals++;
  }
  
  console.log(`✅ Created ${stats.promoterReferrals} promoter referrals`);
}

// ═════════════════════════════════════════════════════════════
// PHASE 4: MEMBER WALLETS
// ═════════════════════════════════════════════════════════════

async function seedMemberWallets() {
  console.log('\n💳 Seeding Member Wallets...');
  
  const members = await db.user.findMany({
    where: { role: 'MEMBER' } as any,
    take: 20,
    select: { id: true },
  });
  
  for (const member of members) {
    const existing = await db.prestixWallet.findFirst({
      where: { userId: member.id } as any
    });
    
    if (existing) {
      console.log(`    ℹ️  Wallet for user ${member.id} already exists, skipping`);
      continue;
    }
    
    await db.prestixWallet.create({
      data: {
        userId: member.id,
        balance: Math.floor(Math.random() * 5000) + 100,
        pendingBalance: Math.floor(Math.random() * 500),
        currency: 'AUD',
        status: 'ACTIVE',
      },
    });
    
    stats.memberWallets++;
  }
  
  console.log(`✅ Created ${stats.memberWallets} member wallets`);
}

async function seedMemberWalletTransactions() {
  console.log('\n💸 Seeding Wallet Transactions...');
  
  const wallets = await db.prestixWallet.findMany({
    select: { id: true, balance: true },
  });
  
  const types = ['BOOKING_PAYMENT', 'WITHDRAWAL', 'REFUND', 'WELCOME_CREDIT', 'COMMISSION_EARNED'];
  const desc = {
    BOOKING_PAYMENT: 'Booking payment',
    WITHDRAWAL: 'Withdrawal',
    REFUND: 'Refund',
    WELCOME_CREDIT: 'Welcome credit',
    COMMISSION_EARNED: 'Commission earned',
  };
  
  for (const wallet of wallets) {
    const txCount = Math.floor(Math.random() * 5) + 2;
    let balance = typeof wallet.balance === 'number' ? wallet.balance : parseFloat(wallet.balance as unknown as string);
    
    for (let i = 0; i < txCount; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const amount = Math.floor(Math.random() * 500) + 50;
      
      if (type === 'WITHDRAWAL' || type === 'BOOKING_PAYMENT') {
        balance -= amount;
      } else {
        balance += amount;
      }
      
      await db.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type,
          amount,
          currency: 'AUD',
          balance: Math.max(0, balance),
          referenceType: type === 'BOOKING_PAYMENT' ? 'BOOKING' : undefined,
          description: desc[type as keyof typeof desc] || undefined,
        } as any,
      });
      
      stats.walletTransactions++; 
    }
  }
  
  console.log(`✅ Created ${stats.walletTransactions} transactions`);
}

// ═════════════════════════════════════════════════════════════
// PHASE 5: ANALYTICS & REVIEWS
// ═════════════════════════════════════════════════════════════

async function seedHostPayouts() {
  console.log('\n💰 Seeding Host Payouts...');
  
  const hosts = await db.hostProfile.findMany({
    where: { status: 'ACTIVE', isActive: true } as any,
    take: 10,
    select: { id: true },
  });
  
  if (hosts.length === 0) {
    console.log('    ℹ️  No verified hosts found, skipping');
    return;
  }
  
  const statuses = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'];
  const methods = ['stripe_transfer', 'bank_transfer', 'crypto'];
  
  for (const host of hosts) {
    const count = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < count; i++) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      await db.hostPayout.create({
        data: {
          hostId: host.id,
          amount: Math.floor(Math.random() * 2000) + 500,
          currency: 'AUD',
          method: methods[Math.floor(Math.random() * methods.length)],
          status,
          processedAt: status === 'COMPLETED' ? new Date() : undefined,
          transactionRef: status === 'COMPLETED' ? `TXN${Math.random().toString(36).substring(2, 10).toUpperCase()}` : undefined,
        } as any,
      });
      
      stats.hostPayouts++;
    }
  }
  
  console.log(`✅ Created ${stats.hostPayouts} host payouts`);
}

async function seedVenueReviews() {
  console.log('\n⭐ Seeding Venue Reviews...');
  
  const bookings = await db.booking.findMany({
    where: { status: 'CONFIRMED' } as any,
    take: 30,
    select: { id: true, venueId: true, memberId: true },
  });
  
  const titles = [
    'Amazing night out!',
    'Perfect venue',
    'Great service',
    'Would come back',
  ];
  
  const reviews = [
    'Staff was attentive and ambience was perfect.',
    'Great venue, excellent experience.',
    'Beautiful venue with amazing service.',
  ];
  
  for (const booking of bookings) {
    if (Math.random() > 0.5) continue;
    
    const existing = await db.venueReview.findFirst({
      where: { bookingId: booking.id } as any
    });
    
    if (existing) continue;
    
    const rating = Math.floor(Math.random() * 3) + 3;
    
    await db.venueReview.create({
      data: {
        venueId: booking.venueId,
        memberId: booking.memberId,
        bookingId: booking.id,
        overallRating: rating,
        serviceRating: Math.floor(Math.random() * 3) + 3,
        ambienceRating: Math.floor(Math.random() * 3) + 3,
        valueRating: Math.floor(Math.random() * 3) + 3,
        title: titles[Math.floor(Math.random() * titles.length)],
        content: reviews[Math.floor(Math.random() * reviews.length)],
        photos: [],
        isVerified: true,
        isApproved: true,
      } as any,
    });
    
    stats.venueReviews++;
  }
  
  console.log(`✅ Created ${stats.venueReviews} venue reviews`);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('🎭 PRESTIX.VIP Entertainment Module Master Seeder\n');
  console.log('==================================================\n');
  
  const phases = getPhases();
  console.log(`📋 Running phases: ${phases.join(', ')}\n`);
  
  try {
    // Phase 1: Core Entities
    if (phases.includes(1)) {
      console.log('\n🔷 PHASE 1: CORE ENTITIES');
      console.log('==========================');
      await seedVenueStaff();
      await seedVenueTables();
      await seedVenueAvailability();
      await seedVenueTableAvailability();
    }
    
    // Phase 2: Booking Expansion
    if (phases.includes(2)) {
      console.log('\n🔷 PHASE 2: BOOKING EXPANSION');
      console.log('=============================');
      await seedEnhancedBookings();
      await seedBookingPayments();
      await seedBookingDisputes();
    }
    
    // Phase 3: Promoter System
    if (phases.includes(3)) {
      console.log('\n🔷 PHASE 3: PROMOTER SYSTEM');
      console.log('===========================');
      await seedPromoterProfiles();
      await seedPromoterReferrals();
    }
    
    // Phase 4: Member Wallets
    if (phases.includes(4)) {
      console.log('\n🔷 PHASE 4: MEMBER WALLETS');
      console.log('==========================');
      await seedMemberWallets();
      await seedMemberWalletTransactions();
    }
    
    // Phase 5: Analytics & Reviews
    if (phases.includes(5)) {
      console.log('\n🔷 PHASE 5: ANALYTICS & REVIEWS');
      console.log('===============================');
      await seedHostPayouts();
      await seedVenueReviews();
    }
    
    // Summary
    console.log('\n\n📊 SEEDING SUMMARY');
    console.log('==================');
    console.log(`Venue Staff: ${stats.venueStaff}`);
    console.log(`Venue Tables: ${stats.venueTables}`);
    console.log(`Venue Availability: ${stats.venueAvailability}`);
    console.log(`Table Availability: ${stats.tableAvailability}`);
    console.log(`Enhanced Bookings: ${stats.enhancedBookings}`);
    console.log(`Booking Payments: ${stats.bookingPayments}`);
    console.log(`Booking Disputes: ${stats.bookingDisputes}`);
    console.log(`Promoter Profiles: ${stats.promoterProfiles}`);
    console.log(`Promoter Referrals: ${stats.promoterReferrals}`);
    console.log(`Member Wallets: ${stats.memberWallets}`);
    console.log(`Wallet Transactions: ${stats.walletTransactions}`);
    console.log(`Host Payouts: ${stats.hostPayouts}`);
    console.log(`Venue Reviews: ${stats.venueReviews}`);
    console.log('\n✅ Master seeding completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
