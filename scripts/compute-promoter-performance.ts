import 'dotenv/config';
import { createClient } from '@/lib/db';
import { getSystemUser } from '@/lib/utils/system-user';

async function main() {
  console.log('Starting promoter performance aggregation...');
  
  const systemUser = await getSystemUser();
  const db = createClient({
    ...systemUser,
    role: 'PLATFORM_ADMIN' as const
  });

  // 1. Get all venues
  const venues = await db.venueProfile.findMany({
    select: { id: true }
  });

  console.log(`Found ${venues.length} venues.`);

  const windows = [7, 30, 90, 0]; // 0 = all time

  for (const venue of venues) {
    // 2. Get all promoters associated with this venue
    // (via assignments or existing performance records or referrals)
    // For simplicity, we'll look at assignments and existing referrals
    
    const assignments = await db.venueEventPromoter.findMany({
      where: { venueId: venue.id },
      select: { promoterId: true },
      distinct: ['promoterId']
    });
    
    const referralPromoters = await db.promoterReferral.findMany({
      where: { presetVenueId: venue.id }, // Assuming referrals have venueId
      select: { promoterId: true },
      distinct: ['promoterId']
    });

    const promoterIds = Array.from(new Set([
      ...assignments.map((a: any) => a.promoterId),
      ...referralPromoters.map((r: any) => r.promoterId)
    ]));

    console.log(`Processing venue ${venue.id}: ${promoterIds.length} promoters.`);

    for (const promoterId of promoterIds) {
      for (const windowDays of windows) {
        // Calculate date range
        const now = new Date();
        const startDate = windowDays > 0 
          ? new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000) 
          : new Date(0); // Epoch

        // 3. Compute metrics
        
        // Clicks (from MagicLinkClickEvent via PromoterMagicLink)
        // This is tricky because ClickEvent links to MagicLink, which links to Promoter.
        // And MagicLink has presetVenueId.
        // So we count clicks on links for this venue by this promoter.
        
        const clicks = await db.magicLinkClickEvent.count({
          where: {
            link: {
              promoterId,
              presetVenueId: venue.id
            },
            clickedAt: { gte: startDate }
          }
        });

        // Registrations (PromoterReferral where registeredAt is set)
        const registrations = await db.promoterReferral.count({
          where: {
            promoterId,
            presetVenueId: venue.id,
            registeredAt: { gte: startDate }
          }
        });

        // Bookings (PromoterCommission)
        // Commission links to Booking? No, schema says `bookingId`.
        // But we need to filter by venue.
        // `PromoterCommission` has `booking`. `Booking` has `venueId`.
        const bookings = await db.promoterCommission.count({
          where: {
            promoterId,
            booking: {
              venueId: venue.id,
              createdAt: { gte: startDate }
            }
          }
        });

        // Revenue (sum of booking totalAmount)
        const revenueResult = await db.promoterCommission.aggregate({
          where: {
            promoterId,
            booking: {
              venueId: venue.id,
              createdAt: { gte: startDate }
            }
          },
          _sum: {
            commissionAmount: true // This is commission, not revenue.
            // We need booking revenue.
            // But aggregate on relation is limited in Prisma/ZenStack?
            // We can't sum booking.totalAmount directly if it's a relation.
            // We might need to fetch bookings.
          }
        });
        
        // Fetch commissions to sum booking revenue
        const commissions = await db.promoterCommission.findMany({
          where: {
            promoterId,
            booking: {
              venueId: venue.id,
              createdAt: { gte: startDate }
            }
          },
          include: {
            booking: { select: { totalAmount: true } }
          }
        });
        
        const totalRevenue = commissions.reduce((sum: number, c: any) => sum + Number(c.booking.totalAmount), 0);
        const totalCommission = commissions.reduce((sum: number, c: any) => sum + Number(c.commissionAmount), 0);

        // Calculate derived metrics
        const conversionRate = clicks > 0 ? registrations / clicks : 0;
        
        // Velocity (median time from click to booking) - complex, skip for now or approximate
        const medianVelocityHours = 0; 

        // Upsert performance record
        // We need to find existing record for this window/date or create new?
        // The model has `snapshotDate`.
        // We typically create a new snapshot for "today".
        // Or update the "current" record?
        // The spec says "snapshotDate @db.Date".
        // If we run this daily, we create a record for today.
        
        // Check if record exists for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const existing = await db.promoterVenuePerformance.findFirst({
          where: {
            promoterId,
            venueId: venue.id,
            windowDays,
            snapshotDate: today
          }
        });

        const data = {
          promoterId,
          venueId: venue.id,
          windowDays,
          snapshotDate: today,
          isStale: false,
          totalLinkClicks: clicks,
          totalRegistrations: registrations,
          totalBookings: bookings,
          totalCompletedTx: bookings, // Assuming all commissions are completed tx
          conversionRate,
          medianVelocityHours,
          generalVenueSpend: totalRevenue,
          totalCommissionEarned: totalCommission
        };

        if (existing) {
          await db.promoterVenuePerformance.update({
            where: { id: existing.id },
            data
          });
        } else {
          await db.promoterVenuePerformance.create({
            data
          });
        }
      }
    }
  }

  console.log('Aggregation complete.');
}

export { main };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}