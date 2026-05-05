'use client'

import React, { useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Copy, ExternalLink, Send, ArrowDown, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import { useAppKitAccount } from '@/config'  
import { useTokenizinWalletStore } from '@/lib/store/tokenizinWalletStore'  
import { Button } from '../../../../components/ui/button'  
import { WalletSessionGuard } from '@/components/auth/WalletSessionGuard'
import { WalletNavigation } from '@/components/wallet/WalletNavigation'
import { useClientMountStore } from '../../../../store/clientMountStore'   
import { QRCodeDisplay } from '@/components/wallet/QRCodeDisplay'
import { getChainIdFromNetwork } from '@/lib/utils/qr-code'
import { TigerSpinner } from '@/components/common/TigerSpinner'
import { getBestTokenIcon } from '@/lib/utils/token-icons'  

export default function TokenDetailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const account = useAppKitAccount()
  const { address, isConnected } = account
  const { tokens, properties, loading, isFetchingAll, fetchingAddress } = useTokenizinWalletStore()  
  const isLoading = loading.tokens || loading.properties
  // Find the token or property by address
  const token = useMemo(() => {
    if (!address) return null
    
    const allTokens = [
      ...(tokens || []),
      ...(properties || [])
    ]
    
    return allTokens.find(
      t => t.tokenAddress.toLowerCase() === address.toLowerCase()
    )
  }, [address, tokens, properties])

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
    }
  }

  const handleViewOnExplorer = () => {
    const explorerUrl = `https://sepolia.etherscan.io/token/${address}`
    window.open(explorerUrl, '_blank')
  }

  const handleSend = () => {
    // Open send dialog or navigate to send page
    router.push(`/wallet/send?token=${address}`)
  }

  const handleReceive = () => {
    // Open receive dialog
    router.push(`/wallet/receive?token=${address}`)
  }

  if (isLoading && !token) {
    return (
      <div className="min-h-screen bg-background dark:bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <TigerSpinner size="lg" />
          <p className="text-muted-foreground dark:text-gray-400">Loading token details...</p>
        </div>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-background dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground dark:text-white mb-2">Token Not Found</h1>
          <p className="text-muted-foreground dark:text-gray-400 mb-4">
            The token you're looking for doesn't exist or isn't in your wallet.
          </p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const initials = token.symbol.slice(0, 2).toUpperCase()
  const balance = parseFloat(token.balanceFormatted || token.balance || '0')
  const usdValue = parseFloat(token.usdValue || '0')
  
  // Get best available token icon URL (same logic as TokenList)
  const tokenIconUrl = token.imageUrl || getBestTokenIcon(token.symbol)

  return (
    <div className="min-h-screen bg-background dark:bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background dark:bg-gray-950 border-b border-border dark:border-gray-800">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-muted dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-foreground dark:text-white" />
            </button>
            <h1 className="text-lg font-semibold text-foreground dark:text-white">Token Details</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Token Header */}
        <div className="bg-card dark:bg-gray-800 border border-border dark:border-gray-700 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            {/* Token Icon - Circle icon matching TokenList style */}
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-border dark:border-gray-700 flex-shrink-0 bg-muted dark:bg-gray-900 flex items-center justify-center relative">
              {tokenIconUrl ? (
                <>
                <Image
                    src={tokenIconUrl}
                  alt={token.title || token.symbol}
                  width={64}
                  height={64}
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
                    className="w-full h-full flex items-center justify-center text-lg font-semibold text-foreground dark:text-white bg-muted dark:bg-gray-900 absolute inset-0 rounded-full"
                    style={{ display: 'none' }}
              >
                {initials}
              </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg font-semibold text-foreground dark:text-white">
                  {initials}
                </div>
              )}
            </div>

            {/* Token Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-semibold text-foreground dark:text-white truncate">
                  {token.title || token.symbol}
                </h2>
                {properties?.some(p => p.tokenAddress.toLowerCase() === address.toLowerCase()) && (
                  <span className="text-xs px-2 py-0.5 bg-primary/10 dark:bg-orange-500/20 text-primary dark:text-orange-500 rounded">
                    RWA
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground dark:text-gray-400">{token.symbol}</p>
            </div>
          </div>

          {/* Balance */}
          <div className="mb-6">
            <p className="text-sm text-muted-foreground dark:text-gray-400 mb-1">Balance</p>
            <p className="text-3xl font-bold text-foreground dark:text-white">
              {balance.toFixed(6)} {token.symbol}
            </p>
            {usdValue > 0 && (
              <p className="text-lg text-muted-foreground dark:text-gray-400 mt-1">
                ${usdValue.toFixed(2)} USD
              </p>
            )}
          </div>

          {/* Token Address */}
          <div className="flex items-center justify-between p-3 bg-muted dark:bg-gray-900 rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground dark:text-gray-400 mb-1">Contract Address</p>
              <p className="text-sm font-mono text-foreground dark:text-white truncate">
                {address}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <button
                onClick={handleCopyAddress}
                className="p-2 hover:bg-background dark:hover:bg-gray-800 rounded transition-colors"
                title="Copy address"
              >
                <Copy className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
              </button>
              <button
                onClick={handleViewOnExplorer}
                className="p-2 hover:bg-background dark:hover:bg-gray-800 rounded transition-colors"
                title="View on Explorer"
              >
                <ExternalLink className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Button
            onClick={handleSend}
            className="flex items-center justify-center gap-2"
            size="lg"
          >
            <Send className="h-5 w-5" />
            Send
          </Button>
          <Button
            onClick={handleReceive}
            variant="outline"
            className="flex items-center justify-center gap-2"
            size="lg"
          >
            <ArrowDown className="h-5 w-5" />
            Receive
          </Button>
        </div>

        {/* Token Details */}
        <div className="bg-card dark:bg-gray-800 border border-border dark:border-gray-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground dark:text-white mb-4">Token Information</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground dark:text-gray-400">Symbol</span>
              <span className="text-sm text-foreground dark:text-white font-medium">{token.symbol}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground dark:text-gray-400">Decimals</span>
              <span className="text-sm text-foreground dark:text-white font-medium">
                {'decimals' in token ? token.decimals : 18}
              </span>
            </div>
            {'tokenPrice' in token && token.tokenPrice && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground dark:text-gray-400">Price per Token</span>
                <span className="text-sm text-foreground dark:text-white font-medium">
                  ${parseFloat(token.tokenPrice).toFixed(2)}
                </span>
              </div>
            )}
            {properties?.some(p => p.tokenAddress.toLowerCase() === address.toLowerCase()) && (
              <>
                {'totalTokens' in token && token.totalTokens && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground dark:text-gray-400">Total Tokens</span>
                    <span className="text-sm text-foreground dark:text-white font-medium">
                      {parseFloat(token.totalTokens).toLocaleString()}
                    </span>
                  </div>
                )}
                {'availableTokens' in token && token.availableTokens && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground dark:text-gray-400">Available Tokens</span>
                    <span className="text-sm text-foreground dark:text-white font-medium">
                      {parseFloat(token.availableTokens).toLocaleString()}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

