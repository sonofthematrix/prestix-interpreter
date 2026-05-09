/**
 * AppKit Session Management
 *
 * Pure Reown AppKit authentication - NO NextAuth dependency
 * Session is derived from AppKit wallet connection state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toChecksumAddress } from '../address-utils';

export interface AppKitSession {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  user: {
    id: string;
    email: string | null;
    name: string | null;
    walletAddress: string;
    role: string;
    profileImageUrl?: string | null;
  } | null;
  expires: Date | null;
}

interface AppKitSessionStore {
  session: AppKitSession;
  /** ONE SOURCE OF TRUTH: hydration guard (not persisted) */
  hydrationAttemptedForAddress: string | null;
  setSession: (session: Partial<AppKitSession>) => void;
  clearSession: () => void;
  updateUser: (user: AppKitSession['user']) => void;
  /** Redux: hydrate session from cookie (store action, no useEffect data fetch) */
  hydrateFromCookie: (address: string) => Promise<void>;
}

const defaultSession: AppKitSession = {
  address: null,
  chainId: null,
  isConnected: false,
  user: null,
  expires: null,
};

/**
 * AppKit Session Store
 *
 * Manages user session based on wallet connection.
 * Persisted to localStorage for session continuity.
 * REDUX: All session state and side effects (e.g. cookie hydration) live here.
 */
export const useAppKitSession = create<AppKitSessionStore>()(
  persist(
    (set, get) => ({
      session: defaultSession,
      hydrationAttemptedForAddress: null,

      setSession: (updates) => set((state) => ({
        session: { ...state.session, ...updates }
      })),

      clearSession: () => set({
        session: defaultSession,
        hydrationAttemptedForAddress: null,
      }),

      updateUser: (user) => set((state) => ({
        session: {
          ...state.session,
          user,
          isConnected: !!user,
          expires: user ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
        }
      })),

      hydrateFromCookie: async (address: string) => {
        const state = get();
        if (!address || typeof address !== 'string' || address.trim() === '') return;

        set({ hydrationAttemptedForAddress: address });

        try {
          const res = await fetch('/api/auth/me', { credentials: 'include' });
          const data = res.ok ? await res.json() : null;
          if (!data?.user?.id) {
            // Reset so caller can retry (cookie may not be set yet - e.g. social login race)
            set({ hydrationAttemptedForAddress: null });
            return;
          }
          const u = data.user;
          // For social login, user may have walletAddress from embedded wallet; allow match or omit check
          if (u.walletAddress && u.walletAddress.toLowerCase() !== address.toLowerCase()) {
            set({ hydrationAttemptedForAddress: null });
            return;
          }
          console.log('✅ [AppKitSession] Hydrated session from cookie for user:', u.id);
          get().updateUser({
            id: u.id,
            email: u.email ?? null,
            name: u.name ?? null,
            walletAddress: u.walletAddress || address,
            role: u.role || 'CUSTOMER',
            profileImageUrl: (u as { profileImageUrl?: string }).profileImageUrl ?? null,
          });
        } catch (err) {
          console.warn('⚠️ [AppKitSession] Session hydration failed:', err);
          set({ hydrationAttemptedForAddress: null });
        }
      },
    }),
    {
      name: 'appkit-session',
      skipHydration: false,
      partialize: (state) => ({
        session: {
          address: state.session.address,
          chainId: state.session.chainId,
          isConnected: state.session.isConnected,
          user: state.session.user
            ? {
                ...state.session.user,
                profileImageUrl: state.session.user.profileImageUrl ?? null,
              }
            : null,
          expires: state.session.expires ? new Date(state.session.expires) : null,
        },
      }),
    }
  )
);

/**
 * Hook to get current session status
 */
export function useSession() {
  const session = useAppKitSession((state) => state.session);

  return {
    data: session.user ? { user: session.user, expires: session.expires ? new Date(session.expires) : null } : null,
    status: session.isConnected ? 'authenticated' : 'unauthenticated',
    update: useAppKitSession.getState().updateUser,
    clear: useAppKitSession.getState().clearSession,
  };
}

