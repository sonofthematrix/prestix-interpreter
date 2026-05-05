/**
 * GET /api/auth/wallet-2fa/message
 * 
 * Generate SIWE message for wallet-based 2FA verification.
 * 
 * This endpoint is called when a user with wallet 2FA enabled
 * needs to sign a message to complete authentication.
 * 
 * Requires: Active NextAuth session (user must be authenticated)
 * Returns: SIWE message, nonce, and expiration time
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth.config';
import { generateWallet2FAMessage } from '@/lib/auth/wallet-2fa';

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'Authentication not available',
      message: 'This module uses the parent application\'s authentication system'
    },
    { status: 501 } // Not Implemented
  );
}

