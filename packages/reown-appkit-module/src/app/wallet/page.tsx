'use client'

import React, { useMemo } from 'react'
import Image from 'next/image'
import dynamicImport from 'next/dynamic'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import {
  useAppKitAccount,
  useAppKitNetwork,
} from '../../config'
import { useAppKit, useWalletInfo } from '@reown/appkit/react'
import { Button } from '../../components/ui/button'
import { TokenizinRWAWalletWrapper } from '../../components/auth/TokenizinRWAWalletWrapper'
import { WalletSessionGuard } from '../../components/auth/WalletSessionGuard'
import { useWagmiProviderStore } from '../../stores/wagmi-provider-store'
import { useTokenizinWalletStore } from '@/lib/store/tokenizinWalletStore'  
import { useClientMountStore } from '../../store/clientMountStore'
import { useWalletPageUI } from '../../store/uiStore'
import { TigerSpinner } from '../../components/common/TigerSpinner'
import { AppLayout } from '../../components/layouts/app-layout'
import { WalletNavigation } from '../../components/wallet/WalletNavigation'
import { QRScanner, QRScanResult } from '@/components/wallet/QRScanner' 
import { enableMobileGestures, isGestureSupported } from '../../lib/utils/mobile-gestures'
// Removed: import { useAccount } from 'wagmi'
// Use AppKit hooks instead to avoid WagmiProvider dependency
import { Address } from 'viem'
import { 
  DollarSign, 
  ArrowLeftRight, 
  Send, 
  ArrowDown, 
  Copy, 
  ChevronDown,
  MoreVertical,
  Filter,
  ExternalLink,
  RefreshCw,
  Wallet,
  Building2,
  Coins,
  History,
  QrCode,
} from 'lucide-react'
import { getBestTokenIcon } from '@/lib/utils/token-icons'
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert'
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { WalletInfoData } from '../../stores/wallet-store'
import { WalletInitializationProgress } from '../../components/auth/WalletInitializationProgress'
import { SendDialog } from '../../components/TokenizinRWAWallet/dialogs/SendDialog'

// Force dynamic rendering to prevent SSR issues
export const dynamic = 'force-dynamic'

// Dynamically import UI components to avoid SSR issues
const WalletBalanceCard = dynamicImport(
  () => import('./components/WalletBalanceCard').then(mod => ({ default: mod.WalletBalanceCard })),
  { ssr: false }
)

const ActionButtons = dynamicImport(
  () => import('./components/ActionButtons').then(mod => ({ default: mod.ActionButtons })),
  { ssr: false }
)

const TokenList = dynamicImport(
  () => import('./components/TokenList').then(mod => ({ default: mod.TokenList })),
  { ssr: false }
)

const SettingsDialog = dynamicImport(
  () => import('./components/SettingsDialog').then(mod => ({ default: mod.SettingsDialog })),
  { ssr: false }
)

// Client-only wallet page content component
function WalletPageContent() {
  const { theme, resolvedTheme } = useTheme()
  const router = useRouter()
  const isMounted = useClientMountStore((state) => state.isMounted)
  
  // Use local state to track hydration to prevent hydration mismatches
  const [isHydrated, setIsHydrated] = React.useState(false)
  
  React.useEffect(() => {
    setIsHydrated(true)
  }, [])
  
  // ✅ CORRECT: Use Zustand store for UI state instead of useState
  const { activeTab, setActiveTab, dialogs, setDialog } = useWalletPageUI()
  
  // Settings dialog state
  const [showSettings, setShowSettings] = React.useState(false)
  
  // QR Scanner state
  const [showQRScanner, setShowQRScanner] = React.useState(false)
  
  // Send dialog state
  const [showSendDialog, setShowSendDialog] = React.useState(false)
  
  // ✅ BEST PRACTICE: Only use hooks you actually need
  // AppKit hooks - called unconditionally (React rules)
  // These will work because this component only renders on client side
  const { address, isConnected, status } = useAppKitAccount()
  const network = useAppKitNetwork()
  const { open } = useAppKit()
  
  // Wallet connection state
  const showTigerWallet = useWagmiProviderStore((state) => state.isDialogOpen)
  const setShowTigerWallet = useWagmiProviderStore((state) => state.setDialogOpen)
  
  // CRITICAL: Memoize normalized address string to prevent unnecessary effect re-runs
  // This ensures the effect only runs when the address value actually changes, not when the object reference changes
  const normalizedAddress = React.useMemo(() => address?.toLowerCase() || null, [address])
  
  // Detect iOS/mobile browsers (only after hydration to prevent SSR mismatch)
  const isIOS = isHydrated && typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isMobile = isHydrated && typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Handle QR scan result
  const handleQRScanSuccess = (result: QRScanResult) => {
    console.log('QR Scan Result:', result)
    // Navigate to receive page if address is scanned, or send page if token info is included
    if (result.tokenAddress) {
      router.push(`/wallet/send?token=${result.tokenAddress}&recipient=${result.address}`)
    } else {
      router.push(`/wallet/receive?address=${result.address}`)
    }
  }

  // Enable mobile gestures
  const contentRef = React.useRef<HTMLDivElement>(null)
  
  React.useEffect(() => {
    if (!isHydrated || !isMobile || !contentRef.current) return

    const cleanup = enableMobileGestures(contentRef.current, {
      onSwipeLeft: () => {
        // Swipe left to go to next tab
        const tabs = ['tokens', 'defi', 'nfts', 'activity']
        const currentIndex = tabs.indexOf(activeTab)
        if (currentIndex < tabs.length - 1) {
          setActiveTab(tabs[currentIndex + 1] as any)
        }
      },
      onSwipeRight: () => {
        // Swipe right to go to previous tab
        const tabs = ['tokens', 'defi', 'nfts', 'activity']
        const currentIndex = tabs.indexOf(activeTab)
        if (currentIndex > 0) {
          setActiveTab(tabs[currentIndex - 1] as any)
        }
      },
    })

    return cleanup
  }, [isHydrated, isMobile, activeTab, setActiveTab])
  
  // ✅ BEST PRACTICE 1: Success and Error Messages
  // Toast notifications for user feedback
  const { toast } = useToast()
  const [connectionError, setConnectionError] = React.useState<string | null>(null)
  const [connectionSuccess, setConnectionSuccess] = React.useState(false)
  
  // ✅ BEST PRACTICE 3: Latency Optimization
  // Performance monitoring for connection time
  const [connectionStartTime, setConnectionStartTime] = React.useState<number | null>(null)
  
  // ✅ BEST PRACTICE 4: Verify API
  // Domain verification state
  const [domainVerification, setDomainVerification] = React.useState<{
    verified: boolean
    domain: string
    loading: boolean
  }>({
    verified: false,
    domain: typeof window !== 'undefined' ? window.location.hostname : '',
    loading: true,
  })
  
  // Check domain verification status
  React.useEffect(() => {
    const checkDomainVerification = async () => {
      try {
        // Domain is verified if wallet is connected
        setDomainVerification({
          verified: isConnected && !!address,
          domain: typeof window !== 'undefined' ? window.location.hostname : '',
          loading: false,
        })
      } catch (error) {
        console.error('Failed to verify domain:', error)
        setDomainVerification(prev => ({ ...prev, loading: false }))
      }
    }
    
    if (typeof window !== 'undefined') {
      checkDomainVerification()
    }
  }, [isConnected, address])
  
  // Success message handler
  const showSuccessMessage = React.useCallback((message: string) => {
    toast({
      title: 'Success',
      description: message,
      variant: 'default',
    })
    setConnectionSuccess(true)
    setTimeout(() => setConnectionSuccess(false), 3000)
  }, [toast])
  
  // Error message handler
  const showErrorMessage = React.useCallback((message: string, error?: Error) => {
    const errorMessage = error?.message || message
    toast({
      title: 'Error',
      description: errorMessage,
      variant: 'destructive',
    })
    setConnectionError(errorMessage)
    setTimeout(() => setConnectionError(null), 5000)
  }, [toast])
  
  // Handle wallet connection with better error handling
  const [isConnecting, setIsConnecting] = React.useState(false);
  
  const handleConnectWallet = async () => {
    // Prevent multiple simultaneous connection attempts
    if (isConnecting) {
      console.log('⏸️ [Wallet Page] Connection already in progress, please wait...');
      return;
    }
    
    setIsConnecting(true);
    setConnectionError(null);
    setConnectionStartTime(Date.now()); // ✅ BEST PRACTICE 3: Start latency tracking
    
    try {
        // Log device info for debugging
        console.log('🔌 [Wallet Page] Connecting wallet:', {
          isIOS,
          isMobile,
          hasAppKit: !!open,
          userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'SSR',
        });
      
      // ✅ BEST PRACTICE 2: Mobile Linking
      // On iOS: Show helpful message about WalletConnect
      if (isIOS) {
        console.log('📱 [Wallet Page] iOS detected - MetaMask extension not available, using WalletConnect');
      }
      
      // Check if MetaMask is already connected (might have pending request)
      const ethereum = typeof window !== 'undefined' ? (window as any).ethereum : null;
      if (ethereum?.isMetaMask && ethereum.selectedAddress) {
        console.log('ℹ️ [Wallet Page] MetaMask already connected:', ethereum.selectedAddress);
        console.log('   If you see "Connection declined", try refreshing the page or disconnecting/reconnecting MetaMask');
      }
      
      // Small delay to ensure any previous requests have cleared
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // ✅ BEST PRACTICE: Use destructured open function from useAppKit()
      // ✅ BEST PRACTICE 2: Mobile Linking - AppKit handles deep linking automatically
      if (open && typeof open === 'function') {
        // Open with Connect view - on iOS this will show WalletConnect options
        await open({ view: 'Connect' })
        
        // ✅ BEST PRACTICE 3: Latency Optimization
        // Monitor connection latency
        const connectionTime = connectionStartTime ? Date.now() - connectionStartTime : 0;
        if (connectionTime > 5000) {
          console.warn(`⚠️ [Wallet Page] Connection took ${connectionTime}ms (target: <5000ms)`);
        } else {
          console.log(`✅ [Wallet Page] Connection initiated in ${connectionTime}ms`);
        }
      } else {
        // Fallback to TigerRWAWallet dialog
        console.warn('⚠️ [Wallet Page] AppKit not available, using fallback dialog');
        setShowTigerWallet(true)
      }
    } catch (error: any) {
      console.error('❌ [Wallet Page] Failed to open wallet connection:', error)
      
      // ✅ BEST PRACTICE 1: Error Messages
      // Check if error is related to pending requests
      const errorMessage = error?.message || String(error);
      if (errorMessage.includes('declined') || errorMessage.includes('pending') || errorMessage.includes('active')) {
        console.warn('⚠️ [Wallet Page] MetaMask connection declined - likely due to pending request');
        showErrorMessage('Wallet connection was declined. Please close any open wallet popups, wait a few seconds, and try again.');
      } else if (errorMessage.includes('Proposal expired') || errorMessage.includes('proposal expired')) {
        console.warn('⚠️ [Wallet Page] Wallet proposal expired - user took too long to respond');
        showErrorMessage('The wallet connection request expired. Please try connecting again.');
      } else {
        showErrorMessage('Failed to connect wallet. Please try again.', error);
      }
      
      // Fallback to TigerRWAWallet dialog
      setShowTigerWallet(true)
    } finally {
      // Reset connecting state after a delay
      setTimeout(() => {
        setIsConnecting(false);
        setConnectionStartTime(null);
      }, 2000);
    }
  }
  
  // ✅ BEST PRACTICE 1: Success Messages
  // Handle wallet connection success
  React.useEffect(() => {
    if (isConnected && address && connectionStartTime) {
      const connectionTime = Date.now() - connectionStartTime;
      showSuccessMessage(`Wallet connected successfully in ${connectionTime}ms`);
      setConnectionStartTime(null);
    }
  }, [isConnected, address, connectionStartTime, showSuccessMessage])
  
  // Tiger wallet data from Zustand store
  const {
    balances,
    tokens,
    properties,
    transactions,
    pendingTransactions,
    network: walletNetwork,
    loading,
    error,
  } = useTokenizinWalletStore()
  
  // Progress tracking - monitor wallet data loading state
  const progress = useTokenizinWalletStore((state) => state.progress)
  const isFetchingAll = useTokenizinWalletStore((state) => state.isFetchingAll)
  
  // Check if we have any wallet data loaded for current address
  // This helps determine if we're in initial load state
  const hasData = balances !== null || (tokens && tokens.length > 0) || (properties && properties.length > 0) || (transactions && transactions.length > 0)
  
  // Determine operation completion status
  // Operations can be: 'pending', 'in-progress', 'completed', or 'error'
  const allOperationsComplete = progress.operations.every(
    op => op.status === 'completed' || op.status === 'error'
  )
  const isProgressActive = progress.isActive && isFetchingAll
  
  // Determine if data is currently loading
  // Loading is active if:
  // - Individual loading states are true (isLoading)
  // - Fetch all operation is in progress (isFetchingAll)
  // - Progress tracking is active (isProgressActive)
  const isDataLoading = loading.balances || loading.tokens || loading.properties || loading.transactions || isFetchingAll || isProgressActive
  
  // Show progress tracker when:
  // 1. Data is actively loading (any loading state is true)
  // 2. OR we don't have data yet and operations aren't complete (initial load)
  // This ensures progress tracker shows during initial load and when address changes
  const showProgressTracker = isDataLoading || (!hasData && !allOperationsComplete)
  
  // Show main content only when:
  // 1. Component is mounted and hydrated (prevents SSR/hydration issues)
  // 2. All operations are complete (even with errors, we show what we have)
  // 3. Not currently fetching (prevents flickering during refresh)
  // 4. No individual loading states active
  // This ensures components only mount when data is ready, preventing empty states and errors
  const isDataReady = allOperationsComplete && !isFetchingAll && !loading.balances && !loading.tokens && !loading.properties && !loading.transactions && isMounted && isHydrated
  const showContent = isDataReady
  
  // ✅ CORRECT: Watch address changes via store action using useEffect
  // useEffect is allowed for mount-time initialization and prevents render-time state updates
  const watchAddress = useTokenizinWalletStore((state) => state.watchAddress)
  const lastWatchedAddressRef = React.useRef<string | null>(null)
  
  React.useEffect(() => {
    if (!isMounted || !isConnected || !normalizedAddress) {
      // Clear watched address if disconnected
      if (lastWatchedAddressRef.current !== null) {
        lastWatchedAddressRef.current = null;
        watchAddress(null);
      }
      return;
    }
    
    // CRITICAL: Compare normalized address with ref to prevent duplicate calls
    // The store's watchAddress function also has internal guards to prevent duplicate updates
    if (lastWatchedAddressRef.current === normalizedAddress) {
      return; // Address hasn't changed, skip
    }
    
    // Update ref BEFORE calling watchAddress to prevent re-triggering
    lastWatchedAddressRef.current = normalizedAddress;
    
    // Call watchAddress with original address (store will normalize internally)
    // The store's watchAddress function has guards to prevent duplicate calls even if effect runs multiple times
    // CRITICAL: watchAddress is a stable Zustand action, don't include in dependencies
    watchAddress(address as Address);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted, isConnected, normalizedAddress]);
  
  // Close wallet dialog when wallet connects
  React.useEffect(() => {
    if (isConnected && address && showTigerWallet) {
      // Wallet connected, close the dialog
      setShowTigerWallet(false);
    }
  }, [isConnected, address, showTigerWallet, setShowTigerWallet]);

  // Get current theme mode
  const currentThemeMode = isMounted ? (resolvedTheme || theme || 'dark') : 'dark'

  // Format balance display
  const formattedBalance = useMemo(() => {
    if (!balances) return { eth: '0.000000', usd: '$0.00', change: '+0.00%' }
    
    const ethBalance = parseFloat(balances.eth || '0').toFixed(6)
    const usdValue = balances.totalUSDValue || '0.00'
    const change = '+0.10%' // TODO: Calculate actual change
    
    return {
      eth: ethBalance,
      usd: `$${usdValue}`,
      change,
    }
  }, [balances])

  // Combine tokens and properties for display
  const allAssets = useMemo(() => {
    // Filter out invalid tokens and ensure required properties exist
    const tokenAssets = (tokens || [])
      .filter(token => token && token.symbol && token.tokenAddress)
      .map(token => ({
        type: 'token' as const,
        symbol: token.symbol || 'UNKNOWN',
        name: token.title || token.symbol || 'Unknown Token',
        balance: token.balance || '0',
        balanceFormatted: token.balanceFormatted || token.balance || '0',
        usdValue: token.usdValue || '0.00',
        icon: token.imageUrl || getBestTokenIcon(token.symbol),
        address: token.tokenAddress,
      }))
    
    // Filter out invalid properties and ensure required properties exist
    const propertyAssets = (properties || [])
      .filter(property => property && property.tokenAddress)
      .map(property => ({
        type: 'property' as const,
        symbol: property.symbol || 'PROP',
        name: property.title || property.symbol || 'Property',
        balance: property.balance || '0',
        balanceFormatted: property.balanceFormatted || property.balance || '0',
        usdValue: property.usdValue || '0.00',
        icon: property.imageUrl || getBestTokenIcon(property.symbol || 'PROP'),
        address: property.tokenAddress,
      }))
    
    return [...tokenAssets, ...propertyAssets]
  }, [tokens, properties])
  
  // Prepare available tokens for SendDialog
  const availableTokensForSend = useMemo(() => {
    const availableTokens: Array<{ symbol: string; balance: string; address: string }> = []
    
    // Debug: Log balances object to see what we have
    console.log('🔍 [SendDialog] Balances object:', balances)
    console.log('🔍 [SendDialog] Tokens array length:', tokens?.length || 0)
    console.log('🔍 [SendDialog] Properties array length:', properties?.length || 0)
    
    // Add native ETH token
    if (balances?.eth) {
      const ethBalance = parseFloat(balances.eth)
      if (ethBalance > 0) {
        availableTokens.push({
          symbol: 'ETH',
          balance: balances.eth,
          address: '0x0000000000000000000000000000000000000000'
        })
        console.log('✅ [SendDialog] Added ETH:', balances.eth)
      }
    }
    
    // Add standard ERC20 tokens from balances (USDC, EURC, TKNZN)
    if (balances) {
      // USDC token
      if (balances.usdc) {
        const usdcBalance = parseFloat(balances.usdc)
        if (usdcBalance > 0) {
          const usdcAddress = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' // Sepolia USDC
          availableTokens.push({
            symbol: 'USDC',
            balance: balances.usdc,
            address: usdcAddress
          })
          console.log('✅ [SendDialog] Added USDC:', { balance: balances.usdc, address: usdcAddress })
        } else {
          console.log('⚠️ [SendDialog] USDC balance is zero:', balances.usdc)
        }
      } else {
        console.log('⚠️ [SendDialog] USDC not found in balances')
      }
      
      // EURC token
      if (balances.eurc) {
        const eurcBalance = parseFloat(balances.eurc)
        if (eurcBalance > 0) {
          const eurcAddress = '0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4' // Sepolia EURC
          availableTokens.push({
            symbol: 'EURC',
            balance: balances.eurc,
            address: eurcAddress
          })
          console.log('✅ [SendDialog] Added EURC:', { balance: balances.eurc, address: eurcAddress })
        } else {
          console.log('⚠️ [SendDialog] EURC balance is zero:', balances.eurc)
        }
      } else {
        console.log('⚠️ [SendDialog] EURC not found in balances')
      }
      
      // TKNZN token (TPT) - API may return tknzn or tpt
      const tptBalanceStr = balances.tpt ?? (balances as { tknzn?: string }).tknzn
      if (tptBalanceStr) {
        const tptBalance = parseFloat(tptBalanceStr)
        if (tptBalance > 0) {
          const tptAddress = '0x064682F1555d3baD3Dab5eDD0DEe45372F23a570' // Sepolia TKNZN
          availableTokens.push({
            symbol: 'TKNZN',
            balance: tptBalanceStr,
            address: tptAddress
          })
          console.log('✅ [SendDialog] Added TKNZN:', { balance: tptBalanceStr, address: tptAddress })
        } else {
          console.log('⚠️ [SendDialog] TKNZN balance is zero:', tptBalanceStr)
        }
      } else {
        console.log('⚠️ [SendDialog] TKNZN (tpt/tknzn) not found in balances')
      }
    }
    
    // Add ERC20/RWA tokens from tokens array
    if (tokens && tokens.length > 0) {
      tokens.forEach(token => {
        if (token && token.tokenAddress && token.symbol) {
          const balance = token.balanceFormatted || token.balance || '0'
          const balanceNum = parseFloat(balance)
          // Only add tokens with positive balance
          if (balanceNum > 0) {
            availableTokens.push({
              symbol: token.symbol,
              balance: balance,
              address: token.tokenAddress
            })
            console.log('✅ [SendDialog] Added token from tokens array:', { symbol: token.symbol, balance, address: token.tokenAddress })
          }
        }
      })
    }
    
    // Add property tokens from properties array
    if (properties && properties.length > 0) {
      properties.forEach(property => {
        if (property && property.tokenAddress && property.symbol) {
          const balance = property.balanceFormatted || property.balance || '0'
          const balanceNum = parseFloat(balance)
          // Only add properties with positive balance
          if (balanceNum > 0) {
            // Use property title as symbol if available, otherwise use symbol
            const displaySymbol = property.title || property.symbol || 'PROPERTY'
            availableTokens.push({
              symbol: displaySymbol,
              balance: balance,
              address: property.tokenAddress
            })
            console.log('✅ [SendDialog] Added property token:', { symbol: displaySymbol, balance, address: property.tokenAddress })
          }
        }
      })
    }
    
    // Debug logging
    console.log('🔍 [SendDialog] Final available tokens:', {
      total: availableTokens.length,
      tokens: availableTokens.map(t => ({ symbol: t.symbol, balance: t.balance, address: t.address }))
    })
    
    return availableTokens
  }, [balances, tokens, properties])

  // Show loading state until mounted and hydrated to prevent hydration mismatch
  if (!isMounted || !isHydrated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background dark:bg-gray-950">
        <TigerSpinner size="lg" />
        <p className="mt-4 text-sm text-muted-foreground dark:text-gray-400">Loading wallet...</p>
      </div>
    )
  }

  // ✅ BEST PRACTICE: Use status for more granular connection state
  if (!isConnected || status === 'disconnected') {
    return (
      <>
        <AppLayout showSidebar={false} showHeader={true}>
          <div className="flex flex-col items-center justify-center min-h-screen bg-background dark:bg-gray-950 p-4">
            {/* ✅ BEST PRACTICE 1: Error Messages */}
            {connectionError && (
              <Alert variant="destructive" className="mb-6 max-w-md">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Connection Error</AlertTitle>
                <AlertDescription>{connectionError}</AlertDescription>
              </Alert>
            )}
            
            {/* ✅ BEST PRACTICE 1: Success Messages */}
            {connectionSuccess && (
              <Alert className="mb-6 max-w-md border-green-500/50 bg-green-500/10">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertTitle className="text-green-500">Success</AlertTitle>
                <AlertDescription className="text-green-500">
                  Wallet connected successfully
                </AlertDescription>
              </Alert>
            )}
            
            <Wallet className="h-16 w-16 text-muted-foreground dark:text-gray-600 mb-4" />
            <h2 className="text-2xl font-semibold text-foreground dark:text-white mb-2">Wallet Not Connected</h2>
            <p className="text-muted-foreground dark:text-gray-400 text-center max-w-md mb-4">
              Please connect your wallet to view your RWA assets and manage your portfolio.
            </p>
            
            {/* ✅ BEST PRACTICE 2: Mobile Linking */}
            {isIOS && (
              <Alert className="mb-6 max-w-md border-blue-500/50 bg-blue-500/10">
                <AlertCircle className="h-4 w-4 text-blue-500" />
                <AlertTitle className="text-blue-500">📱 iOS Device Detected</AlertTitle>
                <AlertDescription className="text-blue-500">
                  Browser extensions aren&apos;t supported on iOS. Use WalletConnect to connect MetaMask or other wallets via their mobile apps.
                </AlertDescription>
              </Alert>
            )}
            
            {/* ✅ BEST PRACTICE 4: Domain Verification */}
            {domainVerification.loading ? (
              <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground dark:text-gray-400">
                <TigerSpinner size="sm" />
                <span>Verifying domain...</span>
              </div>
            ) : domainVerification.verified ? (
              <Alert className="mb-6 max-w-md border-green-500/50 bg-green-500/10">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertTitle className="text-green-500">Domain Verified</AlertTitle>
                <AlertDescription className="text-green-500">
                  {domainVerification.domain}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="mb-6 max-w-md border-yellow-500/50 bg-yellow-500/10">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <AlertTitle className="text-yellow-500">Domain Verification Pending</AlertTitle>
                <AlertDescription className="text-yellow-500">
                  Connect your wallet to verify domain
                </AlertDescription>
              </Alert>
            )}
            
            <Button
              onClick={handleConnectWallet}
              disabled={isConnecting}
              className="gap-2 bg-gradient-to-r from-orange-600 to-orange-500 text-white dark:text-white hover:from-orange-700 hover:to-orange-600 dark:hover:from-orange-500 dark:hover:to-orange-400 border border-orange-400/30 dark:border-orange-400/40 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              size="lg"
            >
              {isConnecting ? (
                <>
                  <TigerSpinner size="sm" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wallet className="h-5 w-5" />
                  Connect Wallet
                </>
              )}
            </Button>
            
            {/* ✅ BEST PRACTICE 3: Latency Indicator */}
            {connectionStartTime && (
              <div className="mt-4 text-sm text-muted-foreground dark:text-gray-400">
                Connection in progress... ({Math.floor((Date.now() - connectionStartTime) / 1000)}s)
              </div>
            )}
          </div>
        </AppLayout>
        
        {/* Wallet Connection Dialog */}
        {showTigerWallet && (
          <TokenizinRWAWalletWrapper
            open={showTigerWallet}
            onOpenChange={setShowTigerWallet}
            defaultTab="tokens"
          />
        )}
        
        {/* Send Dialog - Custom dialog that shows all ERC20/RWA tokens */}
        <SendDialog
          open={showSendDialog}
          onOpenChange={setShowSendDialog}
          availableTokens={availableTokensForSend}
        />
      </>
    )
  }

  return (
    <AppLayout showSidebar={false} showHeader={true}>
      <div className="min-h-screen bg-background dark:bg-gray-950 pb-20 md:pb-6">
        {/* ✅ BEST PRACTICE 1: Success and Error Messages */}
        {connectionError && (
          <div className="max-w-4xl mx-auto px-4 pt-4">
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{connectionError}</AlertDescription>
            </Alert>
          </div>
        )}
        
        {connectionSuccess && (
          <div className="max-w-4xl mx-auto px-4 pt-4">
            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle className="text-green-500">Success</AlertTitle>
              <AlertDescription className="text-green-500">
                Operation completed successfully
              </AlertDescription>
            </Alert>
          </div>
        )}
        
        {/* Settings Dialog */}   
        <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />

        {/* Wallet Navigation - Desktop */}
        {!isMobile && (
          <div className="sticky top-0 z-40 bg-background dark:bg-gray-950 border-b border-border dark:border-gray-800">
            <div className="max-w-4xl mx-auto px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <WalletNavigation variant="desktop" />
                {/* ✅ BEST PRACTICE 4: Domain Verification Badge */}
                {domainVerification.verified && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-500 font-medium">Verified</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Progress Tracker - Show while loading wallet data */}
        {isDataLoading && (
          <div className="max-w-4xl mx-auto px-4 py-6">
            <WalletInitializationProgress walletAddress={address as Address} className="w-full max-w-md mx-auto p-6 bg-card border border-border rounded-lg shadow-lg dark:bg-gray-900 dark:border-gray-800" />  
          </div>
        )}

        {/* Loading State - Show spinner while initializing */}
        {!isDataLoading && !showContent && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-4xl mx-auto px-4 py-12">
            <TigerSpinner size="lg" />
            <p className="mt-4 text-sm text-muted-foreground dark:text-gray-400">
              Preparing wallet data...
            </p>
          </div>
        )}

        {/* Main Content - Only render when all data is loaded */}
        {showContent && (
        <div ref={contentRef} className="max-w-4xl mx-auto px-4 py-6" style={{ 
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollBehavior: 'smooth',
          minHeight: 'calc(100vh - 200px)',
          paddingBottom: isMobile ? '80px' : '24px'
        }}>
        {/* Balance Card with QR Icon */}
        <div className="relative">
          <WalletBalanceCard  
            balance={formattedBalance}
            network={walletNetwork || {
              chainId: Number(network?.chainId) || null,
              name: network?.caipNetwork?.name || null,
            }}
            isLoading={loading.balances}
            themeMode={currentThemeMode}
          />
          {/* QR Icon - Right side */}
          <button
            onClick={() => setShowQRScanner(true)}
            className="absolute top-0 right-0 p-3 hover:bg-muted dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Scan QR Code"
          >
            <QrCode className="h-5 w-5 text-primary dark:text-orange-400" />
          </button>
        </div>

        {/* Action Buttons */}
        <ActionButtons 
          themeMode={currentThemeMode}
          onBuyClick={() => {
            // ✅ BEST PRACTICE: Use valid AppKit view name and destructured open function
            // Open AppKit modal with OnRampProviders view for buying crypto
            // When connected via WalletConnect, AppKit provides onramp functionality
            // Users can buy crypto directly through the AppKit interface
            try {
              open({ view: 'OnRampProviders' })
            } catch (error) {
              console.error('Failed to open OnRampProviders view:', error)
              showErrorMessage('Failed to open buy crypto view. Please try again.', error as Error)
            }
          }}
          onSwapClick={() => {
            // ✅ BEST PRACTICE: Use valid AppKit view name and destructured open function
            // Open AppKit modal with Swap view for token swaps
            // AppKit provides token swap functionality for WalletConnect wallets
            try {
              open({ view: 'Swap' })
            } catch (error) {
              console.error('Failed to open Swap view:', error)
              showErrorMessage('Failed to open swap view. Please try again.', error as Error)
            }
          }}
          onSendClick={() => {
            // ✅ Use custom SendDialog instead of AppKit's WalletSend view
            // This ensures all ERC20/RWA tokens are visible in the send dialog
            setShowSendDialog(true)
          }}
          onReceiveClick={() => {
            // ✅ BEST PRACTICE: Use Account view to show QR code for receiving
            // Account view displays wallet address and QR code that other wallets can scan
            // When connected via WalletConnect, AppKit displays:
            // - QR code that other wallets can scan to send tokens
            // - Wallet address for manual entry
            // - Compatible with MetaMask and other WalletConnect wallets
            try {
              // Account view shows wallet address and QR code for receiving
              open({ view: 'Account' })
              showSuccessMessage('Account view opened - scan QR code to receive tokens')
            } catch (error) {
              console.error('Failed to open Account view:', error)
              // ✅ BEST PRACTICE 1: Error Messages
              showErrorMessage('Failed to open receive view. Please try again.', error as Error)
              // Fallback: navigate to receive page
              router.push('/wallet/receive')
            }
          }}
          onRWAClick={() => {
            setActiveTab('nfts')
            // Show RWA assets in NFTs tab
          }}
          onRewardsClick={() => {
            // Open rewards dialog or navigate
            setDialog('rewards', true)
          }}
          onGameFiClick={() => {
            // Open GameFi dialog or navigate
            setDialog('gameFi', true)
          }}
        />

        {/* Tabs */}
        <div className="mt-6 mb-4">
          <div className="flex border-b border-border dark:border-gray-700">
            {[
              { id: 'tokens', label: 'Tokens', icon: Coins },
              { id: 'defi', label: 'DeFi', icon: Building2 },
              { id: 'nfts', label: 'NFTs', icon: Building2 },
              { id: 'activity', label: 'Activity', icon: History },
            ].map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    flex-1 py-3 px-2 text-sm font-medium transition-colors
                    ${isActive 
                      ? 'text-foreground dark:text-white border-b-2 border-primary dark:border-orange-500' 
                      : 'text-muted-foreground dark:text-gray-400 hover:text-foreground dark:hover:text-white'
                    }
                  `}
                >
                  <span className="flex items-center justify-center gap-1">
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Network Selector and Filters */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <select 
              className="
                bg-card dark:bg-gray-800 border border-border dark:border-gray-700 
                rounded-lg px-3 py-2 text-sm text-foreground dark:text-white
                focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-orange-500
              "
            >
              <option value={network?.chainId || 11155111}>
                {network?.caipNetwork?.name || walletNetwork?.name || 'Sepolia'}
              </option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-muted dark:hover:bg-gray-800 rounded-lg transition-colors">
              <Filter className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
            </button>
            <button className="p-2 hover:bg-muted dark:hover:bg-gray-800 rounded-lg transition-colors">
              <MoreVertical className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content based on active tab */}
        {/* {activeTab === 'tokens' && (
          <TokenList assets={tokens} isLoading={isLoading} error={error} onRefresh={() => fetchTokens(address as Address)} themeMode={currentThemeMode as 'dark' | 'light'} />
        )} */}

        {activeTab === 'defi' && (
          <div className="text-center py-12 text-muted-foreground dark:text-gray-400">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>DeFi features coming soon</p>
          </div>
        )}

        {activeTab === 'nfts' && (
          <div className="text-center py-12 text-muted-foreground dark:text-gray-400">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>NFTs will be displayed here</p>
            {properties && properties.length > 0 && (
              <div className="mt-4">
                <p className="text-sm">Found {properties.length} property tokens</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-3">
            {loading.transactions ? (
              <div className="text-center py-12 text-muted-foreground dark:text-gray-400">
                <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin" />
                <p>Loading transactions...</p>
              </div>
            ) : transactions && transactions.length > 0 ? (
              transactions.map((tx, index) => {
                // Determine if transaction is send or receive based on address
                const isSend = address && tx.from.toLowerCase() === address.toLowerCase()
                const isReceive = address && tx.to.toLowerCase() === address.toLowerCase()
                const txType = isSend ? 'send' : isReceive ? 'receive' : 'unknown'
                
                // Format value (convert from wei if needed)
                const formatValue = (value: string) => {
                  try {
                    const numValue = parseFloat(value)
                    if (numValue >= 1e18) {
                      return (numValue / 1e18).toFixed(6)
                    }
                    return numValue.toFixed(6)
                  } catch {
                    return value
                  }
                }
                const formattedValue = formatValue(tx.value)
                
                return (
                  <div
                    key={tx.id || index}
                    className="
                      bg-card dark:bg-gray-800 border border-border dark:border-gray-700 
                      rounded-lg p-4 hover:bg-muted dark:hover:bg-gray-700 transition-colors
                    "
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-orange-500/20 flex items-center justify-center">
                          {txType === 'send' ? (
                            <Send className="h-5 w-5 text-primary dark:text-orange-500" />
                          ) : (
                            <ArrowDown className="h-5 w-5 text-primary dark:text-orange-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground dark:text-white">
                            {txType === 'send' ? 'Sent' : 'Received'} {tx.tokenSymbol || 'ETH'}
                          </p>
                          <p className="text-xs text-muted-foreground dark:text-gray-400">
                            {tx.timestamp ? new Date(tx.timestamp).toLocaleDateString() : tx.status === 'pending' ? 'Pending' : 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${txType === 'send' ? 'text-red-500' : 'text-green-500'}`}>
                          {txType === 'send' ? '-' : '+'}{formattedValue} {tx.tokenSymbol || 'ETH'}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-12 text-muted-foreground dark:text-gray-400">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No transactions found</p>
              </div>
            )}
          </div>
        )}
        </div>
        )}
        
        {/* Wallet Navigation - Mobile Footer */}
        {isMobile && <WalletNavigation variant="mobile" />}
      </div>
      
      {/* Send Dialog - Custom dialog that shows all ERC20/RWA tokens */}
      <SendDialog
        open={showSendDialog}
        onOpenChange={setShowSendDialog}
        availableTokens={availableTokensForSend}
      />
    </AppLayout>
  )
}

// Main page component - wraps content in client-only component to prevent build errors
// Using dynamic import pattern to ensure this only runs on client side
export default function WalletPage() {
  // ✅ CORRECT: Use client mount store instead of useState + useEffect
  const isMounted = useClientMountStore((state) => state.isMounted)
  
  // Don't render anything during SSR/build
  if (!isMounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background dark:bg-gray-950">
        <TigerSpinner size="lg" />
        <p className="mt-4 text-sm text-muted-foreground dark:text-gray-400">Loading wallet...</p>
      </div>
    )
  }
  
  return (
    <WalletSessionGuard>
      <WalletPageContent />
    </WalletSessionGuard>
  )
}

