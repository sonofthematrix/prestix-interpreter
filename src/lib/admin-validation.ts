/**
 * Admin Validation Utility
 * 
 * Validates admin users based on:
 * - Email domain (e.g., @tokenizin.com)
 * - Wallet address (e.g., 0x8eD7F4FB3Aa1a3B346756624B17094dfd6040047)
 * - ENS domain (e.g., tokenizin.eth)
 * 
 * Note: All wallet addresses are validated and stored using EIP-55 checksum format
 */

import { toChecksumAddress, areAddressesEqual } from '@/lib/address-utils';

/**
 * Admin Domain Configuration
 */
export const ADMIN_DOMAIN = process.env.ADMIN_DOMAIN || 'tokenizin.com';

/**
 * Admin Wallet Configuration
 */
export const ADMIN_WALLET = process.env.ADMIN_WALLET || '';

/**
 * Admin ENS Domain Configuration
 */
export const ENS_DOMAIN = process.env.ENS_DOMAIN || '';

/**
 * Admin Email Whitelist (comma-separated)
 * Specific emails granted admin regardless of domain (e.g., reward2learn@gmail.com)
 */
export const ADMIN_EMAILS = process.env.ADMIN_EMAILS || '';

/**
 * Check if an email is in the admin email whitelist
 */
export function isAdminEmail(email: string): boolean {
  if (!email || typeof email !== 'string' || !ADMIN_EMAILS) {
    return false;
  }
  const emailLower = email.toLowerCase().trim();
  const whitelist = ADMIN_EMAILS.split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
  return whitelist.includes(emailLower);
}

/**
 * Check if an email belongs to the admin domain
 */
export function isAdminDomain(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailLower = email.toLowerCase().trim();
  const domain = emailLower.split('@')[1];

  return domain === ADMIN_DOMAIN.toLowerCase();
}

/**
 * Check if a user should have admin privileges based on email
 */
export function shouldBeAdmin(email: string): boolean {
  return isAdminEmail(email) || isAdminDomain(email);
}

/**
 * Get admin role based on email (whitelist or domain)
 */
export function getAdminRole(email: string): 'ADMIN' | 'MODERATOR' | 'CUSTOMER' {
  if (isAdminEmail(email) || isAdminDomain(email)) {
    return 'ADMIN';
  }
  return 'CUSTOMER';
}

/**
 * Validate admin email format
 */
export function validateAdminEmail(email: string): {
  valid: boolean;
  isAdmin: boolean;
  role: 'ADMIN' | 'MODERATOR' | 'CUSTOMER';
  message?: string;
} {
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email || typeof email !== 'string') {
    return {
      valid: false,
      isAdmin: false,
      role: 'CUSTOMER',
      message: 'Email is required'
    };
  }

  if (!emailRegex.test(email)) {
    return {
      valid: false,
      isAdmin: false,
      role: 'CUSTOMER',
      message: 'Invalid email format'
    };
  }

  const isAdmin = isAdminEmail(email) || isAdminDomain(email);
  const role = getAdminRole(email);

  return {
    valid: true,
    isAdmin,
    role,
    message: isAdmin
      ? isAdminEmail(email)
        ? 'Admin email (whitelist)'
        : `Admin email from ${ADMIN_DOMAIN}`
      : 'Regular customer email'
  };
}

/**
 * Get all valid admin domains (supports multiple domains)
 */
export function getAdminDomains(): string[] {
  const domains = process.env.ADMIN_DOMAINS || process.env.ADMIN_DOMAIN || 'tokenizin.com';
  return domains.split(',').map(d => d.trim().toLowerCase());
}

/**
 * Check if email matches any admin domain (for multi-domain support)
 */
export function isAdminDomainMulti(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailLower = email.toLowerCase().trim();
  const domain = emailLower.split('@')[1];
  const adminDomains = getAdminDomains();

  return isAdminEmail(email) || adminDomains.includes(domain);
}

/**
 * Log admin validation for debugging
 */
export function logAdminValidation(email: string, result: ReturnType<typeof validateAdminEmail>): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔐 Admin Validation:', {
      email,
      isAdmin: result.isAdmin,
      role: result.role,
      adminDomain: ADMIN_DOMAIN,
      message: result.message
    });
  }
}

// ============================================================================
// WALLET-BASED ADMIN VALIDATION
// ============================================================================

/**
 * Normalize wallet address using EIP-55 checksum format
 * @deprecated Use toChecksumAddress from address-utils instead
 */
export function normalizeWalletAddress(address: string): string {
  try {
    return toChecksumAddress(address);
  } catch {
    return '';
  }
}

/**
 * Check if a wallet address is an admin wallet
 * Uses EIP-55 checksummed comparison for accuracy
 */
export function isAdminWallet(walletAddress: string): boolean {
  if (!walletAddress || !ADMIN_WALLET) {
    return false;
  }

  try {
    const checksummedInput = toChecksumAddress(walletAddress);
    
    // Support multiple admin wallets (comma-separated)
    const adminWallets = ADMIN_WALLET.split(',')
      .map(addr => addr.trim())
      .filter(addr => addr.length > 0)
      .map(addr => {
        try {
          return toChecksumAddress(addr);
        } catch {
          return null;
        }
      })
      .filter((addr): addr is string => addr !== null);

    // Use case-insensitive comparison
    return adminWallets.some(adminAddr => areAddressesEqual(adminAddr, checksummedInput));
  } catch {
    return false;
  }
}

/**
 * Check if an ENS name belongs to admin domain
 */
export function isAdminENS(ensName: string): boolean {
  if (!ensName || !ENS_DOMAIN) {
    return false;
  }

  const ensLower = ensName.toLowerCase().trim();
  const ensDomainLower = ENS_DOMAIN.toLowerCase().trim();

  // Check exact match or subdomain match
  return ensLower === ensDomainLower || ensLower.endsWith(`.${ensDomainLower}`);
}

/**
 * Validate admin based on wallet address or ENS
 */
export function validateAdminWallet(walletAddress: string, ensName?: string): {
  valid: boolean;
  isAdmin: boolean;
  role: 'ADMIN' | 'MODERATOR' | 'CUSTOMER';
  method: 'wallet' | 'ens' | null;
  message?: string;
} {
  // Check wallet address first
  if (walletAddress && isAdminWallet(walletAddress)) {
    return {
      valid: true,
      isAdmin: true,
      role: 'ADMIN',
      method: 'wallet',
      message: `Admin wallet: ${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}`
    };
  }

  // Check ENS name
  if (ensName && isAdminENS(ensName)) {
    return {
      valid: true,
      isAdmin: true,
      role: 'ADMIN',
      method: 'ens',
      message: `Admin ENS: ${ensName}`
    };
  }

  // Not an admin
  return {
    valid: true,
    isAdmin: false,
    role: 'CUSTOMER',
    method: null,
    message: 'Regular customer wallet'
  };
}

/**
 * Comprehensive admin validation (email OR wallet)
 */
export function validateAdmin(
  email?: string,
  walletAddress?: string,
  ensName?: string
): {
  valid: boolean;
  isAdmin: boolean;
  role: 'ADMIN' | 'MODERATOR' | 'CUSTOMER';
  method: 'email' | 'wallet' | 'ens' | null;
  message?: string;
} {
  const isEmailAdmin = email ? (isAdminEmail(email) || isAdminDomain(email)) : false;
  const isWalletAdmin = walletAddress ? isAdminWallet(walletAddress) : false;
  const isENSAdmin = ensName ? isAdminENS(ensName) : false;

  // Check if admin through any method
  if (isEmailAdmin || isWalletAdmin || isENSAdmin) {
    const methods: string[] = [];
    if (isEmailAdmin) methods.push('email');
    if (isWalletAdmin) methods.push('wallet');
    if (isENSAdmin) methods.push('ens');

    const method = methods[0] as any;

    return {
      valid: true,
      isAdmin: true,
      role: 'ADMIN',
      method,
      message: `Admin access via ${methods.join(' and ')}`
    };
  }

  return {
    valid: true,
    isAdmin: false,
    role: 'CUSTOMER',
    method: null,
    message: 'Regular customer'
  };
}

/**
 * Get all admin wallet addresses
 */
export function getAdminWallets(): string[] {
  if (!ADMIN_WALLET) return [];
  
  return ADMIN_WALLET.split(',')
    .map(addr => normalizeWalletAddress(addr))
    .filter(addr => addr.length > 0);
}

/**
 * Get admin ENS domains
 */
export function getAdminENSDomains(): string[] {
  if (!ENS_DOMAIN) return [];
  
  return ENS_DOMAIN.split(',')
    .map(domain => domain.trim().toLowerCase())
    .filter(domain => domain.length > 0);
}

/**
 * Log wallet admin validation for debugging
 */
export function logWalletAdminValidation(
  walletAddress: string,
  ensName: string | undefined,
  result: ReturnType<typeof validateAdminWallet>
): void {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔐 Wallet Admin Validation:', {
      walletAddress: `${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}`,
      ensName: ensName || 'none',
      isAdmin: result.isAdmin,
      role: result.role,
      method: result.method,
      adminWallets: getAdminWallets().length,
      adminENS: getAdminENSDomains().length,
      message: result.message
    });
  }
}
