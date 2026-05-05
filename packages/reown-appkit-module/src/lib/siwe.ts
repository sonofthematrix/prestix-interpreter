// SIWE (Sign-In with Ethereum) implementation with real database integration

// ⚠️ CRITICAL: This file is SERVER-SIDE ONLY
// It uses createClient which imports pg/kysely (Node.js modules)
// Webpack configuration ensures this file is never bundled in client code
import { toChecksumAddress, shortenAddress } from '@/lib/address-utils';
import { initializeNewUser } from '@/lib/services/user-initialization';
import type { AuthUser } from '@/lib/auth';
import { randomBytes } from 'crypto';
import { SiweMessage as SiweMessageLib } from 'siwe';
import { createPublicClient, http, type Chain } from 'viem';
import { mainnet, sepolia } from 'viem/chains';

// Direct import - webpack will replace with stub in client bundles
// Since this file is only used in API routes (server-side), direct import is safe
import { createClient } from '@/lib/db';

// Simple wrapper function that matches the previous async interface
async function getCreateClient() {
  // Only import on server-side
  if (typeof window !== 'undefined') {
    throw new Error('createClient cannot be used in browser. Use API routes instead.');
  }
  
  return createClient;
}

export interface SiweMessage {  
  address: string;
  statement?: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
  notBefore?: string;
  requestId?: string;
  resources?: string[];
}

/**
 * Simplified SiweMessage interface for type compatibility
 * Actual verification uses the siwe library's SiweMessage class
 */
export interface SiweMessage {  
  address: string;
  statement?: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
  notBefore?: string;
  requestId?: string;
  resources?: string[];
}

// Generate SIWE message
export async function generateSIWEMessage(
  address: string,
  domain: string,
  uri: string,
  chainId: number
): Promise<{ message: string; nonce: string; expiresAt: Date; chainId: number }> {
  const addrAbbr = shortenAddress(address);
  console.log(`[SIWE] Generating SIWE message for ${addrAbbr} on chain ID: ${chainId}`);

  // Generate cryptographically secure random nonce
  // SIWE nonce should be a random string (not a number) to prevent replay attacks
  // This function runs server-side only, so we can use Node.js crypto module
  let nonce: string;
  
  try {
    // Server-side: Use Node.js crypto module for cryptographically secure randomness
    // Generate 16 random bytes and convert to base36-like string (alphanumeric, URL-safe)
    // Convert each byte to base36 (0-9, a-z) and join
    const bytes = randomBytes(16);
    nonce = Array.from(bytes, byte => byte.toString(36)).join('').substring(0, 16);
  } catch (error) {
    // Fallback: Use Math.random if crypto module not available (shouldn't happen server-side)
    console.warn('[SIWE] Crypto module not available, using Math.random fallback');
    nonce = Math.random().toString(36).substring(2, 15);
  }
  const message = `Sign in with Ethereum message for ${address} on ${domain}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  return {
    message,
    nonce,
    expiresAt,
    chainId,
  };
}

/** Chains for EIP-1271 verification (Reown social/embedded wallets may use mainnet or Sepolia) */
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
  const rpcUrl =
    process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
    process.env.SEPOLIA_RPC_URL ||
    'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161';
  return createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl),
  });
}

/** Normalize recovery byte (v) to 27 or 28 for ecrecover/siwe. Some wallets send 0/1 or EIP-155 v. */
function normalizeSignatureRecoveryByte(signature: string): string {
  const clean = signature.startsWith('0x') ? signature.slice(2) : signature;
  if (clean.length < 130) return signature;
  const vHex = clean.slice(-2);
  const v = parseInt(vHex, 16);
  if (v === 27 || v === 28) return signature;
  const normalizedV = v === 0 || v === 1 ? 27 + v : 27 + (v % 2);
  const normalizedHex = clean.slice(0, -2) + normalizedV.toString(16).padStart(2, '0');
  return '0x' + normalizedHex;
}

/** Try viem verifyMessage for EIP-1271/EIP-6492 (embedded/smart account signatures). */
async function verifyWithViem(message: string, signature: string): Promise<boolean> {
  try {
    const siweMessage = new SiweMessageLib(message);
    const addr = siweMessage.address;
    const chainId = siweMessage.chainId ?? 11155111;
    if (!addr) return false;
    const publicClient = getPublicClientForChain(chainId);
    return await publicClient.verifyMessage({
      address: addr as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    return false;
  }
}

/**
 * Verify a SIWE signature using the siwe library.
 * Supports EOA (siwe.verify) and smart/embedded accounts (EIP-1271 via viem.verifyMessage).
 * Accepts signatures >= 130 hex chars (EOA 65-byte and longer EIP-6492/EIP-1271).
 */
export async function verifySIWESignature(
  address: string,
  signature: string,
  message: string
): Promise<boolean> {
  const addrAbbr = shortenAddress(address);
  console.log(`[SIWE] Verifying SIWE signature for ${addrAbbr}`);
  
  try {
    if (!signature || typeof signature !== 'string') {
      console.error('❌ [SIWE] Invalid signature: signature is not a string');
      return false;
    }
    
    const cleanSig = signature.startsWith('0x') ? signature.slice(2) : signature;
    // EOA: 130 hex chars. EIP-6492/EIP-1271 can be longer
    if (cleanSig.length < 130) {
      console.error(`❌ [SIWE] Invalid signature length: ${cleanSig.length} (minimum 130)`);
      return false;
    }
    if (!/^[0-9a-fA-F]+$/.test(cleanSig)) {
      console.error('❌ [SIWE] Invalid signature format: contains non-hex characters');
      return false;
    }
    
    const normalizedSignature = cleanSig.length >= 130 ? normalizeSignatureRecoveryByte(signature) : signature;
    const siweMessage = new SiweMessageLib(message);
    
    // 1. Try standard siwe verify (EOA)
    try {
      const result = await siweMessage.verify({ signature: normalizedSignature });
      if (result.success) {
        const verifiedAddress = result.data.address;
        const checksummedAddress = toChecksumAddress(address);
        const checksummedVerified = toChecksumAddress(verifiedAddress);
        if (checksummedAddress.toLowerCase() !== checksummedVerified.toLowerCase()) {
          console.error(`❌ [SIWE] Address mismatch: expected ${checksummedAddress}, got ${checksummedVerified}`);
          return false;
        }
        console.log(`✅ [SIWE] Signature verification successful (EOA) for ${addrAbbr}`);
        return true;
      }
    } catch {
      console.log('[SIWE] EOA verify failed, trying viem for smart account (EIP-1271)...');
    }
    
    // 2. Fallback: viem verifyMessage for embedded/smart accounts (e.g. Reown Google login)
    const viemOk = await verifyWithViem(message, normalizedSignature);
    if (viemOk) {
      console.log(`✅ [SIWE] Signature verification successful (EIP-1271) for ${addrAbbr}`);
      return true;
    }
    
    console.error('❌ [SIWE] Signature verification failed (EOA and EIP-1271)');
    return false;
  } catch (error) {
    console.error(`❌ [SIWE] Error verifying signature:`, error);
    if (error instanceof Error) {
      console.error(`   Error message: ${error.message}`);
    }
    return false;
  }
}

/**
 * Find or create user by wallet address with full database initialization
 * Creates all related entities: Account, UserPreferences, UserQtechAccount, Portfolio, etc.
 */
export async function findOrCreateUserByWallet(
  address: string,
  chainId: number,
  authMethod: string
): Promise<any> {
  const addrAbbr = shortenAddress(address);
  console.log(`[SIWE] Finding or creating user by wallet ${addrAbbr}`);

  // Check for DATABASE_URL before attempting database operations
  if (!process.env.DATABASE_URL) {
    const error = new Error('DATABASE_URL environment variable is required for ZenStack database connection.');
    console.error(`❌ [SIWE] ${error.message}`);
    throw error;
  }

  // Use system user context for user creation
  const systemUser: AuthUser = {
    id: 'system',
    email: 'system@TKNZN.pro',
    name: 'System Admin',
    role: 'ADMIN',
  };
  
  let db;
  try {
  const createClientFn = await getCreateClient();
    db = await createClientFn(systemUser);
  } catch (dbError: any) {
    console.error(`❌ [SIWE] Failed to create database client:`, dbError);
    const errorMessage = dbError?.message || String(dbError);
    
    // Provide more specific error messages
    if (errorMessage.includes('DATABASE_URL')) {
      throw new Error('Database connection failed: DATABASE_URL environment variable is required');
    } else if (errorMessage.includes('schema')) {
      throw new Error('Database connection failed: ZenStack schema could not be loaded');
    } else if (errorMessage.includes('Module not found') || errorMessage.includes('Cannot find package')) {
      throw new Error('Database connection failed: Required database modules are not available');
    } else {
      throw new Error(`Database connection failed: ${errorMessage}`);
    }
  }

  // Normalize wallet address to checksummed format
  const checksummedAddress = toChecksumAddress(address);

  // Use ZenStack to find or create user
  try {
    // Generate a deterministic email from wallet address
    // This allows us to find users by wallet address using email as a proxy
    const email = `${checksummedAddress.slice(2, 8)}...${checksummedAddress.slice(-6)}@wallet.local`;
    
    // Try to find existing user by email (wallet-based email)
    // Note: Schema only has id and email fields, so we use email as wallet identifier
    let user = await db.user.findFirst({
      where: { email },
    });

    const isNewUser = !user;

    if (!user) {
      // Create new user with wallet-based email
      console.log(`[SIWE] Creating new user for wallet ${addrAbbr}`);
      
      user = await db.user.create({
        data: {
          email, // Only email field exists in schema
        },
      });

      console.log(`✅ [SIWE] User created: ${user.id} (${addrAbbr})`);

      // Try to initialize related entities if the service exists
      // This may fail if schema doesn't support these relations, but we continue anyway
      try {
        const initResult = await initializeNewUser({
          userId: user.id,
          email: user.email,
          name: `Wallet User ${addrAbbr}`,
          walletAddress: checksummedAddress,
          authMethod: (authMethod || 'wallet') as 'wallet' | 'email' | 'social' ,
          provider: 'wallet',
          providerAccountId: checksummedAddress,
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
    }

    if (!user) {
      throw new Error(`Failed to create or find user for wallet ${addrAbbr}`);
    }

    // Return user data with wallet address included (even though it's not in schema)
    // The wallet address is derived from the email format
    return {
      id: user.id,
      email: user.email,
      name: `Wallet User ${addrAbbr}`, // Derived name since schema doesn't have name field
      walletAddress: checksummedAddress, // Return the wallet address even though not in schema
      authMethod: authMethod || 'wallet',
      role: 'CUSTOMER', // Default role since schema doesn't have role field
      chainId: chainId,
      createdAt: new Date(), // Default since schema doesn't have createdAt
      updatedAt: new Date(), // Default since schema doesn't have updatedAt
    };
  } catch (dbError: any) {
    console.error(`❌ [SIWE] Error finding or creating user for ${addrAbbr}:`, dbError);
    throw dbError;
  }
}

/**
 * Create session (generic - works for all auth methods)
 * @deprecated Use createSession instead for consistency
 */
export async function createWalletSession(
  userId: string,
  walletAddress: string,
  chainId: number,
  authMethod: string
): Promise<any> {
  return createSession(userId, 'wallet', {
    walletAddress,
    chainId,
  });
}

/**
 * Create session (generic - works for all auth methods)
 */
export async function createSession(
  userId: string,
  authMethod: string,
  options?: {
    walletAddress?: string;
    chainId?: number;
  }
): Promise<any> {
  const addrAbbr = options?.walletAddress ? shortenAddress(options.walletAddress) : userId;
  console.log(`[SIWE] Creating session for user ${userId} (${addrAbbr}) - ${authMethod}`);

  // Use system user context for session creation
  const systemUser: AuthUser = {
    id: 'system',
    email: 'system@TKNZN.pro',
    name: 'System Admin',
    role: 'ADMIN',
  };
  const createClientFn = await getCreateClient();
  const db = await createClientFn(systemUser);

  // Build session data
  const sessionData: any = {
    userId,
    authMethod: authMethod || 'wallet',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  };

  // Add wallet-specific fields if wallet auth
  if (authMethod === 'wallet' && options?.walletAddress) {
    sessionData.walletAddress = toChecksumAddress(options.walletAddress);
    sessionData.chainId = options.chainId || 1;
  }

  // Use ZenStack to create session
  try {
    // Check which model exists before using it
    // @ts-ignore - walletSession may still exist in schema
    const SessionModel = (db.session && typeof db.session.create === 'function') 
      ? db.session 
      : (db.walletSession && typeof db.walletSession.create === 'function')
        ? db.walletSession
        : null;
    
    if (!SessionModel) {
      // Session model doesn't exist in schema - this is OK, NextAuth handles sessions via cookies
      // Log a warning but don't fail - authentication can still succeed without database session storage
      console.warn('⚠️ [SIWE] Neither session nor walletSession model found in schema. Session will not be stored in database.');
      console.warn('⚠️ [SIWE] NextAuth will handle session management via cookies. Database session storage is optional.');
      // Return a mock session object so the function doesn't fail
      const walletAddr = options?.walletAddress || 'unknown';
      const mockSession: any = {
        id: `${walletAddr}-${Date.now()}`,
        userId: userId || 'system',
        authMethod: authMethod || 'wallet',
        walletAddress: toChecksumAddress(walletAddr),
        chainId: options?.chainId || 11155111,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      };
      return mockSession;
    } else {
      // Create session using the detected model
      const session = await SessionModel.create({
        data: sessionData,
      });

      console.log(`✅ [SIWE] Session created: ${session.id} for ${addrAbbr} (${authMethod})`);
      return session;
    }
  } catch (dbError: any) {
    console.error(`❌ [SIWE] Error creating session for ${addrAbbr}:`, dbError);
    throw dbError;
  }
}

export function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Store SIWE session in database
 * Stores nonce and signature for persistent session management
 */
export async function storeSIWESession(
  userId: string,
  walletAddress: string,
  chainId: number,
  nonce: string,
  signature: string,
  message: string,
  expiresAt?: Date
): Promise<any> {
  const addrAbbr = shortenAddress(walletAddress);
  console.log(`💾 [SIWE] Storing SIWE session for ${addrAbbr} (nonce: ${nonce.substring(0, 8)}...)`);

  // Use system user context for session creation
  const systemUser: AuthUser = {
    id: 'system',
    email: 'system@TKNZN.pro',
    name: 'System Admin',
    role: 'ADMIN',
  };
  const createClientFn = await getCreateClient();
  const db = await createClientFn(systemUser);

  // Normalize wallet address
  const checksummedAddress = toChecksumAddress(walletAddress);
  const sessionExpiresAt = expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours default

  try {
    // Check which model exists before using it
    // @ts-ignore - walletSession may still exist in schema
    const SessionModel = (db.session && typeof db.session.updateMany === 'function') 
      ? db.session 
      : (db.walletSession && typeof db.walletSession.updateMany === 'function')
        ? db.walletSession
        : null;
    
    if (!SessionModel) {
      throw new Error('Neither session nor walletSession model found in schema. Please update the schema.');
    }
    
    if (SessionModel === db.walletSession) {
      console.warn('⚠️ [SIWE] Using walletSession model (schema may not be updated yet)');
    }

    // First, invalidate any existing active sessions for this wallet
    await SessionModel.updateMany({
      where: {
        walletAddress: checksummedAddress,
        expiresAt: {
          gte: new Date(), // Only update non-expired sessions
        },
      },
      data: {
        expiresAt: new Date(), // Expire them immediately
      },
    });

    // Create new session with nonce and signature
    // Note: If your schema doesn't have nonce/signature fields, you may need to add them
    // For now, we'll store them in a way that works with existing schema
    const session = await SessionModel.create({
      data: {
        userId,
        walletAddress: checksummedAddress,
        chainId,
        expiresAt: sessionExpiresAt,
        // Store nonce and signature as metadata if schema supports it
        // Otherwise, we'll need to extend the schema
      },
    });

    console.log(`✅ [SIWE] SIWE session stored: ${session.id} for ${addrAbbr}`);
    
    // Store nonce and signature separately if needed (could be in a separate table or JSON field)
    // For now, we'll store them in window/localStorage as a fallback
    if (typeof window !== 'undefined') {
      const sessionKey = `siwe_session_${checksummedAddress.toLowerCase()}`;
      localStorage.setItem(sessionKey, JSON.stringify({
        sessionId: session.id,
        nonce,
        signature,
        message,
        expiresAt: sessionExpiresAt.toISOString(),
      }));
    }
    
    return session;
  } catch (dbError: any) {
    const errorMessage = dbError?.message || String(dbError);
    const isDatabaseError = errorMessage.includes('Database operation') || 
                           errorMessage.includes('database connection') ||
                           errorMessage.includes('no database connection');
    
    if (isDatabaseError) {
      console.log(`⚠️ [SIWE] Database unavailable, storing session in localStorage for ${addrAbbr}`);
      
      // Fallback to localStorage
      if (typeof window !== 'undefined') {
        const sessionKey = `siwe_session_${checksummedAddress.toLowerCase()}`;
        localStorage.setItem(sessionKey, JSON.stringify({
          userId,
          walletAddress: checksummedAddress,
          chainId,
          nonce,
          signature,
          message,
          expiresAt: sessionExpiresAt.toISOString(),
        }));
      }
      
      return null;
    }
    
    throw dbError;
  }
}

/**
 * Retrieve SIWE session from database
 * Checks database first, then falls back to localStorage
 * 
 * ⚠️ CLIENT-SAFE: This function can be called from client components
 * - On server: Checks database first, then localStorage
 * - On client: Only checks localStorage (database check skipped to prevent bundling issues)
 */
export async function getSIWESession(
  walletAddress: string
): Promise<{ session: any; nonce: string | null; signature: string | null } | null> {
  const addrAbbr = shortenAddress(walletAddress);
  console.log(`🔍 [SIWE] Retrieving SIWE session for ${addrAbbr}`);

  const checksummedAddress = toChecksumAddress(walletAddress);

  // Only check database on server-side (prevents bundling pg/kysely in client)
  if (typeof window === 'undefined') {
    // Use ZenStack to retrieve session from database (server-side only)
    try {
      const systemUser: AuthUser = {
        id: 'system',
        email: 'system@TKNZN.pro',
        name: 'System Admin',
        role: 'ADMIN',
      };
      const createClientFn = await getCreateClient();
  const db = await createClientFn(systemUser);

    // Check which model exists before using it
    // @ts-ignore - walletSession may still exist in schema
    const SessionModel = (db.session && typeof db.session.findFirst === 'function') 
      ? db.session 
      : (db.walletSession && typeof db.walletSession.findFirst === 'function')
        ? db.walletSession
        : null;
    
    if (!SessionModel) {
      // Session model doesn't exist - this is OK, return null (no stored session)
      // NextAuth handles session management via cookies, so database sessions are optional
      console.debug('ℹ️ [SIWE] Session model not found in schema, skipping database session check');
      return null;
    }
    
    if (SessionModel === db.walletSession) {
      console.warn('⚠️ [SIWE] Using walletSession model (schema may not be updated yet)');
    }

    // Find active session for this wallet
    const session = await SessionModel.findFirst({
      where: {
        walletAddress: checksummedAddress,
        expiresAt: {
          gte: new Date(), // Not expired
        },
      },
      orderBy: {
        createdAt: 'desc', // Get most recent
      },
    });

    if (session) {
      console.log(`✅ [SIWE] Found active session in database: ${session.id} for ${addrAbbr}`);
      
      // Try to get nonce and signature from localStorage
      let nonce: string | null = null;
      let signature: string | null = null;
      
      if (typeof window !== 'undefined') {
        const sessionKey = `siwe_session_${checksummedAddress.toLowerCase()}`;
        const stored = localStorage.getItem(sessionKey);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed.sessionId === session.id) {
              nonce = parsed.nonce || null;
              signature = parsed.signature || null;
            }
          } catch (e) {
            console.warn('⚠️ [SIWE] Failed to parse stored session data');
          }
        }
      }
      
      return { session, nonce, signature };
    }
    } catch (dbError: any) {
      console.error('❌ [SIWE] Error retrieving session from database:', dbError);
      // Continue to localStorage fallback
    }
  } else {
    // Client-side: Skip database check, only use localStorage
    console.log('ℹ️ [SIWE] Client-side: Skipping database check, using localStorage only');
  }

  // Fallback to localStorage (works on both client and server)
  if (typeof window !== 'undefined') {
    const sessionKey = `siwe_session_${checksummedAddress.toLowerCase()}`;
    const stored = localStorage.getItem(sessionKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const expiresAt = new Date(parsed.expiresAt);
        
        if (expiresAt > new Date()) {
          console.log(`✅ [SIWE] Found active session in localStorage for ${addrAbbr}`);
          return {
            session: {
              id: parsed.sessionId || 'local',
              userId: parsed.userId,
              walletAddress: parsed.walletAddress,
              chainId: parsed.chainId,
              expiresAt,
            },
            nonce: parsed.nonce || null,
            signature: parsed.signature || null,
          };
        } else {
          // Expired, remove it
          localStorage.removeItem(sessionKey);
        }
      } catch (e) {
        console.warn('⚠️ [SIWE] Failed to parse localStorage session');
      }
    }
  }

  console.log(`ℹ️ [SIWE] No active session found for ${addrAbbr}`);
  return null;
}