/**
 * Contract Service
 * 
 * Uses RPC endpoints to call contracts with ABIs from smart contract admin
 */

import { Address, createPublicClient, http } from 'viem';
import { sepoliaChain } from '../../config';
import type { PublicClient } from 'viem';

// Standard ERC20 ABI (minimal for balance queries)
export const ERC20_ABI = [
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
  {
    name: 'name',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// RWA Token ABI (extends ERC20 with RWA-specific functions)
export const RWA_TOKEN_ABI = [
  ...ERC20_ABI,
  {
    name: 'getTokenHolders',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address[]' }],
  },
  {
    name: 'getTokenHolderBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'holder', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'assetId',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// RWATokenFactory ABI (for querying token addresses)
export const RWA_TOKEN_FACTORY_ABI = [
  {
    name: 'getTokenAddress',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'assetId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'getAssetId',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenAddress', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'isValidToken',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenAddress', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

// RWAAssetRegistry ABI (for querying asset details)
export const RWA_ASSET_REGISTRY_ABI = [
  {
    name: 'getAsset',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'assetId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'owner', type: 'address' },
          { name: 'title', type: 'string' },
          { name: 'description', type: 'string' },
          { name: 'assetType', type: 'string' },
          { name: 'location', type: 'string' },
          { name: 'price', type: 'uint256' },
          { name: 'tokenPrice', type: 'uint256' },
          { name: 'totalTokens', type: 'uint256' },
          { name: 'soldTokens', type: 'uint256' },
          { name: 'status', type: 'uint8' },
        ],
      },
    ],
  },
  {
    name: 'getTotalAssets',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

/**
 * Get Sepolia RPC URL - INFURA ONLY
 * Priority: Custom Infura URL > SEPOLIA_RPC_URL (if Infura) > NEXT_PUBLIC_SEPOLIA_RPC_URL (if Infura) > INFURA_API_KEY > NEXT_PUBLIC_INFURA_API_KEY
 * Falls back to error if no Infura key is configured
 */
function getSepoliaRpcUrl(customUrl?: string): string {
  // 1. Custom URL (highest priority - passed as parameter, must be Infura)
  if (customUrl) {
    if (customUrl.includes('infura.io')) {
      console.log('✅ [Contract Service] Using custom Infura RPC URL');
      return customUrl;
    } else {
      console.warn('⚠️  [Contract Service] Custom URL is not Infura, ignoring. Only Infura RPC is allowed.');
    }
  }
  
  // 2. Server-side RPC URL (from .env.local) - must be Infura
  if (process.env.SEPOLIA_RPC_URL) {
    if (process.env.SEPOLIA_RPC_URL.includes('infura.io')) {
      console.log('✅ [Contract Service] Using SEPOLIA_RPC_URL (Infura) from environment');
      return process.env.SEPOLIA_RPC_URL;
    } else {
      console.warn('⚠️  [Contract Service] SEPOLIA_RPC_URL is not Infura, ignoring. Only Infura RPC is allowed.');
    }
  }
  
  // 3. Client-side RPC URL - must be Infura
  if (process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL) {
    if (process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL.includes('infura.io')) {
      console.log('✅ [Contract Service] Using NEXT_PUBLIC_SEPOLIA_RPC_URL (Infura) from environment');
      return process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;
    } else {
      console.warn('⚠️  [Contract Service] NEXT_PUBLIC_SEPOLIA_RPC_URL is not Infura, ignoring. Only Infura RPC is allowed.');
    }
  }
  
  // 4. Server-side Infura API key (preferred)
  if (process.env.INFURA_API_KEY) {
    const infuraUrl = `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`;
    console.log('✅ [Contract Service] Using Infura RPC from INFURA_API_KEY');
    return infuraUrl;
  }
  
  // 5. Client-side Infura API key (fallback)
  if (process.env.NEXT_PUBLIC_INFURA_API_KEY) {
    const infuraUrl = `https://sepolia.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_API_KEY}`;
    console.log('✅ [Contract Service] Using Infura RPC from NEXT_PUBLIC_INFURA_API_KEY');
    return infuraUrl;
  }
  
  // 6. No Infura key found - throw error
  const errorMsg = '❌ [Contract Service] INFURA_API_KEY or NEXT_PUBLIC_INFURA_API_KEY must be configured. Only Infura RPC is allowed.';
  console.error(errorMsg);
  throw new Error(errorMsg);
}

/**
 * Create public client with RPC endpoint
 * Uses Infura from .env.local if available
 */
export function createRPCClient(rpcUrl?: string) {
  const rpcUrlToUse = getSepoliaRpcUrl(rpcUrl);
  
  // Log which RPC is being used (mask API keys)
  const maskedUrl = rpcUrlToUse.includes('infura.io') 
    ? rpcUrlToUse.replace(/\/v3\/[^/]+/, '/v3/***')
    : rpcUrlToUse.includes('alchemy.com')
    ? rpcUrlToUse.replace(/\/v2\/[^/]+/, '/v2/***')
    : rpcUrlToUse;
  
  console.log(`🔗 [Contract Service] Using RPC: ${maskedUrl.substring(0, 60)}...`);

  return createPublicClient({
    chain: sepoliaChain,
    transport: http(rpcUrlToUse, {
      timeout: 10000, // Increased timeout for Infura
      retryCount: 2, // Retry twice for better reliability
      retryDelay: 1000, // Wait 1s between retries
    }),
  });
}

/**
 * Get token balance using RPC call with contract ABI
 * 
 * ⚡ PERFORMANCE OPTIMIZATION:
 * - Checks KNOWN_TOKEN_METADATA cache first
 * - If token is known, only fetches balance (1 RPC call instead of 4)
 * - If token is unknown, fetches balance + metadata (4 RPC calls)
 * 
 * This reduces Infura rate limiting by 75% for known tokens.
 */
export async function getTokenBalanceRPC(
  publicClient: Awaited<ReturnType<typeof createRPCClient>>,
  tokenAddress: Address,
  walletAddress: Address,
  abi: typeof ERC20_ABI = ERC20_ABI
): Promise<{ balance: bigint; decimals: number; symbol?: string; name?: string }> {
  try {
    // Validate tokenAddress is a valid string/Address
    if (!tokenAddress || typeof tokenAddress !== 'string') {
      throw new Error(`Invalid tokenAddress: ${tokenAddress} (type: ${typeof tokenAddress})`);
    }
    
    // Check if we have cached metadata for this token
    const tokenKey = tokenAddress.toLowerCase();
    const cachedMetadata = KNOWN_TOKEN_METADATA[tokenKey];
    
    if (cachedMetadata) {
      // ✅ PERFORMANCE: Only fetch balance for known tokens (1 RPC call)
      console.log(`⚡ [Contract Service] Using cached metadata for token ${tokenAddress} (${cachedMetadata.symbol})`);
      const balance = await publicClient.readContract({
        address: tokenAddress,
        abi,
        functionName: 'balanceOf',
        args: [walletAddress],
      } as any) as bigint;
      
      return {
        balance,
        decimals: cachedMetadata.decimals,
        symbol: cachedMetadata.symbol,
        name: cachedMetadata.name,
      };
    }
    
    // Token not in cache - fetch everything (4 RPC calls)
    console.log(`🔍 [Contract Service] Fetching metadata for unknown token ${tokenAddress}`);
    const [balance, decimals, symbol, name] = await Promise.all([
      publicClient.readContract({
        address: tokenAddress,
        abi,
        functionName: 'balanceOf',
        args: [walletAddress],
      } as any) as Promise<bigint>,
      publicClient.readContract({
        address: tokenAddress,
        abi,
        functionName: 'decimals',
      } as any) as Promise<number>,
      publicClient.readContract({
        address: tokenAddress,
        abi,
        functionName: 'symbol',
      } as any).catch(() => undefined) as Promise<string | undefined>,
      publicClient.readContract({
        address: tokenAddress,
        abi,
        functionName: 'name',
      } as any).catch(() => undefined) as Promise<string | undefined>,
    ]);

    return { balance, decimals, symbol, name };
  } catch (error) {
    console.error(`Error fetching token balance for ${tokenAddress}:`, error);
    throw error;
  }
}

/**
 * Get token address from factory contract
 */
export async function getTokenAddressFromFactory(
  publicClient: Awaited<ReturnType<typeof createRPCClient>>,
  factoryAddress: Address,
  assetId: bigint
): Promise<Address | null> {
  try {
    const tokenAddress = await publicClient.readContract({
      address: factoryAddress,
      abi: RWA_TOKEN_FACTORY_ABI,
      functionName: 'getTokenAddress',
      args: [assetId],
    } as any) as Address;

    return tokenAddress;
  } catch (error) {
    console.error(`Error fetching token address from factory for asset ${assetId}:`, error);
    return null;
  }
}

/**
 * Get asset details from registry
 */
export async function getAssetFromRegistry(
  publicClient: Awaited<ReturnType<typeof createRPCClient>>,
  registryAddress: Address,
  assetId: bigint
): Promise<any | null> {
  try {
    const asset = await publicClient.readContract({
      address: registryAddress,
      abi: RWA_ASSET_REGISTRY_ABI,
      functionName: 'getAsset',
      args: [assetId],
    } as any);

    return asset;
  } catch (error) {
    console.error(`Error fetching asset ${assetId} from registry:`, error);
    return null;
  }
}

/**
 * Contract addresses (Sepolia Testnet)
 */
export const CONTRACT_ADDRESSES = {
  RWAAssetRegistry: (process.env.NEXT_PUBLIC_RWA_ASSET_REGISTRY || '0xe2d49642B5aE5D0f62dA79D572d04cA95dB2853D') as Address,
  RWATokenFactory: (process.env.NEXT_PUBLIC_RWA_TOKEN_FACTORY || '0x2f051A127Ab4B8b0D78aB5758E06a808a8445566') as Address,
  RWATokenFactory404: (process.env.NEXT_PUBLIC_RWA_TOKEN_FACTORY_404 || '0xdC2AE75dC0D14E2f450156bE83c1F71920b6a896') as Address,
  RWAMarketplace: (process.env.NEXT_PUBLIC_RWA_MARKETPLACE || '0xc9C369525DFf385935dfDC6aC2F678C26998D0d7') as Address,
  USDC: (process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238') as Address,
  USDT: (process.env.NEXT_PUBLIC_USDT_ADDRESS || '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0') as Address, // Sepolia USDT (Tether USD)
  EURC: (process.env.NEXT_PUBLIC_EURC_ADDRESS || '0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4') as Address,
  TKNZN: (process.env.NEXT_PUBLIC_TPT_ADDRESS || process.env.NEXT_PUBLIC_TIGER_PALACE_TOKEN_CONTRACT_ADDRESS || '0xb0af8e94C74c2346609c3d94FCba61Ae85cf3e6e') as Address,
};

/**
 * ⚡ PERFORMANCE: Static token metadata cache to reduce RPC calls
 * 
 * Token metadata (decimals, symbol, name) never changes, so we hardcode them
 * instead of fetching via RPC every time. This reduces 3 RPC calls per token to 0.
 * 
 * Benefits:
 * - Reduces RPC calls from 13 to 4 per wallet balance fetch (1 ETH + 3 token balances)
 * - Prevents Infura rate limiting (HTTP 429 errors)
 * - Faster response times
 */
export const KNOWN_TOKEN_METADATA: Record<string, { decimals: number; symbol: string; name: string }> = {
  // USDC (Sepolia)
  '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238': {
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin',
  },
  // EURC (Sepolia)
  '0x08210f9170f89ab7658f0b5e3ff39b0e03c594d4': {
    decimals: 6,
    symbol: 'EURC',
    name: 'Euro Coin',
  },
  // TKNZN (Tokenizin Token - ERC404)
  '0xb0af8e94c74c2346609c3d94fcba61ae85cf3e6e': {
    decimals: 18,
    symbol: 'TKNZN',
    name: 'Tokenizin Token',
  },
};

