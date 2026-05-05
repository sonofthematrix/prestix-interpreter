/**
 * Wallet Connection Store
 * 
 * Central state management for wallet connection, authentication, and signature flow.
 * This store manages the ENTIRE wallet lifecycle to prevent duplicate auth requests.
 * 
 * Key Features:
 * - Tracks connection state
 * - Manages signature requests
 * - Prevents duplicate authentication
 * - Persists wallet address across sessions
 * - Handles connector status transitions
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ConnectionStatus = 
  | 'disconnected'      // No wallet connected
  | 'connecting'        // Wallet connection in progress
  | 'connected'         // Wallet connected but not authenticated
  | 'authenticating'    // Signature request in progress
  | 'authenticated'     // Fully authenticated with valid session
  | 'error';            // Error state

export type SignatureStatus =
  | 'idle'              // No signature request
  | 'requested'         // Signature request sent to wallet
  | 'pending'           // Waiting for user to sign in wallet
  | 'signed'            // Message signed successfully
  | 'rejected'          // User rejected signature
  | 'failed';           // Signature failed

interface WalletConnectionState {
  // Connection state
  address: string | null;
  chainId: number | null;
  connector: string | null;
  connectorStatus: 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
  connectionStatus: ConnectionStatus;
  
  // Signature state
  signatureStatus: SignatureStatus;
  signatureMessage: string | null;
  signature: string | null;
  nonce: string | null;
  
  // Error handling
  error: string | null;
  lastError: { message: string; timestamp: number } | null;
  
  // Timestamps for debugging and cooldown
  lastConnectionAttempt: number | null;
  lastAuthAttempt: number | null;
  lastSignatureRequest: number | null;
  
  // Flags
  isAutoAuthEnabled: boolean;
  shouldSkipAuth: boolean; // Skip auth if already in progress
  
  // Actions - Connection
  setConnecting: (address: string, connector: string) => void;
  setConnected: (address: string, chainId: number, connector: string) => void;
  setDisconnected: () => void;
  setConnectorStatus: (status: 'connecting' | 'connected' | 'reconnecting' | 'disconnected') => void;
  
  // Actions - Authentication
  startAuthentication: () => boolean; // Returns false if should skip
  setNonce: (nonce: string, message: string) => void;
  requestSignature: () => void;
  setSignaturePending: () => void;
  setSignatureSuccess: (signature: string) => void;
  setSignatureRejected: () => void;
  setSignatureFailed: (error: string) => void;
  setAuthenticated: () => void;
  
  // Actions - Error
  setError: (error: string) => void;
  clearError: () => void;
  
  // Actions - Control
  enableAutoAuth: () => void;
  disableAutoAuth: () => void;
  reset: () => void;
  
  // Getters
  canAuthenticate: () => boolean;
  isWalletReady: () => boolean;
  shouldWaitForConnector: () => boolean;
}

const COOLDOWN_PERIOD = 3000; // 3 seconds between auth attempts
const SIGNATURE_TIMEOUT = 60000; // 1 minute timeout for signature

export const useWalletConnectionStore = create<WalletConnectionState>()(
  persist(
    (set, get) => ({
      // Initial state
      address: null,
      chainId: null,
      connector: null,
      connectorStatus: 'disconnected',
      connectionStatus: 'disconnected',
      
      signatureStatus: 'idle',
      signatureMessage: null,
      signature: null,
      nonce: null,
      
      error: null,
      lastError: null,
      
      lastConnectionAttempt: null,
      lastAuthAttempt: null,
      lastSignatureRequest: null,
      
      isAutoAuthEnabled: true,
      shouldSkipAuth: false,

      // Connection Actions
      setConnecting: (address: string, connector: string) => {
        console.log('🔌 [WalletStore] Setting connecting state:', { address, connector });
        set({
          address,
          connector,
          connectorStatus: 'connecting',
          connectionStatus: 'connecting',
          lastConnectionAttempt: Date.now(),
          error: null,
        });
      },

      setConnected: (address: string, chainId: number, connector: string) => {
        console.log('✅ [WalletStore] Wallet connected:', { address, chainId, connector });
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
        console.log('🔌 [WalletStore] Wallet disconnected');
        const state = get();
        set({
          address: null,
          chainId: null,
          connector: null,
          connectorStatus: 'disconnected',
          connectionStatus: 'disconnected',
          signatureStatus: 'idle',
          signatureMessage: null,
          signature: null,
          nonce: null,
          shouldSkipAuth: false,
          // Keep error and lastError for debugging
        });
      },

      setConnectorStatus: (status) => {
        const current = get().connectorStatus;
        if (current !== status) {
          console.log(`🔄 [WalletStore] Connector status: ${current} → ${status}`);
          set({ connectorStatus: status });
        }
      },

      // Authentication Actions
      startAuthentication: () => {
        const state = get();
        const now = Date.now();
        
        console.log('🔐 [WalletStore] Checking if authentication should start:', {
          address: state.address,
          connectionStatus: state.connectionStatus,
          signatureStatus: state.signatureStatus,
          connectorStatus: state.connectorStatus,
          lastAuthAttempt: state.lastAuthAttempt,
          shouldSkipAuth: state.shouldSkipAuth,
        });

        // Check if wallet is ready
        if (!state.address) {
          console.log('❌ [WalletStore] No wallet address');
          return false;
        }

        // Check if already authenticated
        if (state.connectionStatus === 'authenticated') {
          console.log('✅ [WalletStore] Already authenticated');
          return false;
        }

        // Check if already authenticating
        if (state.connectionStatus === 'authenticating' || state.shouldSkipAuth) {
          console.log('⏭️ [WalletStore] Authentication already in progress');
          return false;
        }

        // Check if signature is pending
        if (state.signatureStatus === 'pending' || state.signatureStatus === 'requested') {
          console.log('⏭️ [WalletStore] Signature request already pending');
          return false;
        }

        // Check cooldown period
        if (state.lastAuthAttempt && (now - state.lastAuthAttempt) < COOLDOWN_PERIOD) {
          console.log('⏰ [WalletStore] Cooldown period active');
          return false;
        }

        // Check if connector is ready (not reconnecting)
        if (state.connectorStatus === 'reconnecting' || state.connectorStatus === 'connecting') {
          console.log('⏳ [WalletStore] Connector not ready:', state.connectorStatus);
          return false;
        }

        // All checks passed, start authentication
        console.log('✅ [WalletStore] Starting authentication');
        set({
          connectionStatus: 'authenticating',
          lastAuthAttempt: now,
          shouldSkipAuth: true, // Prevent duplicate attempts
          error: null,
        });

        return true;
      },

      setNonce: (nonce: string, message: string) => {
        console.log('📝 [WalletStore] Nonce received:', { nonce: nonce.substring(0, 10) + '...' });
        set({
          nonce,
          signatureMessage: message,
        });
      },

      requestSignature: () => {
        console.log('📝 [WalletStore] Requesting signature from wallet');
        set({
          signatureStatus: 'requested',
          lastSignatureRequest: Date.now(),
        });
      },

      setSignaturePending: () => {
        console.log('⏳ [WalletStore] Signature pending user approval');
        set({ signatureStatus: 'pending' });
      },

      setSignatureSuccess: (signature: string) => {
        console.log('✅ [WalletStore] Signature received');
        set({
          signature,
          signatureStatus: 'signed',
        });
      },

      setSignatureRejected: () => {
        console.log('❌ [WalletStore] Signature rejected by user');
        set({
          signatureStatus: 'rejected',
          connectionStatus: 'connected',
          shouldSkipAuth: false,
          error: 'Signature request rejected by user',
          lastError: {
            message: 'Signature request rejected by user',
            timestamp: Date.now(),
          },
        });
      },

      setSignatureFailed: (error: string) => {
        console.log('❌ [WalletStore] Signature failed:', error);
        set({
          signatureStatus: 'failed',
          connectionStatus: 'error',
          shouldSkipAuth: false,
          error,
          lastError: {
            message: error,
            timestamp: Date.now(),
          },
        });
      },

      setAuthenticated: () => {
        console.log('🎉 [WalletStore] Wallet authenticated successfully');
        set({
          connectionStatus: 'authenticated',
          signatureStatus: 'signed',
          shouldSkipAuth: true, // Keep true to prevent re-auth
        });
      },

      // Error Actions
      setError: (error: string) => {
        console.error('❌ [WalletStore] Error:', error);
        set({
          error,
          lastError: {
            message: error,
            timestamp: Date.now(),
          },
          connectionStatus: 'error',
          shouldSkipAuth: false,
        });
      },

      clearError: () => {
        set({ 
          error: null,
          shouldSkipAuth: false,
        });
      },

      // Control Actions
      enableAutoAuth: () => {
        console.log('🔓 [WalletStore] Auto-auth enabled');
        set({ isAutoAuthEnabled: true });
      },

      disableAutoAuth: () => {
        console.log('🔒 [WalletStore] Auto-auth disabled');
        set({ isAutoAuthEnabled: false });
      },

      reset: () => {
        console.log('🔄 [WalletStore] Resetting wallet state');
        set({
          address: null,
          chainId: null,
          connector: null,
          connectorStatus: 'disconnected',
          connectionStatus: 'disconnected',
          signatureStatus: 'idle',
          signatureMessage: null,
          signature: null,
          nonce: null,
          error: null,
          shouldSkipAuth: false,
          lastConnectionAttempt: null,
          lastAuthAttempt: null,
          lastSignatureRequest: null,
        });
      },

      // Getters
      canAuthenticate: () => {
        const state = get();
        return (
          state.address !== null &&
          state.connectorStatus === 'connected' &&
          state.connectionStatus !== 'authenticated' &&
          state.connectionStatus !== 'authenticating' &&
          !state.shouldSkipAuth &&
          state.isAutoAuthEnabled
        );
      },

      isWalletReady: () => {
        const state = get();
        return (
          state.address !== null &&
          state.connectorStatus === 'connected' &&
          state.connectionStatus === 'connected'
        );
      },

      shouldWaitForConnector: () => {
        const state = get();
        return (
          state.connectorStatus === 'connecting' ||
          state.connectorStatus === 'reconnecting'
        );
      },
    }),
    {
      name: 'wallet-connection-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist essential data
      partialize: (state) => ({
        address: state.address,
        chainId: state.chainId,
        connector: state.connector,
        connectionStatus: state.connectionStatus === 'authenticated' ? 'authenticated' : 'disconnected',
        isAutoAuthEnabled: state.isAutoAuthEnabled,
      }),
      // Clear sensitive data on rehydration
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('💾 [WalletStore] Rehydrated from storage:', {
            address: state.address,
            connectionStatus: state.connectionStatus,
          });
          // Clear sensitive data
          state.signature = null;
          state.nonce = null;
          state.signatureMessage = null;
          state.shouldSkipAuth = false;
          state.signatureStatus = 'idle';
          state.connectorStatus = 'disconnected';
        }
      },
    }
  )
);
