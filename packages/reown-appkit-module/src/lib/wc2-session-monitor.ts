/**
 * WalletConnect 2.0 Session Monitor
 * 
 * Monitors WC 2.0 JWT expiration and manages session synchronization
 * 
 * WC 2.0 JWT TTLs:
 * - Pairing JWT: 30 days TTL
 * - Session JWT: 7 days TTL
 * 
 * This utility:
 * 1. Monitors JWT expiration times
 * 2. Triggers refresh before expiration
 * 3. Synchronizes WC 2.0 sessions with application sessions
 */

import { useAppKitAccount } from '@reown/appkit/react';
import { useAppKitSessionStore } from '../store/appkitSessionStore';

interface WC2SessionInfo {
  pairingExpiresAt?: number; // Pairing JWT expiry (30 days)
  sessionExpiresAt?: number; // Session JWT expiry (7 days)
  lastRefreshAt?: number;
}

// WC 2.0 JWT TTLs (in milliseconds)
const PAIRING_JWT_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
const SESSION_JWT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const REFRESH_THRESHOLD = 24 * 60 * 60 * 1000; // Refresh 24 hours before expiry

/**
 * Check if WC 2.0 session JWT is expired or near expiration
 */
export function isWC2SessionExpiring(expiresAt?: number): boolean {
  if (!expiresAt) return true;
  
  const now = Date.now();
  const timeUntilExpiry = expiresAt - now;
  
  // Consider expired if less than refresh threshold remaining
  return timeUntilExpiry < REFRESH_THRESHOLD;
}

/**
 * Check if WC 2.0 pairing JWT is expired or near expiration
 */
export function isWC2PairingExpiring(expiresAt?: number): boolean {
  if (!expiresAt) return true;
  
  const now = Date.now();
  const timeUntilExpiry = expiresAt - now;
  
  // Consider expired if less than refresh threshold remaining
  return timeUntilExpiry < REFRESH_THRESHOLD;
}

/**
 * Get time until WC 2.0 session expires (in milliseconds)
 */
export function getTimeUntilSessionExpiry(expiresAt?: number): number {
  if (!expiresAt) return 0;
  return Math.max(0, expiresAt - Date.now());
}

/**
 * Get time until WC 2.0 pairing expires (in milliseconds)
 */
export function getTimeUntilPairingExpiry(expiresAt?: number): number {
  if (!expiresAt) return 0;
  return Math.max(0, expiresAt - Date.now());
}

/**
 * Format time until expiry as human-readable string
 */
export function formatTimeUntilExpiry(ms: number): string {
  if (ms <= 0) return 'Expired';
  
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Monitor WC 2.0 session and trigger refresh if needed
 * 
 * This should be called periodically (e.g., every hour) to check session status
 */
export function monitorWC2Session(
  onSessionExpiring?: () => void,
  onPairingExpiring?: () => void
): WC2SessionInfo | null {
  // Get current AppKit session info
  const sessionStore = useAppKitSessionStore.getState();
  const currentSession = sessionStore.currentSession;
  
  if (!currentSession) {
    return null;
  }
  
  const sessionInfo: WC2SessionInfo = {
    sessionExpiresAt: new Date(currentSession.expiresAt).getTime(),
    lastRefreshAt: sessionStore.lastCheckedAt || undefined,
  };
  
  // Check if session is expiring
  if (isWC2SessionExpiring(sessionInfo.sessionExpiresAt)) {
    console.warn('⚠️ [WC 2.0] Session JWT expiring soon:', 
      formatTimeUntilExpiry(getTimeUntilSessionExpiry(sessionInfo.sessionExpiresAt)));
    onSessionExpiring?.();
  }
  
  // Note: Pairing expiry is managed by AppKit internally
  // We can't directly access pairing JWT expiry, but AppKit handles it
  
  return sessionInfo;
}

/**
 * Synchronize WC 2.0 session with application session
 * 
 * Ensures application-level session matches WC 2.0 session state
 */
export function syncWC2SessionWithAppSession(
  wc2Session: WC2SessionInfo,
  appSessionExpiresAt: Date
): boolean {
  const sessionStore = useAppKitSessionStore.getState();
  const currentSession = sessionStore.currentSession;
  
  if (!currentSession) {
    return false;
  }
  
  const wc2ExpiresAt = wc2Session.sessionExpiresAt 
    ? new Date(wc2Session.sessionExpiresAt)
    : null;
  
  const appExpiresAt = appSessionExpiresAt;
  
  // Check if sessions are synchronized (within 1 hour tolerance)
  const timeDiff = Math.abs(
    (wc2ExpiresAt?.getTime() || 0) - appExpiresAt.getTime()
  );
  
  const tolerance = 60 * 60 * 1000; // 1 hour
  
  if (timeDiff > tolerance) {
    console.warn('⚠️ [WC 2.0] Session mismatch detected:', {
      wc2ExpiresAt: wc2ExpiresAt?.toISOString(),
      appExpiresAt: appExpiresAt.toISOString(),
      timeDiff: formatTimeUntilExpiry(timeDiff),
    });
    
    // Update application session to match WC 2.0 session if WC 2.0 is more recent
    if (wc2ExpiresAt && wc2ExpiresAt > appExpiresAt) {
      console.log('🔄 [WC 2.0] Syncing application session to match WC 2.0 session');
      // Update session store with WC 2.0 expiry
      sessionStore.setCurrentSession({
        ...currentSession,
        expiresAt: wc2ExpiresAt.toISOString(),
      });
      return true;
    }
  }
  
  return false;
}

/**
 * Hook to monitor WC 2.0 session expiration
 * 
 * Returns session info and expiration status
 */
export function useWC2SessionMonitor() {
  const { address, isConnected } = useAppKitAccount();
  const sessionStore = useAppKitSessionStore();
  const currentSession = sessionStore.currentSession;
  
  const sessionInfo: WC2SessionInfo | null = currentSession ? {
    sessionExpiresAt: new Date(currentSession.expiresAt).getTime(),
    lastRefreshAt: sessionStore.lastCheckedAt || undefined,
  } : null;
  
  const isSessionExpiring = sessionInfo 
    ? isWC2SessionExpiring(sessionInfo.sessionExpiresAt)
    : false;
  
  const timeUntilExpiry = sessionInfo
    ? getTimeUntilSessionExpiry(sessionInfo.sessionExpiresAt)
    : 0;
  
  return {
    sessionInfo,
    isSessionExpiring,
    timeUntilExpiry,
    formattedTimeUntilExpiry: formatTimeUntilExpiry(timeUntilExpiry),
    isConnected,
    address,
  };
}

