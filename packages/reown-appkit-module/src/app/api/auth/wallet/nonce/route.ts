import { isValidAddress, toChecksumAddress } from '@/lib/address-utils';
import { generateSIWEMessage } from '@/lib/siwe';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/wallet/nonce - Generate SIWE nonce for wallet authentication
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawAddress = searchParams.get('address');
    const chainIdParam = searchParams.get('chainId');
    
    // Parse chain ID (default to Sepolia testnet 11155111)
    const chainId = chainIdParam ? parseInt(chainIdParam, 10) : 11155111;
    
    console.log('🔐 Nonce request received for address:', rawAddress || 'none (AppKit flow)', 'chainId:', chainId);
    
    // Address is optional - AppKit's getNonce doesn't provide address
    // If address is provided, validate and use it; otherwise use placeholder
    let address: string | undefined;
    
    if (rawAddress) {
    // Validate Ethereum address format using viem's validation
    if (!isValidAddress(rawAddress)) {
      console.error('❌ Invalid address format:', rawAddress);
      return NextResponse.json(
        { error: 'Invalid Ethereum address format' },
        { status: 400 }
      );
    }

    // Get EIP-55 checksummed address
      address = toChecksumAddress(rawAddress);
    console.log('✅ Using EIP-55 checksummed address:', address);
    } else {
      // For AppKit flow, we'll use a placeholder address that will be replaced
      // when the message is signed (AppKit handles this)
      address = '0x0000000000000000000000000000000000000000';
      console.log('⚠️ No address provided - using placeholder for AppKit flow');
    }

    // Extract domain from request or environment
    const getDomain = () => {
      // Priority 1: NEXTAUTH_URL (explicitly set in Vercel)
      if (process.env.NEXTAUTH_URL) {
        try {
          const url = new URL(process.env.NEXTAUTH_URL);
          return url.host;
        } catch (e) {
          console.warn('Failed to parse NEXTAUTH_URL:', e);
        }
      }
      
      // Priority 2: Request headers (Vercel/deployment)
      const host = request.headers.get('host');
      if (host) {
        return host;
      }
      
      // Priority 3: NEXT_PUBLIC_HOST (fallback)
      if (process.env.NEXT_PUBLIC_HOST) {
        try {
          const url = new URL(process.env.NEXT_PUBLIC_HOST);
          return url.host;
        } catch (e) {
          console.warn('Failed to parse NEXT_PUBLIC_HOST:', e);
        }
      }
      
      // Priority 4: Development fallback
      return 'localhost:3000';
    };

    const domain = getDomain();
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    
    // Get the origin from the request URL to match where the signature is being requested
    // This ensures SIWE verification passes (URI must match the origin)
    const requestUrl = new URL(request.url);
    const origin = requestUrl.origin; // Use the actual origin from the request
    const uri = origin; // Use origin without path - SIWE standard practice

    console.log('🔐 Generating SIWE message:', { domain, uri, protocol, origin, chainId });

    // Generate SIWE message with address (or placeholder for AppKit) and chain ID
    const session = await generateSIWEMessage(address!, domain, uri, chainId);  

    console.log('✅ SIWE nonce generated successfully:', session.nonce);

    return NextResponse.json({
      message: session.message,
      nonce: session.nonce,
      expiresAt: session.expiresAt.toISOString(),
      chainId: session.chainId,
    });
  } catch (error) {
    console.error('❌ Error generating SIWE nonce:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown',
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to generate nonce',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
