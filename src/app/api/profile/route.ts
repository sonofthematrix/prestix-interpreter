import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PROFILE_TEST_TO = process.env.RESEND_TEST_TO || "";

function sanitize(str: string, maxLen = 2000): string {
  if (typeof str !== "string") return "";
  return str.slice(0, maxLen).replace(/[<>]/g, "");
}

function allowedToUpload(user: { email?: string | null } | null): boolean {
  if (!PROFILE_TEST_TO || !user?.email) return false;
  return (
    String(user.email).toLowerCase().trim() ===
    String(PROFILE_TEST_TO).toLowerCase().trim()
  );
}

/**
 * GET: return profile capabilities for the current user.
 * canUpload: true when user email matches RESEND_TEST_TO (designated test accounts).
 * canDownloadUsers / canManageUsers: true when user.role === PLATFORM_ADMIN (ZenStack).
 * No legacy handler or profiles-store; admin export already uses ZenStack User + UserProfileSetup.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser(request as import("next/server").NextRequest);
  const canUpload = allowedToUpload(user);
  const isAdmin = user?.role === "PLATFORM_ADMIN";
  return NextResponse.json({
    canUpload: !!canUpload,
    canDownloadUsers: !!isAdmin,
    canManageUsers: !!isAdmin,
  });
}

/**
 * POST: save profile questionnaire to database (ZenStack UserProfileSetup).
 * Authenticated users can create/update their own profile setup; returns 200 when saved.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser(request as import("next/server").NextRequest);
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized", saved: false, message: "Sign in to save your profile." },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    const text = await request.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON", saved: false },
      { status: 400 }
    );
  }

  const profileType = sanitize((body.profileType as string) || "", 20);
  const name = sanitize((body.name as string) || "", 200);
  const email = sanitize((body.email as string) || "", 320);
  const companyOrHandle = sanitize((body.companyOrHandle as string) || "", 200);
  const venueName = sanitize((body.venueName as string) || "", 200);
  const roleAtVenue = sanitize((body.roleAtVenue as string) || "", 100);
  const market = sanitize((body.market as string) || "", 200);
  const eventTypes = sanitize((body.eventTypes as string) || "", 500);
  const volume = sanitize((body.volume as string) || "", 100);
  const investmentFocus = sanitize((body.investmentFocus as string) || "", 500);
  const contactPreference = sanitize((body.contactPreference as string) || "", 200);
  const howHeard = sanitize((body.howHeard as string) || "", 300);
  const comments = sanitize((body.comments as string) || "", 2000);

  const data = {
    profileType: profileType || null,
    name: name || user.name || null,
    email: email || user.email || null,
    companyOrHandle: companyOrHandle || null,
    venueName: venueName || null,
    roleAtVenue: roleAtVenue || null,
    market: market || null,
    eventTypes: eventTypes || null,
    volume: volume || null,
    investmentFocus: investmentFocus || null,
    contactPreference: contactPreference || null,
    howHeard: howHeard || null,
    comments: comments || null,
  };

  try {
    const db = createClient({
      id: user.id,
      email: user.email ?? undefined,
      name: user.name ?? undefined,
      role: user.role ?? "MEMBER",
    });

    // ZenStack: upsert by unique userId (schema allows create/update when auth().id == userId)
    await (db as any).userProfileSetup.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...data },
      update: data,
    });
  } catch (err) {
    console.error("[POST /api/profile] ZenStack save error:", err);
    return NextResponse.json(
      {
        saved: false,
        error: "Failed to save profile.",
        message: err instanceof Error ? err.message : "Database error.",
      },
      { status: 500 }
    );
  }

  const canUpload = allowedToUpload(user);
  return NextResponse.json({
    saved: true,
    canUpload: !!canUpload,
    message: canUpload
      ? "Profile saved. Upload to company is available for your account."
      : "Profile saved to your account.",
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "GET, POST, OPTIONS",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}
