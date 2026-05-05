/**
 * Tiger RWA Wallet Component
 * 
 * Comprehensive wallet management component supporting:
 * - EOA and Smart Accounts
 * - Paymaster integration
 * - Balance aggregation
 * - ERC404 property tokens
 * - Transaction history
 */

'use client';

import { useState, useEffect, useMemo, useCallback, useImperativeHandle, forwardRef, startTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
// ✅ CORRECT: Use AppKit hooks instead of wagmi hooks to avoid WagmiProvider dependency
import { useAppKitAccount, useAppKit } from '@reown/appkit/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  
} from '../ui/dialog';  
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Wallet, Coins, Building2, History, X, ChevronDown, DollarSign, Send, RefreshCw, Clock, Power, RotateCcw, QrCode, Mail, KeyRound } from 'lucide-react';
import Image from 'next/image';
import { TigerSpinner } from '../common/TigerSpinner';
import { detectAccountType } from './utils/smartAccount';
import { useSmartAccount } from './hooks/useSmartAccount';
import { usePaymaster } from './hooks/usePaymaster';
import { usePimlicoPaymasterTokens } from './hooks/usePimlicoPaymasterTokens';
import { useBalanceAggregation } from './hooks/useBalanceAggregation';
import { useERC404Tokens } from './hooks/useERC404Tokens';
import { useTransactionHistory } from './hooks/useTransactionHistory';
import { useAdminWallet } from './hooks/useAdminWallet';
import type { TokenizinRWAWalletProps, TokenizinRWAWalletHandle, TokenConfig, ContractAddresses, PaymasterConfig } from './types';
import { FundWalletDialog } from './dialogs/FundWalletDialog';
import { SendDialog } from './dialogs/SendDialog';
import { SwapDialog } from './dialogs/SwapDialog';
import { ReceiveDialog } from './dialogs/ReceiveDialog';
import { MobileBottomNav } from './components/MobileBottomNav';
import { AssetValuationPage } from './pages/AssetValuationPage';
import { TierRankingPage } from './pages/TierRankingPage';
import { RewardsPage } from './pages/RewardsPage';
import { GameFinancialPage } from './pages/GameFinancialPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { NFTGallery } from './components/NFTGallery';
import { ActivityFeed } from './components/ActivityFeed';
import { MarketplaceDialog } from './dialogs/MarketplaceDialog';
// Note: These hooks should be implemented locally or removed if not needed
// import { useNFTs } from '../../hooks/wallet/useNFTs';
// import { useTokenizinWalletStore } from '../../lib/store/tokenizinWalletStore';
const useNFTs = (address?: string) => ({
  nfts: [],
  isLoading: false,
  error: null,
  refresh: () => {},
});
const storeState = {
  balances: null,
  tokens: [],
  loading: { balances: false },
  isFetchingAll: false,
  watchAddress: () => {},
  fetchBalances: () => {},
};
const useTokenizinWalletStore = (selector?: any) => {
  return selector ? selector(storeState) : storeState;
};
(useTokenizinWalletStore as any).getState = () => storeState;
import type { Address } from 'viem';

// Default token configurations - Include USDC, EURC, TKNZN from environment
const DEFAULT_TOKENS: TokenConfig[] = [
  {
    address: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    type: 'native',
  },
  {
    address: (process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238') as `0x${string}`,
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    type: 'erc20',
  },
  {
    address: (process.env.NEXT_PUBLIC_EURC_ADDRESS || '0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4') as `0x${string}`,
    symbol: 'EURC',
    name: 'Euro Coin',
    decimals: 6,
    type: 'erc20',
  },
  {
    address: (process.env.NEXT_PUBLIC_TPT_ADDRESS || process.env.NEXT_PUBLIC_TIGER_PALACE_TOKEN_CONTRACT_ADDRESS || '0xb0af8e94C74c2346609c3d94FCba61Ae85cf3e6e') as `0x${string}`,
    symbol: 'TKNZN',
    name: 'Tokenizin Token',
    decimals: 18,
    type: 'erc20',
  },
];

// Default paymaster configuration
const DEFAULT_PAYMASTER_CONFIG: PaymasterConfig = {
  address: process.env.NEXT_PUBLIC_PAYMASTER_ADDRESS as `0x${string}` || '0x0000000000000000000000000000000000000000',
  policyId: process.env.NEXT_PUBLIC_PAYMASTER_POLICY_ID,
  maxGasPerTx: process.env.NEXT_PUBLIC_PAYMASTER_MAX_GAS_PER_TX || '1000000',
  maxGasPerDay: process.env.NEXT_PUBLIC_PAYMASTER_MAX_GAS_PER_DAY || '10000000',
};

export const TokenizinRWAWallet = forwardRef<TokenizinRWAWalletHandle, TokenizinRWAWalletProps>(function TokenizinRWAWallet({
  open,
  onOpenChange,
  defaultTab = 'overview',
  showCurrencyConversion = true,
  enablePaymaster = true,
  enablePimlicoErc20Paymaster = false,
  supportedTokens = DEFAULT_TOKENS,
  contractAddresses,
  onTransactionComplete,
  onTransactionError,
}, ref) {
  // ✅ CORRECT: Use AppKit hooks instead of wagmi hooks to avoid WagmiProvider dependency
  // AppKit hooks work without WagmiProvider context, making the component more portable
  const appKitAccount = useAppKitAccount();
  const { open: openAppKit } = useAppKit();
  const { address, isConnected } = appKitAccount;
  const router = useRouter();

  /** Open AppKit ProfileWallets view to switch EOA account (social ↔ custodial). Exposed via ref.openAccountSwitch() */
  const handleOpenAccountSwitch = useCallback(() => {
    try {
      openAppKit({ view: 'ProfileWallets' });
    } catch (e) {
      console.warn('[TokenizinRWAWallet] Failed to open account switch:', e);
    }
  }, [openAppKit]);

  useImperativeHandle(ref, () => ({
    openAccountSwitch: handleOpenAccountSwitch,
  }), [handleOpenAccountSwitch]);

  // Note: walletClient is not directly available from AppKit, but hooks that need it will handle it internally
  const isLoadingWalletClient = false; // AppKit account is always available when connected
  
  const [activeTab, setActiveTab] = useState<'overview' | 'tokens' | 'properties' | 'history' | 'tier' | 'rewards' | 'gaming' | 'valuation' | 'nfts' | 'analytics' | 'activity'>(defaultTab);
  const [isInitializing, setIsInitializing] = useState(true);

  // Dialog states
  const [fundDialogOpen, setFundDialogOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [swapDialogOpen, setSwapDialogOpen] = useState(false);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [marketplaceDialogOpen, setMarketplaceDialogOpen] = useState(false);
  /** Selected ERC-20 token for Pimlico paymaster (pay gas with USDC/EURC etc.) */
  const [selectedPaymasterToken, setSelectedPaymasterToken] = useState<Address | null>(null);

  // ONE SOURCE OF TRUTH: API-based balances and tokens from tokenizin wallet store (Send fallback when wagmi aggregation empty)
  const apiBalancesFromStore = useTokenizinWalletStore((state) => state.balances);
  const storeTokensArray = useTokenizinWalletStore((state) => state.tokens);
  const storeLoadingBalances = useTokenizinWalletStore((state) => state.loading.balances);
  if (open && address) (useTokenizinWalletStore as any).getState().watchAddress(address as Address);

  // Smart Account detection
  const {
    accountType: smartAccountType,
    isSmartAccount,
    capabilities,
    isLoading: isLoadingSmartAccount,
    allAccounts,
  } = useSmartAccount();
  // Use AppKit-derived type so social/custodial shows correctly before useSmartAccount settles
  const accountType = useMemo(() => detectAccountType(appKitAccount as any) ?? smartAccountType, [appKitAccount, smartAccountType]);

  // Admin wallet capabilities
  const {
    isAdmin,
    canMint,
    canDeployFactory,
    canLazyMint,
    canUsePaymaster: adminCanUsePaymaster,
    isLoading: isLoadingAdmin,
  } = useAdminWallet();

  // Pimlico ERC-20 paymaster: fetch supported tokens when enabled
  const { tokens: pimlicoPaymasterTokens } = usePimlicoPaymasterTokens();

  // Paymaster integration - use admin wallet if available; support Pimlico ERC-20 when token selected
  const paymasterConfig = useMemo(() => {
    if (!enablePaymaster) return undefined;

    const base = { ...DEFAULT_PAYMASTER_CONFIG };

    // Pimlico ERC-20: pay gas with USDC/EURC etc. (Sepolia)
    if (enablePimlicoErc20Paymaster && selectedPaymasterToken) {
      return {
        ...base,
        type: 'pimlico_erc20' as const,
        erc20Token: selectedPaymasterToken,
        address: (process.env.NEXT_PUBLIC_PAYMASTER_ADDRESS || base.address) as `0x${string}`,
        pimlicoApiBase: typeof window !== 'undefined' ? window.location.origin : undefined,
      };
    }

    // If admin wallet is connected, use it as paymaster
    if (isAdmin && adminCanUsePaymaster && address) {
      return {
        ...base,
        address: (process.env.NEXT_PUBLIC_PAYMASTER_ADDRESS || address) as `0x${string}`,
      };
    }

    return base;
  }, [enablePaymaster, enablePimlicoErc20Paymaster, selectedPaymasterToken, isAdmin, adminCanUsePaymaster, address]);
  const {
    checkEligibility: checkPaymasterEligibility,
    prepareData: preparePaymasterData,
    isEnabled: isPaymasterEnabled,
  } = usePaymaster(paymasterConfig, contractAddresses);

  // Balance aggregation
  const {
    aggregatedBalances,
    isLoading: isLoadingBalances,
    accounts,
    refresh: refreshBalances,
  } = useBalanceAggregation(supportedTokens, contractAddresses);

  // ERC404 property tokens
  const {
    propertyTokens,
    propertyMetadata,
    isLoading: isLoadingProperties,
    refresh: refreshProperties,
  } = useERC404Tokens(contractAddresses);

  // Combined refresh function
  const handleRefresh = () => {
    refreshBalances();
    refreshProperties();
  };

  // Transaction history
  const {
    transactions,
    pendingTransactions,
    isLoading: isLoadingHistory,
    refresh: refreshHistory,
  } = useTransactionHistory({
    limit: 50,
    includePending: true,
    accountType,
  });

  // NFTs
  const {
    nfts,
    isLoading: isLoadingNFTs,
    error: nftsError,
    refresh: refreshNFTs,
  } = useNFTs(address);

  // Initialize component
  useEffect(() => {
    if (isConnected && address) {
      setIsInitializing(false);
    } else {
      setIsInitializing(true);
    }
  }, [isConnected, address]);

  // Handle tab change
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  // Loading state
  const isLoading = isInitializing || isLoadingSmartAccount || isLoadingBalances || isLoadingProperties || isLoadingHistory || isLoadingAdmin || isLoadingWalletClient;

  // If not connected, redirect to wallet page instead of showing dialog
  const pathname = usePathname();
  useEffect(() => {
    // Only navigate on client side and when component is mounted
    if (typeof window === 'undefined') return;
    
    if (!isConnected || !address) {
      if (open) {
        // Close dialog first
        onOpenChange(false);
        // Only navigate if we're not already on the wallet page
        if (pathname !== '/wallet') {
          startTransition(() => {
            router.push('/wallet');
          });
        }
      }
    }
  }, [isConnected, address, open, onOpenChange, router, pathname]);

  // Don't render anything if not connected - redirect handles it
  if (!isConnected || !address) {
    return null;
  }

  // Build Send/Swap token list from store (API balances) when wagmi aggregation is empty (e.g. social/smart wallet)
  const apiBasedSendTokens = useMemo(() => {
    const b = apiBalancesFromStore;
    if (!b) return [];
    const list: Array<{ symbol: string; balance: string; address: string }> = [];
    const eth = parseFloat((b as { eth?: string }).eth || '0');
    if (eth > 0) list.push({ symbol: 'ETH', balance: (b as { eth?: string }).eth || '0', address: '0x0000000000000000000000000000000000000000' });
    const usdc = parseFloat((b as { usdc?: string }).usdc || '0');
    if (usdc > 0) list.push({ symbol: 'USDC', balance: (b as { usdc?: string }).usdc || '0', address: supportedTokens.find(t => t.symbol === 'USDC')?.address ?? '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' });
    const eurc = parseFloat((b as { eurc?: string }).eurc || '0');
    if (eurc > 0) list.push({ symbol: 'EURC', balance: (b as { eurc?: string }).eurc || '0', address: supportedTokens.find(t => t.symbol === 'EURC')?.address ?? '0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4' });
    const tptStr = (b as { tpt?: string; tknzn?: string }).tpt ?? (b as { tknzn?: string }).tknzn ?? '0';
    const tpt = parseFloat(tptStr);
    if (tpt > 0) list.push({ symbol: 'TKNZN', balance: tptStr, address: supportedTokens.find(t => t.symbol === 'TKNZN')?.address ?? '0x064682F1555d3baD3Dab5eDD0DEe45372F23a570' });
    return list;
  }, [apiBalancesFromStore, supportedTokens]);

  // Fallback: build send list from store tokens array (same API response, different shape) so Send dialog has list when store has data
  const sendTokensFromStoreArray = useMemo(() => {
    if (!storeTokensArray?.length) return [];
    return storeTokensArray
      .filter((t) => parseFloat(t.balanceFormatted || t.balance || '0') > 0)
      .map((t) => ({
        symbol: t.symbol,
        balance: t.balanceFormatted || t.balance || '0',
        address: t.tokenAddress,
      }));
  }, [storeTokensArray]);

  const aggregatedSendTokens = useMemo(
    () =>
      aggregatedBalances?.accounts.flatMap((acc) =>
        acc.balances.map((b) => ({
          symbol: b.token.symbol,
          balance: b.balanceFormatted,
          address: b.token.address,
        }))
      ) ?? [],
    [aggregatedBalances]
  );

  // Prefer API-based list when it has items (reliable for social/smart wallet); then store tokens array; then wagmi aggregation
  const availableTokensForSend =
    apiBasedSendTokens.length > 0
      ? apiBasedSendTokens
      : sendTokensFromStoreArray.length > 0
        ? sendTokensFromStoreArray
        : aggregatedSendTokens;
  const isSendTokensLoading =
    availableTokensForSend.length === 0 && storeLoadingBalances;

  // User-triggered: when Send dialog opens with address and no tokens yet, trigger store fetch so list can populate
  useEffect(() => {
    if (!sendDialogOpen || !address) return;
    const store = (useTokenizinWalletStore as any).getState();
    if (availableTokensForSend.length === 0 && !store.loading.balances && !store.isFetchingAll) {
      store.fetchBalances(address as Address);
    }
  }, [sendDialogOpen, address, availableTokensForSend.length]);

  // Format address for display
  const formattedAddress = address ? `${address.slice(0, 4)}...${address.slice(-6)}` : '';
  
  // Get primary balance (ETH)
  const primaryBalance = aggregatedBalances?.totalETH || '0.000';
  const displayBalance = parseFloat(primaryBalance).toFixed(3);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-gradient-to-b from-[#1C3A36] to-[#0F2A26] dark:from-[#1C3A36] dark:to-[#0F2A26] border-2 border-blue-600/30 dark:border-blue-400/30 rounded-2xl max-w-[420px] w-[calc(100%-32px)] shadow-[0_20px_40px_-12px_rgba(59,130,246,0.25)] overflow-hidden flex flex-col p-0 backdrop-blur-sm z-[9999]">
        {/* Visually hidden DialogTitle and Description for accessibility */}
        <DialogHeader className="sr-only">
          <DialogTitle>Wallet</DialogTitle>
          <DialogDescription>Manage your wallet, view balances, property tokens, and transaction history</DialogDescription>
        </DialogHeader>
        
        {/* Wallet Dialog - Header */}
        <div className="relative p-6 pb-8">
          {/* Top Bar - Network & Close */}
          <div className="flex items-center justify-between mb-6">
            {/* Network Selector */}
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity group">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center ring-2 ring-blue-500/30 group-hover:ring-blue-400/50 transition-all">
                <div className="w-3 h-3 rounded-full bg-white shadow-sm"></div>
              </div>
              <span className="text-xs font-medium text-[#F8F5F0] dark:text-[#F8F5F0]">Sepolia</span>
              <ChevronDown className="w-4 h-4 text-[#B8A898] dark:text-[#B8A898]" />
            </div>
            
            {/* Close Button */}
            <button
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 rounded-full hover:bg-blue-500/20 dark:hover:bg-blue-500/20 flex items-center justify-center transition-colors"
              aria-label="Close wallet"
            >
              <X className="w-5 h-5 text-[#F8F5F0] dark:text-[#F8F5F0]" />
            </button>
          </div>

          {/* Center Avatar - Wallet Icon */}
          <div className="flex flex-col items-center mb-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/30 to-blue-600/40 dark:from-blue-500/30 dark:to-blue-600/40 border-2 border-blue-500/50 dark:border-blue-400/50 flex items-center justify-center mb-3 shadow-lg ring-4 ring-blue-500/20">
              <Wallet className="w-10 h-10 text-blue-400 dark:text-blue-400" />
            </div>

            {/* Wallet Address + Account type indicator + EOA account switch */}
            <button
              type="button"
              onClick={handleOpenAccountSwitch}
              className="flex items-center justify-center gap-2 mb-4 cursor-pointer hover:opacity-90 transition-opacity rounded-lg px-2 py-1.5 hover:bg-blue-500/10 dark:hover:bg-blue-500/10 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              aria-label={accountType === 'social' ? 'Social account – Switch account' : accountType === 'smart' ? 'Smart account – Switch account' : 'EOA account – Switch account'}
              title="Switch account"
            >
              {/* Account type indicator: social = envelope, eoa = key, smart = wallet (optional) */}
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/20 dark:bg-blue-500/20" aria-hidden>
                {accountType === 'social' ? (
                  <Mail className="w-3.5 h-3.5 text-blue-400 dark:text-blue-400" />
                ) : accountType === 'smart' ? (
                  <Wallet className="w-3.5 h-3.5 text-blue-400 dark:text-blue-400" />
                ) : (
                  <KeyRound className="w-3.5 h-3.5 text-blue-400 dark:text-blue-400" />
                )}
              </span>
              <span className="text-sm font-medium text-[#F8F5F0] dark:text-[#F8F5F0] font-mono">
                {formattedAddress}
              </span>
              <ChevronDown className="w-4 h-4 text-[#B8A898] dark:text-[#B8A898]" />
            </button>
            <p className="text-xs text-[#B8A898] dark:text-[#B8A898] -mt-2 mb-1">
              {accountType === 'social' ? 'Social account' : accountType === 'smart' ? 'Smart account' : 'EOA account'}
              {' · '}
              <span className="underline decoration-dotted">Switch account</span>
            </p>

            {/* Balance Display */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="text-3xl font-light text-[#F8F5F0] dark:text-[#F8F5F0]">
                  {isLoadingBalances ? (
                    <div className="flex items-center justify-center gap-2">
                      <TigerSpinner size="sm" />
                    </div>
                  ) : (
                    `${displayBalance} ETH`
                  )}
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={isLoadingBalances || isLoadingProperties}
                  className="p-1.5 rounded-lg hover:bg-blue-500/10 dark:hover:bg-blue-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Refresh balances"
                >
                  <RotateCcw className={`w-4 h-4 text-[#B8A898] dark:text-[#B8A898] ${isLoadingBalances || isLoadingProperties ? 'animate-spin' : ''}`} />
                </button>
              </div>
              {aggregatedBalances && (
                <div className="text-xs text-[#B8A898] dark:text-[#B8A898]">
                  ${parseFloat(String(aggregatedBalances.totalUSDValue || '0')).toFixed(2)} USD
                </div>
              )}
              {/* Pimlico ERC-20: Pay gas with token (Sepolia) */}
              {enablePimlicoErc20Paymaster && pimlicoPaymasterTokens.length > 0 && (
                <div className="mt-3 pt-3 border-t border-blue-500/20">
                  <label className="text-xs text-[#B8A898] dark:text-[#B8A898] block mb-1">Pay gas with</label>
                  <select
                    value={selectedPaymasterToken ?? ''}
                    onChange={(e) => setSelectedPaymasterToken(e.target.value ? (e.target.value as Address) : null)}
                    className="w-full max-w-[180px] mx-auto text-xs bg-[#0F2A26]/80 dark:bg-[#0F2A26]/80 text-[#F8F5F0] dark:text-[#F8F5F0] border border-blue-500/30 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  >
                    <option value="">ETH (default)</option>
                    {pimlicoPaymasterTokens.map((t) => (
                      <option key={t.token} value={t.token}>
                        {t.symbol}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Menu - Responsive Grid Layout */}
        <div className="px-4 md:px-6 pb-4 md:pb-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <TigerSpinner size="lg" />
              <p className="text-sm text-[#B8A898] dark:text-[#B8A898] mt-4">
                Loading wallet...
              </p>
            </div>
          ) : (
            <>
              {/* Quick Actions - Compact Horizontal Layout */}
              <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mb-3">
                {/* Fund Wallet - Compact horizontal button */}
                <button
                  onClick={() => setFundDialogOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-lg hover:bg-blue-500/10 dark:hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 transition-all group flex-1 min-w-[70px] max-w-[100px]"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/30 to-blue-600/40 dark:from-blue-500/30 dark:to-blue-600/40 flex items-center justify-center group-hover:from-blue-500/40 group-hover:to-blue-600/50 transition-all ring-1 ring-blue-500/20 group-hover:ring-blue-500/40 flex-shrink-0">
                    <DollarSign className="w-4 h-4 text-blue-400 dark:text-blue-400" />
                  </div>
                  <span className="text-xs text-[#F8F5F0] dark:text-[#F8F5F0] font-medium whitespace-nowrap">Fund</span>
                </button>

                {/* Receive - Compact horizontal button */}
                <button
                  onClick={() => setReceiveDialogOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-lg hover:bg-blue-500/10 dark:hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 transition-all group flex-1 min-w-[70px] max-w-[100px]"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/30 to-blue-600/40 dark:from-blue-500/30 dark:to-blue-600/40 flex items-center justify-center group-hover:from-blue-500/40 group-hover:to-blue-600/50 transition-all ring-1 ring-blue-500/20 group-hover:ring-blue-500/40 flex-shrink-0">
                    <QrCode className="w-4 h-4 text-blue-400 dark:text-blue-400" />
                  </div>
                  <span className="text-xs text-[#F8F5F0] dark:text-[#F8F5F0] font-medium whitespace-nowrap">Receive</span>
                </button>

                {/* Send - Compact horizontal button */}
                <button
                  onClick={() => setSendDialogOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-lg hover:bg-blue-500/10 dark:hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 transition-all group flex-1 min-w-[70px] max-w-[100px]"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/30 to-blue-600/40 dark:from-blue-500/30 dark:to-blue-600/40 flex items-center justify-center group-hover:from-blue-500/40 group-hover:to-blue-600/50 transition-all ring-1 ring-blue-500/20 group-hover:ring-blue-500/40 flex-shrink-0">
                    <Send className="w-4 h-4 text-blue-400 dark:text-blue-400" />
                  </div>
                  <span className="text-xs text-[#F8F5F0] dark:text-[#F8F5F0] font-medium whitespace-nowrap">Send</span>
                </button>

                {/* Swap - Compact horizontal button */}
                <button
                  onClick={() => setSwapDialogOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-lg hover:bg-blue-500/10 dark:hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 transition-all group flex-1 min-w-[70px] max-w-[100px]"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/30 to-blue-600/40 dark:from-blue-500/30 dark:to-blue-600/40 flex items-center justify-center group-hover:from-blue-500/40 group-hover:to-blue-600/50 transition-all ring-1 ring-blue-500/20 group-hover:ring-blue-500/40 flex-shrink-0">
                    <RefreshCw className="w-4 h-4 text-blue-400 dark:text-blue-400" />
                  </div>
                  <span className="text-xs text-[#F8F5F0] dark:text-[#F8F5F0] font-medium whitespace-nowrap">Swap</span>
                </button>
              </div>

              {/* Secondary Actions - Compact Horizontal Layout */}
              <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
                {/* Activity - Compact horizontal button */}
                <button
                  onClick={() => setActiveTab('history')}
                  className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-lg hover:bg-blue-500/10 dark:hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 transition-all group flex-1 min-w-[100px] max-w-[140px]"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/30 to-blue-600/40 dark:from-blue-500/30 dark:to-blue-600/40 flex items-center justify-center group-hover:from-blue-500/40 group-hover:to-blue-600/50 transition-all ring-1 ring-blue-500/20 group-hover:ring-blue-500/40 flex-shrink-0">
                    <Clock className="w-4 h-4 text-blue-400 dark:text-blue-400" />
                  </div>
                  <span className="text-xs text-[#F8F5F0] dark:text-[#F8F5F0] font-medium whitespace-nowrap">Activity</span>
                </button>

                {/* Disconnect - Compact horizontal button */}
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('wallet-disconnect'));
                    onOpenChange(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-lg hover:bg-red-500/10 dark:hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all group flex-1 min-w-[100px] max-w-[140px]"
                >
                  <div className="w-8 h-8 rounded-full bg-red-500/20 dark:bg-red-500/20 flex items-center justify-center group-hover:bg-red-500/30 dark:group-hover:bg-red-500/30 transition-colors ring-1 ring-red-500/20 group-hover:ring-red-500/40 flex-shrink-0">
                    <Power className="w-4 h-4 text-red-400 dark:text-red-400" />
                  </div>
                  <span className="text-xs text-red-400 dark:text-red-400 font-medium whitespace-nowrap">Disconnect</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Content Area - Show pages based on active tab */}
        <div className={`px-4 md:px-6 pb-20 md:pb-6 overflow-y-auto max-h-[60vh] md:max-h-[500px] ${activeTab === 'overview' ? 'hidden' : ''}`}>
          {/* Asset Valuation Page */}
          {activeTab === 'valuation' && <AssetValuationPage />}

          {/* Tier Ranking Page */}
          {activeTab === 'tier' && <TierRankingPage />}

          {/* Rewards Page */}
          {activeTab === 'rewards' && <RewardsPage />}

          {/* Game Financial Page */}
          {activeTab === 'gaming' && <GameFinancialPage />}

          {/* NFT Gallery Page */}
          {activeTab === 'nfts' && (
            <NFTGallery
              nfts={nfts}
              isLoading={isLoadingNFTs}
              error={nftsError}
              onRefresh={refreshNFTs}
            />
          )}

          {/* Analytics Page */}
          {activeTab === 'analytics' && <AnalyticsPage />}

          {/* Activity Feed Page */}
          {activeTab === 'activity' && <ActivityFeed address={address} />}
          
          {/* Standard Tabs for Tokens, Properties, History */}
          {(activeTab === 'tokens' || activeTab === 'properties' || activeTab === 'history') && (
            <Tabs 
              value={activeTab} 
              onValueChange={(value) => {
                setActiveTab(value as 'tokens' | 'properties' | 'history');
              }} 
              className="flex-1 flex flex-col overflow-hidden"
            >
              <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-[rgba(10,58,42,0.6)] to-[rgba(15,42,38,0.6)] dark:from-[rgba(10,58,42,0.6)] dark:to-[rgba(15,42,38,0.6)] border-2 border-blue-600/30 dark:border-blue-400/30 rounded-xl p-1 mb-4 shadow-lg">
                <TabsTrigger 
                  value="tokens" 
                  className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500/30 data-[state=active]:to-blue-600/40 data-[state=active]:text-[#F8F5F0] data-[state=active]:ring-2 data-[state=active]:ring-blue-500/50 text-[#B8A898] rounded-lg text-xs font-medium transition-all"
                >
                  <Coins className="h-3.5 w-3.5 mr-1.5" />
                  Tokens
                </TabsTrigger>
                <TabsTrigger 
                  value="properties" 
                  className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500/30 data-[state=active]:to-blue-600/40 data-[state=active]:text-[#F8F5F0] data-[state=active]:ring-2 data-[state=active]:ring-blue-500/50 text-[#B8A898] rounded-lg text-xs font-medium transition-all"
                >
                  <Building2 className="h-3.5 w-3.5 mr-1.5" />
                  Properties
                </TabsTrigger>
                <TabsTrigger 
                  value="history" 
                  className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500/30 data-[state=active]:to-blue-600/40 data-[state=active]:text-[#F8F5F0] data-[state=active]:ring-2 data-[state=active]:ring-blue-500/50 text-[#B8A898] rounded-lg text-xs font-medium transition-all"
                >
                  <History className="h-3.5 w-3.5 mr-1.5" />
                  History
                </TabsTrigger>
              </TabsList>

            <div className="flex-1 overflow-y-auto max-h-[400px]">
                <TabsContent value="tokens" className="space-y-4 mt-0">
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-[#F8F5F0] dark:text-[#F8F5F0] mb-2">
                        Token Balances
                      </div>
                      {isLoadingBalances ? (
                        <div className="flex items-center justify-center py-12">
                          <TigerSpinner size="lg" />
                        </div>
                      ) : aggregatedBalances && aggregatedBalances.accounts.length > 0 ? (
                        <div className="space-y-2">
                          {/* Group balances by token */}
                          {(() => {
                            const tokenMap = new Map<string, {
                              token: typeof aggregatedBalances.accounts[0]['balances'][0]['token'];
                              balances: typeof aggregatedBalances.accounts[0]['balances'];
                              totalBalance: string;
                              totalFormatted: string;
                            }>();

                            aggregatedBalances.accounts.forEach((account) => {
                              if (account.balances && account.balances.length > 0) {
                                account.balances.forEach((balance) => {
                                  const key = balance.token.address.toLowerCase();
                                  const existing = tokenMap.get(key);
                                  
                                  if (existing) {
                                    existing.balances.push(balance);
                                    const currentTotal = BigInt(existing.totalBalance);
                                    const newBalance = BigInt(balance.balance);
                                    existing.totalBalance = (currentTotal + newBalance).toString();
                                    existing.totalFormatted = parseFloat(balance.balanceFormatted) + parseFloat(existing.totalFormatted) > 0 
                                      ? (parseFloat(balance.balanceFormatted) + parseFloat(existing.totalFormatted)).toFixed(balance.token.decimals)
                                      : existing.totalFormatted;
                                  } else {
                                    tokenMap.set(key, {
                                      token: balance.token,
                                      balances: [balance],
                                      totalBalance: balance.balance,
                                      totalFormatted: balance.balanceFormatted,
                                    });
                                  }
                                });
                              }
                            });

                            const tokens = Array.from(tokenMap.values());

                            return tokens.length === 0 ? (
                              <div className="text-center py-8 text-[#B8A898] dark:text-[#B8A898] text-sm">
                                <Coins className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>No token balances found</p>
                                <p className="text-xs mt-1 opacity-75">Your wallet is empty</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {tokens.map((tokenData) => (
                                  <div
                                    key={tokenData.token.address}
                                    className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-[rgba(28,58,54,0.9)] to-[rgba(15,42,38,0.9)] dark:from-[rgba(28,58,54,0.9)] dark:to-[rgba(15,42,38,0.9)] border-2 border-blue-600/30 dark:border-blue-400/30 hover:border-blue-500/50 hover:bg-gradient-to-r hover:from-[rgba(59,130,246,0.15)] hover:to-[rgba(37,99,235,0.15)] dark:hover:from-[rgba(59,130,246,0.15)] dark:hover:to-[rgba(37,99,235,0.15)] transition-all shadow-md hover:shadow-lg"
                                  >
                                    <div className="flex items-center gap-3 flex-1">
                                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/30 to-blue-600/40 dark:from-blue-500/30 dark:to-blue-600/40 flex items-center justify-center border-2 border-blue-500/50 dark:border-blue-400/50 ring-1 ring-blue-500/20">
                                        <Coins className="h-4 w-4 text-blue-400 dark:text-blue-400" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium text-[#F8F5F0] dark:text-[#F8F5F0] text-sm truncate">
                                          {tokenData.token.symbol}
                                        </div>
                                        <div className="text-xs text-[#B8A898] dark:text-[#B8A898] truncate">
                                          {tokenData.token.name}
                                          {tokenData.balances.length > 1 && (
                                            <span className="ml-1">• {tokenData.balances.length} accounts</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-semibold text-[#F8F5F0] dark:text-[#F8F5F0] text-sm">
                                        {parseFloat(tokenData.totalFormatted).toFixed(tokenData.token.decimals > 6 ? 6 : tokenData.token.decimals)}
                                      </div>
                                      <div className="text-xs text-[#B8A898] dark:text-[#B8A898]">
                                        {tokenData.token.type === 'native' ? 'Native' : 'ERC20'}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-[#B8A898] dark:text-[#B8A898] text-sm">
                          <Coins className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No balance data available</p>
                          <p className="text-xs mt-1 opacity-75">Unable to fetch wallet balances</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="properties" className="space-y-4 mt-0">
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-[#F8F5F0] dark:text-[#F8F5F0] mb-2">
                        Property Tokens ({propertyTokens.length})
                      </div>
                      {isLoadingProperties ? (
                        <div className="flex items-center justify-center py-12">
                          <TigerSpinner size="lg" />
                        </div>
                      ) : propertyTokens.length === 0 ? (
                        <div className="text-center py-8 text-[#B8A898] dark:text-[#B8A898] text-sm">
                          <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No property tokens found</p>
                          <p className="text-xs mt-1 opacity-75">You don&apos;t own any property tokens yet</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {propertyTokens.map((token) => (
                            <div
                              key={token.assetId}
                              className="p-3 rounded-xl bg-gradient-to-r from-[rgba(28,58,54,0.9)] to-[rgba(15,42,38,0.9)] dark:from-[rgba(28,58,54,0.9)] dark:to-[rgba(15,42,38,0.9)] border-2 border-blue-600/30 dark:border-blue-400/30 hover:border-blue-500/50 hover:bg-gradient-to-r hover:from-[rgba(59,130,246,0.15)] hover:to-[rgba(37,99,235,0.15)] dark:hover:from-[rgba(59,130,246,0.15)] dark:hover:to-[rgba(37,99,235,0.15)] transition-all shadow-md hover:shadow-lg"
                            >
                              <div className="flex items-start gap-3">
                                {token.imageUrl && (
                                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-blue-500/50 dark:border-blue-400/50 ring-1 ring-blue-500/20 flex-shrink-0 shadow-md bg-muted dark:bg-gray-900 flex items-center justify-center">
                                    <Image
                                      src={token.imageUrl}
                                      alt={token.title || `Property ${token.assetId}`}
                                      width={48}
                                      height={48}
                                      className="w-full h-full object-cover"
                                      unoptimized
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const fallback = target.nextElementSibling as HTMLElement;
                                        if (fallback) fallback.style.display = 'flex';
                                      }}
                                    />
                                    <div
                                      className="w-full h-full flex items-center justify-center text-xs font-semibold text-foreground dark:text-white"
                                      style={{ display: token.imageUrl ? 'none' : 'flex' }}
                                    >
                                      {(token.symbol || 'PROP').slice(0, 2).toUpperCase()}
                                    </div>
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-[#F8F5F0] dark:text-[#F8F5F0] text-sm truncate">
                                    {token.title || `Property #${token.assetId}`}
                                  </h3>
                                  <div className="text-xs text-[#B8A898] dark:text-[#B8A898] mt-1">
                                    {parseFloat(token.balanceFormatted).toFixed(4)} {token.symbol || 'TOKENS'}
                                  </div>
                                  {token.tokenPrice && (
                                    <div className="text-xs text-[#B8A898] dark:text-[#B8A898] mt-0.5">
                                      {parseFloat(token.tokenPrice).toFixed(2)} per token
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="history" className="space-y-4 mt-0">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium text-[#F8F5F0] dark:text-[#F8F5F0]">
                          Transactions ({transactions.length})
                        </div>
                        {pendingTransactions.length > 0 && (
                          <span className="text-xs font-medium text-blue-400 dark:text-blue-400">
                            {pendingTransactions.length} pending
                          </span>
                        )}
                      </div>
                      {isLoadingHistory ? (
                        <div className="flex items-center justify-center py-12">
                          <TigerSpinner size="lg" />
                        </div>
                      ) : transactions.length === 0 ? (
                        <div className="text-center py-8 text-[#B8A898] dark:text-[#B8A898] text-sm">
                          <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No transactions found</p>
                          <p className="text-xs mt-1 opacity-75">Your transaction history will appear here</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {transactions.map((tx) => (
                            <div
                              key={tx.id}
                              className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-[rgba(28,58,54,0.9)] to-[rgba(15,42,38,0.9)] dark:from-[rgba(28,58,54,0.9)] dark:to-[rgba(15,42,38,0.9)] border-2 border-blue-600/30 dark:border-blue-400/30 hover:border-blue-500/50 hover:bg-gradient-to-r hover:from-[rgba(59,130,246,0.15)] hover:to-[rgba(37,99,235,0.15)] dark:hover:from-[rgba(59,130,246,0.15)] dark:hover:to-[rgba(37,99,235,0.15)] transition-all shadow-md hover:shadow-lg"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium text-[#F8F5F0] dark:text-[#F8F5F0] truncate">
                                    {tx.functionName || 'Transfer'}
                                  </span>
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded ${
                                      tx.status === 'confirmed'
                                        ? 'bg-green-500/20 text-green-400'
                                        : tx.status === 'pending'
                                        ? 'bg-yellow-500/20 text-yellow-400'
                                        : tx.status === 'failed'
                                        ? 'bg-red-500/20 text-red-400'
                                        : 'bg-[rgba(184,168,152,0.2)] text-[#B8A898]'
                                    }`}
                                  >
                                    {tx.status}
                                  </span>
                                  {tx.isSponsored && (
                                    <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                                      Sponsored
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-[#B8A898] dark:text-[#B8A898] mt-1 truncate">
                                  {tx.timestamp.toLocaleString()} • {tx.hash.slice(0, 8)}...{tx.hash.slice(-6)}
                                </div>
                              </div>
                              <div className="text-right ml-2 flex-shrink-0">
                                <div className="text-sm font-medium text-[#F8F5F0] dark:text-[#F8F5F0]">
                                  {tx.value ? `${parseFloat(tx.value).toFixed(4)} ETH` : '-'}
                                </div>
                                {tx.tokenSymbol && (
                                  <div className="text-xs text-[#B8A898] dark:text-[#B8A898]">
                                    {tx.tokenSymbol}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
          )}
        </div>

        {/* Mobile Bottom Navigation - Only visible on mobile */}
        <MobileBottomNav
          activePage={activeTab}
          onPageChange={(page) => {
            if (page === 'overview') {
              setActiveTab('overview');
            } else if (page === 'tier') {
              setActiveTab('tier');
            } else if (page === 'rewards') {
              setActiveTab('rewards');
            } else if (page === 'gaming') {
              setActiveTab('gaming');
            } else if (page === 'tokens' || page === 'properties' || page === 'history') {
              setActiveTab(page);
            } else if (page === 'valuation') {
              setActiveTab('valuation');
            } else if (page === 'nfts') {
              setActiveTab('nfts');
            } else if (page === 'analytics') {
              setActiveTab('analytics');
            } else if (page === 'activity') {
              setActiveTab('activity');
            }
          }}
        />

        {/* Dialogs */}
        <FundWalletDialog
          open={fundDialogOpen}
          onOpenChange={setFundDialogOpen}
          address={address}
        />
        <ReceiveDialog
          open={receiveDialogOpen}
          onOpenChange={setReceiveDialogOpen}
          address={address}
          network="Sepolia Testnet"
        />
        <SendDialog
          open={sendDialogOpen}
          onOpenChange={setSendDialogOpen}
          availableTokens={availableTokensForSend}
          isLoadingTokens={isSendTokensLoading}
        />
        <SwapDialog
          open={swapDialogOpen}
          onOpenChange={setSwapDialogOpen}
          availableTokens={availableTokensForSend}
          isLoadingTokens={isSendTokensLoading}
        />
        <MarketplaceDialog
          open={marketplaceDialogOpen}
          onOpenChange={setMarketplaceDialogOpen}
          userAddress={address}
        />
        </DialogContent>
      </Dialog>
    );
  });
