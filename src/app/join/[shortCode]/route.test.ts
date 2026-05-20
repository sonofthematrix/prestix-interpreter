import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { createClient } from '@/lib/db';
import { getSystemUser } from '@/lib/utils/system-user';

describe("/join/[shortCode]", () => {
  let mockDb: any;
  let mockSystemUser: any;

  beforeEach(() => {
    mockSystemUser = {
      id: "system",
      email: "system@TKNZN.pro",
      role: "ADMIN"
    };

    mockDb = {
      promoterMagicLink: {
        findFirst: vi.fn()
      },
      magicLinkClickEvent: {
        create: vi.fn()
      },
      promoterReferral: {
        findFirst: vi.fn(),
        upsert: vi.fn()
      }
    };

    vi.mocked(createClient).mockReturnValue(mockDb);
    vi.mocked(getSystemUser).mockResolvedValue(mockSystemUser);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /join/[shortCode]", () => {
    it("redirects to home when link not found", async () => {
      mockDb.promoterMagicLink.findFirst.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/join/PX-ABC123');
      const response = await GET(request, { params: { shortCode: "PX-ABC123" } });

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/");
    });

    it("tracks click event and redirects to venue page", async () => {
      const mockLink = {
        id: "link-123",
        shortCode: "PX-ABC123",
        isActive: true,
        presetVenueId: "venue-123",
        promoter: { id: "promoter-123" }
      };

      mockDb.promoterMagicLink.findFirst.mockResolvedValue(mockLink);
      mockDb.magicLinkClickEvent.create.mockResolvedValue({ id: "click-123" });
      mockDb.promoterReferral.findFirst.mockResolvedValue(null);
      mockDb.promoterReferral.upsert.mockResolvedValue({ id: "referral-123" });

      const request = new NextRequest('http://localhost:3000/join/PX-ABC123', {
        headers: {
          'user-agent': 'Mozilla/5.0',
          'x-forwarded-for': '192.168.1.1',
          referer: 'https://facebook.com',
        },
      });

      const response = await GET(request, { params: { shortCode: "PX-ABC123" } });

      expect(mockDb.magicLinkClickEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          linkId: "link-123",
          ipAddress: "192.168.1.1",
          userAgent: "Mozilla/5.0",
          referrer: "https://facebook.com"
        })
      });

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/venue/venue-123?ref=link-123");
    });

    it("handles expired links", async () => {
      const mockLink = {
        id: "link-123",
        shortCode: "PX-ABC123",
        isActive: false, // Expired
        presetVenueId: "venue-123",
        promoter: { id: "promoter-123" }
      };

      mockDb.promoterMagicLink.findFirst.mockResolvedValue(mockLink);

      const request = new NextRequest('http://localhost:3000/join/PX-ABC123');
      const response = await GET(request, { params: { shortCode: "PX-ABC123" } });

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/");
    });

    it("creates promoter referral for new visitor", async () => {
      const mockLink = {
        id: "link-123",
        shortCode: "PX-ABC123",
        isActive: true,
        presetVenueId: "venue-123",
        promoter: { id: "promoter-123" }
      };

      mockDb.promoterMagicLink.findFirst.mockResolvedValue(mockLink);
      mockDb.magicLinkClickEvent.create.mockResolvedValue({ id: "click-123" });
      mockDb.promoterReferral.findFirst.mockResolvedValue(null);
      mockDb.promoterReferral.upsert.mockResolvedValue({ id: "referral-123" });

      const request = new NextRequest('http://localhost:3000/join/PX-ABC123');
      await GET(request, { params: { shortCode: "PX-ABC123" } });

      expect(mockDb.promoterReferral.upsert).toHaveBeenCalledWith({
        where: { sessionId: expect.any(String) },
        update: {
          lastActivity: expect.any(Date),
          activityCount: { increment: 1 }
        },
        create: expect.objectContaining({
          promoterId: "promoter-123",
          presetVenueId: "venue-123",
          sessionId: expect.any(String),
          referrer: "direct"
        })
      });
    });
  });
});
