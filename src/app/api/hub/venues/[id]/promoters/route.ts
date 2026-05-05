import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

// GET /api/hub/venues/[id]/promoters - List promoters for a venue
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const venueId = (await params).id;
    const db = createClient(user);

    // Verify venue ownership/access
    const venue = await db.venueProfile.findFirst({
      where: { id: venueId }
    });

    if (!venue) {
      return NextResponse.json({ error: 'Venue not found or access denied' }, { status: 404 });
    }

    // Get all promoter assignments for this venue
    const assignments = await db.venueEventPromoter.findMany({
      where: { venueId },
      include: {
        promoter: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                profileImageUrl: true
              }
            }
          }
        },
        event: {
          select: {
            id: true,
            name: true,
            startDateTime: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Enhance assignments with promoter data
    const enhancedAssignments = assignments.map((assignment: any) => ({
      ...assignment,
      promoter: {
        ...assignment.promoter,
        displayName: assignment.promoter.user.name,
        email: assignment.promoter.user.email,
        avatar: assignment.promoter.user.profileImageUrl,
        tier: assignment.promoter.tier,
        status: assignment.promoter.status,
        referralCode: assignment.promoter.referralCode,
        followerCount: assignment.promoter.followerCount || 0,
        totalRegistrations: assignment.promoter.totalRegistrations || 0,
        totalCommission: Number(assignment.promoter.totalPromoterEarnings || 0),
      },
      event: {
        ...assignment.event,
        formattedDate: new Date(assignment.event.startDateTime).toLocaleDateString(),
        formattedTime: new Date(assignment.event.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    }));

    return NextResponse.json({
      success: true,
      data: enhancedAssignments
    });

  } catch (error) {
    console.error('GET /api/hub/venues/[id]/promoters error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/hub/venues/[id]/promoters - Nominate a promoter
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const venueId = (await params).id;
    
    // Validate request
    const schema = z.object({
      promoterId: z.string(),
      eventId: z.string()
    });

    const body = await request.json();
    const { promoterId, eventId } = schema.parse(body);

    const db = createClient(user);

    // Verify venue ownership
    const venue = await db.venueProfile.findFirst({
      where: { id: venueId }
    });

    if (!venue) {
      return NextResponse.json({ error: 'Venue not found or access denied' }, { status: 404 });
    }

    // Check if assignment already exists
    const existing = await db.venueEventPromoter.findFirst({
      where: { venueId, eventId, promoterId }
    });

    if (existing) {
      return NextResponse.json({ error: 'Promoter already nominated for this event' }, { status: 400 });
    }

    // Create nomination
    const assignment = await db.venueEventPromoter.create({
      data: {
        venueId,
        eventId,
        promoterId,
        status: 'NOMINATED',
        nominatedBy: user.id
      }
    });

    return NextResponse.json({
      success: true,
      data: assignment
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.flatten().fieldErrors as Record<string, string[]> }, { status: 400 });
    }
    console.error('POST /api/hub/venues/[id]/promoters error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}