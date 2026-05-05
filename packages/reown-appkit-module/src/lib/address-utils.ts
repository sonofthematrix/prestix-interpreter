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

  // Get checksummed address using viem's getAddress (proper EIP-55 with Keccak-256)
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
 * Check if two addresses are equal (case-insensitive, handles checksumming)
 * 
 * @param address1 - First address to compare
 * @param address2 - Second address to compare
 * @returns True if addresses are equal (case-insensitive)
 * 
 * @example
 * ```typescript
 * areAddressesEqual('0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed', '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed');
 * // Returns: true
 * ```
 */
export function areAddressesEqual(address1: string, address2: string): boolean {
  if (!address1 || !address2) return false;
  try {
    return getAddress(address1) === getAddress(address2);
  } catch {
    return false;
  }
}

/**
 * Validate if an address is a valid Ethereum address
 * 
 * @param address - The address to validate
 * @returns True if the address is valid
 * 
 * @example
 * ```typescript
 * isValidAddress('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed');
 * // Returns: true
 * 
 * isValidAddress('invalid');
 * // Returns: false
 * ```
 */
export function isValidAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  return isAddress(address);
}

/**
 * Shorten an address for display (e.g., 0x1234...5678)
 * 
 * @param address - The address to shorten
 * @param chars - Number of characters to show on each end (default: 4)
 * @returns The shortened address
 * 
 * @example
 * ```typescript
 * shortenAddress('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed');
 * // Returns: '0x5aAe...BeAed'
 * ```
 */
export function shortenAddress(address: string, chars = 4): string {
  if (!address || address.length < chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
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
 * @returns The formatted address (e.g., "0x5aAe...Aed")
 * 
 * @example
 * ```typescript
 * formatAddress('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed');
 * // Returns: '0x5aAe...BeAed'
 * 
 * formatAddress('0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed', 6);
 * // Returns: '0x5aAeb6...1BeAed'
 * ```
 */
export function formatAddress(address: string): string {
  if (!isValidAddress(address)) return address;
  return toChecksumAddress(address);
}
