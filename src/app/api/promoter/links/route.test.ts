import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { GET, POST } from "./route";
import { createClient } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

describe("/api/promoter/links", () => {
  let mockDb: any;
  let mockUser: any;

  beforeEach(() => {
    mockUser = {
      id: "user-123",
      email: "promoter@example.com",
      name: "Test Promoter"
    };

    mockDb = {
      promoterProfile: {
        findFirst: vi.fn()
      },
      promoterMagicLink: {
        findMany: vi.fn(),
        create: vi.fn()
      }
    };

    vi.mocked(createClient).mockReturnValue(mockDb);
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/promoter/links", () => {
    it("returns 401 when user is not authenticated", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/promoter/links");
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });

    it("returns 404 when promoter profile not found", async () => {
      mockDb.promoterProfile.findFirst.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/promoter/links");
      const response = await GET(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("Promoter profile not found");
    });

    it("returns promoter links with stats", async () => {
      const mockPromoter = { id: "promoter-123", userId: mockUser.id };
      const mockLinks = [
        {
          id: "link-1",
          shortCode: "PX-ABC123",
          isActive: true,
          totalClicks: 10,
          totalConversions: 2,
          clickEvents: [
            { id: "click-1", clickedAt: new Date(), didRegister: true, didPurchase: false }
          ]
        }
      ];

      mockDb.promoterProfile.findFirst.mockResolvedValue(mockPromoter);
      mockDb.promoterMagicLink.findMany.mockResolvedValue(mockLinks);

      const request = new Request("http://localhost:3000/api/promoter/links");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.links).toEqual(mockLinks);
      expect(data.data.stats.totalLinks).toBe(1);
      expect(data.data.stats.activeLinks).toBe(1);
    });
  });

  describe("POST /api/promoter/links", () => {
    it("creates a new magic link successfully", async () => {
      const mockPromoter = { id: "promoter-123", userId: mockUser.id };
      const newLink = {
        id: "link-new",
        shortCode: "PX-DEF456",
        fullUrl: "https://prestix.vip/join/PX-DEF456",
        promoterId: mockPromoter.id
      };

      mockDb.promoterProfile.findFirst.mockResolvedValue(mockPromoter);
      mockDb.promoterMagicLink.create.mockResolvedValue(newLink);

      const request = new Request("http://localhost:3000/api/promoter/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presetVenueId: "venue-123",
          targetName: "John Doe",
          targetEmail: "john@example.com"
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toEqual(newLink);
    });

    it("validates required fields", async () => {
      const request = new Request("http://localhost:3000/api/promoter/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Missing required presetVenueId
          targetName: "John Doe"
        })
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Validation failed");
    });
  });
});