import { getAddress, isAddress } from 'viem';

/**
 * Address Utilities for EIP-55 Checksum Compliance
 * 
 * This module provides utilities for properly handling Ethereum addresses
 * in compliance with EIP-55 checksum standard.
 * 
 * @see https://eips.ethereum.org/EIPS/eip-55
 */

/**
 * Validates and returns an EIP-55 checksummed Ethereum address
 * 
 * @param address - The address to validate and checksum
 * @returns The checksummed address
 * @throws Error if the address is invalid
 * 
 * @example
 * ```typescript
 * const checksummed = toChecksumAddress('0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed');
 * // Returns: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed'
 * ```
 */
export function toChecksumAddress(address: string): string {
  if (!address) {
    throw new Error('Address is required');
  }

  // Remove any whitespace
  const cleanAddress = address.trim();

  // Validate address format
  if (!isAddress(cleanAddress)) {
    throw new Error(`Invalid Ethereum address format: ${cleanAddress}`);
  }

  // Get checksummed address using viem's getAddress
  return getAddress(cleanAddress);
}

/**
 * Safely validates and checksums an address, returning null if invalid
 * 
 * @param address - The address to validate and checksum
 * @returns The checksummed address or null if invalid
 * 
 * @example
 * ```typescript
 * const checksummed = safeToChecksumAddress('0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed');
 * // Returns: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed'
 * 
 * const invalid = safeToChecksumAddress('invalid');
 * // Returns: null
 * ```
 */
export function safeToChecksumAddress(address: string): string | null {
  try {
    return toChecksumAddress(address);
  } catch {
    return null;
  }
}

/**
 * Validates if a string is a valid Ethereum address
 * 
 * @param address - The address to validate
 * @returns true if valid, false otherwise
 * 
 * @example
 * ```typescript
 * isValidAddress('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed'); // true
 * isValidAddress('invalid'); // false
 * ```
 */
export function isValidAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }
  return isAddress(address.trim());
}

/**
 * Compares two Ethereum addresses for equality (case-insensitive)
 * 
 * @param address1 - First address
 * @param address2 - Second address
 * @returns true if addresses are equal, false otherwise
 * 
 * @example
 * ```typescript
 * areAddressesEqual(
 *   '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
 *   '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed'
 * ); // true
 * ```
 */
export function areAddressesEqual(address1: string, address2: string): boolean {
  if (!isValidAddress(address1) || !isValidAddress(address2)) {
    return false;
  }
  
  try {
    return getAddress(address1) === getAddress(address2);
  } catch {
    return false;
  }
}

/**
 * Normalizes an address for database storage
 * Uses checksummed format for EIP-55 compliance
 * 
 * @param address - The address to normalize
 * @returns The checksummed address
 * @throws Error if the address is invalid
 * 
 * @example
 * ```typescript
 * const normalized = normalizeAddress('0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed');
 * // Returns: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed'
 * ```
 */
export function normalizeAddress(address: string): string {
  return toChecksumAddress(address);
}

/**
 * Formats an address for display
 * 
 * @param address - The address to format
 * @param chars - Number of characters to show on each end (default: 4)
 * @returns The formatted address (e.g., "0x5aAe...Aed")
 * 
 * @example
 * ```typescript
 * formatAddressForDisplay('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed');
 * // Returns: '0x5aAe...Aed'
 * 
 * formatAddressForDisplay('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed', 6);
 * // Returns: '0x5aAeb6...1BeAed'
 * ```
 */
export function formatAddressForDisplay(address: string, chars: number = 4): string {
  if (!isValidAddress(address)) {
    return address; // Return as-is if invalid
  }
  
  const checksummed = getAddress(address);
  return `${checksummed.slice(0, chars + 2)}...${checksummed.slice(-chars)}`;
}

/**
 * Validates and checksums multiple addresses
 * 
 * @param addresses - Array of addresses to process
 * @returns Array of checksummed addresses
 * @throws Error if any address is invalid
 */
export function normalizeAddresses(addresses: string[]): string[] {
  return addresses.map(address => normalizeAddress(address));
}

/**
 * Safely validates and checksums multiple addresses, filtering out invalid ones
 * 
 * @param addresses - Array of addresses to process
 * @returns Array of checksummed valid addresses
 */
export function safeNormalizeAddresses(addresses: string[]): string[] {
  return addresses
    .map(address => safeToChecksumAddress(address))
    .filter((address): address is string => address !== null);
}

/**
 * Validates Ethereum address format with detailed error messages
 * Useful for API endpoints that need to return specific error messages
 *
 * @param address - The address to validate
 * @returns Object with isValid flag and optional error message
 *
 * @example
 * ```typescript
 * const result = validateAddressWithError('0x123');
 * if (!result.isValid) {
 *   return res.status(400).json({ error: result.error });
 * }
 * ```
 */
export function validateAddressWithError(address: string): {
  isValid: boolean;
  error?: string;
  checksummedAddress?: string;
} {
  // Check if address is provided
  if (!address || typeof address !== 'string') {
    return {
      isValid: false,
      error: 'Wallet address is required',
    };
  }

  // Trim whitespace
  const cleanAddress = address.trim();

  // Check basic format (0x + 40 hex characters)
  if (!/^0x[a-fA-F0-9]{40}$/.test(cleanAddress)) {
    return {
      isValid: false,
      error: 'Invalid wallet address format. Expected 0x followed by 40 hexadecimal characters.',
    };
  }

  // Validate using viem
  if (!isAddress(cleanAddress)) {
    return {
      isValid: false,
      error: 'Invalid Ethereum address',
    };
  }

  // Get checksummed version
  try {
    const checksummedAddress = getAddress(cleanAddress);
    return {
      isValid: true,
      checksummedAddress,
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Failed to checksum address',
    };
  }
}

/**
 * Extract address from SIWE/SIWX message
 * SIWE messages have the format:
 * "{domain} wants you to sign in with your Ethereum account:\n{address}\n\n..."
 *
 * @param message - The SIWE message
 * @returns The extracted address or null if not found
 */
export function extractAddressFromSIWEMessage(message: string): string | null {
  if (!message) return null;

  const lines = message.split('\n');

  // Look for the line with the Ethereum address (appears after "Ethereum account:")
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check if this line contains an Ethereum address on its own
    const addressMatch = line.match(/^(0x[a-fA-F0-9]{40})$/);
    if (addressMatch) {
      return addressMatch[1];
    }

    // Also check if address is embedded in a line
    const embeddedMatch = line.match(/0x[a-fA-F0-9]{40}/);
    if (embeddedMatch) {
      return embeddedMatch[0];
    }
  }

  // Fallback: regex search across entire message
  const addressMatch = message.match(/0x[a-fA-F0-9]{40}/);
  return addressMatch ? addressMatch[0] : null;
}

/**
 * Shorten address for logging (privacy-friendly)
 *
 * @param address - The address to shorten
 * @param startChars - Number of chars from start (default: 6 including 0x)
 * @param endChars - Number of chars from end (default: 4)
 * @returns Shortened address like "0x5aAe...Aed"
 */
export function shortenAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}
