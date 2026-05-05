import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db';
import type { AuthUser } from '@/lib/auth';
import { getAddress } from 'viem';
import { UserRole } from '@/lib/user-activity-logger';

export const dynamic = 'force-dynamic';

// Helper functions
function toChecksumAddress(address: string): string {
  return getAddress(address);
}

function shortenAddress(address: string): string {
  if (!address) return 'N/A';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * @deprecated This route is deprecated. Use /api/auth/sessions instead.
 * This route is kept for backward compatibility and redirects to the new generic sessions API.
 * 
 * GET /api/auth/wallet/sessions - Get wallet sessions (DEPRECATED)
 * 
 * Query parameters:
 * - walletAddress: Get session for specific wallet address
 * - userId: Filter by user ID
 * - limit: Limit results (default: 3)
 * 
 * Returns active or expired wallet sessions with their nonce and token information.
 */
export async function GET(request: NextRequest) {
  // Forward to new generic sessions API with wallet auth method filter
  try {
    const { searchParams } = new URL(request.url);
    const newUrl = new URL('/api/auth/sessions', request.url);
    
    // Copy all query parameters
    searchParams.forEach((value, key) => {
      newUrl.searchParams.set(key, value);
    });
    
    // Ensure authMethod is set to wallet for backward compatibility
    if (!newUrl.searchParams.has('authMethod')) {
      newUrl.searchParams.set('authMethod', 'wallet');
    }
    
    // Forward request internally
    const response = await fetch(newUrl.toString(), {
      method: 'GET',
      headers: request.headers,
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('❌ [Wallet Sessions API] Error forwarding GET request:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to forward request to new sessions API',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * @deprecated This route is deprecated. Use /api/auth/sessions instead.
 * 
 * POST /api/auth/wallet/sessions - Store SIWE session (DEPRECATED)
 */
export async function POST_DEPRECATED(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '3', 10);
    const userId = searchParams.get('userId');
    const walletAddress = searchParams.get('walletAddress');

    // Use system user context for querying sessions
    const systemUser: AuthUser = {
      id: 'system',
      email: 'system@TKNZN.pro',
      name: 'System Admin',
      role: 'ADMIN' as any as UserRole,
    };  
    const db = await createClient(systemUser);

    // Build query
    const where: any = {};
    if (userId) {
      where.userId = userId;
    }
    if (walletAddress) {
      // Normalize wallet address for query
      const checksummedAddress = toChecksumAddress(walletAddress);
      where.walletAddress = checksummedAddress;
    }

    // Fetch latest sessions (generic)
    const sessions = await db.session.findMany({
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
        // Nonce information from user record
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

    console.log(`✅ [Wallet Sessions API] Retrieved ${formattedSessions.length} sessions`);

    return NextResponse.json({
      success: true,
      sessions: formattedSessions,
      count: formattedSessions.length,
    });

  } catch (error: any) {
    console.error('❌ [Wallet Sessions API] Error fetching sessions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch wallet sessions',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * @deprecated This route is deprecated. Use /api/auth/sessions instead.
 * This route forwards requests to the new generic sessions API.
 * 
 * POST /api/auth/wallet/sessions - Store SIWE session (DEPRECATED)
 */
export async function POST(request: NextRequest) {
  // Forward to new generic sessions API
  try {
    const body = await request.json();
    
    // Ensure authMethod is set to wallet for backward compatibility
    const newBody = {
      ...body,
      };
    
    // Forward request to new endpoint
    const newUrl = new URL('/api/auth/sessions', request.url);
    const response = await fetch(newUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newBody),
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('❌ [Wallet Sessions API] Error forwarding request:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to forward request to new sessions API',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

