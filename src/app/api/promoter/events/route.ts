import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET /api/promoter/events - List events assigned to the authenticated promoter
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const venueId = searchParams.get('venueId');

    const db = createClient(user);

    // Get promoter profile
    const promoter = await db.promoterProfile.findFirst({
      where: { userId: user.id }
    });

    if (!promoter) {
      return NextResponse.json({ error: 'Promoter profile not found' }, { status: 404 });
    }

    const where: any = {
      promoterId: promoter.id,
      status: 'ACCEPTED',
      event: {
        startDateTime: { gt: new Date() } // Only upcoming events
      }
    };

    if (venueId) {
      where.venueId = venueId;
    }

    const assignments = await db.venueEventPromoter.findMany({
      where,
      include: {
        event: {
          select: {
            id: true,
            name: true,
            startDateTime: true,
            venue: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        event: {
          startDateTime: 'asc'
        }
      }
    });

    const events = assignments.map((a: any) => ({
      id: a.event.id,
      name: a.event.name,
      date: a.event.startDateTime,
      venueName: a.event.venue.name
    }));

    return NextResponse.json({
      success: true,
      data: events
    });

  } catch (error) {
    console.error('GET /api/promoter/events error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}