"use client";

import { AppKitAuthBridge } from "@/components/auth/AppKitAuthBridge";
import { SignInWalletHandler } from "@/components/auth/SignInWalletHandler";
import { NextAuthSignInForm } from "@/components/auth/NextAuthSignInForm";
import { AuthLogo } from "@/components/brand-assets/logo";
import { AppConfig } from "@/config/app";
import { AppLayout } from "@/components/layouts/app-layout";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import dynamicImport from "next/dynamic";
import { useAppKitAccount } from "../../../config";

// Dynamically import AppKit section to prevent SSR errors
// AppKit hooks access browser APIs and must only run on client
const SignInSection = dynamicImport(
  () => import('@/components/auth/SignInAppKitSection').then(mod => ({ default: mod.SignInAppKitSection })),
  { ssr: false }
);

// Force dynamic rendering - this page requires client-side context
export const dynamic = 'force-dynamic';

export default function SignInPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { address, isConnected, status: appKitStatus } = useAppKitAccount();
  const [mounted, setMounted] = useState(false);
  
  // Check if user is authenticated via NextAuth
  const isAuthenticated = status === 'authenticated' && !!session?.user;

  // Check if wallet is connected via AppKit
  const isWalletConnected = isConnected && !!address;
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if already authenticated (via Stack Auth or NextAuth)
  useEffect(() => {
    if (mounted && isAuthenticated) {
      router.push('/');
    }
  }, [mounted, isAuthenticated, router]);

  // Show loading while checking session and wallet connection
  if (!mounted || status === 'loading' || appKitStatus === 'connecting') {
    return (
      <AppLayout showSidebar={true} showHeader={true}>
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // If authenticated, show redirect message
  if (isAuthenticated) {
    return (
      <AppLayout showSidebar={true} showHeader={true}>
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Redirecting to dashboard...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showSidebar={true} showHeader={true}>
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] py-4 px-4">
        <div className="max-w-md w-full">
          {/* Compact Card */}
          <div className="border border-border dark:border-gray-700 rounded-xl shadow-lg bg-card dark:bg-gray-800/95 backdrop-blur-sm overflow-hidden">
            {/* Minimal Header */}
            <div className="px-4 pt-4 pb-3 border-b border-border dark:border-gray-700">
              <div className="flex flex-col items-center space-y-2">
                <AuthLogo />
                {/* <div className="text-xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 dark:from-orange-500 dark:to-orange-400 bg-clip-text text-transparent text-center">
                  Wallet
                </div> */}
              </div>
            </div>

            {/* Form Content - Compact */}
            <div className="p-4 space-y-4">
              {/* NextAuth Sign-In Form (Email/Password + Google OAuth) */}
              <NextAuthSignInForm 
                redirectUrl="/"
                onSuccess={() => {
                  router.push("/");
                  router.refresh();
                }}
              />

              {/* Divider */}
              {/* <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border dark:border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-card dark:bg-gray-800 text-muted-foreground dark:text-gray-400">Or</span>
                </div>
              </div> */}

              {/* Wallet Authentication Options */}

              
              <SignInSection />
              <SignInWalletHandler />
            </div>

            {/* Minimal Footer */}
            {/* <div className="px-4 pb-4 pt-3 border-t border-border dark:border-gray-700 bg-muted/20 dark:bg-gray-900/20">
              <div className="text-center space-y-2">
                <div className="text-xs text-muted-foreground dark:text-gray-400">
                  No account?{' '}
                  <Link
                    href="/auth/signup"
                    className="font-medium text-primary dark:text-orange-400 hover:text-primary/80 dark:hover:text-orange-300 transition-colors"
                  >
                    Sign up
                  </Link>
                  {' '}or{' '}
                  <button
                    type="button"
                    className="font-medium text-primary dark:text-orange-400 hover:text-primary/80 dark:hover:text-orange-300 transition-colors"
                    onClick={() => router.push('/')}
                  >
                    Continue as Guest
                  </button>
                </div>
              </div>
            </div> */}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
