import { isValidAddress, toChecksumAddress } from '@/lib/address-utils';
import { generateSIWEMessage } from '@/lib/siwe';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimiters, getClientIdentifier } from '@/lib/rate-limiter';

function checkNonceRateLimit(request: NextRequest): NextResponse | null {
  const clientId = getClientIdentifier(request);
  if (rateLimiters.nonceGeneration.checkLimit(clientId)) return null;
  const resetTime = rateLimiters.nonceGeneration.getResetTime(clientId);
  const resetSeconds = Math.ceil(resetTime / 1000);
  console.warn(`⚠️ [Nonce] Rate limit exceeded for ${clientId}`);
  return NextResponse.json(
    {
      error: 'Too many nonce requests',
      message: `Please wait ${resetSeconds} seconds before requesting another nonce`,
      retryAfter: resetSeconds,
    },
    {
      status: 429,
      headers: {
        'Retry-After': resetSeconds.toString(),
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + resetTime).toISOString(),
      },
    }
  );
}

async function handleNonceRequest(
  request: NextRequest,
  rawAddress: string | null,
  chainIdParam: string | null
): Promise<NextResponse> {
  const chainId = chainIdParam ? parseInt(chainIdParam, 10) : 11155111;
  console.log('🔐 Nonce request received for address:', rawAddress || 'none (AppKit flow)', 'chainId:', chainId);

  let address: string;
  if (rawAddress) {
    if (!isValidAddress(rawAddress)) {
      return NextResponse.json(
        { error: 'Invalid Ethereum address format' },
        { status: 400 }
      );
    }
    address = toChecksumAddress(rawAddress);
    console.log('✅ Using EIP-55 checksummed address:', address);
  } else {
    address = '0x0000000000000000000000000000000000000000';
    console.log('⚠️ No address provided - using placeholder for AppKit flow');
  }

  // Extract domain from request - MUST match where the user is actually signing
  const getDomain = () => {
    const host = request.headers.get('host');
    if (host) return host;
    try {
      const u = new URL(request.url);
      if (u.host) return u.host;
    } catch (e) {
      console.warn('Failed to parse request URL:', e);
    }
    if (process.env.NEXTAUTH_URL) {
      try {
        return new URL(process.env.NEXTAUTH_URL).host;
      } catch (e) {
        console.warn('Failed to parse NEXTAUTH_URL:', e);
      }
    }
    if (process.env.NEXT_PUBLIC_HOST) {
      try {
        return new URL(process.env.NEXT_PUBLIC_HOST).host;
      } catch (e) {
        console.warn('Failed to parse NEXT_PUBLIC_HOST:', e);
      }
    }
    return 'localhost:3000';
  };

  const domain = getDomain();
  const requestUrl = new URL(request.url);
  const uri = requestUrl.origin;

  console.log('🔐 Generating SIWE message:', { domain, uri, chainId });

  const session = await generateSIWEMessage(address, domain, uri, chainId);
  console.log('✅ SIWE nonce generated successfully:', session.nonce);

  return NextResponse.json({
    message: session.message,
    nonce: session.nonce,
    expiresAt: session.expiresAt.toISOString(),
  });
}

/** GET /api/auth/wallet/nonce - Generate SIWE nonce (query: address, chainId) */
export async function GET(request: NextRequest) {
  try {
    const rateLimitResponse = checkNonceRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;
    const { searchParams } = new URL(request.url);
    return await handleNonceRequest(request, searchParams.get('address'), searchParams.get('chainId'));
  } catch (error) {
    console.error('❌ [Nonce] GET error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Failed to generate nonce', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/** POST /api/auth/wallet/nonce - Generate SIWE nonce (body: walletAddress?, chainId?). Used by SocialWalletSIWEHandler. */
export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = checkNonceRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;
    let rawAddress: string | null = null;
    let chainIdParam: string | null = null;
    try {
      const body = await request.json();
      if (body && typeof body === 'object') {
        rawAddress = body.walletAddress ?? body.address ?? null;
        chainIdParam = body.chainId != null ? String(body.chainId) : null;
      }
    } catch {
      // No body or invalid JSON - use defaults
    }
    return await handleNonceRequest(request, rawAddress, chainIdParam);
  } catch (error) {
    console.error('❌ [Nonce] POST error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Failed to generate nonce', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
