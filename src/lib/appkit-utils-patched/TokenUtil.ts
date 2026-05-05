/**
 * Patched TokenUtil.ts for @reown/appkit-utils
 * 
 * This file replaces the original TokenUtil.js to handle null baseUSDC/baseSepoliaUSDC
 * The original file tries to access .asset on potentially null objects during module initialization.
 */

// Lazy initialization - only access baseUSDC/baseSepoliaUSDC when actually needed
// This prevents "Cannot read properties of null (reading 'asset')" during module initialization
let _tokenAddressesCache: {
  USDC: {
    8453?: string;
    84532?: string;
  };
} | null = null;

function getTokenAddressesBySymbol() {
  if (_tokenAddressesCache) {
    return _tokenAddressesCache;
  }
  
  // Safe access to .asset property - return undefined if null
  const safeGetAsset = (obj: any): string | undefined => {
    if (!obj || obj === null || obj === undefined) return undefined;
    try {
      return obj.asset;
    } catch (e) {
      return undefined;
    }
  };
  
  let baseUSDC: any = null;
  let baseSepoliaUSDC: any = null;
  
  try {
    // Try to import controllers - use dynamic import to handle cases where module isn't loaded yet
    // Note: This will be transpiled by webpack, so we can use require
    const controllersModule = require('@reown/appkit-controllers');
    if (controllersModule) {
      baseUSDC = controllersModule.baseUSDC || null;
      baseSepoliaUSDC = controllersModule.baseSepoliaUSDC || null;
    }
  } catch (e) {
    // If import fails, baseUSDC and baseSepoliaUSDC will remain null
    // This is safe - safeGetAsset will handle null values
    // Don't log here to avoid console spam during initialization
  }
  
  _tokenAddressesCache = {
    USDC: {
      8453: safeGetAsset(baseUSDC),
      84532: safeGetAsset(baseSepoliaUSDC)
    }
  };
  
  return _tokenAddressesCache;
}

export const TokenUtil = {
  get TOKEN_ADDRESSES_BY_SYMBOL() {
    return getTokenAddressesBySymbol();
  },
  getTokenSymbolByAddress(tokenAddress: string): string | undefined {
    if (!tokenAddress) {
      return undefined;
    }
    const addresses = TokenUtil.TOKEN_ADDRESSES_BY_SYMBOL;
    const [symbol] = Object.entries(addresses).find(([_, addressesByChain]) => 
      Object.values(addressesByChain).includes(tokenAddress)
    ) ?? [];
    return symbol;
  },
  formatTokenBalance(balance: any, decimals?: number, asset?: any): string {
    if (!asset || asset === null || asset === undefined) {
      return '0';
    }
    try {
      // If asset is a string, use it directly
      if (typeof asset === 'string') {
        const num = typeof balance === 'string' ? parseFloat(balance) : balance;
        if (isNaN(num)) return '0';
        return num.toFixed(decimals || 4);
      }
      // If asset has decimals property, use it
      const assetDecimals = asset.decimals || decimals || 18;
      const num = typeof balance === 'string' ? parseFloat(balance) : balance;
      if (isNaN(num)) return '0';
      return num.toFixed(assetDecimals);
    } catch (error) {
      console.warn('[appkit-utils-patched] TokenUtil.formatTokenBalance error:', error);
      return '0';
    }
  }
};
