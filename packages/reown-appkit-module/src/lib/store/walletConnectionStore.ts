import { create } from 'zustand';

export type ConnectorStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'authenticating' | 'authenticated';
export type SignatureStatus = 'idle' | 'pending' | 'success' | 'rejected' | 'failed';

interface WalletConnectionState {
  // Connection state
  connectorStatus: ConnectorStatus;
  connectionStatus: ConnectionStatus;
  address: string | null;
  chainId: number | null;
  connector: string | null;
  
  // Signature state
  signatureStatus: SignatureStatus;
  nonce: string | null;
  siweMessage: string | null;
  signature: string | null;
  
  // Error state
  error: string | null;
  
  // Actions - Connection
  setConnectorStatus: (status: ConnectorStatus) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setConnected: (address: string, chainId: number, connector: string) => void;
  setDisconnected: () => void;
  setAuthenticated: () => void;
  
  // Actions - Signature
  setNonce: (nonce: string, siweMessage: string) => void;
  requestSignature: () => void;
  setSignaturePending: () => void;
  setSignatureSuccess: (signature: string) => void;
  setSignatureRejected: () => void;
  setSignatureFailed: (error: string) => void;
  
  // Actions - Authentication flow
  startAuthentication: () => boolean;
  
  // Actions - Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
  
  // Actions - Utility
  isWalletReady: () => boolean;
  reset: () => void;
}

export const useWalletConnectionStore = create<WalletConnectionState>((set, get) => ({
  // Initial state
  connectorStatus: 'disconnected',
  connectionStatus: 'disconnected',
  address: null,
  chainId: null,
  connector: null,
  signatureStatus: 'idle',
  nonce: null,
  siweMessage: null,
  signature: null,
  error: null,
  
  // Connection actions
  setConnectorStatus: (status: ConnectorStatus) => set({ connectorStatus: status }),
  setConnectionStatus: (status: ConnectionStatus) => set({ connectionStatus: status }),
  
  setConnected: (address, chainId, connector) => {
    set({
      address,
      chainId,
      connector,
      connectorStatus: 'connected',
      connectionStatus: 'connected',
      error: null,
    });
  },
  
  setDisconnected: () => {
    set({
      address: null,
      chainId: null,
      connector: null,
      connectorStatus: 'disconnected',
      connectionStatus: 'disconnected',
      signatureStatus: 'idle',
      nonce: null,
      siweMessage: null,
      signature: null,
      error: null,
    });
  },
  
  setAuthenticated: () => {
    set({ connectionStatus: 'authenticated' });
  },
  
  // Signature actions
  setNonce: (nonce, siweMessage) => {
    set({ nonce, siweMessage });
  },
  
  requestSignature: () => {
    set({ signatureStatus: 'pending' });
  },
  
  setSignaturePending: () => {
    set({ signatureStatus: 'pending' });
  },
  
  setSignatureSuccess: (signature) => {
    set({ signatureStatus: 'success', signature });
  },
  
  setSignatureRejected: () => {
    set({ signatureStatus: 'rejected' });
  },
  
  setSignatureFailed: (error) => {
    set({ signatureStatus: 'failed', error });
  },
  
  // Authentication flow
  startAuthentication: () => {
    const state = get();
    // Prevent duplicate authentication attempts
    if (state.connectionStatus === 'authenticating' || state.connectionStatus === 'authenticated') {
      return false;
    }
    set({ connectionStatus: 'authenticating' });
    return true;
  },
  
  // Error handling
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
  
  // Utility
  isWalletReady: () => {
    const state = get();
    return !!(
      state.address &&
      (state.connectorStatus === 'connected' || state.connectionStatus === 'connected')
    );
  },
  
  reset: () => {
    set({
      connectorStatus: 'disconnected',
      connectionStatus: 'disconnected',
      address: null,
      chainId: null,
      connector: null,
      signatureStatus: 'idle',
      nonce: null,
      siweMessage: null,
      signature: null,
      error: null,
    });
  },
}));
