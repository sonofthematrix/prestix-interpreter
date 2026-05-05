import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db';
import { shortenAddress, toChecksumAddress } from '@/lib/address-utils';
import type { AuthUser } from '@/lib/auth';
import { UserRole } from '@/lib/user-activity-logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/sessions - Get user sessions (all auth methods)
 * 
 * Query parameters:
 * - walletAddress: Get session for specific wallet address (wallet auth only)
 * - userId: Filter by user ID
 * - authMethod: Filter by auth method (wallet, email, google, etc.)
 * - limit: Limit results (default: 3)
 * 
 * Returns active or expired sessions with their information.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '3', 10);
    const userId = searchParams.get('userId');
    const walletAddress = searchParams.get('walletAddress');
    const authMethod = searchParams.get('authMethod');

    // Use system user context for querying sessions
    const systemUser: AuthUser = {
      id: 'system',
      email: 'system@TKNZN.pro',
      name: 'System Admin',
      role: 'ADMIN' as any as UserRole,
    };
    const db = await createClient(systemUser);

    // Build query - generic for all auth methods
    const where: any = {};
    if (userId) {
      where.userId = userId;
    }
    if (authMethod) {
      where.authMethod = authMethod;
    }
    if (walletAddress) {
      // Normalize wallet address for query (wallet auth only)
      const checksummedAddress = toChecksumAddress(walletAddress);
      where.walletAddress = checksummedAddress;
    }

    // Fetch latest sessions (generic - works for all auth methods)
    // Check which model exists before using it
    // @ts-ignore - walletSession may still exist in schema
    const SessionModel = (db.session && typeof db.session.findMany === 'function') 
      ? db.session 
      : (db.walletSession && typeof db.walletSession.findMany === 'function')
        ? db.walletSession
        : null;
    
    if (!SessionModel) {
      // Session model doesn't exist - return empty array instead of error
      // NextAuth handles sessions via cookies, so database sessions are optional
      console.warn('⚠️ [Sessions API] Session model not found in schema. Returning empty sessions array.');
      console.warn('⚠️ [Sessions API] NextAuth handles session management via cookies.');
      return NextResponse.json({
        success: true,
        sessions: [],
        message: 'Session model not found in schema - NextAuth handles sessions via cookies',
      });
    }
    
    if (SessionModel === db.walletSession) {
      console.warn('⚠️ [Sessions API] Using walletSession model (schema may not be updated yet)');
    }
    
    const sessions = await SessionModel.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            walletAddress: true,
            walletNonce: true,
            walletNonceExpiry: true,
          },
        },
      },
    });

    // Format sessions with status and nonce info
    const formattedSessions = sessions.map((session) => {
      const isExpired = session.expiresAt ? new Date(session.expiresAt) < new Date() : false;
      const walletAbbr = session.walletAddress ? shortenAddress(session.walletAddress) : 'N/A';

      return {
        id: session.id,
        userId: session.userId,
        walletAddress: session.walletAddress,
        walletAddressAbbr: walletAbbr,
        chainId: session.chainId,
        authMethod: session.authMethod,
        status: isExpired ? 'EXPIRED' : 'ACTIVE',
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        // Nonce information from user record (wallet auth only)
        nonce: session.user?.walletNonce || null,
        nonceExpiry: session.user?.walletNonceExpiry || null,
        // User info
        user: {
          id: session.user?.id,
          email: session.user?.email,
          name: session.user?.name,
        },
      };
    });

    console.log(`✅ [Sessions API] Retrieved ${formattedSessions.length} sessions`);

    return NextResponse.json({
      success: true,
      sessions: formattedSessions,
      count: formattedSessions.length,
    });

  } catch (error: any) {
    console.error('❌ [Sessions API] Error fetching sessions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch sessions',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/sessions - Store session (all auth methods)
 * 
 * Body:
 * - userId: User ID (required)
 * - authMethod: Auth method (wallet, email, google, etc.) (required)
 * - walletAddress: Wallet address (required for wallet auth)
 * - chainId: Chain ID (optional, for wallet auth)
 * - nonce: SIWE nonce (optional, for wallet auth)
 * - signature: SIWE signature (optional, for wallet auth)
 * - message: SIWE message (optional, for wallet auth)
 * - expiresAt: Session expiration date (optional, defaults to 24 hours)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, authMethod, walletAddress, chainId, nonce, signature, message, expiresAt } = body;

    if (!userId || !authMethod) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: userId, authMethod',
        },
        { status: 400 }
      );
    }

    // Validate wallet-specific fields for wallet auth
    if (authMethod === 'wallet' && (!walletAddress || !chainId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields for wallet auth: walletAddress, chainId',
        },
        { status: 400 }
      );
    }

    // Use system user context for creating sessions
    const systemUser: AuthUser = {
      id: 'system',
      email: 'system@TKNZN.pro',
      name: 'System Admin',
      role: 'ADMIN' as any as UserRole,
    };
    const db = await createClient(systemUser);

    // Normalize wallet address if provided
    const checksummedAddress = walletAddress ? toChecksumAddress(walletAddress) : null;
    const addrAbbr = checksummedAddress ? shortenAddress(checksummedAddress) : 'N/A';

    // Calculate expiration (default 24 hours)
    const sessionExpiresAt = expiresAt 
      ? new Date(expiresAt) 
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    try {
      // Build where clause for invalidating existing sessions
      const invalidateWhere: any = {
        userId,
        authMethod,
        expiresAt: {
          gte: new Date(), // Only update non-expired sessions
        },
      };

      // Add wallet-specific filter if wallet auth
      if (authMethod === 'wallet' && checksummedAddress) {
        invalidateWhere.walletAddress = checksummedAddress;
      }

      // Check which model exists before using it
      // @ts-ignore - walletSession may still exist in schema
      const SessionModel = (db.session && typeof db.session.updateMany === 'function') 
        ? db.session 
        : (db.walletSession && typeof db.walletSession.updateMany === 'function')
          ? db.walletSession
          : null;
      
      if (!SessionModel) {
        // Session model doesn't exist - this is OK, NextAuth handles sessions via cookies
        console.warn('⚠️ [Sessions API] Session model not found in schema. Skipping database session storage.');
        console.warn('⚠️ [Sessions API] NextAuth will handle session management via cookies.');
        // Return success response without storing in database
        return NextResponse.json({
          success: true,
          message: 'Session model not found - NextAuth handles sessions via cookies',
          session: {
            id: `mock-${Date.now()}`,
            userId,
            authMethod,
            walletAddress: authMethod === 'wallet' ? checksummedAddress : undefined,
            chainId: authMethod === 'wallet' ? parseInt(String(chainId)) : undefined,
            expiresAt: sessionExpiresAt,
          },
        });
      }
      
      if (SessionModel === db.walletSession) {
        console.warn('⚠️ [Sessions API] Using walletSession model (schema may not be updated yet)');
      }

      // First, invalidate any existing active sessions for this user/auth method
      await SessionModel.updateMany({
        where: invalidateWhere,
        data: {
          expiresAt: new Date(), // Expire them immediately
        },
      });

      // Build session data
      const sessionData: any = {
        userId,
        authMethod,
        expiresAt: sessionExpiresAt,
      };

      // Add wallet-specific fields if wallet auth
      if (authMethod === 'wallet' && checksummedAddress) {
        sessionData.walletAddress = checksummedAddress;
        sessionData.chainId = parseInt(String(chainId));
      }

      // Create new session using the same model
      const session = await SessionModel.create({
        data: sessionData,
      });

      const logAddress = authMethod === 'wallet' ? addrAbbr : userId;
      console.log(`✅ [Sessions API] Session stored: ${session.id} for ${logAddress} (${authMethod})`);

      return NextResponse.json({
        success: true,
        session: {
          id: session.id,
          userId: session.userId,
          authMethod: session.authMethod,
          walletAddress: session.walletAddress,
          chainId: session.chainId,
          expiresAt: session.expiresAt,
          createdAt: session.createdAt,
        },
      });

    } catch (dbError: any) {
      const logAddress = authMethod === 'wallet' ? addrAbbr : userId;
      console.error(`❌ [Sessions API] Error storing session for ${logAddress}:`, dbError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to store session',
          details: dbError.message,
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('❌ [Sessions API] Error processing request:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process request',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

