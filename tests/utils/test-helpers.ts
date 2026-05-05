import { createClient } from "@/lib/db";
import { getSystemUser } from "@/lib/utils/system-user";

export interface TestData {
  venue?: any;
  promoter?: any;
  event?: any;
  link?: any;
  member?: any;
  booking?: any;
  commission?: any;
}

/**
 * Create test data for promoter magic link testing
 */
export async function createTestData(): Promise<TestData> {
  const systemUser = await getSystemUser();
  const db = createClient({
    ...systemUser,
    role: "PLATFORM_ADMIN" as const
  });

  // Create test venue
  const venue = await db.venueProfile.create({
    data: {
      name: "Test Venue E2E",
      city: "Sydney",
      country: "Australia",
      userId: systemUser.id
    }
  });

  // Create test promoter user and profile
  const promoterUser = await db.user.create({
    data: {
      email: `promoter-${Date.now()}@example.com`,
      name: "Test Promoter"
    }
  });

  const promoter = await db.promoterProfile.create({
    data: {
      userId: promoterUser.id,
      tier: "BRONZE"
    }
  });

  // Create test event
  const event = await db.venueEvent.create({
    data: {
      venueId: venue.id,
      name: "Test Event E2E",
      startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      endDateTime: new Date(Date.now() + 25 * 60 * 60 * 1000)
    }
  });

  // Assign promoter to event
  await db.venueEventPromoter.create({
    data: {
      venueId: venue.id,
      eventId: event.id,
      promoterId: promoter.id,
      status: "ACCEPTED"
    }
  });

  return { venue, promoter, event };
}

/**
 * Create a test magic link
 */
export async function createTestLink(promoterId: string, venueId: string, eventId?: string) {
  const systemUser = await getSystemUser();
  const db = createClient({
    ...systemUser,
    role: "PLATFORM_ADMIN" as const
  });

  return await db.promoterMagicLink.create({
    data: {
      promoterId,
      presetVenueId: venueId,
      eventId,
      linkToken: `test-${Date.now()}`,
      shortCode: `PX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      fullUrl: `http://localhost:3000/join/PX-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      targetName: "Test User",
      targetEmail: "test@example.com"
    }
  });
}

/**
 * Create a test booking and commission
 */
export async function createTestBooking(
  venueId: string,
  memberId: string,
  amount: number = 500.00
) {
  const systemUser = await getSystemUser();
  const db = createClient({
    ...systemUser,
    role: "PLATFORM_ADMIN" as const
  });

  // Create table
  const table = await db.venueTable.create({
    data: {
      venueId,
      name: "Test Table",
      capacity: 4,
      basePrice: amount,
      currency: "AUD"
    }
  });

  // Create booking
  const booking = await db.booking.create({
    data: {
      bookingNumber: `PX-TEST-${Date.now()}`,
      memberId,
      venueId,
      bookingType: "TABLE",
      tableId: table.id,
      bookingDate: new Date(),
      startTime: "20:00",
      endTime: "02:00",
      guestCount: 2,
      totalAmount: amount,
      currency: "AUD"
    }
  });

  // Create payment
  await db.bookingPayment.create({
    data: {
      bookingId: booking.id,
      amount,
      currency: "AUD",
      status: "COMPLETED",
      stripePaymentIntentId: `pi_test_${Date.now()}`
    }
  });

  return { booking, table };
}

/**
 * Create promoter commission for a booking
 */
export async function createTestCommission(
  promoterId: string,
  bookingId: string,
  bookingAmount: number,
  promoterTier: string = "BRONZE"
) {
  const systemUser = await getSystemUser();
  const db = createClient({
    ...systemUser,
    role: "PLATFORM_ADMIN" as const
  });

  const commissionPool = bookingAmount * 0.10; // 10%
  const promoterSharePct = promoterTier === "BRONZE" ? 0.75 : 0.80;
  const platformSharePct = 1 - promoterSharePct;

  return await db.promoterCommission.create({
    data: {
      promoterId,
      bookingId,
      bookingAmount,
      poolRate: 0.10,
      commissionPool,
      promoterTier: promoterTier as any,
      promoterSharePct,
      platformSharePct,
      promoterEarning: commissionPool * promoterSharePct,
      platformPassive: commissionPool * platformSharePct,
      currency: "AUD"
    }
  });
}

/**
 * Clean up test data
 */
export async function cleanupTestData(testData: TestData) {
  const systemUser = await getSystemUser();
  const db = createClient({
    ...systemUser,
    role: "PLATFORM_ADMIN" as const
  });

  try {
    if (testData.commission) {
      await db.promoterCommission.delete({ where: { id: testData.commission.id } });
    }
    if (testData.booking) {
      await db.bookingPayment.deleteMany({ where: { bookingId: testData.booking.id } });
      await db.bookingActivity.deleteMany({ where: { bookingId: testData.booking.id } });
      await db.bookingAddOn.deleteMany({ where: { bookingId: testData.booking.id } });
      await db.booking.delete({ where: { id: testData.booking.id } });
    }
    if (testData.link) {
      await db.magicLinkClickEvent.deleteMany({ where: { linkId: testData.link.id } });
      await db.promoterLinkBroadcast.deleteMany({ where: { linkId: testData.link.id } });
      await db.promoterMagicLink.delete({ where: { id: testData.link.id } });
    }
    if (testData.event) {
      await db.venueEventPromoter.deleteMany({ where: { eventId: testData.event.id } });
      await db.venueEvent.delete({ where: { id: testData.event.id } });
    }
    if (testData.promoter) {
      await db.promoterVenuePerformance.deleteMany({ where: { promoterId: testData.promoter.id } });
      await db.promoterCommission.deleteMany({ where: { promoterId: testData.promoter.id } });
      await db.promoterReferral.deleteMany({ where: { promoterId: testData.promoter.id } });
      await db.venueEventPromoter.deleteMany({ where: { promoterId: testData.promoter.id } });
      await db.promoterSocialChannel.deleteMany({ where: { promoterId: testData.promoter.id } });
      await db.promoterMagicLink.deleteMany({ where: { promoterId: testData.promoter.id } });
      await db.promoterProfile.delete({ where: { id: testData.promoter.id } });
    }
    if (testData.venue) {
      await db.venueTable.deleteMany({ where: { venueId: testData.venue.id } });
      await db.venueEvent.deleteMany({ where: { venueId: testData.venue.id } });
      await db.venueEventPromoter.deleteMany({ where: { venueId: testData.venue.id } });
      await db.venueProfile.delete({ where: { id: testData.venue.id } });
    }
    if (testData.member) {
      await db.memberProfile.delete({ where: { id: testData.member.id } });
    }
  } catch (error) {
    console.warn("Cleanup warning:", error);
  }
}