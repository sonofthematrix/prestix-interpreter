import { NextRequest, NextResponse } from 'next/server';
import { findOrCreateUserByWallet, verifySIWESignature, generateSIWEMessage } from '@/lib/siwe';
import { shortenAddress } from '@/lib/address-utils';

/**
 * POST /api/auth/wallet/verify - Simplified wallet verification for standalone package
 */
export async function POST(request: NextRequest) {
  try {
    // Check for required environment variables first
    if (!process.env.DATABASE_URL) {
      console.error('❌ [Wallet Verify] DATABASE_URL environment variable is not set');
      return NextResponse.json(
        { 
          error: 'Database connection required',
          message: 'DATABASE_URL environment variable is required for wallet authentication',
          details: process.env.NODE_ENV === 'development' 
            ? 'Please ensure DATABASE_URL is set in your environment variables' 
            : undefined
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { walletAddress, signature, message, chainId = '11155111' } = body; // Default to Sepolia testnet
    const siweEnv = process.env.NEXT_PUBLIC_SIWE;
    const siweEnableEnv = process.env.NEXT_PUBLIC_ENABLE_SIWE;
    const siweEnabled = !(
      (siweEnv && siweEnv.toLowerCase() === 'false') ||
      (siweEnableEnv && siweEnableEnv.toLowerCase() === 'false')
    );

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    const addrAbbr = shortenAddress(walletAddress);
    console.log(`🔐 [Wallet Verify] Verifying wallet: ${addrAbbr}`);

    // Find or create user with full database initialization
    const user = await findOrCreateUserByWallet(
      walletAddress,
      parseInt(chainId),
      'wallet'
    );

    // Parse chain ID
    const parsedChainId = parseInt(chainId.toString(), 10);
    
    // Use the message from the request if provided, otherwise generate a new one
    // CRITICAL: We should verify against the actual message that was signed, not a newly generated one
    let siweMessage;
    if (message) {
      // Use the message from the request (the one that was actually signed)
      siweMessage = { message, nonce: '', expiresAt: new Date() };
    } else {
      // Fallback: Generate SIWE message for verification (shouldn't happen in normal flow)
      console.warn('⚠️ [Wallet Verify] No message provided, generating new one (this should not happen)');
      const generated = await generateSIWEMessage(
        walletAddress,
        request.headers.get('host') || 'localhost:3000',
        `http://${request.headers.get('host') || 'localhost:3000'}`,
        parsedChainId
      );
      siweMessage = generated;
    }

    // ⚠️ CRITICAL: When SIWE is enabled, signature verification is MANDATORY
    // Sessions cannot be established without valid SIWE signatures
    if (siweEnabled) {
      // Require both signature and message when SIWE is enabled
      if (!signature || !message) {
        console.error('❌ [Wallet Verify] SIWE is enabled but signature or message is missing');
        return NextResponse.json(
          { 
            error: 'SIWE signature required',
            message: 'SIWE authentication is enabled. Both signature and message are required for wallet authentication.',
            details: signature ? 'Message is missing' : message ? 'Signature is missing' : 'Both signature and message are missing'
          },
          { status: 400 }
        );
      }

      // Verify the signature
      console.log('🔍 [Wallet Verify] Verifying SIWE signature...');
      const isValid = await verifySIWESignature(walletAddress, signature, message);
      if (!isValid) {
        console.error('❌ [Wallet Verify] SIWE signature verification failed');
        return NextResponse.json(
          { 
            error: 'Invalid signature',
            message: 'SIWE signature verification failed. Please sign the message again.',
            details: 'The signature does not match the message and wallet address'
          },
          { status: 400 }
        );
      }
      console.log('✅ [Wallet Verify] SIWE signature verified successfully');
    } else {
      console.warn('🚧 [Wallet Verify] SIWE disabled via NEXT_PUBLIC_SIWE=false or NEXT_PUBLIC_ENABLE_SIWE=false - skipping signature verification');
      // When SIWE is disabled, allow authentication without signature (for development/testing)
    }

    console.log(`✅ Wallet verification successful: ${user.id} (${addrAbbr})`);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        authMethod: 'wallet',
        walletAddress: walletAddress,
        chainId: parseInt(chainId),
      },
      message: siweMessage.message,
    success: true,
    siweEnabled,
    });

  } catch (error) {
    // Log full error details for debugging
    console.error('❌ [Wallet Verify] Wallet verification error:', error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Check for specific error types
    const isDatabaseError = errorMessage.includes('Database operation') || 
                           errorMessage.includes('database connection') ||
                           errorMessage.includes('DATABASE_URL') ||
                           errorMessage.includes('Cannot find package') ||
                           errorMessage.includes('Module not found') ||
                           errorMessage.includes('ZenStack') ||
                           errorMessage.includes('schema');
    
    const isMissingEnvVar = !process.env.DATABASE_URL;
    
    return NextResponse.json(
      { 
        error: isDatabaseError || isMissingEnvVar
          ? 'Database connection required. This endpoint requires a database connection to verify wallet authentication.'
          : 'Internal server error',
        message: isMissingEnvVar 
          ? 'DATABASE_URL environment variable is not set'
          : isDatabaseError
          ? 'Database connection failed. Please check your DATABASE_URL configuration.'
          : errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    );
  }
}