import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
 * Convert BigInt values to strings for JSON serialization
 * Recursively processes objects and arrays to handle nested BigInt values
 * 
 * @param obj - The object, array, or value to serialize
 * @returns The serialized object with BigInt values converted to strings
 * 
 * @example
 * ```typescript
 * const data = { amount: 9007199254740991n };
 * const serialized = serializeBigInt(data);
 * // Returns: { amount: "9007199254740991" }
 * 
 * JSON.stringify(serialized); // Works without error
 * ```
 */
export function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  // Handle Date objects - they serialize fine but we check early to avoid iteration
  if (obj instanceof Date) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }
  
  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        serialized[key] = serializeBigInt(obj[key]);
      }
    }
    return serialized;
  }
  
  return obj;
}
