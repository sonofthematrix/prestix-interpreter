/**
 * NextAuth Adapter for ZenStack ORM
 * 
 * This adapter allows NextAuth to work with ZenStack's database client
 * instead of Prisma directly. It implements the NextAuth adapter interface
 * to handle Account and Session CRUD operations.
 * 
 * Reference: https://next-auth.js.org/v4/adapters/overview
 */

import type { Adapter, AdapterUser, AdapterSession, AdapterAccount } from "next-auth/adapters";
import type { ZenStackClient } from "@zenstackhq/orm";
import { createClient } from "@/lib/db";
import { AuthUser } from "@/lib/auth";


const systemUser: AuthUser = {
  id: 'system',
  email: 'system@TKNZN.pro',
  name: 'System Admin',
  role: 'ADMIN' as const,
};

/**
 * ZenStack Adapter for NextAuth
 * 
 * This adapter works with ZenStack's database client to manage
 * NextAuth sessions and accounts in the database.
 */
export function ZenStackAdapter(): Adapter {
  return {
    /**
     * Create a new user
     */
    async createUser(user: Omit<AdapterUser, "id">): Promise<AdapterUser> {
      const db = await createClient(systemUser); // System operation - no user context needed
      
      const createdUser = await (await db).user.create({
        data: {
          email: user.email || undefined,
          name: user.name || undefined,
          emailVerified: user.emailVerified || undefined,
          profileImageUrl: user.image || undefined,
        },
      });

      return {
        id: createdUser.id,
        email: createdUser.email || null,
        emailVerified: createdUser.emailVerified || null,
        name: createdUser.name || null,
        image: createdUser.profileImageUrl || null,
      };
    },

    /**
     * Get user by ID
     */
    async getUser(id: string): Promise<AdapterUser | null> {
      const db = await createClient(systemUser);
      
      const user = await (await db).user.findUnique({
        where: { id },
      });

      if (!user) return null;

      return {
        id: user.id,
        email: user.email || null,
        emailVerified: user.emailVerified || null,
        name: user.name || null,
        image: user.profileImageUrl || null,
      };
    },

    /**
     * Get user by email
     */
    async getUserByEmail(email: string): Promise<AdapterUser | null> {
      const db = await createClient(systemUser);
      
      const user = await (await db).user.findUnique({
        where: { email },
      });

      if (!user) return null;

      return {
        id: user.id,
        email: user.email || null,
        emailVerified: user.emailVerified || null,
        name: user.name || null,
        image: user.profileImageUrl || null,
      };
    },

    /**
     * Get user by account (provider + providerAccountId)
     */
    async getUserByAccount(
      account: Pick<AdapterAccount, "provider" | "providerAccountId">
    ): Promise<AdapterUser | null> {
      const db = await createClient(systemUser);
      
      const accountRecord = await (await db).account.findUnique({
        where: {
          provider_providerAccountId: {
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          },
        },
        include: {
          user: true,
        },
      });

      if (!accountRecord?.user) return null;

      const user = accountRecord.user;
      return {
        id: user.id,
        email: user.email || null,
        emailVerified: user.emailVerified || null,
        name: user.name || null,
        image: user.profileImageUrl || null,
      };
    },

    /**
     * Update user
     */
    async updateUser(user: Partial<AdapterUser> & Pick<AdapterUser, "id">): Promise<AdapterUser> {
      const db = await createClient(systemUser);
      
      const updatedUser = await (await db).user.update({
        where: { id: user.id },
        data: {
          email: user.email || undefined,
          name: user.name || undefined,
          emailVerified: user.emailVerified || undefined,
          profileImageUrl: user.image || undefined,
        },
      });

      return {
        id: updatedUser.id,
        email: updatedUser.email || null,
        emailVerified: updatedUser.emailVerified || null,
        name: updatedUser.name || null,
        image: updatedUser.profileImageUrl || null,
      };
    },

    /**
     * Link account to user
     */
    async linkAccount(account: AdapterAccount): Promise<void> {
      const db = await createClient(systemUser);
      
      await (await db).account.create({
        data: {
          userId: account.userId,
          type: account.type,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          refresh_token: account.refresh_token || undefined,
          access_token: account.access_token || undefined,
          expires_at: account.expires_at || undefined,
          token_type: account.token_type || undefined,
          scope: account.scope || undefined,
          id_token: account.id_token || undefined,
          session_state: account.session_state || undefined,
        },
      });
    },

    /**
     * Unlink account from user
     */
    async unlinkAccount(
      account: Pick<AdapterAccount, "provider" | "providerAccountId">
    ): Promise<void> {
      const db = await createClient(systemUser);
      
      await (await db).account.delete({
        where: {
          provider_providerAccountId: {
            provider: account.provider,
            providerAccountId: account.providerAccountId,
          },
        },
      });
    },

    /**
     * Create session
     */
    async createSession(session: {
      sessionToken: string;
      userId: string;
      expires: Date;
    }): Promise<AdapterSession> {
      const db = await createClient(systemUser);
      
      const createdSession = await (await db).session.create({
        data: {
          sessionToken: session.sessionToken,
          userId: session.userId,
          expires: session.expires,
        },
      });

      return {
        sessionToken: createdSession.sessionToken,
        userId: createdSession.userId,
        expires: createdSession.expires,
      };
    },

    /**
     * Get session and user
     */
    async getSessionAndUser(
      sessionToken: string
    ): Promise<{ session: AdapterSession; user: AdapterUser } | null> {
      const db = await createClient(systemUser);
      
      const session = await (await db).session.findUnique({
        where: { sessionToken },
        include: {
          user: true,
        },
      });

      if (!session || !session.user) return null;

      // Check if session is expired
      if (session.expires < new Date()) {
        // Delete expired session
        await (await db).session.delete({
          where: { sessionToken },
        });
        return null;
      }

      return {
        session: {
          sessionToken: session.sessionToken,
          userId: session.userId,
          expires: session.expires,
        },
        user: {
          id: session.user.id,
          email: session.user.email || null,
          emailVerified: session.user.emailVerified || null,
          name: session.user.name || null,
          image: session.user.profileImageUrl || null,
        },
      };
    },

    /**
     * Update session
     */
    async updateSession(
      session: Partial<AdapterSession> & Pick<AdapterSession, "sessionToken">
    ): Promise<AdapterSession | null> {
      const db = await createClient(systemUser);
      
      try {
        const updatedSession = await (await db).session.update({
          where: { sessionToken: session.sessionToken },
          data: {
            expires: session.expires || undefined,
            userId: session.userId || undefined,
          },
        });

        return {
          sessionToken: updatedSession.sessionToken,
          userId: updatedSession.userId,
          expires: updatedSession.expires,
        };
      } catch (error) {
        // Session might not exist
        return null;
      }
    },

    /**
     * Delete session
     */
    async deleteSession(sessionToken: string): Promise<void> {
      const db = await createClient(systemUser);
      
      try {
        await (await db).session.delete({
          where: { sessionToken },
        });
      } catch (error) {
        // Session might not exist - ignore error
      }
    },
  };
}

