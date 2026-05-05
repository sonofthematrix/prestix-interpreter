"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchSession } from "@/store/thunks/fetchSession";

/**
 * Session gate: ONE SOURCE OF TRUTH from Redux auth state.
 * Initial load is triggered once by AuthGate via dispatch(fetchSession()). Refresh only via refresh() (e.g. on appkit-siwe-signin). No useEffect for state sync or data fetch.
 */
export function useSessionGate() {
  const dispatch = useAppDispatch();
  const { user, ndaAccepted, loading } = useAppSelector((s) => s.auth);

  return {
    user,
    ndaAccepted,
    loading,
    refresh: () => dispatch(fetchSession()),
  };
}
