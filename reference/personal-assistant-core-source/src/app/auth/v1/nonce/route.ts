import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { randomBytes } from 'crypto';
import { withAuthV1Cors, authV1CorsPreflight } from '../cors';

/**
 * GET /auth/v1/nonce - ReownAuthentication nonce endpoint
 *
 * Returns { nonce, token } where:
 * - nonce: Random hex string for SIWE message
 * - token: JWT containing the nonce (ReownAuthentication expects this)
 *
 * Called by ReownAuthentication when social/embedded wallets connect.
 * Production: set NEXT_PUBLIC_W3M_API_URL=https://prestix.vip so the client
 * requests this endpoint on the same origin (avoids CORS and localhost mix-ups).
 */
export async function OPTIONS() {
  return authV1CorsPreflight();
}

export async function GET(request: NextRequest) {
  try {
    const nonce = randomBytes(32).toString('hex');
    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || 'fallback-secret-change-in-production'
    );
    const token = await new SignJWT({ nonce })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(secret);

    console.log('🔑 [ReownAuth] Nonce generated:', nonce.substring(0, 8) + '...');

    const res = NextResponse.json({ nonce, token });
    return withAuthV1Cors(res, request);
  } catch (error) {
    console.error('❌ [ReownAuth] Error generating nonce:', error);
    const res = NextResponse.json(
      { error: 'Failed to generate nonce' },
      { status: 500 }
    );
    return withAuthV1Cors(res, request);
  }
}
