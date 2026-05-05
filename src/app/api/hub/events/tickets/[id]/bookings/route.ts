/**
 * GET /api/hub/events/tickets/[id]/bookings — Get detailed booking info for a ticket
 * Returns bookings, payments, and transaction details for admin/promoter access
 */

import { createClient } from "@/lib/db";
import { getSystemUser } from "@/lib/utils/system-user";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketId } = await params;

    // Check user permissions - allow platform admins or venue admins/promoters
    const user = await getCurrentUser(request as any);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const systemUser = await getSystemUser();
    const db = createClient({
      ...systemUser,
      role: "PLATFORM_ADMIN" as const,
    });

    // Verify ticket exists and get venue info
    const ticket = await (db as any).venueTicket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        name: true,
        venueId: true,
        venue: { select: { id: true, name: true, userId: true } }
      }
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: "Ticket not found" },
        { status: 404 }
      );
    }

    // Check permissions: platform admin, venue admin, or promoter with access
    const isPlatformAdmin = user.role === 'PLATFORM_ADMIN';
    const isVenueAdmin = ticket.venue.userId === user.id;
    const isPromoter = user.role === 'PROMOTER';

    if (!isPlatformAdmin && !isVenueAdmin && !isPromoter) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    // Get all bookings for this ticket with full details
    const bookings = await (db as any).booking.findMany({
      where: { ticketId },
      include: {
        member: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true
          }
        },
        payment: {
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true,
            rail: true,
            processedAt: true,
            stripePaymentId: true
          }
        },
        promoter: {
          select: {
            id: true,
            name: true,
            tier: true,
            referralCode: true
          }
        },
        commission: {
          select: {
            id: true,
            amount: true,
            status: true,
            paidAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate summary statistics
    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter(b => ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'].includes(b.status)).length;
    const totalRevenue = bookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);
    const paidBookings = bookings.filter(b => b.payment?.status === 'COMPLETED').length;
    const paidRevenue = bookings
      .filter(b => b.payment?.status === 'COMPLETED')
      .reduce((sum, b) => sum + Number(b.totalAmount), 0);

    const summary = {
      totalBookings,
      confirmedBookings,
      paidBookings,
      totalRevenue,
      paidRevenue,
      currency: ticket.currency || 'AUD'
    };

    return NextResponse.json({
      success: true,
      data: {
        ticket: {
          id: ticket.id,
          name: ticket.name,
          venue: ticket.venue
        },
        summary,
        bookings: bookings.map(booking => ({
          id: booking.id,
          bookingNumber: booking.bookingNumber,
          status: booking.status,
          bookingDate: booking.bookingDate,
          startTime: booking.startTime,
          guestCount: booking.guestCount,
          totalAmount: booking.totalAmount,
          currency: booking.currency,
          member: booking.member,
          payment: booking.payment,
          promoter: booking.promoter,
          commission: booking.commission,
          createdAt: booking.createdAt,
          qrCode: booking.qrCode
        }))
      }
    });

  } catch (err) {
    console.error("[api/hub/events/tickets/[id]/bookings] GET:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load ticket bookings" },
      { status: 500 }
    );
  }
}