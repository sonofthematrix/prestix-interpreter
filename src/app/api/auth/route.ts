/**
 * NextAuth API Route Handler
 * 
 * This route handler provides NextAuth API endpoints for session management.
 * It bridges AppKit authentication with NextAuth's session system for compatibility
 * with existing code that uses useSession() from next-auth/react.
 */

import { NextRequest, NextResponse } from 'next/server';
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/nextauth.config';

// ✅ FIX: Validate authOptions exists before creating handler
if (!authOptions) {
  throw new Error('NextAuth authOptions is not configured. Please check NEXTAUTH_SECRET environment variable.');
}

// Create NextAuth handler
const handler = NextAuth(authOptions);

// Handle GET requests (session, providers, etc.)
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ nextauth: string[] }> }
) {
  try {
    // ⚠️ CRITICAL: Exclude /sessions from NextAuth handling
    // /api/auth/sessions is handled by our custom route handler
    const params = await context.params;
    const resolvedParams = await params;
    const nextauthPath = resolvedParams.nextauth?.[0];
    
    if (nextauthPath === 'sessions') {
      // This should not happen if route priority is correct, but handle it gracefully
      console.warn('⚠️ [NextAuth] /sessions endpoint intercepted by NextAuth catch-all. This should be handled by /api/auth/sessions route.');
      return NextResponse.json(
        {
          error: 'Route conflict',
          message: 'This endpoint is handled by /api/auth/sessions, not NextAuth',
        },
        { status: 400 }
      );
    }

    // Validate environment variables
    if (!process.env.NEXTAUTH_SECRET && !process.env.AUTH_SECRET) {
      console.error('❌ [NextAuth] NEXTAUTH_SECRET or AUTH_SECRET is missing');
      return NextResponse.json(
        {
          error: 'Configuration error',
          message: 'NEXTAUTH_SECRET or AUTH_SECRET environment variable is missing',
        },
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Call NextAuth handler
    return await handler(request, { params });
  } catch (error: any) {
    console.error('❌ [NextAuth] GET handler error:', error);
    const errorMessage = error?.message || 'Authentication service unavailable';
    
    // ✅ FIX: Always return JSON, never HTML
    return NextResponse.json(
      {
        error: 'Authentication service unavailable',
        message: errorMessage,
      },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle POST requests (sign in, sign out, etc.)
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ nextauth: string[] }> }
) {
  try {
    // Validate environment variables
    if (!process.env.NEXTAUTH_SECRET && !process.env.AUTH_SECRET) {
      console.error('❌ [NextAuth] NEXTAUTH_SECRET or AUTH_SECRET is missing');
      return NextResponse.json(
        {
          error: 'Configuration error',
          message: 'NEXTAUTH_SECRET or AUTH_SECRET environment variable is missing',
        },
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Call NextAuth handler
    const params = await context.params;
    return await handler(request, { params });
  } catch (error: any) {
    console.error('❌ [NextAuth] POST handler error:', error);
    const errorMessage = error?.message || 'Authentication service unavailable';
    
    // ✅ FIX: Always return JSON, never HTML
    return NextResponse.json(
      {
        error: 'Authentication service unavailable',
        message: errorMessage,
      },
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

