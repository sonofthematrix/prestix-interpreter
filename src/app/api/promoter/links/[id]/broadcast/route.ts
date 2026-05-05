import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

// POST /api/promoter/links/[id]/broadcast - Record broadcast
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const schema = z.object({
      channelId: z.string(),
      message: z.string().optional()
    });

    const body = await request.json();
    const { channelId, message } = schema.parse(body);

    const db = createClient(user);

    // Get link and verify ownership
    const link = await db.promoterMagicLink.findFirst({
      where: { id: (await params).id },
      include: { promoter: true }
    });

    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    if (link.promoter.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get channel
    const channel = await db.promoterSocialChannel.findFirst({
      where: { id: channelId, promoterId: link.promoterId }
    });

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Record broadcast
    const broadcast = await db.promoterLinkBroadcast.create({
      data: {
        linkId: link.id,
        channelId: channel.id,
        platform: channel.platform,
        message
      }
    });

    return NextResponse.json({
      success: true,
      data: broadcast
    });

  } catch (error) {
    console.error('POST /api/promoter/links/[id]/broadcast error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}