/**
 * AppKit SIWE Session Store
 * 
 * Centralized Zustand store for managing AppKit SIWE session state
 * Tracks session status, prevents duplicate signature requests, and manages session persistence
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Address } from 'viem';

interface AppKitSIWESession {
  address: Address;
  chainId: number;
  expiresAt: string; // ISO string
  sessionId?: string;
  nonce?: string;
}

interface AppKitSessionState {
  // Current session
  currentSession: AppKitSIWESession | null;
  
  // Session checking state
  isCheckingSession: boolean;
  hasCheckedSession: boolean;
  
  // Signature state
  isSigningInProgress: boolean;
  signatureRequested: boolean;
  
  // Session creation state
  isCreatingSession: boolean;
  sessionCreated: boolean;
  
  // Error state
  error: string | null;
  
  // Last checked timestamp (to prevent excessive checks)
  lastCheckedAt: number | null;
  
  // Actions
  setCurrentSession: (session: AppKitSIWESession | null) => void;
  setCheckingSession: (checking: boolean) => void;
  setHasCheckedSession: (checked: boolean) => void;
  setSigningInProgress: (signing: boolean) => void;
  setSignatureRequested: (requested: boolean) => void;
  setCreatingSession: (creating: boolean) => void;
  setSessionCreated: (created: boolean) => void;
  setError: (error: string | null) => void;
  updateLastChecked: () => void;
  
  // Helper actions
  startSessionCheck: () => void;
  completeSessionCheck: (session: AppKitSIWESession | null) => void;
  startSigning: () => void;
  completeSigning: (session: AppKitSIWESession) => void;
  failSigning: (error: string) => void;
  reset: () => void;
  resetForWallet: (address: Address) => void;
  
  // Session validation
  isSessionValid: () => boolean;
  shouldCheckSession: () => boolean;
}

const initialState = {
  currentSession: null,
  isCheckingSession: false,
  hasCheckedSession: false,
  isSigningInProgress: false,
  signatureRequested: false,
  isCreatingSession: false,
  sessionCreated: false,
  error: null,
  lastCheckedAt: null,
};

export const useAppKitSessionStore = create<AppKitSessionState>()(
  persist(
    immer((set, get) => ({
      ...initialState,
      
      setCurrentSession: (session) => {
        set((state) => {
          state.currentSession = session;
          if (session) {
            state.sessionCreated = true;
            state.error = null;
          }
        });
      },
      
      setCheckingSession: (checking) => {
        set((state) => {
          state.isCheckingSession = checking;
        });
      },
      
      setHasCheckedSession: (checked) => {
        set((state) => {
          state.hasCheckedSession = checked;
        });
      },
      
      setSigningInProgress: (signing) => {
        set((state) => {
          state.isSigningInProgress = signing;
        });
      },
      
      setSignatureRequested: (requested) => {
        set((state) => {
          state.signatureRequested = requested;
        });
      },
      
      setCreatingSession: (creating) => {
        set((state) => {
          state.isCreatingSession = creating;
        });
      },
      
      setSessionCreated: (created) => {
        set((state) => {
          state.sessionCreated = created;
        });
      },
      
      setError: (error) => {
        set((state) => {
          state.error = error;
        });
      },
      
      updateLastChecked: () => {
        set((state) => {
          state.lastCheckedAt = Date.now();
        });
      },
      
      startSessionCheck: () => {
        set((state) => {
          state.isCheckingSession = true;
          state.error = null;
        });
      },
      
      completeSessionCheck: (session) => {
        set((state) => {
          state.isCheckingSession = false;
          state.hasCheckedSession = true;
          state.currentSession = session;
          state.lastCheckedAt = Date.now();
          if (session) {
            state.sessionCreated = true;
          }
        });
      },
      
      startSigning: () => {
        set((state) => {
          state.isSigningInProgress = true;
          state.signatureRequested = true;
          state.error = null;
        });
      },
      
      completeSigning: (session) => {
        set((state) => {
          state.isSigningInProgress = false;
          state.currentSession = session;
          state.sessionCreated = true;
          state.error = null;
        });
      },
      
      failSigning: (error) => {
        set((state) => {
          state.isSigningInProgress = false;
          state.error = error;
        });
      },
      
      reset: () => {
        set((state) => {
          Object.assign(state, initialState);
        });
      },
      
      resetForWallet: (address) => {
        set((state) => {
          // Only reset if the session is for a different wallet
          if (state.currentSession && state.currentSession.address.toLowerCase() !== address.toLowerCase()) {
            Object.assign(state, initialState);
          }
        });
      },
      
      isSessionValid: () => {
        const state = get();
        if (!state.currentSession) {
          return false;
        }
        
        const expiresAt = new Date(state.currentSession.expiresAt);
        const now = new Date();
        
        return expiresAt > now;
      },
      
      shouldCheckSession: () => {
        const state = get();
        
        // Don't check if already checking
        if (state.isCheckingSession) {
          return false;
        }
        
        // Don't check if signing is in progress
        if (state.isSigningInProgress) {
          return false;
        }
        
        // Don't check if session creation is in progress
        if (state.isCreatingSession) {
          return false;
        }
        
        // Check if enough time has passed since last check (prevent excessive checks)
        if (state.lastCheckedAt) {
          const timeSinceLastCheck = Date.now() - state.lastCheckedAt;
          const minCheckInterval = 2000; // 2 seconds minimum between checks
          if (timeSinceLastCheck < minCheckInterval) {
            return false;
          }
        }
        
        return true;
      },
    })),
    {
      name: 'appkit-session-store',
      partialize: (state) => ({
        // Only persist session data, not loading states
        currentSession: state.currentSession,
        hasCheckedSession: state.hasCheckedSession,
        lastCheckedAt: state.lastCheckedAt,
      }),
    }
  )
);

