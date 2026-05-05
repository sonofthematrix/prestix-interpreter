import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { NextRequest } from 'next/server';
import { authOptions } from './auth/nextauth.config';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  profileImageUrl?: string; 
  walletAddress?: string | null;
  authMethod?: string;
}

/**
 * Get current authenticated user from NextAuth session
 * 
 * Supports both AppKit authentication (wallet) and email authentication
 * via NextAuth session management.
 * 
 * @param request - Optional NextRequest for token-based auth
 * @returns AuthUser or null if not authenticated
 */
export async function getCurrentUser(request?: NextRequest): Promise<AuthUser | null> {
  try {
    // Method 1: Use NextAuth session (preferred for AppKit integration)
    if (!request) {
      try {
        // Validate authOptions exists before using it
        if (!authOptions) {
          console.error('❌ [getCurrentUser] authOptions is undefined. Check NEXTAUTH_SECRET environment variable.');
          return null;
        }

        const session = await getServerSession(authOptions) as { user?: {
          id?: string;
          email?: string | null;
          name?: string | null;
          role?: string;
          profileImageUrl?: string;
          walletAddress?: string | null;
          authMethod?: string;
        } } | null;
        
        if (session?.user && session.user.id) {
          return {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.name || '',
            role: session.user.role || 'CUSTOMER',
            profileImageUrl: session.user.profileImageUrl || undefined,
            walletAddress: session.user.walletAddress || null,
            authMethod: session.user.authMethod || 'email',
          };
        }
        
        return null;
      } catch (sessionError) {
        // Log session error but don't throw - return null instead
        // During RSC prefetch, there may be no request context, which is expected
        const errorMessage = sessionError instanceof Error ? sessionError.message : String(sessionError);
        const isPrefetchError = errorMessage.includes('headers') || errorMessage.includes('cookies') || errorMessage.includes('request');
        const isRedirectError = sessionError && typeof sessionError === 'object' && 'digest' in sessionError && typeof sessionError.digest === 'string' && sessionError.digest.includes('NEXT_REDIRECT');
        
        // Re-throw redirect errors (Next.js redirect() throws)
        if (isRedirectError) {
          throw sessionError;
        }
        
        if (!isPrefetchError) {
          // Only log non-prefetch errors to avoid noise
          console.error('❌ [getCurrentUser] Error getting session:', {
            error: errorMessage,
            stack: sessionError instanceof Error ? sessionError.stack : undefined,
            hasDatabaseUrl: !!process.env.DATABASE_URL,
            hasNextAuthSecret: !!(process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET),
          });
        }
        return null;
      }
    }

    // Method 2: Use JWT token from request (for API routes)
    try {
      const token = await getToken({ 
        req: request, 
        secret: process.env.NEXTAUTH_SECRET 
      });

      if (!token || !token.id) {
        return null;
      }

      // Convert NextAuth token to our AuthUser interface
      return {
        id: (token.id as string) || (token.sub as string),
        email: (token.email as string) || '',
        name: (token.name as string) || '',
        role: (token.role as string) || 'CUSTOMER',
        profileImageUrl: (token.profileImageUrl as string) || undefined,
        walletAddress: (token.walletAddress as string) || null,
        authMethod: (token.authMethod as string) || 'email',
      };
    } catch (tokenError) {
      // Log token error but don't throw - return null instead
      console.error('Error getting token:', tokenError);
      return null;
    }
  } catch (error) {
    // Catch-all: ensure we never throw from this function
    console.error('Unexpected error in getCurrentUser:', error);
    return null;
  }
}

/**
 * Require authentication for API routes
 * Returns user if authenticated, throws error if not
 */
export async function requireAuth(request?: NextRequest): Promise<AuthUser> { 
  const user = await getCurrentUser(request);
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
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


