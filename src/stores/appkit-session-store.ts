import { create } from 'zustand';

type SignatureStatus = 'idle' | 'pending' | 'signed' | 'failed';
type SessionStatus = 'unknown' | 'creating' | 'authenticated' | 'error';

interface AppKitSessionState {
  walletAddress: string | null;
  isWalletConnected: boolean;
  needsSignature: boolean;
  signatureStatus: SignatureStatus;
  sessionStatus: SessionStatus;
  lastError: string | null;
  setWalletConnection: (address: string | null, connected: boolean) => void;
  markNeedsSignature: (flag: boolean) => void;
  markSignaturePending: () => void;
  markSignatureSuccess: () => void;
  markSignatureFailed: (message?: string) => void;
  markSessionCreating: () => void;
  markSessionAuthenticated: () => void;
  markSessionError: (message: string) => void;
  clearError: () => void;
  reset: () => void;
}

export const useAppKitSessionStore = create<AppKitSessionState>()((set) => ({
  walletAddress: null,
  isWalletConnected: false,
  needsSignature: false,
  signatureStatus: 'idle',
  sessionStatus: 'unknown',
  lastError: null,
  setWalletConnection: (address, connected) =>
    set(() => ({
      walletAddress: address,
      isWalletConnected: connected,
    })),
  markNeedsSignature: (flag) =>
    set(() => ({
      needsSignature: flag,
      signatureStatus: flag ? 'pending' : 'idle',
    })),
  markSignaturePending: () =>
    set(() => ({
      signatureStatus: 'pending',
      lastError: null,
    })),
  markSignatureSuccess: () =>
    set(() => ({
      signatureStatus: 'signed',
      lastError: null,
    })),
  markSignatureFailed: (message) =>
    set(() => ({
      signatureStatus: 'failed',
      lastError: message || null,
    })),
  markSessionCreating: () =>
    set(() => ({
      sessionStatus: 'creating',
      lastError: null,
    })),
  markSessionAuthenticated: () =>
    set(() => ({
      sessionStatus: 'authenticated',
      lastError: null,
    })),
  markSessionError: (message) =>
    set(() => ({
      sessionStatus: 'error',
      lastError: message,
    })),
  clearError: () =>
    set(() => ({
      lastError: null,
    })),
  reset: () =>
    set(() => ({
      walletAddress: null,
      isWalletConnected: false,
      needsSignature: false,
      signatureStatus: 'idle',
      sessionStatus: 'unknown',
      lastError: null,
    })),
}));

