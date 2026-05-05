'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, X, ChevronDown, Loader2, CreditCard, Apple, QrCode, Building2 } from 'lucide-react'
import { useAppKitAccount } from '../../../config'
import { useAppKit, Views } from '@reown/appkit/react'
import { useTokenizinWalletStore } from '@/lib/store/tokenizinWalletStore'  
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { TigerSpinner } from '../../../components/common/TigerSpinner'
import { WalletSessionGuard } from '../../../components/auth/WalletSessionGuard'
import { WalletNavigation } from '../../../components/wallet/WalletNavigation'
import { useClientMountStore } from '../../../store/clientMountStore'
import { getBestTokenIcon } from '../../../lib/utils/token-icons'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

type PaymentMethod = 'card' | 'apple-pay' | 'qris' | 'bank-transfer'

interface PaymentOption {
  id: PaymentMethod
  name: string
  icon: React.ReactNode
  time: string
  limit: string
  networks?: string[]
}

const PAYMENT_METHODS: PaymentOption[] = [
  {
    id: 'card',
    name: 'Debit or Credit',
    icon: <CreditCard className="h-5 w-5" />,
    time: '5 - 10 mins',
    limit: '$$$ lowest buy limit',
    networks: ['VISA', 'Mastercard'],
  },
  {
    id: 'apple-pay',
    name: 'Apple Pay',
    icon: <Apple className="h-5 w-5" />,
    time: 'Instant',
    limit: '$$$ lowest buy limit',
    networks: ['VISA', 'Mastercard'],
  },
  {
    id: 'qris',
    name: 'QRIS',
    icon: <QrCode className="h-5 w-5" />,
    time: 'Instant',
    limit: '$$ medium buy limit',
  },
  {
    id: 'bank-transfer',
    name: 'Indonesia Bank Transfer',
    icon: <Building2 className="h-5 w-5" />,
    time: 'Instant',
    limit: '$$$ lowest buy limit',
  },
]

function BuyPageContent() {
  const router = useRouter()
  const account = useAppKitAccount()
  const { address, isConnected } = account
  const { tokens, properties, loading, isFetchingAll, fetchingAddress } = useTokenizinWalletStore()  
  const isLoading = loading.tokens || loading.properties
  const isFetching = isFetchingAll || fetchingAddress === address
  const appKit = useAppKit()
  
  const [selectedToken, setSelectedToken] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [selectedCurrency, setSelectedCurrency] = useState('IDR')
  const [showTokenSelector, setShowTokenSelector] = useState(false)
  const [showCurrencySelector, setShowCurrencySelector] = useState(false)
  const [showPaymentMethod, setShowPaymentMethod] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null)
  const [showQuoteModal, setShowQuoteModal] = useState(false)
  const [isFetchingQuote, setIsFetchingQuote] = useState(false)
  
  // Detect mobile - use window check directly since component only renders on client
  const isMobile = typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  // ⚠️ CRITICAL: Combine tokens and properties (RWA tokens) into a single list
  // Properties are RWA tokens that should be available for buying
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
    
    return tokenList
  }, [tokens, properties])

  // Redirect if not connected
  useEffect(() => {
    if (!isConnected) {
      router.push('/wallet')
    }
  }, [isConnected, router])

  // Get selected token data
  const tokenData = useMemo(() => {
    if (!selectedToken) return null
    return allTokens.find(t => t.tokenAddress.toLowerCase() === selectedToken.toLowerCase())
  }, [selectedToken, allTokens])

  // Get token balance
  const tokenBalance = useMemo(() => {
    if (!tokenData) return { balance: '0', usdValue: '0' }
    return {
      balance: tokenData.balanceFormatted || tokenData.balance || '0',
      usdValue: (tokenData as any).usdValue || '0',
    }
  }, [tokenData])

  const handleBuyWithAppKit = () => {
    // Use AppKit's BuyCrypto view
    try {
      appKit?.open?.({ view: 'BuyCrypto' as Views })
    } catch (error) {
      console.error('Failed to open BuyCrypto view:', error)
      // Fallback: show payment method selection
      setShowPaymentMethod(true)
    }
  }

  const handleContinueWithPayment = () => {
    if (!selectedPaymentMethod) {
      setShowPaymentMethod(true)
      return
    }
    
    // Show quote fetching modal
    setShowQuoteModal(true)
    setIsFetchingQuote(true)
    
    // Simulate quote fetching
    setTimeout(() => {
      setIsFetchingQuote(false)
    }, 2000)
  }

  const handleUpdatePaymentMethod = () => {
    setShowPaymentMethod(true)
  }

  if (!isConnected) {
    return null // Will redirect via useEffect
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-muted dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-foreground dark:text-white" />
              </button>
              <h1 className="text-lg font-semibold text-foreground dark:text-white">Amount to buy</h1>
            </div>
            <button
              onClick={() => router.back()}
              className="text-sm text-muted-foreground dark:text-gray-400 hover:text-foreground dark:hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Account and Currency Selectors */}
        <div className="flex gap-2 mb-6">
          <Button
            variant="outline"
            onClick={() => {}}
            className="flex-1 justify-between"
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-bold">T</span>
              </div>
              <span className="text-sm font-medium">tiger admin</span>
            </div>
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowCurrencySelector(true)}
            className="flex-1 justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">🇮🇩</span>
            </div>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>

        {/* Token Selection */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground dark:text-gray-400 mb-2">You want to buy</p>
          <Button
            variant="outline"
            onClick={() => setShowTokenSelector(true)}
            className="w-full justify-between h-auto p-4"
          >
            <div className="flex items-center gap-3">
              {tokenData ? (
                <>
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-border dark:border-gray-700 flex-shrink-0 bg-muted dark:bg-gray-900 flex items-center justify-center relative">
                    {tokenData.imageUrl ? (
                      <Image
                        src={tokenData.imageUrl}
                        alt={tokenData.title || tokenData.symbol}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover rounded-full"
                        unoptimized={tokenData.imageUrl.startsWith('http')}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-foreground dark:text-white rounded-full">
                        {(tokenData.symbol || 'ETH').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-foreground dark:text-white">{tokenData.title || tokenData.symbol}</p>
                    <p className="text-xs text-muted-foreground dark:text-gray-400">
                      Current balance: {tokenBalance.balance} {tokenData.symbol} ≈ ${tokenBalance.usdValue}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-muted dark:bg-gray-900 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground dark:text-gray-400">?</span>
                  </div>
                  <span className="text-muted-foreground dark:text-gray-400">Select token</span>
                </>
              )}
            </div>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>

        {/* Amount Input */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground dark:text-gray-400 mb-2">Amount</p>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 text-lg font-semibold"
            />
            <Button
              variant="outline"
              onClick={() => setShowCurrencySelector(true)}
              className="min-w-[80px] justify-between"
            >
              {selectedCurrency}
              <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Payment Method */}
        {selectedPaymentMethod && (
          <div className="mb-6">
            <button
              onClick={handleUpdatePaymentMethod}
              className="text-sm text-primary dark:text-orange-500 hover:underline"
            >
              Update payment method
            </button>
          </div>
        )}

        {/* Buy Button */}
        <Button
          onClick={handleContinueWithPayment}
          disabled={!selectedToken || !amount || parseFloat(amount) <= 0}
          className="w-full"
          size="lg"
        >
          Continue
        </Button>

        {/* Alternative: Use AppKit Buy */}
        <div className="mt-4 text-center">
          <button
            onClick={handleBuyWithAppKit}
            className="text-sm text-primary dark:text-orange-500 hover:underline"
          >
            Or use AppKit Buy Crypto
          </button>
        </div>
      </div>

      {/* Token Selector Dialog */}
      <Dialog open={showTokenSelector} onOpenChange={setShowTokenSelector}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Token</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <TigerSpinner size="md" />
              </div>
            ) : (
              allTokens?.map((token) => {
                const iconUrl = token.imageUrl || getBestTokenIcon(token.symbol)
                const initials = (token.symbol || 'TOKEN').slice(0, 2).toUpperCase()
                
                return (
                  <button
                    key={token.tokenAddress}
                    onClick={() => {
                      setSelectedToken(token.tokenAddress)
                      setShowTokenSelector(false)
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
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Method Dialog */}
      <Dialog open={showPaymentMethod} onOpenChange={setShowPaymentMethod}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select payment method</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method.id}
                onClick={() => {
                  setSelectedPaymentMethod(method.id)
                  setShowPaymentMethod(false)
                }}
                className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
                  selectedPaymentMethod === method.id
                    ? 'border-primary dark:border-orange-500 bg-primary/10 dark:bg-orange-500/10'
                    : 'border-border dark:border-gray-700 hover:border-primary/50 dark:hover:border-orange-500/50'
                }`}
              >
                <div className="text-foreground dark:text-white">{method.icon}</div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-foreground dark:text-white">{method.name}</p>
                  <p className="text-xs text-muted-foreground dark:text-gray-400">
                    {method.time} • {method.limit}
                  </p>
                </div>
                {method.networks && (
                  <div className="flex items-center gap-1">
                    {method.networks.map((network) => (
                      <span key={network} className="text-xs text-muted-foreground dark:text-gray-400">
                        {network}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground dark:text-gray-400 mt-4 text-center">
            Credit card purchases may incur your bank&apos;s cash advance fees, subject to your bank&apos;s policies.
          </p>
        </DialogContent>
      </Dialog>

      {/* Quote Modal */}
      <Dialog open={showQuoteModal} onOpenChange={setShowQuoteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recommended quote</DialogTitle>
          </DialogHeader>
          {isFetchingQuote ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary dark:text-orange-500 mb-4" />
              <p className="text-sm text-muted-foreground dark:text-gray-400">Fetching quotes...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Button variant="outline" className="w-full">
                New quotes in 0:16
              </Button>
              <div className="bg-card dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">MOST RELIABLE</span>
                  <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">BEST RATE</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-foreground dark:text-white">mercuryo</p>
                    <p className="text-sm text-muted-foreground dark:text-gray-400">0.00931 ETH</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground dark:text-gray-400">≈ Rp 470809 IDR</p>
                  </div>
                </div>
                <Button className="w-full mt-4">Continue with Mercuryo</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Wallet Navigation - Mobile Footer */}
      {isMobile && <WalletNavigation variant="mobile" />}
    </div>
  )
}

export default function BuyPage() {
  const isMounted = useClientMountStore((state) => state.isMounted)
  
  if (!isMounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background dark:bg-gray-950">
        <TigerSpinner size="lg" />
        <p className="mt-4 text-sm text-muted-foreground dark:text-gray-400">Loading buy page...</p>
      </div>
    )
  }
  
  return (
    <WalletSessionGuard>
      <BuyPageContent />
    </WalletSessionGuard>
  )
}

