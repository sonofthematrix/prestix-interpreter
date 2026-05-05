/**
 * GET /api/admin/verify-session — Returns { verified: true } if the request has a valid admin
 * session and either a valid admin_verified cookie or a valid ?verify-code=XXXXXX (consumed, cookie set).
 * Uses ZenStack AdminVerificationCode; replaces handlers/admin/verify-session.js and admin-codes-store.
 */

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/db";
import { NextResponse } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import { ADMIN_VERIFIED_COOKIE, VERIFIED_MAX_AGE_SECONDS } from "@/lib/admin-verified-cookie";
import { isSecureCookie } from "@/lib/auth-cookie-utils";

export const dynamic = "force-dynamic";

const EXPIRY_GRACE_MS = 2 * 60 * 1000; // 2 minutes grace for clock skew

function getCodeFromQuery(request: Request): string {
  const url = new URL(request.url);
  const raw = url.searchParams.get("verify-code") ?? url.searchParams.get("verifyCode") ?? "";
  return (typeof raw === "string" ? raw : "").trim().replace(/\D/g, "");
}

export async function GET(request: Request) {
  const user = await getCurrentUser(request as import("next/server").NextRequest);
  const codeFromQuery = getCodeFromQuery(request);
  const hasCodeInUrl = codeFromQuery.length === 6;

  if (!user || user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json(
      hasCodeInUrl ? { verified: false, reason: "not_signed_in" } : { verified: false }
    );
  }

  const userId = user.id;

  // Optional: validate ?verify-code= from query (e.g. magic link from email)
  if (hasCodeInUrl) {
    try {
      const db = createClient(user);
      const records = await (db as any).adminVerificationCode.findMany({
        where: { userId, code: codeFromQuery },
      });
      const now = Date.now();
      const valid = (records as any[]).find(
        (r) => r.expiresAt && new Date(r.expiresAt).getTime() + EXPIRY_GRACE_MS >= now
      );
      if (valid) {
        await (db as any).adminVerificationCode.delete({
          where: { id: valid.id },
        });
        const secretVal = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
        if (secretVal) {
          const token = await new SignJWT({ purpose: "admin_verified", sub: userId })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime(`${VERIFIED_MAX_AGE_SECONDS}s`)
            .sign(new TextEncoder().encode(secretVal));
          const res = NextResponse.json({ verified: true });
          res.cookies.set(ADMIN_VERIFIED_COOKIE, token, {
            httpOnly: true,
            secure: isSecureCookie(),
            sameSite: "lax",
            maxAge: VERIFIED_MAX_AGE_SECONDS,
            path: "/",
          });
          return res;
        }
        return NextResponse.json({ verified: true });
      }
      if (process.env.NODE_ENV === "development") {
        console.warn("[api/admin/verify-session] code invalid or expired for userId:", userId);
      }
      return NextResponse.json({ verified: false });
    } catch (err) {
      console.error("[api/admin/verify-session]", err);
      return NextResponse.json({ verified: false });
    }
  }

  // Check existing cookie
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`${ADMIN_VERIFIED_COOKIE.replace(".", "\\.")}=([^;]+)`));
  if (!match) {
    return NextResponse.json({ verified: false });
  }

  const secretVal = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secretVal) {
    return NextResponse.json({ verified: false });
  }

  try {
    const { payload } = await jwtVerify(
      match[1],
      new TextEncoder().encode(secretVal)
    );
    if (payload?.purpose === "admin_verified" && payload?.sub) {
      return NextResponse.json({ verified: true });
    }
  } catch {
    // token invalid or expired
  }

  const res = NextResponse.json({ verified: false });
  res.cookies.set(ADMIN_VERIFIED_COOKIE, "", {
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return res;
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
