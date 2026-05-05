import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db';
import { getSystemUser } from '@/lib/utils/system-user';

export const dynamic = 'force-dynamic';

// GET /api/cron/resolve-preferences
// Auto-resolve stale PENDING_CHOICE records
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if needed (Vercel Cron)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const systemUser = await getSystemUser();
    const db = createClient({
      ...systemUser,
      role: 'PLATFORM_ADMIN' as const
    });

    // Find all stale PENDING_CHOICE records
    const stalePreferences = await db.memberPromoterPreference.findMany({
      where: {
        status: 'PENDING_CHOICE',
        resolvedDeadlineAt: { lt: new Date() }
      }
    });

    console.log(`Found ${stalePreferences.length} stale preferences to resolve`);

    let resolvedCount = 0;

    for (const pref of stalePreferences) {
      // Resolve to FIRST_ATTRIBUTION (primaryPromoter)
      await db.memberPromoterPreference.update({
        where: { id: pref.id },
        data: {
          status: 'BOUND',
          boundPromoterId: pref.primaryPromoterId,
          resolutionMethod: 'FIRST_ATTRIBUTION', // Auto-resolved
          resolvedAt: new Date(),
          boundDecayCounter: 0
        } as any
      });
      resolvedCount++;
    }

    return NextResponse.json({
      success: true,
      resolvedCount
    });

  } catch (error) {
    console.error('GET /api/cron/resolve-preferences error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}