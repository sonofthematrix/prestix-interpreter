import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PKCE_COOKIE = "prestix.pkce";
const PKCE_MAX_AGE = 600; // 10 min
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

function getOrigin(request: Request): string {
  // Prefer request host so redirect_uri and callbackUrl use the host the user is on (e.g. localhost when testing).
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const proto = request.headers.get("x-forwarded-proto") === "https" ? "https" : "http";
  if (host && !host.includes(":42883")) {
    const origin = `${proto}://${host}`.replace(/\/$/, "");
    if (!origin.includes("localhost:42883")) return origin;
  }

  const url = process.env.NEXTAUTH_URL;
  // ✅ CRITICAL: Validate NEXTAUTH_URL is not a database URL or Neon OAuth server
  if (url) {
    const isDatabaseUrl = url.includes('postgresql://') || 
                         url.includes('postgres://') ||
                         url.includes('mysql://') ||
                         url.includes('mongodb://') ||
                         url.includes('neon.tech') ||
                         url.includes('console.neon');
    const isNeonOAuthServer = url.includes('localhost:42883') ||
                              url.includes('127.0.0.1:42883') ||
                              url.includes(':42883') ||
                              (url.includes('/oauth/callback') && url.includes('localhost'));
    
    if (!isDatabaseUrl && !isNeonOAuthServer) {
      return url.replace(/\/$/, "");
    }
    console.error('❌ [Auth] CRITICAL: NEXTAUTH_URL is set to a database URL or Neon OAuth server instead of app URL!');
    console.error('   NEXTAUTH_URL:', url.substring(0, 50) + '...');
  }
  
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

function getRedirectUri(request: Request): string {
  return `${getOrigin(request)}/api/auth/callback/google`;
}

function generateState(): string {
  return randomBytes(32).toString("hex");
}

function generatePKCE(): { code_verifier: string; code_challenge: string } {
  const code_verifier = randomBytes(32).toString("base64url");
  const code_challenge = createHash("sha256").update(code_verifier).digest("base64url");
  return { code_verifier, code_challenge };
}

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_WEB_APP_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "Auth not configured", hint: "Set GOOGLE_WEB_APP_CLIENT_ID" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const callbackUrl = searchParams.get("callbackUrl") ?? `${getOrigin(request)}/account`;
  const state = generateState();
  const { code_verifier, code_challenge } = generatePKCE();
  const redirectUri = getRedirectUri(request);

  const pkcePayload = JSON.stringify({
    state,
    code_verifier,
    callbackUrl,
    redirect_uri: redirectUri,
  });
  const cookieValue = Buffer.from(pkcePayload).toString("base64url");
  const isProd = process.env.NODE_ENV === "production";
  const sameSite = isProd ? "None" : "Lax";
  const secure = isProd ? "; Secure" : "";

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge,
    code_challenge_method: "S256",
    access_type: "offline",
    prompt: "consent",
  });

  const url = `${GOOGLE_AUTH_URL}?${params.toString()}`;
  const res = NextResponse.redirect(url, 302);
  res.headers.set(
    "Set-Cookie",
    `${PKCE_COOKIE}=${cookieValue}; Path=/; HttpOnly; Max-Age=${PKCE_MAX_AGE}; SameSite=${sameSite}${secure}`
  );
  return res;
}
