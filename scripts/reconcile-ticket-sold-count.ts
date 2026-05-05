import { createClient } from '../src/lib/db';
import { getSystemUser } from '../src/lib/utils/system-user';

async function reconcileTicketSoldCount() {
  console.log('🔄 Reconciling ticket sold counts based on confirmed bookings...\n');

  try {
    const systemUser = await getSystemUser();
    const db = createClient({
      ...systemUser,
      role: "PLATFORM_ADMIN" as const,
    });

    // Get all venue tickets
    const tickets = await (db as any).venueTicket.findMany({
      select: {
        id: true,
        name: true,
        soldCount: true,
        venue: { select: { name: true } }
      }
    });

    console.log(`Found ${tickets.length} tickets to reconcile\n`);

    let totalUpdates = 0;

    for (const ticket of tickets) {
      // Count confirmed bookings for this ticket
      const confirmedBookingsCount = await (db as any).booking.count({
        where: {
          ticketId: ticket.id,
          status: { in: ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'] }, // These statuses count as "sold"
          payment: {
            status: 'COMPLETED' // Only count bookings with completed payments
          }
        }
      });

      const currentSoldCount = ticket.soldCount || 0;

      if (confirmedBookingsCount !== currentSoldCount) {
        console.log(`📊 ${ticket.name} (${ticket.venue.name})`);
        console.log(`   Current soldCount: ${currentSoldCount}`);
        console.log(`   Actual confirmed bookings: ${confirmedBookingsCount}`);

        // Update the soldCount
        await (db as any).venueTicket.update({
          where: { id: ticket.id },
          data: { soldCount: confirmedBookingsCount }
        });

        console.log(`   ✅ Updated soldCount to ${confirmedBookingsCount}\n`);
        totalUpdates++;
      } else {
        console.log(`✅ ${ticket.name} (${ticket.venue.name}) - already correct (${confirmedBookingsCount})`);
      }
    }

    console.log(`\n🎉 Reconciliation complete! Updated ${totalUpdates} tickets.`);

    // Show final summary
    console.log('\n📈 FINAL SUMMARY:');
    const updatedTickets = await (db as any).venueTicket.findMany({
      select: {
        id: true,
        name: true,
        soldCount: true,
        venue: { select: { name: true } }
      }
    });

    updatedTickets.forEach((ticket: any) => {
      if (ticket.soldCount > 0) {
        console.log(`   ${ticket.name} (${ticket.venue.name}): ${ticket.soldCount} sold`);
      }
    });

  } catch (error) {
    console.error('❌ Error during reconciliation:', error);
  }
}

reconcileTicketSoldCount().catch(console.error);