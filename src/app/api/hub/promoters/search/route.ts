import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q || q.length < 3) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Use system user for search as regular users might not have permission to list all promoters
    const systemUser = await import('@/lib/utils/system-user').then(m => m.getSystemUser());
    const adminDb = createClient({
        ...systemUser,
        role: 'PLATFORM_ADMIN' as const
    });

    const promoters = await adminDb.promoterProfile.findMany({
      where: {
        OR: [
          { user: { name: { contains: q, mode: 'insensitive' } } },
          { user: { email: { contains: q, mode: 'insensitive' } } },
          { referralCode: { contains: q, mode: 'insensitive' } }
        ],
        status: 'APPROVED' // Only approved promoters
      },
      include: {
        user: { select: { id: true, name: true, email: true, profileImageUrl: true } }
      },
      take: 10
    });

    return NextResponse.json({
      success: true,
      data: promoters.map((p: any) => ({
        id: p.id,
        name: p.user.name,
        email: p.user.email,
        image: p.user.image,
        referralCode: p.referralCode
      }))
    });

  } catch (error) {
    console.error('GET /api/hub/promoters/search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}