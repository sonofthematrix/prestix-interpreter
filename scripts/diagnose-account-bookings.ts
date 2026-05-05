#!/usr/bin/env bun
/**
 * Diagnose why account page shows no bookings for a given email.
 * Usage: bun scripts/diagnose-account-bookings.ts alex@tokenizin.com
 */

import "dotenv/config";
import { createClient } from "../src/lib/db";
import { getSystemUser } from "../src/lib/utils/system-user";

const email = process.argv[2] || "alex@tokenizin.com";

async function main() {
  const systemUser = await getSystemUser();
  const db = createClient({
    ...systemUser,
    role: "PLATFORM_ADMIN" as const,
  }) as any;

  console.log("\n=== Account Bookings Diagnostic ===\n");
  console.log("Email:", email);

  // 1. Find User by email
  const user = await db.user.findFirst({
    where: {
      OR: [
        { email: { equals: email, mode: "insensitive" } },
        { email: email },
      ],
    },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user) {
    console.log("\n❌ No User found with email:", email);
    console.log("\nChecking all users with similar email...");
    const similar = await db.user.findMany({
      where: { email: { contains: email.split("@")[0], mode: "insensitive" } },
      select: { id: true, email: true, name: true },
      take: 5,
    });
    if (similar.length) {
      console.log("Similar users:", similar);
    }
    return;
  }

  console.log("\n✅ User found:", { id: user.id, email: user.email, name: user.name, role: user.role });

  // 2. Count bookings for this memberId
  const bookingCount = await db.booking.count({
    where: { memberId: user.id },
  });
  console.log("\n📋 Bookings for memberId", user.id, ":", bookingCount);

  if (bookingCount > 0) {
    const bookings = await db.booking.findMany({
      where: { memberId: user.id },
      select: {
        id: true,
        bookingNumber: true,
        bookingDate: true,
        startTime: true,
        status: true,
        totalAmount: true,
        currency: true,
        venue: { select: { name: true } },
      },
      orderBy: { bookingDate: "desc" },
      take: 10,
    });
    console.log("\nSample bookings:");
    bookings.forEach((b: any) => {
      console.log(
        `  - ${b.bookingNumber} | ${b.bookingDate} ${b.startTime} | ${b.status} | ${b.venue?.name} | ${b.totalAmount} ${b.currency}`
      );
    });
  }

  // 3. Count payments (through booking.memberId)
  const paymentCount = await db.bookingPayment.count({
    where: { booking: { memberId: user.id } },
  });
  console.log("\n💳 Payments for this member:", paymentCount);

  // 4. Total bookings in DB (any member)
  const totalBookings = await db.booking.count();
  console.log("\n📊 Total bookings in DB (all members):", totalBookings);

  // 5. List all unique memberIds in bookings
  if (totalBookings > 0 && bookingCount === 0) {
    const membersWithBookings = await db.booking.findMany({
      select: { memberId: true, member: { select: { email: true, name: true } } },
      distinct: ["memberId"],
      take: 10,
    });
    console.log("\nMembers who have bookings:");
    membersWithBookings.forEach((m: any) => {
      console.log(`  - ${m.member?.email} (${m.memberId})`);
    });
  }

  console.log("\n=== End diagnostic ===\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
