import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { signIn, signOut } from 'next-auth/react';
import { useSession } from '@/lib/auth/appkit-session';

// Safe wrapper for useSession to handle cases where SessionProvider is not available
function useSafeSession() {
  try {
    const sessionResult = useSession();
    return sessionResult || { data: null, status: 'loading' };
  } catch (error) {
    console.warn('useSession hook failed, returning safe defaults:', error);
    return { data: null, status: 'loading' };
  }
}
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AuthLogo } from '@/components/brand-assets/logo';
import { ResponsiveLandingBackground } from '@/components/brand-assets/backgrounds';
import { WalletAuthHandler } from '@/components/auth/WalletAuthHandler';
import { WalletConnectionPrompt } from '@/components/auth/WalletConnectionPrompt';
import { validateAdmin } from '@/lib/admin-validation';
import { clearLocalStorageOnSignOut } from '@/lib/auth-storage-clear';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import { 
  ArrowRight, 
  Shield, 
  AlertTriangle,
  Settings,
  Sun,
  Moon,
  Mail,
  Lock,
  Wallet
} from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  allowedRoles?: string[];
  fallback?: React.ReactNode;
}

interface User {
  id: string;
  email: string;
  role?: string;
  name?: string;
  walletAddress?: string;
  authMethod?: string;
}

export function AuthGuard({
  children,
  requireAuth = true,
  allowedRoles = [],
  fallback = null
}: AuthGuardProps) {
  const [mounted, setMounted] = useState(false);
  const [showWalletPrompt, setShowWalletPrompt] = useState(false);
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { data: session, status } = useSafeSession();

  // During static generation, return loading state or fallback
  if (typeof window === 'undefined' && !mounted) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  // Convert NextAuth session to our User interface with wallet admin validation
  const user: User | null = session ? (() => {
    const baseUser = {
      id: session.user?.id || '',
      email: session.user?.email || '',
      name: session.user?.name || '',
      role: (session.user as any)?.role || 'CUSTOMER',
      walletAddress: (session.user as any)?.walletAddress,
      authMethod: (session.user as any)?.authMethod,
    };

    // Check if wallet matches admin wallets/ENS
    if (baseUser.walletAddress) {
      const adminValidation = validateAdmin(
        baseUser.email,
        baseUser.walletAddress,
        (session.user as any)?.ensName
      );
      
      if (adminValidation.isAdmin) {
        console.log('🔐 Wallet Admin Access Granted:', adminValidation.message);
        return { ...baseUser, role: 'ADMIN' };
      }
    }

    return baseUser;
  })() : null;

  const loading = status === 'loading';

  // Show wallet connection prompt for authenticated users who signed in via email/social but don't have a wallet connected
  useEffect(() => {
    if (user && !loading && mounted) {
      const isAuthenticatedViaWallet = user.authMethod === 'wallet' && user.walletAddress;
      const isAuthenticatedViaOther = user.authMethod && user.authMethod !== 'wallet';

      // Show prompt if authenticated via email/social but no wallet connected
      if (isAuthenticatedViaOther && !isAuthenticatedViaWallet) {
        // Check if user has already dismissed the prompt (could store in localStorage)
        const hasDismissed = localStorage.getItem(`wallet-prompt-${user.id}`) === 'dismissed';
        if (!hasDismissed) {
          setShowWalletPrompt(true);
        }
      }
    }
  }, [user, loading, mounted]);

  // Get current theme state with fallback to dark mode
  const currentTheme = mounted ? (theme || 'dark') : 'dark';
  const isDarkMode = mounted ? (theme === 'dark' || !theme) : true; // Default to dark mode
  

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <ResponsiveLandingBackground variant="tokenizin-hero">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-6">
            <div className="flex justify-center mb-6">
              <AuthLogo className="h-24 w-40 sm:h-32 sm:w-52" />
            </div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto"></div>
            <div className="space-y-2">
              <p className="text-lg luxury-heading text-foreground">Loading...</p>
              <p className="text-sm luxury-text text-muted-foreground">Initializing theme</p>
            </div>
          </div>
        </div>
      </ResponsiveLandingBackground>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <ResponsiveLandingBackground variant="tokenizin-hero">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-6">
            <div className="flex justify-center mb-6">
              <AuthLogo className="h-24 w-40 sm:h-32 sm:w-52" />
            </div>
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto"></div>
            <div className="space-y-2">
              <p className="text-lg luxury-heading text-foreground">Authenticating...</p>
              <p className="text-sm luxury-text text-muted-foreground">Verifying your credentials</p>
            </div>
          </div>
        </div>
      </ResponsiveLandingBackground>
    );
  }

  // Check if authentication is required
  if (requireAuth && !user) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    // Show admin login screen instead of redirecting
    if (typeof window !== 'undefined') {
      return (
        <ResponsiveLandingBackground variant="tokenizin-hero">
          {/* Admin Watermark - Responsive to Dark Mode */}
          <div className="fixed inset-0 pointer-events-none z-10">
            <div className="absolute inset-0 opacity-5">
              <div 
                className={cn(
                  "w-full h-full transition-all duration-300",
                  isDarkMode 
                    ? "bg-gradient-to-br from-red-400/20 via-transparent to-red-400/20"
                    : "bg-gradient-to-br from-red-500/20 via-transparent to-red-500/20"
                )}
                style={{
                  backgroundImage: `repeating-linear-gradient(
                    45deg,
                    transparent,
                    transparent 100px,
                    ${isDarkMode ? 'rgba(248, 113, 113, 0.1)' : 'rgba(220, 38, 38, 0.1)'} 100px,
                    ${isDarkMode ? 'rgba(248, 113, 113, 0.1)' : 'rgba(220, 38, 38, 0.1)'} 200px
                  )`,
                  transform: 'rotate(-15deg)',
                  transformOrigin: 'center',
                }}
              />
            </div>
            <div className="absolute top-4 left-4 right-4 sm:top-10 sm:left-10 sm:right-10 text-center">
              <div className={cn(
                "inline-flex items-center gap-2 backdrop-blur-sm border rounded-full px-3 py-2 text-sm font-medium transition-all duration-300",
                isDarkMode
                  ? "bg-red-400/10 border-red-400/20 text-red-400"
                  : "bg-red-500/10 border-red-500/20 text-red-600"
              )}>
                <AlertTriangle className="w-4 h-4" />
                <span className="hidden sm:inline">ADMIN ACCESS - Changes may impact application functionality</span>
                <span className="sm:hidden">ADMIN ACCESS</span>
              </div>
            </div>
          </div>

          <div className="auth-page min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative z-20">
            <div className="max-w-md w-full">
              {/* Header */}
              <div className="text-center mb-8">
                {/* Theme Toggle */}
                <div className="flex justify-end mb-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
                    className={cn(
                      "h-9 w-9 transition-all duration-300",
                      isDarkMode 
                        ? "text-amber-400 hover:bg-amber-400/10" 
                        : "text-amber-600 hover:bg-amber-600/10"
                    )}
                    title={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`}
                  >
                    {currentTheme === 'dark' ? (
                      <Sun className="h-4 w-4" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )}
                    <span className="sr-only">Toggle theme</span>
                  </Button>
                </div>
                
                <div className="flex justify-center mb-6">
                  <AuthLogo className="h-32 w-52 sm:h-40 sm:w-64" />
                </div>
                <h1 className="text-3xl font-bold luxury-heading text-foreground mb-2">
                Admin Access Required
                </h1>
                <p className="text-lg luxury-text text-muted-foreground">
                  Sign in with administrator privileges to continue
              </p>
            </div>

              {/* Main Card */}
              <Card className="luxury-border shadow-elevated">
                <CardHeader className="text-center pb-6">
                  <CardTitle className="text-2xl luxury-heading text-foreground flex items-center justify-center gap-2">
                    <Settings className="w-6 h-6 text-primary" />
                    Administrator Login
                  </CardTitle>
                  <CardDescription className="luxury-text text-muted-foreground">
                    Access to admin documentation and management features
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <form onSubmit={(e) => {
                e.preventDefault();
                router.push('/login');
                  }} className="space-y-4">
                    {/* Demo Credentials Display - Dark Mode Responsive */}
                    <div className={cn(
                      "border rounded-lg p-4 space-y-3 transition-all duration-300",
                      isDarkMode
                        ? "bg-amber-400/10 border-amber-400/20"
                        : "bg-amber-50/50 border-amber-200/50"
                    )}>
                      <div className="flex items-center gap-2">
                        <Shield className={cn(
                          "w-4 h-4 transition-colors duration-300",
                          isDarkMode ? "text-amber-400" : "text-amber-600"
                        )} />
                        <h4 className={cn(
                          "text-sm font-medium transition-colors duration-300",
                          isDarkMode ? "text-amber-200" : "text-amber-800"
                        )}>Demo Admin Account</h4>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className={cn(
                            "w-3 h-3 transition-colors duration-300",
                            isDarkMode ? "text-amber-400" : "text-amber-600"
                          )} />
                          <span className={cn(
                            "transition-colors duration-300",
                            isDarkMode ? "text-amber-300" : "text-amber-700"
                          )}><strong>Email:</strong> admin@example.com</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Lock className={cn(
                            "w-3 h-3 transition-colors duration-300",
                            isDarkMode ? "text-amber-400" : "text-amber-600"
                          )} />
                          <span className={cn(
                            "transition-colors duration-300",
                            isDarkMode ? "text-amber-300" : "text-amber-700"
                          )}><strong>Password:</strong> admin123</span>
                        </div>
                      </div>
                  </div>

                    {/* Warning Notice - Dark Mode Responsive */}
                    <div className={cn(
                      "border rounded-lg p-4 transition-all duration-300",
                      isDarkMode
                        ? "bg-red-400/10 border-red-400/20"
                        : "bg-red-50/50 border-red-200/50"
                    )}>
                      <div className="flex items-start gap-3">
                        <AlertTriangle className={cn(
                          "w-5 h-5 mt-0.5 flex-shrink-0 transition-colors duration-300",
                          isDarkMode ? "text-red-400" : "text-red-600"
                        )} />
                        <div className="space-y-1">
                          <h4 className={cn(
                            "text-sm font-medium transition-colors duration-300",
                            isDarkMode ? "text-red-200" : "text-red-800"
                          )}>Administrative Access</h4>
                          <p className={cn(
                            "text-xs transition-colors duration-300",
                            isDarkMode ? "text-red-300" : "text-red-700"
                          )}>
                            You are accessing administrative functions that can modify application behavior, 
                            content, and system settings. Please use responsibly.
                    </p>
                  </div>
                      </div>
                  </div>

                    {/* Sign In Button */}
                    <Button
                    type="submit"
                      className="w-full gradient-primary shadow-elevated hover:shadow-luxury transition-all duration-300 cursor-pointer"
                      size="lg"
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Sign In as Administrator
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </form>

                  {/* Wallet Authentication Section */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Wallet className="h-4 w-4" />
                      <span>Connect with your wallet</span>
                    </div>
                    
                    {/* AppKit Wallet Button */}
                    <div className="w-full">
                      <appkit-button />
                    </div>

                    {/* Wallet Auth Handler - handles automatic authentication */}
                    <WalletAuthHandler 
                      redirectUrl="/admin/dashboard"
                      autoAuthenticate={true}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Footer */}
              <div className="text-center mt-6">
                <p className="text-sm luxury-text text-muted-foreground">
                  Need help?{" "}
                  <Link
                    href="/contact"
                    className="text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    Contact Support
                  </Link>
                </p>
                </div>
            </div>
          </div>
        </ResponsiveLandingBackground>
      );
    }
    return null;
  }

  // Check role-based access
  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role || 'USER')) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <ResponsiveLandingBackground variant="tokenizin-hero">
        <div className="flex items-center justify-center min-h-screen">
          <div className="max-w-md w-full text-center space-y-6">
            {/* Theme Toggle */}
            <div className="flex justify-end mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
                className={cn(
                  "h-9 w-9 transition-all duration-300",
                  isDarkMode 
                    ? "text-amber-400 hover:bg-amber-400/10" 
                    : "text-amber-600 hover:bg-amber-600/10"
                )}
                title={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {currentTheme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
                <span className="sr-only">Toggle theme</span>
              </Button>
            </div>
            
            <div className="flex justify-center mb-6">
              <AuthLogo className="h-24 w-40 sm:h-32 sm:w-52" />
            </div>
            <Card className="luxury-border shadow-elevated">
              <CardContent className="p-8 space-y-6">
                <div className="flex justify-center">
                  <div className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300",
                    isDarkMode 
                      ? "bg-red-400/20" 
                      : "bg-red-100"
                  )}>
                    <Shield className={cn(
                      "w-8 h-8 transition-colors duration-300",
                      isDarkMode ? "text-red-400" : "text-red-600"
                    )} />
                  </div>
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-foreground luxury-heading">Access Denied</h1>
                  <p className="text-muted-foreground luxury-text">
            You don't have permission to access this page.
          </p>
                </div>
                <Button
            onClick={() => typeof window !== 'undefined' && router.back()}
                  className="w-full gradient-primary shadow-elevated hover:shadow-luxury transition-all duration-300"
                  size="lg"
          >
                  <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
            Go Back
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </ResponsiveLandingBackground>
    );
  }

  return (
    <>
      {children}
      <WalletConnectionPrompt
        open={showWalletPrompt}
        onOpenChange={setShowWalletPrompt}
      />
    </>
  );
}

// Hook for accessing user context with wallet support
export function useAuth() {
  const { data: session, status } = useSafeSession();
  
  // Convert NextAuth session to our User interface with wallet admin validation
  const user: User | null = session ? (() => {
    const baseUser = {
      id: session.user?.id || '',
      email: session.user?.email || '',
      name: session.user?.name || '',
      role: (session.user as any)?.role || 'USER',
      walletAddress: (session.user as any)?.walletAddress,
      authMethod: (session.user as any)?.authMethod,
    };

    // Check if wallet matches admin wallets/ENS
    if (baseUser.walletAddress) {
      const adminValidation = validateAdmin(
        baseUser.email,
        baseUser.walletAddress,
        (session.user as any)?.ensName
      );
      
      if (adminValidation.isAdmin) {
        return { ...baseUser, role: 'ADMIN' };
      }
    }

    return baseUser;
  })() : null;

  const loading = status === 'loading';

  const login = async (email: string, password: string) => {
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        return { success: false, error: 'Invalid credentials' };
      } else {
        return { success: true, user };
      }
    } catch (error) {
      return { success: false, error: 'Login failed' };
    }
  };

  const logout = async () => {
    try {
      clearLocalStorageOnSignOut();
      // Clear server session cookie first so GET /api/auth/session returns null (prevents session reactivation)
      await apiFetch('/api/auth/signout', { method: 'POST' });
      await signOut({ redirect: false });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('appkit-signout'));
      }
    } catch (error) {
      console.error('Logout failed:', error);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('appkit-signout'));
      }
    }
  };

  return {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isWalletAuth: user?.authMethod === 'wallet',
    walletAddress: user?.walletAddress,
  };
}
