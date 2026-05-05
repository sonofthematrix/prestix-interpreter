'use client';

import * as React from 'react';

interface WalletConnectionPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WalletConnectionPrompt({ open, onOpenChange }: WalletConnectionPromptProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80" aria-modal="true">
      <div className="rounded-lg border bg-card p-6 shadow-lg">
        <p className="text-sm text-muted-foreground">Connect your wallet to continue.</p>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="mt-4 rounded-md border px-4 py-2 text-sm hover:bg-accent"
        >
          Close
        </button>
      </div>
    </div>
  );
}
