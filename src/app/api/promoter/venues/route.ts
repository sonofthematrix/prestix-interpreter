import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET /api/promoter/venues - List venues assigned to the authenticated promoter
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = createClient(user);

    // Get promoter profile
    const promoter = await db.promoterProfile.findFirst({
      where: { userId: user.id }
    });

    if (!promoter) {
      return NextResponse.json({ error: 'Promoter profile not found' }, { status: 404 });
    }

    // Find venues where the promoter has an ACCEPTED assignment for at least one event
    const assignments = await db.venueEventPromoter.findMany({
      where: {
        promoterId: promoter.id,
        status: 'ACCEPTED'
      },
      include: {
        venue: {
          select: {
            id: true,
            name: true,
            city: true,
            coverImage: true
          }
        }
      }
    });

    // Deduplicate venues
    const uniqueVenues = Array.from(
      new Map(assignments.map((a: any) => [a.venueId, a.venue])).values()
    );

    return NextResponse.json({
      success: true,
      data: uniqueVenues
    });

  } catch (error) {
    console.error('GET /api/promoter/venues error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}