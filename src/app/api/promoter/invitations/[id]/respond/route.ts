import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// POST /api/promoter/invitations/[id]/respond - Accept or decline invitation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { status } = await request.json();
    
    if (!['ACCEPTED', 'DECLINED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const db = createClient(user);

    // Get promoter profile
    const promoter = await db.promoterProfile.findFirst({
      where: { userId: user.id }
    });

    if (!promoter) {
      return NextResponse.json({ error: 'Promoter profile not found' }, { status: 404 });
    }

    // Verify invitation ownership
    const invitation = await db.venueEventPromoter.findFirst({
      where: { id: (await params).id, promoterId: promoter.id }
    });

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    if (invitation.status !== 'NOMINATED') {
      return NextResponse.json({ error: 'Invitation already responded to' }, { status: 400 });
    }

    // Update status
    const updated = await db.venueEventPromoter.update({
      where: { id: (await params).id },
      data: {
        status: status as any,
        acceptedAt: status === 'ACCEPTED' ? new Date() : null
      }
    });

    return NextResponse.json({
      success: true,
      data: updated
    });

  } catch (error) {
    console.error('POST /api/promoter/invitations/[id]/respond error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}