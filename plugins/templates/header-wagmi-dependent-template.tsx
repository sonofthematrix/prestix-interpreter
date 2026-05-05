// Auto-generated HeaderWagmiDependent template based on current patterns
// Last synced: 2026-03-01T09:29:34.596Z
// This template can be used to generate/regenerate the HeaderWagmiDependent component
//
// NOTE: This component displays wallet information and token balances in the header.
// It integrates with Zustand store (useTigerWalletStore) for wallet data management.
// Path aliases (@/) will resolve correctly when this template is used
// in the actual component location (src/components/navigation/)
// TypeScript errors here are expected and can be ignored - they won't affect
// the generated component.

// @ts-nocheck - Template file: imports resolve when used in component location

'use client';

import { useAppKit, useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react';
import { networks } from '../../../packages/reown-appkit-module/src/config';
import { useWagmiProviderReady } from '@/context/WagmiProviderReadyContext';
import { WagmiProviderGuard } from '@/components/blockchain/WagmiProviderGuard';
import { TokenizinWalletButton } from './TokenizinWalletButton';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Wallet, Coins, Shield, User, Crown, QrCode, ChevronRight, ExternalLink, Fullscreen, Network, ChevronDown, Check, Copy } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
// import { useTokenizinWalletData } from '@/hooks/wallet/useTokenizinWalletData';
import { TigerSpinner } from '@/components/common/TigerSpinner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCurrencyPreference, Currency } from '@/lib/hooks/useCurrencyPreference';
import { formatCurrency } from '@/lib/services/currency-conversion-service';
import { Address, formatUnits } from 'viem';
// ✅ REMOVED: useReadContract - was causing infinite loops when called inside callbacks
import { useTokenizinWalletData } from '@/hooks/wallet/useTokenizinWalletData';
import { fetchTokenizinWalletData } from '@/lib/services/tokenizin-wallet-service';
import { useAccount, useSwitchChain } from 'wagmi';
import { useTokenizinWalletStore } from '@/lib/store/tokenizinWalletStore';
import { Building2, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { QRCodeSVG } from 'qrcode.react';
import Image from 'next/image';
import { useReadContract } from 'wagmi';
import { useContractStore } from '@/lib/store/contractStore';

/**
 * Custom Receive Dialog - Matches AppKit design
 * Shows QR code, wallet address, and network information
 */
function ReceiveDialog({
  open,
  onOpenChange,
  address
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address?: string;
}) {
  const [copied, setCopied] = useState(false);
  const { chainId } = useAppKitNetwork();
  const { networks } = require('../../../packages/reown-appkit-module/src/config');

  // Get current network
  const currentNetwork = networks?.find((network: any) => network.id === chainId) || networks?.[0];
  const networkName = currentNetwork?.name || (chainId === 1 ? 'Ethereum' : 'Sepolia');
  const isTestnet = chainId !== 1;

  const handleCopyAddress = async () => {
    if (!address) return;

    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  };

  if (!address) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 dark:bg-gray-800 border-gray-700 dark:border-gray-700 max-w-sm p-0 gap-0">
        {/* Title & Description for Accessibility */}
        <div className="text-center pt-6 pb-4">
          <DialogTitle className="text-xl font-serif text-gray-200 dark:text-gray-200">
            Receive
          </DialogTitle>
          <DialogDescription className="sr-only">
            Scan QR code or copy your wallet address to receive funds.
          </DialogDescription>
        </div>

        {/* QR Code */}
        <div className="px-6 pb-4 flex justify-center">
          <div className="bg-white p-4 rounded-lg border-2 border-white">
            <QRCodeSVG
              value={address}
              size={240}
              level="M"
              includeMargin={false}
              bgColor="#FFFFFF"
              fgColor="#000000"
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="px-6 pb-4 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-400">
            Copy your address or scan this QR code
          </p>
        </div>

        {/* Copy Address Button */}
        <div className="px-6 pb-6">
          <Button
            onClick={handleCopyAddress}
            className="w-full bg-gray-800 dark:bg-gray-800 border border-gray-600 dark:border-gray-600 text-white hover:bg-gray-700 dark:hover:bg-gray-700"
            variant="outline"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy address
              </>
            )}
          </Button>
        </div>

        {/* Network Information */}
        <div className="bg-gray-800 dark:bg-gray-800 border-t border-gray-700 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <span className="text-sm text-gray-400 dark:text-gray-400">
            Only receive assets on these networks
          </span>
          <div className="flex items-center gap-2">
            <div className="relative h-6 w-6 flex-shrink-0">
              <Image
                src={chainId === 1 ? '/images/icons/eth-main.png' : '/images/icons/eth-test.png'}
                alt={networkName}
                fill
                className="object-contain"
                sizes="24px"
              />
            </div>
            <Switch checked={true} disabled className="data-[state=checked]:bg-purple-500" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Receive Funds Button - Opens custom Receive dialog with QR code
 * Simple icon button that can be placed in header
 */
export function ReceiveFundsButton() {
  const wagmiReady = useWagmiProviderReady();
  const { isConnected: wagmiConnected } = useAccount();
  const { address: appKitAddress, isConnected: appKitConnected } = useAppKitAccount();
  const pathname = usePathname();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Avoid loading wallet artifacts on auth pages
  if (pathname?.startsWith('/auth')) {
    return null;
  }

  // Consider either AppKit (address present) or wagmi connection as sufficient
  const isWalletConnected = Boolean(appKitConnected || appKitAddress || wagmiConnected);
  const walletAddress = appKitAddress || undefined;

  // Only show when connected
  if (!wagmiReady || !isWalletConnected || !walletAddress) {
    return null;
  }

  const handleReceiveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDialogOpen(true);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
        onClick={handleReceiveClick}
        aria-label="Receive Funds - Show QR code"
        title="Receive Funds - Show QR code"
      >
        <QrCode className="h-4 w-4" />
      </Button>
      <ReceiveDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        address={walletAddress}
      />
    </>
  );
}




// Mock token balance types for demonstration
interface TokenBalance {
  symbol: string;
  balance: string;
  balanceFormatted: string;
  usdValue: string;
  loading: boolean;
  error?: string;
  tokenAddress?: string; // ERC20 token contract address
  decimals?: number; // Token decimals
}

// Mock RWA contract info type for demonstration
interface RWAContractInfo {
  tokenAddress: string;
  symbol: string;
  name: string;
  balance: string;
  isOwner: boolean;
  isHolder: boolean;
  loading: boolean;
  error?: string;
  usdValue?: string; // USD value of tokens held
  tokenPrice?: number; // Price per token from contract/database
  assetId?: string; // RealEstateAsset ID for navigation
  propertyId?: string; // Blockchain property ID
  imageUrl?: string; // Property image
}

// Mock useAsyncTokenBalances hook for demonstration
function useAsyncTokenBalances(walletAddress?: Address) {
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [rwaContracts, setRwaContracts] = useState<RWAContractInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ CORRECT: Use Zustand store for wallet data (single source of truth)
  const walletStore = useTokenizinWalletStore();
  const { balances: storeBalances, tokens: storeTokens, loading: storeLoading, fetchAllData } = walletStore;

  // Get contract addresses for token addresses
  const { addresses: contractAddresses } = useContractStore();

  // Load standard tokens (ETH, USDC, EURC, TKNZN) from Zustand store
  const loadStandardTokens = useCallback(async (address: Address) => {
    try {
      // Ensure store has data for this address - fetch if needed
      if (!storeBalances || walletStore.currentAddress?.toLowerCase() !== address.toLowerCase()) {
        await fetchAllData(address);
      }

      // Use store balances (already properly formatted)
      const standardTokens = [
        { symbol: 'ETH', address: '', decimals: 18 },
        { symbol: 'USDC', address: contractAddresses?.usdc || '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', decimals: 6 },
        { symbol: 'EURC', address: contractAddresses?.eurc || '0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4', decimals: 6 },
        { symbol: 'TKNZN', address: contractAddresses?.tknzn || '', decimals: 18 },
      ];

      // ⚠️ CRITICAL: Update balances array properly - handle case where array might be empty
      const updatedBalances: TokenBalance[] = standardTokens.map((tokenConfig) => {
        const symbol = tokenConfig.symbol;
        let balanceValue = '0';
        let usdValue = '0.00';

        // Get balance from store
        if (storeBalances) {
          if (symbol === 'ETH') {
            balanceValue = storeBalances.eth || '0';
            usdValue = (parseFloat(storeBalances.eth || '0') * 3000).toFixed(2);
          } else if (symbol === 'USDC') {
            balanceValue = storeBalances.usdc || '0';
            // USDC is 1:1 with USD, so balance = USD value
            usdValue = storeBalances.usdc || '0.00';
          } else if (symbol === 'EURC') {
            balanceValue = storeBalances.eurc || '0';
            // EURC to USD conversion (approximately 1.1)
            usdValue = (parseFloat(storeBalances.eurc || '0') * 1.1).toFixed(2);
          } else if (symbol === 'TKNZN') {
            // ⚠️ CRITICAL: Store uses 'tknzn', not 'tpt'
            balanceValue = storeBalances.tknzn || '0';
            // TKNZN is 1:1 with USD (default rate)
            usdValue = storeBalances.tknzn || '0.00';
          }
        }

        // Also check store tokens for USD value if available
        const storeToken = storeTokens.find(t => t.symbol === symbol);
        if (storeToken && storeToken.usdValue) {
          usdValue = parseFloat(storeToken.usdValue).toFixed(2);
        }

        return {
          symbol,
          balance: '0', // Raw balance not needed for display
          balanceFormatted: balanceValue, // Already formatted from store
          usdValue,
          loading: storeLoading.balances,
          tokenAddress: tokenConfig.address || undefined, // Include token address for allowance fetching
          decimals: tokenConfig.decimals, // Include decimals for allowance formatting
        };
      });

      // Update balances array atomically
      setBalances(updatedBalances);
    } catch (err) {
      console.error('Failed to load standard tokens from store:', err);
      // Set error state for all tokens
      ['ETH', 'USDC', 'EURC', 'TKNZN'].forEach((symbol) => {
        setBalances(prev => prev.map(b =>
          b.symbol === symbol ? {
            ...b,
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to load balance',
          } : b
        ));
      });
    }
  }, [storeBalances, storeTokens, storeLoading.balances, fetchAllData, walletStore.currentAddress, contractAddresses]);

  // Load RWA token contracts and check ownership
  const loadRWAContracts = useCallback(async (address: Address) => {
    try {
      // Fetch tokens from API (includes RWA404Tokens)
      const tokensResponse = await fetch(`/api/tokenizin-wallet/tokens?address=${address}`, {
        credentials: 'include',
      });

      if (!tokensResponse.ok) {
        console.warn('Failed to fetch tokens from API');
        return;
      }

      const tokensData = await tokensResponse.json();
      const tokens = tokensData.tokens || [];

      // Filter RWA404Tokens (tokens with propertyId or imageUrl)
      const rwa404Tokens = tokens.filter((token: any) =>
        token.propertyId || token.imageUrl || token.symbol?.includes('RWA')
      );

      if (rwa404Tokens.length === 0) {
        return;
      }

      // ✅ CORRECT: Use tokens data directly - no hook calls inside map
      const rwaPromises = rwa404Tokens.map(async (token: any) => {
        try {
          setRwaContracts(prev => prev.map(r =>
            r.tokenAddress === token.tokenAddress ? { ...r, loading: true } : r
          ));

          // ⚠️ CRITICAL: Use wholeTokens (integer) for display, fallback to balanceFormatted
          // wholeTokens comes from TokenHolder.tokenAmount (already in whole tokens)
          const tokenAmount = token.wholeTokens
            ? parseInt(token.wholeTokens)
            : parseFloat(token.balanceFormatted || '0');

          const isHolder = tokenAmount > 0;
          // Owner check would require API endpoint or separate contract read
          // For now, mark as not owner (can be enhanced later via API)
          const isOwner = false;

          // ⚠️ CRITICAL: Format RWA token symbol with property ID (RWA-1, RWA-2, etc.)
          // Extract property ID from assetId or propertyId
          let propertyIdNumber: number | null = null;
          if (token.propertyId) {
            // Try to extract number from propertyId (e.g., "1" from "RWA-1" or just "1")
            const match = token.propertyId.match(/\d+/);
            if (match) {
              propertyIdNumber = parseInt(match[0], 10);
            }
          } else if (token.assetId) {
            // Fallback to assetId if propertyId not available
            const match = String(token.assetId).match(/\d+/);
            if (match) {
              propertyIdNumber = parseInt(match[0], 10);
            }
          }

          // Format symbol with property ID: RWA-1, RWA-2, etc.
          const baseSymbol = token.symbol || 'RWA';
          const contractSymbol = propertyIdNumber !== null
            ? `${baseSymbol}-${propertyIdNumber}`
            : baseSymbol;

          // ⚠️ CRITICAL: Calculate USD value: tokenNumber * Price per token
          // tokenPrice is already in USD from the database
          const tokenPriceUSD = token.tokenPrice ? parseFloat(token.tokenPrice.toString()) : 0;
          const usdValue = tokenAmount > 0 && tokenPriceUSD > 0
            ? (tokenAmount * tokenPriceUSD).toFixed(2)
            : '0.00';

          const rwaInfo: RWAContractInfo = {
            tokenAddress: token.tokenAddress,
            symbol: contractSymbol, // Format: RWA-1, RWA-2, etc.
            name: token.title || contractSymbol || 'RWA404 Token',
            balance: tokenAmount.toString(), // Use whole tokens (integer)
            isOwner,
            isHolder,
            loading: false,
            usdValue: token.usdValue || usdValue, // Use API value or calculated value (tokenNumber * Price per token)
            tokenPrice: tokenPriceUSD, // Store USD price per token
            assetId: token.assetId, // For navigation to asset detail
            propertyId: token.propertyId, // Blockchain property ID
            imageUrl: token.imageUrl, // Property image
          };

          setRwaContracts(prev => prev.map(r =>
            r.tokenAddress === token.tokenAddress ? rwaInfo : r
          ));

          return rwaInfo;
        } catch (err) {
          // ⚠️ CRITICAL: Use the actual contract symbol from the token data
          const contractSymbol = token.symbol || 'RWA404';

          const errorRWA: RWAContractInfo = {
            tokenAddress: token.tokenAddress,
            symbol: contractSymbol, // Use actual contract symbol
            name: token.title || contractSymbol || 'RWA404 Token',
            balance: '0',
            isOwner: false,
            isHolder: false,
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to load RWA contract',
          };

          setRwaContracts(prev => prev.map(r =>
            r.tokenAddress === token.tokenAddress ? errorRWA : r
          ));

          return errorRWA;
        }
      });

      await Promise.all(rwaPromises);
    } catch (error) {
      console.error('Failed to load RWA contracts:', error);
    }
  }, []);

  // Initialize balances and start loading from Zustand store
  useEffect(() => {
    if (!walletAddress) {
      setBalances([]);
      setRwaContracts([]);
      return;
    }

    // Initialize with loading state
    const initialBalances: TokenBalance[] = [
      { symbol: 'ETH', balance: '0', balanceFormatted: '0', usdValue: '0', loading: true },
      { symbol: 'USDC', balance: '0', balanceFormatted: '0', usdValue: '0', loading: true },
      { symbol: 'EURC', balance: '0', balanceFormatted: '0', usdValue: '0', loading: true },
      { symbol: 'TKNZN', balance: '0', balanceFormatted: '0', usdValue: '0', loading: true },
    ];

    // Initialize RWA contracts as empty - will be loaded from tokens API
    const initialRWA: RWAContractInfo[] = [];

    setBalances(initialBalances);
    setRwaContracts(initialRWA);
    setLoading(true);
    setError(null);

    // Load data from store (will fetch if needed)
    loadStandardTokens(walletAddress).then(() => {
      setLoading(false);
    }).catch(err => {
      setError(err instanceof Error ? err.message : 'Failed to load wallet data');
      setLoading(false);
    });

    // Also load RWA contracts
    loadRWAContracts(walletAddress).catch(err => {
      console.warn('Failed to load RWA contracts:', err);
    });
  }, [walletAddress, loadStandardTokens, loadRWAContracts]);

  // Watch store changes and update balances when store data changes
  useEffect(() => {
    if (walletAddress && walletStore.currentAddress?.toLowerCase() === walletAddress.toLowerCase()) {
      // Update balances when store data changes (even if storeBalances is null initially)
      // This ensures balances update as soon as store finishes loading
      if (!storeLoading.balances && storeBalances) {
        // Store finished loading and has data - update component balances
        loadStandardTokens(walletAddress);
      } else if (storeLoading.balances) {
        // Store is still loading - keep loading state
        setBalances(prev => prev.map(b => ({ ...b, loading: true })));
      }
    }
  }, [storeBalances, storeLoading.balances, walletAddress, loadStandardTokens, walletStore.currentAddress]);

  // Calculate total USD value
  const totalUSDValue = useMemo(() => {
    const standardTokensValue = balances.reduce((sum, b) => {
      return sum + parseFloat(b.usdValue || '0');
    }, 0);

    const rwaTokensValue = rwaContracts.reduce((sum, r) => {
      return sum + parseFloat(r.usdValue || '0');
    }, 0);

    return (standardTokensValue + rwaTokensValue).toFixed(2);
  }, [balances, rwaContracts]);

  return {
    balances,
    rwaContracts,
    loading,
    error,
    totalTokens: balances.length + rwaContracts.length,
    loadedTokens: balances.filter(b => !b.loading).length + rwaContracts.filter(r => !r.loading).length,
    totalUSDValue,
  };
}

// Token Loading Skeleton Component
function TokenLoadingSkeleton({ message }: { message: string }) {
  return (
    <Card className="bg-card dark:bg-gray-800 border-border dark:border-gray-700">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <TigerSpinner size="sm" />
          <div className="flex flex-col gap-1">
            <span className="text-sm text-muted-foreground dark:text-gray-400">{message}</span>
            <div className="flex gap-2">
              <div className="h-2 w-16 bg-muted dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-2 w-20 bg-muted dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-2 w-12 bg-muted dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ERC20 ABI for allowance checks
const ERC20_ABI_FOR_ALLOWANCE = [
  'function allowance(address, address) view returns (uint256)',
  'function decimals() view returns (uint8)',
] as const;

// Individual Token Balance Component with Allowance
function TokenBalanceItem({ token, currency, walletAddress }: { token: TokenBalance; currency: Currency; walletAddress?: Address }) {
  const { addresses: contractAddresses } = useContractStore();
  const MARKETPLACE_ADDRESS = contractAddresses?.marketplace;

  // Only fetch allowance for ERC20 tokens (not ETH) and when addresses are available
  const isERC20Token = token.symbol !== 'ETH' && token.tokenAddress;
  const shouldFetchAllowance: boolean = !!(isERC20Token && walletAddress && MARKETPLACE_ADDRESS && token.tokenAddress);

  // Fetch token decimals if not provided
  const { data: tokenDecimalsData } = useReadContract({
    address: shouldFetchAllowance ? (token.tokenAddress as `0x${string}`) : undefined,
    abi: ERC20_ABI_FOR_ALLOWANCE,
    functionName: 'decimals',
    query: {
      enabled: shouldFetchAllowance,
    },
  });

  // Fetch allowance for ERC20 tokens
  const { data: allowanceData } = useReadContract({
    address: shouldFetchAllowance ? (token.tokenAddress as `0x${string}`) : undefined,
    abi: ERC20_ABI_FOR_ALLOWANCE,
    functionName: 'allowance',
    args: walletAddress && MARKETPLACE_ADDRESS ? [walletAddress, MARKETPLACE_ADDRESS as `0x${string}`] : undefined,
    query: {
      enabled: shouldFetchAllowance,
    },
  });

  const tokenDecimals = tokenDecimalsData ? Number(tokenDecimalsData) : (token.decimals || 18);
  const allowance = allowanceData ? formatUnits(allowanceData as bigint, tokenDecimals) : '0';
  const hasAllowance = allowanceData && (allowanceData as bigint) > 0n;

  if (token.loading) {
    return (
      <div className="flex items-center justify-between p-3 border border-border dark:border-gray-700 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-muted dark:bg-gray-700 rounded-full animate-pulse"></div>
          <div className="flex flex-col gap-1">
            <div className="h-4 w-16 bg-muted dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-3 w-12 bg-muted dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="h-4 w-20 bg-muted dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="h-3 w-16 bg-muted dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (token.error) {
    return (
      <div className="flex items-center justify-between p-3 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
            <Shield className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-red-900 dark:text-red-300">{token.symbol}</span>
            <span className="text-xs text-red-700 dark:text-red-400">Error loading balance</span>
          </div>
        </div>
        <Badge variant="destructive" className="text-xs">Error</Badge>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between p-3 border border-border dark:border-gray-700 rounded-lg hover:bg-muted/50 dark:hover:bg-gray-900/50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary/10 dark:bg-primary/20 rounded-full flex items-center justify-center">
            <Coins className="w-4 h-4 text-primary dark:text-primary/80" />
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-foreground dark:text-white">{token.symbol}</span>
            <span className="text-xs text-muted-foreground dark:text-gray-400">
              {token.balanceFormatted} tokens
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-medium text-foreground dark:text-white">
            {formatCurrency(parseFloat(token.usdValue || '0'), currency)}
          </span>
          <span className="text-xs text-muted-foreground dark:text-gray-400">USD value</span>
        </div>
      </div>
      {/* Approved Balance (Allowance) - Only show for ERC20 tokens */}
      {isERC20Token && shouldFetchAllowance && (
        <div className="flex items-center justify-between px-3 pb-2 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground dark:text-gray-500 pl-11">
            <Shield className="h-3 w-3" />
            <span>Approved Balance:</span>
          </div>
          <span className={`font-medium text-xs ${hasAllowance ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
            {parseFloat(allowance).toFixed(6)} {token.symbol}
          </span>
        </div>
      )}
    </div>
  );
}

// RWA Token Contract Component with click handler
function RWATokenItem({ rwa, onClick, currency }: { rwa: RWAContractInfo; onClick?: () => void; currency: Currency }) {
  if (rwa.loading) {
    return (
      <div className="flex items-center justify-between p-3 border border-border dark:border-gray-700 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-muted dark:bg-gray-700 rounded-full animate-pulse"></div>
          <div className="flex flex-col gap-1">
            <div className="h-4 w-20 bg-muted dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-3 w-24 bg-muted dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-5 w-12 bg-muted dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="h-5 w-10 bg-muted dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (rwa.error) {
    return (
      <div className="flex items-center justify-between p-3 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
            <Shield className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-red-900 dark:text-red-300">{rwa.symbol}</span>
            <span className="text-xs text-red-700 dark:text-red-400">Contract error</span>
          </div>
        </div>
        <Badge variant="destructive" className="text-xs">Error</Badge>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-between p-3 border border-border dark:border-gray-700 rounded-lg hover:bg-muted/50 dark:hover:bg-gray-900/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-3 flex-1">
        <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
          <Building2 className="w-4 h-4 text-orange-600 dark:text-orange-400" />
        </div>
        <div className="flex flex-col flex-1">
          <span className="font-medium text-foreground dark:text-white">{rwa.name}</span>
          <span className="text-xs text-muted-foreground dark:text-gray-400">
            {/* ⚠️ CRITICAL: Display whole tokens (integer), not fractional */}
            {parseInt(rwa.balance) > 0 ? `${rwa.balance} ${rwa.symbol || 'tokens'}` : '0 tokens'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* USD Value Display */}
        {rwa.usdValue && parseFloat(rwa.usdValue) > 0 && (
          <div className="flex flex-col items-end">
            <span className="font-medium text-foreground dark:text-white text-sm">
              {formatCurrency(parseFloat(rwa.usdValue), currency)}
            </span>
            <span className="text-xs text-muted-foreground dark:text-gray-400">USD value</span>
          </div>
        )}
        {rwa.isOwner && (
          <Badge className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-xs">
            <Crown className="w-3 h-3 mr-1" />
            Owner
          </Badge>
        )}
        {rwa.isHolder && !rwa.isOwner && (
          <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs">
            <User className="w-3 h-3 mr-1" />
            Holder
          </Badge>
        )}
      </div>
    </div>
  );
}

// Network Switcher Component - Exported for use in header
export function NetworkSwitcherButton() {
  const { chainId, switchNetwork: switchAppKitNetwork } = useAppKitNetwork();
  const { switchChain, isPending: isWagmiSwitching, error: wagmiError } = useSwitchChain();
  const { isConnected } = useAccount();
  const [isSwitching, setIsSwitching] = useState(false);

  // Get current network from networks array
  const currentNetwork = networks.find(network => network.id === chainId) || networks[0];

  const handleSwitchNetwork = async (targetNetwork: typeof networks[0]) => {
    // Don't switch if already on this network
    if (targetNetwork.id === chainId) {
      return;
    }

    if (isSwitching || isWagmiSwitching) return;

    setIsSwitching(true);
    try {
      // ⚠️ CRITICAL: First trigger the actual wallet network switch (MetaMask confirmation)
      // This will prompt the user to confirm the network change in MetaMask
      if (isConnected && switchChain && targetNetwork) {
        const targetChainId = Number(targetNetwork.id);
        console.log(`🔄 Requesting wallet to switch to ${targetNetwork.name} (chainId: ${targetChainId})...`);

        // Use wagmi's switchChain to trigger MetaMask's network switch confirmation
        await switchChain({ chainId: targetChainId });

        console.log(`✅ Wallet network switch confirmed for ${targetNetwork.name}`);
      }

      // Then update AppKit's internal state to reflect the network change
      // This ensures AppKit UI components are aware of the network change
      if (switchAppKitNetwork && targetNetwork) {
        await switchAppKitNetwork(targetNetwork);
        console.log(`✅ AppKit state updated to ${targetNetwork.name}`);
      }

      console.log(`✅ Network switched to ${targetNetwork.name}`);
    } catch (error: any) {
      console.error('❌ Failed to switch network:', error);

      // Handle specific error cases
      if (error?.code === 4902) {
        // Chain not added to wallet - this should be handled by wagmi automatically
        console.warn('⚠️ Chain not added to wallet. Wagmi should handle this automatically.');
      } else if (error?.code === 4001) {
        // User rejected the request
        console.warn('⚠️ User rejected network switch request');
      } else {
        // Other errors
        console.error('❌ Network switch error:', error.message || error);
      }
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          disabled={isSwitching || isWagmiSwitching || !isConnected}
          className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted dark:bg-gray-700 hover:bg-orange-600/10 dark:hover:bg-orange-500/20 transition-colors text-sm font-medium text-foreground dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Select network"
          title={`Current: ${currentNetwork.name} - Click to select network`}
        >
          <Network className="h-4 w-4" />
          {(isSwitching || isWagmiSwitching) ? (
            <>
              <TigerSpinner size="sm" />
              <span>Switching...</span>
            </>
          ) : (
            <>
              <span>{currentNetwork.name}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground dark:text-gray-400" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuRadioGroup
          value={chainId?.toString() || networks[0].id.toString()}
          onValueChange={(value) => {
            const selectedNetwork = networks.find(network => network.id.toString() === value);
            if (selectedNetwork) {
              handleSwitchNetwork(selectedNetwork);
            }
          }}
        >
          {networks.map((network) => {
            const isCurrentNetwork = network.id === chainId;
            const isTestnet = network.testnet;

            return (
              <DropdownMenuRadioItem
                key={network.id}
                value={network.id.toString()}
                disabled={isSwitching || isWagmiSwitching}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{network.name}</span>
                  {isTestnet && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
                      Testnet
                    </span>
                  )}
                </div>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Main Token Loading Component
function TokenLoadingDisplay({ walletAddress }: { walletAddress: Address }) {
  const { balances, rwaContracts, loading, error, totalTokens, loadedTokens, totalUSDValue } = useAsyncTokenBalances(walletAddress);
  const { currency, currencyInfo } = useCurrencyPreference();
  const router = useRouter();

  const handleExpandClick = () => {
    router.push('/wallet');
  };

  if (error) {
    return (
      <Card className="bg-card dark:bg-gray-800 border-border dark:border-gray-700">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
            <Shield className="w-5 h-5" />
            <span className="text-sm">Failed to load wallet data: {error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const loadingMessage = loadedTokens === 0 ? "Loading wallet info..." : "Fetching blockchain data";

  return (
    <Card className="bg-card dark:bg-gray-800 border-border dark:border-gray-700 max-w-md hover:shadow-lg transition-shadow cursor-pointer group">
      {/* Header with expand icon */}
      <div
        className="flex items-center justify-between p-4 pb-2 border-b border-border dark:border-gray-700 cursor-pointer"
        onClick={handleExpandClick}
      >
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary dark:text-orange-400" />
          <h3 className="text-sm font-semibold text-foreground dark:text-white">Wallet Overview</h3>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleExpandClick();
          }}
          className="p-1 rounded-md hover:bg-muted dark:hover:bg-gray-700 transition-colors group-hover:text-orange-600 dark:group-hover:text-orange-400"
          aria-label="Open full wallet page"
          title="Open full wallet page"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors" />
        </button>
      </div>
      <CardContent className="p-4">
        {loading && loadedTokens < totalTokens && (
          <div className="mb-4">
            <TokenLoadingSkeleton message={loadingMessage} />
            <div className="mt-2 text-xs text-muted-foreground dark:text-gray-400 text-center">
              Loaded {loadedTokens} of {totalTokens} tokens
            </div>
          </div>
        )}

        {/* Standard Tokens */}
        <div className="space-y-2 mb-4">
          <h4 className="text-sm font-medium text-foreground dark:text-white mb-2">Standard Tokens</h4>
          {balances.map((token) => (
            <TokenBalanceItem key={token.symbol} token={token} currency={currency} walletAddress={walletAddress} />
          ))}
        </div>

        {/* RWA Token Contracts */}
        {rwaContracts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground dark:text-white mb-2">RWA Token Contracts</h4>
            {rwaContracts.map((rwa) => (
              <RWATokenItem
                key={rwa.tokenAddress}
                rwa={rwa}
                currency={currency}
                onClick={() => {
                  // ⚠️ CRITICAL: Use propertyId (slug) for navigation to marketplace, not assetId (numeric blockchain ID)
                  // propertyId should be the slug (e.g., "property-luxury-beachfront-villa-bali")
                  if (rwa.propertyId) {
                    // Check if propertyId looks like a slug (contains "property-")
                    if (typeof rwa.propertyId === 'string' && rwa.propertyId.startsWith('property-')) {
                      router.push(`/marketplace/${rwa.propertyId}`);
                    } else {
                      // Fallback: if propertyId is numeric, try using it (might work if marketplace supports numeric IDs)
                      router.push(`/marketplace/${rwa.propertyId}`);
                    }
                  } else if (rwa.assetId) {
                    // Fallback: assetId might be the slug if propertyId is not set
                    if (typeof rwa.assetId === 'string' && rwa.assetId.startsWith('property-')) {
                      router.push(`/marketplace/${rwa.assetId}`);
                    } else {
                      // If assetId is numeric, we can't navigate (no slug available)
                      console.warn(`[HeaderWagmiDependent] Cannot navigate to property: propertyId missing and assetId is numeric (${rwa.assetId})`);
                    }
                  }
                }}
              />
            ))}
          </div>
        )}

        {/* Total Portfolio Value */}
        {!loading && (balances.some(b => !b.loading) || rwaContracts.some(r => !r.loading)) && (
          <div className="mt-4 pt-3 border-t border-border dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground dark:text-white">Total Portfolio Value</span>
              <span className="text-lg font-bold text-primary dark:text-orange-400">
                {formatCurrency(parseFloat(totalUSDValue || '0'), currency)}
              </span>
            </div>
          </div>
        )}

        {!loading && balances.some(b => !b.loading) && (
          <div className="mt-4 pt-3 border-t border-border dark:border-gray-700">
            {/* Footer with sync status and view link */}
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground dark:text-gray-400">
                Wallet data synchronized • {new Date().toLocaleTimeString()}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleExpandClick();
                }}
                className="flex items-center gap-1 text-xs text-primary dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 transition-colors"
                aria-label="App Wallet View"
              >
                <span>App View</span>
                <Fullscreen className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface HeaderWalletButtonProps {
  isAuthenticated: boolean;
}

// HeaderWalletMenuItemProps removed - component no longer used

/**
 * HeaderWalletButtonInner - Tiger Wallet Button that renders when authenticated
 * Shows connect button when not connected, wallet button when connected
 * Includes token loading display when wallet is connected
 */
function HeaderWalletButtonInner({ isAuthenticated }: HeaderWalletButtonProps) {
  const wagmiReady = useWagmiProviderReady();
  const pathname = usePathname();
  const { address: appKitAddress, isConnected: appKitConnected } = useAppKitAccount();

  // Avoid loading wallet artifacts on auth pages (sign-in/up)
  if (pathname?.startsWith('/auth')) {
    return null;
  }

  // Only show when authenticated and WagmiProvider is ready
  // TokenizinWalletButton handles both connected and not-connected states
  if (!wagmiReady || !isAuthenticated) {
    return null;
  }

  // If wallet is connected, show token loading display
  if (appKitConnected && appKitAddress) {
    return (
      <div className="flex items-center gap-4">
        <TokenLoadingDisplay walletAddress={appKitAddress as Address} />
        <TokenizinWalletButton />
      </div>
    );
  }

  return <TokenizinWalletButton />;
}

// ReceiveFundsButton moved to top of file - see export above

/**
 * HeaderWalletButton - Wrapper that only renders when WagmiProvider is ready
 */
export function HeaderWalletButton(props: HeaderWalletButtonProps) {
  return (
    <WagmiProviderGuard fallback={null}>
      <HeaderWalletButtonInner {...props} />
    </WagmiProviderGuard>
  );
}

// HeaderReceiveFundsMenuItem removed - use ReceiveFundsButton instead

