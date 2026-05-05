/**
 * Contract State Management Store
 * 
 * Comprehensive Zustand store for managing all contract interactions,
 * state synchronization, and AppKit integration for Tokenizin RWA contracts.
 * 
 * Features:
 * - Contract address management (Sepolia deployment)
 * - Real-time contract state monitoring
 * - AppKit wallet integration
 * - Contract function calling (read/write)
 * - Transaction monitoring
 * - Backend synchronization (1-minute polling)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { ethers } from 'ethers';

// ============================================================================
// TYPES
// ============================================================================

export interface ContractAddresses {
  registry: string;
  factory: string;
  factory404: string;
  marketplace: string;
  staking: string;
  rewardDistributor: string;
  revenue: string;
  membership: string;
  proxyAdmin: string;
}

export interface ContractState {
  address: string;
  name: string;
  abi: any[];
  chainId: number;
  lastUpdated: Date | null;
  isInitialized: boolean;
}

export interface ContractFunctionCall {
  contractAddress: string;
  functionName: string;
  args: any[];
  value?: string; // For payable functions
  gasLimit?: string;
}

export interface ContractReadResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: Date;
}

export interface ContractWriteResult {
  success: boolean;
  txHash?: string;
  receipt?: any;
  error?: string;
  timestamp: Date;
  gasUsed?: string;
  blockNumber?: number;
}

export interface ContractEvent {
  name: string;
  args: Record<string, any>;
  blockNumber: number;
  transactionHash: string;
  timestamp: Date;
}

export interface AssetOnChain {
  assetId: number;
  title: string;
  owner: string;
  assetType: string;
  price: string;
  tokenPrice: string;
  totalTokens: number;
  availableTokens: number;
  soldTokens: number;
  status: number; // 0=PENDING, 1=ACTIVE, 2=SOLD_OUT, 3=INACTIVE
  tokenAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TokenBalance {
  tokenAddress: string;
  balance: string;
  symbol: string;
  decimals: number;
  assetId?: number;
  assetTitle?: string;
}

export interface TokenMetadata {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  chainId: number;
  logoURI?: string;
  tokenType: 'ERC20' | 'ERC721' | 'ERC404';
  assetId?: number;
  assetTitle?: string;
  totalSupply?: string;
}

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncError: string | null;
  contractsSynced: string[];
}

// ============================================================================
// STORE STATE
// ============================================================================

interface ContractStoreState {
  // Contract addresses (Sepolia)
  addresses: ContractAddresses;
  
  // Contract states
  contracts: Record<string, ContractState>; // key: contract address
  
  // On-chain assets
  assets: Record<number, AssetOnChain>; // key: assetId
  
  // User token balances
  tokenBalances: Record<string, TokenBalance>; // key: tokenAddress
  
  // Token metadata for AppKit visibility
  tokenMetadata: Record<string, TokenMetadata>; // key: tokenAddress
  
  // Recent function calls
  recentReads: ContractReadResult[];
  recentWrites: ContractWriteResult[];
  
  // Contract events
  recentEvents: ContractEvent[];
  
  // Sync status
  syncStatus: SyncStatus;
  
  // Wallet connection (from AppKit)
  walletAddress: string | null;
  isWalletConnected: boolean;
  
  // Loading states
  isLoading: boolean;
  isReading: boolean;
  isWriting: boolean;
}

interface ContractStoreActions {
  // Contract initialization
  initializeContracts: (addresses: ContractAddresses) => void;
  loadContractABI: (contractName: string) => Promise<any[]>;
  
  // Contract reads (via provider)
  readContract: (call: ContractFunctionCall) => Promise<ContractReadResult>;
  
  // Contract writes (via AppKit wallet)
  writeContract: (call: ContractFunctionCall, walletClient: any) => Promise<ContractWriteResult>;
  
  // Asset management
  fetchAsset: (assetId: number) => Promise<AssetOnChain | null>;
  fetchAllAssets: () => Promise<void>;
  updateAsset: (assetId: number, asset: AssetOnChain) => void;
  
  // Token balance management
  fetchTokenBalances: (walletAddress: string) => Promise<void>;
  updateTokenBalance: (tokenAddress: string, balance: TokenBalance) => void;
  
  // Token metadata management (for AppKit)
  fetchTokenMetadata: (tokenAddress: string, tokenType?: 'ERC20' | 'ERC721' | 'ERC404') => Promise<void>;
  updateTokenMetadata: (tokenAddress: string, metadata: TokenMetadata) => void;
  fetchAllTokenMetadata: () => Promise<void>;
  
  // Event monitoring
  fetchRecentEvents: (contractAddress: string, eventName?: string) => Promise<void>;
  addEvent: (event: ContractEvent) => void;
  
  // Sync with backend
  syncWithBackend: () => Promise<void>;
  startPeriodicSync: () => void;
  stopPeriodicSync: () => void;
  
  // Wallet connection
  setWalletAddress: (address: string | null) => void;
  setWalletConnected: (connected: boolean) => void;
  
  // Utility
  reset: () => void;
  clearRecentCalls: () => void;
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

// Sepolia contract addresses (from latest deployment - updated 2025-12-20)
// Latest addresses from smart-contracts/deployments/sepolia-proxies.json
// Note: Contracts where proxy === implementation are standalone (NOT upgradeable)
const DEFAULT_ADDRESSES: ContractAddresses = {
  registry: process.env.NEXT_PUBLIC_RWA_ASSET_REGISTRY || '0xfDA3a77909867C3612beD96F3A1C52bAfd4D21A3', // RWAAssetRegistry Proxy (upgradeable)
  factory: process.env.NEXT_PUBLIC_RWA_TOKEN_FACTORY || '0x808bB660C12d7f9360C1C8c72dd7763ab96cBB41', // RWATokenFactory Proxy (upgradeable)
  factory404: process.env.NEXT_PUBLIC_RWA_TOKEN_FACTORY_404 || '0x09255e956f179aF8ee57Dba7b665C1c44aAE21Bb', // RWATokenFactory404 (standalone)
  marketplace: process.env.NEXT_PUBLIC_RWA_MARKETPLACE || '0x7dc22ff9CA455d26F315FdbC964F8DCC5F2725Bd', // RWAMarketplace Proxy (upgradeable)
  staking: process.env.NEXT_PUBLIC_RWA_STAKING || '0x0368F457abB189fa08f88B02CAD429a243f15dCe', // RWAStaking Proxy (upgradeable)
  rewardDistributor: '0xda46ff9382dFFb49261774c8C3B0c6Ac5fB7D694', // RWARewardDistributor (standalone - proxy === impl)
  revenue: '0x9DD2B48cA9D7147C30830D3629fDA8C1976F74Db', // RWARevenue (standalone - proxy === impl)
  membership: process.env.NEXT_PUBLIC_MEMBERSHIP_SYSTEM || '0xcb1017dd96C3F2C8FC74C0a558adA1FCD906A6d0', // MembershipSystem Proxy (upgradeable)
  proxyAdmin: '0x1345f35238117b075056EeeF8fBe5e6504c632EB', // ProxyAdmin
};

let syncInterval: NodeJS.Timeout | null = null;

export const useContractStore = create<ContractStoreState & ContractStoreActions>()(
  persist(
    immer((set, get) => ({
      // Initial state
      addresses: DEFAULT_ADDRESSES,
      contracts: {},
      assets: {},
      tokenBalances: {},
      tokenMetadata: {},
      recentReads: [],
      recentWrites: [],
      recentEvents: [],
      syncStatus: {
        isSyncing: false,
        lastSyncTime: null,
        syncError: null,
        contractsSynced: [],
      },
      walletAddress: null,
      isWalletConnected: false,
      isLoading: false,
      isReading: false,
      isWriting: false,

      // ========================================================================
      // CONTRACT INITIALIZATION
      // ========================================================================

      initializeContracts: (addresses: ContractAddresses) => {
        set((state) => {
          state.addresses = addresses;
        });
      },

      loadContractABI: async (contractName: string): Promise<any[]> => {
        try {
          // Load ABI from contracts directory
          const abiModule = await import(`@/lib/contracts/abis/${contractName}`);
          return abiModule.default || abiModule.abi || [];
        } catch (error) {
          console.error(`Failed to load ABI for ${contractName}:`, error);
          return [];
        }
      },

      // ========================================================================
      // CONTRACT READS
      // ========================================================================

      readContract: async (call: ContractFunctionCall): Promise<ContractReadResult> => {
        set((state) => {
          state.isReading = true;
        });

        try {
          // Get RPC provider (avoid invalid URL when env vars missing - prevents "failed to detect network")
          const fromEnv =
            process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
            (process.env.NEXT_PUBLIC_INFURA_API_KEY
              ? `https://sepolia.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_API_KEY}`
              : process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
                ? `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
                : undefined);
          const rpcUrl =
            typeof fromEnv === 'string' && fromEnv.length > 0 && !fromEnv.includes('undefined')
              ? fromEnv
              : 'https://ethereum-sepolia-rpc.publicnode.com';
          const provider = new ethers.JsonRpcProvider(rpcUrl);

          // Load contract ABI (try to determine from address)
          const contractName = Object.entries(get().addresses).find(
            ([_, addr]) => addr.toLowerCase() === call.contractAddress.toLowerCase()
          )?.[0] || 'RWAAssetRegistry';

          const abi = await get().loadContractABI(`${contractName}Upgradeable`);

          if (abi.length === 0) {
            throw new Error(`ABI not found for contract at ${call.contractAddress}`);
          }

          const contract = new ethers.Contract(call.contractAddress, abi, provider);
          const result = await contract[call.functionName](...call.args);

          const readResult: ContractReadResult = {
            success: true,
            data: result,
            timestamp: new Date(),
          };

          set((state) => {
            state.recentReads.unshift(readResult);
            if (state.recentReads.length > 50) {
              state.recentReads = state.recentReads.slice(0, 50);
            }
            state.isReading = false;
          });

          return readResult;
        } catch (error: any) {
          const readResult: ContractReadResult = {
            success: false,
            error: error.message || 'Read failed',
            timestamp: new Date(),
          };

          set((state) => {
            state.recentReads.unshift(readResult);
            state.isReading = false;
          });

          return readResult;
        }
      },

      // ========================================================================
      // CONTRACT WRITES (via AppKit)
      // ========================================================================

      writeContract: async (
        call: ContractFunctionCall,
        walletClient: any
      ): Promise<ContractWriteResult> => {
        if (!walletClient) {
          return {
            success: false,
            error: 'Wallet not connected',
            timestamp: new Date(),
          };
        }

        set((state) => {
          state.isWriting = true;
        });

        try {
          // Create provider from wallet client
          const provider = new ethers.BrowserProvider(walletClient);
          const signer = await provider.getSigner();

          // Load contract ABI
          const contractName = Object.entries(get().addresses).find(
            ([_, addr]) => addr.toLowerCase() === call.contractAddress.toLowerCase()
          )?.[0] || 'RWAAssetRegistry';

          const abi = await get().loadContractABI(`${contractName}Upgradeable`);

          if (abi.length === 0) {
            throw new Error(`ABI not found for contract at ${call.contractAddress}`);
          }

          const contract = new ethers.Contract(call.contractAddress, abi, signer);

          // Prepare transaction options
          const txOptions: any = {};
          if (call.value) {
            txOptions.value = ethers.parseEther(call.value);
          }
          if (call.gasLimit) {
            txOptions.gasLimit = call.gasLimit;
          }

          // Execute transaction
          const tx = await contract[call.functionName](...call.args, txOptions);
          
          const writeResult: ContractWriteResult = {
            success: true,
            txHash: tx.hash,
            timestamp: new Date(),
          };

          set((state) => {
            state.recentWrites.unshift(writeResult);
            if (state.recentWrites.length > 50) {
              state.recentWrites = state.recentWrites.slice(0, 50);
            }
            state.isWriting = false;
          });

          // Wait for confirmation
          const receipt = await tx.wait();

          const confirmedResult: ContractWriteResult = {
            success: receipt.status === 1,
            txHash: receipt.hash,
            receipt,
            gasUsed: receipt.gasUsed.toString(),
            blockNumber: receipt.blockNumber,
            timestamp: new Date(),
          };

          set((state) => {
            const index = state.recentWrites.findIndex((w) => w.txHash === tx.hash);
            if (index !== -1) {
              state.recentWrites[index] = confirmedResult;
            }
          });

          return confirmedResult;
        } catch (error: any) {
          const writeResult: ContractWriteResult = {
            success: false,
            error: error.reason || error.message || 'Write failed',
            timestamp: new Date(),
          };

          set((state) => {
            state.recentWrites.unshift(writeResult);
            state.isWriting = false;
          });

          return writeResult;
        }
      },

      // ========================================================================
      // ASSET MANAGEMENT
      // ========================================================================

      fetchAsset: async (assetId: number): Promise<AssetOnChain | null> => {
        try {
          const result = await get().readContract({
            contractAddress: get().addresses.registry,
            functionName: 'getAsset',
            args: [assetId],
          });

          if (!result.success || !result.data) {
            return null;
          }

          const assetData = result.data;
          const asset: AssetOnChain = {
            assetId: Number(assetData[0]),
            title: assetData[1],
            owner: assetData[2],
            assetType: assetData[3],
            price: assetData[4].toString(),
            tokenPrice: assetData[5].toString(),
            totalTokens: Number(assetData[6]),
            availableTokens: Number(assetData[7]),
            soldTokens: Number(assetData[8]),
            status: Number(assetData[9]),
            createdAt: new Date(Number(assetData[10]) * 1000),
            updatedAt: new Date(Number(assetData[11]) * 1000),
          };

          set((state) => {
            state.assets[assetId] = asset;
          });

          return asset;
        } catch (error) {
          console.error('Failed to fetch asset:', error);
          return null;
        }
      },

      fetchAllAssets: async () => {
        try {
          // Fetch active assets count
          const countResult = await get().readContract({
            contractAddress: get().addresses.registry,
            functionName: 'getActiveAssetsCount',
            args: [],
          });

          if (!countResult.success) {
            throw new Error('Failed to fetch assets count');
          }

          const count = Number(countResult.data);
          const assets: AssetOnChain[] = [];

          // Fetch each asset
          for (let i = 0; i < count; i++) {
            const assetIdResult = await get().readContract({
              contractAddress: get().addresses.registry,
              functionName: 'getActiveAssetId',
              args: [i],
            });

            if (assetIdResult.success) {
              const assetId = Number(assetIdResult.data);
              const asset = await get().fetchAsset(assetId);
              if (asset) {
                assets.push(asset);
              }
            }
          }

          set((state) => {
            assets.forEach((asset) => {
              state.assets[asset.assetId] = asset;
            });
          });
        } catch (error) {
          console.error('Failed to fetch all assets:', error);
        }
      },

      updateAsset: (assetId: number, asset: AssetOnChain) => {
        set((state) => {
          state.assets[assetId] = asset;
        });
      },

      // ========================================================================
      // TOKEN BALANCE MANAGEMENT
      // ========================================================================

      fetchTokenBalances: async (walletAddress: string) => {
        try {
          // Fetch balances from backend (which monitors contracts)
          const response = await fetch(`/api/blockchain/token-balances/${walletAddress}`, {
            credentials: 'include',
          });

          if (!response.ok) {
            throw new Error('Failed to fetch token balances');
          }

          const { balances } = await response.json();

          set((state) => {
            balances.forEach((balance: TokenBalance) => {
              state.tokenBalances[balance.tokenAddress] = balance;
            });
          });
        } catch (error) {
          console.error('Failed to fetch token balances:', error);
        }
      },

      updateTokenBalance: (tokenAddress: string, balance: TokenBalance) => {
        set((state) => {
          state.tokenBalances[tokenAddress] = balance;
        });
      },

      // ========================================================================
      // TOKEN METADATA MANAGEMENT (for AppKit visibility)
      // ========================================================================

      fetchTokenMetadata: async (tokenAddress: string, tokenType?: 'ERC20' | 'ERC721' | 'ERC404') => {
        try {
          const params = new URLSearchParams({ address: tokenAddress });
          if (tokenType) {
            params.append('type', tokenType);
          }

          const response = await fetch(`/api/tokens/metadata?${params.toString()}`, {
            credentials: 'include',
          });

          if (!response.ok) {
            throw new Error('Failed to fetch token metadata');
          }

          const { metadata } = await response.json();

          if (metadata) {
            set((state) => {
              state.tokenMetadata[tokenAddress.toLowerCase()] = metadata;
            });
          }
        } catch (error) {
          console.error('Failed to fetch token metadata:', error);
        }
      },

      updateTokenMetadata: (tokenAddress: string, metadata: TokenMetadata) => {
        set((state) => {
          state.tokenMetadata[tokenAddress.toLowerCase()] = metadata;
        });
      },

      fetchAllTokenMetadata: async () => {
        try {
          // Get all asset tokens from database
          const response = await fetch('/api/tokens/user', {
            credentials: 'include',
          });

          if (!response.ok) {
            throw new Error('Failed to fetch user tokens');
          }

          const { tokens } = await response.json();

          if (tokens && Array.isArray(tokens)) {
            set((state) => {
              tokens.forEach((token: TokenMetadata) => {
                state.tokenMetadata[token.address.toLowerCase()] = token;
              });
            });
          }
        } catch (error) {
          console.error('Failed to fetch all token metadata:', error);
        }
      },

      // ========================================================================
      // EVENT MONITORING
      // ========================================================================

      fetchRecentEvents: async (contractAddress: string, eventName?: string) => {
        try {
          const response = await fetch(
            `/api/blockchain/events/${contractAddress}${eventName ? `?eventName=${eventName}` : ''}`,
            { credentials: 'include' }
          );

          if (!response.ok) {
            throw new Error('Failed to fetch events');
          }

          const { events } = await response.json();

          set((state) => {
            events.forEach((event: ContractEvent) => {
              state.recentEvents.unshift(event);
            });
            if (state.recentEvents.length > 100) {
              state.recentEvents = state.recentEvents.slice(0, 100);
            }
          });
        } catch (error) {
          console.error('Failed to fetch events:', error);
        }
      },

      addEvent: (event: ContractEvent) => {
        set((state) => {
          state.recentEvents.unshift(event);
          if (state.recentEvents.length > 100) {
            state.recentEvents = state.recentEvents.slice(0, 100);
          }
        });
      },

      // ========================================================================
      // BACKEND SYNC
      // ========================================================================

      syncWithBackend: async () => {
        set((state) => {
          state.syncStatus.isSyncing = true;
          state.syncStatus.syncError = null;
        });

        try {
          const response = await fetch('/api/blockchain/sync', {
            method: 'POST',
            credentials: 'include',
          });

          if (!response.ok) {
            throw new Error('Sync failed');
          }

          const { data } = await response.json();

          // Update assets from backend sync
          if (data.assets) {
            set((state) => {
              data.assets.forEach((asset: AssetOnChain) => {
                state.assets[asset.assetId] = asset;
              });
            });
          }

          // Update token balances
          if (data.tokenBalances && get().walletAddress) {
            await get().fetchTokenBalances(get().walletAddress!);
          }

          set((state) => {
            state.syncStatus.isSyncing = false;
            state.syncStatus.lastSyncTime = new Date();
            state.syncStatus.contractsSynced = data.contractsSynced || [];
          });
        } catch (error: any) {
          set((state) => {
            state.syncStatus.isSyncing = false;
            state.syncStatus.syncError = error.message || 'Sync failed';
          });
        }
      },

      startPeriodicSync: () => {
        // Stop existing interval if any
        if (syncInterval) {
          clearInterval(syncInterval);
        }

        // Sync immediately
        get().syncWithBackend();

        // Then sync every 1 minute
        syncInterval = setInterval(() => {
          get().syncWithBackend();
        }, 60000); // 1 minute
      },

      stopPeriodicSync: () => {
        if (syncInterval) {
          clearInterval(syncInterval);
          syncInterval = null;
        }
      },

      // ========================================================================
      // WALLET CONNECTION
      // ========================================================================

      setWalletAddress: (address: string | null) => {
        set((state) => {
          state.walletAddress = address;
          if (address) {
            // Fetch balances when wallet connects
            get().fetchTokenBalances(address);
          }
        });
      },

      setWalletConnected: (connected: boolean) => {
        set((state) => {
          state.isWalletConnected = connected;
        });
      },

      // ========================================================================
      // UTILITY
      // ========================================================================

      reset: () => {
        set((state) => {
          state.assets = {};
          state.tokenBalances = {};
          state.recentReads = [];
          state.recentWrites = [];
          state.recentEvents = [];
          state.syncStatus = {
            isSyncing: false,
            lastSyncTime: null,
            syncError: null,
            contractsSynced: [],
          };
        });
      },

      clearRecentCalls: () => {
        set((state) => {
          state.recentReads = [];
          state.recentWrites = [];
        });
      },
    })),
    {
      name: 'contract-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        addresses: state.addresses,
        contracts: state.contracts,
        assets: state.assets,
        syncStatus: state.syncStatus,
      }),
    }
  )
);

// ============================================================================
// SELECTORS
// ============================================================================

export const selectContractAddresses = (state: ContractStoreState & ContractStoreActions) => state.addresses;
export const selectAssets = (state: ContractStoreState & ContractStoreActions) => state.assets;
export const selectTokenBalances = (state: ContractStoreState & ContractStoreActions) => state.tokenBalances;
export const selectSyncStatus = (state: ContractStoreState & ContractStoreActions) => state.syncStatus;
export const selectIsSyncing = (state: ContractStoreState & ContractStoreActions) => state.syncStatus.isSyncing;

