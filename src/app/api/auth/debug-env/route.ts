import { NextResponse } from "next/server";

/**
 * GET /api/auth/debug-env
 * Returns whether Google OAuth env vars are set (no values). Use to verify .env.local.
 * Remove or guard in production.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_WEB_APP_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret =
    process.env.GOOGLE_WEB_APP_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;

  // Same logic as api/auth/lib.js getOrigin + getRedirectUri
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  const origin = nextAuthUrl ? nextAuthUrl.replace(/\/$/, "") : null;
  const host = request.headers.get("host") || request.headers.get("x-forwarded-host");
  const proto = request.headers.get("x-forwarded-proto") === "https" ? "https" : "http";
  const effectiveOrigin = origin || (host ? `${proto}://${host}` : "http://localhost:3000");
  const redirect_uri = `${effectiveOrigin}/api/auth/callback/google`;

  return NextResponse.json({
    signin_ready: Boolean(clientId && clientSecret && secret),
    GOOGLE_WEB_APP_CLIENT_ID: clientId ? "set" : "missing",
    GOOGLE_WEB_APP_CLIENT_SECRET: clientSecret ? "set" : "missing",
    NEXTAUTH_SECRET: secret ? "set" : "missing",
    redirect_uri_for_google_console: redirect_uri,
    hint: !clientId
      ? "Add GOOGLE_WEB_APP_CLIENT_ID to .env.local and restart npm run dev"
      : !clientSecret
        ? "Add GOOGLE_WEB_APP_CLIENT_SECRET to .env.local and restart"
        : !secret
          ? "Add NEXTAUTH_SECRET to .env.local and restart"
          : "Env looks good. If you get 401 invalid_client, add redirect_uri above to Google Console → Credentials → your Web client → Authorized redirect URIs.",
  });
}
