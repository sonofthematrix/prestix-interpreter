/**
 * POST /api/admin/verify-code — admin only. Body: { code }. Validates 6-digit code against
 * ZenStack AdminVerificationCode, consumes it (deletes), and sets httpOnly cookie on success.
 * Replaces handlers/admin/verify-code.js and admin-codes-store.
 */

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/db";
import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { ADMIN_VERIFIED_COOKIE, VERIFIED_MAX_AGE_SECONDS } from "@/lib/admin-verified-cookie";
import { isSecureCookie } from "@/lib/auth-cookie-utils";

export const dynamic = "force-dynamic";

const EXPIRY_GRACE_MS = 2 * 60 * 1000; // 2 minutes grace for clock skew

export async function POST(request: Request) {
  const user = await getCurrentUser(request as import("next/server").NextRequest);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = user.id;
  if (!userId) {
    return NextResponse.json({ error: "Invalid session" }, { status: 400 });
  }

  let body: { code?: string };
  try {
    const text = await request.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    body = {};
  }
  const codeRaw = (body.code != null ? String(body.code) : "").trim().replace(/\D/g, "");
  if (codeRaw.length !== 6) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  }

  try {
    const db = createClient(user);
    const now = Date.now();
    const withGrace = new Date(now - EXPIRY_GRACE_MS);
    const records = await (db as any).adminVerificationCode.findMany({
      where: { userId, code: codeRaw },
    });
    const valid = (records as any[]).find(
      (r) => r.expiresAt && new Date(r.expiresAt).getTime() + EXPIRY_GRACE_MS >= now
    );
    if (!valid) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
    }
    await (db as any).adminVerificationCode.delete({
      where: { id: valid.id },
    });
  } catch (err) {
    console.error("[api/admin/verify-code]", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }

  const secretVal = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secretVal) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const token = await new SignJWT({ purpose: "admin_verified", sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${VERIFIED_MAX_AGE_SECONDS}s`)
    .sign(new TextEncoder().encode(secretVal));

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_VERIFIED_COOKIE, token, {
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: "lax",
    maxAge: VERIFIED_MAX_AGE_SECONDS,
    path: "/",
  });
  return res;
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
