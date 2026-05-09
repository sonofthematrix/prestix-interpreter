import { toChecksumAddress } from '@/lib/address-utils';
import { isAdminWallet, shouldBeAdmin } from '@/lib/admin-validation';
import { createClient } from '@/lib/db';
import { getSystemUser } from '@/lib/utils/system-user';
import { randomBytes, createHash } from 'crypto';
import { SiweMessage } from 'siwe';
import type { AuthUser } from '@/lib/auth';
import { createPublicClient, http, type Chain } from 'viem';
import { mainnet, sepolia } from 'viem/chains';

export interface SIWESession {
  message: string;
  nonce: string;
  expiresAt: Date;
}

export interface SIWEVerificationResult {
  success: boolean;
  address?: string;
  error?: string;
}

/**
 * Generate a new SIWE nonce and message for wallet authentication
 */
export async function generateSIWEMessage(
  address: string,
  domain: string,
  uri: string,
  chainId: number = 11155111 // Default to Sepolia testnet (11155111)
): Promise<SIWESession> {
  // Validate and checksum the address (EIP-55 compliance)
  const checksummedAddress = toChecksumAddress(address);
  console.log('🔐 Generating SIWE message for checksummed address:', checksummedAddress, 'on chain ID:', chainId);
  
  // Generate a secure random nonce
  const nonce = randomBytes(16).toString('hex');
  
  // Create SIWE message with properly checksummed address
  const siweMessage = new SiweMessage({
    domain,
    address: checksummedAddress, // Use checksummed address for EIP-55 compliance
    statement: 'Sign in to PRESTIX.VIP with your wallet',
    uri,
    version: '1',
    chainId, // Use provided chain ID (defaults to Sepolia 11155111)
    nonce,
    issuedAt: new Date().toISOString(),
    expirationTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
  });

  const message = siweMessage.prepareMessage();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  console.log('✅ SIWE message generated with EIP-55 checksummed address');

  return {
    message,
    nonce,
    expiresAt,
  };
}

/**
 * Validate Ethereum signature format
 * Accepts standard 65-byte EOA signatures and longer EIP-6492/EIP-1271 smart account signatures
 */
function isValidEthereumSignature(signature: string): boolean {
  if (!signature || typeof signature !== 'string') {
    return false;
  }

  const cleanSig = signature.startsWith('0x') ? signature.slice(2) : signature;

  // Standard EOA: 130 hex chars (65 bytes). EIP-6492/EIP-1271 can be longer
  if (cleanSig.length < 130) {
    console.error(`❌ Invalid signature length: ${cleanSig.length} (minimum 130)`);
    return false;
  }

  if (!/^[0-9a-fA-F]+$/.test(cleanSig)) {
    console.error('❌ Signature contains non-hex characters');
    return false;
  }

  return true;
}

/**
 * Detect if signature is from a smart account (EIP-1271/EIP-6492), not a standard EOA 65-byte signature.
 * siweMessage.verify() expects EOA format and throws "invalid raw signature length" for contract-style signatures.
 */
function isSmartAccountSignature(signature: string): boolean {
  const cleanSig = signature.startsWith('0x') ? signature.slice(2) : signature;
  // EOA: 130–132 hex chars. Smart account: contract call data, typically much longer or 0-padded.
  if (cleanSig.length > 132) return true;
  // Common EIP-1271 wrapper: starts with selector + padding (0x0000...)
  if (cleanSig.length === 132 && cleanSig.startsWith('000000000000000000000000')) return true;
  return false;
}

/**
 * Normalize the recovery byte (v) in an Ethereum signature to 27 or 28.
 * ecrecover and SIWE/viem expect v to be 27 or 28; some wallets or libraries send
 * 0/1, EIP-155 encoded v, or invalid values (e.g. 31), causing INVALID_ARGUMENT.
 */
function normalizeSignatureRecoveryByte(signature: string): string {
  const clean = signature.startsWith('0x') ? signature.slice(2) : signature;
  if (clean.length < 130) return signature;

  const vHex = clean.slice(-2);
  const v = parseInt(vHex, 16);

  // Already valid for recovery
  if (v === 27 || v === 28) return signature;

  // Raw recovery id 0 or 1 → 27 or 28
  let normalizedV: number;
  if (v === 0 || v === 1) {
    normalizedV = 27 + v;
  } else if (v >= 35) {
    // EIP-155: v = 35 + 2*chainId + recoveryId → extract recovery id (0 or 1)
    normalizedV = 27 + (v % 2);
  } else {
    // Invalid v (e.g. 31): assume recovery id is v % 2 so we get 27 or 28
    normalizedV = 27 + (v % 2);
  }

  const normalizedHex = clean.slice(0, -2) + normalizedV.toString(16).padStart(2, '0');
  return '0x' + normalizedHex;
}

/** Known chains for EIP-1271 verification (Reown social login may use mainnet or Sepolia) */
const CHAIN_ID_TO_CHAIN: Record<number, Chain> = {
  1: mainnet,
  11155111: sepolia,
};

function getPublicClientForChain(chainId: number) {
  const chain = CHAIN_ID_TO_CHAIN[chainId];
  if (chain) {
    const rpcUrl =
      chainId === 11155111
        ? process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
          process.env.SEPOLIA_RPC_URL ||
          'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'
        : process.env.NEXT_PUBLIC_MAINNET_RPC_URL ||
          process.env.MAINNET_RPC_URL ||
          'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161';
    return createPublicClient({
      chain,
      transport: http(rpcUrl),
    });
  }
  // Fallback: Sepolia for unknown chains (e.g. testnets)
  const rpcUrl =
    process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
    process.env.SEPOLIA_RPC_URL ||
    'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161';
  return createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl),
  });
}

/**
 * Extract address and chainId from SIWE/SIWX message string (fallback when SiweMessage parse fails).
 * Reown/embedded wallets may use single-line or SIWX formats that siwe package rejects.
 * Exported for use in /auth/v1/authenticate when Reown sends non-standard message format.
 */
export function extractFromSiweMessage(message: string): { address: string | null; chainId: number } {
  const addrMatch = message.match(/0x[a-fA-F0-9]{40}/);
  // SIWE: "Chain ID: 11155111", SIWX/compact: "chainId:11155111" or "chainId=11155111"
  const chainMatch =
    message.match(/Chain\s*ID:\s*eip155:(\d+)/i) ||
    message.match(/Chain\s*ID:\s*(\d+)/i) ||
    message.match(/chainId[=:]\s*(\d+)/i) ||
    message.match(/eip155:(\d+)/);
  return {
    address: addrMatch ? addrMatch[0] : null,
    chainId: chainMatch ? parseInt(chainMatch[1], 10) : 11155111,
  };
}

/**
 * Try viem verifyMessage for EIP-1271/EIP-6492 smart account signatures.
 * When SiweMessage parse fails, uses address/chainId from message regex or provided fallback.
 */
async function verifyWithViem(
  message: string,
  signature: string,
  fallback?: { address: string; chainId: number },
  rawSignature?: string
): Promise<SIWEVerificationResult | null> {
  let address: string | null = null;
  let chainId = 11155111;

  try {
    const siweMessage = new SiweMessage(message);
    address = siweMessage.address ?? null;
    chainId = siweMessage.chainId ?? 11155111;
  } catch {
    const extracted = extractFromSiweMessage(message);
    address = fallback?.address ?? extracted.address;
    chainId = fallback?.chainId ?? extracted.chainId;
  }

  if (!address) {
    console.warn('[SIWE] viem fallback: no address from message or fallback');
    return null;
  }

  // Normalize line endings - client may send \r\n or \r; personal_sign uses \n
  const normalizedMessage = message.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Try normalized signature first, then raw if different (EIP-6492/1271 may need raw)
  const signaturesToTry = rawSignature && rawSignature !== signature ? [signature, rawSignature] : [signature];

  const publicClient = getPublicClientForChain(chainId);
  for (const sig of signaturesToTry) {
    try {
      const isValid = await publicClient.verifyMessage({
        address: address as `0x${string}`,
        message: normalizedMessage,
        signature: sig as `0x${string}`,
      });

      if (isValid) {
        const checksummedAddress = toChecksumAddress(address);
        console.log('✅ SIWE verification successful (smart account / EIP-1271)', { chainId });
        return { success: true, address: checksummedAddress };
      }
    } catch (viemError) {
      console.warn('[SIWE] viem verifyMessage failed:', viemError);
    }
  }

  // Retry on the other chain when Reown/Upgrade flow sends wrong or missing chainId (smart account may be on mainnet or Sepolia)
  const otherChain = chainId === 11155111 ? 1 : 11155111;
  if (CHAIN_ID_TO_CHAIN[otherChain]) {
    console.log('[SIWE] Retrying EIP-1271 verification on chain', otherChain);
    for (const sig of signaturesToTry) {
      try {
        const otherClient = getPublicClientForChain(otherChain);
        const isValid = await otherClient.verifyMessage({
          address: address as `0x${string}`,
          message: normalizedMessage,
          signature: sig as `0x${string}`,
        });
        if (isValid) {
          const checksummedAddress = toChecksumAddress(address);
          console.log('✅ SIWE verification successful (smart account / EIP-1271, retried chain)', {
            chainId: otherChain,
          });
          return { success: true, address: checksummedAddress };
        }
      } catch (viemError) {
        console.warn('[SIWE] viem verifyMessage (retry chain) failed:', viemError);
      }
    }
  }

  console.warn('[SIWE] viem verifyMessage returned false (signature mismatch)');
  return null;
}

/**
 * Verify a SIWE signature and authenticate the user.
 * Supports both EOA (standard ecrecover) and smart accounts (EIP-1271/EIP-6492 via viem).
 * When SiweMessage parse fails (e.g. Reown embedded wallet format), falls back to viem with address/chainId from body.
 */
/** Reject payloads that are clearly not SIWE messages (e.g. JSON error objects). */
function looksLikeSiweMessage(message: string): boolean {
  if (!message || typeof message !== 'string') return false;
  const t = message.trim();
  // JSON objects/arrays are never valid SIWE messages
  if (t.startsWith('{') || t.startsWith('[')) return false;
  // SIWE messages typically contain an Ethereum address
  if (!/0x[a-fA-F0-9]{40}/.test(t)) return false;
  return true;
}

/**
 * Normalize SIWE message so verification matches what the client signed.
 * - Unescape literal \\n and \\r\\n (double-encoded newlines from JSON/Reown).
 * - Normalize line endings \r\n and \r to \n (personal_sign hashes the exact string).
 */
function normalizeSiweMessageLines(msg: string): string {
  if (!msg || typeof msg !== 'string') return msg;
  // Handle double-escaped newlines (e.g. client sends "line1\\nline2" so we get backslash+n)
  let out = msg.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\r/g, '\n');
  out = out.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  return out;
}

export async function verifySIWESignature(
  message: string,
  signature: string,
  nonce: string,
  fallback?: { address: string; chainId: number }
): Promise<SIWEVerificationResult> {
  try {
    // Use normalized line endings so siwe/viem hash the same string the client signed
    const normalizedMessage = normalizeSiweMessageLines(message);

    if (!looksLikeSiweMessage(normalizedMessage)) {
      const preview = normalizedMessage?.slice?.(0, 80) ?? String(normalizedMessage).slice(0, 80);
      console.error('[SIWE] Rejected non-SIWE message (preview):', preview + (normalizedMessage?.length > 80 ? '...' : ''));
      return {
        success: false,
        error:
          'Invalid SIWE message format. Expected EIP-4361 message (e.g. "domain wants you to sign..."). Received non-SIWE payload.',
      };
    }

    if (!isValidEthereumSignature(signature)) {
      const errorMsg =
        signature.length > 200
          ? "Invalid signature format. Signature appears to be transaction data instead of a personal signature. Please ensure you're signing the message with personal_sign, not sending a transaction."
          : 'Invalid Ethereum signature format. Expected at least 65-byte (130 hex character) signature.';
      return { success: false, error: errorMsg };
    }

    // Normalize recovery byte (v) to 27 or 28 for standard 65-byte EOA signatures only.
    // EIP-6492/EIP-1271 signatures can be longer and have different structure - do NOT normalize.
    const normalizedSignature =
      signature.length >= 130 && signature.length <= 132
        ? normalizeSignatureRecoveryByte(signature)
        : signature;

    // Smart account (EIP-1271): skip siwe.verify() to avoid "invalid raw signature length"; use viem only.
    if (isSmartAccountSignature(signature)) {
      const rawSig = normalizedSignature !== signature ? signature : undefined;
      const viemResult = await verifyWithViem(normalizedMessage, normalizedSignature, fallback, rawSig);
      if (viemResult) return viemResult;
      return {
        success: false,
        error: 'Signature verification failed. Please sign the message again.',
      };
    }

    // 1. Try standard siwe verify (EOA) - SiweMessage parse may fail for Reown embedded wallet format
    let siweMessage: SiweMessage | null = null;
    try {
      siweMessage = new SiweMessage(normalizedMessage);
    } catch (parseError) {
      // Reown/AppKit may send "Chain ID: eip155:11155111" (EIP-4361 expects digits only) or other non-standard format
      console.log('🔄 SiweMessage parse failed (e.g. Chain ID eip155: or embedded wallet format), trying viem...');
      const rawSig = normalizedSignature !== signature ? signature : undefined;
      const viemResult = await verifyWithViem(normalizedMessage, normalizedSignature, fallback, rawSig);
      if (viemResult) return viemResult;
      // Don't surface parser internals ("max line number was 1"); return generic message
      return {
        success: false,
        error: 'Signature verification failed. The sign-in message format may not be supported.',
      };
    }

    try {
      // ✅ CRITICAL: For ReownAuthentication, nonce might come from Reown Cloud
      // If nonce is empty or doesn't match, try verification without nonce first
      // This allows ReownAuthentication to work even if nonce source differs
      let result;
      if (nonce && nonce.length > 0) {
        result = await siweMessage.verify({ signature: normalizedSignature, nonce });
      } else {
        // Try without nonce validation (for ReownAuthentication compatibility)
        console.log('⚠️ [SIWE] No nonce provided, attempting verification without nonce validation');
        result = await siweMessage.verify({ signature: normalizedSignature });
      }
      
      if (result.success) {
        const checksummedAddress = toChecksumAddress(result.data.address);
        console.log('✅ SIWE verification successful (EOA)');
        return { success: true, address: checksummedAddress };
      } else {
        // If nonce validation failed but we had a nonce, try without it (Reown Cloud compatibility)
        if (nonce && nonce.length > 0) {
          console.log('⚠️ [SIWE] Nonce validation failed, retrying without nonce (ReownAuthentication compatibility)');
          result = await siweMessage.verify({ signature: normalizedSignature });
          if (result.success) {
            const checksummedAddress = toChecksumAddress(result.data.address);
            console.log('✅ SIWE verification successful (EOA, nonce bypassed)');
            return { success: true, address: checksummedAddress };
          }
        }
      }
    } catch (verifyError) {
      console.log('🔄 SIWE EOA verify failed, trying viem for smart account...', verifyError);
    }

    // 2. Fallback: viem verifyMessage (EIP-1271/EIP-6492 for embedded wallets)
    const rawSig = normalizedSignature !== signature ? signature : undefined;
    const viemResult = await verifyWithViem(normalizedMessage, normalizedSignature, fallback, rawSig);
    if (viemResult) return viemResult;

    return {
      success: false,
      error: 'Signature verification failed. Please sign the message again.',
    };
  } catch (error) {
    console.error('❌ SIWE verification error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown verification error';
    return { success: false, error: msg };
  }
}

/**
 * Create or update a wallet session in the database
 */
/**
 * Create wallet session with authMethod support
 * CRITICAL FIX: Added authMethod parameter to support multiple authentication methods
 *
 * @deprecated Use sessionManager.createSession() instead for better centralized management
 */
export async function createWalletSession(
  userId: string,
  walletAddress: string,
  sessionData: SIWESession,
  signature: string,
  authMethod: string = 'wallet', // CRITICAL FIX: Add authMethod parameter
  chainId: number = 11155111, // Default to Sepolia testnet
  userAgent?: string,
  ipAddress?: string
) {
  // Delegate to centralized SessionManager
  const { sessionManager } = await import('@/lib/services/session-manager');

  return await sessionManager.createSession({
    userId,
    walletAddress,
    nonce: sessionData.nonce,
    message: sessionData.message,
    signature,
    chainId,
    authMethod,
    userAgent,
    ipAddress,
    expiresIn: sessionData.expiresAt.getTime() - Date.now(),
  });
}

/**
 * Derive display name from email (e.g. "john.doe@gmail.com" → "John Doe")
 */
function deriveNameFromEmail(email: string): string {
  if (!email || !email.includes('@')) return 'User';
  const local = email.split('@')[0].trim();
  if (!local) return 'User';
  // Handle common patterns: john.doe → John Doe, johndoe → Johndoe
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
  }
  return local.charAt(0).toUpperCase() + local.slice(1).toLowerCase();
}

/**
 * Get Gravatar URL for email (deterministic avatar; uses mystery-person silhouette when no Gravatar set).
 * Returns a proxy URL so Next.js image optimization fetches it server-side through our own proxy,
 * avoiding Vercel/serverless bot-blocking on direct Gravatar CDN requests.
 */
function getGravatarUrl(email: string, size = 200): string {
  if (!email || !email.includes('@')) return '';
  const hash = createHash('md5').update(email.trim().toLowerCase()).digest('hex');
  // d=mp  → mystery-person silhouette (always returns an image; avoids 404s)
  // d=identicon was previously used but Gravatar CDN sometimes blocks server-side fetches,
  // causing Next.js _next/image to return 404.
  const gravatarUrl = `https://www.gravatar.com/avatar/${hash}?d=mp&s=${size}`;
  return `/api/image-proxy?url=${encodeURIComponent(gravatarUrl)}`;
}

/**
 * Find or create user by wallet address
 * Enhanced to detect new users for onboarding flow
 * 
 * CRITICAL FIX: Added authMethod parameter to support multiple authentication methods
 * Supports: 'wallet', 'email', 'social'
 * 
 * When socialEmail is provided (Google social login): syncs email, name, profileImageUrl,
 * lastLoginAt to DB so profile/wallet UI shows Google-derived info.
 */
export async function findOrCreateUserByWallet(
  walletAddress: string,
  chainId: number = 1,
  authMethod: string = 'wallet',
  options?: {
    ipAddress?: string;
    userAgent?: string;
    ensName?: string;
    /** Email from social login (walletInfo.identifier) - used for ADMIN_EMAILS/ADMIN_DOMAIN check */
    socialEmail?: string;
    /** Profile image URL from social provider (e.g. Google picture) when Reown sends it */
    socialProfileImageUrl?: string;
  }
): Promise<{ user: any; isNewUser: boolean }> {
  // Use system user context for user creation (system operation)
  const systemUser = await getSystemUser();
  const db = createClient(systemUser);
  
  // Ensure address is properly checksummed
  const checksummedAddress = toChecksumAddress(walletAddress);
  const addrAbbr = `${checksummedAddress.slice(0, 6)}...${checksummedAddress.slice(-4)}`;
  console.log(`👤 [SIWE] Finding or creating user for wallet ${addrAbbr} with authMethod: ${authMethod}`);
  
  // Try to find existing user by wallet address
  // Use select to avoid querying columns that might not exist (walletNonce, walletNonceExpiry)
  let user = await db.user.findUnique({
    where: { walletAddress: checksummedAddress } as any,
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      profileImageUrl: true,
      dateOfBirth: true,
      bio: true,
      emailVerified: true,
      password: true,
      status: true,
      walletAddress: true,
      walletType: true,
      chainId: true,
      authMethod: true,
      lastWalletSignIn: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true,
      onboardedViaLinkId: true,
      onboardedByPromoter: true,
      accounts: true,
    } as any,
  });

  const socialEmail = options?.socialEmail?.trim().toLowerCase();

  // When no user by wallet but social login: avoid duplicate users_email_key by linking wallet to existing user by email
  if (!user && socialEmail) {
    const existingByEmail = await db.user.findFirst({
      where: { email: socialEmail } as any,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        profileImageUrl: true,
        dateOfBirth: true,
        bio: true,
        emailVerified: true,
        password: true,
        status: true,
        walletAddress: true,
        walletType: true,
        chainId: true,
        authMethod: true,
        lastWalletSignIn: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        onboardedViaLinkId: true,
        onboardedByPromoter: true,
        accounts: true,
      } as any,
    });
    if (existingByEmail) {
      console.log(`🔗 [SIWE] Linking wallet ${addrAbbr} to existing user by email: ${existingByEmail.id}`);
      user = await db.user.update({
        where: { id: existingByEmail.id } as any,
        data: {
          walletAddress: checksummedAddress,
          authMethod: (authMethod as 'wallet' | 'email' | 'social') || existingByEmail.authMethod,
          lastLoginAt: new Date(),
          ...(options?.socialProfileImageUrl && !existingByEmail.profileImageUrl
            ? { profileImageUrl: options.socialProfileImageUrl }
            : {}),
        },
        include: { accounts: true },
      });
      return { user, isNewUser: false };
    }
  }

  const isNewUser = !user;

  if (!user) {
    // Admin: wallet (ADMIN_WALLET) OR social email (ADMIN_EMAILS/ADMIN_DOMAIN)
    const isAdminByWallet = isAdminWallet(checksummedAddress);
    const isAdminByEmail = options?.socialEmail ? shouldBeAdmin(options.socialEmail) : false;
    const userRole = isAdminByWallet || isAdminByEmail ? 'PLATFORM_ADMIN' : 'MEMBER';

    // Sync Google/social info when available
    const displayEmail = socialEmail || `${checksummedAddress.toLowerCase()}@wallet.local`;
    const displayName =
      options?.ensName ||
      (socialEmail ? deriveNameFromEmail(socialEmail) : `Wallet User ${addrAbbr}`);
    const avatarUrl =
      options?.socialProfileImageUrl ||
      (socialEmail ? getGravatarUrl(socialEmail) : undefined);

    // Create new user with wallet authentication (catch duplicate email race: another request created same email)
    console.log(`📝 [SIWE] Creating new user for wallet ${addrAbbr} with role: ${userRole}${socialEmail ? ` (email: ${socialEmail})` : ''}`);
    try {
      user = await db.user.create({
        data: {
          email: displayEmail,
          name: displayName,
          profileImageUrl: avatarUrl ?? undefined,
          walletAddress: checksummedAddress,
          authMethod: authMethod as 'wallet' | 'email' | 'social',
          role: userRole as 'MEMBER' | 'PROMOTER' | 'HOST' | 'VENUE_STAFF' | 'VENUE_ADMIN' | 'PLATFORM_ADMIN',
          status: 'ACTIVE',
          lastLoginAt: new Date(),
        },
        include: {
          accounts: true,
        },
      });
      console.log(`✅ [SIWE] User created: ${user.id} (${addrAbbr})`);
    } catch (createError: any) {
      const isDuplicateEmail =
        createError?.code === 'P2002' ||
        createError?.dbErrorCode === '23505' ||
        (typeof createError?.message === 'string' && createError.message.includes('users_email_key'));
      if (isDuplicateEmail && socialEmail) {
        const existingByEmail = await db.user.findFirst({
          where: { email: socialEmail } as any,
          include: { accounts: true },
        });
        if (existingByEmail) {
          console.log(`🔗 [SIWE] Duplicate email on create - linking wallet ${addrAbbr} to existing user: ${existingByEmail.id}`);
          user = await db.user.update({
            where: { id: existingByEmail.id } as any,
            data: {
              walletAddress: checksummedAddress,
              authMethod: (authMethod as 'wallet' | 'email' | 'social') || existingByEmail.authMethod,
              lastLoginAt: new Date(),
            },
            include: { accounts: true },
          });
        } else {
          const byWallet = await db.user.findUnique({
            where: { walletAddress: checksummedAddress } as any,
            include: { accounts: true },
          });
          if (byWallet) user = byWallet;
          else throw createError;
        }
      } else {
        throw createError;
      }
    }
    
    // CRITICAL FIX: Initialize user with all related entities (Account, Preferences, Portfolio, etc.)
    try {
      const { initializeNewUser } = await import('@/lib/services/user-initialization');
      const userEmail: string = (user.email as string | null | undefined) || `${checksummedAddress.slice(2, 8)}...${checksummedAddress.slice(-6)}@wallet.local`;
      const initResult = await initializeNewUser({
        userId: String(user.id),
        email: userEmail as string,
        name: displayName,
        walletAddress: checksummedAddress,
        authMethod: authMethod as 'wallet' | 'email' | 'social',
        provider: 'wallet',
        providerAccountId: checksummedAddress,
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
      });

      if (initResult.success) {
        console.log(`✅ [SIWE] User initialization complete for ${addrAbbr}`);
      } else {
        console.warn(`⚠️ [SIWE] User initialization had errors for ${addrAbbr}:`, initResult.errors);
      }
    } catch (initError: any) {
      console.error(`❌ [SIWE] User initialization failed for ${addrAbbr}:`, initError);
      // Continue even if initialization fails - user is created
    }
  } else {
    console.log(`✅ [SIWE] Found existing user: ${user.id} (${addrAbbr})`);

    // Check if existing user should be promoted to admin (wallet or social email)
    const isAdminByWallet = isAdminWallet(checksummedAddress);
    const isAdminByEmail = options?.socialEmail ? shouldBeAdmin(options.socialEmail) : false;
    const shouldPromoteToAdmin =
      (isAdminByWallet || isAdminByEmail) && user.role !== 'PLATFORM_ADMIN';

    // Update authMethod if user already exists but auth method differs (e.g. social vs wallet)
    const needsAuthMethodUpdate =
      authMethod && user.authMethod !== authMethod;
    const updatedAuthMethod = needsAuthMethodUpdate
      ? (authMethod as 'wallet' | 'email' | 'social')
      : user.authMethod;

    // Sync Google/social info when available: update placeholder email/name/avatar, set lastLoginAt
    const userEmail = user.email as string | null | undefined;
    const userName = user.name as string | null | undefined;
    const hasPlaceholderEmail =
      (userEmail && typeof userEmail === 'string' && userEmail.endsWith('@wallet.local')) || !userEmail;
    const hasPlaceholderName =
      !userName || (typeof userName === 'string' && userName.startsWith('Wallet User '));
    const needsProfileSync =
      socialEmail &&
      (hasPlaceholderEmail || hasPlaceholderName || !user.profileImageUrl);

    const updateData: any = {};
    if (shouldPromoteToAdmin) {
      updateData.role = 'PLATFORM_ADMIN';
      console.log(
        `🔄 [SIWE] Promoting existing user ${user.id} to PLATFORM_ADMIN role (${isAdminByEmail ? 'email' : 'wallet'})`
      );
    }
    if (needsAuthMethodUpdate) {
      updateData.authMethod = updatedAuthMethod;
      console.log(`🔄 [SIWE] Updating authMethod from '${user.authMethod}' to '${updatedAuthMethod}'`);
    }
    if (needsProfileSync) {
      if (hasPlaceholderEmail && socialEmail) {
        updateData.email = socialEmail as string;
      }
      if (hasPlaceholderName && socialEmail) {
        updateData.name = deriveNameFromEmail(socialEmail) as string;
      }
      if (!user.profileImageUrl) {
        updateData.profileImageUrl =
          (options?.socialProfileImageUrl || (socialEmail ? getGravatarUrl(socialEmail) : '')) as string;
      }
      updateData.lastLoginAt = new Date();
      console.log(`🔄 [SIWE] Syncing profile from Google for user ${user.id}`);
    } else if (socialEmail) {
      // Still update lastLoginAt on every social login
      updateData.lastLoginAt = new Date();
    }

    if (Object.keys(updateData).length > 0) {
      try {
        user = await db.user.update({
          where: { id: user.id } as any,
          data: updateData,
          include: {
            accounts: true,
          },
        });
        console.log(`✅ [SIWE] Updated user ${user.id} successfully`);
      } catch (updateError: any) {
        // Email uniqueness conflict: another user may have this email
        // ZenStack uses dbErrorCode '23505' (PostgreSQL); Prisma uses code 'P2002'
        const isDuplicateEmail =
          (updateError?.code === 'P2002' || updateError?.dbErrorCode === '23505') &&
          updateData.email;
        if (isDuplicateEmail) {
          console.warn(`⚠️ [SIWE] Email ${updateData.email} already in use, skipping email sync`);
          delete updateData.email;
          updateData.lastLoginAt = new Date();
          try {
            user = await db.user.update({
              where: { id: user.id } as any,
              data: updateData,
              include: { accounts: true },
            });
          } catch (e) {
            console.warn(`⚠️ [SIWE] Failed to update user ${user.id}:`, e);
          }
        } else {
          console.warn(`⚠️ [SIWE] Failed to update user ${user.id}:`, updateError);
        }
      }
    }
  }

  return { user, isNewUser };
}

/**
 * Validate and clean up expired wallet sessions
 *
 * @deprecated Use sessionManager.cleanupExpiredSessions() instead
 */
export async function cleanupExpiredSessions() {
  const { sessionManager } = await import('@/lib/services/session-manager');
  return await sessionManager.cleanupExpiredSessions();
}

/**
 * Get active wallet session for user
 *
 * @deprecated Use sessionManager.getActiveSessionByUserId() instead
 */
export async function getActiveWalletSession(userId: string) {
  const { sessionManager } = await import('@/lib/services/session-manager');
  return await sessionManager.getActiveSessionByUserId(userId);
}
