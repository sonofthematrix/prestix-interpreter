import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET /api/promoter/invitations - List pending nominations for the authenticated promoter
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

    const invitations = await db.venueEventPromoter.findMany({
      where: {
        promoterId: promoter.id,
        status: 'NOMINATED'
      },
      include: {
        venue: {
          select: { name: true, city: true, coverImage: true }
        },
        event: {
          select: { name: true, startDateTime: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: invitations
    });

  } catch (error) {
    console.error('GET /api/promoter/invitations error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}