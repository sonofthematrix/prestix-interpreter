import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

// GET /api/promoter/links/[id] - Get a specific magic link
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = createClient(user);

    const link = await db.promoterMagicLink.findFirst({
      where: { id: (await params).id },
      include: {
        clickEvents: {
          orderBy: { clickedAt: 'desc' },
          take: 50 // More detailed view
        }
      }
    });

    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    // Verify ownership
    if (link.promoter.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: link
    });

  } catch (error) {
    console.error('GET /api/promoter/links/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/promoter/links/[id] - Update a magic link
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request body - only allow updates to certain fields
    const updateSchema = z.object({
      targetName: z.string().optional(),
      targetEmail: z.string().email().optional(),
      targetPhone: z.string().optional(),
      targetInstagram: z.string().optional(),
      targetNotes: z.string().optional(),

      channel: z.string().optional(),
      campaignTag: z.string().optional(),
      utmSource: z.string().optional(),
      utmMedium: z.string().optional(),
      utmCampaign: z.string().optional(),

      expiresAt: z.string().datetime().optional(),
      maxUses: z.number().int().positive().optional()
    });

    const body = await request.json();
    const validatedData = updateSchema.parse(body);

    const db = createClient(user);

    // Get the link first to verify ownership
    const existingLink = await db.promoterMagicLink.findFirst({
      where: { id: (await params).id }
    });

    if (!existingLink) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    // Verify ownership
    if (existingLink.promoter.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Don't allow updates to deactivated links
    if (!existingLink.isActive) {
      return NextResponse.json({ error: 'Cannot update deactivated link' }, { status: 400 });
    }

    // Update the link
    const updatedLink = await db.promoterMagicLink.update({
      where: { id: (await params).id },
      data: {
        ...validatedData,
        expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedLink
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation failed',
        details: error.flatten().fieldErrors as Record<string, string[]>
      }, { status: 400 });
    }

    console.error('PUT /api/promoter/links/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/promoter/links/[id] - Deactivate a magic link
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = createClient(user);

    // Get the link first to verify ownership
    const existingLink = await db.promoterMagicLink.findFirst({
      where: { id: (await params).id }
    });

    if (!existingLink) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    // Verify ownership
    if (existingLink.promoter.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Deactivate the link instead of deleting it (preserves analytics)
    const deactivatedLink = await db.promoterMagicLink.update({
      where: { id: (await params).id },
      data: {
        isActive: false,
        deactivatedAt: new Date(),
        deactivatedReason: 'Manually deactivated by promoter'
      }
    });

    return NextResponse.json({
      success: true,
      data: deactivatedLink
    });

  } catch (error) {
    console.error('DELETE /api/promoter/links/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}