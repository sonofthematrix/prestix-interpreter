/**
 * WC 2.0 Session Monitor Component
 * 
 * Monitors WalletConnect 2.0 session expiration and displays warnings
 * when sessions are about to expire.
 */

'use client';

import { useEffect, useState } from 'react';
import { useWC2SessionMonitor } from '../../lib/wc2-session-monitor';
import { useAppKitSessionStore } from '../../store/appkitSessionStore';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { useAppKit } from '@reown/appkit/react';

export function WC2SessionMonitor() {
  const {
    sessionInfo,
    isSessionExpiring,
    formattedTimeUntilExpiry,
    isConnected,
  } = useWC2SessionMonitor();
  
  const { open: openAppKit } = useAppKit();
  const [showWarning, setShowWarning] = useState(false);
  
  // Check session status every 5 minutes
  useEffect(() => {
    if (!isConnected || !sessionInfo) {
      setShowWarning(false);
      return;
    }
    
    // Show warning if session is expiring (within 24 hours)
    setShowWarning(isSessionExpiring);
    
    // Check every 5 minutes
    const interval = setInterval(() => {
      // Re-check session expiration status
      const store = useAppKitSessionStore.getState();
      const currentSession = store.currentSession;
      if (currentSession) {
        const expiresAt = new Date(currentSession.expiresAt).getTime();
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;
        const REFRESH_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours
        setShowWarning(timeUntilExpiry < REFRESH_THRESHOLD);
      } else {
        setShowWarning(false);
      }
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [isConnected, sessionInfo, isSessionExpiring]);
  
  if (!showWarning || !isConnected) {
    return null;
  }
  
  const handleRefreshSession = async () => {
    // Open AppKit to refresh session
    // AppKit will handle JWT refresh automatically with smart sessions enabled
    await openAppKit({ view: 'Account' });
  };
  
  return (
    <Alert className="mb-4 border-orange-500/50 bg-orange-500/10">
      <AlertCircle className="h-4 w-4 text-orange-500" />
      <AlertTitle className="text-orange-700 dark:text-orange-400">
        WalletConnect Session Expiring Soon
      </AlertTitle>
      <AlertDescription className="text-orange-600 dark:text-orange-300">
        <div className="flex items-center justify-between">
          <span>
            Your wallet session will expire in {formattedTimeUntilExpiry}. 
            Refresh your session to continue using wallet features.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshSession}
            className="ml-4 border-orange-500/50 hover:bg-orange-500/20"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Session
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

