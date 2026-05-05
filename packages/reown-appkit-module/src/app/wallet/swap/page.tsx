'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, X, ArrowUpDown, Loader2 } from 'lucide-react'
import { useAppKitAccount } from '../../../config'
import { useAppKit, Views } from '@reown/appkit/react'
import { useTokenizinWalletStore } from '@/lib/store/tokenizinWalletStore'  
import { Button } from '../../../components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { TigerSpinner } from '../../../components/common/TigerSpinner'
import { WalletSessionGuard } from '../../../components/auth/WalletSessionGuard'
import { WalletNavigation } from '../../../components/wallet/WalletNavigation'
import { useClientMountStore } from '../../../store/clientMountStore'
import { getBestTokenIcon } from '../../../lib/utils/token-icons'
import { Address } from 'viem'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

function SwapPageContent() {
  const router = useRouter()
  const account = useAppKitAccount()
  const { address, isConnected } = account
  const { tokens, properties, loading, isFetchingAll, fetchingAddress } = useTokenizinWalletStore()  
  const isLoading = loading.tokens || loading.properties
  const isFetching = isFetchingAll || fetchingAddress === address
  const appKit = useAppKit()
  
  const [fromToken, setFromToken] = useState<Address | null>(null)
  const [toToken, setToToken] = useState<Address | null>(null)
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [showFromTokenSelector, setShowFromTokenSelector] = useState(false)
  const [showToTokenSelector, setShowToTokenSelector] = useState(false)
  const [isSwapping, setIsSwapping] = useState(false)
  
  // Detect mobile - use window check directly since component only renders on client
  const isMobile = typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  // ⚠️ CRITICAL: Known token addresses that should always be available for selection
  // These tokens (TKNZN, USDC, EURC) should appear in swap dialog even with zero balance
  // Users need to be able to select them as swap destinations
  const KNOWN_TOKENS: Array<{ tokenAddress: Address; symbol: string; title: string; decimals: number }> = [
    {
      tokenAddress: '0xb0af8e94C74c2346609c3d94FCba61Ae85cf3e6e' as Address,
      symbol: 'TKNZN',
      title: 'Tokenizin Token',
      decimals: 18,
    },
    {
      tokenAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as Address,
      symbol: 'USDC',
      title: 'USD Coin',
      decimals: 6,
    },
    {
      tokenAddress: '0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4' as Address,
      symbol: 'EURC',
      title: 'Euro Coin',
      decimals: 6,
    },
  ];

  // ⚠️ CRITICAL: Combine tokens and properties (RWA tokens) into a single list
  // Properties are RWA tokens that should be available for swapping
  const allTokens = useMemo(() => {
    const tokenList = [...(tokens || [])]
    
    // Add RWA tokens from properties
    if (properties && properties.length > 0) {
      properties.forEach((property) => {
        // Only add if not already in token list
        const exists = tokenList.some(t => 
          t.tokenAddress.toLowerCase() === property.tokenAddress.toLowerCase()
        )
        if (!exists && property.tokenAddress) {
          tokenList.push({
            id: property.id || `property-${property.tokenAddress}`,
            tokenAddress: property.tokenAddress,
            symbol: property.symbol || 'RWA',
            title: property.title || property.symbol || 'RWA Token',
            balance: property.balance || '0',
            balanceFormatted: property.balanceFormatted || '0',
            decimals: 18, // RWA tokens typically use 18 decimals
            imageUrl: property.imageUrl,
            usdValue: property.usdValue || '0',
          })
        }
      })
    }
    
    // ⚠️ CRITICAL: Add known tokens if they're not already in the list
    // This ensures TKNZN, USDC, EURC are always available for selection
    // Users need to be able to select them as swap destinations even with zero balance
    KNOWN_TOKENS.forEach((knownToken) => {
      const exists = tokenList.some(t => 
        t.tokenAddress.toLowerCase() === knownToken.tokenAddress.toLowerCase()
      )
      if (!exists) {
        tokenList.push({
          id: `known-${knownToken.tokenAddress}`,
          tokenAddress: knownToken.tokenAddress,
          symbol: knownToken.symbol,
          title: knownToken.title,
          balance: '0',
          balanceFormatted: '0',
          decimals: knownToken.decimals,
          imageUrl: undefined,
          usdValue: '0',
        })
      }
    })
    
    // Debug logging to help troubleshoot token visibility
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.log('🔍 [Swap] Token list:', {
        tokensCount: tokens?.length || 0,
        propertiesCount: properties?.length || 0,
        allTokensCount: tokenList.length,
        tokens: tokens?.map(t => ({ symbol: t.symbol, address: t.tokenAddress })),
        properties: properties?.map(p => ({ symbol: p.symbol, address: p.tokenAddress })),
        knownTokensAdded: KNOWN_TOKENS.filter(kt => 
          !tokenList.some(t => t.tokenAddress.toLowerCase() === kt.tokenAddress.toLowerCase())
        ).map(kt => kt.symbol),
      })
    }
    
    return tokenList
  }, [tokens, properties])

  useEffect(() => {
    // Set default tokens if available
    if (allTokens && allTokens.length > 0) {
      if (!fromToken) {
        setFromToken(allTokens[0].tokenAddress)
      }
      if (!toToken && allTokens.length > 1) {
        setToToken(allTokens[1].tokenAddress)
      }
    }
  }, [allTokens, fromToken, toToken])

  // Redirect if not connected
  useEffect(() => {
    if (!isConnected) {
      router.push('/wallet')
    }
  }, [isConnected, router])

  // Get token data
  const fromTokenData = useMemo(() => {
    if (!fromToken) return null
    return allTokens.find(t => t.tokenAddress.toLowerCase() === fromToken.toLowerCase())
  }, [fromToken, allTokens])

  const toTokenData = useMemo(() => {
    if (!toToken) return null
    return allTokens.find(t => t.tokenAddress.toLowerCase() === toToken.toLowerCase())
  }, [toToken, allTokens])
  
  // ⚠️ CRITICAL: Mock 1:1 exchange rate for RWA tokens and TKNZN
  // This is a simplified rate calculation - in production, use actual exchange rates
  const calculateExchangeRate = useMemo(() => {
    if (!fromTokenData || !toTokenData) return 1
    
    // 1:1 rate for RWA tokens and TKNZN
    const isRWA = fromTokenData.symbol?.includes('RWA') || toTokenData.symbol?.includes('RWA')
    const isTPT = fromTokenData.symbol === 'TKNZN' || toTokenData.symbol === 'TKNZN'
    
    if (isRWA || isTPT) {
      return 1 // 1:1 exchange rate
    }
    
    // Default rate for other tokens
    return 1.05 // Example rate
  }, [fromTokenData, toTokenData])

  // Swap direction
  const handleSwapDirection = () => {
    const tempToken = fromToken
    const tempAmount = fromAmount
    setFromToken(toToken)
    setToToken(tempToken)
    setFromAmount(toAmount)
    setToAmount(tempAmount)
  }

  // Handle number input
  const handleNumberInput = (value: string) => {
    let newAmount = fromAmount
    if (value === '.') {
      if (!fromAmount.includes('.')) {
        newAmount = fromAmount + '.'
        setFromAmount(newAmount)
      }
    } else if (value === 'backspace') {
      newAmount = fromAmount.slice(0, -1)
      setFromAmount(newAmount)
    } else {
      newAmount = fromAmount + value
      setFromAmount(newAmount)
    }
    
    // Calculate to amount using exchange rate
    if (fromTokenData && toTokenData && newAmount) {
      const calculated = (parseFloat(newAmount || '0') * calculateExchangeRate).toFixed(6)
      setToAmount(calculated)
    } else {
      setToAmount('')
    }
  }
  
  // Update toAmount when fromAmount changes
  useEffect(() => {
    if (fromTokenData && toTokenData && fromAmount) {
      const calculated = (parseFloat(fromAmount || '0') * calculateExchangeRate).toFixed(6)
      setToAmount(calculated)
    } else {
      setToAmount('')
    }
  }, [fromAmount, fromTokenData, toTokenData, calculateExchangeRate])

  const handleSwapWithAppKit = () => {
    // Use AppKit's SwapCrypto view
    try {
      appKit?.open?.({ view: 'SwapCrypto' as Views })
    } catch (error) {
      console.error('Failed to open SwapCrypto view:', error)
      // Fallback: handle swap manually
      handleSwap()
    }
  }

  const handleSwap = async () => {
    if (!fromToken || !toToken || !fromAmount || parseFloat(fromAmount) <= 0) {
      return
    }

    setIsSwapping(true)
    
    // Simulate swap (replace with actual swap logic)
    setTimeout(() => {
      setIsSwapping(false)
      router.push('/wallet')
    }, 2000)
  }

  if (!isConnected) {
    return null // Will redirect via useEffect
  }

  const fromIconUrl = fromTokenData ? (fromTokenData.imageUrl || getBestTokenIcon(fromTokenData.symbol)) : undefined
  const fromInitials = fromTokenData ? (fromTokenData.symbol || 'ETH').slice(0, 2).toUpperCase() : 'ETH'
  const toIconUrl = toTokenData ? (toTokenData.imageUrl || getBestTokenIcon(toTokenData.symbol)) : undefined
  const toInitials = toTokenData ? (toTokenData.symbol || 'TOKEN').slice(0, 2).toUpperCase() : 'TOKEN'

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
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-muted dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-foreground dark:text-white" />
            </button>
            <h1 className="text-lg font-semibold text-foreground dark:text-white">Swap</h1>
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-muted dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-foreground dark:text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-6">
        {/* From Token */}
        <div className="mb-4">
          <div className="bg-card dark:bg-gray-800 border border-border dark:border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <input
                  type="text"
                  value={fromAmount}
                  onChange={(e) => {
                    setFromAmount(e.target.value)
                    // Calculate to amount using exchange rate
                    if (fromTokenData && toTokenData && e.target.value) {
                      const calculated = (parseFloat(e.target.value || '0') * calculateExchangeRate).toFixed(6)
                      setToAmount(calculated)
                    } else {
                      setToAmount('')
                    }
                  }}
                  placeholder="0"
                  className="w-full bg-transparent text-2xl font-semibold text-foreground dark:text-white outline-none"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFromTokenSelector(true)}
                className="flex items-center gap-2"
              >
                {fromTokenData ? (
                  <>
                    <div className="w-6 h-6 rounded-full overflow-hidden border border-border dark:border-gray-700 flex-shrink-0 bg-muted dark:bg-gray-900 flex items-center justify-center relative">
                      {fromIconUrl ? (
                        <Image
                          src={fromIconUrl}
                          alt={fromTokenData.title || fromTokenData.symbol}
                          width={24}
                          height={24}
                          className="w-full h-full object-cover rounded-full"
                          unoptimized={fromIconUrl.startsWith('http')}
                        />
                      ) : null}
                      <div
                        className="w-full h-full flex items-center justify-center text-xs font-semibold text-foreground dark:text-white rounded-full"
                        style={{ display: fromIconUrl ? 'none' : 'flex' }}
                      >
                        {fromInitials}
                      </div>
                    </div>
                    <span className="font-medium">{fromTokenData.symbol}</span>
                  </>
                ) : (
                  <span>Select</span>
                )}
              </Button>
            </div>
            {fromTokenData && (
              <p className="text-xs text-muted-foreground dark:text-gray-400">
                Balance: {fromTokenData.balanceFormatted || fromTokenData.balance} {fromTokenData.symbol}
              </p>
            )}
          </div>
        </div>

        {/* Swap Direction Button */}
        <div className="flex justify-center -my-2 relative z-10">
          <Button
            variant="outline"
            size="icon"
            onClick={handleSwapDirection}
            className="rounded-full w-10 h-10 bg-background dark:bg-gray-950 border-2 border-border dark:border-gray-700"
          >
            <ArrowUpDown className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Exchange Rate Display */}
        {fromTokenData && toTokenData && (
          <div className="text-center mb-4">
            <p className="text-xs text-muted-foreground dark:text-gray-400">
              Exchange Rate: 1 {fromTokenData.symbol} = {calculateExchangeRate.toFixed(4)} {toTokenData.symbol}
              {calculateExchangeRate === 1 && (
                <span className="ml-1 text-orange-600 dark:text-orange-400">(1:1)</span>
              )}
            </p>
          </div>
        )}

        {/* To Token */}
        <div className="mb-6">
          <div className="bg-card dark:bg-gray-800 border border-border dark:border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1">
                <input
                  type="text"
                  value={toAmount}
                  readOnly
                  placeholder="0"
                  className="w-full bg-transparent text-2xl font-semibold text-foreground dark:text-white outline-none"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowToTokenSelector(true)}
                className="flex items-center gap-2"
              >
                {toTokenData ? (
                  <>
                    <div className="w-6 h-6 rounded-full overflow-hidden border border-border dark:border-gray-700 flex-shrink-0 bg-muted dark:bg-gray-900 flex items-center justify-center relative">
                      {toIconUrl ? (
                        <Image
                          src={toIconUrl}
                          alt={toTokenData.title || toTokenData.symbol}
                          width={24}
                          height={24}
                          className="w-full h-full object-cover rounded-full"
                          unoptimized={toIconUrl.startsWith('http')}
                        />
                      ) : null}
                      <div
                        className="w-full h-full flex items-center justify-center text-xs font-semibold text-foreground dark:text-white rounded-full"
                        style={{ display: toIconUrl ? 'none' : 'flex' }}
                      >
                        {toInitials}
                      </div>
                    </div>
                    <span className="font-medium">{toTokenData.symbol}</span>
                  </>
                ) : (
                  <span>Select</span>
                )}
              </Button>
            </div>
            {toTokenData && (
              <p className="text-xs text-muted-foreground dark:text-gray-400">
                Balance: {toTokenData.balanceFormatted || toTokenData.balance} {toTokenData.symbol}
              </p>
            )}
          </div>
        </div>

        {/* Numeric Keypad */}
        <div className="bg-card dark:bg-gray-800 border border-border dark:border-gray-700 rounded-xl p-4">
          <div className="grid grid-cols-3 gap-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'].map((key) => (
              <Button
                key={key}
                variant="outline"
                onClick={() => handleNumberInput(key)}
                className="h-12 text-lg font-medium"
              >
                {key === 'backspace' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                  </svg>
                ) : (
                  key
                )}
              </Button>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground dark:text-gray-400 mt-4">Select amount</p>
        </div>

        {/* Swap Button */}
        <Button
          onClick={handleSwapWithAppKit}
          disabled={!fromToken || !toToken || !fromAmount || parseFloat(fromAmount) <= 0 || isSwapping}
          className="w-full mt-6"
          size="lg"
        >
          {isSwapping ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Swapping...
            </>
          ) : (
            'Swap'
          )}
        </Button>
      </div>

      {/* From Token Selector */}
      <Dialog open={showFromTokenSelector} onOpenChange={setShowFromTokenSelector}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Token</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <TigerSpinner size="md" />
              </div>
            ) : allTokens && allTokens.length > 0 ? (
              allTokens.map((token) => {
                const iconUrl = token.imageUrl || getBestTokenIcon(token.symbol)
                const initials = (token.symbol || 'TOKEN').slice(0, 2).toUpperCase()
                
                return (
                  <button
                    key={token.tokenAddress || token.id}
                    onClick={() => {
                      setFromToken(token.tokenAddress)
                      setShowFromTokenSelector(false)
                    }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-border dark:border-gray-700 flex-shrink-0 bg-muted dark:bg-gray-900 flex items-center justify-center relative">
                      {iconUrl ? (
                        <Image
                          src={iconUrl}
                          alt={token.title || token.symbol}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover rounded-full"
                          unoptimized={iconUrl.startsWith('http')}
                        />
                      ) : null}
                      <div
                        className="w-full h-full flex items-center justify-center text-xs font-semibold text-foreground dark:text-white rounded-full"
                        style={{ display: iconUrl ? 'none' : 'flex' }}
                      >
                        {initials}
                      </div>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-foreground dark:text-white">{token.title || token.symbol}</p>
                      <p className="text-xs text-muted-foreground dark:text-gray-400">
                        {token.balanceFormatted || token.balance} {token.symbol}
                      </p>
                    </div>
                  </button>
                )
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-muted-foreground dark:text-gray-400 mb-2">
                  No tokens available
                </p>
                <p className="text-xs text-muted-foreground dark:text-gray-500">
                  Make sure your wallet is connected and has tokens
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* To Token Selector */}
      <Dialog open={showToTokenSelector} onOpenChange={setShowToTokenSelector}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Token</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <TigerSpinner size="md" />
              </div>
            ) : allTokens && allTokens.length > 0 ? (
              allTokens.map((token) => {
                const iconUrl = token.imageUrl || getBestTokenIcon(token.symbol)
                const initials = (token.symbol || 'TOKEN').slice(0, 2).toUpperCase()
                
                return (
                  <button
                    key={token.tokenAddress || token.id}
                    onClick={() => {
                      setToToken(token.tokenAddress)
                      setShowToTokenSelector(false)
                    }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-border dark:border-gray-700 flex-shrink-0 bg-muted dark:bg-gray-900 flex items-center justify-center relative">
                      {iconUrl ? (
                        <Image
                          src={iconUrl}
                          alt={token.title || token.symbol}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover rounded-full"
                          unoptimized={iconUrl.startsWith('http')}
                        />
                      ) : null}
                      <div
                        className="w-full h-full flex items-center justify-center text-xs font-semibold text-foreground dark:text-white rounded-full"
                        style={{ display: iconUrl ? 'none' : 'flex' }}
                      >
                        {initials}
                      </div>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-foreground dark:text-white">{token.title || token.symbol}</p>
                      <p className="text-xs text-muted-foreground dark:text-gray-400">
                        {token.balanceFormatted || token.balance} {token.symbol}
                      </p>
                    </div>
                  </button>
                )
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-muted-foreground dark:text-gray-400 mb-2">
                  No tokens available
                </p>
                <p className="text-xs text-muted-foreground dark:text-gray-500">
                  Make sure your wallet is connected and has tokens
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Wallet Navigation - Mobile Footer */}
      {isMobile && <WalletNavigation variant="mobile" />}
    </div>
  )
}

export default function SwapPage() {
  const isMounted = useClientMountStore((state) => state.isMounted)
  
  if (!isMounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background dark:bg-gray-950">
        <TigerSpinner size="lg" />
        <p className="mt-4 text-sm text-muted-foreground dark:text-gray-400">Loading swap page...</p>
      </div>
    )
  }
  
  return (
    <WalletSessionGuard>
      <SwapPageContent />
    </WalletSessionGuard>
  )
}

