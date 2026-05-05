/**
 * Legacy credentials session: JWS cookie (prestix.session) with jti for revocation.
 * Used by credentials login/register; getCurrentUser falls back to this when NextAuth token is absent.
 */

import { SignJWT, jwtVerify } from "jose";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/db";

export const SESSION_COOKIE = "prestix.session";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

export interface LegacySessionPayload {
  jti: string;
  sub: string;
  id?: string;
  email?: string;
  name?: string | null;
  image?: string | null;
  role?: string;
}

export async function createLegacySessionToken(payload: {
  sub: string;
  id?: string;
  email?: string;
  name?: string | null;
  image?: string | null;
  role?: string;
}): Promise<string> {
  const secretVal = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secretVal) throw new Error("[auth] Missing NEXTAUTH_SECRET or AUTH_SECRET");
  const jti = randomBytes(16).toString("hex");
  const secret = new TextEncoder().encode(secretVal);
  const safePayload = {
    jti,
    sub: payload.sub != null ? String(payload.sub) : undefined,
    id: payload.id != null ? String(payload.id) : undefined,
    email: payload.email != null ? String(payload.email) : undefined,
    name: payload.name != null ? payload.name : undefined,
    image: payload.image != null ? payload.image : undefined,
    role: payload.role != null ? String(payload.role) : undefined,
  };
  return new SignJWT(safePayload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secret);
}

export async function isRevokedJti(jti: string): Promise<boolean> {
  if (!jti || typeof jti !== "string") return false;
  try {
    const db = createClient(); // no auth; RevokedSession @@allow('read', true)
    const rows = await (db as any).revokedSession.findMany({
      where: { jti },
    });
    const entry = (rows as any[])[0];
    if (!entry) return false;
    const expiresAt = entry.expiresAt ? new Date(entry.expiresAt).getTime() : 0;
    if (Number.isNaN(expiresAt) || Date.now() > expiresAt) return false;
    return true;
  } catch {
    return false;
  }
}

export async function decodeLegacySession(cookieHeader: string | null): Promise<LegacySessionPayload | null> {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]+)`));
  if (!match) return null;
  const secretVal = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secretVal) return null;
  try {
    const { payload } = await jwtVerify(match[1], new TextEncoder().encode(secretVal));
    return payload as unknown as LegacySessionPayload;
  } catch {
    return null;
  }
}
