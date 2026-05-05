import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getSystemUser } from '@/lib/utils/system-user';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: { shortCode: string } }
) {
  try {
    const shortCode = params.shortCode;
    
    // Use system user with PLATFORM_ADMIN role for privileged operations
    const systemUser = await getSystemUser();
    const db = createClient({
      ...systemUser,
      role: 'PLATFORM_ADMIN' as const
    });

    // 1. Look up the link
    const link = await db.promoterMagicLink.findFirst({
      where: { shortCode, isActive: true },
      include: { promoter: true }
    });

    if (!link) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // 2. Track click event
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const referrer = request.headers.get('referer') || null;
    
    // Generate or get session ID from cookie
    let sessionId = request.cookies.get('prestix_session_id')?.value;
    if (!sessionId) {
      sessionId = crypto.randomUUID();
    }

    await db.magicLinkClickEvent.create({
      data: {
        linkId: link.id,
        sessionId,
        ipAddress: ip,
        userAgent,
        referrer,
        clickedAt: new Date()
      }
    });

    // Increment total clicks
    await db.promoterMagicLink.update({
      where: { id: link.id },
      data: { totalClicks: { increment: 1 } }
    });

    // 3. Handle attribution logic
    // If user is logged in, we can check for conflicts immediately
    const user = await getCurrentUser(request);
    const userId = user?.id;

    if (userId) {
      // Get member profile
      const member = await db.memberProfile.findFirst({
        where: { userId }
      });

      if (member) {
        // Check for existing preference for this scope
        if (link.presetVenueId) {
          const scopeDate = link.presetEventDate;
          const bindingScope = scopeDate ? 'EVENT_DATE' : 'VENUE_OPEN';
          
          // Check if we have an existing preference
          const existingPref = await db.memberPromoterPreference.findFirst({
            where: {
              memberId: member.id,
              venueId: link.presetVenueId,
              scopeDate: scopeDate || undefined,
              bindingScope: bindingScope as any
            }
          });

          if (existingPref) {
            // If existing preference is for a DIFFERENT promoter
            if (existingPref.primaryPromoterId !== link.promoterId && existingPref.boundPromoterId !== link.promoterId) {
              // Conflict!
              // Create PENDING_CHOICE if not already in that state
              if (existingPref.status !== 'PENDING_CHOICE' && !existingPref.isLocked) {
                 await db.memberPromoterPreference.update({
                   where: { id: existingPref.id },
                   data: {
                     challengerPromoterId: link.promoterId,
                     status: 'PENDING_CHOICE',
                     resolvedDeadlineAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
                   } as any
                 });
              }
            }
          } else {
            // No existing preference, create one
            await db.memberPromoterPreference.create({
              data: {
                memberId: member.id,
                primaryPromoterId: link.promoterId,
                bindingScope: bindingScope as any,
                venueId: link.presetVenueId,
                scopeDate: scopeDate,
                status: 'BOUND', // Auto-bind if no conflict
                boundPromoterId: link.promoterId,
                resolvedAt: new Date()
              }
            });
          }
        }
      }
    }

    // 4. Redirect to destination
    let destination = '/';
    if (link.presetVenueId) {
      // Fetch venue slug
      const venue = await db.venueProfile.findUnique({
        where: { id: link.presetVenueId },
        select: { slug: true }
      });
      if (venue) {
        destination = `/venues/${venue.slug}`;
      }
    }
    
    // Append query params for tracking
    const url = new URL(destination, request.url);
    url.searchParams.set('ref', link.shortCode);
    url.searchParams.set('promoter', link.promoterId);
    
    const response = NextResponse.redirect(url);
    
    // Set session cookie if not present
    if (!request.cookies.get('prestix_session_id')) {
      response.cookies.set('prestix_session_id', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 30 // 30 days
      });
    }
    
    // Set attribution cookie
    response.cookies.set('prestix_promoter_link', link.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return response;

  } catch (error) {
    console.error('GET /join/[shortCode] error:', error);
    return NextResponse.redirect(new URL('/', request.url));
  }
}