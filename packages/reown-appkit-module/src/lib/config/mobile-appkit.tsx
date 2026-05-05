"use client";

// CRITICAL: Don't import wagmi at top level - use require() to prevent BigInt errors
// wagmi imports viem internally, which triggers BigInt errors during module evaluation
import type { Chain } from 'viem';

// Mobile-optimized AppKit configuration
export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;

if (!projectId) {
  throw new Error('NEXT_PUBLIC_PROJECT_ID is not defined. Please set it in .env.local');
}

// CRITICAL: Lazy-load networks and WagmiAdapter to prevent BigInt conversion errors
// Mobile-friendly networks with good wallet support
let networksCache: [Chain, ...Chain[]] | null = null;
let wagmiAdapterCache: any = null;

function getNetworks(): [Chain, ...Chain[]] {
  if (!networksCache) {
    // Dynamically require networks to prevent BigInt errors during module evaluation
    const { mainnet, arbitrum, polygon, base, optimism } = require('@reown/appkit/networks');
    networksCache = [mainnet, polygon, arbitrum, base, optimism];
  }
  return networksCache;
}

function getWagmiAdapter() {
  if (!wagmiAdapterCache) {
    // Dynamically require WagmiAdapter and wagmi utilities to prevent BigInt errors during module evaluation
    const { WagmiAdapter } = require('@reown/appkit-adapter-wagmi');
    const { cookieStorage } = require('wagmi');
    
    wagmiAdapterCache = new WagmiAdapter({
      storage: {
        ...cookieStorage,
        key: 'wagmi-storage'
      } as any,
      ssr: true,
      projectId,
      networks: getNetworks(),
      // Mobile-specific configurations
      multiInjectedProviderDiscovery: true,
    });
  }
  return wagmiAdapterCache;
}

export const networks = getNetworks();
export const wagmiAdapter = getWagmiAdapter();

export const config = wagmiAdapter.wagmiConfig;

// Mobile browser deep linking configuration
export const mobileAppKitConfig = {
  // Enable deep linking for mobile browsers
  enableWalletConnect: true,
  enableInjected: true,
  enableCoinbase: false, // Disabled to prevent analytics errors
  enableEmail: false, // We're using wallet-only auth
  enableSocials: [], // No social logins needed
  
  // Mobile browser specific settings
  mobileWallets: [
    'metamask',
    'walletconnect',
    'trust',
    'rainbow',
    'zerion',
    'ledger',
    'safe'
  ],
  
  // Browser compatibility matrix
  browserSupport: {
    chrome: {
      mobile: true,
      desktop: true,
      deepLinking: true,
      inAppBrowser: true
    },
    firefox: {
      mobile: true,
      desktop: true,
      deepLinking: true,
      inAppBrowser: true
    },
    edge: {
      mobile: true,
      desktop: true,
      deepLinking: true,
      inAppBrowser: true
    },
    opera: {
      mobile: true,
      desktop: true,
      deepLinking: true,
      inAppBrowser: false // Opera has limited in-app browser support
    },
    safari: {
      mobile: true,
      desktop: true,
      deepLinking: true,
      inAppBrowser: true
    }
  },
  
  // Deep linking URLs for mobile wallets
  deepLinks: {
    metamask: 'metamask://dapp/',
    trust: 'trust://open_url?coin_id=60&url=',
    rainbow: 'rainbow://open?url=',
    zerion: 'zerion://open?url=',
    imtoken: 'imtokenv2://navigate/DApp?url='
  },
  
  // Fallback handling for unsupported browsers
  fallbackMode: 'walletconnect', // Always fall back to WalletConnect
  
  // QR code settings for desktop
  qrModalOptions: {
    themeMode: 'dark',
    themeVariables: {
      '--w3m-color-mix': '#00D4AA',
      '--w3m-color-mix-strength': 20,
      '--w3m-font-family': 'Inter, sans-serif',
      '--w3m-border-radius-master': '12px'
    }
  }
};

// Mobile detection utility
export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

// Browser detection utility
export const getBrowserInfo = () => {
  if (typeof window === 'undefined') return { name: 'unknown', mobile: false };
  
  const userAgent = navigator.userAgent;
  const mobile = isMobile();
  
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    return { name: 'chrome', mobile, deepLinking: true };
  } else if (userAgent.includes('Firefox')) {
    return { name: 'firefox', mobile, deepLinking: true };
  } else if (userAgent.includes('Edg')) {
    return { name: 'edge', mobile, deepLinking: true };
  } else if (userAgent.includes('OPR') || userAgent.includes('Opera')) {
    return { name: 'opera', mobile, deepLinking: mobile }; // Limited desktop deep linking
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    return { name: 'safari', mobile, deepLinking: true };
  }
  
  return { name: 'unknown', mobile, deepLinking: false };
};

// Custom wallet connection handler for mobile browsers
export const handleMobileWalletConnection = async (walletType: string) => {
  const browser = getBrowserInfo();
  const currentUrl = window.location.href;
  
  console.log(`🔗 Attempting ${walletType} connection on ${browser.name} (mobile: ${browser.mobile})`);
  
  if (browser.mobile && browser.deepLinking) {
    const deepLinkUrl = mobileAppKitConfig.deepLinks[walletType as keyof typeof mobileAppKitConfig.deepLinks];
    
    if (deepLinkUrl) {
      const fullUrl = `${deepLinkUrl}${encodeURIComponent(currentUrl)}`;
      console.log(`📱 Opening deep link: ${fullUrl}`);
      
      // Try to open the deep link
      window.location.href = fullUrl;
      
      // Fallback to app store if deep link fails (after 2 seconds)
      setTimeout(() => {
        console.log("⚠️ Deep link timeout, showing app store options");
        // Could redirect to app store or show installation instructions
      }, 2000);
      
      return true;
    }
  }
  
  return false; // Let AppKit handle the connection normally
};
