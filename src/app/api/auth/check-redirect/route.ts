import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/check-redirect - Diagnostic endpoint to check redirect URL configuration
 * 
 * This helps diagnose why WalletConnect login redirects to Neon OAuth instead of the app.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  
  // Check all environment variables that might affect redirects
  const envCheck = {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXT_PUBLIC_W3M_API_URL: process.env.NEXT_PUBLIC_W3M_API_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    DATABASE_URL: process.env.DATABASE_URL ? 
      process.env.DATABASE_URL.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') : // Hide credentials
      undefined,
    VERCEL_URL: process.env.VERCEL_URL,
    VERCEL_BRANCH_URL: process.env.VERCEL_BRANCH_URL,
  };
  
  // Check if NEXTAUTH_URL looks like a database URL or Neon OAuth server
  const nextAuthUrl = process.env.NEXTAUTH_URL || '';
  const isNeonUrl = nextAuthUrl.includes('neon.tech') || nextAuthUrl.includes('console.neon');
  const isNeonOAuthServer = nextAuthUrl.includes('localhost:42883') ||
                            nextAuthUrl.includes('127.0.0.1:42883') ||
                            nextAuthUrl.includes(':42883');
  const isDatabaseUrl = nextAuthUrl.includes('postgresql://') || 
                        nextAuthUrl.includes('postgres://') ||
                        nextAuthUrl.includes('mysql://') ||
                        nextAuthUrl.includes('mongodb://');
  
  // Calculate what redirect URLs should be
  const calculatedOrigin = request.headers.get('x-forwarded-host') 
    ? `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('x-forwarded-host')}`
    : origin;
  
  const redirectUri = `${calculatedOrigin}/api/auth/callback/google`;
  
  return NextResponse.json({
    diagnostic: {
      issue: isNeonUrl || isDatabaseUrl || isNeonOAuthServer
        ? isNeonOAuthServer
          ? '❌ CRITICAL: NEXTAUTH_URL appears to be set to Neon OAuth server (localhost:42883)! Stop any running Neon MCP Server or CLI tools.'
          : '❌ CRITICAL: NEXTAUTH_URL appears to be set to a database URL instead of your app URL!'
        : '✅ NEXTAUTH_URL looks correct',
      details: {
        isNeonUrl,
        isNeonOAuthServer,
        isDatabaseUrl,
        nextAuthUrlPreview: nextAuthUrl.substring(0, 50) + (nextAuthUrl.length > 50 ? '...' : ''),
      }
    },
    environment: envCheck,
    calculated: {
      origin: calculatedOrigin,
      redirectUri,
      expectedAppUrl: calculatedOrigin,
    },
    request: {
      url: requestUrl.toString(),
      origin,
      host: request.headers.get('host'),
      forwardedHost: request.headers.get('x-forwarded-host'),
      forwardedProto: request.headers.get('x-forwarded-proto'),
    },
    recommendations: {
      fix: isNeonUrl || isDatabaseUrl || isNeonOAuthServer
        ? isNeonOAuthServer
          ? [
              '❌ Neon OAuth Server Detected (localhost:42883)',
              '1. Stop any running Neon MCP Server: pkill -f neon',
              '2. Stop processes on port 42883: lsof -ti :42883 | xargs kill -9',
              '3. Check for Neon CLI tools: ps aux | grep neon',
              '4. Disable any Neon browser extensions',
              '5. Clear browser cache and restart browser',
              '6. Set NEXTAUTH_URL to your app URL: ' + calculatedOrigin,
              '7. Run diagnostic script: bun scripts/check-neon-oauth.sh',
            ]
          : [
              '1. Check your .env.local or Vercel environment variables',
              '2. Set NEXTAUTH_URL to your app URL (e.g., http://localhost:3000 or https://prestix.vip)',
              '3. DO NOT use DATABASE_URL for NEXTAUTH_URL',
              '4. NEXTAUTH_URL should be: ' + calculatedOrigin,
              '5. After fixing, restart your dev server or redeploy on Vercel',
            ]
        : [
            '✅ Configuration looks correct',
            'If you still see Neon redirects, check:',
            '1. Browser extensions that might intercept requests',
            '2. Proxy/VPN settings',
            '3. Reown Dashboard → Project Domains configuration',
            '4. Run: bun scripts/check-neon-oauth.sh to check for Neon processes',
          ],
    }
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    }
  });
}
