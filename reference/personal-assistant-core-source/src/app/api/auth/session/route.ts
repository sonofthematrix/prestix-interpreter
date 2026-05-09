import { getCurrentUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/session - Get current user session
 * 
 * Replaces the broken handlers/auth/session.js import.
 * Returns the current authenticated user from NextAuth/AppKit session.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    if (!user) {
      console.log('ℹ️ [Session Route] No active session found');
      return NextResponse.json({ user: null });
    }

    console.log(`✅ [Session Route] Session found for user: ${user.id} (${user.walletAddress || 'no wallet'})`);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        walletAddress: user.walletAddress,
        authMethod: user.authMethod,
        profileImageUrl: user.profileImageUrl,
      },
    });
  } catch (error) {
    console.error('❌ [Session Route] Error getting current user:', error);
    return NextResponse.json(
      {
        error: 'Session retrieval failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
