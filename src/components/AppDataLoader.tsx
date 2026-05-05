"use client";

import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchSiteSettings,
  fetchPartners,
  fetchPartnershipStatus,
  fetchProfileCapabilities,
  fetchMembershipStatus,
} from "@/store/slices/dataSlice";

/**
 * Single place that loads shared server data into Redux on app mount and when user changes.
 * Prevents duplicate fetches and race conditions from multiple components.
 */
export function AppDataLoader() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const didLoadPublic = useRef(false);
  const lastUserId = useRef<string | null>(null);

  // Public data: load once on mount
  useEffect(() => {
    if (didLoadPublic.current) return;
    didLoadPublic.current = true;
    dispatch(fetchSiteSettings());
    dispatch(fetchPartners());
  }, [dispatch]);

  // User-dependent data: load when user is set, clear when user logs out
  useEffect(() => {
    const uid = user?.id ?? null;
    if (uid === lastUserId.current) return;
    lastUserId.current = uid;
    if (uid) {
      dispatch(fetchPartnershipStatus());
      dispatch(fetchProfileCapabilities());
      dispatch(fetchMembershipStatus());
    }
  }, [user?.id, dispatch]);

  return null;
}
