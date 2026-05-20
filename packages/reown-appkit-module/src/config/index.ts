// CRITICAL: Use type-only import to prevent module evaluation that triggers BigInt conversion errors
// WagmiAdapter will be dynamically imported when actually needed
import type { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import type { AppKitNetwork } from '@reown/appkit/networks'
// NOTE: We don't import mainnet/sepolia directly because they have BigInt chainIds
// Instead, we use customEthereum and customSepolia with numeric chainIds
import {
  createAppKit,
  useAppKit,
  useAppKitAccount,
  useAppKitEvents,
  useAppKitNetwork,
  useAppKitState,
  useAppKitTheme,
  useDisconnect,
  useWalletInfo
} from '@reown/appkit/react'

// Import PRESTIX.VIP theme configuration
import { TokenizinPalaceTheme, TigerPalaceMetadata } from '../theme/tokenizin-palace-theme'
// Import SIWE configuration for AppKit One-Click Auth
import { SIWE_ENABLED, siweConfig } from '../lib/siwe-config'

// Primary project ID - must match Reown Cloud (prestix-app). Same as root src/lib/reown-project-id.ts
const PRODUCTION_PROJECT_ID = '122878b95737e1300958ec73a8c0b61a'

export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || PRODUCTION_PROJECT_ID

// ⚠️ ETHEREUM MAINNET AND SEPOLIA TESTNET SUPPORTED
// Both Ethereum Mainnet (chain ID = 1) and Sepolia Testnet (chain ID = 11155111) are supported
// Ethereum Mainnet is the default network for production
// Sepolia Testnet is available for testing and development
// Remote configuration from Reown dashboard will be overridden by this local config

// CRITICAL FIX: Use viem's Ethereum mainnet definition with BigInt conversion
// Import viem's mainnet and convert BigInt chainId to number to prevent Math.pow errors
// Use lazy initialization to defer viem import until actually needed

function getEthereumRpcUrl(): string {
  if (process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL) {
    return process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL;
  }
  if (process.env.NEXT_PUBLIC_INFURA_API_KEY) {
    return `https://mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_API_KEY}`;
  }
  if (process.env.NEXT_PUBLIC_ALCHEMY_API_KEY) {
    return `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`;
  }
  return 'https://ethereum-rpc.publicnode.com';
}

function getSepoliaRpcUrl(): string {
  if (process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL) {
    return process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;
  }
  if (process.env.NEXT_PUBLIC_INFURA_API_KEY) {
    return `https://sepolia.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_API_KEY}`;
  }
  if (process.env.NEXT_PUBLIC_ALCHEMY_API_KEY) {
    return `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`;
  }
  return 'https://ethereum-sepolia-rpc.publicnode.com';
}

// Lazy load viem's mainnet definition and convert BigInt chainId to number
let viemMainnetCache: AppKitNetwork | null = null;

function getViemMainnet(): AppKitNetwork {
  if (viemMainnetCache) {
    return viemMainnetCache;
  }
  
  // Dynamic import to prevent BigInt conversion errors during module evaluation
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { mainnet, sepolia } = require('viem/chains');
  
  // Convert viem's mainnet to AppKitNetwork format with numeric chainId
  // Override RPC URLs with our custom function that supports environment variables
  viemMainnetCache = {
    ...mainnet,
    id: Number(mainnet.id), // Convert BigInt to number
    rpcUrls: {
      default: {
        http: [getEthereumRpcUrl()],
      },
      public: {
        http: [getEthereumRpcUrl()],
      },
    },
  } as AppKitNetwork;
  
  return viemMainnetCache;
}

// Ethereum Mainnet using viem's definition (chain ID = 1)
// Use lazy getter to prevent BigInt conversion errors
const customEthereum: AppKitNetwork = (() => {
  // Only initialize on client side to prevent SSR errors
  if (typeof window === 'undefined') {
    // Return a placeholder during SSR - actual network will be created on client
    return {
      id: 1,
      name: 'Ethereum',
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
      },
      rpcUrls: {
        default: { http: ['https://ethereum-rpc.publicnode.com'] },
        public: { http: ['https://ethereum-rpc.publicnode.com'] },
      },
      blockExplorers: {
        default: {
          name: 'Etherscan',
          url: 'https://etherscan.io',
        },
      },
      testnet: false,
    } as AppKitNetwork;
  }
  
  return getViemMainnet();
})();

// Sepolia Testnet (chain ID = 11155111)
const customSepolia: AppKitNetwork = {
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
} as AppKitNetwork;

// Supported networks: Ethereum Mainnet and Sepolia Testnet
// CRITICAL: Use custom networks with numeric chainIds (not BigInt) to prevent wallet discovery issues
// The mainnet and sepolia from @reown/appkit/networks have BigInt chainIds which can break wallet loading
// Ethereum Mainnet is first in the array to make it the default network for production
// Sepolia Testnet is available as an alternative network for testing
export const networks = [customEthereum, customSepolia] as [
  AppKitNetwork,
  ...AppKitNetwork[]
]

/**
 * Viem-compatible Ethereum and Sepolia chain definitions
 * Ethereum uses viem's mainnet definition with BigInt conversion
 * Sepolia uses custom definition to avoid BigInt conversion errors
 */

// Ethereum Mainnet chain definition - uses viem's mainnet
function getEthereumChain() {
  // Only initialize on client side to prevent SSR errors
  if (typeof window === 'undefined') {
    // Return a placeholder during SSR
    return {
      id: 1,
      name: 'Ethereum',
      nativeCurrency: {
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
      },
      rpcUrls: {
        default: { http: ['https://ethereum-rpc.publicnode.com'] },
        public: { http: ['https://ethereum-rpc.publicnode.com'] },
      },
      blockExplorers: {
        default: {
          name: 'Etherscan',
          url: 'https://etherscan.io',
        },
      },
      testnet: false,
    } as const;
  }
  
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { mainnet } = require('viem/chains');
  return {
    ...mainnet,
    id: Number(mainnet.id), // Convert BigInt to number
    rpcUrls: {
      default: {
        http: [getEthereumRpcUrl()],
      },
      public: {
        http: [getEthereumRpcUrl()],
      },
    },
  } as const;
}

export const ethereumChain = getEthereumChain()

// Sepolia Testnet chain definition
export const sepoliaChain = {
  id: 11155111, // Explicit numeric chain ID (not BigInt)
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
} as const

// Setup wagmi adapter with storage configuration
// CRITICAL: WagmiAdapter automatically creates an injected connector for MetaMask
// The injected connector detects window.ethereum when available
// Lazy initialization to prevent SSR build errors and BigInt conversion errors
let wagmiAdapterInitInstance: WagmiAdapter | null = null
let wagmiAdapterModule: typeof import('@reown/appkit-adapter-wagmi') | null = null

async function loadWagmiAdapter(): Promise<typeof import('@reown/appkit-adapter-wagmi')> {
  if (!wagmiAdapterModule) {
    // Dynamic import to prevent BigInt conversion errors during module evaluation
    wagmiAdapterModule = await import('@reown/appkit-adapter-wagmi')
  }
  return wagmiAdapterModule
}

function getWagmiAdapterInit(): WagmiAdapter {
  // Only create adapter on client side to prevent SSR errors
  if (typeof window === 'undefined') {
    // Return a placeholder during SSR - actual adapter will be created on client
    throw new Error('WagmiAdapter can only be created on the client side')
  }
  
  if (!wagmiAdapterInitInstance) {
    // CRITICAL: Synchronously require WagmiAdapter only when needed (not at module evaluation time)
    // This prevents BigInt conversion errors that occur when viem is imported during module evaluation
    const WagmiAdapterClass = require('@reown/appkit-adapter-wagmi').WagmiAdapter
    
    // CRITICAL: Explicitly pass Sepolia network array to ensure only Sepolia is supported
    // This prevents remote configuration from overriding local network settings
    // Use normalized networks array to ensure chainId is a number (not BigInt)
    // ✅ CRITICAL: Let WagmiAdapter auto-create default connectors (injected, walletConnect, coinbase)
    // Do NOT pass custom connectors array - this would override defaults and lose MetaMask support
    // WagmiAdapter will automatically detect window.ethereum and create injected connector
    wagmiAdapterInitInstance = new WagmiAdapterClass({
      networks: networks, // Use normalized networks array
      projectId,
      ssr: true // Enable SSR support
      // NOTE: No 'connectors' property - let WagmiAdapter create defaults automatically
      // This ensures injected connector (MetaMask) is created when window.ethereum exists
    })
    
    // ✅ DIAGNOSTIC: Log connector configuration
    console.log('🔌 [WagmiAdapter] Created with config:', {
      networks: networks.map(n => ({ id: n.id, name: n.name })),
      projectId: projectId,
      ssr: true,
    });
    
    // Check if connectors were created
    if (wagmiAdapterInitInstance.wagmiConfig?.connectors) {
      console.log('🔌 [WagmiAdapter] Connectors:', 
        wagmiAdapterInitInstance.wagmiConfig.connectors.map((c: any) => ({
          name: c.name,
          id: c.id,
          type: c.type,
          ready: c.ready
        }))
      );
    } else {
      console.warn('⚠️ [WagmiAdapter] No connectors found in wagmiConfig');
    }

    // ✅ SAFETY PATCH: Prevent BigInt conversion error when chainId is undefined
    // AppKit sometimes calls getBalance before network is fully resolved; default to Sepolia (11155111)
    const originalGetBalance = (wagmiAdapterInitInstance as any).getBalance?.bind(wagmiAdapterInitInstance)
    if (originalGetBalance && !(wagmiAdapterInitInstance as any).__patchedGetBalance) {
      (wagmiAdapterInitInstance as any).__patchedGetBalance = true
      ;(wagmiAdapterInitInstance as any).getBalance = async (params: any = {}) => {
        const safeParams = { ...params }

        // Default chainId to Sepolia when missing to avoid BigInt(undefined) inside Wagmi
        if (safeParams.chainId === undefined || safeParams.chainId === null) {
          safeParams.chainId = 11155111
        }

        // Skip if no address is available yet; return zero balance to keep flow stable
        if (!safeParams.address) {
          return {
            balance: 0n,
            decimals: 18,
            symbol: 'ETH'
          }
        }

        return originalGetBalance(safeParams)
      }
    }
  }
  
  return wagmiAdapterInitInstance
}

// Export wagmiAdapterInit getter function for backward compatibility
// Use a function to ensure lazy evaluation and prevent SSR errors
export function getWagmiAdapterInitExport(): WagmiAdapter | null {
  if (typeof window === 'undefined') {
    return null
  }
  return getWagmiAdapterInit()
}

// Export wagmiAdapterInit - lazy initialization to prevent SSR errors
// During SSR, this will be undefined/null, but code should check for client-side before using
let _wagmiAdapterInitCache: WagmiAdapter | null = null

// Create a function that returns the adapter (only on client side)
function getWagmiAdapterInitLazy(): WagmiAdapter | null {
  if (typeof window === 'undefined') {
    return null
  }
  if (!_wagmiAdapterInitCache) {
    _wagmiAdapterInitCache = getWagmiAdapterInit()
  }
  return _wagmiAdapterInitCache
}

// Export wagmiAdapterInit as a Proxy that safely handles SSR
// This prevents the adapter from being created during SSR build
export const wagmiAdapterInit = new Proxy({} as WagmiAdapter, {
  get(_target, prop) {
    // During SSR, throw a more descriptive error or return a safe placeholder
    if (typeof window === 'undefined') {
      // Return a mock object that satisfies type checks but throws on actual use
      if (prop === 'wagmiConfig') {
        throw new Error('wagmiAdapterInit.wagmiConfig cannot be accessed during SSR. Use getWagmiConfig() instead.')
      }
      // For other properties, return a function that throws
      return () => {
        throw new Error(`wagmiAdapterInit.${String(prop)} cannot be accessed during SSR`)
      }
    }
    // Client-side: lazy create adapter on first access
    const adapter = getWagmiAdapterInitLazy()
    if (!adapter) {
      throw new Error('Failed to initialize WagmiAdapter')
    }
    const value = (adapter as any)[prop]
    return typeof value === 'function' ? value.bind(adapter) : value
  },
  // Handle 'in' operator checks
  has(_target, prop) {
    if (typeof window === 'undefined') {
      return false
    }
    const adapter = getWagmiAdapterInitLazy()
    return adapter ? prop in adapter : false
  }
}) as WagmiAdapter

// Export wagmiAdapter as an object with wagmiConfig property for compatibility
// This matches the structure expected by AppKitProvider and other components
export const wagmiAdapter = {
  get wagmiConfig() {
    if (typeof window === 'undefined') {
      throw new Error('wagmiConfig can only be accessed on the client side')
    }
    return getWagmiAdapterInit().wagmiConfig
  }
}

// Export getWagmiConfig function for compatibility with wallet-provider.tsx
export function getWagmiConfig() {
  if (typeof window === 'undefined') {
    throw new Error('getWagmiConfig can only be called on the client side')
  }
  return getWagmiAdapterInit().wagmiConfig
}

// Suppress Web3Modal API calls early (before AppKit initializes)
if (typeof window !== 'undefined') {
  // ✅ FIX: Prefer MetaMask when multiple wallet extensions inject (e.g. MetaMask + Coinbase)
  // Otherwise the default injected connector may bind to the first provider and MetaMask shows "Not Detected"
  try {
    const ethereum = (window as any).ethereum;
    if (ethereum?.providers?.length) {
      const metaMaskProvider = ethereum.providers.find((p: any) => p?.isMetaMask === true);
      if (metaMaskProvider) {
        (window as any).ethereum = metaMaskProvider;
        console.log('🔌 [AppKit Module] Multiple providers detected; using MetaMask as primary (window.ethereum)');
      }
    }
  } catch (e) {
    // Ignore
  }

  // CRITICAL: Store native fetch BEFORE any wrapping to prevent infinite recursion
  // All interceptors must use this native fetch, not window.fetch (which may be wrapped)
  if (!(window as any).__nativeFetch) {
    (window as any).__nativeFetch = window.fetch.bind(window);
  }
  const nativeFetch = (window as any).__nativeFetch;
  
  // Set up fetch interceptor BEFORE AppKit initializes to prevent Web3Modal API calls
  // Check if already wrapped to prevent double-wrapping
  if (!(window.fetch as any).__appkit_wrapped) {
    const originalFetch = window.fetch;
    (window as any).fetch = (async (...args: Parameters<typeof fetch>) => {
        // Extract URL from various argument formats
        let url = '';
        let shouldIntercept = true;
        
      try {
        if (typeof args[0] === 'string') {
          url = args[0];
        } else if (args[0] instanceof Request) {
          url = args[0].url;
        } else if (args[0] && typeof args[0] === 'object' && 'url' in args[0]) {
          url = (args[0] as any).url;
        } else {
          // If we can't extract URL, pass through to original fetch (likely Next.js internal)
          shouldIntercept = false;
        }
      } catch (urlError) {
        // If we can't extract URL, just pass through to original fetch
        shouldIntercept = false;
      }
      
      // If URL is empty or we couldn't extract it, pass through
      if (!url || !shouldIntercept) {
        // CRITICAL: Use native fetch to prevent infinite recursion
        return nativeFetch.apply(window, args);
      }
      
      // CRITICAL: Always allow local API calls and Next.js internal fetches to pass through without interception
      // Local API calls (starting with /api/ or relative paths) should never be blocked
      // Next.js internal routes (/_next/, /__nextjs/, etc.) should also pass through
      const isLocalCall = url.startsWith('/api/') || 
          url.startsWith('./') || 
          url.startsWith('../') ||
          url.includes('localhost') ||
          url.includes('127.0.0.1');
      
      // Next.js internal fetches - check for various patterns
      const isNextJsInternal = url.includes('/_next/') || 
          url.includes('/__nextjs/') ||
          url.startsWith('/_next/') ||
          url.includes('?__nextjs') ||
          url.includes('&__nextjs') ||
          // Next.js navigation fetches often have no protocol (relative URLs)
          (!url.includes('://') && !url.startsWith('http') && !url.startsWith('https'));
      
      // Allow any URL that starts with / (except external domains) - this includes Next.js routes
      // But exclude external domains that start with / (like /api.external.com)
      const isRelativePath = url.startsWith('/') && 
          !url.startsWith('//') && // Exclude protocol-relative URLs like //example.com
          !url.match(/^\/[a-zA-Z0-9-]+\.[a-zA-Z]/); // Exclude /example.com patterns
      
      if (isLocalCall || isNextJsInternal || isRelativePath) {
        // For local API calls, Next.js internal calls, and relative paths, use native fetch without any interception
        // CRITICAL: Use native fetch to prevent infinite recursion
        return nativeFetch.apply(window, args);
      }
        
      // Suppress Coinbase analytics requests (all methods, all URLs)
        // This prevents Coinbase SDK from throwing "Failed to fetch" errors
        if (url.includes('cca-lite.coinbase.com') || 
            url.includes('coinbase.com/metrics') ||
            url.includes('coinbase.com/amp') ||
            url.includes('coinbase.com')) {
          return Promise.resolve(new Response('', {
            status: 200,
            statusText: 'OK',
            headers: {
              'Content-Type': 'text/plain',
              'Access-Control-Allow-Origin': '*'
            }
          }));
        }
      
      // CRITICAL FIX: Handle WalletConnect API calls
      // This ensures wallet registry, auth, and other essential endpoints work on mobile
      // Mobile wallet discovery REQUIRES wallet registry API calls to api.web3modal.org and registry.walletconnect.com
      // iOS FIX: Wallet registry API calls are essential for wallet discovery on iOS
      if (url.includes('api.web3modal.org') || 
          url.includes('pulse.walletconnect.org') ||
          url.includes('registry.walletconnect.com') ||
          url.includes('rpc.walletconnect.org')) {
        
        // Suppress token conversion API calls for testnet (Sepolia not supported)
        // WalletConnect's token conversion API only supports mainnet chains
        // This is expected behavior - we use our custom token registry instead
        if (url.includes('/convert/tokens') && url.includes('chainId=eip155%3A11155111')) {
          // Return empty token list - AppKit will use our custom token registry
          const mockResponse = {
            tokens: []
          };
          return Promise.resolve(new Response(JSON.stringify(mockResponse), {
            status: 200,
            statusText: 'OK',
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          }));
        }
        
        // Check if this is an analytics/metrics call (should be suppressed)
        const isAnalyticsCall = url.includes('/analytics') || 
                                url.includes('/metrics') || 
                                url.includes('/track') ||
                                url.includes('/events') ||
                                url.includes('/stats');
        
        // Suppress ONLY analytics/metrics calls
        if (isAnalyticsCall) {
          return Promise.resolve(new Response('', {
            status: 200,
            statusText: 'OK',
            headers: { 
              'Content-Type': 'text/plain',
              'Access-Control-Allow-Origin': '*'
            }
          }));
        }
        
        // Allow ALL other WalletConnect API calls to pass through
        // This includes:
        // - Wallet registry calls (/v3/wallets, /wallets, etc.) - CRITICAL for mobile wallet discovery
        // - Wallet metadata from registry.walletconnect.com - CRITICAL for mobile wallet loading (iOS Safari, Android Chrome, Android Edge)
        // - Auth/nonce endpoints needed for SIWE
        // - Any other WalletConnect infrastructure calls
        // CRITICAL: Use native fetch to prevent infinite recursion
        // MOBILE FIX: Enhanced logging for wallet registry calls to debug mobile browser issues
        try {
          const isWalletRegistry = url.includes('registry.walletconnect.com') || url.includes('/wallets');
          if (isWalletRegistry) {
            const mobileBrowser = isIOS ? 'iOS Safari' : isMobileChrome ? 'Android Chrome' : isMobileEdge ? 'Android Edge' : isMobile ? 'Mobile Browser' : 'Desktop';
            console.log(`📱 [AppKit Module] ${mobileBrowser} Wallet Registry API call:`, url);
          }
          const response = await nativeFetch.apply(window, args);
          if (isWalletRegistry) {
            console.log('✅ [AppKit Module] Wallet Registry API response:', response.status, url);
          }
          return response;
        } catch (error: any) {
          // Suppress token conversion errors for testnet (expected)
          if (url.includes('/convert/tokens') && url.includes('chainId=eip155%3A11155111')) {
            const mockResponse = {
              tokens: []
            };
            return Promise.resolve(new Response(JSON.stringify(mockResponse), {
              status: 200,
              statusText: 'OK',
              headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              }
            }));
          }
          
          // Log errors but don't suppress - let AppKit handle them
          // MOBILE FIX: Enhanced error logging for wallet registry failures on all mobile browsers
          const isWalletRegistry = url.includes('registry.walletconnect.com') || url.includes('/wallets');
          if (isWalletRegistry) {
            const mobileBrowser = isIOS ? 'iOS Safari' : isMobileChrome ? 'Android Chrome' : isMobileEdge ? 'Android Edge' : isMobile ? 'Mobile Browser' : 'Desktop';
            console.error(`❌ [AppKit Module] Wallet Registry API call failed (${mobileBrowser} wallet loading may be affected):`, url, error);
          } else {
            console.warn('⚠️ [AppKit Module] WalletConnect API call failed:', url, error);
          }
          throw error;
        }
      }
      
      // For all other requests (including external APIs), use native fetch
      // CRITICAL: Use native fetch to prevent infinite recursion
      // Wrap in try-catch to handle network errors gracefully
      try {
        const response = await nativeFetch.apply(window, args);
        return response;
      } catch (error: any) {
        // Only suppress Coinbase analytics errors in catch block
        // All other errors (including network errors for local APIs and Next.js) should propagate
        const errorMessage = error?.message || String(error);
        const isCoinbaseError = url.includes('cca-lite.coinbase.com') || 
            url.includes('coinbase.com/metrics') ||
            url.includes('coinbase.com/amp') ||
            url.includes('coinbase.com');
        
        // If it's a Coinbase analytics error, suppress it
        if (isCoinbaseError) {
          return Promise.resolve(new Response('', {
            status: 200,
            statusText: 'OK',
            headers: {
              'Content-Type': 'text/plain',
              'Access-Control-Allow-Origin': '*'
            }
          }));
        }
        
        // For all other errors (including Next.js navigation errors), rethrow to allow proper error handling
        // This ensures Next.js can handle its own errors correctly
        throw error;
      }
    }) as typeof fetch;
    // Mark as wrapped to prevent double-wrapping
    (window.fetch as any).__appkit_wrapped = true;
  }
  
  // Also suppress console.error for Web3Modal/Coinbase API errors (backup)
  // This catches errors logged by FetchUtil.ts before they reach the console
  const originalConsoleError = console.error;
  if (!(console.error as any).__appkit_wrapped) {
    console.error = (...args: any[]) => {
      // FIRST: Check for empty objects early - suppress them immediately
      // This handles cases where empty objects are logged (often from browser extensions or React DevTools)
      const isEmptyObject = (arg: any): boolean => {
        if (typeof arg !== 'object' || arg === null || arg instanceof Error || Array.isArray(arg)) {
          return false;
        }
        try {
          // Check if it's an empty object by trying to get keys
          const keys = Object.keys(arg);
          if (keys.length === 0) {
            return true;
          }
          // Also check if JSON.stringify results in '{}'
          const stringified = JSON.stringify(arg);
          if (stringified === '{}' || stringified === '[]') {
            return true;
          }
          // Check for objects with only undefined/null values (effectively empty)
          const hasAnyValue = keys.some(key => {
            const value = arg[key];
            return value !== undefined && value !== null && value !== '';
          });
          if (!hasAnyValue) {
            return true;
          }
        } catch {
          // If we can't check, try a simpler approach
          try {
            // Check if it's a plain object with no enumerable properties
            let hasProperties = false;
            for (const key in arg) {
              if (Object.prototype.hasOwnProperty.call(arg, key)) {
                hasProperties = true;
                break;
              }
            }
            if (!hasProperties) {
              return true;
            }
          } catch {
            // If all checks fail, assume it's not empty
            return false;
          }
        }
        return false;
      };
      
      // If all arguments are empty objects or empty strings, suppress completely
      const allArgsEmpty = args.length > 0 && args.every(arg => 
        isEmptyObject(arg) || 
        (typeof arg === 'string' && arg.trim() === '') ||
        arg === null ||
        arg === undefined
      );
      
      if (allArgsEmpty) {
        return;
      }
      
      // If single argument is an empty object, suppress it
      if (args.length === 1 && isEmptyObject(args[0])) {
        return;
      }
      
      // Also check if all arguments are empty objects (even if mixed with empty strings/null)
      const allEmptyObjects = args.length > 0 && args.every(arg => 
        isEmptyObject(arg) || 
        arg === null || 
        arg === undefined ||
        (typeof arg === 'string' && arg.trim() === '')
      );
      
      if (allEmptyObjects) {
        return;
      }
      
      // Check all arguments for Web3Modal/Coinbase-related content
      const fullMessage = args.map(arg => {
        if (typeof arg === 'string') return arg;
        if (arg instanceof Error) return arg.message + ' ' + arg.stack;
        if (typeof arg === 'object' && arg !== null) {
          // Check for AnalyticsSDKApiError context
          if ((arg as any).context === 'AnalyticsSDKApiError') {
            return 'Analytics SDK Error';
          }
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');
      
      // Suppress Coinbase analytics errors
      if (fullMessage.includes('cca-lite.coinbase.com') ||
          fullMessage.includes('coinbase.com/amp') ||
          fullMessage.includes('coinbase.com/metrics') ||
          (fullMessage.includes('ERR_CONNECTION_REFUSED') && fullMessage.includes('coinbase'))) {
        // Silently suppress Coinbase analytics errors
        return;
      }
      
      // CRITICAL FIX: Only suppress Web3Modal analytics errors, not wallet registry errors
      // Wallet registry errors should be visible for debugging mobile wallet discovery issues
      const isWalletRegistryError = fullMessage.includes('getWallets') ||
                                    fullMessage.includes('/v3/wallets') ||
                                    fullMessage.includes('/wallets') ||
                                    fullMessage.includes('/registry') ||
                                    fullMessage.includes('wallet-list');
      
      const isAnalyticsError = fullMessage.includes('/analytics') ||
                               fullMessage.includes('/metrics') ||
                               fullMessage.includes('/track') ||
                               fullMessage.includes('/events');
      
      // Suppress only analytics/metrics errors, not wallet registry errors
      if ((fullMessage.includes('api.web3modal.org') || fullMessage.includes('pulse.walletconnect.org')) && 
          isAnalyticsError && 
          !isWalletRegistryError) {
        // Suppress Web3Modal analytics errors silently
        return;
      }
      
      // Allow wallet registry errors to show (needed for debugging mobile wallet discovery)
      // Only suppress generic 403/400 errors if they're analytics-related
      if ((fullMessage.includes('403') && fullMessage.includes('Forbidden')) ||
          (fullMessage.includes('400') && fullMessage.includes('Bad Request'))) {
        // Only suppress if it's clearly an analytics error, not a wallet registry error
        if (isAnalyticsError && !isWalletRegistryError) {
          return;
        }
        // Otherwise, let wallet registry errors show for debugging
      }
      
      // Suppress Coinbase analytics errors
      if (fullMessage.includes('cca-lite.coinbase.com') ||
          fullMessage.includes('coinbase.com/metrics') ||
          fullMessage.includes('coinbase.com/amp') ||
          fullMessage.includes('Analytics SDK') ||
          fullMessage.includes('AnalyticsSDKApiError') ||
          (args.some(arg => typeof arg === 'object' && arg !== null && (arg as any).context === 'AnalyticsSDKApiError')) ||
          (fullMessage.includes('Failed to fetch') && (fullMessage.includes('coinbase') || fullMessage.includes('Analytics'))) ||
          (fullMessage.includes('TypeError') && fullMessage.includes('Failed to fetch') && fullMessage.includes('Analytics'))) {
        // Suppress Coinbase analytics errors silently
        return;
      }
      
      // Suppress Reown Config Notice (harmless informational message)
      if (fullMessage.includes('[Reown Config Notice]') ||
          fullMessage.includes('local configuration') ||
          fullMessage.includes('remote configuration')) {
        return;
      }
      
      // Suppress Zustand history messages (harmless internal logs)
      if (fullMessage.includes('core/history') ||
          fullMessage.includes('Restore will override') ||
          (args.some(arg => typeof arg === 'object' && arg !== null && (arg as any).context === 'core/history'))) {
        return;
      }
      
      // Suppress Cross-Origin-Opener-Policy errors from Coinbase SDK
      if (fullMessage.includes('Cross-Origin-Opener-Policy') ||
          fullMessage.includes('COOP') ||
          (fullMessage.includes('HTTP error') && fullMessage.includes('status: 500') && fullMessage.includes('Cross-Origin'))) {
        return;
      }
      
      // Suppress ChunkLoadError (webpack trying to load from wrong port - harmless)
      if (fullMessage.includes('ChunkLoadError') ||
          fullMessage.includes('Loading chunk') ||
          (fullMessage.includes('ERR_CONNECTION_REFUSED') && fullMessage.includes('localhost:4318'))) {
        return;
      }
      
      // Suppress sign message errors (expected when user rejects or connector issues)
      if (fullMessage.includes('WagmiAdapter:signMessage') ||
          fullMessage.includes('Sign message failed') ||
          fullMessage.includes('SWIXUtil:requestSignMessage') ||
          (fullMessage.includes('AppKitError') && fullMessage.includes('signMessage'))) {
        // Only suppress if it's a connector/user rejection issue, not actual errors
        if (fullMessage.includes('User rejected') || 
            fullMessage.includes('Connector not connected') ||
            fullMessage.includes('not connected')) {
          return;
        }
      }
      
      // Suppress Web3Modal auth/nonce endpoint errors
      if (fullMessage.includes('/auth/v1/nonce') ||
          (fullMessage.includes('api.web3modal.org') && fullMessage.includes('nonce'))) {
        return;
      }
      
      // Check call stack for browser extension errors (React DevTools, etc.)
      try {
        const error = new Error();
        const stack = error.stack || '';
        if (stack.includes('chrome-extension://') || 
            stack.includes('moz-extension://') ||
            stack.includes('safari-extension://') ||
            stack.includes('installHook.js')) {
          // If it's an empty object from a browser extension, suppress it
          if (args.length === 1 && 
              typeof args[0] === 'object' && 
              args[0] !== null && 
              !(args[0] instanceof Error) &&
              Object.keys(args[0]).length === 0) {
            return;
          }
        }
      } catch {
        // Ignore stack trace errors
      }
      
      // Additional check: If any argument is an empty object and others are just empty strings/null/undefined, suppress
      const hasEmptyObjectArg = args.some(arg => isEmptyObject(arg));
      if (hasEmptyObjectArg) {
        // Filter out empty strings, null, undefined, and empty objects to check remaining args
        const nonEmptyArgs = args.filter(arg => {
          if (isEmptyObject(arg)) return false;
          if (arg === null || arg === undefined) return false;
          if (typeof arg === 'string' && arg.trim() === '') return false;
          return true;
        });
        
        // If only empty objects/strings/null/undefined remain after filtering, suppress
        if (nonEmptyArgs.length === 0) {
          return;
        }
      }
      
      // Suppress React DevTools extension errors (harmless)
      const stackTrace = args.find(arg => typeof arg === 'string' && arg.includes('chrome-extension://'));
      if (stackTrace && stackTrace.includes('installHook.js')) {
        return;
      }
      
      // FINAL CHECK: Before calling original console.error, check one more time for empty objects
      // This catches any edge cases that might have slipped through
      const hasOnlyEmptyObjects = args.length > 0 && args.every(arg => {
        if (isEmptyObject(arg)) return true;
        if (arg === null || arg === undefined) return true;
        if (typeof arg === 'string' && arg.trim() === '') return true;
        // Check if it's an object that stringifies to '{}'
        if (typeof arg === 'object' && arg !== null && !(arg instanceof Error) && !Array.isArray(arg)) {
          try {
            if (JSON.stringify(arg) === '{}') return true;
            if (Object.keys(arg).length === 0) return true;
          } catch {
            // If stringify fails, check keys
            try {
              let hasKeys = false;
              for (const _key in arg) {
                hasKeys = true;
                break;
              }
              if (!hasKeys) return true;
            } catch {
              // Ignore errors
            }
          }
        }
        return false;
      });
      
      if (hasOnlyEmptyObjects) {
        return;
      }
      
      // Call original console.error for other messages
      originalConsoleError.apply(console, args);
    };
    (console.error as any).__appkit_wrapped = true;
  }
  
  // Helper to clear any pending MetaMask connection requests
  const clearPendingMetaMaskRequests = () => {
    try {
      const ethereum = (window as any).ethereum;
      if (ethereum && ethereum.isMetaMask) {
        console.log('🧹 [AppKit Module] Checking for pending MetaMask requests...');
        
        // If MetaMask is already connected, we can reuse the connection
        if (ethereum.selectedAddress) {
          console.log('ℹ️ [AppKit Module] MetaMask already has account:', ethereum.selectedAddress);
          // Try to remove any event listeners that might be blocking
          try {
            // Remove any pending request handlers
            if (ethereum.removeListener) {
              ethereum.removeListener('accountsChanged', () => {});
              ethereum.removeListener('chainChanged', () => {});
            }
          } catch (e) {
            // Ignore errors
          }
        }
        
        // Check if there are multiple providers (common with multiple wallet extensions)
        const providers = ethereum?.providers || [];
        if (providers.length > 0) {
          console.log('📋 [AppKit Module] Multiple providers detected, MetaMask might be in providers array');
          const metaMaskProvider = providers.find((p: any) => p?.isMetaMask === true);
          if (metaMaskProvider && metaMaskProvider.selectedAddress) {
            console.log('✅ [AppKit Module] MetaMask provider already connected:', metaMaskProvider.selectedAddress);
          }
        }
      }
    } catch (e) {
      console.warn('⚠️ [AppKit Module] Error clearing pending requests:', e);
    }
  };
  
  // Helper to check if MetaMask has a pending connection request
  const hasPendingMetaMaskRequest = (): boolean => {
    try {
      const ethereum = (window as any).ethereum;
      if (ethereum && ethereum.isMetaMask) {
        // MetaMask doesn't expose pending state directly, but we can infer:
        // If there's no selectedAddress but ethereum exists, there might be a pending request
        // However, this is not reliable, so we rely on debouncing instead
        return false; // We can't reliably detect pending requests
      }
      return false;
    } catch (e) {
      return false;
    }
  };
  
  // Log MetaMask detection status for debugging
  const checkMetaMask = () => {
    const ethereum = (window as any).ethereum;
    const isMetaMask = ethereum?.isMetaMask === true;
    const hasEthereum = !!ethereum;
    
    // Check for multiple possible MetaMask injection patterns
    const providers = ethereum?.providers || [];
    const hasMetaMaskProvider = providers.some((p: any) => p?.isMetaMask === true);
    const isMetaMaskInProviders = hasMetaMaskProvider || isMetaMask;
    
    console.log('🔍 [AppKit Module] MetaMask Detection:', {
      hasEthereum,
      isMetaMask,
      isMetaMaskInProviders,
      ethereumProvider: !!ethereum,
      providerType: ethereum?.constructor?.name || 'unknown',
      hasProviders: providers.length > 0,
      providerCount: providers.length,
      selectedAddress: ethereum?.selectedAddress || null,
    });
    
    if (!hasEthereum) {
      console.warn('⚠️ [AppKit Module] No ethereum provider detected. MetaMask extension may not be installed or enabled.');
    } else if (!isMetaMaskInProviders) {
      console.warn('⚠️ [AppKit Module] Ethereum provider detected but not MetaMask. Provider:', ethereum?.constructor?.name);
      // Try to find MetaMask in providers array
      if (providers.length > 0) {
        console.log('📋 [AppKit Module] Available providers:', providers.map((p: any) => ({
          isMetaMask: p?.isMetaMask,
          constructor: p?.constructor?.name
        })));
      }
    } else {
      console.log('✅ [AppKit Module] MetaMask detected successfully');
      // Clear any pending requests when MetaMask is detected
      clearPendingMetaMaskRequests();
    }
  };
  
  // Check immediately
  checkMetaMask();
  
  // Also check after a short delay (MetaMask might inject after page load)
  setTimeout(checkMetaMask, 1000);
  setTimeout(checkMetaMask, 2000);
  
  // Listen for MetaMask injection event
  window.addEventListener('ethereum#initialized', checkMetaMask, { once: true });
  
  // Also listen for provider changes (MetaMask might inject dynamically)
  if ((window as any).ethereum) {
    (window as any).ethereum.on?.('connect', checkMetaMask);
  }
}

// Create modal only in browser environment to prevent build-time errors
// Detect iOS/mobile browsers (mobile browsers don't support browser extensions)
// CRITICAL: All mobile browsers (iOS Safari, Android Chrome, Android Edge) should prioritize WalletConnect
// DESKTOP FIX: Improved mobile detection to prevent false positives on desktop browsers
const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !('ontouchstart' in window || navigator.maxTouchPoints > 0);
const isAndroid = typeof window !== 'undefined' && /Android/i.test(navigator.userAgent) && /Mobile/i.test(navigator.userAgent);
const isMobileChrome = typeof window !== 'undefined' && /Android.*Chrome/i.test(navigator.userAgent) && /Mobile/i.test(navigator.userAgent);
const isMobileEdge = typeof window !== 'undefined' && /Android.*Edg/i.test(navigator.userAgent) && /Mobile/i.test(navigator.userAgent);

// Enhanced mobile detection - check for touch support AND small screen size
// Desktop browsers should have large screens (>= 768px width) or no touch events
const hasTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
const hasSmallScreen = typeof window !== 'undefined' && window.innerWidth < 768;
const isMobileUserAgent = typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// TRUE mobile: Mobile user agent + (small screen OR touch support)
// Desktop with touch (like touchscreen laptops): Mobile user agent = false, so isMobile = false
const isMobile = typeof window !== 'undefined' && isMobileUserAgent && (hasSmallScreen || (hasTouch && window.innerWidth < 1024));

// ⚠️ CRITICAL: When NEXT_PUBLIC_APPKIT_GOOGLE_ONLY=true, the app uses src/lib/appkit.ts
// for Google-only config. The package must NOT create its own modal (which has full wallet
// config). Otherwise chunk load order on Vercel can cause the package modal to be created
// first, showing WalletConnect + Email instead of Google-only. See APPKIT_SOCIAL_LOGIN_TROUBLESHOOTING.md
const useAppGoogleOnlyConfig = process.env.NEXT_PUBLIC_APPKIT_GOOGLE_ONLY === 'true';

// ⚠️ SEPOLIA ONLY - Vercel production is treated as staging environment
const modal = typeof window !== 'undefined' ? (() => {
  try {
    if (useAppGoogleOnlyConfig) {
      // App creates modal via src/lib/appkit.ts; package must not create (would override with full wallet config)
      return null;
    }
    // Check if AppKit is already initialized to prevent double initialization
    // This prevents WalletConnect Core from being initialized multiple times
    if ((window as any).__appkit_initialized || (window as any).__appkit_modal) {
      console.warn('⚠️ [AppKit Module] AppKit already initialized, reusing existing instance');
      return (window as any).__appkit_modal || null;
    }
    
    console.log('🔧 [AppKit Module] Creating AppKit modal...');
    console.log('🌐 [AppKit Module] Network Configuration:', {
      networks: networks.map(n => ({
        id: typeof n.id === 'bigint' ? Number(n.id) : n.id,
        name: n.name,
        testnet: n.testnet,
        chainIdType: typeof n.id === 'bigint' ? 'BigInt (⚠️ PROBLEM)' : 'number (✅ OK)'
      })),
      defaultNetwork: {
        id: typeof networks[0].id === 'bigint' ? Number(networks[0].id) : networks[0].id,
        name: networks[0].name,
        testnet: networks[0].testnet,
        chainIdType: typeof networks[0].id === 'bigint' ? 'BigInt (⚠️ PROBLEM)' : 'number (✅ OK)'
      },
      supportedNetworks: ['Sepolia Testnet (chain ID: 11155111)', 'Ethereum Mainnet (chain ID: 1)'],
      defaultNetworkNote: 'Sepolia Testnet is the default for staging/testing environments',
      projectId,
      walletDiscoveryEnabled: true,
      note: 'Networks must have numeric chainIds (not BigInt) for wallet registry API to work correctly'
    });
    console.log('📱 [AppKit Module] Device Detection:', {
      isIOS,
      isAndroid,
      isMobileChrome,
      isMobileEdge,
      isMobile,
      userAgent: navigator.userAgent,
    });
    
    // Helper functions for MetaMask connection management (defined inside IIFE for proper scope)
    const clearPendingMetaMaskRequests = () => {
      try {
        const ethereum = (window as any).ethereum;
        if (ethereum && ethereum.isMetaMask) {
          console.log('🧹 [AppKit Module] Checking for pending MetaMask requests...');
          
          // If MetaMask is already connected, we can reuse the connection
          if (ethereum.selectedAddress) {
            console.log('ℹ️ [AppKit Module] MetaMask already has account:', ethereum.selectedAddress);
            // Try to remove any event listeners that might be blocking
            try {
              // Remove any pending request handlers
              if (ethereum.removeListener) {
                ethereum.removeListener('accountsChanged', () => {});
                ethereum.removeListener('chainChanged', () => {});
              }
            } catch (e) {
              // Ignore errors
            }
          }
          
          // Check if there are multiple providers (common with multiple wallet extensions)
          const providers = ethereum?.providers || [];
          if (providers.length > 0) {
            console.log('📋 [AppKit Module] Multiple providers detected, MetaMask might be in providers array');
            const metaMaskProvider = providers.find((p: any) => p?.isMetaMask === true);
            if (metaMaskProvider && metaMaskProvider.selectedAddress) {
              console.log('✅ [AppKit Module] MetaMask provider already connected:', metaMaskProvider.selectedAddress);
            }
          }
        }
      } catch (e) {
        console.warn('⚠️ [AppKit Module] Error clearing pending requests:', e);
      }
    };
    
    const hasPendingMetaMaskRequest = (): boolean => {
      try {
        const ethereum = (window as any).ethereum;
        if (ethereum && ethereum.isMetaMask) {
          // MetaMask doesn't expose pending state directly, but we can infer:
          // If there's no selectedAddress but ethereum exists, there might be a pending request
          // However, this is not reliable, so we rely on debouncing instead
          return false; // We can't reliably detect pending requests
        }
        return false;
      } catch (e) {
        return false;
      }
    };
    
    // Get adapter instance (lazy initialization - only on client side)
    const adapter = getWagmiAdapterInit();
    
    // ✅ FIXED: Show all connector types on mobile (WalletConnect first, injected second)
    // Mobile browsers: WalletConnect first to ensure mobile apps work; still show injected when available
    // Desktop: Injected first (extensions), then WalletConnect
    const connectorTypeOrder = isMobile
      ? ['walletConnect', 'injected', 'eip6963'] as const
      : ['injected', 'walletConnect', 'eip6963'] as const;
    
    console.log('🔌 [AppKit Module] Connector Order:', connectorTypeOrder);
    console.log('📱 [AppKit Module] Device Detection Results:', {
      isMobile,
      isIOS,
      isAndroid,
      isMobileChrome,
      isMobileEdge,
      hasTouch,
      hasSmallScreen,
      screenWidth: typeof window !== 'undefined' ? window.innerWidth : 'unknown',
      screenHeight: typeof window !== 'undefined' ? window.innerHeight : 'unknown',
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'unknown',
      deviceType: isMobile ? '📱 MOBILE DEVICE' : '🖥️ DESKTOP BROWSER',
    });
    console.log('🔌 [AppKit Module] Connector Configuration:', {
      connectorPriority: isMobile 
        ? '1️⃣ WalletConnect (mobile apps) → 2️⃣ Injected (if available)' 
        : '1️⃣ Injected (MetaMask Extension) → 2️⃣ WalletConnect',
      enableWalletConnect: true,
      enableInjected: true, // ALWAYS enabled - WagmiAdapter will detect if extension is available
      enableEIP6963: true,
      metaMaskSupport: isMobile ? 'Mobile app via WalletConnect' : 'Browser extension (injected provider)',
      allWallets: true, // CRITICAL for mobile wallet discovery
      includeWalletIds: '12 wallets included',
      note: isMobile 
        ? 'Mobile browsers prioritize WalletConnect for wallet apps'
        : 'Desktop browsers prioritize injected providers (MetaMask extension)',
    });
    
    const appKitModal = createAppKit({
      adapters: [adapter],
      // Featured wallets on main view (MetaMask, Trust, Binance). Omit includeWalletIds so full registry (520+) loads for "Search Wallet".
      featuredWalletIds: [
        'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
        '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust
        'c286eebc742a337cd1d18f34ce1333953e4b4bc14ff6a2294363a70c3596516a', // Binance Wallet
      ],
      // CRITICAL: Explicitly set networks array to ensure Ethereum Mainnet and Sepolia Testnet are supported
      // This overrides any remote configuration from Reown dashboard
      // Use normalized networks array to ensure chainId is a number (not BigInt)
      // CRITICAL FIX: Networks must have numeric chainIds (not BigInt) for wallet discovery to work
      networks: networks,
      // ⚠️ CRITICAL: Sepolia Testnet as default network for testing before production rollout
      // Sepolia (chainId = 11155111) is used for testing - matches SIWE message chainId
      // Ethereum Mainnet (networks[0]) is available but not default
      // Using customSepolia directly ensures we use Sepolia with numeric chainId
      defaultNetwork: customSepolia, // Sepolia Testnet (chainId = 11155111, numeric, not BigInt)
      projectId,
      // Use PRESTIX.VIP theme configuration
      themeMode: TokenizinPalaceTheme.themeMode,
      themeVariables: TokenizinPalaceTheme.themeVariables,
      // Override metadata with PRESTIX.VIP branding
      metadata: TigerPalaceMetadata,
      features: {
        receive: true,
        send: true,
        // Wallet-only connect modal: set to false to hide email/social from AppKit (use Stack Auth for those)
        // When true, connect modal shows Email + Google; when false, only wallet options
        // Supports both NEXT_PUBLIC_APPKIT_EMAIL_LOGIN and legacy NEXT_PUBLIC_APPKIT_EMAIL
        email: process.env.NEXT_PUBLIC_APPKIT_EMAIL_LOGIN === 'true' || process.env.NEXT_PUBLIC_APPKIT_EMAIL === 'true',
        socials: (process.env.NEXT_PUBLIC_APPKIT_SOCIAL_LOGIN === 'true' || (process.env.NEXT_PUBLIC_APPKIT_SOCIALS || '').toLowerCase().includes('google')) ? ['google'] : [],
        emailShowWallets: process.env.NEXT_PUBLIC_APPKIT_EMAIL_LOGIN === 'true' || process.env.NEXT_PUBLIC_APPKIT_EMAIL === 'true',
        analytics: false, // Disable analytics to prevent IndexedDB errors
        // CRITICAL: Enable all wallets for maximum compatibility, especially on mobile
        // This ensures WalletConnect wallets are available on all devices
        // MOBILE FIX: allWallets: true enables wallet discovery from registry API
        // This is essential for mobile browsers (iOS Safari, Android Chrome, Android Edge) where injected wallets don't work
        allWallets: true, // CRITICAL: Must be true for mobile wallet discovery + full "Search Wallet" list (520+)
        legalCheckbox: false,
        // ✅ WC 2.0 COMPLIANCE: Enable smart sessions with storage check
        // Smart sessions enable automatic JWT refresh (7 days for sessions, 30 days for pairings)
        // Storage availability is checked before enabling to prevent IndexedDB errors
        smartSessions: typeof window !== 'undefined' && 
                       window.indexedDB !== undefined ? true : false, // Enable if IndexedDB is available
        collapseWallets: false, // Show all wallets expanded for better UX
        // Connect method order: wallet-only by default; enable email/social via NEXT_PUBLIC_APPKIT_* env
        connectMethodsOrder: (
          process.env.NEXT_PUBLIC_APPKIT_EMAIL_LOGIN === 'true' || process.env.NEXT_PUBLIC_APPKIT_SOCIAL_LOGIN === 'true' ||
          process.env.NEXT_PUBLIC_APPKIT_EMAIL === 'true' || (process.env.NEXT_PUBLIC_APPKIT_SOCIALS || '').toLowerCase().includes('google')
            ? (isMobile ? ['wallet', 'social', 'email'] : ['wallet', 'social', 'email'])
            : ['wallet']
        ) as ('wallet' | 'email' | 'social')[],
        // ✅ FIXED: Show all connector types on mobile (not just WalletConnect)
        // Mobile: Show WalletConnect first, but also show injected wallets if available
        // Desktop: Show injected first, then WalletConnect
        // This ensures all wallets are visible regardless of device
        connectorTypeOrder: connectorTypeOrder as unknown as any[], 
        // ✅ FIXED: Remove excludeWalletIds to allow all wallets (especially for mobile WalletConnect)
        // No wallet exclusions - all wallets are available
        walletFeaturesOrder: ['onramp', 'receive', 'send', 'swaps'],
      },
      // CRITICAL: Enable injected wallet detection (MetaMask, etc.)
      // ✅ DESKTOP FIX: Always enable injected provider detection to support MetaMask browser extension
      // WagmiAdapter will automatically detect window.ethereum when available (desktop browsers)
      // Mobile browsers: WalletConnect is prioritized via connectorTypeOrder, but injected is still available
      // Desktop browsers: Injected is prioritized via connectorTypeOrder (MetaMask extension first)
      enableInjected: true, // ALWAYS true - supports MetaMask extension on desktop browsers
      // Enable WalletConnect to show wallet options in modal
      // This is REQUIRED for iOS/mobile devices where extensions don't work
      enableWalletConnect: true, // CRITICAL: Always enable WalletConnect, especially for iOS
      // Enable EIP6963 for modern wallet detection (improves wallet discovery)
      enableEIP6963: true, // Modern wallet detection standard
      // Enable AppKit One-Click Auth with SIWE - automatically checks for existing sessions
      // If NEXT_PUBLIC_SIWE is false, skip SIWE while keeping wallet connection available
      // ⚠️ CRITICAL: When SIWE is enabled, AppKit will automatically:
      // 1. Call getSession() when wallet connects
      // 2. If getSession() returns null (no valid session with nonce), prompt for signature
      // 3. Call getNonce() to get nonce from server
      // 4. User signs message in MetaMask
      // 5. Call verifyMessage() to verify signature
      // 6. Call onSignIn() after successful verification
      siweConfig: SIWE_ENABLED ? siweConfig : undefined,
      // Allow full wallet registry; no explicit priority list
    });
    
    console.log('✅ [AppKit Module] AppKit modal created successfully', {
      modal: appKitModal ? 'exists' : 'null',
      hasOpen: typeof (appKitModal as any)?.open === 'function',
      projectId,
      enableInjected: true, // Always true for desktop (from line 1190)
      enableWalletConnect: true,
      enableEIP6963: true,
      allWallets: true, // ✅ CRITICAL: Enables automatic wallet discovery from registry
      includeWalletIds: 'registry discovery only (no priority list)',
      connectorTypeOrder: connectorTypeOrder, // Mobile: WalletConnect first, Desktop: Injected first
      mobileDevice: isMobile,
      walletRegistryEnabled: true, // Wallet registry API calls are allowed in fetch interceptor
      siweEnabled: SIWE_ENABLED,
      siweConfig: SIWE_ENABLED ? 'configured (getSession/getNonce/verifyMessage/onSignIn)' : 'disabled',
      siweFlow: SIWE_ENABLED 
        ? 'AppKit will automatically call getSession() when wallet connects → if null, prompts for signature → calls getNonce() → user signs → calls verifyMessage() → calls onSignIn()'
        : 'SIWE disabled - wallet connection only',
      networks: networks.map(n => ({
        id: typeof n.id === 'bigint' ? Number(n.id) : n.id,
        name: n.name,
        chainIdType: typeof n.id === 'bigint' ? 'BigInt (⚠️ PROBLEM)' : 'number (✅ OK)'
      })),
      defaultNetwork: {
        id: typeof networks[0].id === 'bigint' ? Number(networks[0].id) : networks[0].id,
        name: networks[0].name,
        chainIdType: typeof networks[0].id === 'bigint' ? 'BigInt (⚠️ PROBLEM)' : 'number (✅ OK)'
      },
      availableNetworks: networks.map(n => ({
        id: typeof n.id === 'bigint' ? Number(n.id) : n.id,
        name: n.name,
        isTestnet: (n as any).testnet || false
      })),
      environmentNote: 'Ethereum Mainnet is default for production - Sepolia Testnet available for testing',
      walletDiscoveryNote: 'If wallets are not showing, check browser console for wallet registry API errors. Ensure allWallets: true is enabled.'
    });
    
    // ✅ DIAGNOSTIC: Verify connectors are registered with AppKit
    try {
      const registeredConnectors = (appKitModal as any).getConnectors?.();
      if (registeredConnectors && registeredConnectors.length > 0) {
        console.log('🔌 [AppKit Module] Registered Connectors:', 
          registeredConnectors.map((c: any) => ({
            name: c.name,
            id: c.id,
            type: c.type,
            ready: c.ready,
            isInjected: c.type === 'injected' || c.id === 'injected'
          }))
        );
        
        const hasInjectedConnector = registeredConnectors.some((c: any) => 
          c.type === 'injected' || c.id === 'injected'
        );
        
        if (hasInjectedConnector) {
          console.log('✅ [AppKit Module] Injected connector (MetaMask) registered successfully');
        } else {
          console.error('❌ [AppKit Module] Injected connector NOT found! MetaMask will show "Not Detected"');
          console.error('   This means WagmiAdapter did not create an injected connector');
          console.error('   Available connector types:', registeredConnectors.map((c: any) => c.type).join(', '));
        }
      } else {
        console.warn('⚠️ [AppKit Module] No connectors registered with AppKit modal');
      }
    } catch (e) {
      console.warn('⚠️ [AppKit Module] Could not check registered connectors:', e);
    }
    
    // Log mobile-specific configuration
    if (isMobile) {
      const mobileBrowserName = isIOS 
        ? 'iOS Safari' 
        : isMobileChrome 
        ? 'Android Chrome' 
        : isMobileEdge 
        ? 'Android Edge' 
        : 'Mobile Browser';
      
      console.log('📱 [AppKit Module] Mobile Configuration:', {
        isMobile: true,
        mobileBrowser: mobileBrowserName,
        isIOS,
        isAndroid,
        isMobileChrome,
        isMobileEdge,
        hasTouch,
        hasSmallScreen,
        screenWidth: window.innerWidth,
        connectorPriority: 'WalletConnect FIRST (mobile apps recommended), Injected available if extension installed',
        walletDiscovery: 'Automatic via WalletConnect registry API',
        enableInjected: true, // ENABLED - WagmiAdapter will detect if extension available
        enableWalletConnect: true,
        allWallets: true,
        includeWalletIds: '12 wallets included for immediate display',
        supportedMobileBrowsers: ['iOS Safari', 'Android Chrome', 'Android Edge'],
        note: `${mobileBrowserName} - WalletConnect recommended for mobile wallet apps, injected provider available if browser extension installed`,
      });
    } else {
      console.log('🖥️ [AppKit Module] Desktop Configuration:', {
        isMobile: false,
        deviceType: 'Desktop Browser',
        screenWidth: window.innerWidth,
        hasTouch,
        connectorPriority: 'Injected (MetaMask Extension) FIRST, WalletConnect available as alternative',
        metaMaskSupport: 'Browser extension via injected provider (window.ethereum)',
        enableInjected: true,
        enableWalletConnect: true,
        enableEIP6963: true,
        note: 'Desktop browsers prioritize browser extensions (MetaMask, etc.) over WalletConnect',
      });
    }
    
    // Verify network configuration after creation
    if (appKitModal) {
      try {
        const state = (appKitModal as any).getState?.();
        console.log('🌐 [AppKit Module] AppKit State After Creation:', {
          selectedNetworkId: state?.selectedNetworkId,
          networks: state?.networks,
          // Log adapter networks if available
          adapterNetworks: adapter?.wagmiConfig?.chains?.map((chain: any) => ({
            id: chain.id,
            name: chain.name,
            chainId: chain.chainId
          }))
        });
      } catch (e) {
        console.warn('⚠️ [AppKit Module] Could not read AppKit state:', e);
      }
    }
    
    // Wrap modal.open() to prevent multiple simultaneous connection requests
    if (appKitModal && typeof window !== 'undefined') {
      const originalOpen = (appKitModal as any).open;
      let isOpening = false;
      let lastOpenTime = 0;
      let openingPromise: Promise<void> | null = null;
      // Prevent "wallet_requestPermissions already pending" - MetaMask allows only one request at a time
      const DEBOUNCE_MS = 4000;
      
      if (originalOpen) {
        (appKitModal as any).open = async function(...args: any[]) {
          const now = Date.now();
          const timeSinceLastOpen = now - lastOpenTime;
          
          // Check if modal is already open
          try {
            const state = (appKitModal as any).getState?.();
            if (state?.open === true) {
              console.log('⏸️ [AppKit Module] Modal is already open, skipping duplicate open() call');
              return;
            }
          } catch (e) {
            // State check failed, continue
          }
          
          // Prevent rapid successive calls
          if (isOpening || timeSinceLastOpen < DEBOUNCE_MS) {
            console.log('⏸️ [AppKit Module] Connection request already in progress or too soon after last request');
            console.log('   isOpening:', isOpening, 'timeSinceLastOpen:', timeSinceLastOpen, 'ms');
            console.log('   Waiting for previous request to complete or debounce period to pass...');
            // Wait for the previous request to complete
            if (openingPromise) {
              try {
                await openingPromise;
              } catch (e) {
                // Ignore errors from previous request
              }
            }
            // If still too soon, return early (avoids "wallet_requestPermissions already pending")
            if (Date.now() - lastOpenTime < DEBOUNCE_MS) {
              return;
            }
          }
          
          // Set opening flag and create promise
          isOpening = true;
          lastOpenTime = Date.now();
          openingPromise = (async () => {
            try {
              // Clear any pending MetaMask requests before opening
              clearPendingMetaMaskRequests();
              
              // Check if MetaMask has a pending request or is already connected
              const ethereum = (window as any).ethereum;
              if (ethereum && ethereum.isMetaMask) {
                try {
                  // Check if MetaMask is already connected
                  const selectedAddress = ethereum.selectedAddress;
                  if (selectedAddress) {
                    console.log('ℹ️ [AppKit Module] MetaMask already connected:', selectedAddress);
                    console.log('   Attempting to reuse existing connection instead of creating new request');
                    // Small delay to let any pending requests clear
                    await new Promise(resolve => setTimeout(resolve, 100));
                  } else {
                    // Not connected - check for pending requests
                    if (hasPendingMetaMaskRequest()) {
                      console.warn('⚠️ [AppKit Module] MetaMask may have a pending request, waiting before retry...');
                      // Wait a bit longer if there might be a pending request
                      await new Promise(resolve => setTimeout(resolve, 2000));
                      clearPendingMetaMaskRequests();
                    }
                  }
                } catch (e) {
                  console.warn('⚠️ [AppKit Module] Error checking MetaMask state:', e);
                }
              }
              
              console.log('🔘 [AppKit Module] Modal.open() called', args);
              const result = await originalOpen.apply(this, args);
              return result;
            } catch (error) {
              console.error('❌ [AppKit Module] Error opening modal:', error);
              throw error;
            } finally {
              // Reset opening flag after completion
              setTimeout(() => {
                isOpening = false;
                openingPromise = null;
              }, 500); // Small delay to prevent immediate re-triggering
            }
          })();
          
          return openingPromise;
        };
      }
    }
    
    // Mark as initialized to prevent double initialization
    if (appKitModal && typeof window !== 'undefined') {
      (window as any).__appkit_initialized = true;
      (window as any).__appkit_modal = appKitModal;
      
      // Register swap tokens (USDC, EURC, TKNZN) for AppKit swap dialog
      // This ensures tokens are available when swap dialog opens
      try {
        // Dynamic import to avoid circular dependencies
        import('../lib/token-registry').then(({ registerSwapTokens }) => {
          registerSwapTokens();
        }).catch((error) => {
          console.warn('⚠️ [AppKit Module] Failed to register swap tokens:', error);
        });
      } catch (error) {
        console.warn('⚠️ [AppKit Module] Error importing token registry:', error);
      }
    }
    
    return appKitModal;
  } catch (error) {
    console.error('❌ [AppKit Module] Failed to create AppKit modal:', error);
    return null;
  }
})() : null

export {
  modal,
  useAppKit,
  useAppKitState,
  useAppKitTheme,
  useAppKitEvents,
  useAppKitAccount,
  useWalletInfo,
  useAppKitNetwork,
  useDisconnect
}

// Export PRESTIX.VIP theme and components
export { TokenizinPalaceTheme, TigerPalaceMetadata } from '../theme/tokenizin-palace-theme'
export { 
  TokenizinWalletButton,  
} from '../components/TokenizinWalletButton'
