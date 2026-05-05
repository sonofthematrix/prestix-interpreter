'use client'

import React from 'react'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { TigerSpinner } from './common/TigerSpinner'

interface WalletBalanceCardProps {
  balance: {
    eth: string
    usd: string
    change: string
  }
  network: {
    chainId: number | null
    name: string | null
  } | null
  isLoading: boolean
  themeMode: string
}

export function WalletBalanceCard({ balance, network, isLoading, themeMode }: WalletBalanceCardProps) {
  return (
    <div className="mt-4 mb-6">
      {/* Main Balance Display */}
      <div className="text-center mb-4">
        <div className="mb-2">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <TigerSpinner size="md" />
              <span className="text-sm text-muted-foreground dark:text-gray-500">Loading...</span>
            </div>
          ) : (
            <>
              <h2 className="text-4xl font-bold text-foreground dark:text-white mb-1">
                {balance.eth} {network?.name?.includes('Sepolia') ? 'SepoliaETH' : 'ETH'}
              </h2>
              <div className="flex items-center justify-center gap-2 text-muted-foreground dark:text-gray-400">
                <span className="text-lg">{balance.usd}</span>
                <span className="text-sm">({balance.change})</span>
              </div>
            </>
          )}
        </div>
        
        {/* Discover Link */}
        <a
          href="#"
          className="inline-flex items-center gap-1 text-sm text-primary dark:text-orange-500 hover:underline"
        >
          Discover
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  )
}

