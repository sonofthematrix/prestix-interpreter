"use client";

/**
 * SignInWalletHandler Component
 * 
 * Handles wallet connection on signin page:
 * 1. Detects wallet connection via AppKit
 * 2. Checks user completeness
 * 3. Initializes missing records if needed
 * 4. Redirects to home WITHOUT creating session
 * 
 * This component separates wallet connection from session creation.
 * Session creation happens on the home page after message signature.
 */

import { useAppKitAccount } from '@reown/appkit/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import { Loader2 } from 'lucide-react';

export function SignInWalletHandler() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { address: appKitAddress, isConnected: appKitConnected } = useAppKitAccount();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'checking' | 'initializing' | 'complete' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  
  const processedAddressRef = useRef<string | null>(null);
  const processingRef = useRef(false);

  const resolvedAddress = address || appKitAddress;
  const resolvedConnected = isConnected || appKitConnected;

  useEffect(() => {
    // Skip if already processed this address or currently processing
    if (
      !resolvedConnected ||
      !resolvedAddress ||
      processingRef.current ||
      processedAddressRef.current === resolvedAddress
    ) {
      return;
    }

    console.log('🔐 [SignInWalletHandler] Wallet connection detected:', {
      address: resolvedAddress,
      isConnected: resolvedConnected,
      alreadyProcessed: processedAddressRef.current,
      currentlyProcessing: processingRef.current,
    });

    const handleWalletConnection = async () => {
      processingRef.current = true;
      processedAddressRef.current = resolvedAddress;
      setIsProcessing(true);
      setStatus('checking');
      setError(null);

      try {
        console.log('🔐 [SignInWalletHandler] Wallet connected, checking user completeness...');
        console.log('   Wallet address:', resolvedAddress);

        // Step 1: Check user completeness
        const verifyRes = await fetch('/api/auth/wallet/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: resolvedAddress,
            lookupOnly: true,
            checkCompleteness: true,
            initializeMissing: true, // Auto-initialize missing records
          }),
        });

        if (!verifyRes.ok) {
          const errorData = await verifyRes.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to verify user');
        }

        const { user, isComplete, missingRecords, isNewUser } = await verifyRes.json();

        console.log('✅ [SignInWalletHandler] User completeness check:', {
          userId: user.id,
          isComplete,
          missingRecords: missingRecords || [],
          isNewUser,
        });

        // Step 2: Verify completeness after initialization
        // The verify endpoint with initializeMissing: true already initializes and re-checks
        // But we do a final verification to ensure everything is complete
        let finalIsComplete = isComplete;
        let finalMissingRecords = missingRecords || [];

        if (!isComplete && missingRecords && missingRecords.length > 0) {
          console.log('🔄 [SignInWalletHandler] Some records were missing, verifying initialization...');
          setStatus('initializing');

          // Give initialization a moment to complete
          await new Promise(resolve => setTimeout(resolve, 1500));

          // Final completeness check
          const recheckRes = await fetch('/api/auth/wallet/check-completeness', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              walletAddress: resolvedAddress,
              initializeMissing: false, // Don't initialize again, just check
            }),
          });

          if (recheckRes.ok) {
            const recheckData = await recheckRes.json();
            finalIsComplete = recheckData.isComplete;
            finalMissingRecords = recheckData.missingRecords || [];

            if (!finalIsComplete && finalMissingRecords.length > 0) {
              console.warn('⚠️ [SignInWalletHandler] Some records still missing after initialization:', finalMissingRecords);
              // Don't throw error - allow user to proceed, but log warning
              // Missing records can be created later if needed
            }
          } else {
            console.warn('⚠️ [SignInWalletHandler] Could not verify completeness, proceeding anyway');
            // Proceed even if verification fails - initialization was attempted
          }
        }

        setStatus('complete');
        console.log('✅ [SignInWalletHandler] User setup complete, redirecting to home...', {
          isComplete: finalIsComplete,
          missingRecords: finalMissingRecords.length > 0 ? finalMissingRecords : 'none',
        });

        // Step 3: Redirect to home WITHOUT creating session
        // Session will be created on home page after message signature
        // Small delay to show "Redirecting..." status
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const redirectUrl = '/'; // Redirect to home without query parameters
        console.log('🔀 [SignInWalletHandler] Redirecting to:', redirectUrl);
        
        // Use router.push and refresh, with window.location fallback
        try {
          console.log('🔀 [SignInWalletHandler] Attempting router.push to:', redirectUrl);
          router.push(redirectUrl);
          router.refresh();
          
          // Fallback: if router.push doesn't work, use window.location after a short delay
          // This ensures we redirect even if Next.js router has issues
          const fallbackTimeout = setTimeout(() => {
            const currentPath = window.location.pathname;
            if (currentPath === '/auth/signin' || currentPath.startsWith('/auth/signin')) {
              console.warn('⚠️ [SignInWalletHandler] Router.push may have failed, using window.location fallback');
              console.log('   Current path:', currentPath);
              window.location.href = redirectUrl;
            } else {
              console.log('✅ [SignInWalletHandler] Redirect successful, current path:', currentPath);
            }
          }, 800);
          
          // Clear timeout if redirect succeeds (component unmounts)
          // Note: This is a best-effort approach
          
        } catch (redirectError) {
          console.error('❌ [SignInWalletHandler] Router redirect failed, using window.location:', redirectError);
          window.location.href = redirectUrl;
        }
        
        // Reset processing state after redirect attempt
        // Note: Don't reset processedAddressRef here - we want to prevent re-processing
        processingRef.current = false;
        setIsProcessing(false);
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to process wallet connection';
        console.error('❌ [SignInWalletHandler] Error:', errorMessage);
        setError(errorMessage);
        setStatus('error');
        
        // Reset processing state after error
        setTimeout(() => {
          processingRef.current = false;
          processedAddressRef.current = null;
          setIsProcessing(false);
          setStatus('idle');
        }, 3000);
      }
    };

    handleWalletConnection();
  }, [resolvedConnected, resolvedAddress, router]);

  // Reset when wallet disconnects
  useEffect(() => {
    if (!resolvedConnected) {
      processingRef.current = false;
      processedAddressRef.current = null;
      setIsProcessing(false);
      setStatus('idle');
      setError(null);
    }
  }, [resolvedConnected]);

  // Don't show loading indicator when wallet is successfully connected
  // Only show error state if there's an actual error
  if (status === 'error' && error) {
    return (
      <div className="fixed bottom-4 right-4 bg-card border border-border rounded-lg shadow-lg p-4 z-50 min-w-[200px]">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Error occurred</p>
            {error && (
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Component doesn't render anything visible when idle or processing successfully
  // Wallet connection is handled silently - redirect happens automatically
  return null;
}

