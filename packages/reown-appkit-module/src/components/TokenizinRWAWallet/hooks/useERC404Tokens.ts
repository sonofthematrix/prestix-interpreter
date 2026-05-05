/**
 * useERC404Tokens Hook
 * 
 * Hook for fetching ERC404 property tokens from Registry contract
 */

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { useAppKitAccount, useAppKitState } from '@reown/appkit/react';
import { formatUnits, Address, createPublicClient, http } from 'viem';
import { sepoliaChain } from '../../../config';
import type { ERC404PropertyToken, ContractAddresses } from '../types';

// Registry ABI
const REGISTRY_ABI = [
  {
    name: 'getAsset',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'assetId', type: 'uint256' }],
    outputs: [
      { name: 'id', type: 'uint256' },
      { name: 'title', type: 'string' },
      { name: 'owner', type: 'address' },
      { name: 'assetType', type: 'uint8' },
      { name: 'isActive', type: 'bool' },
    ],
  },
  {
    name: 'getAssetsByOwner',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
] as const;

// Factory ABI
const FACTORY_ABI = [
  {
    name: 'getTokenAddress',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'assetId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

// ERC20/ERC404 ABI
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
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

interface PropertyMetadata {
  id: string;
  title: string;
  imageUrl: string;
  tokenContractAddress?: string;
  propertyId?: string;
  tokenPrice?: string;
  totalTokens?: string;
  availableTokens?: string;
}

export function useERC404Tokens(contractAddresses?: ContractAddresses) {
  const { address, isConnected } = useAccount();
  const appKitAccount = useAppKitAccount();
  const appKitState = useAppKitState();
  const [propertyTokens, setPropertyTokens] = useState<ERC404PropertyToken[]>([]);
  const [propertyMetadata, setPropertyMetadata] = useState<Record<string, PropertyMetadata>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Get all account addresses (EOA + Smart Accounts)
  const allAccountAddresses = useMemo(() => {
    const addresses: Address[] = [];
    
    // Add primary address
    if (address) {
      addresses.push(address as Address);
    }

    // Add accounts from allAccounts
    if (appKitAccount.allAccounts) {
      appKitAccount.allAccounts.forEach((account: any) => {
        if (account.address && !addresses.includes(account.address as Address)) {
          addresses.push(account.address as Address);
        }
      });
    }

    // Add Smart Account addresses from embeddedWalletInfo
    if (appKitAccount.embeddedWalletInfo?.user?.accounts) {
      appKitAccount.embeddedWalletInfo.user.accounts.forEach((account: any) => {
        if (account.address && !addresses.includes(account.address as Address)) {
          addresses.push(account.address as Address);
        }
      });
    }

    return addresses;
  }, [address, appKitAccount.allAccounts, appKitAccount.embeddedWalletInfo]);

  // Fetch user's assets from registry for all accounts
  // @ts-ignore - Type instantiation depth issue with useReadContracts and nested arrays
  const registryQueries = useReadContracts({
    contracts: (allAccountAddresses.map((accountAddress) => ({
      address: contractAddresses?.registry as Address,
      abi: REGISTRY_ABI,
      functionName: 'getAssetsByOwner' as const,
      args: [accountAddress],
    })) as any),
    query: {
      enabled: 
        appKitState.initialized &&
        !!contractAddresses?.registry && 
        allAccountAddresses.length > 0 && 
        isConnected,
      refetchInterval: false, // Manual refresh only
    },
  });

  // Create stable key for account addresses to prevent infinite loops
  const allAccountAddressesKey = useMemo(() => {
    return allAccountAddresses.map(a => a.toLowerCase()).join(',');
  }, [allAccountAddresses]);

  // Use ref to track if we've already processed this data
  const processedDataKeyRef = useRef<string>('');

  // Fetch property metadata and token addresses
  useEffect(() => {
    async function fetchPropertyData() {
      // Only log debug info if addresses are configured (to reduce noise)
      if (contractAddresses?.registry && contractAddresses?.factory404) {
        console.log('🔍 useERC404Tokens: Starting fetch', {
          registry: contractAddresses.registry,
          factory404: contractAddresses.factory404,
          accounts: allAccountAddresses,
          isLoading: registryQueries.isLoading,
          hasData: !!registryQueries.data,
          isConnected,
          initialized: appKitState.initialized,
        });
      }

      if (!contractAddresses?.registry || !contractAddresses?.factory404) {
        // Silently skip if addresses aren't configured - this is expected when ERC404 features aren't needed
        const emptyKey = `empty-${allAccountAddressesKey}`;
        if (processedDataKeyRef.current !== emptyKey) {
          setPropertyTokens([]);
          setPropertyMetadata({});
          setIsLoading(false);
          processedDataKeyRef.current = emptyKey;
        }
        return;
      }

      if (registryQueries.isLoading || !registryQueries.data) {
        console.log('⏳ Waiting for registry queries...', {
          isLoading: registryQueries.isLoading,
          hasData: !!registryQueries.data,
        });
        return;
      }

      // Create a stable key for this data fetch
      const dataKey = JSON.stringify({
        registryData: registryQueries.data?.map(r => r.status === 'success' ? r.result?.toString() : null),
        allAccountAddressesKey,
        registry: contractAddresses.registry,
        factory: contractAddresses.factory404,
      });

      // Skip if we've already processed this data
      if (dataKey === processedDataKeyRef.current && dataKey !== '') {
        return;
      }

      processedDataKeyRef.current = dataKey;

      setIsLoading(true);
      setError(null);

      try {
        const publicClient = createPublicClient({
          chain: sepoliaChain,
          transport: http(),
        });

        const metadataMap: Record<string, PropertyMetadata> = {};
        const tokens: ERC404PropertyToken[] = [];

        // Process assets for each account - FIXED: Use Promise.all with map instead of forEach
        const accountPromises = registryQueries.data.map(async (result, accountIndex): Promise<ERC404PropertyToken[]> => {
          if (result.status !== 'success' || !result.result) {
            console.log(`⚠️ Registry query failed for account ${allAccountAddresses[accountIndex]}:`, result.status);
            return [];
          }

          const accountAddress = allAccountAddresses[accountIndex];
          const assetIds = result.result as bigint[];

          console.log(`📊 Account ${accountAddress} owns ${assetIds?.length || 0} assets:`, assetIds?.map(id => id.toString()));

          // Handle empty asset array
          if (!assetIds || assetIds.length === 0) {
            console.log(`⚠️ No assets found for account ${accountAddress}`);
            return [];
          }

          // Process each asset - FIXED: Use map with Promise.all instead of forEach
          const assetPromises = assetIds.map(async (assetId) => {
            const assetIdStr = assetId.toString();

            try {
              // Try to fetch from API first
              try {
                const apiResponse = await fetch(`/api/real-estate-assets?propertyId=${assetIdStr}`);
                if (apiResponse.ok) {
                  const assets = await apiResponse.json();
                  if (assets && assets.length > 0) {
                    const asset = assets[0];
                    metadataMap[assetIdStr] = {
                      id: asset.id,
                      title: asset.title,
                      imageUrl: asset.imageUrl || '/images/property-placeholder.png',
                      propertyId: asset.propertyId || assetIdStr,
                      tokenContractAddress: asset.tokenContractAddress,
                      tokenPrice: asset.tokenPrice?.toString(),
                      totalTokens: asset.totalTokens?.toString(),
                      availableTokens: asset.availableTokens?.toString(),
                    };
                  }
                }
              } catch (apiError) {
                console.warn('Failed to fetch from API, using contract data:', apiError);
              }

              // Fallback to contract data if API fails
              if (!metadataMap[assetIdStr]) {
                try {
                  const assetData = await (publicClient.readContract({
                    address: contractAddresses.registry as Address,
                    abi: REGISTRY_ABI,
                    functionName: 'getAsset',
                    args: [assetId],
                  } as any)) as readonly [bigint, string, `0x${string}`, number, boolean];

                  const [, title] = assetData;
                  metadataMap[assetIdStr] = {
                    id: assetIdStr,
                    title: title || `Property #${assetIdStr}`,
                    imageUrl: '/images/property-placeholder.png',
                    propertyId: assetIdStr,
                  };
                } catch (contractError) {
                  console.warn(`Failed to fetch asset ${assetIdStr} from contract:`, contractError);
                  // Set minimal metadata even if contract call fails
                  metadataMap[assetIdStr] = {
                    id: assetIdStr,
                    title: `Property #${assetIdStr}`,
                    imageUrl: '/images/property-placeholder.png',
                    propertyId: assetIdStr,
                  };
                }
              }

              // Get token address from factory
              let tokenAddress: Address | null = null;
              
              if (metadataMap[assetIdStr]?.tokenContractAddress) {
                tokenAddress = metadataMap[assetIdStr].tokenContractAddress as Address;
              } else if (contractAddresses.factory404) {
                try {
                  const tokenAddr = await (publicClient.readContract({
                    address: contractAddresses.factory404 as Address,
                    abi: FACTORY_ABI,
                    functionName: 'getTokenAddress',
                    args: [assetId],
                  } as any)) as Address;

                  tokenAddress = tokenAddr && tokenAddr !== '0x0000000000000000000000000000000000000000' 
                    ? tokenAddr 
                    : null;
                } catch (factoryError) {
                  console.warn('Failed to get token address from factory:', factoryError);
                }
              }

              if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
                return null;
              }

              // Fetch token balance and details
              try {
                const [balance, decimals, symbol] = await Promise.all([
                  (publicClient.readContract({
                    address: tokenAddress,
                    abi: ERC20_ABI,
                    functionName: 'balanceOf',
                    args: [accountAddress],
                  } as any)) as Promise<bigint>,
                  (publicClient.readContract({
                    address: tokenAddress,
                    abi: ERC20_ABI,
                    functionName: 'decimals',
                  } as any)) as Promise<number>,
                  (publicClient.readContract({
                    address: tokenAddress,
                    abi: ERC20_ABI,
                    functionName: 'symbol',
                  } as any).catch(() => null)) as Promise<string | null>,
                ]);

                // Only include tokens with non-zero balance
                if (balance === BigInt(0)) {
                  return null;
                }

                const balanceFormatted = formatUnits(balance, decimals);
                const metadata = metadataMap[assetIdStr];

                return {
                  assetId: assetIdStr,
                  tokenAddress,
                  balance: balance.toString(),
                  balanceFormatted,
                  decimals,
                  symbol: symbol || undefined,
                  title: metadata.title,
                  imageUrl: metadata.imageUrl,
                  propertyId: metadata.propertyId,
                  tokenPrice: metadata.tokenPrice,
                  totalTokens: metadata.totalTokens,
                  availableTokens: metadata.availableTokens,
                } as ERC404PropertyToken;
              } catch (tokenError) {
                console.warn(`Failed to fetch token data for ${assetIdStr}:`, tokenError);
                return null;
              }
            } catch (error) {
              console.error(`Failed to process asset ${assetIdStr}:`, error);
              return null;
            }
          });

          // Wait for all assets for this account to be processed
          const accountTokens = await Promise.all(assetPromises);
          const validTokens = accountTokens.filter((token): token is ERC404PropertyToken => token !== null);
          console.log(`✅ Account ${accountAddress} has ${validTokens.length} valid tokens`);
          return validTokens;
        });

        // Wait for all accounts to be processed
        const allAccountTokens = await Promise.all(accountPromises);
        const flattenedTokens = allAccountTokens.flat().filter((token): token is ERC404PropertyToken => token !== null && token !== undefined);

        console.log(`✅ Found ${flattenedTokens.length} total ERC404 property tokens:`, flattenedTokens.map(t => ({
          assetId: t.assetId,
          title: t.title,
          balance: t.balanceFormatted,
          tokenAddress: t.tokenAddress,
        })));

        setPropertyMetadata(metadataMap);
        setPropertyTokens(flattenedTokens);
      } catch (err) {
        console.error('Failed to fetch ERC404 tokens:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch property tokens'));
        // Set empty state on error
        setPropertyTokens([]);
        setPropertyMetadata({});
      } finally {
        setIsLoading(false);
      }
    }

    fetchPropertyData();
    // Note: allAccountAddresses is accessed from closure but including it would cause infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    registryQueries.data,
    registryQueries.isLoading,
    contractAddresses?.registry,
    contractAddresses?.factory404,
    allAccountAddressesKey,
    isConnected,
  ]);

  // Refresh function to force re-fetch ERC404 tokens
  const refresh = useCallback(() => {
    console.log('🔄 Refreshing ERC404 tokens...', {
      registry: contractAddresses?.registry,
      factory404: contractAddresses?.factory404,
      accounts: allAccountAddresses,
    });
    processedDataKeyRef.current = '';
    setIsLoading(true);
    setError(null);
    // Force refetch by invalidating queries
    if (registryQueries.refetch) {
      registryQueries.refetch();
    }
  }, [contractAddresses?.registry, contractAddresses?.factory404, allAccountAddresses, registryQueries]);

  return {
    propertyTokens,
    propertyMetadata,
    isLoading: isLoading || registryQueries.isLoading,
    error,
    accounts: allAccountAddresses,
    refresh,
  };
}

