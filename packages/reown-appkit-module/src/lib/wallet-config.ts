import dynamic from 'next/dynamic';
import type { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import type { Config } from 'wagmi';
import type { Chain } from 'viem';

// Primary project ID - must match Reown Cloud (prestix-app). Same as root src/lib/reown-project-id.ts
const PRODUCTION_PROJECT_ID = '122878b95737e1300958ec73a8c0b61a'

// Read Project ID from environment variables with fallback to production ID
// This ensures wallets work in production even if env var is not set
export const projectId = (process.env.NEXT_PUBLIC_PROJECT_ID || PRODUCTION_PROJECT_ID) as string;

// Only warn in development if project ID is not set (production has fallback)
if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_PROJECT_ID) {
  console.warn('⚠️  NEXT_PUBLIC_PROJECT_ID is not set. Using production fallback. Consider setting it in .env.local');
}

/**
 * Get custom RPC URL for Sepolia network
 * Priority: NEXT_PUBLIC_SEPOLIA_RPC_URL > Infura > Alchemy > Public RPC
 */
function getEthereumRpcUrl(): string {
  if (process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL) return process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL;
  if (process.env.NEXT_PUBLIC_INFURA_API_KEY) return `https://mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_API_KEY}`;
  if (process.env.NEXT_PUBLIC_ALCHEMY_API_KEY) return `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`;
  return 'https://ethereum-rpc.publicnode.com';
}

function getSepoliaRpcUrl(): string {
  if (process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL) return process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;
  if (process.env.NEXT_PUBLIC_INFURA_API_KEY) return `https://sepolia.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_API_KEY}`;
  if (process.env.NEXT_PUBLIC_ALCHEMY_API_KEY) return `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`;
  return 'https://ethereum-sepolia-rpc.publicnode.com';
}

// Ethereum Mainnet (numeric chainId to avoid BigInt issues)
const customEthereum: Chain = {
  id: 1,
  name: 'Ethereum',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [getEthereumRpcUrl()] },
    public: { http: [getEthereumRpcUrl()] },
  },
  blockExplorers: {
    default: { name: 'Etherscan', url: 'https://etherscan.io' },
  },
  testnet: false,
} as Chain;

/**
 * Sepolia Testnet (numeric chainId, custom RPCs)
 */
const customSepolia: Chain = {
  id: 11155111, // Explicit numeric chain ID (not BigInt) - prevents Math.pow errors
  name: 'Sepolia',
  nativeCurrency: {
    name: 'Sepolia Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [getSepoliaRpcUrl()],
    },
    public: {
      http: [getSepoliaRpcUrl()],
    },
  },
  blockExplorers: {
    default: {
      name: 'Etherscan',
      url: 'https://sepolia.etherscan.io',
    },
  },
  testnet: true,
} as Chain;

// Define supported networks - mainnet default, Sepolia available for testing
export const networks = [customEthereum, customSepolia];

// Lazy-load WagmiAdapter only on client side to avoid SSR issues
// AppKit adapter handles all wallet connectivity through wagmi connectors
let wagmiAdapterInstance: WagmiAdapter | null = null;
let wagmiConfigInstance: Config | null = null;

/**
 * Get or create WagmiAdapter instance (client-side only)
 * AppKit adapter manages wallet connectivity - no direct wallet SDK dependencies needed
 */
export function getWagmiAdapter(): WagmiAdapter {
  if (typeof window === 'undefined') {
    throw new Error('WagmiAdapter can only be created on the client side');
  }

  if (!wagmiAdapterInstance) {
    // Use dynamic import to prevent webpack from analyzing during SSR
    // AppKit adapter handles all wallet connections through wagmi
    const WagmiAdapterModule = require('@reown/appkit-adapter-wagmi');
    const WagmiAdapter = WagmiAdapterModule.WagmiAdapter || WagmiAdapterModule.default?.WagmiAdapter || WagmiAdapterModule;
    
    wagmiAdapterInstance = new WagmiAdapter({
      ssr: true, // Enable SSR support
      projectId: projectId,
      networks: networks as any, // Type assertion to bypass version mismatch
    });
  }

  return wagmiAdapterInstance;
}

/**
 * Get or create Wagmi config instance (client-side only)
 */
export function getWagmiConfig(): Config {
  if (typeof window === 'undefined') {
    throw new Error('Wagmi config can only be accessed on the client side');
  }

  if (!wagmiConfigInstance) {
    wagmiConfigInstance = getWagmiAdapter().wagmiConfig;
  }

  return wagmiConfigInstance;
}

// Export lazy-loaded adapter getter for backward compatibility
export const wagmiAdapter = {
  get instance() {
    return getWagmiAdapter();
  },
  get wagmiConfig() {
    return getWagmiConfig();
  },
};

// Export config getter for backward compatibility
export const config = {
  get wagmiConfig() {
    return getWagmiConfig();
  },
} as any;

// AppKit metadata (name must match Reown Cloud project: prestix-app)
export const metadata = {
  name: 'prestix-app',
  description: 'Real Estate Platform (Beta)',
  url: typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_HOST || 'https://prestix.vip'),
  icons: ['/playlogo.png'],
};

// AppKit theme configuration
export const themeConfig = {
  themeMode: 'dark' as const,
  themeVariables: {
    '--w3m-color-mix': '#202020',
    '--w3m-color-mix-strength': 10,
    '--w3m-accent': '#F59E0B', // Tiger Orange
    '--w3m-border-radius-master': '8px',
    '--w3m-font-family': "'Inter', system-ui, sans-serif",
    '--w3m-font-size-master': '14px',
    '--w3m-z-index': '1000',
    // Fix for SVG icon rendering - provide fallback dimensions
    '--w3m-icon-size': '24px',
  },
};

// AppKit features configuration
// ✅ Wallet-only authentication (email/social handled by Stack Auth)
// Message signing ONLY required for wallet authentication
export const features = {
  // Disable analytics to prevent IndexedDB errors
  analytics: false,

  // DISABLED: Email authentication handled by Stack Auth
  email: true,

  // DISABLED: Social login handled by Stack Auth (already deactivated in Reown dashboard)
  socials: ['google'],

  // Don't show wallets in email flow (email handled by Stack Auth)
  emailShowWallets: true,

  // CRITICAL FIX: Enable all wallets for mobile compatibility
  // Mobile devices need WalletConnect support since browser extensions don't work
  allWallets: true, // Enable wallet discovery for mobile WalletConnect support
  connectorTypeOrder: ['walletConnect', 'injected', 'eip6963'], // Prioritize WalletConnect for mobile
  // ✅ FIXED: Remove excludeWalletIds to allow all wallets (especially for mobile WalletConnect)
  // No wallet exclusions - all wallets are available for maximum compatibility

  // Authentication order: Wallet only (email/social via Stack Auth)
  connectMethodsOrder: ['wallet', 'email', 'social'] as const,

  // Optional features
  onramp: true, // Enable onramp for crypto purchases
  swaps: true, // Enable swaps for token exchanges
  
  // UI preferences
  collapseWallets: true,
  legalCheckbox: false,
  smartSessions: true,
};

// Default network - use custom Sepolia with custom RPC
export const defaultNetwork = customSepolia;

