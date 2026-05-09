/**
 * Server-side Authentication Utilities
 * Implements Next.js best practices for Server Components, Server Actions, and Route Handlers
 */

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logging';

// Types
export interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  image: string | null;
  verified: boolean;
}

export interface Session {
  user: User;
  expires: string;
}

/**
 * Get the current user from the session
 * This function should be called close to the data source
 * Returns null if no user is authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    
    if (!accessToken) {
      logger.debug('No access token found in cookies');
      return null;
    }

    // Verify the JWT token
    const user = await verifySession(accessToken);
    
    if (!user) {
      logger.debug('Token verification failed');
      return null;
    }

    logger.debug(`Current user: ${user.id}`);
    return user;
  } catch (error) {
    logger.error('Failed to get current user:', error);
    return null;
  }
}

/**
 * Verify a JWT session token
 * Returns the user if the token is valid, null otherwise
 */
export async function verifySession(token: string): Promise<User | null> {
  try {
    // Import jose dynamically to avoid issues with server-side rendering
    const { jwtVerify } = await import('jose');
    
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    
    if (!payload || !payload.userId) {
      logger.warn('Invalid token payload');
      return null;
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        image: true,
        verified: true,
      },
    });

    if (!user) {
      logger.warn(`User not found: ${payload.userId}`);
      return null;
    }

    return user as User;
  } catch (error) {
    logger.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Require authentication for Server Components
 * Redirects to login if not authenticated
 * Returns the current user if authenticated
 */
export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  
  if (!user) {
    logger.info('Authentication required - redirecting to login');
    redirect('/login');
  }
  
  return user;
}

/**
 * Require admin role for Server Components
 * Redirects to login if not authenticated
 * Redirects to unauthorized if not admin
 * Returns the current user if admin
 */
export async function requireAdmin(): Promise<User> {
  const user = await requireAuth();
  
  if (user.role !== 'admin') {
    logger.info(`Admin access denied for user: ${user.id}`);
    redirect('/unauthorized');
  }
  
  return user;
}

/**
 * Check if user has admin role
 * Returns true if user is admin, false otherwise
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === 'admin' || false;
}

/**
 * Check if user is authenticated
 * Returns true if user is authenticated, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Get user role
 * Returns the user's role or null if not authenticated
 */
export async function getUserRole(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.role || null;
}

/**
 * Require authentication for Server Actions
 * Throws an error if not authenticated
 * Returns the current user if authenticated
 */
export async function requireAuthForAction(): Promise<User> {
  const user = await getCurrentUser();
  
  if (!user) {
    logger.warn('Authentication required for Server Action');
    throw new Error('Authentication required');
  }
  
  return user;
}

/**
 * Require admin role for Server Actions
 * Throws an error if not authenticated or not admin
 * Returns the current user if admin
 */
export async function requireAdminForAction(): Promise<User> {
  const user = await requireAuthForAction();
  
  if (user.role !== 'admin') {
    logger.warn(`Admin access required for Server Action - user: ${user.id}`);
    throw new Error('Admin access required');
  }
  
  return user;
}

/**
 * Require authentication for Route Handlers
 * Returns 401 if not authenticated
 * Returns the current user if authenticated
 */
export async function requireAuthForRoute(): Promise<User> {
  const user = await getCurrentUser();
  
  if (!user) {
    logger.warn('Authentication required for Route Handler');
    throw new Error('Unauthorized');
  }
  
  return user;
}

/**
 * Require admin role for Route Handlers
 * Returns 401 if not authenticated
 * Returns 403 if not admin
 * Returns the current user if admin
 */
export async function requireAdminForRoute(): Promise<User> {
  const user = await requireAuthForRoute();
  
  if (user.role !== 'admin') {
    logger.warn(`Admin access required for Route Handler - user: ${user.id}`);
    throw new Error('Forbidden');
  }
  
  return user;
}

/**
 * Get user from request headers (for Route Handlers)
 * This is useful when you need to get the user from a NextRequest
 */
export async function getUserFromRequest(request: NextRequest): Promise<User | null> {
  try {
    const accessToken = request.cookies.get('accessToken')?.value;
    
    if (!accessToken) {
      return null;
    }

    return await verifySession(accessToken);
  } catch (error) {
    logger.error('Failed to get user from request:', error);
    return null;
  }
}

/**
 * Require authentication from request (for Route Handlers)
 * Returns 401 if not authenticated
 * Returns the current user if authenticated
 */
export async function requireAuthFromRequest(request: NextRequest): Promise<User> {
  const user = await getUserFromRequest(request);
  
  if (!user) {
    logger.warn('Authentication required from request');
    throw new Error('Unauthorized');
  }
  
  return user;
}

/**
 * Require admin role from request (for Route Handlers)
 * Returns 401 if not authenticated
 * Returns 403 if not admin
 * Returns the current user if admin
 */
export async function requireAdminFromRequest(request: NextRequest): Promise<User> {
  const user = await requireAuthFromRequest(request);
  
  if (user.role !== 'admin') {
    logger.warn(`Admin access required from request - user: ${user.id}`);
    throw new Error('Forbidden');
  }
  
  return user;
}

/**
 * Check if user can access a specific resource
 * This is useful for fine-grained access control
 */
export async function canUserAccessResource(
  userId: string,
  resource: string,
  resourceId: string
): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return false;
    }
    
    // Admin users can access everything
    if (user.role === 'admin') {
      return true;
    }
    
    // Users can only access their own resources
    if (user.id !== userId) {
      return false;
    }
    
    // Check if the resource exists and belongs to the user
    switch (resource) {
      case 'Investment':
        const investment = await prisma.investment.findUnique({
          where: { id: resourceId },
          select: { investorId: true },
        });
        return investment?.investorId === userId;
        
      case 'Portfolio':
        const portfolio = await prisma.portfolio.findUnique({
          where: { id: resourceId },
          select: { userId: true },
        });
        return portfolio?.userId === userId;
        
      case 'Deposit':
        const deposit = await prisma.deposit.findUnique({
          where: { id: resourceId },
          select: { userId: true },
        });
        return deposit?.userId === userId;
        
      // QTech/PAM gaming entities removed from schema - no longer supported
      case 'GamingSession':
      case 'UserQtechAccount':
      case 'UserPamMapping':
        return false;
        
      default:
        return false;
    }
  } catch (error) {
    logger.error('Failed to check resource access:', error);
    return false;
  }
}

/**
 * Get user's permissions
 * Returns an object with permission flags
 */
export async function getUserPermissions(userId?: string): Promise<{
  canInvest: boolean;
  canWithdraw: boolean;
  canPlayGames: boolean;
  canAccessAdmin: boolean;
  canManageUsers: boolean;
  canManageProperties: boolean;
  canManageInvestments: boolean;
  canManageDeposits: boolean;
  canViewAnalytics: boolean;
  canManageGaming: boolean;
  canManagePAM: boolean;
}> {
  try {
    const user = userId ? await getCurrentUser() : await getCurrentUser();
    
    if (!user) {
      return {
        canInvest: false,
        canWithdraw: false,
        canPlayGames: false,
        canAccessAdmin: false,
        canManageUsers: false,
        canManageProperties: false,
        canManageInvestments: false,
        canManageDeposits: false,
        canViewAnalytics: false,
        canManageGaming: false,
        canManagePAM: false,
      };
    }
    
    const isAdmin = user.role === 'admin';
    
    return {
      canInvest: true, // All authenticated users can invest
      canWithdraw: true, // All authenticated users can withdraw
      canPlayGames: true, // All authenticated users can play games
      canAccessAdmin: isAdmin,
      canManageUsers: isAdmin,
      canManageProperties: isAdmin,
      canManageInvestments: isAdmin,
      canManageDeposits: isAdmin,
      canViewAnalytics: isAdmin,
      canManageGaming: isAdmin,
      canManagePAM: isAdmin,
    };
  } catch (error) {
    logger.error('Failed to get user permissions:', error);
    return {
      canInvest: false,
      canWithdraw: false,
      canPlayGames: false,
      canAccessAdmin: false,
      canManageUsers: false,
      canManageProperties: false,
      canManageInvestments: false,
      canManageDeposits: false,
      canViewAnalytics: false,
      canManageGaming: false,
      canManagePAM: false,
    };
  }
}

/**
 * Validate user session and refresh if needed
 * This is useful for long-running operations
 */
export async function validateAndRefreshSession(): Promise<User | null> {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return null;
    }
    
    // Check if the user still exists and is active
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        image: true,
        verified: true,
      },
    });
    
    if (!currentUser) {
      logger.warn(`User no longer exists: ${user.id}`);
      return null;
    }
    
    return currentUser as User;
  } catch (error) {
    logger.error('Failed to validate session:', error);
    return null;
  }
}

/**
 * Log user activity
 * This is useful for audit trails
 */
export async function logUserActivity(
  userId: string,
  action: string,
  resource?: string,
  resourceId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await prisma.userActivity.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        metadata: metadata ? JSON.stringify(metadata) : null,
        timestamp: new Date(),
      },
    });
    
    logger.debug(`User activity logged: ${userId} - ${action}`);
  } catch (error) {
    logger.error('Failed to log user activity:', error);
  }
}

/**
 * Get user's session info
 * Returns session information including expiry
 */
export async function getSessionInfo(): Promise<{
  user: User | null;
  expires: Date | null;
  isExpired: boolean;
}> {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return {
        user: null,
        expires: null,
        isExpired: true,
      };
    }
    
    // Get session expiry from token
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('accessToken')?.value;
    
    if (!accessToken) {
      return {
        user: null,
        expires: null,
        isExpired: true,
      };
    }
    
            // Decode token to get expiry
            const jose = await import('jose');
            const payload = jose.decodeJwt(accessToken);
    
    const expires = payload.exp ? new Date(payload.exp * 1000) : null;
    const isExpired = expires ? expires < new Date() : true;
    
    return {
      user,
      expires,
      isExpired,
    };
  } catch (error) {
    logger.error('Failed to get session info:', error);
    return {
      user: null,
      expires: null,
      isExpired: true,
    };
  }
}