import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { createClient } from '@/lib/db';
import { getSystemUser } from '@/lib/utils/system-user';

/**
 * GET /auth/v1/me - ReownAuthentication session validation endpoint
 * 
 * Validates an existing JWT token and returns session account information.
 * This is used by ReownAuthentication.getSessions() to validate existing sessions.
 * 
 * Query params:
 * - projectId: Reown project ID
 * - includeAppKitAccount?: boolean
 * 
 * Headers:
 * - Authorization: Bearer <jwt_token>
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      );
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token || token.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing token' },
        { status: 401 }
      );
    }
    
    // Verify JWT token
    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || 'fallback-secret-change-in-production'
    );
    
    let decoded;
    try {
      decoded = await jwtVerify(token, secret);
    } catch (error) {
      console.error('❌ [ReownAuth /me] JWT verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    const payload = decoded.payload;
    
    // Extract session account information from JWT payload
    const sessionAccount = {
      aud: payload.aud as string,
      iss: payload.iss as string,
      exp: payload.exp as number,
      projectIdKey: payload.projectIdKey as string,
      sub: payload.sub as string,
      projectUuid: payload.projectUuid as string,
      profileUuid: payload.profileUuid as string,
      address: payload.address as string,
      chainId: payload.chainId as number,
      chainNamespace: payload.chainNamespace as string,
      caip2Network: payload.caip2Network as string,
      uri: payload.uri as string,
      domain: payload.domain as string,
      nonce: payload.nonce as string,
    };
    
    // Optionally include AppKit account info if requested
    const searchParams = request.nextUrl.searchParams;
    const includeAppKitAccount = searchParams.get('includeAppKitAccount') === 'true';
    
    if (includeAppKitAccount) {
      // Look up user in database to get email/name
      const systemUser = await getSystemUser();
      const db = createClient(systemUser);
      
      const checksummedAddress = payload.address as string;
      const user = await db.user.findUnique({
        where: { walletAddress: checksummedAddress } as any,
        include: {
          accounts: true,
        },
      });
      
      if (user) {
        (sessionAccount as any).appKitAccount = {
          email: user.email || null,
          name: user.name || null,
        };
      }
    }
    
    return NextResponse.json(sessionAccount);
  } catch (error) {
    console.error('❌ [ReownAuth /me] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
