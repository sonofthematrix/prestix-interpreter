#!/usr/bin/env tsx
/**
 * Seed Miss Fish Bali — Partner, Venue, Events, Marketplace (Prestix.vip Promoter Hub)
 *
 * Uses public-domain researched data from:
 * - https://www.missfishbali.com/
 * - Miss Fish Bali: Jalan Raya Semat No. 4, Tibubeneng, North Kuta, Badung, Bali 80361
 * - Japanese omakase restaurant + nightclub; Berawa/Canggu; Tue–Sun 6 PM–2 AM; +62-813-9000-6477
 *
 * Schema entities: User (venue owner), VenueProfile, VenueTable, VenueTicket,
 * VenueAnnouncement, VenuePromotion, PartnershipAgreement. Optional: PromoterProfile.
 *
 * Local images: public/images/partners/missfish/{venue,marketplace,events}/
 * Run: bun run scripts/seed-missfish-partner-hub.ts  OR  npx tsx scripts/seed-missfish-partner-hub.ts
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

// ─── Public-domain constants (Miss Fish Bali) ─────────────────────────────────
const MISSFISH = {
  name: 'Miss Fish Bali',
  slug: 'miss-fish-bali',
  description:
    'Where Omakase Meets the Night. A bold fusion of Japanese precision and Bali’s after-dark energy. ' +
    'Start with elevated omakase and signature cocktails; end dancing beneath curated lights and soundscapes. ' +
    'Three spaces: omakase bar, lounge, patio. Live DJs and guest entertainers. Reservations essential.',
  venueType: 'LOUNGE' as const, // NIGHTCLUB | BAR | LOUNGE | BEACH_CLUB | ROOFTOP | DAY_CLUB
  status: 'ACTIVE' as const,
  address: 'Jalan Raya Semat No. 4, Tibubeneng, North Kuta',
  city: 'Bali',
  country: 'Indonesia',
  latitude: -8.6500,
  longitude: 115.1333,
  phone: '+62-813-9000-6477',
  email: 'reservations@missfishbali.com',
  website: 'https://www.missfishbali.com',
  instagramHandle: 'missfishbali',
  operatingHours: {
    Tuesday: { open: '18:00', close: '02:00' },
    Wednesday: { open: '18:00', close: '02:00' },
    Thursday: { open: '18:00', close: '02:00' },
    Friday: { open: '18:00', close: '02:00' },
    Saturday: { open: '18:00', close: '02:00' },
    Sunday: { open: '18:00', close: '02:00' },
    Monday: null,
  },
  minAge: 18,
  currency: 'IDR',
  // Images (relative to public/); local assets in public/images/partners/missfish/
  coverImage: '/images/partners/missfish/venue/bar/missfish_nightclub_neon_sign.jpg',
  logoImage: '/images/partners/missfish/marketplace/promoters/missfish_logo.jpg',
  galleryImages: [
    '/images/partners/missfish/venue/bar/missfish_nightclub_neon_sign.jpg',
    '/images/partners/missfish/venue/bar/missfish_bartender_pouring.jpg',
    '/images/partners/missfish/venue/food/missfish_japanese_fine_dining_spread.jpg',
    '/images/partners/missfish/venue/food/missfish_gourmet_nigiri_platter_condiments.jpg',
    '/images/partners/missfish/venue/food/missfish_fine_dining_experience.jpg',
    '/images/partners/missfish/venue/food/missfish_sushi_garnish_preparation.jpg',
    '/images/partners/missfish/events/parties/missfish_nightlife_dancing.jpg',
    '/images/partners/missfish/events/parties/missfish_shes_with_us_nightlife_scene.jpg',
    '/images/partners/missfish/marketplace/promoters/missfish_dj_performance.jpg',
  ],
};

// Table types and indicative prices (IDR) — table booking, book tables
const TABLES = [
  {
    name: 'Lounge Standard',
    tableNumber: 'L1',
    tableType: 'STANDARD' as const,
    description: 'Lounge seating with bottle service and mixers.',
    minCapacity: 2,
    maxCapacity: 6,
    basePrice: 2_500_000,
    minimumSpend: 4_000_000,
    currency: 'IDR',
    inclusions: ['Bottle service', 'Mixers', 'Entry', 'Dedicated server'],
    availableAddOns: [
      { name: 'Champagne upgrade', price: 1_500_000, required: false, category: 'BEVERAGE' },
      { name: 'Extra bottle', price: 2_000_000, required: false, category: 'BEVERAGE' },
    ],
    location: 'Lounge',
    images: ['/images/partners/missfish/events/parties/missfish_party_nightlife_patron.jpg'],
    features: ['Lounge', 'Bottle service'],
    sortOrder: 0,
  },
  {
    name: 'Premium Booth',
    tableNumber: 'PB1',
    tableType: 'PREMIUM' as const,
    description: 'Premium booth with prime view and dedicated host.',
    minCapacity: 4,
    maxCapacity: 10,
    basePrice: 6_000_000,
    minimumSpend: 10_000_000,
    currency: 'IDR',
    inclusions: ['Premium bottle service', 'Champagne', 'VIP Entry', 'Dedicated host', 'Mixers'],
    availableAddOns: [
      { name: 'Magnum', price: 5_000_000, required: false, category: 'BEVERAGE' },
      { name: 'Cake', price: 500_000, required: false, category: 'FOOD' },
    ],
    location: 'Main floor',
    images: ['/images/partners/missfish/marketplace/promoters/missfish_shes_with_us_women_group.jpg'],
    features: ['Premium', 'Bottle service', 'View'],
    sortOrder: 1,
  },
  {
    name: 'Omakase Counter (Chef’s Bar)',
    tableNumber: 'OM1',
    tableType: 'PREMIUM' as const,
    description: 'Chef’s bar omakase experience — curated tasting journey.',
    minCapacity: 2,
    maxCapacity: 8,
    basePrice: 1_500_000,
    minimumSpend: null,
    currency: 'IDR',
    inclusions: ['Omakase tasting', 'Chef’s selection', 'Non-alcoholic pairing option'],
    availableAddOns: [
      { name: 'Sake pairing', price: 800_000, required: false, category: 'BEVERAGE' },
      { name: 'Cocktail pairing', price: 600_000, required: false, category: 'BEVERAGE' },
    ],
    location: 'Omakase bar',
    images: ['/images/partners/missfish/venue/food/missfish_gourmet_nigiri_platter_condiments.jpg'],
    features: ['Omakase', 'Chef’s bar', 'Fine dining'],
    sortOrder: 2,
  },
];

// Event tickets (parties / events) — official flyers as first image (poster), then gallery
function getEventTickets(venueId: string) {
  const now = new Date();
  const nextWed = new Date(now);
  nextWed.setDate(now.getDate() + ((3 + 7 - now.getDay()) % 7) || 7);
  nextWed.setHours(21, 30, 0, 0);

  // Specific event dates from official flyers (Miss Fish Bali)
  const sundazeDate = new Date(now.getFullYear(), 1, 4, 21, 30, 0);   // Sunday 4th February, 9:30 PM
  const escapeDate = new Date(now.getFullYear(), 7, 1, 21, 30, 0);    // Thursday 1st August, 9:30 PM
  const fabioRaffaDate = new Date(now.getFullYear(), 0, 10, 21, 30, 0); // Wednesday 10th January, 9:30 PM

  const img = (p: string) => `/images/partners/missfish/${p}`;
  return [
    {
      venueId,
      name: 'International Series',
      description:
        'Miss Fish presents International Series — dynamic Wednesday showcase from 9:30 PM till late. Live DJs and curated sound.',
      eventDate: nextWed,
      isRecurring: true,
      recurringDays: ['Wednesday'],
      price: 150_000,
      currency: 'IDR',
      originalPrice: 200_000,
      totalInventory: 200,
      soldCount: 0,
      inclusions: ['Entry', 'Welcome drink'],
      images: [
        img('marketplace/promoters/missfish_dj_performance.jpg'),
        img('events/parties/missfish_nightlife_dancing.jpg'),
        img('events/parties/missfish_party_nightlife_patron.jpg'),
        img('marketplace/promoters/missfish_shes_with_us_nightlife_scene.jpg'),
      ],
      validFrom: now,
      validUntil: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
      isActive: true,
      sortOrder: 0,
    },
    {
      venueId,
      name: 'Sundaze',
      description: 'Sunday sounds by resident and guest DJs. Sounds by Wael Bin Seum Aksöz. 9:30 PM till late.',
      eventDate: sundazeDate,
      isRecurring: true,
      recurringDays: ['Sunday'],
      price: 120_000,
      currency: 'IDR',
      originalPrice: null,
      totalInventory: 150,
      soldCount: 0,
      inclusions: ['Entry'],
      images: [
        img('marketplace/promoters/missfish_sundaze_event_flyer_february_4th.jpg'),
        img('events/parties/missfish_nightlife_dancing.jpg'),
        img('events/parties/missfish_nightlife_masked_guests.jpg'),
        img('marketplace/promoters/missfish_dj_performance.jpg'),
      ],
      validFrom: now,
      validUntil: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
      isActive: true,
      sortOrder: 1,
    },
    {
      venueId,
      name: 'Escape',
      description: 'Escape night — Geco, Ankawax, Kaiser Waldon, Nico Bloom. Thursday 1st August, 9:30 PM till late. Table bookings WA +62812-3000-6677.',
      eventDate: escapeDate,
      isRecurring: false,
      recurringDays: [] as string[],
      price: 250_000,
      currency: 'IDR',
      originalPrice: 300_000,
      totalInventory: 180,
      soldCount: 0,
      inclusions: ['Entry', 'Event access'],
      images: [
        img('marketplace/promoters/missfish_escape_event_flyer_august.jpg'),
        img('events/parties/missfish_nightlife_masked_guests.jpg'),
        img('events/parties/missfish_party_nightlife_patron.jpg'),
        img('marketplace/promoters/missfish_shes_with_us_women_group.jpg'),
      ],
      validFrom: now,
      validUntil: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
      isActive: true,
      sortOrder: 2,
    },
    {
      venueId,
      name: 'Sounds by Fabio Raffa',
      description: 'Miss Fish presents sounds by Fabio Raffa. Wednesday 10th January, 9:30 PM till late. Table bookings WA +62812-3000-6477.',
      eventDate: fabioRaffaDate,
      isRecurring: false,
      recurringDays: [] as string[],
      price: 150_000,
      currency: 'IDR',
      originalPrice: 200_000,
      totalInventory: 200,
      soldCount: 0,
      inclusions: ['Entry', 'Welcome drink'],
      images: [
        img('marketplace/promoters/missfish_dj_fabio_raffa_event_flyer_january_10.jpg'),
        img('marketplace/promoters/missfish_dj_performance.jpg'),
        img('events/parties/missfish_nightlife_dancing.jpg'),
        img('events/parties/missfish_party_nightlife_patron.jpg'),
      ],
      validFrom: now,
      validUntil: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
      isActive: true,
      sortOrder: 3,
    },
  ];
}

// Venue announcements (marketing / events)
function getAnnouncements(venueId: string) {
  const now = new Date();
  return [
    {
      venueId,
      title: 'Reserve Your Night Out',
      content:
        'Limited seating, curated energy — book your perfect evening. Omakase and DJ nights. Table bookings: WA +62-813-9000-6477.',
      imageUrl: '/images/partners/missfish/venue/bar/missfish_nightclub_neon_sign.jpg',
      linkUrl: 'https://www.missfishbali.com/bookings/',
      publishAt: now,
      expiresAt: null,
      isActive: true,
    },
    {
      venueId,
      title: 'She’s With Us',
      content: 'Your front row seat to the rhythm of Miss Fish. Follow the night — tables and events.',
      imageUrl: '/images/partners/missfish/marketplace/promoters/missfish_shes_with_us_women_group.jpg',
      linkUrl: 'https://www.instagram.com/missfishbali/',
      publishAt: now,
      expiresAt: null,
      isActive: true,
    },
  ];
}

// ZenStack v3: use findFirst + create/update instead of upsert to avoid
// validation path that can hit Zod version mismatch (z.iso.datetime).
const venuePayload = {
  name: MISSFISH.name,
  description: MISSFISH.description,
  venueType: MISSFISH.venueType,
  status: MISSFISH.status,
  address: MISSFISH.address,
  city: MISSFISH.city,
  country: MISSFISH.country,
  phone: MISSFISH.phone,
  email: MISSFISH.email,
  website: MISSFISH.website,
  instagramHandle: MISSFISH.instagramHandle,
  operatingHours: MISSFISH.operatingHours as any,
  minAge: MISSFISH.minAge,
  currency: MISSFISH.currency,
  coverImage: MISSFISH.coverImage,
  logoImage: MISSFISH.logoImage,
  galleryImages: MISSFISH.galleryImages as any,
};

async function main() {
  console.log('🐟 Miss Fish Bali — Partner Hub seed (ZenStack v3)\n');

  try {
    // ─── 1. Venue owner (User) ─────────────────────────────────────────────
    let venueOwner = await db.user.findFirst({
      where: { email: 'venue@missfishbali.com' } as any,
    });
    if (!venueOwner) {
      venueOwner = await db.user.create({
        data: {
          email: 'venue@missfishbali.com',
          name: 'Miss Fish Bali Management',
          role: 'VENUE_ADMIN',
          authMethod: 'email',
          status: 'ACTIVE',
        } as any,
      });
      console.log('✅ Venue owner created:', venueOwner.email);
    } else {
      await db.user.update({
        where: { id: venueOwner.id } as any,
        data: { role: 'VENUE_ADMIN', name: 'Miss Fish Bali Management' } as any,
      });
      console.log('✅ Venue owner found:', venueOwner.email);
    }

    // ─── 2. VenueProfile ───────────────────────────────────────────────────
    let venue = await db.venueProfile.findFirst({
      where: { slug: MISSFISH.slug } as any,
    });
    if (!venue) {
      venue = await db.venueProfile.create({
        data: {
          userId: venueOwner.id,
          slug: MISSFISH.slug,
          ...venuePayload,
          latitude: MISSFISH.latitude as any,
          longitude: MISSFISH.longitude as any,
        } as any,
      });
      console.log('✅ Venue created:', venue.name, `(${venue.slug})`);
    } else {
      await db.venueProfile.update({
        where: { id: venue.id } as any,
        data: venuePayload as any,
      });
      console.log('✅ Venue updated:', venue.name, `(${venue.slug})`);
    }

    // ─── 3. VenueTable (tables & prices) ────────────────────────────────────
    for (const t of TABLES) {
      const existing = await db.venueTable.findFirst({
        where: { venueId: venue.id, name: t.name } as any,
      });
      if (!existing) {
        await db.venueTable.create({
          data: {
            venueId: venue.id,
            name: t.name,
            tableNumber: t.tableNumber,
            tableType: t.tableType,
            description: t.description,
            minCapacity: t.minCapacity,
            maxCapacity: t.maxCapacity,
            basePrice: t.basePrice,
            minimumSpend: t.minimumSpend ?? undefined,
            currency: t.currency,
            inclusions: t.inclusions as any,
            availableAddOns: t.availableAddOns as any,
            location: t.location,
            images: t.images as any,
            features: t.features as any,
            isActive: true,
            sortOrder: t.sortOrder,
          } as any,
        });
        console.log('✅ Table:', t.name);
      }
    }

    // ─── 4. VenueTicket (events / parties) ───────────────────────────────────
    const tickets = getEventTickets(venue.id);
    for (const ticket of tickets) {
      const existing = await db.venueTicket.findFirst({
        where: { venueId: venue.id, name: ticket.name } as any,
      });
      if (!existing) {
        await db.venueTicket.create({
          data: {
            ...ticket,
            recurringDays: ticket.recurringDays as any,
            inclusions: ticket.inclusions as any,
            images: ticket.images as any,
          } as any,
        });
        console.log('✅ Event ticket:', ticket.name);
      } else {
        await db.venueTicket.update({
          where: { id: existing.id } as any,
          data: {
            description: ticket.description,
            eventDate: ticket.eventDate,
            images: ticket.images as any,
            recurringDays: ticket.recurringDays as any,
            inclusions: ticket.inclusions as any,
          } as any,
        });
        console.log('✅ Event ticket updated (poster/dates):', ticket.name);
      }
    }

    // ─── 5. VenueAnnouncement (marketing) ────────────────────────────────────
    const announcements = getAnnouncements(venue.id);
    for (const a of announcements) {
      const existing = await db.venueAnnouncement.findFirst({
        where: { venueId: venue.id, title: a.title } as any,
      });
      if (!existing) {
        await db.venueAnnouncement.create({
          data: a as any,
        });
        console.log('✅ Announcement:', a.title);
      }
    }

    // ─── 6. PartnershipAgreement (partner profile) ───────────────────────────
    // Schema allows PLATFORM_ADMIN to create (for seeding); otherwise venue owner only.
    const existingAgreement = await db.partnershipAgreement.findUnique({
      where: { userId: venueOwner.id as unknown as undefined },
    });
    const agreementData = {
      venueName: MISSFISH.name,
      contactName: 'Miss Fish Bali Management',
      email: MISSFISH.email,
      phone: MISSFISH.phone,
      venueAddress: `${MISSFISH.address}, ${MISSFISH.city}, ${MISSFISH.country} 80361`,
      country: MISSFISH.country,
      googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Miss+Fish+Bali+Berawa',
      agreeTerms: true,
      approved: true,
      approvedAt: new Date(),
      approvedBy: systemUser.id,
    };
    if (existingAgreement) {
      await db.partnershipAgreement.update({
        where: { userId: venueOwner.id as unknown as undefined },
        data: agreementData as any,
      });
      console.log('✅ Partnership agreement updated:', MISSFISH.name);
    } else {
      await db.partnershipAgreement.create({
        data: {
          userId: venueOwner.id,
          ...agreementData,
        } as any,
      });
      console.log('✅ Partnership agreement created:', MISSFISH.name);
    }

    console.log('\n🎉 Miss Fish partner hub seed complete.');
    console.log('   Venue slug:', venue.slug);
    console.log('   Tables:', TABLES.length);
    console.log('   Event tickets:', tickets.length);
    console.log('   Announcements:', announcements.length);
  } catch (e) {
    console.error('Seed failed:', e);
    process.exit(1);
  }
}

main();
