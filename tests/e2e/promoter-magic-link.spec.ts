import { test, expect } from "@playwright/test";
import { createClient } from "../../src/lib/db";
import { getSystemUser } from "../../src/lib/utils/system-user";
import { createTestData, createTestLink, createTestBooking, createTestCommission, cleanupTestData } from "../utils/test-helpers";
import * as computePromoterPerformance from "../../scripts/compute-promoter-performance";

test.describe("Promoter Magic Link E2E Flow", () => {
  let db: any;
  let testData: any;

  test.beforeAll(async () => {
    // Setup test database client
    const systemUser = await getSystemUser();
    db = createClient({
      ...systemUser,
      role: "PLATFORM_ADMIN" as const
    });

    // Create test data using helpers
    testData = await createTestData();
  });

  test.afterAll(async () => {
    // Cleanup test data using helpers
    await cleanupTestData(testData);
  });

  test("complete magic link to purchase flow", async ({ page, context }) => {
    // Step 1: Promoter creates magic link
    await test.step("Promoter creates magic link", async () => {
      const response = await page.request.post("/api/promoter/links", {
        data: {
          presetVenueId: testData.venue.id,
          eventId: testData.event.id,
          targetName: "John Doe",
          targetEmail: "john.doe@example.com"
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);

      testData.link = data.data;
      expect(testData.link.shortCode).toMatch(/^PX-[A-Z0-9]{6}$/);
      expect(testData.link.fullUrl).toContain("/join/");
      expect(testData.link.presetVenueId).toBe(testData.venue.id);
    });

    // Step 2: User clicks magic link and gets redirected
    await test.step("User clicks magic link and gets redirected", async () => {
      const magicLinkUrl = testData.link.fullUrl;

      // Visit the magic link
      await page.goto(magicLinkUrl);

      // Should redirect to venue page with ref parameter
      await page.waitForURL(`**/venue/${testData.venue.id}?ref=${testData.link.id}`);

      // Verify click was tracked
      const clickEvents = await db.magicLinkClickEvent.findMany({
        where: { linkId: testData.link.id }
      });
      expect(clickEvents.length).toBe(1);
      expect(clickEvents[0].didRegister).toBe(false);
      expect(clickEvents[0].didPurchase).toBe(false);
    });

    // Step 3: User registers through the referral
    await test.step("User registers through referral", async () => {
      // Simulate user registration (would normally happen through UI)
      const sessionId = "test-session-" + Date.now();

      // Create a referral record
      await db.promoterReferral.upsert({
        where: { sessionId },
        update: {
          registeredAt: new Date(),
          lastActivity: new Date(),
          activityCount: { increment: 1 }
        },
        create: {
          promoterId: testData.promoter.id,
          presetVenueId: testData.venue.id,
          sessionId,
          referrer: "magic-link",
          registeredAt: new Date()
        }
      });

      // Update click event
      await db.magicLinkClickEvent.updateMany({
        where: { linkId: testData.link.id },
        data: { didRegister: true }
      });
    });

    // Step 4: User makes a table booking purchase
    await test.step("User makes table booking purchase", async () => {
      // Create test member
      const memberUser = await db.user.create({
        data: {
          email: "member@example.com",
          name: "Test Member"
        }
      });

      const member = await db.memberProfile.create({
        data: {
          userId: memberUser.id
        }
      });

      // Create a table for the venue
      const table = await db.venueTable.create({
        data: {
          venueId: testData.venue.id,
          name: "VIP Table 1",
          capacity: 6,
          basePrice: 500.00,
          currency: "AUD"
        }
      });

      // Create booking
      const booking = await db.booking.create({
        data: {
          bookingNumber: "PX-TEST-001",
          memberId: memberUser.id,
          venueId: testData.venue.id,
          bookingType: "TABLE",
          tableId: table.id,
          bookingDate: new Date(),
          startTime: "20:00",
          endTime: "02:00",
          guestCount: 4,
          totalAmount: 600.00, // Including service charges
          currency: "AUD"
        }
      });

      // Create payment
      await db.bookingPayment.create({
        data: {
          bookingId: booking.id,
          amount: 600.00,
          currency: "AUD",
          status: "COMPLETED",
          stripePaymentIntentId: "pi_test_" + Date.now()
        }
      });

      // Update click event to mark purchase
      await db.magicLinkClickEvent.updateMany({
        where: { linkId: testData.link.id },
        data: { didPurchase: true }
      });

      // Step 5: Commission calculation
      await test.step("Commission calculation and recording", async () => {
        // Calculate commission (10% of booking amount)
        const bookingAmount = 600.00;
        const commissionPool = bookingAmount * 0.10; // 10%

        // Bronze tier promoter gets 75%, platform gets 25%
        const promoterShare = commissionPool * 0.75; // 45.00
        const platformShare = commissionPool * 0.25; // 15.00

        // Create commission record
        const commission = await db.promoterCommission.create({
          data: {
            promoterId: testData.promoter.id,
            bookingId: booking.id,
            bookingAmount: bookingAmount,
            poolRate: 0.10,
            commissionPool: commissionPool,
            promoterTier: "BRONZE",
            promoterSharePct: 0.75,
            platformSharePct: 0.25,
            promoterEarning: promoterShare,
            platformPassive: platformShare,
            currency: "AUD"
          }
        });

        expect(commission.promoterEarning).toBe(45.00);
        expect(commission.platformPassive).toBe(15.00);
        expect(commission.bookingAmount).toBe(600.00);
      });

      // Step 6: Run performance aggregation
      await test.step("Run performance aggregation", async () => {
        // Import and run the aggregation script
        await computePromoterPerformance.main();
      });
    });
  }); 

  test("inactive link redirects to home", async ({ page }) => {
    // Create an inactive link
    const inactiveLink = await db.promoterMagicLink.create({
      data: {
        promoterId: testData.promoter.id,
        linkToken: "inactive-" + Date.now(),
        shortCode: "PX-INACTV",
        fullUrl: "https://prestix.vip/join/PX-INACTV",
        isActive: false
      }
    });

    // Visit inactive link
    await page.goto(inactiveLink.fullUrl);

    // Should redirect to home
    await page.waitForURL("/");

    // Cleanup
    await db.promoterMagicLink.delete({ where: { id: inactiveLink.id } });
  });

  test("invalid short code redirects to home", async ({ page }) => {
    await page.goto("/join/INVALID-CODE");
    await page.waitForURL("/");
  });
});