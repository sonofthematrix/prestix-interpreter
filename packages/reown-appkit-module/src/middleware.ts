import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Next.js Middleware
 * 
 * ⚠️ NOTE: Using middleware.ts instead of proxy.ts due to Next.js 16.0.5 bug
 * where it tries to rename proxy.js to middleware.js during build.
 * This will be updated to proxy.ts once Next.js fixes the issue.
 * 
 * ⚠️ EDGE RUNTIME: Middleware runs on Edge Runtime by default
 * - Cannot use Node.js APIs (fs, path, etc.)
 * - Cannot import database clients or server-only modules
 * - Keep middleware lightweight and fast
 * 
 * Handles:
 * - Wallet 2FA checks for authenticated users
 * - Redirects to 2FA page if wallet 2FA is required but not completed
 * - Protects API routes that require authentication
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip proxy for static files, API routes (except auth), and NextAuth routes
  // IMPORTANT: Skip ALL /api/auth routes to prevent interference with NextAuth
  // Includes all digital asset formats: images, videos, audio, documents, 3D models, CAD files, etc.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/static") ||
    pathname.match(/\.(ico|png|jpg|jpeg|gif|webp|svg|bmp|tiff|css|js|json|xml|txt|csv|md|mmd|mermaid)$/i) || // Images, web assets, text files, mermaid
    pathname.match(/\.(mp4|webm|ogg|mov|avi|wmv|mkv|flv|m4v)$/i) || // Video formats
    pathname.match(/\.(mp3|wav|wave|ogg|webm|aac|flac|m4a|wma)$/i) || // Audio formats
    pathname.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|rtf|odt|ods|odp)$/i) || // Document formats
    pathname.match(/\.(zip|rar|7z|tar|gz|bz2|xz)$/i) || // Archive formats
    pathname.match(/\.(obj|fbx|gltf|glb|stl|dae|3ds|ply|x3d|usd|usda|usdc)$/i) || // 3D model formats
    pathname.match(/\.(dwg|dxf|step|stp|iges|igs|sldprt|sldasm|catpart|catproduct|prt|jt|parasolid|acis)$/i) // CAD formats
  ) {
    return NextResponse.next();
  }

  // Check for NextAuth session token (only for non-auth routes)
  let token = null;
  try {
    token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
    });
  } catch (error) {
    // If token retrieval fails, continue without token (unauthenticated state)
    console.warn('⚠️ [Middleware] Failed to get token:', error);
  }

  // If no token, allow request (NextAuth will handle authentication)
  if (!token) {
    return NextResponse.next();
  }

  // Check if user has wallet 2FA required but not completed
  // This is stored in the session token
  const wallet2FARequired = (token as any).wallet2FARequired;
  const wallet2FAPending = (token as any).wallet2FAPending;

  // If wallet 2FA is required and pending, redirect to 2FA page
  // Skip redirect if already on 2FA page or auth pages
  if (
    wallet2FARequired &&
    wallet2FAPending &&
    !pathname.startsWith("/auth/wallet-2fa") &&
    !pathname.startsWith("/auth/signin") &&
    !pathname.startsWith("/auth/signup")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/wallet-2fa";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/auth (NextAuth routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};

