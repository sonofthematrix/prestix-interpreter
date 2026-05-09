import { getCurrentUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/me - Get current user profile
 * 
 * Used by AppKitSession store for hydration.
 * Returns the current authenticated user.
 */
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser(request);

        if (!user) {
            return NextResponse.json({ user: null });
        }

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
        console.error('❌ [Me Route] Error getting current user:', error);
        return NextResponse.json({ user: null }, { status: 500 });
    }
}
