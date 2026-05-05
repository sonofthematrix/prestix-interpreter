import { createClient } from '../src/lib/db';
import { getSystemUser } from '../src/lib/utils/system-user';

async function checkTicketSales() {
  console.log('🔍 Checking ticket sales and booking data...\n');

  try {
    const systemUser = await getSystemUser();
    const db = createClient({
      ...systemUser,
      role: "PLATFORM_ADMIN" as const,
    });

    // Check venue tickets
    console.log('🎫 VENUE TICKETS:');
    const tickets = await (db as any).venueTicket.findMany({
      include: {
        venue: { select: { name: true } },
        bookings: {
          select: {
            id: true,
            status: true,
            totalAmount: true,
            bookingDate: true,
            member: { select: { email: true } }
          }
        }
      }
    });

    tickets.forEach((ticket: any) => {
      console.log(`  ${ticket.name} (${ticket.venue.name})`);
      console.log(`    Sold Count: ${ticket.soldCount}`);
      console.log(`    Total Inventory: ${ticket.totalInventory || 'unlimited'}`);
      console.log(`    Bookings: ${ticket.bookings.length}`);
      ticket.bookings.forEach((booking: any) => {
        console.log(`      - ${booking.status} | ${booking.totalAmount} ${ticket.currency} | ${booking.bookingDate} | ${booking.member.email}`);
      });
      console.log('');
    });

    // Check bookings
    console.log('📋 BOOKINGS:');
    const bookings = await (db as any).booking.findMany({
      where: {
        ticketId: { not: null }
      },
      include: {
        ticket: { select: { name: true, soldCount: true } },
        venue: { select: { name: true } },
        member: { select: { email: true } },
        payment: { select: { status: true, amount: true } }
      }
    });

    console.log(`Total ticket bookings: ${bookings.length}`);
    bookings.forEach((booking: any) => {
      console.log(`  ${booking.bookingNumber}: ${booking.ticket?.name} - ${booking.status}`);
      console.log(`    Amount: ${booking.totalAmount} ${booking.currency}`);
      console.log(`    Payment: ${booking.payment?.status || 'No payment record'}`);
      console.log(`    Ticket soldCount: ${booking.ticket?.soldCount}`);
      console.log('');
    });

    // Check for any transactions/payments
    console.log('💳 PAYMENTS:');
    const payments = await (db as any).bookingPayment.findMany({
      include: {
        booking: {
          include: {
            ticket: { select: { name: true } }
          }
        }
      }
    });

    console.log(`Total payments: ${payments.length}`);
    payments.forEach((payment: any) => {
      console.log(`  ${payment.booking.bookingNumber}: ${payment.status} | ${payment.amount} ${payment.currency}`);
      if (payment.booking.ticket) {
        console.log(`    Ticket: ${payment.booking.ticket.name}`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkTicketSales().catch(console.error);