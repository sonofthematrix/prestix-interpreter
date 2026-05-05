'use client'

import React from 'react'
import Image from 'next/image'
import { RefreshCw, AlertCircle, ChevronRight } from 'lucide-react'
import { TigerSpinner } from '@/components/common/TigerSpinner';
import { useTokenList } from '../../../store/uiStore'
import { useRouter } from 'next/navigation'
import { getBestTokenIcon } from '@/lib/utils/token-icons'

interface Asset {
  type: 'token' | 'property'
  symbol: string
  name: string
  balance: string
  balanceFormatted: string
  usdValue: string
  icon?: string
  address: string
}

interface TokenListProps {
  assets: Asset[]
  isLoading: boolean
  error: Error | null
  onRefresh: () => Promise<void>
  themeMode: string
}

export function TokenList({ assets, isLoading, error, onRefresh, themeMode }: TokenListProps) {
  // ✅ CORRECT: Use Zustand store instead of useState
  const { isRefreshing, setRefreshing } = useTokenList()
  const router = useRouter()

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setRefreshing(false)
    }
  }

  const handleTokenClick = (asset: Asset) => {
    // Navigate to token detail page
    router.push(`/wallet/token/${asset.address}`)
  }

  if (isLoading && assets.length === 0) {
    return (
      <div className="text-center py-12">
        <TigerSpinner size="lg" />
        <p className="mt-4 text-sm text-muted-foreground dark:text-gray-400">
          Loading tokens...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
        <p className="text-sm text-muted-foreground dark:text-gray-400 mb-4">
          {error.message || 'Failed to load tokens'}
        </p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-primary dark:bg-orange-600 text-white rounded-lg hover:bg-primary/90 dark:hover:bg-orange-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (assets.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground dark:text-gray-400">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted dark:bg-gray-800 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 opacity-50" />
        </div>
        <p className="text-sm mb-2">No tokens found</p>
        <button
          onClick={handleRefresh}
          className="text-xs text-primary dark:text-orange-500 hover:underline"
        >
          Refresh
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {assets
        .filter((asset) => asset && asset.type && asset.symbol) // Filter out invalid assets
        .map((asset, index) => {
        // Generate initials for icon fallback
        const initials = (asset.symbol || '??').slice(0, 2).toUpperCase()
        
        // Get best available token icon URL
        const tokenIconUrl = asset.icon || getBestTokenIcon(asset.symbol)
        
        return (
          <div
            key={`${asset.address || index}-${index}`}
            onClick={() => handleTokenClick(asset)}
            className="
              bg-card dark:bg-gray-800 border border-border dark:border-gray-700 
              rounded-xl p-4 hover:bg-muted dark:hover:bg-gray-700 transition-colors
              cursor-pointer
            "
          >
            <div className="flex items-center justify-between">
              {/* Left: Icon and Info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Token Icon - Circle icon matching token details page */}
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-border dark:border-gray-700 flex-shrink-0 bg-muted dark:bg-gray-900 flex items-center justify-center relative">
                  {tokenIconUrl ? (
                    <>
                    <Image
                        src={tokenIconUrl}
                      alt={asset.name || asset.symbol || 'Token'}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover rounded-full"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const fallback = target.nextElementSibling as HTMLElement
                        if (fallback) fallback.style.display = 'flex'
                      }}
                        unoptimized={tokenIconUrl.startsWith('http')}
                    />
                  <div
                        className="w-full h-full flex items-center justify-center text-xs font-semibold text-foreground dark:text-white bg-muted dark:bg-gray-900 absolute inset-0 rounded-full"
                        style={{ display: 'none' }}
                  >
                    {initials}
                  </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-foreground dark:text-white">
                      {initials}
                    </div>
                  )}
                </div>

                {/* Token Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground dark:text-white text-sm truncate">
                      {asset.name || asset.symbol || 'Unknown Token'}
                    </h3>
                    {asset.type === 'property' && (
                      <span className="text-xs px-2 py-0.5 bg-primary/10 dark:bg-orange-500/20 text-primary dark:text-orange-500 rounded">
                        RWA
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground dark:text-gray-400">
                      No conversion rate available
                    </p>
                  </div>
                </div>
              </div>

              {/* Right: Balance and Arrow */}
              <div className="text-right flex-shrink-0 ml-4 flex items-center gap-2">
                <div>
                  <p className="font-semibold text-foreground dark:text-white text-sm">
                    {asset.balanceFormatted || asset.balance || '0'} {asset.symbol || ''}
                  </p>
                  {asset.usdValue && asset.usdValue !== '0.00' && (
                    <p className="text-xs text-muted-foreground dark:text-gray-400 mt-1">
                      ${asset.usdValue}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground dark:text-gray-400 flex-shrink-0" />
              </div>
            </div>
          </div>
        )
      })}

      {/* Refresh Button */}
      <div className="flex justify-center pt-4">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="
            flex items-center gap-2 px-4 py-2 
            text-sm text-muted-foreground dark:text-gray-400
            hover:text-foreground dark:hover:text-white
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          "
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
    </div>
  )
}

