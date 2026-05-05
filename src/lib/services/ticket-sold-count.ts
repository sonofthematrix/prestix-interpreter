import { createClient } from '../db';
import { getSystemUser } from '../utils/system-user';

/**
 * Statuses that count as "sold" tickets
 */
const SOLD_STATUSES = ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'];

/**
 * Updates the soldCount for a venue ticket based on confirmed bookings with completed payments
 */
export async function updateTicketSoldCount(ticketId: string): Promise<void> {
  try {
    const systemUser = await getSystemUser();
    const db = createClient({
      ...systemUser,
      role: "PLATFORM_ADMIN" as const,
    });

    // Count confirmed bookings with completed payments
    const soldCount = await (db as any).booking.count({
      where: {
        ticketId,
        status: { in: SOLD_STATUSES },
        payment: {
          status: 'COMPLETED'
        }
      }
    });

    // Update the ticket's soldCount
    await (db as any).venueTicket.update({
      where: { id: ticketId },
      data: { soldCount }
    });

    console.log(`Updated ticket ${ticketId} soldCount to ${soldCount}`);
  } catch (error) {
    console.error(`Failed to update soldCount for ticket ${ticketId}:`, error);
    throw error;
  }
}

/**
 * Checks if a booking status change affects sold count
 */
export function doesStatusChangeAffectSoldCount(oldStatus: string | null, newStatus: string): boolean {
  const wasSold = oldStatus && SOLD_STATUSES.includes(oldStatus);
  const isSold = SOLD_STATUSES.includes(newStatus);
  return wasSold !== isSold;
}