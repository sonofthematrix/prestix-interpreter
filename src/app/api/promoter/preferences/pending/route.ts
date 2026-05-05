import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET /api/promoter/preferences/pending - List pending preferences for the authenticated member
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = createClient(user);

    // Get member profile first
    const member = await db.memberProfile.findFirst({
      where: { userId: user.id }
    });

    if (!member) {
      return NextResponse.json({ success: true, data: [] }); // No member profile, no preferences
    }

    const pendingPrefs = await db.memberPromoterPreference.findMany({
      where: {
        memberId: member.id,
        status: 'PENDING_CHOICE'
      },
      include: {
        primaryPromoter: {
          select: {
            id: true,
            user: { select: { name: true, profileImageUrl: true } }
          }
        },
        challengerPromoter: {
          select: {
            id: true,
            user: { select: { name: true, profileImageUrl: true } }
          }
        },
        venue: { select: { name: true } },
        // event: { select: { name: true, startDateTime: true } } // If event relation exists
      }
    });

    // Format for frontend
    const formatted = pendingPrefs.map((pref: any) => ({
      id: pref.id,
      venueName: pref.venue?.name || 'Unknown Venue',
      eventName: pref.scopeDate ? `Event on ${new Date(pref.scopeDate).toLocaleDateString()}` : 'General Access',
      primaryPromoter: {
        id: pref.primaryPromoter.id,
        name: pref.primaryPromoter.user.name,
        image: pref.primaryPromoter.user.profileImageUrl
      },
      challengerPromoter: {
        id: pref.challengerPromoter.id,
        name: pref.challengerPromoter.user.name,
        image: pref.challengerPromoter.user.profileImageUrl
      },
      expiresAt: pref.resolvedDeadlineAt
    }));

    return NextResponse.json({
      success: true,
      data: formatted
    });

  } catch (error) {
    console.error('GET /api/promoter/preferences/pending error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}