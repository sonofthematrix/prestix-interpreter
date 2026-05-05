/**
 * useLogout Hook
 * 
 * Comprehensive logout functionality that handles:
 * - AppKit wallet disconnection
 * - NextAuth session termination
 * - Audit log creation
 * - Auth store cleanup
 * - Session reiniti alization
 */

'use client';

import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/auth-store';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { useDisconnect } from '../config';
import { useAppKitAccount } from '../config';

export interface LogoutOptions {
  redirectTo?: string;
  createAuditLog?: boolean;
  showToast?: boolean;
}

export interface UseLogoutReturn {
  logout: (options?: LogoutOptions) => Promise<void>;
  isLoggingOut: boolean;
  error: string | null;
}

export function useLogout(): UseLogoutReturn {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  // Use AppKit's disconnect hook (doesn't require WagmiProvider)
  // AppKit's useDisconnect is safe to use even when WagmiProvider isn't ready
  const { disconnect: disconnectWallet } = useDisconnect();
  const { isConnected } = useAppKitAccount();
  
  // Get auth store actions
  const authStore = useAuthStore();
  
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(async (options: LogoutOptions = {}) => {
    const {
      redirectTo = '/',
      createAuditLog = true,
      showToast = true
    } = options;

    setIsLoggingOut(true);
    setError(null);

    try {
      console.log('🚪 Starting comprehensive logout process...');
      
      const user = session?.user as any;
      const userId = user?.id;
      const walletAddress = user?.walletAddress;
      const authMethod = user?.authMethod;

      // Step 1: Create audit log for logout
      if (createAuditLog && userId) {
        try {
          console.log('📝 Creating logout audit log...');
          
          const response = await fetch('/api/auth/logout/audit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              walletAddress,
              authMethod,
              timestamp: new Date().toISOString(),
            }),
          });

          if (response.ok) {
            console.log('✅ Logout audit log created');
          } else {
            console.warn('⚠️ Failed to create audit log (non-critical)');
          }
        } catch (auditError) {
          console.error('⚠️ Audit log error (non-critical):', auditError);
          // Don't fail logout if audit fails
        }
      }

      // Step 2: Disconnect wallet if connected
      if (walletAddress && isConnected && disconnectWallet) {
        try {
          console.log('🔌 Disconnecting wallet:', walletAddress);
          await disconnectWallet();
          console.log('✅ Wallet disconnected successfully');
        } catch (walletError) {
          console.error('⚠️ Wallet disconnect error (non-critical):', walletError);
          // Don't fail logout if wallet disconnect fails
        }
      } else if (walletAddress && !isConnected) {
        console.log('⚠️ Wallet not connected, skipping wallet disconnect (storage will be cleared)');
      }

      // Step 3: Clear auth store state
      try {
        console.log('🧹 Clearing auth store...');
        await authStore.logout();
        console.log('✅ Auth store cleared');
      } catch (storeError) {
        console.error('⚠️ Auth store cleanup error:', storeError);
      }

      // Step 4: Sign out from NextAuth
      console.log('🔐 Signing out from NextAuth...');
      await signOut({ 
        redirect: false, // We'll handle redirect manually
      });
      console.log('✅ NextAuth sign-out complete');

      // Step 5: Clear any remaining wallet-related storage
      try {
        console.log('🧹 Clearing wallet-related storage...');
        
        // Clear wagmi state
        if (typeof window !== 'undefined') {
          localStorage.removeItem('wagmi.store');
          localStorage.removeItem('wagmi.cache');
          localStorage.removeItem('wagmi.wallet');
          localStorage.removeItem('wagmi.recentConnector');
          
          // Clear AppKit state
          localStorage.removeItem('W3M_RECENT_WALLET');
          localStorage.removeItem('W3M_VERSION');
          
          // Clear Reown state
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('wc@2:') || key.startsWith('@w3m/') || key.startsWith('reown-')) {
              localStorage.removeItem(key);
            }
          });
          
          console.log('✅ Storage cleared');
        }
      } catch (storageError) {
        console.error('⚠️ Storage cleanup error:', storageError);
      }

      // Step 6: Show success notification
      if (showToast) {
        toast({
          title: 'Signed Out Successfully',
          description: walletAddress 
            ? 'Your wallet has been disconnected and your session has ended.'
            : 'Your session has ended successfully.',
          variant: 'default',
        });
      }

      console.log('✅ Logout process complete');

      // Step 7: Redirect to specified page
      console.log('🔀 Redirecting to:', redirectTo);
      router.push(redirectTo);
      
      // Force a router refresh to ensure all state is cleared
      router.refresh();

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Logout failed';
      console.error('❌ Logout error:', errorMessage);
      setError(errorMessage);

      if (showToast) {
        toast({
          title: 'Logout Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoggingOut(false);
    }
  }, [session, disconnectWallet, isConnected, router, authStore, toast]);

  return {
    logout,
    isLoggingOut,
    error,
  };
}
