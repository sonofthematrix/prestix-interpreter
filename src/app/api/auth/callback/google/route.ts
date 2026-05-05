/**
 * GET /api/auth/callback/google
 * Google OAuth redirect: exchange code for tokens, upsert User in ZenStack,
 * set legacy session cookie (prestix.session), redirect to callbackUrl.
 * Replaces handlers/auth/callback/google.js and users-store for this flow.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/db";
import { getSystemUser } from "@/lib/utils/system-user";
import {
  createLegacySessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth-session-legacy";
import { isSecureCookie } from "@/lib/auth-cookie-utils";

export const dynamic = "force-dynamic";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const PKCE_COOKIE = "prestix.pkce";

function getOrigin(request: NextRequest): string {
  // Prefer request host so redirect goes back to the host that received the callback (e.g. localhost when testing).
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const proto = request.headers.get("x-forwarded-proto") === "https" ? "https" : "http";
  if (host && !host.includes(":42883")) {
    return `${proto}://${host}`.replace(/\/$/, "");
  }
  const url = process.env.NEXTAUTH_URL;
  if (url && !url.includes("postgresql") && !url.includes("neon.tech") && !url.includes(":42883")) {
    return url.replace(/\/$/, "");
  }
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export async function GET(request: NextRequest) {
  const origin = getOrigin(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${origin}/account?error=${encodeURIComponent(error)}`,
      { status: 302 }
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(`${origin}/account?error=missing_params`, { status: 302 });
  }

  const pkceVal = request.cookies.get(PKCE_COOKIE)?.value;
  if (!pkceVal) {
    return NextResponse.redirect(`${origin}/account?error=session_expired`, { status: 302 });
  }

  let pkce: { state: string; code_verifier: string; redirect_uri?: string; callbackUrl?: string };
  try {
    pkce = JSON.parse(Buffer.from(pkceVal, "base64url").toString("utf8"));
  } catch {
    return NextResponse.redirect(`${origin}/account?error=invalid_state`, { status: 302 });
  }

  if (pkce.state !== state) {
    return NextResponse.redirect(`${origin}/account?error=invalid_state`, { status: 302 });
  }

  const clientId =
    process.env.GOOGLE_WEB_APP_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret =
    process.env.GOOGLE_WEB_APP_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  }

  const redirectUri = pkce.redirect_uri || `${origin}/api/auth/callback/google`;
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    code_verifier: pkce.code_verifier,
  });

  let tokenRes: Response;
  try {
    tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
  } catch (err) {
    console.error("[auth/callback/google] Token request failed", err);
    return NextResponse.redirect(`${origin}/account?error=token_request_failed`, {
      status: 302,
    });
  }

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    let errorCode = "token_exchange_failed";
    try {
      const errJson = JSON.parse(text);
      if (errJson?.error) {
        errorCode = `token_exchange_${errJson.error}`;
        if (errJson.error === "invalid_grant") {
          const callbackUrl = pkce.callbackUrl || `${origin}/account`;
          return NextResponse.redirect(callbackUrl, { status: 303 });
        }
      }
    } catch (_) {}
    return NextResponse.redirect(
      `${origin}/account?error=${encodeURIComponent(errorCode)}`,
      { status: 302 }
    );
  }

  const tokens = await tokenRes.json();
  const accessToken = tokens.access_token;
  if (!accessToken) {
    return NextResponse.redirect(`${origin}/account?error=no_tokens`, { status: 302 });
  }

  let userRes: Response;
  try {
    userRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (err) {
    console.error("[auth/callback/google] Userinfo failed", err);
    return NextResponse.redirect(`${origin}/account?error=userinfo_failed`, {
      status: 302,
    });
  }

  if (!userRes.ok) {
    return NextResponse.redirect(`${origin}/account?error=userinfo_failed`, {
      status: 302,
    });
  }

  const googleUser = await userRes.json();
  const email = (googleUser.email && String(googleUser.email).toLowerCase().trim()) || null;
  const name = (googleUser.name && String(googleUser.name).slice(0, 200)) || null;
  const picture = googleUser.picture ? String(googleUser.picture).slice(0, 2000) : null;

  if (!email) {
    return NextResponse.redirect(`${origin}/account?error=no_email`, { status: 302 });
  }

  const systemUser = await getSystemUser();
  const adminContext = { ...systemUser, role: "PLATFORM_ADMIN" as const };
  const db = createClient(adminContext);

  let user: { id: string; email: string | null; name: string | null; status: string; role: string | null; profileImageUrl: string | null };
  try {
    const existing = await (db as any).user.findFirst({
      where: { email },
    });
    if (existing) {
      await (db as any).user.update({
        where: { id: existing.id },
        data: {
          name: name ?? existing.name,
          profileImageUrl: picture ?? existing.profileImageUrl,
        },
      });
      user = {
        id: existing.id,
        email: existing.email,
        name: name ?? existing.name,
        status: existing.status,
        role: existing.role,
        profileImageUrl: picture ?? existing.profileImageUrl,
      };
    } else {
      const created = await (db as any).user.create({
        data: {
          email,
          name: name ?? email.split("@")[0],
          profileImageUrl: picture,
          status: "ACTIVE",
          authMethod: "email",
          role: "MEMBER",
        },
      });
      user = {
        id: created.id,
        email: created.email,
        name: created.name,
        status: created.status,
        role: created.role,
        profileImageUrl: created.profileImageUrl,
      };
    }
  } catch (err) {
    console.error("[auth/callback/google] ZenStack upsert error:", err);
    return NextResponse.redirect(`${origin}/account?error=upsert_failed`, {
      status: 302,
    });
  }

  if (user.status !== "ACTIVE") {
    const res = NextResponse.redirect(`${origin}/account?error=account_disabled`, {
      status: 302,
    });
    res.cookies.set(PKCE_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }

  const secretVal = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secretVal) {
    return NextResponse.redirect(`${origin}/account?error=config_error`, { status: 302 });
  }

  let token: string;
  try {
    token = await createLegacySessionToken({
      sub: user.id,
      id: user.id,
      email: user.email ?? undefined,
      name: user.name,
      image: user.profileImageUrl,
      role: user.role ?? undefined,
    });
  } catch (err) {
    console.error("[auth/callback/google] Session create failed", err);
    return NextResponse.redirect(`${origin}/account?error=session_failed`, {
      status: 302,
    });
  }

  const callbackUrl = pkce.callbackUrl || `${origin}/account`;
  const res = NextResponse.redirect(callbackUrl, { status: 303 });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
  res.cookies.set(PKCE_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
