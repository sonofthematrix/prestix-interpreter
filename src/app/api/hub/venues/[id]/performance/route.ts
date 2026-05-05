import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET /api/hub/venues/[id]/performance - Get performance data
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
    const { searchParams } = new URL(request.url);
    const windowDays = parseInt(searchParams.get('window') || '30');

    const db = createClient(user);

    // Verify venue ownership
    const venue = await db.venueProfile.findFirst({
      where: { id: venueId }
    });

    if (!venue) {
      return NextResponse.json({ error: 'Venue not found or access denied' }, { status: 404 });
    }

    // Get latest snapshot for each promoter
    // We need to group by promoterId and take the latest snapshotDate
    // But ZenStack/Prisma groupBy is limited.
    // We'll fetch for today (or latest available).
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const performance = await db.promoterVenuePerformance.findMany({
      where: {
        venueId,
        windowDays,
        snapshotDate: today
      },
      include: {
        promoter: {
          include: {
            user: { select: { name: true, email: true, profileImageUrl: true } }
          }
        }
      },
      orderBy: { totalCommissionEarned: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: performance
    });

  } catch (error) {
    console.error('GET /api/hub/venues/[id]/performance error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}