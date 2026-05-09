import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

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
    };
  }
}

/**
 * Validate required environment variables
 */
function validateAuthConfig() {
  if (!process.env.NEXTAUTH_SECRET) {
    console.warn('⚠️ NEXTAUTH_SECRET is not set. Authentication may not work properly.');
  }
}

// Validate config on module load
validateAuthConfig();

/**
 * NextAuth Configuration for AppKit Authentication Bridge
 *
 * This provides a minimal NextAuth setup to bridge AppKit authentication
 * with existing session-based code that uses useSession().
 *
 * AppKit handles the actual authentication (email, socials, wallet) and
 * this provides session management compatibility.
 */
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "AppKit Bridge",
      credentials: {},
      async authorize(credentials) {
        // AppKit handles authentication, this just provides session compatibility
        // The actual user data comes from AppKit's authentication system

        if (!credentials) {
          console.error('❌ [NextAuth] No credentials provided');
          return null;
        }

        try {
          // ✅ FIX: Handle both formats for backward compatibility
          // 1. credentials.credentials (JSON string) - from SIWE onSignIn
          // 2. credentials object directly - from other auth methods
          let userData: any;

          if ((credentials as any).credentials) {
            // Format 1: credentials.credentials contains JSON string (SIWE format)
            const credentialsString = (credentials as any).credentials;
            if (typeof credentialsString === 'string') {
              userData = JSON.parse(credentialsString);
            } else {
              userData = credentialsString;
            }
          } else if (typeof credentials === 'string') {
            // Format 2: credentials is a JSON string (legacy format)
            userData = JSON.parse(credentials);
          } else {
            // Format 3: credentials is already an object
            userData = credentials;
          }

          console.log('✅ [NextAuth] Credentials parsed successfully:', {
            id: userData.id,
            email: userData.email,
            authMethod: userData.authMethod,
          });

          return {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            role: userData.role || 'CUSTOMER',
            authMethod: userData.authMethod || 'email',
            walletAddress: userData.walletAddress,
            walletType: userData.walletType,
            chainId: userData.chainId,
            networkName: userData.networkName,
            ensName: userData.ensName,
          };
        } catch (error) {
          console.error('❌ [NextAuth] Failed to parse credentials:', error);
          console.error('   Credentials received:', credentials);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // Store additional AppKit user data in JWT
        token.role = (user as any).role;
        token.authMethod = (user as any).authMethod;
        token.walletAddress = (user as any).walletAddress; 
        token.walletType = (user as any).walletType;
        token.chainId = (user as any).chainId;
        token.networkName = (user as any).networkName;
        token.ensName = (user as any).ensName;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && token.id) {
        // Populate session with AppKit user data
        session.user = {
          id: token.id as string,
          email: token.email as string,
          name: token.name as string,
          role: (token.role as string) || 'CUSTOMER',
          authMethod: (token.authMethod as string) || 'email',
          walletAddress: token.walletAddress as string | null,
          walletType: token.walletType as string | null,
          chainId: token.chainId as number | null,
          networkName: token.networkName as string | null,
          ensName: token.ensName as string | null,
        };
      }
      return session;
    },
  },
};
