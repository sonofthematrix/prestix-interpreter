import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type VerificationStatus = 'idle' | 'signing' | 'verifying' | 'success' | 'failed';
type ErrorType = 'signature_rejected' | 'verification_failed' | 'network_error' | 'unknown';

interface SIWEVerificationState {
  // State
  status: VerificationStatus;
  walletAddress: string | null;
  message: string | null;
  signature: string | null;
  nonce: string | null;
  chainId: number | null;
  
  // Error handling
  error: string | null;
  errorType: ErrorType | null;
  errorDetails: Record<string, any> | null;
  retryCount: number;
  lastAttemptAt: number | null;
  
  // Actions
  startSigning: (walletAddress: string, message: string, nonce: string, chainId: number) => void;
  setSignature: (signature: string) => void;
  startVerifying: () => void;
  markSuccess: () => void;
  markFailed: (error: string, errorType: ErrorType, details?: Record<string, any>) => void;
  incrementRetry: () => void;
  reset: () => void;
  resetForWallet: (walletAddress: string) => void;
}

const MAX_RETRIES = 3;

export const useSIWEVerificationStore = create<SIWEVerificationState>()(
  persist(
    (set, get) => ({
      // Initial state
      status: 'idle',
      walletAddress: null,
      message: null,
      signature: null,
      nonce: null,
      chainId: null,
      error: null,
      errorType: null,
      errorDetails: null,
      retryCount: 0,
      lastAttemptAt: null,

      startSigning: (walletAddress, message, nonce, chainId) =>
        set({
          status: 'signing',
          walletAddress,
          message,
          nonce,
          chainId,
          signature: null,
          error: null,
          errorType: null,
          errorDetails: null,
          retryCount: 0,
          lastAttemptAt: Date.now(),
        }),

      setSignature: (signature) =>
        set({
          signature,
          status: 'verifying',
        }),

      startVerifying: () =>
        set({
          status: 'verifying',
          error: null,
          errorType: null,
          errorDetails: null,
        }),

      markSuccess: () =>
        set({
          status: 'success',
          error: null,
          errorType: null,
          errorDetails: null,
          retryCount: 0,
        }),

      markFailed: (error, errorType, details) =>
        set({
          status: 'failed',
          error,
          errorType,
          errorDetails: details || null,
          lastAttemptAt: Date.now(),
        }),

      incrementRetry: () => {
        const current = get();
        set({
          retryCount: current.retryCount + 1,
          lastAttemptAt: Date.now(),
        });
      },

      reset: () =>
        set({
          status: 'idle',
          walletAddress: null,
          message: null,
          signature: null,
          nonce: null,
          chainId: null,
          error: null,
          errorType: null,
          errorDetails: null,
          retryCount: 0,
          lastAttemptAt: null,
        }),

      resetForWallet: (walletAddress) => {
        const current = get();
        if (current.walletAddress === walletAddress) {
          set({
            status: 'idle',
            message: null,
            signature: null,
            nonce: null,
            chainId: null,
            error: null,
            errorType: null,
            errorDetails: null,
            retryCount: 0,
            lastAttemptAt: null,
          });
        }
      },
    }),
    {
      name: 'siwe-verification-store',
      partialize: (state) => ({
        // Only persist error state, not sensitive data
        error: state.error,
        errorType: state.errorType,
        retryCount: state.retryCount,
        lastAttemptAt: state.lastAttemptAt,
      }),
    }
  )
);
