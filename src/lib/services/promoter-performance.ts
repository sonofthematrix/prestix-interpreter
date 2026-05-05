import { createClient } from '@/lib/db';
import { getSystemUser } from '@/lib/utils/system-user';

export async function computePromoterPerformance() {
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
  let processedCount = 0;

  for (const venue of venues) {
    const assignments = await db.venueEventPromoter.findMany({
      where: { venueId: venue.id },
      select: { promoterId: true },
      distinct: ['promoterId']
    });
    
    const referralPromoters = await db.promoterReferral.findMany({
      where: { presetVenueId: venue.id },
      select: { promoterId: true },
      distinct: ['promoterId']
    });

    const promoterIds = Array.from(new Set([
      ...assignments.map((a: any) => a.promoterId),
      ...referralPromoters.map((r: any) => r.promoterId)
    ]));

    for (const promoterId of promoterIds) {
      for (const windowDays of windows) {
        const now = new Date();
        const startDate = windowDays > 0 
          ? new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000) 
          : new Date(0);

        const clicks = await db.magicLinkClickEvent.count({
          where: {
            link: {
              promoterId,
              presetVenueId: venue.id
            },
            clickedAt: { gte: startDate }
          }
        });

        const registrations = await db.promoterReferral.count({
          where: {
            promoterId,
            presetVenueId: venue.id,
            registeredAt: { gte: startDate }
          }
        });

        const bookings = await db.promoterCommission.count({
          where: {
            promoterId,
            booking: {
              venueId: venue.id,
              createdAt: { gte: startDate }
            }
          }
        });

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

        const conversionRate = clicks > 0 ? registrations / clicks : 0;
        const medianVelocityHours = 0; 

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
          totalCompletedTx: bookings,
          conversionRate,
          medianVelocityHours,
          generalVenueSpend: totalRevenue,
          totalCommissionEarned: totalCommission
        };

        if (existing) {
          await db.promoterVenuePerformance.update({
            where: { id: existing.id },
            data: data as any
          });
        } else {
          await db.promoterVenuePerformance.create({
            data: data as any
          });
        }
        processedCount++;
      }
    }
  }

  console.log('Aggregation complete.');
  return processedCount;
}