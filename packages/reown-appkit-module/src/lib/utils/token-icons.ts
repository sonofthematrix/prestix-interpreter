/**
 * Token Icon Utility
 * 
 * Provides token icon URLs with fallback chain:
 * 1. Database token metadata (if available)
 * 2. Local token icons (/tokens/{symbol}.png)
 * 3. Official token icon sources (CoinGecko, CoinMarketCap, official sites)
 * 4. Contract metadata (if available)
 */

// Token icon mappings - official sources
const TOKEN_ICON_SOURCES: Record<string, string> = {
  // Ethereum
  ETH: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
  // USDC
  USDC: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png',
  // EURC
  EURC: 'https://assets.coingecko.com/coins/images/26045/large/euro-coin.png',
  // TKNZN (Tokenizin Token) - use local or contract
  TKNZN: '/tokens/tokenizin.png',
};

// CoinGecko token IDs for API fallback
const COINGECKO_TOKEN_IDS: Record<string, string> = {
  ETH: 'ethereum',
  USDC: 'usd-coin',
  EURC: 'euro-coin',
};

/**
 * Get token icon URL with fallback chain
 */
export function getTokenIconUrl(
  symbol: string,
  address?: string,
  logoURI?: string
): string | undefined {
  const upperSymbol = symbol.toUpperCase();

  // 1. Use provided logoURI (from database or contract metadata)
  if (logoURI) {
    return logoURI;
  }

  // 2. Check local token icons first
  const localIcon = `/tokens/${upperSymbol.toLowerCase()}.png`;
  // Note: We can't check if file exists at build time, so we'll rely on error handling in Image component

  // 3. Use official token icon sources
  if (TOKEN_ICON_SOURCES[upperSymbol]) {
    return TOKEN_ICON_SOURCES[upperSymbol];
  }

  // 4. Try CoinGecko API for unknown tokens (if address provided)
  if (address && address !== '0x0000000000000000000000000000000000000000') {
    // For now, return undefined and let component handle fallback
    // In the future, we could fetch from CoinGecko API
    return undefined;
  }

  // 5. Return local icon path as fallback (component will handle missing file)
  return localIcon;
}

/**
 * Get token icon URL for specific tokens with known addresses
 */
export function getKnownTokenIcon(symbol: string, address?: string): string {
  const upperSymbol = symbol.toUpperCase();

  // Known token addresses on Sepolia
  const SEPOLIA_TOKEN_ADDRESSES: Record<string, string> = {
    // Add known Sepolia token addresses here if needed
  };

  // Check if we have a known address mapping
  if (address && SEPOLIA_TOKEN_ADDRESSES[address.toLowerCase()]) {
    return getTokenIconUrl(SEPOLIA_TOKEN_ADDRESSES[address.toLowerCase()], address);
  }

  // Use standard icon lookup
  return getTokenIconUrl(upperSymbol, address) || `/tokens/${upperSymbol.toLowerCase()}.png`;
}

/**
 * Token icon configuration for common tokens
 */
export const TOKEN_ICONS: Record<string, { 
  local: string; 
  official?: string; 
  coingecko?: string;
}> = {
  ETH: {
    local: '/tokens/eth.png',
    official: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
    coingecko: 'ethereum',
  },
  USDC: {
    local: '/tokens/usdc.png',
    official: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png',
    coingecko: 'usd-coin',
  },
  EURC: {
    local: '/tokens/eurc.png',
    official: 'https://assets.coingecko.com/coins/images/26045/large/euro-coin.png',
    coingecko: 'euro-coin',
  },
  TKNZN: {
    local: '/tokens/tokenizin.png',
    // TKNZN is custom token, no official source
  },
};

/**
 * Get best available token icon URL
 * Priority: logoURI > local > official > coingecko > fallback
 */
export function getBestTokenIcon(symbol: string, logoURI?: string): string {
  const upperSymbol = symbol.toUpperCase();
  
  // 1. Use provided logoURI (from database or contract metadata)
  if (logoURI) {
    return logoURI;
  }

  // 2. Check token icons config - prefer local icons first
  const tokenConfig = TOKEN_ICONS[upperSymbol];
  if (tokenConfig) {
    // Always prefer local icon if available (faster, no external dependency)
    return tokenConfig.local;
  }

  // 3. Fallback to local icon path (component will handle missing file with initials)
  return `/tokens/${upperSymbol.toLowerCase()}.png`;
}

