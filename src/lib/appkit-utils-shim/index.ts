/**
 * AppKit Utils Shim - Fallback Exports Only
 * 
 * This file provides ONLY the missing exports that @reown/appkit-utils doesn't provide.
 * The real @reown/appkit-utils package is used directly - this shim only adds missing exports.
 * 
 * DO NOT require('@reown/appkit-utils') here - it would create a circular dependency
 * when webpack aliases are used. Instead, patch the real package at runtime in appkit.ts.
 */

// FormatUtil - fallback implementation
export const FormatUtil = {
  formatAddress: (address: string, chars: number = 4): string => {
    if (!address || address.length < chars * 2) return address || '';
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
  },
  formatBalance: (balance: string | number, decimals: number = 4): string => {
    if (!balance) return '0';
    try {
      const num = typeof balance === 'string' ? parseFloat(balance) : balance;
      if (isNaN(num)) return '0';
      return num.toFixed(decimals);
    } catch {
      return '0';
    }
  },
};

// HelpersUtil - required by @reown/appkit-pay
export const HelpersUtil = {
  formatAddress: FormatUtil.formatAddress,
  formatBalance: FormatUtil.formatBalance,
  truncateAddress: (address: string, chars: number = 4): string => {
    return FormatUtil.formatAddress(address, chars);
  },
  isValidAddress: (address: string): boolean => {
    if (!address) return false;
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  },
  isAddressEqual: (address1: string, address2: string): boolean => {
    if (!address1 || !address2) return false;
    return address1.toLowerCase() === address2.toLowerCase();
  },
  getChainId: (networkId?: string | number): number | null => {
    if (!networkId) return null;
    try {
      return typeof networkId === 'string' ? parseInt(networkId, 10) : networkId;
    } catch {
      return null;
    }
  },
  parseChainId: (chainId: string | number): number => {
    if (typeof chainId === 'number') return chainId;
    try {
      return parseInt(chainId, 10);
    } catch {
      return 1;
    }
  },
};

// ErrorUtil - required by @reown/appkit-scaffold-ui
export const ErrorUtil = {
  parseError: (error: any): { message: string; code?: string; type?: string } => {
    if (!error) return { message: 'Unknown error' };
    if (error instanceof Error) {
      return {
        message: error.message || 'Unknown error',
        code: (error as any).code,
        type: error.name,
      };
    }
    if (typeof error === 'string') {
      return { message: error };
    }
    if (typeof error === 'object') {
      return {
        message: error.message || error.error || String(error) || 'Unknown error',
        code: error.code,
        type: error.type || error.name,
      };
    }
    return { message: String(error) || 'Unknown error' };
  },
  getErrorMessage: (error: any): string => {
    return ErrorUtil.parseError(error).message;
  },
  getErrorCode: (error: any): string | undefined => {
    return ErrorUtil.parseError(error).code;
  },
  isUserRejectedError: (error: any): boolean => {
    const message = ErrorUtil.getErrorMessage(error).toLowerCase();
    return (
      message.includes('user rejected') ||
      message.includes('user denied') ||
      message.includes('user cancelled') ||
      message.includes('user canceled') ||
      message.includes('rejected by user') ||
      message.includes('denied by user')
    );
  },
  isConnectionError: (error: any): boolean => {
    const message = ErrorUtil.getErrorMessage(error).toLowerCase();
    return (
      message.includes('connection') ||
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('fetch failed')
    );
  },
  formatError: (error: any, fallback: string = 'An error occurred'): string => {
    return ErrorUtil.parseError(error).message || fallback;
  },
};

// ConstantsUtil - required by @reown/appkit and @reown/appkit-scaffold-ui
export const ConstantsUtil = {
  W3M_API_URL: process.env.NEXT_PUBLIC_W3M_API_URL || 'https://api.web3modal.org',
  WALLET_CONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_PROJECT_ID || '',
  CHAIN: {
    EVM: 'eip155',
    SOLANA: 'solana',
  },
  CHAIN_NAMESPACE: {
    EVM: 'eip155',
    SOLANA: 'solana',
  },
  EXPLORER_API: {
    ETHERSCAN: 'https://api.etherscan.io',
    POLYGON: 'https://api.polygonscan.com',
  },
  NETWORK: {
    MAINNET: 'mainnet',
    TESTNET: 'testnet',
  },
  WALLET_CONNECT_METADATA: {
    name: 'AppKit',
    description: 'Connect with AppKit',
    url: typeof window !== 'undefined' ? window.location.origin : '',
    icons: [],
  },
};

// CaipNetworksUtil - required by @reown/appkit for CAIP network handling
export const CaipNetworksUtil = {
  parseCaipNetworkId: (networkId: string): { chainNamespace: string; chainId: string } => {
    const parts = networkId.split(':');
    if (parts.length < 2) {
      return { chainNamespace: 'eip155', chainId: '1' };
    }
    return {
      chainNamespace: parts[0],
      chainId: parts.slice(1).join(':'),
    };
  },
  formatCaipNetworkId: (chainNamespace: string, chainId: string | number): string => {
    return `${chainNamespace}:${chainId}`;
  },
  isValidCaipNetworkId: (networkId: string): boolean => {
    if (!networkId || typeof networkId !== 'string') return false;
    const parts = networkId.split(':');
    return parts.length >= 2 && parts[0].length > 0 && parts[1].length > 0;
  },
  getChainNamespace: (networkId: string): string => {
    return CaipNetworksUtil.parseCaipNetworkId(networkId).chainNamespace;
  },
  getChainId: (networkId: string): string => {
    return CaipNetworksUtil.parseCaipNetworkId(networkId).chainId;
  },
};

// LoggerUtil - required by @reown/appkit for logging
export const LoggerUtil = {
  log: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[AppKit]', ...args);
    }
  },
  warn: (...args: any[]) => {
    console.warn('[AppKit]', ...args);
  },
  error: (...args: any[]) => {
    console.error('[AppKit]', ...args);
  },
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug('[AppKit]', ...args);
    }
  },
  info: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.info('[AppKit]', ...args);
    }
  },
};

export default {
  FormatUtil,
  HelpersUtil,
  ErrorUtil,
  ConstantsUtil,
  CaipNetworksUtil,
  LoggerUtil,
};
