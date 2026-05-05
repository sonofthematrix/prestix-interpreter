import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import * as computePromoterPerformance from "./compute-promoter-performance.ts";
  import { createClient } from "../src/lib/db.ts";
import { getSystemUser } from "../src/lib/utils/system-user.ts";

describe("compute-promoter-performance", () => {
  let mockDb: any;
  let mockSystemUser: any;

  beforeEach(() => {
    mockSystemUser = {
      id: "system",
      email: "system@TKNZN.pro",
      role: "ADMIN"
    };

    mockDb = {
      venueProfile: {
        findMany: vi.fn()
      },
      venueEventPromoter: {
        findMany: vi.fn()
      },
      promoterReferral: {
        findMany: vi.fn(),
        count: vi.fn()
      },
      magicLinkClickEvent: {
        count: vi.fn()
      },
      promoterCommission: {
        count: vi.fn(),
        aggregate: vi.fn()
      },
      promoterVenuePerformance: {
        upsert: vi.fn()
      }
    };

    vi.mocked(createClient).mockReturnValue(mockDb);
    vi.mocked(getSystemUser).mockResolvedValue(mockSystemUser);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("main()", () => {
    it("processes all venues and promoters", async () => {
      // Mock venues
      mockDb.venueProfile.findMany.mockResolvedValue([
        { id: "venue-1" },
        { id: "venue-2" }
      ]);

      // Mock assignments and referrals
      mockDb.venueEventPromoter.findMany.mockResolvedValue([
        { promoterId: "promoter-1" }
      ]);

      mockDb.promoterReferral.findMany.mockResolvedValue([
        { promoterId: "promoter-2" }
      ]);

      // Mock performance metrics
      mockDb.magicLinkClickEvent.count.mockResolvedValue(10);
      mockDb.promoterReferral.count.mockResolvedValue(5);
      mockDb.promoterCommission.count.mockResolvedValue(2);
      mockDb.promoterCommission.aggregate.mockResolvedValue({
        _sum: { bookingAmount: 1000 }
      });

      mockDb.promoterVenuePerformance.upsert.mockResolvedValue({});

      // Run the script
      await computePromoterPerformance.main();

      // Verify calls
      expect(mockDb.venueProfile.findMany).toHaveBeenCalled();
      expect(mockDb.venueEventPromoter.findMany).toHaveBeenCalledTimes(2); // Once per venue
      expect(mockDb.promoterReferral.findMany).toHaveBeenCalledTimes(2);

      // Should upsert performance for each promoter/venue/window combination
      // 2 promoters × 2 venues × 4 windows = 16 upserts
      expect(mockDb.promoterVenuePerformance.upsert).toHaveBeenCalledTimes(16);
    });

    it("calculates correct performance metrics", async () => {
      mockDb.venueProfile.findMany.mockResolvedValue([{ id: "venue-1" }]);
      mockDb.venueEventPromoter.findMany.mockResolvedValue([{ promoterId: "promoter-1" }]);
      mockDb.promoterReferral.findMany.mockResolvedValue([]);

      // Mock metrics
      mockDb.magicLinkClickEvent.count.mockResolvedValue(25);
      mockDb.promoterReferral.count.mockResolvedValue(8);
      mockDb.promoterCommission.count.mockResolvedValue(3);
      mockDb.promoterCommission.aggregate.mockResolvedValue({
        _sum: { bookingAmount: 1500.00 }
      });

      mockDb.promoterVenuePerformance.upsert.mockResolvedValue({});

      await computePromoterPerformance.main();

      // Verify the upsert was called with correct calculated values
      expect(mockDb.promoterVenuePerformance.upsert).toHaveBeenCalledWith({
        where: {
          venueId_promoterId_windowDays_snapshotDate: {
            venueId: "venue-1",
            promoterId: "promoter-1",
            windowDays: 30,
            snapshotDate: expect.any(Date)
          }
        },
        update: {
          totalLinkClicks: 25,
          totalRegistrations: 8,
          totalBookings: 3,
          totalRevenue: 1500.00,
          conversionRate: (3 / 25) * 100, // 12%
          commissionEarned: expect.any(Number),
          lastUpdated: expect.any(Date)
        },
        create: expect.objectContaining({
          venueId: "venue-1",
          promoterId: "promoter-1",
          windowDays: 30,
          totalLinkClicks: 25,
          totalRegistrations: 8,
          totalBookings: 3,
          totalRevenue: 1500.00,
          conversionRate: (3 / 25) * 100
        })
      });
    });

    it("handles promoters with no activity", async () => {
      mockDb.venueProfile.findMany.mockResolvedValue([{ id: "venue-1" }]);
      mockDb.venueEventPromoter.findMany.mockResolvedValue([{ promoterId: "promoter-1" }]);
      mockDb.promoterReferral.findMany.mockResolvedValue([]);

      // No activity
      mockDb.magicLinkClickEvent.count.mockResolvedValue(0);
      mockDb.promoterReferral.count.mockResolvedValue(0);
      mockDb.promoterCommission.count.mockResolvedValue(0);
      mockDb.promoterCommission.aggregate.mockResolvedValue({
        _sum: { bookingAmount: 0 }
      });

      mockDb.promoterVenuePerformance.upsert.mockResolvedValue({});

      await computePromoterPerformance.main();

      expect(mockDb.promoterVenuePerformance.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            totalLinkClicks: 0,
            totalRegistrations: 0,
            totalBookings: 0,
            totalRevenue: 0,
            conversionRate: 0,
            commissionEarned: 0
          })
        })
      );
    });
  });
});