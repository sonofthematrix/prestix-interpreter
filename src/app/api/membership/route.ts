/**
 * GET /api/membership — current user's membership (tier, expiryDate). Requires auth.
 * POST /api/membership — record a membership purchase (tier, billingPeriod). Requires auth.
 * Uses ZenStack Subscription; replaces membership-store and handlers/membership.js.
 */

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const VALID_TIERS = ["essential", "pro", "event_organizer", "elite"] as const;
const VALID_BILLING = ["monthly", "yearly"] as const;

function emptyMembership() {
  return NextResponse.json({
    tier: null,
    billingPeriod: null,
    startDate: null,
    expiryDate: null,
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function GET(request: Request) {
  const user = await getCurrentUser(request as import("next/server").NextRequest);
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  try {
    const db = createClient(user);
    const subs = await (db as any).subscription.findMany({
      where: { userId: user.id },
      orderBy: { startDate: "desc" },
    });
    const now = new Date();
    const active = subs.find(
      (s: { expiryDate: Date | null }) => s.expiryDate && new Date(s.expiryDate) > now
    );
    const sub = active ?? null;
    if (!sub) {
      return NextResponse.json({
        tier: null,
        billingPeriod: null,
        startDate: null,
        expiryDate: null,
      });
    }
    return NextResponse.json({
      tier: sub.tier,
      billingPeriod: sub.billingPeriod ?? null,
      startDate: sub.startDate ? new Date(sub.startDate).toISOString() : null,
      expiryDate: sub.expiryDate ? new Date(sub.expiryDate).toISOString() : null,
    });
  } catch (err) {
    console.error("[api/membership] GET:", err);
    return emptyMembership();
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request as import("next/server").NextRequest);
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  let body: { tier?: string; billingPeriod?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "tier and billingPeriod are required (essential|pro|event_organizer|elite, monthly|yearly)" },
      { status: 400 }
    );
  }

  const tier = VALID_TIERS.includes((body.tier as (typeof VALID_TIERS)[number]) ?? "") ? body.tier! : null;
  const billingPeriod = VALID_BILLING.includes((body.billingPeriod as (typeof VALID_BILLING)[number]) ?? "") ? body.billingPeriod! : null;

  if (!tier || !billingPeriod) {
    return NextResponse.json(
      { error: "tier and billingPeriod are required (essential|pro|event_organizer|elite, monthly|yearly)" },
      { status: 400 }
    );
  }

  const startDate = new Date();
  const expiryDate = new Date(startDate);
  if (billingPeriod === "yearly") {
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
  } else {
    expiryDate.setMonth(expiryDate.getMonth() + 1);
  }

  try {
    const db = createClient(user);
    const existing = await (db as any).subscription.findFirst({
      where: { userId: user.id },
      orderBy: { startDate: "desc" },
    });

    if (existing) {
      await (db as any).subscription.update({
        where: { id: existing.id },
        data: { tier, billingPeriod, startDate, expiryDate },
      });
    } else {
      await (db as any).subscription.create({
        data: {
          userId: user.id,
          tier,
          billingPeriod,
          startDate,
          expiryDate,
        },
      });
    }

    const updated = await (db as any).subscription.findFirst({
      where: { userId: user.id },
      orderBy: { startDate: "desc" },
    });

    return NextResponse.json({
      ok: true,
      message: "Membership activated.",
      tier: updated?.tier ?? tier,
      billingPeriod: updated?.billingPeriod ?? billingPeriod,
      startDate: updated?.startDate ? new Date(updated.startDate).toISOString() : startDate.toISOString(),
      expiryDate: updated?.expiryDate ? new Date(updated.expiryDate).toISOString() : expiryDate.toISOString(),
    });
  } catch (err) {
    console.error("[api/membership] POST:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
