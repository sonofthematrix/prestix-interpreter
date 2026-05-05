/**
 * GET /api/partners — public. Returns list of partners with approved agreements
 * (venue name + optional logo URL) for display on the landing page.
 * Data from ZenStack PartnershipAgreement; replaces handlers/partners-list.js and users-store.
 */

import { createClient } from "@/lib/db";
import { getSystemUser } from "@/lib/utils/system-user";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const systemUser = await getSystemUser();
    const adminContext = { ...systemUser, role: "PLATFORM_ADMIN" as const };
    const db = createClient(adminContext);

    const agreements = await (db as any).partnershipAgreement.findMany({
      where: {
        approved: true,
        venueName: { not: null },
      },
      include: { user: { select: { status: true } } },
    });

    const partners = (agreements as any[])
      .filter(
        (a) =>
          a.venueName &&
          String(a.venueName).trim() &&
          a.user?.status === "ACTIVE"
      )
      .map((a) => ({
        venueName: String(a.venueName).trim(),
        logoUrl:
          a.logoUrl && String(a.logoUrl).trim()
            ? String(a.logoUrl).trim()
            : undefined,
      }));

    return NextResponse.json({ partners });
  } catch (err) {
    console.error("[api/partners] GET:", err);
    return NextResponse.json({ partners: [] }, { status: 200 });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
