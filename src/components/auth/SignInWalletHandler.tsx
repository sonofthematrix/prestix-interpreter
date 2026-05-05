"use client";

/**
 * SignInWalletHandler Component
 * 
 * Handles wallet connection on signin page:
 * 1. Detects wallet connection via AppKit
 * 2. Checks user completeness
 * 3. Initializes missing records if needed
 * 4. Waits for AppKit SIWE signature flow to complete
 * 5. Redirects to home ONLY after session is created
 * 
 * ✅ ALIGNED WITH HOMEPAGE FLOW:
 * - Uses AppKit's automatic SIWE flow (same as homepage)
 * - AppKit calls getSession() → if null → prompts for signature
 * - After signature → verifyMessage() → onSignIn() creates session
 * - Only redirects after session exists
 */

import { useAppKitAccount } from '@reown/appkit/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import { Loader2 } from 'lucide-react';
import { useSession } from '@/lib/auth/appkit-session';

export function SignInWalletHandler() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { address: appKitAddress, isConnected: appKitConnected } = useAppKitAccount();
  const { data: session, status: sessionStatus } = useSession();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'checking' | 'initializing' | 'waiting-for-signature' | 'waiting-for-session' | 'complete' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  
  const processedAddressRef = useRef<string | null>(null);
  const processingRef = useRef(false);
  const sessionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const resolvedAddress = address || appKitAddress;
  const resolvedConnected = isConnected || appKitConnected;
  const isAuthenticated = sessionStatus === 'authenticated' && !!session?.user;

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
        const verifyRes = await fetch('/api/wallet-verify', {
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

        console.log('✅ [SignInWalletHandler] User setup complete, waiting for AppKit SIWE signature...', {
          isComplete: finalIsComplete,
          missingRecords: finalMissingRecords.length > 0 ? finalMissingRecords : 'none',
        });

        // Step 3: Wait for AppKit SIWE signature flow to complete
        // AppKit automatically calls getSession() when wallet connects
        // If getSession() returns null → AppKit prompts for signature
        // After signature → verifyMessage() → onSignIn() creates session
        // We need to wait for session to be created before redirecting
        
        setStatus('waiting-for-signature');
        console.log('⏳ [SignInWalletHandler] Waiting for AppKit SIWE signature flow...');
        console.log('   AppKit will automatically prompt for signature if no session exists');
        console.log('   Flow: Wallet connects → AppKit calls getSession() → if null → prompts signature → verifyMessage() → onSignIn() → session created');
        
        // Don't redirect immediately - let AppKit SIWE handle the signature flow
        // The signin page will redirect automatically when session is created (via useEffect)
        // This allows AppKit to prompt for signature before redirect
        setStatus('waiting-for-session');
        console.log('✅ [SignInWalletHandler] User completeness verified, waiting for SIWE signature and session creation...');
        console.log('   AppKit will handle signature flow automatically');
        
        // Reset processing state - session creation will be handled by AppKit SIWE
        // The signin page useEffect will handle redirect when session is created
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
      
      // Clear session check interval
      if (sessionCheckIntervalRef.current) {
        clearTimeout(sessionCheckIntervalRef.current);
        sessionCheckIntervalRef.current = null;
      }
    }
  }, [resolvedConnected]);
  
  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (sessionCheckIntervalRef.current) {
        clearTimeout(sessionCheckIntervalRef.current);
      }
    };
  }, []);

  // Show status indicators during processing
  if (status === 'waiting-for-signature' || status === 'waiting-for-session') {
    return (
      <div className="fixed bottom-4 right-4 bg-card border border-border rounded-lg shadow-lg p-4 z-50 min-w-[250px]">
        <div className="flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {status === 'waiting-for-signature' 
                ? 'Waiting for signature...' 
                : 'Creating session...'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Please sign the message in your wallet
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Show error state
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

