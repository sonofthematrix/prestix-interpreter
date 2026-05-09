import { getToken } from 'next-auth/jwt';
import { getServerSession } from 'next-auth';
import { NextRequest } from 'next/server';
import { authOptions } from '@/lib/nextauth.config';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  profileImageUrl?: string;
  walletAddress?: string | null;
  authMethod?: string;
}

function sessionToAuthUser(session: { user: { id?: string; email?: string; name?: string; role?: string; profileImageUrl?: string; walletAddress?: string | null; authMethod?: string } }): AuthUser | null {
  const u = session?.user;
  if (!u || (!u.id && !(u as any).sub)) return null;
  return {
    id: (u.id as string) || (u as any).sub,
    email: (u.email as string) || '',
    name: (u.name as string) || '',
    role: (u.role as string) || 'CUSTOMER',
    profileImageUrl: (u as any).profileImageUrl,
    walletAddress: u.walletAddress ?? null,
    authMethod: (u.authMethod as string) || 'email',
  };
}

function tokenToAuthUser(token: { id?: string; sub?: string; email?: string; name?: string; role?: string; profileImageUrl?: string; walletAddress?: string; authMethod?: string }): AuthUser | null {
  if (!token || (!token.id && !token.sub)) return null;
  return {
    id: (token.id as string) || (token.sub as string),
    email: (token.email as string) || '',
    name: (token.name as string) || '',
    role: (token.role as string) || 'CUSTOMER',
    profileImageUrl: (token.profileImageUrl as string) || undefined,
    walletAddress: (token.walletAddress as string) || null,
    authMethod: (token.authMethod as string) || 'email',
  };
}

/**
 * Get current authenticated user from NextAuth session
 *
 * Supports both AppKit authentication (wallet) and email authentication
 * via NextAuth session management.
 *
 * @param request - Optional NextRequest for token-based auth (required in API routes)
 * @returns AuthUser or null if not authenticated
 */
export async function getCurrentUser(request?: NextRequest): Promise<AuthUser | null> {
  try {
    // Method 1: For API routes (Route Handlers), use getToken with request
    if (request) {
      const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
      type TokenShape = { id?: string; sub?: string; email?: string; name?: string; role?: string; profileImageUrl?: string; walletAddress?: string; authMethod?: string } | null;
      let token: TokenShape = null;

      try {
        token = (await getToken({
          req: request,
          secret,
        })) as TokenShape;
      } catch (tokenError) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ [getCurrentUser] getToken(request) failed:', tokenError instanceof Error ? tokenError.message : String(tokenError));
        }
      }

      // Fallback: In App Router, req.cookies may not be populated on the Request in some cases.
      // Use next/headers cookies() so getToken gets a cookie store it can read.
      if (!token && secret) {
        try {
          const { cookies: getCookies } = await import('next/headers');
          const cookieStore = await getCookies();
          const reqLike = {
            cookies: cookieStore,
            headers: request.headers,
          };
          token = (await getToken({
            req: reqLike as unknown as NextRequest,
            secret,
          })) as TokenShape;
        } catch (fallbackError) {
          if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️ [getCurrentUser] getToken(cookies()) fallback failed:', fallbackError instanceof Error ? fallbackError.message : String(fallbackError));
          }
        }
      }

      let user = token ? tokenToAuthUser(token) : null;

      // If NextAuth token has jti, check RevokedSession (cross-tab sign-out)
      if (user && token && (token as any).jti) {
        const { isRevokedJti } = await import('@/lib/auth-session-legacy');
        if (await isRevokedJti((token as any).jti)) return null;
      }

      // Legacy credentials session (prestix.session JWS with jti); check RevokedSession
      if (!user && request) {
        const cookieHeader = request.headers.get('cookie');
        const { decodeLegacySession, isRevokedJti } = await import('@/lib/auth-session-legacy');
        const legacy = await decodeLegacySession(cookieHeader);
        if (legacy?.sub) {
          if (legacy.jti && (await isRevokedJti(legacy.jti))) return null;
          user = {
            id: legacy.sub,
            email: legacy.email ?? '',
            name: legacy.name ?? '',
            role: legacy.role ?? 'CUSTOMER',
            profileImageUrl: legacy.image ?? undefined,
            walletAddress: null,
            authMethod: 'email',
          };
        }
      }

      // AppKit /auth/v1/authenticate sets a JWS cookie (same name as NextAuth); getToken() expects JWE so it returns null.
      // Decode our JWS so GET /api/auth/session returns the user after AppKit sign-in.
      if (!user && request && secret) {
        try {
          const { getSessionCookieName } = await import('@/lib/auth-cookie-utils');
          const cookieName = getSessionCookieName();
          let raw: string | undefined = request.cookies?.get(cookieName)?.value;
          if (!raw) {
            const { cookies: getCookies } = await import('next/headers');
            const cookieStore = await getCookies();
            raw = cookieStore.get(cookieName)?.value;
          }
          if (raw) {
            const { jwtVerify } = await import('jose');
            const key = new TextEncoder().encode(secret);
            const { payload } = await jwtVerify(raw, key);
            if (payload && (payload.id || payload.sub)) {
              user = tokenToAuthUser({
                id: (payload.id as string) || (payload.sub as string),
                sub: (payload.sub as string) || (payload.id as string),
                email: payload.email as string,
                name: payload.name as string,
                role: payload.role as string,
                profileImageUrl: payload.profileImageUrl as string,
                walletAddress: payload.walletAddress as string,
                authMethod: payload.authMethod as string,
              });
            }
          }
        } catch (_) {
          // Not a valid JWS or wrong secret; ignore
        }
      }

      if (user) return user;
    } else {
      // No request (e.g. Server Component): use getServerSession only
      try {
        const session = await getServerSession(authOptions);
        if (session?.user) {
          const user = sessionToAuthUser(session as any);
          if (user) return user;
        }
      } catch (_) {
        // Ignore; return null
      }
    }

    return null;
  } catch (error) {
    console.error('❌ [getCurrentUser] Unexpected error:', error);
    return null;
  }
}

/**
 * Require authentication for API routes
 * Returns user if authenticated, throws error if not
 */
export async function requireAuth(request?: NextRequest): Promise<AuthUser> { 
  const user = await getCurrentUser(request) as AuthUser;
  if (!user) {
    throw new Error('Authentication required');
  } else {
    return user;
  }
}

/**
 * Check if user has required role  
 */
export function hasRole(user: AuthUser | null, requiredRole: string): boolean {
  if (!user) return false;
  return user.role === requiredRole;
}

/**
 * Check if user has any of the required roles
 */
export function hasAnyRole(user: AuthUser | null, requiredRoles: string[]): boolean {
  if (!user) return false;
  return requiredRoles.includes(user.role);
}
