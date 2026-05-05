import { NextResponse } from 'next/server';

/**
 * CORS for /auth/v1/* (nonce, authenticate, me).
 * Allows app origins so Reown/AppKit can call these from the same or configured origin.
 *
 * Production must set NEXT_PUBLIC_W3M_API_URL to the app origin (e.g. https://prestix.vip)
 * so the client requests the same origin; otherwise the client may request localhost and get CORS errors.
 */

const ALLOWED_ORIGINS = [
  /^https:\/\/prestix\.vip$/,
  /^https:\/\/www\.prestix\.vip$/,
  /^https:\/\/.*\.vercel\.app$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin || !origin.trim()) return false;
  return ALLOWED_ORIGINS.some((re) => re.test(origin.trim()));
}

export function withAuthV1Cors<T extends NextResponse>(
  response: T,
  request: Request
): T {
  const origin = request.headers.get('origin');
  if (isAllowedOrigin(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin!);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, OPTIONS'
    );
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Nonce-JWT'
    );
  }
  return response;
}

export function authV1CorsPreflight(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Nonce-JWT',
      'Access-Control-Max-Age': '86400',
    },
  });
}
