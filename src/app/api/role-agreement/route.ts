/**
 * GET /api/role-agreement?role=event_organizer|promoter|influencer — check if current user has signed the agreement for that role.
 * POST /api/role-agreement — submit agreement (body: { role, agreeTerms, signatureName, extraData? }).
 * extraData: optional object with role-specific fields (organizationName, eventTypes, website, phone, address, country, comments; brandName, socialHandles, city; niche, audienceSize).
 * Used to gate Event Organizer / Promoter / Influencer membership: sign agreement first, then redirect to become-a-member with tier pre-selected.
 */

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const VALID_ROLES = ["event_organizer", "promoter", "influencer"] as const;
type RoleType = (typeof VALID_ROLES)[number];

function parseRole(role: string | null): RoleType | null {
  if (!role || !VALID_ROLES.includes(role as RoleType)) return null;
  return role as RoleType;
}

function sanitize(str: unknown, maxLen: number = 200): string {
  if (str == null) return "";
  return String(str).slice(0, maxLen).replace(/[<>]/g, "").trim();
}

const EXTRA_DATA_KEYS: Record<string, number> = {
  contactName: 200,
  email: 320,
  organizationName: 200,
  eventTypes: 200,
  website: 500,
  phone: 50,
  address: 500,
  country: 100,
  comments: 2000,
  brandName: 200,
  socialHandles: 500,
  city: 100,
  niche: 200,
  audienceSize: 50,
};

function sanitizeExtraData(obj: unknown): Record<string, string> | null {
  if (obj == null || typeof obj !== "object" || Array.isArray(obj)) return null;
  const out: Record<string, string> = {};
  for (const [k, maxLen] of Object.entries(EXTRA_DATA_KEYS)) {
    if (!(k in (obj as Record<string, unknown>))) continue;
    const v = (obj as Record<string, unknown>)[k];
    const s = sanitize(v, maxLen);
    if (s) out[k] = s;
  }
  return Object.keys(out).length ? out : null;
}

export async function GET(request: Request) {
  const user = await getCurrentUser(request as import("next/server").NextRequest);
  if (!user) {
    return NextResponse.json({ signed: false, agreedAt: null });
  }
  const { searchParams } = new URL(request.url);
  const role = parseRole(searchParams.get("role"));
  if (!role) {
    return NextResponse.json({ error: "Invalid or missing role" }, { status: 400 });
  }
  try {
    const db = createClient(user);
    const existing = await (db as any).roleAgreement.findFirst({
      where: { userId: user.id, roleType: role },
    });
    const signed = !!existing && existing.agreeTerms === true;
    return NextResponse.json({
      signed,
      agreedAt: existing?.createdAt ? new Date(existing.createdAt).toISOString() : null,
    });
  } catch (err) {
    console.error("[api/role-agreement] GET:", err);
    return NextResponse.json({ signed: false, agreedAt: null });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser(request as import("next/server").NextRequest);
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const role = parseRole(body.role as string);
  if (!role) {
    return NextResponse.json({ error: "Invalid or missing role" }, { status: 400 });
  }
  const agreeTerms = body.agreeTerms === true;
  const signatureName = sanitize(body.signatureName ?? "", 200);
  const extraData = sanitizeExtraData(body.extraData);
  if (!agreeTerms) {
    return NextResponse.json(
      { error: "You must agree to the terms to continue." },
      { status: 400 }
    );
  }
  if (!signatureName) {
    return NextResponse.json(
      { error: "Full name (signature) is required." },
      { status: 400 }
    );
  }
  try {
    const db = createClient(user);
    const existing = await (db as any).roleAgreement.findFirst({
      where: { userId: user.id, roleType: role },
    });
    if (existing) {
      await (db as any).roleAgreement.update({
        where: { id: existing.id },
        data: { agreeTerms: true, signatureName, ...(extraData != null && { extraData }) },
      });
    } else {
      await (db as any).roleAgreement.create({
        data: {
          userId: user.id,
          roleType: role,
          agreeTerms: true,
          signatureName,
          ...(extraData != null && { extraData }),
        },
      });
    }
    return NextResponse.json({ ok: true, message: "Agreement submitted." });
  } catch (err) {
    console.error("[api/role-agreement] POST:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
