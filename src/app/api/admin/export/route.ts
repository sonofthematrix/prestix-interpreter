/**
 * GET /api/admin/export — admin only. Returns xlsx with All Users sheet and one sheet per user.
 * Data from ZenStack (User + UserProfileSetup + Subscription + PartnershipAgreement).
 * Replaces handlers/admin/export.js and users-store/profiles-store/membership-store for export.
 */

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/db";
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

const TIER_DISPLAY: Record<
  string,
  { name: string; priceMonthly: number | null; priceYearly: number | null }
> = {
  essential: { name: "Essential", priceMonthly: 25, priceYearly: 225 },
  pro: { name: "Pro", priceMonthly: 69, priceYearly: 621 },
  event_organizer: { name: "Event Organizer", priceMonthly: 199, priceYearly: 1791 },
  elite: { name: "Partner", priceMonthly: 500, priceYearly: 4500 },
};

function getMembershipRow(membership: {
  tier: string;
  billingPeriod: string | null;
  startDate: Date;
  expiryDate: Date | null;
} | null) {
  if (!membership?.tier)
    return {
      display: "",
      amountUsd: "",
      billingType: "",
      paymentDate: "",
      expiryDate: "",
      status: "",
    };
  const info = TIER_DISPLAY[membership.tier] ?? {
    name: membership.tier,
    priceMonthly: null,
    priceYearly: null,
  };
  const isYearly = membership.billingPeriod === "yearly";
  const amount = isYearly ? info.priceYearly : info.priceMonthly;
  const now = new Date();
  const expiry = membership.expiryDate ? new Date(membership.expiryDate) : null;
  const status = expiry && expiry > now ? "Active" : "Expired";
  return {
    display: info.name,
    amountUsd: amount != null ? String(amount) : "",
    billingType: isYearly ? "Yearly" : "Monthly",
    paymentDate: membership.startDate
      ? new Date(membership.startDate).toISOString().slice(0, 10)
      : "",
    expiryDate: membership.expiryDate
      ? new Date(membership.expiryDate).toISOString().slice(0, 10)
      : "",
    status,
  };
}

function safeSheetName(name: string, fallback: string): string {
  if (!name || typeof name !== "string") return fallback;
  const safe = name.replace(/[\\/*?:[\]]/g, "_").slice(0, 31);
  return safe || fallback;
}

function uniqueSheetName(candidate: string, index: number, used: Set<string>): string {
  const base = safeSheetName(candidate, `User_${index + 1}`);
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  const fallback = `User_${index + 1}`;
  used.add(fallback);
  return fallback;
}

export async function GET(request: Request) {
  const user = await getCurrentUser(request as import("next/server").NextRequest);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const db = createClient(user);
    const rows = await (db as any).user.findMany({
      include: {
        profileSetup: true,
        partnershipAgreement: true,
        subscriptions: { orderBy: { startDate: "desc" } },
      },
    });

    const now = new Date();
    const usedSheetNames = new Set<string>();

    const allUsersHeaders = [
      "Email",
      "Name",
      "Last seen",
      "Admin",
      "Partner",
      "Active",
      "Has Agreement",
      "Agreement Approved",
      "Profile Type",
      "Company / Venue",
      "Role at Venue",
      "Market",
      "Event Types",
      "Volume",
      "How Heard",
      "Contact Preference",
      "Submitted At",
      "Membership",
      "Payment amount (USD)",
      "Billing type (month/year)",
      "Payment date",
      "Expiry date",
      "Membership status",
    ];

    const allUsersRows = (rows as any[]).map((u: any) => {
      const p = u.profileSetup ?? null;
      const pa = u.partnershipAgreement ?? null;
      const activeSub = (u.subscriptions ?? []).find(
        (s: any) => s.expiryDate && new Date(s.expiryDate) > now
      );
      const memRow = getMembershipRow(activeSub ?? null);
      const lastSeen = u.lastLoginAt ?? u.updatedAt;
      return [
        u.email ?? "",
        u.name ?? "",
        lastSeen ? new Date(lastSeen).toLocaleString() : "",
        u.role === "PLATFORM_ADMIN" ? "Yes" : "No",
        pa?.approved === true ? "Yes" : "No",
        u.status === "ACTIVE" ? "Yes" : "No",
        pa ? "Yes" : "No",
        pa?.approved === true ? "Yes" : "No",
        p?.profileType ?? "",
        p ? (p.companyOrHandle ?? p.venueName ?? "") : "",
        p?.roleAtVenue ?? "",
        p?.market ?? "",
        p?.eventTypes ?? "",
        p?.volume ?? "",
        p?.howHeard ?? "",
        p?.contactPreference ?? "",
        p
          ? (() => {
              const d = p.submittedAt ?? p.createdAt;
              return d ? new Date(d).toLocaleString() : "";
            })()
          : "",
        memRow.display,
        memRow.amountUsd,
        memRow.billingType,
        memRow.paymentDate,
        memRow.expiryDate,
        memRow.status,
      ];
    });

    const wb = new ExcelJS.Workbook();
    const wsAll = wb.addWorksheet("All Users");
    wsAll.addRows([allUsersHeaders, ...allUsersRows]);
    usedSheetNames.add("All Users");

    (rows as any[]).forEach((u: any, index: number) => {
      const p = u.profileSetup;
      const pa = u.partnershipAgreement;
      const activeSub = (u.subscriptions ?? []).find(
        (s: any) => s.expiryDate && new Date(s.expiryDate) > now
      );
      const memRow = getMembershipRow(activeSub ?? null);
      const lastSeen = u.lastLoginAt ?? u.updatedAt;
      const rowsForUser = [
        ["Field", "Value"],
        ["Email", u.email ?? ""],
        ["Name", u.name ?? ""],
        ["Last seen", lastSeen ? new Date(lastSeen).toLocaleString() : ""],
        ["Admin", u.role === "PLATFORM_ADMIN" ? "Yes" : "No"],
        ["Partner", pa?.approved === true ? "Yes" : "No"],
        ["Active", u.status === "ACTIVE" ? "Yes" : "No"],
        ["Has Agreement", pa ? "Yes" : "No"],
        ["Agreement Approved", pa?.approved === true ? "Yes" : "No"],
        ["Profile Type", p?.profileType ?? ""],
        ["Company / Handle", p?.companyOrHandle ?? ""],
        ["Venue Name", p?.venueName ?? ""],
        ["Role at Venue", p?.roleAtVenue ?? ""],
        ["Market", p?.market ?? ""],
        ["Event Types", p?.eventTypes ?? ""],
        ["Volume", p?.volume ?? ""],
        ["Investment Focus", p?.investmentFocus ?? ""],
        ["Contact Preference", p?.contactPreference ?? ""],
        ["How Heard", p?.howHeard ?? ""],
        ["Comments", p?.comments ?? ""],
        [
          "Submitted At",
          p
            ? (() => {
                const d = p.submittedAt ?? p.createdAt ?? lastSeen;
                return d ? new Date(d).toLocaleString() : "";
              })()
            : "",
        ],
        ["Membership", memRow.display],
        ["Payment amount (USD)", memRow.amountUsd],
        ["Billing type", memRow.billingType],
        ["Payment date", memRow.paymentDate],
        ["Expiry date", memRow.expiryDate],
        ["Membership status", memRow.status],
      ];
      const sheetName = uniqueSheetName(u.email ?? u.name ?? "", index, usedSheetNames);
      const ws = wb.addWorksheet(sheetName);
      ws.addRows(rowsForUser);
    });

    const buffer = await wb.xlsx.writeBuffer();
    const filename = `prestix-users-${new Date().toISOString().slice(0, 10)}.xlsx`;
    const body =
      typeof Buffer !== "undefined" ? Buffer.from(buffer) : new Uint8Array(buffer);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[api/admin/export] GET:", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
