/**
 * GET/POST /api/auth/signout — Revokes session (RevokedSession jti), clears session and admin cookies.
 * Replaces handlers/auth/signout.js and revoked-sessions-store.
 */

import { getToken } from "next-auth/jwt";
import { createClient } from "@/lib/db";
import { getSystemUser } from "@/lib/utils/system-user";
import { decodeLegacySession } from "@/lib/auth-session-legacy";
import { getSessionCookieName, isSecureCookie } from "@/lib/auth-cookie-utils";
import { ADMIN_VERIFIED_COOKIE } from "@/lib/admin-verified-cookie";
import { SESSION_COOKIE } from "@/lib/auth-session-legacy";
import { sessionManager } from "@/lib/services/session-manager";
import { logLogoutAudit } from "@/lib/services/auth-audit";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60; // 30 days, match session expiry

async function getJtiFromRequest(request: NextRequest): Promise<string | null> {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) return null;

  try {
    const token = await getToken({
      req: request,
      secret,
    });
    if (token && typeof (token as any).jti === "string") {
      return (token as any).jti;
    }
  } catch (_) {}

  const cookieHeader = request.headers.get("cookie");
  const legacy = await decodeLegacySession(cookieHeader);
  return legacy?.jti ?? null;
}

async function beforeSignOut(request: NextRequest) {
  const user = await getCurrentUserForAudit(request);
  if (!user?.id) return;
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    undefined;
  const userAgent = request.headers.get("user-agent") ?? undefined;
  try {
    await sessionManager.invalidateUserSessions(user.id);
  } catch (_) {}
  try {
    await logLogoutAudit({
      userId: user.id,
      ipAddress,
      userAgent,
    });
  } catch (_) {}
}

async function getCurrentUserForAudit(request: NextRequest) {
  try {
    const { getCurrentUser } = await import("@/lib/auth");
    return await getCurrentUser(request);
  } catch {
    return null;
  }
}

function clearAllAuthCookies(response: NextResponse) {
  const opts = {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    secure: isSecureCookie(),
    sameSite: "lax" as const,
  };
  response.cookies.set(getSessionCookieName(), "", opts);
  response.cookies.set(SESSION_COOKIE, "", opts);
  response.cookies.set(ADMIN_VERIFIED_COOKIE, "", opts);
}

export async function GET(request: NextRequest) {
  await beforeSignOut(request);

  const jti = await getJtiFromRequest(request);
  if (jti) {
    try {
      const systemUser = await getSystemUser();
      const adminContext = { ...systemUser, role: "PLATFORM_ADMIN" as const };
      const db = createClient(adminContext);
      await (db as any).revokedSession.create({
        data: {
          jti,
          expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SEC * 1000),
        },
      });
    } catch (err) {
      console.error("[api/auth/signout] RevokedSession create:", err);
    }
  }

  const origin =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    (request.headers.get("x-forwarded-host")
      ? `${request.headers.get("x-forwarded-proto") === "https" ? "https" : "http"}://${request.headers.get("x-forwarded-host")}`
      : "https://prestix.vip");
  const callbackUrl =
    (request.nextUrl.searchParams.get("callbackUrl") as string) || `${origin}/account`;

  const res = NextResponse.redirect(callbackUrl, 302);
  clearAllAuthCookies(res);
  return res;
}

export async function POST(request: NextRequest) {
  await beforeSignOut(request);

  const jti = await getJtiFromRequest(request);
  if (jti) {
    try {
      const systemUser = await getSystemUser();
      const adminContext = { ...systemUser, role: "PLATFORM_ADMIN" as const };
      const db = createClient(adminContext);
      await (db as any).revokedSession.create({
        data: {
          jti,
          expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SEC * 1000),
        },
      });
    } catch (err) {
      console.error("[api/auth/signout] RevokedSession create:", err);
    }
  }

  const origin =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    (request.headers.get("x-forwarded-host")
      ? `${request.headers.get("x-forwarded-proto") === "https" ? "https" : "http"}://${request.headers.get("x-forwarded-host")}`
      : "https://prestix.vip");
  const callbackUrl =
    (request.nextUrl.searchParams.get("callbackUrl") as string) || `${origin}/account`;

  const res = NextResponse.json({ success: true, redirect: callbackUrl });
  clearAllAuthCookies(res);
  return res;
}
