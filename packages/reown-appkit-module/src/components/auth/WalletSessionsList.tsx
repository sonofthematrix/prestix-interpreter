'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Loader2, Clock, CheckCircle2, XCircle, Copy, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { shortenAddress } from '../../lib/address-utils';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface WalletSession {
  id: string;
  userId: string;
  walletAddress: string;
  walletAddressAbbr: string;
  chainId: number;
  authMethod: string;
  status: 'ACTIVE' | 'EXPIRED';
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  nonce: string | null;
  nonceExpiry: Date | null;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export function WalletSessionsList() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [sessions, setSessions] = useState<WalletSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSessions = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/auth/wallet/sessions?userId=${userId}&limit=3`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch sessions');
        }

        const data = await response.json();
        
        if (data.success) {
          setSessions(data.sessions || []);
        } else {
          throw new Error(data.error || 'Failed to fetch sessions');
        }
      } catch (err: any) {
        console.error('Error fetching wallet sessions:', err);
        setError(err.message || 'Failed to load sessions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, [userId]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  if (!userId) {
    return null; // Don't show if user is not authenticated
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground dark:text-white">
          Latest Sessions
        </h4>
        {sessions.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading sessions...</span>
        </div>
      )}

      {error && (
        <div className="text-sm text-red-500 dark:text-red-400 py-2">
          {error}
        </div>
      )}

      {!isLoading && !error && sessions.length === 0 && (
        <p className="text-sm text-muted-foreground dark:text-gray-400 py-2">
          No wallet sessions found.
        </p>
      )}

      {!isLoading && !error && sessions.length > 0 && (
        <div className="space-y-2">
          {sessions.map((session) => {
            const isExpired = session.status === 'EXPIRED';
            const nonceExpired = session.nonceExpiry 
              ? new Date(session.nonceExpiry) < new Date() 
              : false;

            return (
              <div
                key={session.id}
                className={cn(
                  "p-3 rounded-lg border text-sm",
                  isExpired
                    ? "bg-muted/30 dark:bg-gray-800/30 border-border dark:border-gray-700"
                    : "bg-accent/10 dark:bg-accent/5 border-primary/20 dark:border-orange-500/20"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {isExpired ? (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                    <Badge
                      variant={isExpired ? 'secondary' : 'default'}
                      className="text-xs"
                    >
                      {session.status}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Wallet:</span>
                    <div className="flex items-center gap-1">
                      <code className="text-xs font-mono bg-muted dark:bg-gray-800 px-1.5 py-0.5 rounded">
                        {session.walletAddressAbbr}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={() => handleCopy(session.walletAddress, 'Wallet address')}
                        title="Copy wallet address"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {session.nonce && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Nonce:</span>
                        <div className="flex items-center gap-1">
                          <code className="text-xs font-mono bg-muted dark:bg-gray-800 px-1.5 py-0.5 rounded max-w-[120px] truncate">
                            {session.nonce}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={() => handleCopy(session.nonce!, 'Nonce')}
                            title="Copy nonce"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          {nonceExpired && (
                            <Badge variant="destructive" className="text-xs ml-1">
                              Expired
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-start justify-between">
                        <span className="text-xs text-muted-foreground">Message:</span>
                        <div className="flex items-center gap-1 max-w-[200px]">
                          <code className="text-xs font-mono bg-muted dark:bg-gray-800 px-1.5 py-0.5 rounded break-all">
                            {session.walletAddress && session.nonce
                              ? `Sign in with Ethereum message for ${session.walletAddressAbbr}`
                              : 'N/A'}
                          </code>
                          {session.walletAddress && session.nonce && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 flex-shrink-0"
                              onClick={() => {
                                const message = `Sign in with Ethereum message for ${session.walletAddress}`;
                                handleCopy(message, 'SIWE Message');
                              }}
                              title="Copy SIWE message"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {session.expiresAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Expires:</span>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(session.expiresAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Chain:</span>
                    <Badge variant="outline" className="text-xs">
                      {session.chainId === 1 ? 'Mainnet' : session.chainId === 11155111 ? 'Sepolia' : `Chain ${session.chainId}`}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

