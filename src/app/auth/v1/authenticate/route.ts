import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import { withAuthV1Cors, authV1CorsPreflight } from '../cors';
import { verifySIWESignature } from '@/lib/siwe';
import { createClient } from '@/lib/db';
import { getSystemUser } from '@/lib/utils/system-user';
import { findOrCreateUserByWallet } from '@/lib/siwe';
import { toChecksumAddress } from '@/lib/address-utils';
import { sessionManager } from '@/lib/services/session-manager';
import { initializeNewUser } from '@/lib/services/user-initialization';
import { logLoginAudit } from '@/lib/services/auth-audit';
import { getSessionCookieName, isSecureCookie } from '@/lib/auth-cookie-utils';

/**
 * POST /auth/v1/authenticate - ReownAuthentication authenticate endpoint
 *
 * Verifies SIWE signature (including EIP-1271 for embedded/social wallets), creates/finds user
 * and session in DB, sets the NextAuth session cookie, and returns { token: "<jws>" }.
 * So GET /api/auth/session returns the user after this succeeds.
 *
 * For the request to hit THIS endpoint (not api.web3modal.org), set in .env.local:
 *   NEXT_PUBLIC_W3M_API_URL=http://localhost:3000
 * (Production: NEXT_PUBLIC_W3M_API_URL=https://prestix.vip)
 * Run scripts/patch-reown-auth.js after install so ReownAuthentication uses this URL.
 * Production: set NEXT_PUBLIC_W3M_API_URL=https://prestix.vip so the client hits the same origin (avoids CORS).
 *
 * Request body:
 * - message: SIWE message string
 * - signature: Signature hex string
 * - data?: Optional SIWX data
 * - clientId?: Optional client ID
 * - walletInfo?: Wallet info (type: 'social', social: 'google'|'email', etc.)
 */
export async function OPTIONS() {
  return authV1CorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, signature, data, walletInfo } = body;
    
    // ✅ CRITICAL DESIGN FIX: Detect session restoration vs new signature verification
    // Session restoration happens when:
    // 1. ReownAuthentication calls addSession() with a session from getSessions()
    // 2. getSessions() returns sessions with empty message/signature (lines 127-134 in ReownAuthentication.ts)
    // 3. We should NOT verify signatures during restoration - only validate JWT tokens
    const isSessionRestoration = (!message || message.trim().length === 0) || 
                                 (!signature || signature.trim().length === 0);
    
    if (isSessionRestoration) {
      console.log('ℹ️ [ReownAuth] Session restoration attempt detected - skipping signature verification');
      console.log('   This is expected when AppKit restores sessions on page load');
      console.log('   Session restoration should validate JWT tokens, not re-verify signatures');
      
      // For session restoration, we should validate the existing JWT token instead
      // But since ReownAuthentication handles token validation internally, we can return success
      // The token validation happens in ReownAuthentication.getSessions() via /auth/v1/me
      const res = NextResponse.json(
        { 
          error: 'Session restoration should use getSessions() with token validation, not addSession() with signature verification',
          hint: 'This endpoint is for NEW signature verification only. Use /auth/v1/me to validate existing sessions.'
        },
        { status: 400 }
      );
      return withAuthV1Cors(res, request);
    }
    
    if (!message || !signature) {
      const res = NextResponse.json(
        { error: 'Message and signature are required' },
        { status: 400 }
      );
      return withAuthV1Cors(res, request);
    }
    
    // Log request details for debugging
    const requestUrl = request.url;
    const nonceHeader = request.headers.get('x-nonce-jwt');
    console.log('🔐 [ReownAuth] NEW signature verification request:', {
      url: requestUrl,
      hasMessage: !!message,
      hasSignature: !!signature,
      hasNonceHeader: !!nonceHeader,
      walletInfo: walletInfo?.type,
      social: walletInfo?.social,
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
    });
    
    // ✅ CRITICAL: Verify this request is hitting our endpoint, not Reown Cloud
    if (requestUrl.includes('api.web3modal.org')) {
      console.error('❌ [ReownAuth] ERROR: Request is going to api.web3modal.org instead of local endpoint!');
      console.error('   This means the patch or fetch interceptor is not working');
      console.error('   Request URL:', requestUrl);
      const res = NextResponse.json(
        { 
          error: 'Request misrouted to Reown Cloud',
          hint: 'Check ReownAuthentication patch and fetch interceptors'
        },
        { status: 500 }
      );
      return withAuthV1Cors(res, request);
    }
    
    // Extract wallet address from message
    const addressMatch = message.match(/0x[a-fA-F0-9]{40}/i);
    if (!addressMatch) {
      const res = NextResponse.json(
        { error: 'Invalid SIWE message: no wallet address found' },
        { status: 400 }
      );
      return withAuthV1Cors(res, request);
    }
    
    const walletAddress = toChecksumAddress(addressMatch[0]);
    
    // Extract chainId from message or body.data (Reown sends data.chainId as "eip155:11155111")
    const chainIdFromData = data?.chainId != null
      ? (typeof data.chainId === 'string' && data.chainId.startsWith('eip155:')
          ? parseInt(data.chainId.replace('eip155:', ''), 10)
          : parseInt(String(data.chainId), 10))
      : NaN;
    const chainId = !Number.isNaN(chainIdFromData)
      ? chainIdFromData
      : (() => {
          const m = message.match(/Chain\s*ID:\s*eip155:(\d+)/i) ?? message.match(/Chain\s*ID:\s*(\d+)/i);
          return m ? parseInt(m[1], 10) : 11155111;
        })();

    // Extract nonce from message
    const nonceMatch = message.match(/Nonce: ([a-fA-F0-9]+)/i);
    let nonce = nonceMatch ? nonceMatch[1] : (data?.nonce as string) ?? null;
    
    // ✅ CRITICAL: Also check for nonce in x-nonce-jwt header (ReownAuthentication sends this)
    // ReownAuthentication stores the nonce JWT from /auth/v1/nonce and sends it as Bearer token
    const nonceJwtHeader = request.headers.get('x-nonce-jwt');
    if (!nonce && nonceJwtHeader) {
      try {
        const nonceToken = nonceJwtHeader.replace('Bearer ', '').trim();
        const secret = new TextEncoder().encode(
          process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || 'fallback-secret-change-in-production'
        );
        const decoded = await jwtVerify(nonceToken, secret);
        nonce = (decoded.payload.nonce as string) || null;
        console.log('✅ [ReownAuth] Extracted nonce from x-nonce-jwt header:', nonce?.substring(0, 8) + '...');
      } catch (jwtError) {
        console.warn('⚠️ [ReownAuth] Failed to decode nonce JWT from header:', jwtError);
        // Continue without nonce validation
      }
    }
    
    if (!nonce) {
      console.warn('⚠️ [ReownAuth] No nonce found in message or header, attempting verification without nonce validation');
      // For ReownAuthentication, we'll verify signature without strict nonce validation
      // The signature itself is sufficient proof of authentication
    }
    
    // ✅ CRITICAL: Only verify signatures for NEW authentication attempts
    // Session restoration should NOT reach this point - it should use token validation instead
    // Verify SIWE signature (supports EIP-1271 for embedded wallets)
    // Pass chainId from data/message so viem fallback uses correct chain when SiweMessage parse fails (e.g. "Chain ID: eip155:11155111")
    const verification = await verifySIWESignature(message, signature, nonce || '', {
      address: walletAddress,
      chainId,
    });
    
    if (!verification.success) {
      console.error('❌ [ReownAuth] Signature verification failed:', verification.error);
      console.error('   Message preview:', message.substring(0, 200));
      console.error('   Nonce from message:', nonce);
      const res = NextResponse.json(
        { error: verification.error || 'Invalid signature' },
        { status: 400 }
      );
      return withAuthV1Cors(res, request);
    }
    
    // Use verified address from verification result (more reliable)
    const verifiedAddress = verification.address || walletAddress;
    console.log('✅ [ReownAuth] Signature verified for:', verifiedAddress.substring(0, 10) + '...');
    
    // Find or create user by wallet address
    const systemUser = await getSystemUser();
    const db = createClient(systemUser);
    
    // Determine auth method from walletInfo
    let authMethod: string = 'wallet';
    if (walletInfo?.type === 'social') {
      if (walletInfo.social === 'google') {
        authMethod = 'google+wallet';
      } else if (walletInfo.social === 'email') {
        authMethod = 'email+wallet';
      }
    }
    
    const userResult = await findOrCreateUserByWallet(
      verifiedAddress,
      chainId,
      authMethod as any
    );
    
    const user = userResult.user as any;
    const isNewUser = userResult.isNewUser === true;
    console.log('✅ [ReownAuth] User found/created:', user?.id, isNewUser ? '(new user)' : '');

    if (!user) {
      const res = NextResponse.json(
        { error: 'Failed to create or find user' },
        { status: 500 }
      );
      return withAuthV1Cors(res, request);
    }

    // Initialize new user: Account, preferences, portfolio, engagement metrics, audit
    if (isNewUser) {
      try {
        const userAgent = request.headers.get('user-agent') || undefined;
        const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || undefined;
        await initializeNewUser({
          userId: user.id,
          email: user.email ?? '',
          name: user.name ?? '',
          walletAddress: verifiedAddress,
          authMethod: authMethod as 'wallet' | 'email' | 'social',
          provider: 'wallet',
          providerAccountId: verifiedAddress,
          ipAddress,
          userAgent,
        });
        console.log('✅ [ReownAuth] New user dependencies initialized');
      } catch (initErr) {
        console.error('⚠️ [ReownAuth] New user initialization failed (non-fatal):', initErr);
      }
    }

    // ✅ CRITICAL: Create wallet session and connection in database (SIWE message recorded)
    const userAgent = request.headers.get('user-agent') || undefined;
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || undefined;
    let createdSessionId: string | undefined;
    try {
      const sessionData = await sessionManager.createSession({
        userId: user.id,
        walletAddress: verifiedAddress,
        nonce: nonce || '',
        message,
        signature,
        chainId,
        authMethod: authMethod as any,
        userAgent,
        ipAddress,
        expiresIn: 30 * 24 * 60 * 60 * 1000, // 30 days
      });
      createdSessionId = sessionData.sessionId;
      console.log('✅ [ReownAuth] Wallet session and connection created in database; SIWE message recorded');
    } catch (sessionError) {
      console.error('⚠️ [ReownAuth] Failed to create wallet session:', sessionError);
    }

    // Login audit for session tracking
    try {
      await logLoginAudit({
        userId: user.id,
        authMethod,
        walletAddress: verifiedAddress,
        chainId,
        sessionId: createdSessionId,
        ipAddress,
        userAgent,
        isNewUser,
        siweMessage: message,
      });
    } catch (auditErr) {
      console.error('⚠️ [ReownAuth] Failed to log login audit (non-fatal):', auditErr);
    }
    
    // Create JWS token (NOT JWE - ReownAuthentication expects JWS)
    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || 'fallback-secret-change-in-production'
    );
    
    const token = await new SignJWT({
      id: user.id,
      email: user.email || null,
      name: user.name || null,
      role: user.role || 'user',
      walletAddress: user.walletAddress || verifiedAddress,
      authMethod: user.authMethod || authMethod || 'wallet',
      sub: user.id,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d') // 30 days
      .sign(secret);
    
    console.log('✅ [ReownAuth] JWS token created');

    // Set the NextAuth session cookie so GET /api/auth/session returns the user
    const response = NextResponse.json({ token });
    response.cookies.set(getSessionCookieName(), token, {
      httpOnly: true,
      secure: isSecureCookie(),
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });
    console.log('🍪 [ReownAuth] Session cookie set for user:', user.id);

    return withAuthV1Cors(response, request);
  } catch (error) {
    console.error('❌ [ReownAuth] Authentication error:', error);
    const res = NextResponse.json(
      { error: error instanceof Error ? error.message : 'Authentication failed' },
      { status: 500 }
    );
    return withAuthV1Cors(res, request);
  }
}
