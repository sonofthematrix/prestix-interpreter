import { toChecksumAddress } from "@/lib/address-utils";
import { createClient } from "@/lib/db";
import { generateSIWEMessage, verifySIWESignature, findOrCreateUserByWallet, createSession } from "@/lib/siwe";
import { AuditActivityLogger } from "@/lib/services/audit-activity-logger";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { ZenStackAdapter } from "./zenstack-adapter";

/**
 * NextAuth Configuration with Database Sessions
 * 
 * This configuration uses NextAuth with database-backed sessions:
 * - All sessions stored in Session table (not JWT)
 * - Account records stored in Account table
 * - Supports credentials (email/password), Google OAuth, and wallet authentication
 * - Automatic cookie management (HTTP-only, secure)
 * 
 * Reference:
 * - NextAuth Database Sessions: https://next-auth.js.org/configuration/options#session
 * - NextAuth Adapters: https://next-auth.js.org/v4/adapters/overview
 */

/**
 * Extend NextAuth Session type to include custom fields
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      authMethod: string;
      walletAddress?: string | null;
      walletType?: string | null;
      chainId?: number | null;
      networkName?: string | null;
      ensName?: string | null;
      wallet2FAPending?: boolean; // Indicates if wallet 2FA is required but not yet completed
      wallet2FARequired?: boolean; // Indicates if user has wallet 2FA enabled
    };
  }
}

/**
 * NextAuth Configuration for AppKit Authentication Bridge
 *
 * This provides a minimal NextAuth setup to bridge AppKit authentication
 * with existing session-based code that uses useSession().
 *
 * AppKit handles the actual authentication (email, socials, wallet) and
 * this provides session management compatibility.
 */
// Build providers array conditionally to avoid initialization errors
const providers: NextAuthOptions['providers'] = [];

// Add Google provider only if credentials are available
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid profile email",
        },
      },
      // Custom profile handler to ensure proper data mapping
      profile(profile) {
        return {
          id: profile.sub,
          email: profile.email,
          name: profile.name,
          image: profile.picture,
        };
      },
      // CRITICAL: Allow account linking for users with the same email
      // This prevents OAuthAccountNotLinked errors when a user signs in with Google
      // but already has an account with that email using email/password or wallet auth
      allowDangerousEmailAccountLinking: true,
    })
  );
} else {
  // Only log warning at runtime, not during build (Next.js static page generation)
  // During build, this code runs multiple times causing repeated warnings
  // Check if we're in build phase - skip logging during build
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build' || 
                       process.env.NEXT_PHASE === 'phase-development-build';
  
  if (!isBuildPhase) {
    // Only log at runtime, use a flag to prevent multiple logs
    if (!global.__nextAuthGoogleWarningLogged) {
  console.warn('⚠️ [NextAuth] Google OAuth credentials not configured - Google sign-in disabled');
      global.__nextAuthGoogleWarningLogged = true;
    }
  }
}

// NOTE: This NextAuth configuration is DISABLED for the reown-appkit-module
// The module should use the parent application's NextAuth configuration instead
// This prevents authentication conflicts and ensures proper session management

// Export empty authOptions to prevent runtime errors
export const authOptions = null;
