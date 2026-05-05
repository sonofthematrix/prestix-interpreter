/**
 * Token Registry for AppKit Swap Dialog
 *
 * Registers ETH, WETH, USDC, EURC, and Tokenizin Token (TKNZN) with AppKit
 * so they appear in the Swap and WalletSend views on Sepolia.
 */

import type { CaipNetwork, CaipNetworkId } from '@reown/appkit-common'
import type { SwapTokenWithBalance } from '../utils/TypeUtil'

// Token metadata interface
export interface TokenMetadata {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  logoURI?: string;
}

// Sepolia chain ID and CAIP network ID
const SEPOLIA_CHAIN_ID = 11155111;
export const SEPOLIA_CAIP_NETWORK_ID = 'eip155:11155111' as CaipNetworkId;

function getSepoliaRpcUrl(): string {
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SEPOLIA_RPC_URL) {
    return process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;
  }
  return 'https://ethereum-sepolia-rpc.publicnode.com';
}

/**
 * Minimal Sepolia CaipNetwork for balance fetching when used via appkit-controllers shim.
 * Used so we don't depend on ChainController.state (which may be a different singleton).
 */
export function getSepoliaCaipNetwork(): CaipNetwork {
  return {
    caipNetworkId: SEPOLIA_CAIP_NETWORK_ID,
    chainNamespace: 'eip155',
    id: SEPOLIA_CHAIN_ID,
    name: 'Sepolia',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: [getSepoliaRpcUrl()] },
      public: { http: [getSepoliaRpcUrl()] },
    },
  } as CaipNetwork;
}

// Native ETH address (zero address)
const NATIVE_ETH_ADDRESS = '0x0000000000000000000000000000000000000000';

// WETH on Sepolia (Uniswap-compatible)
const WETH_SEPOLIA_ADDRESS = '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14';

/** Sepolia-supported token addresses (Pimlico / standard testnet) */
const SEPOLIA_TOKEN_ADDRESSES = {
  usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  usdc2: '0xbe72E441BF55620febc26715db68d3494213D8Cb',
  eurc: '0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4',
  eure: '0x67b34b93ac295c985e856E5B8A20D83026b580Eb',
  pim: '0xFC3e86566895Fb007c6A0d3809eb2827DF94F751',
  usdt: '0xd077A400968890Eacc75cdc901F0356c943e4fDb', // USD₮
  tpt: '0xb0af8e94C74c2346609c3d94FCba61Ae85cf3e6e',
} as const;

/**
 * Get token addresses from environment variables or fallback to known Sepolia addresses
 */
function getTokenAddresses(): {
  usdc: string;
  usdc2: string;
  eurc: string;
  eure: string;
  pim: string;
  usdt: string;
  tpt: string;
} {
  return {
    usdc: process.env.NEXT_PUBLIC_USDC_ADDRESS || SEPOLIA_TOKEN_ADDRESSES.usdc,
    usdc2: process.env.NEXT_PUBLIC_USDC_2_ADDRESS || SEPOLIA_TOKEN_ADDRESSES.usdc2,
    eurc: process.env.NEXT_PUBLIC_EURC_ADDRESS || SEPOLIA_TOKEN_ADDRESSES.eurc,
    eure: process.env.NEXT_PUBLIC_EURE_ADDRESS || SEPOLIA_TOKEN_ADDRESSES.eure,
    pim: process.env.NEXT_PUBLIC_PIM_ADDRESS || SEPOLIA_TOKEN_ADDRESSES.pim,
    usdt: process.env.NEXT_PUBLIC_USDT_ADDRESS || SEPOLIA_TOKEN_ADDRESSES.usdt,
    tpt: process.env.NEXT_PUBLIC_TPT_ADDRESS || process.env.NEXT_PUBLIC_TIGER_PALACE_TOKEN_CONTRACT_ADDRESS || SEPOLIA_TOKEN_ADDRESSES.tpt,
  };
}

/**
 * Build base token list for Sepolia (ETH, WETH, USDC, EURC, TKNZN).
 * Exported for BalanceUtil to use when building custom balances for WalletSend.
 */
export function getSepoliaBaseTokens(): TokenMetadata[] {
  const addresses = getTokenAddresses();
  const tokens: TokenMetadata[] = [
    {
      address: NATIVE_ETH_ADDRESS,
      symbol: 'ETH',
      name: 'Ether',
      decimals: 18,
      chainId: SEPOLIA_CHAIN_ID,
      logoURI: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    },
    {
      address: WETH_SEPOLIA_ADDRESS.toLowerCase(),
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
      chainId: SEPOLIA_CHAIN_ID,
      logoURI: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
    },
  ];

  if (addresses.usdc) {
    tokens.push({
      address: addresses.usdc.toLowerCase(),
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      chainId: SEPOLIA_CHAIN_ID,
      logoURI: '/tokens/usdc.png',
    });
  }
  if (addresses.usdc2) {
    tokens.push({
      address: addresses.usdc2.toLowerCase(),
      symbol: 'USDC',
      name: 'USD Coin (2)',
      decimals: 6,
      chainId: SEPOLIA_CHAIN_ID,
      logoURI: '/tokens/usdc.png',
    });
  }

  if (addresses.eurc) {
    tokens.push({
      address: addresses.eurc.toLowerCase(),
      symbol: 'EURC',
      name: 'Euro Coin',
      decimals: 6,
      chainId: SEPOLIA_CHAIN_ID,
      logoURI: '/tokens/eurc.png',
    });
  }
  if (addresses.eure) {
    tokens.push({
      address: addresses.eure.toLowerCase(),
      symbol: 'EURe',
      name: 'Euro (e-money)',
      decimals: 18,
      chainId: SEPOLIA_CHAIN_ID,
    });
  }
  if (addresses.pim) {
    tokens.push({
      address: addresses.pim.toLowerCase(),
      symbol: 'PIM',
      name: 'Pimlico',
      decimals: 18,
      chainId: SEPOLIA_CHAIN_ID,
    });
  }
  if (addresses.usdt) {
    tokens.push({
      address: addresses.usdt.toLowerCase(),
      symbol: 'USD₮',
      name: 'Tether USD',
      decimals: 6,
      chainId: SEPOLIA_CHAIN_ID,
    });
  }

  if (addresses.tpt) {
    tokens.push({
      address: addresses.tpt.toLowerCase(),
      symbol: 'TKNZN',
      name: 'Tokenizin Token',
      decimals: 18,
      chainId: SEPOLIA_CHAIN_ID,
      logoURI: '/tokens/daoble.png',
    });
  }

  return tokens;
}

/**
 * Get registered tokens for AppKit swap dialog (legacy - excludes ETH/WETH)
 */
export function getSwapTokens(): TokenMetadata[] {
  const addresses = getTokenAddresses();
  const tokens: TokenMetadata[] = [];

  if (addresses.usdc) {
    tokens.push({
      address: addresses.usdc.toLowerCase(),
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      chainId: SEPOLIA_CHAIN_ID,
      logoURI: '/tokens/usdc.png',
    });
  }
  if (addresses.usdc2) {
    tokens.push({
      address: addresses.usdc2.toLowerCase(),
      symbol: 'USDC',
      name: 'USD Coin (2)',
      decimals: 6,
      chainId: SEPOLIA_CHAIN_ID,
      logoURI: '/tokens/usdc.png',
    });
  }

  if (addresses.eurc) {
    tokens.push({
      address: addresses.eurc.toLowerCase(),
      symbol: 'EURC',
      name: 'Euro Coin',
      decimals: 6,
      chainId: SEPOLIA_CHAIN_ID,
      logoURI: '/tokens/eurc.png',
    });
  }
  if (addresses.eure) {
    tokens.push({
      address: addresses.eure.toLowerCase(),
      symbol: 'EURe',
      name: 'Euro (e-money)',
      decimals: 18,
      chainId: SEPOLIA_CHAIN_ID,
    });
  }
  if (addresses.pim) {
    tokens.push({
      address: addresses.pim.toLowerCase(),
      symbol: 'PIM',
      name: 'Pimlico',
      decimals: 18,
      chainId: SEPOLIA_CHAIN_ID,
    });
  }
  if (addresses.usdt) {
    tokens.push({
      address: addresses.usdt.toLowerCase(),
      symbol: 'USD₮',
      name: 'Tether USD',
      decimals: 6,
      chainId: SEPOLIA_CHAIN_ID,
    });
  }

  if (addresses.tpt) {
    tokens.push({
      address: addresses.tpt.toLowerCase(),
      symbol: 'TKNZN',
      name: 'Tokenizin Token',
      decimals: 18,
      chainId: SEPOLIA_CHAIN_ID,
      logoURI: '/tokens/daoble.png',
    });
  }

  return tokens;
}

/**
 * Convert TokenMetadata to CAIP address format (eip155:chainId:address)
 */
function toCaipAddress(token: TokenMetadata): string {
  return `${SEPOLIA_CAIP_NETWORK_ID}:${token.address}`;
}

/**
 * Convert TokenMetadata to SwapTokenWithBalance format (zero balance, for token list)
 */
function toSwapTokenWithBalance(token: TokenMetadata): SwapTokenWithBalance {
  const caipAddress = toCaipAddress(token);
  return {
    name: token.name,
    symbol: token.symbol,
    address: caipAddress as SwapTokenWithBalance['address'],
    decimals: token.decimals,
    logoUri: token.logoURI || '',
    eip2612: false,
    quantity: { decimals: token.decimals.toString(), numeric: '0' },
    price: 0,
    value: 0,
  };
}

// Cache for API-fetched tokens (5 min TTL)
let apiTokensCache: { tokens: SwapTokenWithBalance[]; timestamp: number } | null = null;
const API_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Fetch swap tokens from internal API (includes RWA tokens from database).
 * Cached for 5 minutes to avoid repeated requests.
 */
export async function fetchSwapTokensFromApi(): Promise<SwapTokenWithBalance[]> {
  if (apiTokensCache && Date.now() - apiTokensCache.timestamp < API_CACHE_TTL_MS) {
    return apiTokensCache.tokens;
  }

  try {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const res = await fetch(`${baseUrl}/api/swap-tokens`, { cache: 'no-store' });
    if (!res.ok) return [];

    const data = await res.json();
    const tokens = (data.tokens || []).map((t: any) => ({
      ...t,
      eip2612: false,
    })) as SwapTokenWithBalance[];

    apiTokensCache = { tokens, timestamp: Date.now() };
    return tokens;
  } catch {
    return [];
  }
}

/**
 * Get custom swap tokens for a network in SwapTokenWithBalance format.
 * Used when WalletConnect API returns empty (e.g. Sepolia).
 * Fetches from /api/swap-tokens when available (includes RWA tokens).
 */
export async function getCustomSwapTokensForNetworkAsync(
  caipNetworkId?: CaipNetworkId
): Promise<SwapTokenWithBalance[]> {
  if (caipNetworkId !== SEPOLIA_CAIP_NETWORK_ID) {
    return [];
  }

  const apiTokens = await fetchSwapTokensFromApi();
  if (apiTokens.length > 0) {
    return apiTokens;
  }

  const baseTokens = getSepoliaBaseTokens();
  return baseTokens.map(toSwapTokenWithBalance);
}

/**
 * Synchronous version - returns base tokens only (no RWA from API).
 * Use getCustomSwapTokensForNetworkAsync when RWA tokens are needed.
 */
export function getCustomSwapTokensForNetwork(caipNetworkId?: CaipNetworkId): SwapTokenWithBalance[] {
  if (caipNetworkId !== SEPOLIA_CAIP_NETWORK_ID) {
    return [];
  }
  const baseTokens = getSepoliaBaseTokens();
  return baseTokens.map(toSwapTokenWithBalance);
}

/**
 * Register tokens with wagmi/AppKit
 * This makes tokens available in the swap dialog
 */
export function registerSwapTokens(): void {
  if (typeof window === 'undefined') {
    return; // Only run on client side
  }

  try {
    const tokens = getSwapTokens();
    
    // Store tokens in window for AppKit to access
    if (!(window as any).__appkitSwapTokens) {
      (window as any).__appkitSwapTokens = tokens;
    }

    // Register with wagmi if available
    const wagmi = (window as any).wagmi;
    if (wagmi && wagmi.config) {
      // Wagmi will automatically detect tokens when queried
      console.log('✅ [Token Registry] Registered tokens for swap:', tokens.map(t => t.symbol).join(', '));
    }

    console.log('✅ [Token Registry] Swap tokens registered:', tokens.length, tokens.map(t => `${t.symbol} (${t.address.substring(0, 10)}...)`).join(', '));
  } catch (error) {
    console.error('❌ [Token Registry] Error registering swap tokens:', error);
  }
}

/**
 * Get token by address
 */
export function getTokenByAddress(address: string): TokenMetadata | null {
  const tokens = getSwapTokens();
  const normalizedAddress = address.toLowerCase();
  return tokens.find(t => t.address.toLowerCase() === normalizedAddress) || null;
}

/**
 * Get token by symbol
 */
export function getTokenBySymbol(symbol: string): TokenMetadata | null {
  const tokens = getSwapTokens();
  return tokens.find(t => t.symbol.toUpperCase() === symbol.toUpperCase()) || null;
}

