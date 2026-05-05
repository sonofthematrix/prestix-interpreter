import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getSystemUser } from '@/lib/utils/system-user';

// POST /api/promoter/preferences/[id]/resolve - Resolve a pending preference
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { choice } = await request.json(); // 'primary' or 'challenger'
    
    if (!['primary', 'challenger'].includes(choice)) {
      return NextResponse.json({ error: 'Invalid choice' }, { status: 400 });
    }

    // Use system user for update as member cannot update preference directly
    const systemUser = await getSystemUser();
    const db = createClient({
      ...systemUser,
      role: 'PLATFORM_ADMIN' as const
    });

    // Get the preference
    const pref = await db.memberPromoterPreference.findFirst({
      where: { id: (await params).id },
      include: { member: true }
    });

    if (!pref) {
      return NextResponse.json({ error: 'Preference not found' }, { status: 404 });
    }

    // Verify ownership - member.userId must match session.user.id
    if (pref.member.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Must be PENDING_CHOICE
    if (pref.status !== 'PENDING_CHOICE') {
      return NextResponse.json({ error: 'Preference is not pending choice' }, { status: 400 });
    }

    // Resolve
    const boundPromoterId = choice === 'primary' ? pref.primaryPromoterId : pref.challengerPromoterId;
    
    // Update preference
    const updatedPref = await db.memberPromoterPreference.update({
      where: { id: pref.id },
      data: {
        status: 'BOUND',
        boundPromoterId,
        resolutionMethod: 'USER_SELECTION',
        resolvedAt: new Date(),
        boundDecayCounter: 0
      } as any
    });

    return NextResponse.json({
      success: true,
      data: updatedPref
    });

  } catch (error) {
    console.error('POST /api/promoter/preferences/[id]/resolve error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}