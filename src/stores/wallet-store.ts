'use client';

import { create } from 'zustand';

export interface WalletUser {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  authMethod?: string;
}

export interface WalletSession {
  id: string;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
}

export interface ConnectionState {
  isConnected: boolean;
  isAuthenticated: boolean;
}

export interface WalletInfo {
  address: string | null;
  chainId: number | null;
  networkName: string | null;
}

export interface WalletStore {
  connectionState: ConnectionState;
  walletInfo: WalletInfo;
  user: WalletUser | null;
  session: WalletSession | null;
  error: string | null;
  setConnectionState: (state: ConnectionState) => void;
  setWalletInfo: (info: WalletInfo) => void;
  setUser: (user: WalletUser | null) => void;
  setSession: (session: WalletSession | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const defaultConnectionState: ConnectionState = { isConnected: false, isAuthenticated: false };
const defaultWalletInfo: WalletInfo = { address: null, chainId: null, networkName: null };

export const useWalletStore = create<WalletStore>((set) => ({
  connectionState: defaultConnectionState,
  walletInfo: defaultWalletInfo,
  user: null,
  session: null,
  error: null,
  setConnectionState: (state) => set({ connectionState: state }),
  setWalletInfo: (info) => set({ walletInfo: info }),
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setError: (error) => set({ error }),
  reset: () => set({
    connectionState: defaultConnectionState,
    walletInfo: defaultWalletInfo,
    user: null,
    session: null,
    error: null,
  }),
}));
