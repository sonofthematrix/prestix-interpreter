import { toChecksumAddress } from '@/lib/address-utils';
import { createClient } from '@/lib/db';
import { getSystemUser } from '@/lib/utils/system-user';
import { sessionManager } from '@/lib/services/session-manager';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/sessions - List active sessions for a wallet
 * 
 * Used by SIWE config to check for existing valid sessions.
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const walletAddress = searchParams.get('walletAddress');

        if (!walletAddress) {
            return NextResponse.json({ success: false, sessions: [] });
        }

        const checksummedAddress = toChecksumAddress(walletAddress);
        const systemUser = await getSystemUser();
        const db = createClient(systemUser);

        // Find active sessions for this wallet
        const sessions = await db.walletSession.findMany({
            where: {
                walletAddress: checksummedAddress,
                isActive: true,
                expiresAt: {
                    gt: new Date(),
                },
            } as any,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        walletAddress: true,
                        authMethod: true,
                        role: true,
                    }
                }
            } as any,
            orderBy: {
                createdAt: 'desc',
            } as any,
            take: 5,
        });

        return NextResponse.json({
            success: true,
            sessions: sessions.map((s: { id: string; walletAddress: string | null; chainId: number | null; nonce: string | null; expiresAt: Date | null; isActive: boolean; user: unknown }) => ({
                id: s.id,
                walletAddress: s.walletAddress,
                chainId: s.chainId,
                nonce: s.nonce,
                expiresAt: s.expiresAt,
                status: s.isActive ? 'ACTIVE' : 'INACTIVE',
                user: s.user,
            })),
        });
    } catch (error) {
        console.error('❌ [Sessions Route] Error listing sessions:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

/**
 * POST /api/auth/sessions - Create a new wallet session
 * 
 * Body:
 * - userId: User ID (required)
 * - authMethod: Auth method (wallet, email, social) (required)
 * - walletAddress: Wallet address (required for wallet auth)
 * - chainId: Chain ID (optional, for wallet auth)
 * - nonce: SIWE nonce (optional, for wallet auth)
 * - signature: SIWE signature (optional, for wallet auth)
 * - message: SIWE message (optional, for wallet auth)
 * - expiresAt: Session expiration date (optional, defaults to 30 days)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { 
            userId, 
            authMethod, 
            walletAddress, 
            chainId = 11155111, 
            nonce = '', 
            signature = '', 
            message = '', 
            expiresAt 
        } = body;

        if (!userId || !authMethod) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: userId, authMethod' },
                { status: 400 }
            );
        }

        if (authMethod === 'wallet' && !walletAddress) {
            return NextResponse.json(
                { success: false, error: 'Missing required field for wallet auth: walletAddress' },
                { status: 400 }
            );
        }

        // Calculate expiration (default 30 days)
        const sessionExpiresAt = expiresAt 
            ? new Date(expiresAt) 
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        // Get user agent and IP address from request
        const userAgent = request.headers.get('user-agent') || undefined;
        const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                         request.headers.get('x-real-ip') || undefined;

        // Create session using sessionManager
        const session = await sessionManager.createSession({
            userId,
            walletAddress: walletAddress ? toChecksumAddress(walletAddress) : '',
            nonce,
            message,
            signature,
            chainId,
            authMethod: authMethod as 'wallet' | 'email' | 'social',
            userAgent,
            ipAddress,
            expiresIn: sessionExpiresAt.getTime() - Date.now(),
        });

        console.log(`✅ [Sessions API] Session created: ${session.sessionId.substring(0, 8)}... for user ${userId}`);

        return NextResponse.json({
            success: true,
            session: {
                id: session.sessionId,
                userId: session.userId,
                walletAddress: session.walletAddress,
                chainId: session.chainId,
                networkName: session.networkName,
                expiresAt: session.expiresAt,
            },
        });
    } catch (error: any) {
        const msg = error?.message ?? String(error);
        const isDuplicate =
            msg.includes('wallet_sessions_nonce_key') ||
            msg.includes('duplicate key') ||
            msg.includes('unique constraint') ||
            error?.code === 'P2002' ||
            error?.dbErrorCode === '23505';

        if (isDuplicate) {
            console.warn('⚠️ [Sessions API] Duplicate session/nonce (handled gracefully by client retry or session-manager):', msg);
            return NextResponse.json(
                {
                    success: false,
                    error: 'Session already exists for this nonce',
                    code: 'DUPLICATE_SESSION',
                    message: 'A session with this nonce was already created. If you just signed in, try refreshing the page.',
                },
                { status: 409 }
            );
        }

        console.error('❌ [Sessions API] Error creating session:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to create session',
                details: msg,
            },
            { status: 500 }
        );
    }
}
