import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/db';
import { NextRequestHandler } from '@zenstackhq/server/next';
import { RPCApiHandler } from '@zenstackhq/server/api';
import { NextRequest } from 'next/server';
import { schema } from '@/zenstack/schema';

/**
 * Central ZenStack API Route Handler
 * 
 * This handler provides automatic CRUD (Create, Read, Update, Delete) for all models
 * defined in the ZenStack schema. It respects access control rules defined with @@allow.
 */
const handler = NextRequestHandler({
    getClient: async (req: NextRequest) => {
        // Retrieve current user from session/auth
        const user = await getCurrentUser(req as any);

        // Return a ZenStack client with the user context for access control
        return createClient(user);
    },
    useAppDir: true,
    apiHandler: new RPCApiHandler({ schema }) as any,
});

export { handler as DELETE, handler as GET, handler as PATCH, handler as POST, handler as PUT };
