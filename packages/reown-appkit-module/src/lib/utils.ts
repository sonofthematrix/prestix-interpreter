import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Obfuscates wallet addresses for display purposes only
 * 
 * Formats:
 * - Full: 0x8ed7f4fb3aa1a3b346756624b17094dfd6040047 → Display: 0x8ed7..0047
 * - Email: 0x8ed7f4fb3aa1a3b346756624b17094dfd6040047@wallet.local → Display: 0x8ed7..0047@wallet.local
 * 
 * IMPORTANT: This function ONLY affects display rendering.
 * Never use this for form values, API calls, or data persistence.
 * 
 * @param text - The text that may contain a wallet address
 * @returns The obfuscated text for display
 * 
 * @example
 * ```typescript
 * obfuscateWalletAddress('0x8ed7f4fb3aa1a3b346756624b17094dfd6040047@wallet.local')
 * // Returns: '0x8ed7..0047@wallet.local'
 * 
 * obfuscateWalletAddress('0x8ed7f4fb3aa1a3b346756624b17094dfd6040047')
 * // Returns: '0x8ed7..0047'
 * ```
 */
export function obfuscateWalletAddress(text: string | null | undefined): string {
  if (!text) return '';
  
  // Match wallet addresses: 0x followed by 40 hex characters
  const walletPattern = /(0x[a-fA-F0-9]{40})/g;
  
  return text.replace(walletPattern, (match) => {
    // Take first 6 characters (0x + 4 hex) and last 4 characters
    const prefix = match.substring(0, 6);
    const suffix = match.substring(match.length - 4);
    return `${prefix}..${suffix}`;
  });
}

/**
 * Format a number as currency
 * @param value - The numeric value to format
 * @param currency - Currency code (default: 'USD')
 * @returns Formatted currency string
 */
export function formatCurrency(value: number | null | undefined, currency: string = 'USD'): string {
  if (value === null || value === undefined) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a number with thousand separators
 * @param value - The numeric value to format
 * @returns Formatted number string
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Parse a formatted currency string back to a number
 * @param value - The formatted currency string
 * @returns The numeric value
 */
export function parseCurrency(value: string): number {
  if (!value) return 0;
  // Remove currency symbols, commas, and spaces
  const cleaned = value.replace(/[^\d.-]/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * Parse a formatted number string back to a number
 * @param value - The formatted number string
 * @returns The numeric value
 */
export function parseNumber(value: string): number {
  if (!value) return 0;
  // Remove commas and spaces
  const cleaned = value.replace(/[^\d.-]/g, '');
  return parseFloat(cleaned) || 0;
}