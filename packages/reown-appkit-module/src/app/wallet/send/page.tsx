'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppKitAccount, useAppKit } from '../../../config';
import { WalletSessionGuard } from '../../../components/auth/WalletSessionGuard';
import { TigerSpinner } from '../../../components/common/TigerSpinner';

export const dynamic = 'force-dynamic';

/**
 * Send entry: same interface as Buy/Swap — open AppKit WalletSend modal (see AppKit Send USDC lab example).
 * No full page; deep links to /wallet/send open the modal and redirect to /wallet.
 */
function WalletSendRedirect() {
  const router = useRouter();
  const { open } = useAppKit();
  const { isConnected } = useAppKitAccount();

  useEffect(() => {
    if (!isConnected) {
      router.replace('/wallet');
      return;
    }
    try {
      open({ view: 'WalletSend' });
    } catch (_) {
      // Fallback: stay on wallet so user can use in-wallet Send dialog
    }
    router.replace('/wallet');
  }, [isConnected, open, router]);

  return (
    <div className="min-h-screen bg-background dark:bg-gray-950 flex flex-col items-center justify-center gap-3">
      <TigerSpinner size="lg" />
      <p className="text-sm text-muted-foreground dark:text-gray-400">Opening Send...</p>
    </div>
  );
}

export default function WalletSendPage() {
  return (
    <WalletSessionGuard>
      <WalletSendRedirect />
    </WalletSessionGuard>
  );
}
