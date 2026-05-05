/**
 * AppKit Server-Side Session Management
 * 
 * Server-only utilities - NO client-side code should import this.
 */

import { toChecksumAddress } from '../address-utils';

/**
 * Server-side session validation
 * Call this from API routes to verify wallet ownership
 */
export async function getServerSession(walletAddress: string) {
    // Validate wallet address format
    if (!walletAddress || !walletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        return null;
    }

    // Fetch user from database by wallet address
    try {
        const { createClient } = await import('@/lib/db');
        const { getSystemUser } = await import('@/lib/utils/system-user');
        const systemUser = await getSystemUser();
        const db = createClient(systemUser);
        const user = await db.user.findUnique({
            where: { walletAddress: { equals: (walletAddress.toLowerCase()) } as any },
            select: {
                id: true,
                email: true,
                name: true,
                walletAddress: true,
                role: true,
            },
        });

        if (!user) {
            return null;
        }

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                walletAddress: user.walletAddress!,
                role: user.role || 'CUSTOMER',
            },
        };
    } catch (error) {
        console.error('Error fetching user session:', error);
        return null;
    }
}
