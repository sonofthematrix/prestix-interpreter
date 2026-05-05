/**
 * useBalanceAggregation Hook
 * 
 * Hook for aggregating balances across multiple accounts
 */

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useAccount, useBalance, useReadContract, useReadContracts } from 'wagmi';
import { useAppKitAccount, useAppKitState } from '@reown/appkit/react';
import { formatUnits, Address } from 'viem';
import type { TokenBalance, BalanceAggregation, TokenConfig, ContractAddresses } from '../types';

const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

export function useBalanceAggregation(
  tokens: TokenConfig[],
  contractAddresses?: ContractAddresses
) {
  // ✅ CORRECT: Use AppKit account address instead of wagmi useAccount()
  // This prevents undefined address issues that cause BigInt conversion errors
  const appKitAccount = useAppKitAccount();
  const appKitState = useAppKitState();
  
  // Get address from AppKit account (primary source of truth)
  const address = appKitAccount.address;
  const isConnected = appKitAccount.isConnected;
  
  // Fallback to wagmi useAccount only if AppKit address is not available
  // This maintains compatibility but prioritizes AppKit
  const wagmiAccount = useAccount();
  const fallbackAddress = address || wagmiAccount.address;
  
  const [aggregatedBalances, setAggregatedBalances] = useState<BalanceAggregation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Extract initialized flag (primitive value, stable)
  const isInitialized = appKitState.initialized;

  // Extract primitive values for stable comparison
  const allAccountsLength = appKitAccount.allAccounts?.length ?? 0;
  const firstAccountAddress = appKitAccount.allAccounts?.[0]?.address;
  const embeddedAccountsLength = appKitAccount.embeddedWalletInfo?.user?.accounts?.length ?? 0;
  const firstEmbeddedAccountAddress = appKitAccount.embeddedWalletInfo?.user?.accounts?.[0]?.address;

  // Create stable key from account data to prevent unnecessary re-computations
  const accountDataKey = useMemo(() => {
    try {
      return JSON.stringify({
        address: fallbackAddress,
        allAccounts: appKitAccount.allAccounts?.map(acc => ({
          address: acc.address,
          type: acc.type,
        })) || [],
        embeddedAccounts: appKitAccount.embeddedWalletInfo?.user?.accounts?.map(acc => ({
          address: acc.address,
          type: acc.type,
        })) || [],
      });
    } catch {
      return '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    fallbackAddress,
    allAccountsLength,
    firstAccountAddress,
    embeddedAccountsLength,
    firstEmbeddedAccountAddress,
  ]);

  // Get ETH balance with proper validation to prevent BigInt conversion errors
  // ✅ CRITICAL FIX: Only pass address when it's actually defined and valid
  // This prevents AppKit WagmiAdapter from receiving undefined and causing BigInt errors
  const isValidAddress = fallbackAddress && 
    typeof fallbackAddress === 'string' && 
    fallbackAddress.startsWith('0x') && 
    fallbackAddress.length === 42;
  
  const { data: ethBalance, error: ethBalanceError } = useBalance({
    // Only pass address if it's valid, otherwise pass undefined explicitly
    address: isValidAddress ? (fallbackAddress as Address) : undefined,
    query: { 
      // ✅ CRITICAL: enabled must be false when address is undefined to prevent AppKit from trying to fetch
      enabled: isValidAddress && (isConnected || wagmiAccount.isConnected),
      retry: 2,
      retryDelay: 1000,
    },
  });

  // Log balance errors for debugging (but don't crash)
  useEffect(() => {
    if (ethBalanceError) {
      console.warn('useBalanceAggregation: Error getting ETH balance (handled):', ethBalanceError);
    }
  }, [ethBalanceError]);

  // Get all account addresses (EOA + Smart Accounts) - use stable key
  const allAccountAddresses = useMemo(() => {
    const addresses: Address[] = [];
    
    // Add primary address (use fallbackAddress which prioritizes AppKit)
    // Validate address inline to avoid dependency on isValidAddress
    if (fallbackAddress && 
        typeof fallbackAddress === 'string' && 
        fallbackAddress.startsWith('0x') && 
        fallbackAddress.length === 42) {
      addresses.push(fallbackAddress as Address);
    }

    // Parse account data from stable key
    try {
      const accountData = JSON.parse(accountDataKey);
      
      // Add accounts from allAccounts
      if (accountData.allAccounts) {
        accountData.allAccounts.forEach((account: any) => {
          if (account.address && !addresses.includes(account.address as Address)) {
            addresses.push(account.address as Address);
          }
        });
      }

      // Add Smart Account addresses from embeddedWalletInfo
      if (accountData.embeddedAccounts) {
        accountData.embeddedAccounts.forEach((account: any) => {
          if (account.address && !addresses.includes(account.address as Address)) {
            addresses.push(account.address as Address);
          }
        });
      }
    } catch {
      // Fallback: use appKitAccount directly if parsing fails
      if (appKitAccount.allAccounts) {
        appKitAccount.allAccounts.forEach((account: any) => {
          if (account.address && !addresses.includes(account.address as Address)) {
            addresses.push(account.address as Address);
          }
        });
      }

      if (appKitAccount.embeddedWalletInfo?.user?.accounts) {
        appKitAccount.embeddedWalletInfo.user.accounts.forEach((account: any) => {
          if (account.address && !addresses.includes(account.address as Address)) {
            addresses.push(account.address as Address);
          }
        });
      }
    }

    return addresses;
    // Note: appKitAccount.allAccounts and appKitAccount.embeddedWalletInfo are accessed in fallback
    // but including them would cause infinite loops since they're objects that change reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fallbackAddress, accountDataKey]);

  // Build contracts array separately to avoid deep type inference
  const tokenContracts = useMemo(() => {
    return tokens.flatMap((token) =>
      allAccountAddresses.map((accountAddress) => ({
        address: token.address as Address,
        abi: ERC20_ABI,
        functionName: 'balanceOf' as const,
        args: [accountAddress] as [Address],
      }))
    );
  }, [tokens, allAccountAddresses]);

  // Fetch token balances for all accounts
  // @ts-ignore - Type instantiation depth issue with useReadContracts and nested arrays
  const tokenBalanceQueries = useReadContracts({
    contracts: tokenContracts as any,
    query: {
      enabled: isInitialized && allAccountAddresses.length > 0 && tokens.length > 0,
      refetchInterval: false, // Manual refresh only
    },
  });

  // Use refs to track state and prevent infinite loops
  const processedBalanceKeyRef = useRef<string>('');
  const hasSetEmptyBalancesRef = useRef<boolean>(false);
  const allAccountAddressesKey = useMemo(() => {
    return allAccountAddresses.map(a => a.toLowerCase()).join(',');
  }, [allAccountAddresses]);

  // Create stable key from balance data to prevent unnecessary re-runs
  const balanceDataKey = useMemo(() => {
    return JSON.stringify({
      ethBalance: ethBalance?.value?.toString(),
      tokenResults: tokenBalanceQueries.data?.map(r => r.status === 'success' ? r.result?.toString() : null),
      allAccountAddressesKey,
      tokensLength: tokens.length,
    });
  }, [
    ethBalance?.value,
    tokenBalanceQueries.data,
    allAccountAddressesKey,
    tokens.length,
  ]);

  // Aggregate balances
  useEffect(() => {
    // Handle case when no accounts are available
    if (allAccountAddresses.length === 0) {
      if (!hasSetEmptyBalancesRef.current) {
        setAggregatedBalances({
          totalETH: '0',
          totalUSDC: '0',
          totalEURC: '0',
          totalTPT: '0',
          totalUSDValue: 0,
          accounts: [],
        });
        setIsLoading(false);
        hasSetEmptyBalancesRef.current = true;
      }
      return;
    } else {
      hasSetEmptyBalancesRef.current = false;
    }

    // Wait for ETH balance and token queries to complete
    if (tokenBalanceQueries.isLoading) {
      return;
    }

    // Handle case when ETH balance is not available yet but queries are done
    if (!ethBalance && !tokenBalanceQueries.isLoading) {
      // Skip if we've already set empty balances for this state
      if (processedBalanceKeyRef.current === `empty-${allAccountAddressesKey}`) {
        return;
      }
      
      // Set empty balances if no ETH balance and no token queries pending
      setAggregatedBalances({
        totalETH: '0',
        totalUSDC: '0',
        totalEURC: '0',
        totalTPT: '0',
        totalUSDValue: 0,
        accounts: allAccountAddresses.map((addr) => ({
          address: addr,
          type: 'eoa' as const,
          balances: [],
        })),
      });
      setIsLoading(false);
      processedBalanceKeyRef.current = `empty-${allAccountAddressesKey}`;
      return;
    }

    // Skip if we've already processed this balance data
    if (balanceDataKey === processedBalanceKeyRef.current && balanceDataKey !== '') {
      return;
    }

    // Mark as processed
    processedBalanceKeyRef.current = balanceDataKey;

    try {
      setIsLoading(true);

      const balances: TokenBalance[] = [];
      let totalETH = BigInt(0);
      let totalUSDC = BigInt(0);
      let totalEURC = BigInt(0);
      let totalTPT = BigInt(0);

      // Add ETH balance if available
      if (ethBalance && ethBalance.value) {
        totalETH = ethBalance.value;
        balances.push({
          token: {
            address: '0x0000000000000000000000000000000000000000' as Address,
            symbol: 'ETH',
            name: 'Ethereum',
            decimals: 18,
            type: 'native',
          },
          balance: ethBalance.value.toString(),
          balanceFormatted: formatUnits(ethBalance.value, 18),
          accountAddress: fallbackAddress as Address,
          accountType: 'eoa',
        });
      }

      // Process token balances
      const results = tokenBalanceQueries.data || [];
      let resultIndex = 0;

      tokens.forEach((token) => {
        allAccountAddresses.forEach((accountAddress) => {
          const result = results[resultIndex];
          resultIndex++;

          if (result?.status === 'success' && result.result) {
            const balance = result.result as bigint;
            
            // Only include non-zero balances
            if (balance > BigInt(0)) {
              const balanceFormatted = formatUnits(balance, token.decimals);

              balances.push({
                token,
                balance: balance.toString(),
                balanceFormatted,
                accountAddress,
                accountType: 'eoa', // TODO: Detect Smart Account type
              });

              // Aggregate totals
              if (token.symbol === 'USDC') {
                totalUSDC += balance;
              } else if (token.symbol === 'EURC') {
                totalEURC += balance;
              } else if (token.symbol === 'TKNZN') {
                totalTPT += balance;
              }
            }
          }
        });
      });

      // Create aggregation result - ensure all accounts are included even if they have no balances
      // Access allAccountAddresses from closure (it's memoized, so stable)
      const currentAccounts = allAccountAddresses;
      const usdcDecimals = contractAddresses?.usdc ? 6 : 18;
      const eurcDecimals = contractAddresses?.eurc ? 6 : 18;
      
      const aggregation: BalanceAggregation = {
        totalETH: formatUnits(totalETH, 18),
        totalUSDC: formatUnits(totalUSDC, usdcDecimals),
        totalEURC: formatUnits(totalEURC, eurcDecimals),
        totalTPT: formatUnits(totalTPT, 18),
        totalUSDValue: 0, // TODO: Calculate USD value
        accounts: currentAccounts.map((addr) => ({
          address: addr,
          type: 'eoa' as const, // TODO: Detect account type
          balances: balances.filter((b) => b.accountAddress.toLowerCase() === addr.toLowerCase()),
        })),
      };

      setAggregatedBalances(aggregation);
    } catch (error) {
      console.error('Failed to aggregate balances:', error);
      // Set empty state on error
      setAggregatedBalances({
        totalETH: '0',
        totalUSDC: '0',
        totalEURC: '0',
        totalTPT: '0',
        totalUSDValue: 0,
        accounts: allAccountAddresses.map((addr) => ({
          address: addr,
          type: 'eoa' as const,
          balances: [],
        })),
      });
    } finally {
      setIsLoading(false);
    }
    // Note: allAccountAddresses, tokens, and contractAddresses are accessed from closure
    // They're memoized/stable, so including them would cause infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ethBalance?.value,
    tokenBalanceQueries.data,
    tokenBalanceQueries.isLoading,
    balanceDataKey,
    allAccountAddressesKey,
    fallbackAddress,
    isValidAddress,
    isConnected,
    wagmiAccount.isConnected,
  ]);

  // Refresh function to force re-fetch balances
  const refresh = useCallback(() => {
    console.log('🔄 Refreshing token balances...', {
      tokens: tokens.map(t => t.symbol),
      accounts: allAccountAddresses,
    });
    processedBalanceKeyRef.current = '';
    hasSetEmptyBalancesRef.current = false;
    setIsLoading(true);
    // Force refetch by invalidating queries
    if (tokenBalanceQueries.refetch) {
      tokenBalanceQueries.refetch();
    }
    // Also trigger ETH balance refetch if available
    if (ethBalance) {
      // ETH balance will auto-refresh via wagmi
    }
  }, [tokens, allAccountAddresses, tokenBalanceQueries, ethBalance]);

  return {
    aggregatedBalances,
    isLoading: isLoading || tokenBalanceQueries.isLoading,
    accounts: allAccountAddresses,
    refresh,
  };
}

