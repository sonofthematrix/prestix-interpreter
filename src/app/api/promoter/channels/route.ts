import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

// GET /api/promoter/channels - List social channels
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

    const channels = await db.promoterSocialChannel.findMany({
      where: { promoterId: promoter.id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: channels
    });

  } catch (error) {
    console.error('GET /api/promoter/channels error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/promoter/channels - Add social channel
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const schema = z.object({
      platform: z.enum(['WHATSAPP', 'TELEGRAM', 'INSTAGRAM', 'SMS', 'EMAIL']),
      channelHandle: z.string().min(1),
      channelName: z.string().min(1),
      channelType: z.enum(['DM', 'GROUP', 'CHANNEL']).default('DM'),
      isPrimary: z.boolean().default(false)
    });

    const body = await request.json();
    const validated = schema.parse(body);

    const db = createClient(user);

    // Get promoter profile
    const promoter = await db.promoterProfile.findFirst({
      where: { userId: user.id }
    });

    if (!promoter) {
      return NextResponse.json({ error: 'Promoter profile not found' }, { status: 404 });
    }

    // Check duplicate
    const existing = await db.promoterSocialChannel.findFirst({
      where: {
        promoterId: promoter.id,
        platform: validated.platform,
        channelHandle: validated.channelHandle
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'Channel already exists' }, { status: 400 });
    }

    // Create channel
    const channel = await db.promoterSocialChannel.create({
      data: {
        promoterId: promoter.id,
        ...validated
      }
    });

    return NextResponse.json({
      success: true,
      data: channel
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.flatten().fieldErrors as Record<string, string[]> }, { status: 400 });
    }
    console.error('POST /api/promoter/channels error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}