/**
 * PRESTIX.VIP - Custom AppKit Theme Configuration
 *
 * This theme extends Reown AppKit with PRESTIX.VIP branding:
 * - Dark theme with deep forest green backgrounds
 * - Golden orange accents (#F59E0B, #E6B800)
 * - Responsive design for mobile/tablet/desktop
 * - Luxury marketplace aesthetic
 */

export const TokenizinPalaceTheme = {
  themeMode: 'dark' as const,
  themeVariables: {
    // Icon sizing - prevents SVG empty width/height attribute errors (AppKit issue #5442)
    '--w3m-icon-size': '24px',

    // Primary Brand Colors - Tiger Orange/Gold
    '--w3m-accent': '#F59E0B', // Tiger orange (primary)
    '--w3m-color-mix': '#0A3A2A', // Deep forest green (background)
    '--w3m-color-mix-strength': 15,
    
    // Typography
    '--w3m-font-family': "'__Noto_Sans_a57643', '__Noto_Sans_Fallback_a57643', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    '--w3m-font-size-master': '16px',
    '--w3m-font-weight-master': '500',
    
    // Border Radius - Modern, slightly rounded
    '--w3m-border-radius-master': '12px',
    '--w3m-border-radius-secondary': '8px',
    '--w3m-border-radius-tertiary': '4px',
    
    // Spacing
    '--w3m-spacing-xs': '4px',
    '--w3m-spacing-sm': '8px',
    '--w3m-spacing-md': '16px',
    '--w3m-spacing-lg': '24px',
    '--w3m-spacing-xl': '32px',
    
    // Shadows - Luxury depth
    '--w3m-shadow-big': '0 20px 40px -12px rgba(230, 184, 0, 0.25)',
    '--w3m-shadow-medium': '0 10px 20px -8px rgba(230, 184, 0, 0.15)',
    '--w3m-shadow-small': '0 4px 8px -4px rgba(230, 184, 0, 0.1)',
    
    // Background Colors
    '--w3m-background': '#0A3A2A', // Deep forest green
    '--w3m-background-bg': '#1C3A36', // Dark forest (cards)
    '--w3m-background-bg-2': '#2A3A36', // Darker forest (hover states)
    
    // Text Colors
    '--w3m-color-fg': '#F8F5F0', // Soft cream (primary text)
    '--w3m-color-fg-1': '#E6D8B8', // Warm gold (secondary text)
    '--w3m-color-fg-2': '#B8A898', // Muted cream (tertiary text)
    
    // Border Colors
    '--w3m-border-radius': '12px',
    '--w3m-border-color': 'rgba(230, 184, 0, 0.2)', // Golden border with opacity
    
    // Button Colors
    '--w3m-button-border-radius': '12px',
    '--w3m-button-hover-highlight': 'rgba(245, 158, 11, 0.1)',
    
    // Wallet Button Specific
    '--w3m-wallet-button-border-radius': '12px',
    '--w3m-wallet-button-hover-highlight-border': 'rgba(245, 158, 11, 0.3)',
    
    // Modal Colors
    '--w3m-modal-background': '#1C3A36',
    '--w3m-modal-border': 'rgba(230, 184, 0, 0.2)',
    
    // Input Colors
    '--w3m-input-border': 'rgba(230, 184, 0, 0.2)',
    '--w3m-input-focus': 'rgba(245, 158, 11, 0.3)',
    
    // Overlay
    '--w3m-overlay': 'rgba(10, 58, 42, 0.8)', // Dark forest overlay
    
    // Success/Error Colors
    '--w3m-success': '#10B981', // Green
    '--w3m-error': '#EF4444', // Red
    '--w3m-warning': '#F59E0B', // Tiger orange
    
    // Responsive Breakpoints (for CSS)
    '--w3m-mobile-max': '768px',
    '--w3m-tablet-max': '1024px',
  }
};

/**
 * AppKit Metadata - must match Reown Cloud project name (prestix-app) and domains.
 * CRITICAL: url must match actual page URL for Reown AppKit social login (Google OAuth).
 * Mismatch causes "Failed to verify message" in addSession.
 * Add your domain to Reown Dashboard → Project Domains → Configure Domains.
 */
export const TigerPalaceMetadata = {
  name: 'prestix-app',
  description: 'Premium Marketplace for Real Estate Investment & Gaming',
  // CRITICAL: Must match actual page URL for WalletConnect/social login callback verification
  url: typeof window !== 'undefined'
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL ||
       process.env.NEXT_PUBLIC_HOST ||
       (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
       (process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : null) ||
       'https://prestix.vip'),
  icons: ['/favicon.ico']
};

