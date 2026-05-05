import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

// GET /api/promoter/links - List all magic links for the authenticated promoter
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = createClient(user);

    // Get promoter profile for the current user
    const promoter = await db.promoterProfile.findFirst({
      where: { userId: user.id }
    });

    if (!promoter) {
      return NextResponse.json({ error: 'Promoter profile not found' }, { status: 404 });
    }

    // Get all magic links for this promoter
    const links = await db.promoterMagicLink.findMany({
      where: { promoterId: promoter.id },
      include: {
        clickEvents: {
          select: {
            id: true,
            clickedAt: true,
            didRegister: true,
            didPurchase: true,
            country: true,
            city: true
          },
          orderBy: { clickedAt: 'desc' },
          take: 10 // Recent clicks
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate summary stats
    const stats = {
      totalLinks: links.length,
      activeLinks: links.filter((link: any) => link.isActive).length,
      totalClicks: links.reduce((sum: number, link: any) => sum + link.totalClicks, 0),
      totalConversions: links.reduce((sum: number, link: any) => sum + link.totalConversions, 0),
      totalRevenue: links.reduce((sum: number, link: any) => Number(link.totalRevenue), 0),
      totalCommission: links.reduce((sum: number, link: any) => Number(link.totalCommission), 0)
    };

    return NextResponse.json({
      success: true,
      data: {
        links,
        stats
      }
    });

  } catch (error) {
    console.error('GET /api/promoter/links error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/promoter/links - Create a new magic link
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request body
    const createSchema = z.object({
      targetName: z.string().optional(),
      targetEmail: z.string().email().optional(),
      targetPhone: z.string().optional(),
      targetInstagram: z.string().optional(),
      targetNotes: z.string().optional(),

      presetVenueId: z.string().optional(),
      presetTicketId: z.string().optional(),
      presetTableType: z.enum(['STANDARD', 'PREMIUM', 'VIP', 'VVIP']).optional(),
      presetEventDate: z.string().datetime().optional(),

      channel: z.string().optional(),
      campaignTag: z.string().optional(),
      utmSource: z.string().optional(),
      utmMedium: z.string().optional(),
      utmCampaign: z.string().optional(),

      expiresAt: z.string().datetime().optional(),
      maxUses: z.number().int().positive().optional()
    });

    const body = await request.json();
    const validatedData = createSchema.parse(body);

    const db = createClient(user);

    // Get promoter profile
    const promoter = await db.promoterProfile.findFirst({
      where: { userId: user.id }
    });

    if (!promoter) {
      return NextResponse.json({ error: 'Promoter profile not found' }, { status: 404 });
    }

    // Validate venue assignment if presetVenueId is provided
    if (validatedData.presetVenueId) {
      const venueAssignment = await db.venueEventPromoter.findFirst({
        where: {
          promoterId: promoter.id,
          venueId: validatedData.presetVenueId,
          status: 'ACCEPTED'
        }
      });

      if (!venueAssignment) {
        return NextResponse.json({
          error: 'You must be assigned to this venue to create venue-specific links'
        }, { status: 403 });
      }
    }

    // Generate cryptographically secure link token
    const linkToken = crypto.getRandomValues(new Uint8Array(32)).join('');

    // Generate short code (8 characters: PX-XXXXXX)
    const shortCode = `PX-${crypto.getRandomValues(new Uint8Array(4)).join('').toUpperCase()}`;

    // Construct full URL
    const baseUrl = process.env.NEXT_PUBLIC_HOST || 'http://localhost:3000';
    const fullUrl = `${baseUrl}/join/${shortCode}`;

    // Create the magic link
    const magicLink = await db.promoterMagicLink.create({
      data: {
        promoterId: promoter.id,
        linkToken,
        shortCode,
        fullUrl,
        referralCode: promoter.referralCode,
        ...validatedData,
        presetEventDate: validatedData.presetEventDate ? new Date(validatedData.presetEventDate) : null,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : null
      }
    });

    return NextResponse.json({
      success: true,
      data: magicLink
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation failed',
        details: error.flatten().fieldErrors as Record<string, string[]>
      }, { status: 400 });
    }

    console.error('POST /api/promoter/links error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}