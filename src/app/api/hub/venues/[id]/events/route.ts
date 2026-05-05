import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET /api/hub/venues/[id]/events - List events for a venue
// Query: ?upcoming=true — only events with startDateTime >= now (for collaboration requests)
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
    const upcoming = request.nextUrl.searchParams.get('upcoming') === 'true';
    const db = createClient(user);

    const where: Record<string, unknown> = { venueId };
    if (upcoming) {
      where.startDateTime = { gte: new Date() };
    }

    const events = await db.venueEvent.findMany({
      where: where as any,
      orderBy: { startDateTime: 'asc' }
    });

    return NextResponse.json({
      success: true,
      data: events
    });

  } catch (error) {
    console.error('GET /api/hub/venues/[id]/events error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}