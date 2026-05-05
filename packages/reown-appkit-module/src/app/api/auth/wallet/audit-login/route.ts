import { NextRequest, NextResponse } from 'next/server';
import { AuditActivityLogger } from '@/lib/services/audit-activity-logger';

/**
 * POST /api/auth/wallet/audit-login - Record audit log for wallet sign-in attempt
 * 
 * Records an audit log entry when a wallet signature is provided for authentication.
 * This is called from WalletSessionGuard when user signs a message to access the wallet page.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId, 
      walletAddress, 
      walletProvider,
      authMethod = 'wallet',
      provider = 'credentials',
      signatureProvided = false,
      ipAddress,
      userAgent,
    } = body;

    if (!userId || !walletAddress) {
      return NextResponse.json(
        { error: 'User ID and wallet address are required' },
        { status: 400 }
      );
    }

    console.log('📝 [Audit Login] Recording wallet sign-in attempt:', {
      userId,
      walletAddress,
      walletProvider,
      signatureProvided,
    });

    // Get request metadata if not provided
    const finalIpAddress = ipAddress || 
                          request.headers.get('x-forwarded-for')?.split(',')[0] || 
                          request.headers.get('x-real-ip') || 
                          'unknown';
    const finalUserAgent = userAgent || 
                          request.headers.get('user-agent') || 
                          'unknown';

    // Record audit log using AuditActivityLogger
    await AuditActivityLogger.logLogin(userId, {
      authMethod,
      provider,
      walletAddress,
      walletProvider,
      signatureProvided,
      ipAddress: finalIpAddress,
      userAgent: finalUserAgent,
      sessionId: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    });

    console.log('✅ [Audit Login] Audit log recorded successfully');

    return NextResponse.json({
      success: true,
      message: 'Audit log recorded successfully',
    });

  } catch (error: any) {
    console.error('❌ [Audit Login] Error recording audit log:', error);
    return NextResponse.json(
      { 
        error: 'Failed to record audit log',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

