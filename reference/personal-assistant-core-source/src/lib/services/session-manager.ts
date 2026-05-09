/**
 * Centralized Session Manager for SIWE Authentication
 *
 * This service manages the complete lifecycle of wallet authentication sessions:
 * - Creating sessions after signature verification
 * - Retrieving active sessions
 * - Refreshing sessions before expiration
 * - Invalidating expired or disconnected sessions
 *
 * Benefits of centralization:
 * - Single source of truth for session logic
 * - Consistent error handling
 * - Easier testing and maintenance
 * - Clear separation of concerns
 */

import { toChecksumAddress } from '@/lib/address-utils';
import type { AuthUser } from '@/lib/auth';
import { createClient } from '@/lib/db';
import { randomBytes } from 'crypto';

export interface SessionData {
  userId: string;
  walletAddress: string;
  sessionId: string;
  nonce: string;
  message: string;
  signature: string;
  chainId: number;
  networkName: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

export interface ActiveSession {
  id: string;
  sessionId: string;
  userId: string;
  walletAddress: string;
  chainId: number;
  networkName: string;
  expiresAt: Date;
  lastUsedAt: Date;
  isActive: boolean;
  status: string;
}

export interface SessionCreationOptions {
  userId: string;
  walletAddress: string;
  nonce: string;
  message: string;
  signature: string;
  chainId?: number;
  authMethod?: string;
  userAgent?: string;
  ipAddress?: string;
  expiresIn?: number; // Duration in milliseconds
}

export class SessionManager {
  private systemUser: AuthUser = {
    id: 'system',
    email: 'system@TKNZN.pro',
    role: 'ADMIN' as const,
    name: 'System Admin'
  };

  /**
   * Create a new wallet session
   */
  async createSession(options: SessionCreationOptions): Promise<SessionData> {
    const {
      userId,
      walletAddress,
      nonce,
      message,
      signature,
      chainId = 11155111, // Default to Sepolia
      authMethod = 'wallet',
      userAgent,
      ipAddress,
      expiresIn = 24 * 60 * 60 * 1000, // Default: 24 hours
    } = options;

    const db = createClient(this.systemUser);

    // Ensure address is properly checksummed
    const checksummedAddress = toChecksumAddress(walletAddress);

    // Get network name from chain ID
    const networkName = this.getNetworkName(chainId);

    // Calculate expiration
    const expiresAt = new Date(Date.now() + expiresIn);

    console.log(`💾 [SessionManager] Creating session for ${checksummedAddress.slice(0, 6)}...${checksummedAddress.slice(-4)} on ${networkName} (chainId: ${chainId})`);

    // Idempotent create: if a session with this nonce already exists for this user/wallet, return it
    if (nonce && nonce.trim() !== '') {
      const existing = await db.walletSession.findFirst({
        where: {
          nonce,
          userId,
          walletAddress: checksummedAddress,
          isActive: true,
          expiresAt: { gt: new Date() },
        } as any,
      }) as any;
      if (existing) {
        console.log(`✅ [SessionManager] Reusing existing session (duplicate nonce): ${existing.sessionId?.substring(0, 8) || existing.id}...`);
        return {
          userId: existing.userId,
          walletAddress: existing.walletAddress,
          sessionId: existing.sessionId || existing.id,
          nonce: existing.nonce,
          message: existing.message || '',
          signature: existing.signature || '',
          chainId: existing.chainId ?? chainId,
          networkName: existing.networkName || networkName,
          expiresAt: existing.expiresAt,
          userAgent: existing.userAgent || undefined,
          ipAddress: existing.ipAddress || undefined,
        };
      }
    }

    let session: any;
    try {
      session = await db.walletSession.create({
        data: {
          userId,
          walletAddress: checksummedAddress,
          sessionId: randomBytes(32).toString('hex'),
          nonce: nonce || randomBytes(16).toString('hex'),
          message,
          signature,
          expiresAt,
          userAgent,
          ipAddress,
          chainId,
          networkName,
        } as any,
      }) as any;
    } catch (createError: any) {
      const isDuplicateNonce =
        createError?.message?.includes?.('wallet_sessions_nonce_key') ||
        createError?.message?.includes?.('nonce') && createError?.message?.includes?.('unique') ||
        createError?.code === 'P2002' ||
        createError?.dbErrorCode === '23505';
      if (isDuplicateNonce && nonce && nonce.trim() !== '') {
        const existing = await db.walletSession.findFirst({
          where: { nonce } as any,
        }) as any;
        if (existing) {
          console.log(`✅ [SessionManager] Duplicate nonce handled: returning existing session ${existing.sessionId?.substring(0, 8) || existing.id}...`);
          return {
            userId: existing.userId,
            walletAddress: existing.walletAddress,
            sessionId: existing.sessionId || existing.id,
            nonce: existing.nonce,
            message: existing.message || '',
            signature: existing.signature || '',
            chainId: existing.chainId ?? chainId,
            networkName: existing.networkName || networkName,
            expiresAt: existing.expiresAt,
            userAgent: existing.userAgent || undefined,
            ipAddress: existing.ipAddress || undefined,
          };
        }
      }
      throw createError;
    }

    // Update or create wallet connection
    await db.walletConnection.upsert({
      where: {
        userId_walletAddress: {
          userId,
          walletAddress: checksummedAddress,
        },
      } as any,
      update: {
        lastConnectedAt: new Date(),
        connectionCount: {
          increment: 1,
        },
      } as any,
      create: {
        userId,
        walletAddress: checksummedAddress,
        isPrimary: true,
        isVerified: true,
        verificationDate: new Date(),
        firstConnectedAt: new Date(),
        lastConnectedAt: new Date(),
      } as any,
    });

    // Update user's wallet address and auth method
    const currentUser = await db.user.findUnique({
      where: { id: userId } as any,
      select: { authMethod: true } as any,
    }) as any;

    let updatedAuthMethod = authMethod;
    if (currentUser?.authMethod && currentUser.authMethod !== 'wallet' && authMethod === 'wallet') {
      updatedAuthMethod = 'wallet';
      console.log(`🔄 [SessionManager] Updating authMethod from '${currentUser.authMethod}' to 'wallet'`);
    }

    await db.user.update({
      where: { id: userId } as any,
      data: {
        walletAddress: checksummedAddress,
        authMethod: updatedAuthMethod as 'wallet' | 'email' | 'social',
        lastWalletSignIn: new Date(),
      } as any,
    });

    console.log(`✅ [SessionManager] Session created: ${session.sessionId.substring(0, 8)}...`);

    return {
      userId: session.userId,
      walletAddress: session.walletAddress,
      sessionId: session.sessionId,
      nonce: session.nonce,
      message: session.message,
      signature: session.signature,
      chainId: session.chainId || chainId,
      networkName: session.networkName || networkName,
      expiresAt: session.expiresAt,
      userAgent: session.userAgent || undefined,
      ipAddress: session.ipAddress || undefined,
    };
  }

  /**
   * Get active session for a wallet address
   */
  async getActiveSession(walletAddress: string): Promise<ActiveSession | null> {
    const db = createClient(this.systemUser);
    const checksummedAddress = toChecksumAddress(walletAddress);

    const session = await db.walletSession.findFirst({
      where: {
        walletAddress: checksummedAddress,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      } as any,
      orderBy: {
        lastUsedAt: 'desc',
      } as any,
    }) as any;

    if (!session) {
      return null;
    }

    return {
      id: session.id,
      sessionId: session.sessionId,
      userId: session.userId,
      walletAddress: session.walletAddress,
      chainId: session.chainId || 11155111,
      networkName: session.networkName || 'sepolia',
      expiresAt: session.expiresAt,
      lastUsedAt: session.lastUsedAt || session.createdAt,
      isActive: session.isActive,
      status: session.isActive ? 'ACTIVE' : 'INACTIVE',
    };
  }

  /**
   * Get active session by user ID
   */
  async getActiveSessionByUserId(userId: string): Promise<ActiveSession | null> {
    const db = createClient(this.systemUser);

    const session = await db.walletSession.findFirst({
      where: {
        userId,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      } as any,
      orderBy: {
        lastUsedAt: 'desc',
      } as any,
    }) as any;

    if (!session) {
      return null;
    }

    return {
      id: session.id,
      sessionId: session.sessionId,
      userId: session.userId,
      walletAddress: session.walletAddress,
      chainId: session.chainId || 11155111,
      networkName: session.networkName || 'sepolia',
      expiresAt: session.expiresAt,
      lastUsedAt: session.lastUsedAt || session.createdAt,
      isActive: session.isActive,
      status: session.isActive ? 'ACTIVE' : 'INACTIVE',
    };
  }

  /**
   * Refresh a session (extend expiration)
   */
  async refreshSession(
    sessionId: string,
    extendBy: number = 24 * 60 * 60 * 1000 // Default: 24 hours
  ): Promise<ActiveSession> {
    const db = createClient(this.systemUser);

    const session = await db.walletSession.findFirst({
      where: {
        sessionId,
        isActive: true,
      } as any,
    }) as any;

    if (!session) {
      throw new Error('Session not found or inactive');
    }

    const newExpiresAt = new Date(Date.now() + extendBy);

    const updatedSession = await db.walletSession.update({
      where: { id: session.id } as any,
      data: {
        expiresAt: newExpiresAt,
        lastUsedAt: new Date(),
      } as any,
    }) as any;

    console.log(`🔄 [SessionManager] Session refreshed: ${sessionId.substring(0, 8)}... (new expiry: ${newExpiresAt.toISOString()})`);

    return {
      id: updatedSession.id,
      sessionId: updatedSession.sessionId,
      userId: updatedSession.userId,
      walletAddress: updatedSession.walletAddress,
      chainId: updatedSession.chainId || 11155111,
      networkName: updatedSession.networkName || 'sepolia',
      expiresAt: updatedSession.expiresAt,
      lastUsedAt: updatedSession.lastUsedAt || updatedSession.createdAt,
      isActive: updatedSession.isActive,
      status: updatedSession.isActive ? 'ACTIVE' : 'INACTIVE',
    };
  }

  /**
   * Invalidate a session (mark as inactive)
   */
  async invalidateSession(sessionId: string): Promise<void> {
    const db = createClient(this.systemUser);

    await db.walletSession.updateMany({
      where: { sessionId } as any,
      data: {
        isActive: false,
        expiresAt: new Date(),
        lastUsedAt: new Date(),
      } as any,
    });

    console.log(`🔌 [SessionManager] Session invalidated: ${sessionId.substring(0, 8)}...`);
  }

  /**
   * Invalidate all sessions for a user
   */
  async invalidateUserSessions(userId: string): Promise<number> {
    const db = createClient(this.systemUser);

    const result = await db.walletSession.updateMany({
      where: {
        userId,
        isActive: true,
      } as any,
      data: {
        isActive: false,
        expiresAt: new Date(),
        lastUsedAt: new Date(),
      } as any,
    });

    console.log(`🔌 [SessionManager] Invalidated ${result.count} sessions for user: ${userId}`);

    return result.count;
  }

  /**
   * Invalidate all sessions for a wallet address
   */
  async invalidateWalletSessions(walletAddress: string): Promise<number> {
    const db = createClient(this.systemUser);
    const checksummedAddress = toChecksumAddress(walletAddress);

    const result = await db.walletSession.updateMany({
      where: {
        walletAddress: checksummedAddress,
        isActive: true,
      } as any,
      data: {
        isActive: false,
        expiresAt: new Date(),
        lastUsedAt: new Date(),
      } as any,
    });

    console.log(`🔌 [SessionManager] Invalidated ${result.count} sessions for wallet: ${checksummedAddress}`);

    return result.count;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const db = createClient(this.systemUser);

    const result = await db.walletSession.updateMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
        isActive: true,
      } as any,
      data: {
        isActive: false,
        expiresAt: new Date(),
        lastUsedAt: new Date(),
      } as any,
    });

    if (result.count > 0) {
      console.log(`🧹 [SessionManager] Cleaned up ${result.count} expired sessions`);
    }

    return result.count;
  }

  /**
   * Get session statistics
   */
  async getSessionStats(userId?: string): Promise<{
    total: number;
    active: number;
    expired: number;
    invalidated: number;
  }> {
    const db = createClient(this.systemUser);

    const where: any = userId ? { userId } : {};

    const [total, active, expired, invalidated] = await Promise.all([
      db.walletSession.count({ where }),
      db.walletSession.count({
        where: {
          ...where,
          isActive: true,
          expiresAt: { gt: new Date() },
        },
      }),
      db.walletSession.count({
        where: {
          ...where,
          expiresAt: { lt: new Date() },
        },
      }),
      db.walletSession.count({
        where: {
          ...where,
          isActive: false,
          expiresAt: { gt: new Date() },
        } as any,
      }),
    ]);

    return { total, active, expired, invalidated };
  }

  /**
   * Helper: Get network name from chain ID
   */
  private getNetworkName(chainId: number): string {
    const networkMap: Record<number, string> = {
      1: 'mainnet',
      11155111: 'sepolia',
      137: 'polygon',
      80001: 'mumbai',
      42161: 'arbitrum',
      10: 'optimism',
      8453: 'base',
    };
    return networkMap[chainId] || `chain-${chainId}`;
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();
