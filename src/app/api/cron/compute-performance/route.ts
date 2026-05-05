import { NextRequest, NextResponse } from 'next/server';
import { computePromoterPerformance } from '@/lib/services/promoter-performance';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const count = await computePromoterPerformance();

    return NextResponse.json({
      success: true,
      processedCount: count
    });

  } catch (error) {
    console.error('GET /api/cron/compute-performance error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}