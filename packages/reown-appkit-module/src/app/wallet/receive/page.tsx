'use client'

import React, { useMemo, useEffect, useState } from 'react'
import Image from 'next/image'
import { useSearchParams, useRouter } from 'next/navigation'
import { ArrowLeft, Copy, ExternalLink, QrCode, CheckCircle2, ChevronRight } from 'lucide-react'
import { useAppKitAccount } from '@/config' 
import { useTokenizinWalletStore } from '@/lib/store/tokenizinWalletStore'  
import { Button } from '../../../components/ui/button'
import { TigerSpinner } from '@/components/common/TigerSpinner'
import { WalletSessionGuard } from '@/components/auth/WalletSessionGuard'
import { WalletNavigation } from '@/components/wallet/WalletNavigation'
import { useClientMountStore } from '../../../../store/clientMountStore'
import { Address } from 'viem'
import { getBestTokenIcon } from '@/lib/utils/token-icons'
import { QRCodeDisplay } from '@/components/wallet/QRCodeDisplay'
import { getChainIdFromNetwork } from '@/lib/utils/qr-code'
// Removed WuiImage import - replaced with Next.js Image

// Force dynamic rendering to prevent SSR issues
export const dynamic = 'force-dynamic'

function ReceivePageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const account = useAppKitAccount()
  const { address, isConnected } = account
  const { tokens, properties, loading, isFetchingAll, fetchingAddress } = useTokenizinWalletStore()  
  const isLoading = loading.tokens || loading.properties
  const isFetching = isFetchingAll || fetchingAddress === address
  
  const tokenAddress = searchParams.get('token') as Address | null
  const selectedNetwork = searchParams.get('network') || 'sepolia'
  const [copied, setCopied] = useState(false)
  const [showNetworkSelector, setShowNetworkSelector] = useState(false)
  
  // Get chain ID from network name
  const chainId = getChainIdFromNetwork(selectedNetwork)
  
  // Detect mobile - use window check directly since component only renders on client
  const isMobile = typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  // Find the token by address
  const token = useMemo(() => {
    if (!tokenAddress) return null
    
    const allTokens = [
      ...(tokens || []),
      ...(properties || [])
    ]
    
    return allTokens.find(
      t => t.tokenAddress.toLowerCase() === tokenAddress.toLowerCase()
    ) as (typeof tokens)[0] | (typeof properties)[0] | undefined
  }, [tokenAddress, tokens, properties])

  // Redirect if not connected
  useEffect(() => {
    if (!isConnected) {
      router.push('/wallet')
    }
  }, [isConnected, router])

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleViewOnExplorer = () => {
    if (tokenAddress) {
      const explorerUrl = `https://sepolia.etherscan.io/token/${tokenAddress}`
      window.open(explorerUrl, '_blank')
    }
  }

  if (!isConnected) {
    return null // Will redirect via useEffect
  }

  if (isLoading && !token && tokenAddress) {
    return (
      <div className="min-h-screen bg-background dark:bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <TigerSpinner size="lg" />
          <p className="text-muted-foreground dark:text-gray-400">Loading token details...</p>
        </div>
      </div>
    )
  }

  const initials = token ? (token.symbol || 'TOKEN').slice(0, 2).toUpperCase() : 'ETH'
  const tokenIconUrl = token ? (token.imageUrl || getBestTokenIcon(token.symbol)) : undefined
  const tokenSymbol = token ? (token.symbol || 'TOKEN') : 'ETH'
  const tokenName = token ? (token.title || token.symbol || 'Token') : 'Ethereum'

  // Network configuration (Sepolia is default/testnet)
  const networks = [
    { id: 'sepolia', name: 'Sepolia', icon: '🔷', color: 'bg-blue-500' },
    { id: 'ethereum', name: 'Ethereum', icon: '💎', color: 'bg-purple-500' },
    { id: 'linea', name: 'Linea', icon: 'L', color: 'bg-blue-500' },
    { id: 'bnb', name: 'BNB Chain', icon: 'BNB', color: 'bg-yellow-500' },
    { id: 'polygon', name: 'Polygon', icon: 'P', color: 'bg-purple-500' },
    { id: 'optimism', name: 'OP', icon: 'OP', color: 'bg-red-500' },
  ]

  const currentNetwork = networks.find(n => n.id === selectedNetwork) || networks[0]

  // Show network selection if no network selected or showNetworkSelector is true
  if (showNetworkSelector || (!tokenAddress && !selectedNetwork)) {
    return (
      <div className="min-h-screen bg-background dark:bg-gray-950 pb-20 md:pb-6">
        {/* Wallet Navigation - Desktop */}
        {!isMobile && (
          <div className="sticky top-0 z-40 bg-background dark:bg-gray-950 border-b border-border dark:border-gray-800">
            <div className="max-w-md mx-auto px-4 py-3">
              <WalletNavigation variant="desktop" />
            </div>
          </div>
        )}

        {/* Header */}
        <div className="sticky top-0 z-50 bg-background dark:bg-gray-950 border-b border-border dark:border-gray-800">
          <div className="max-w-md mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (showNetworkSelector) {
                    setShowNetworkSelector(false)
                  } else {
                    router.back()
                  }
                }}
                className="p-2 hover:bg-muted dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-foreground dark:text-white" />
              </button>
              <h1 className="text-lg font-semibold text-foreground dark:text-white">Receiving address</h1>
            </div>
          </div>
        </div>

        {/* Network List */}
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="space-y-2">
            {networks.map((network) => (
              <button
                key={network.id}
                onClick={() => {
                  if (tokenAddress) {
                    router.push(`/wallet/receive?token=${tokenAddress}&network=${network.id}`)
                  } else {
                    router.push(`/wallet/receive?network=${network.id}`)
                  }
                  setShowNetworkSelector(false)
                }}
                className="w-full flex items-center gap-3 p-4 bg-card dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg hover:bg-muted dark:hover:bg-gray-800 transition-colors"
              >
                <div className={`w-10 h-10 rounded-lg ${network.color} flex items-center justify-center text-white font-semibold flex-shrink-0`}>
                  {network.icon}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-foreground dark:text-white">{network.name}</p>
                  <p className="text-xs text-muted-foreground dark:text-gray-400 font-mono">
                    {address?.slice(0, 6)}...{address?.slice(-6)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigator.clipboard.writeText(address || '')
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    }}
                    className="p-2 hover:bg-background dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <Copy className="h-5 w-5 text-foreground dark:text-white" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (tokenAddress) {
                        router.push(`/wallet/receive?token=${tokenAddress}&network=${network.id}`)
                      } else {
                        router.push(`/wallet/receive?network=${network.id}`)
                      }
                    }}
                    className="p-2 hover:bg-background dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <QrCode className="h-5 w-5 text-foreground dark:text-white" />
                  </button>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Wallet Navigation - Mobile Footer */}
        {isMobile && <WalletNavigation variant="mobile" />}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background dark:bg-gray-950 pb-20 md:pb-6">
      {/* Wallet Navigation - Desktop */}
      {!isMobile && (
        <div className="sticky top-0 z-40 bg-background dark:bg-gray-950 border-b border-border dark:border-gray-800">
          <div className="max-w-md mx-auto px-4 py-3">
            <WalletNavigation variant="desktop" />
          </div>
        </div>
      )}

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
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-foreground dark:text-white">Receiving address</h1>
              <button
                onClick={() => setShowNetworkSelector(true)}
                className="text-xs text-muted-foreground dark:text-gray-400 flex items-center gap-1"
              >
                {currentNetwork.name} / {tokenSymbol || 'Ethereum'}
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Token Info Card */}
        <div className="bg-card dark:bg-gray-800 border border-border dark:border-gray-700 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            {/* Token Icon - Circle icon matching token list and details pages */}
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-border dark:border-gray-700 flex-shrink-0 bg-muted dark:bg-gray-900 flex items-center justify-center relative">
              {tokenIconUrl ? (
                <Image
                  src={tokenIconUrl}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover rounded-full"
                  alt="Token icon"
                  unoptimized={true}
                />
              ) : null}
              <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-foreground dark:text-white rounded-full">
                {initials}
              </div>  
            </div>
          </div>
        </div>
        {/* QR Code Card */}
        <div className="bg-card dark:bg-gray-800 border border-border dark:border-gray-700 rounded-xl p-6 mb-6">
          <div className="text-center mb-4">
            <h2 className="text-lg font-semibold text-foreground dark:text-white mb-2">
              Your Wallet Address
            </h2>
            <p className="text-sm text-muted-foreground dark:text-gray-400">
              Share this address or QR code to receive {tokenSymbol}
            </p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-6">
            {address && (
              <QRCodeDisplay
                value={address}
                size={200}
                chainId={chainId}
                tokenAddress={tokenAddress || undefined}
                bgColor="#FFFFFF"
                fgColor="#000000"
                level="M"
                includeMargin={true}
                className="bg-white p-4 rounded-lg"
              />
            )}
          </div>

          {/* Wallet Address */}
          <div className="bg-muted dark:bg-gray-900 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono text-foreground dark:text-white break-all">
                {address}
              </code>
              <button
                onClick={handleCopyAddress}
                className="p-2 hover:bg-background dark:hover:bg-gray-800 rounded transition-colors flex-shrink-0"
                title="Copy address"
              >
                {copied ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <Copy className="h-5 w-5 text-foreground dark:text-white" />
                )}
              </button>
            </div>
          </div>

          {/* Copy Button */}
          <Button
            onClick={handleCopyAddress}
            className="w-full bg-primary text-white dark:text-white hover:bg-primary/90"
          >
            {copied ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Address
              </>
            )}
          </Button>
        </div>

        {/* Instructions */}
        <div className="bg-blue-500/10 border border-blue-500/50 dark:border-blue-400/50 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-semibold text-foreground dark:text-white mb-2 flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            How to Receive {tokenSymbol}
          </h3>
          <ul className="text-sm text-muted-foreground dark:text-gray-400 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400">1.</span>
              <span>Share your wallet address or QR code with the sender</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400">2.</span>
              <span>
                {tokenAddress 
                  ? `They can scan the QR code (EIP-681 format) with their wallet app to send ${tokenSymbol} directly`
                  : 'They can scan the QR code with their wallet app or manually enter the address'}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400">3.</span>
              <span>Once they send {tokenSymbol}, it will appear in your wallet</span>
            </li>
            {tokenAddress && (
              <li className="flex items-start gap-2 mt-2 pt-2 border-t border-blue-500/20">
                <span className="text-blue-600 dark:text-blue-400">💡</span>
                <span className="text-xs">
                  The QR code uses EIP-681 format, which allows wallets to automatically detect the token and network
                </span>
              </li>
            )}
          </ul>
        </div>

        {/* Token Contract Info */}
        {tokenAddress && (
          <div className="bg-card dark:bg-gray-800 border border-border dark:border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground dark:text-white mb-1">
                  Token Contract
                </p>
                <code className="text-xs text-muted-foreground dark:text-gray-400 break-all">
                  {tokenAddress.slice(0, 10)}...{tokenAddress.slice(-8)}
                </code>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(tokenAddress)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                  className="p-2 hover:bg-muted dark:hover:bg-gray-800 rounded-lg transition-colors"
                  title="Copy contract address"
                >
                  <Copy className="h-4 w-4 text-foreground dark:text-white" />
                </button>
                <button
                  onClick={handleViewOnExplorer}
                  className="p-2 hover:bg-muted dark:hover:bg-gray-800 rounded-lg transition-colors"
                  title="View on Etherscan"
                >
                  <ExternalLink className="h-4 w-4 text-foreground dark:text-white" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Wallet Navigation - Mobile Footer */}
      {isMobile && <WalletNavigation variant="mobile" />}
    </div>
  )
}

export default function ReceivePage() {
  return (
    <WalletSessionGuard>
      <ReceivePageContent />
    </WalletSessionGuard>
  )
}

