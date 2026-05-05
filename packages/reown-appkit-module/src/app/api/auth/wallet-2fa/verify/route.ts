/**
 * POST /api/auth/wallet-2fa/verify
 * 
 * Verify wallet signature for wallet-based 2FA.
 * 
 * This endpoint verifies that the user signed the SIWE message
 * with their configured wallet address.
 * 
 * Requires: Active NextAuth session (user must be authenticated)
 * Body: { signature: string, message: string }
 * Returns: { success: boolean, error?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/nextauth.config';
import { verifyWallet2FA } from '@/lib/auth/wallet-2fa';

export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'Authentication not available',
      message: 'This module uses the parent application\'s authentication system'
    },
    { status: 501 } // Not Implemented
  );
}

