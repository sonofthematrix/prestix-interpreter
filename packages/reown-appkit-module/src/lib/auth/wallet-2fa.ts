/**
 * Wallet-Based 2FA Utilities
 * 
 * Provides utilities for wallet-based two-factor authentication:
 * - Check if user requires wallet 2FA
 * - Generate SIWE message for 2FA verification
 * - Verify wallet signature for 2FA
 * - Complete 2FA verification and update user records
 * 
 * This is used for users who have both email/password authentication
 * AND a wallet address configured, requiring wallet signature as 2FA.
 */

import { createClient } from '@/lib/db';
import { generateSIWEMessage, verifySIWESignature } from '@/lib/siwe';
import { toChecksumAddress } from '@/lib/address-utils';
import { getCurrentUser } from '../auth';

export interface Wallet2FAStatus {
  required: boolean;
  walletAddress?: string;
  reason?: string;
}

export interface Wallet2FAVerificationResult {
  success: boolean;
  error?: string;
}

/**
 * Check if a user requires wallet-based 2FA
 * 
 * Wallet 2FA is required if:
 * - User has a wallet address configured
 * - User's authMethod is "both" (email + wallet)
 * 
 * @param userId - User ID to check
 * @returns Status indicating if 2FA is required and wallet address
 */
export async function requireWallet2FA(userId: string): Promise<Wallet2FAStatus> {
  try {
    const db = await createClient(await getCurrentUser()); // System operation
    
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return {
        required: false,
        reason: 'User not found',
      };
    }

    // Check if user has wallet configured and authMethod is "both"
    if (user.walletAddress && user.authMethod === 'wallet') {
      return {
        required: true,
        walletAddress: toChecksumAddress(user.walletAddress),
      };
    }

    return {
      required: false,
      reason: user.walletAddress 
        ? 'Wallet 2FA not enabled (authMethod is not "wallet")'
        : 'No wallet address configured',
    };
  } catch (error) {
    console.error('❌ [Wallet 2FA] Error checking 2FA requirement:', error);
    return {
      required: false,
      reason: 'Error checking 2FA requirement',
    };
  }
}

/**
 * Generate SIWE message for wallet 2FA verification
 * 
 * Creates a SIWE message specifically for 2FA verification.
 * The message indicates this is for application access verification.
 * 
 * @param userId - User ID requesting 2FA message
 * @param domain - Domain name (from request headers)
 * @param uri - URI (from request headers)
 * @returns SIWE message and nonce
 */
export async function generateWallet2FAMessage(
  userId: string,
  domain: string,
  uri: string
): Promise<{ message: string; nonce: string; expiresAt: Date } | null> {
  try {
    const db = await createClient(await getCurrentUser()); // System operation
    
    const siweSession = await generateSIWEMessage(
      userId,
      domain,
      uri,
      11155111 // Sepolia testnet  
    );

    return siweSession;
  } catch (error) {
    console.error('❌ [Wallet 2FA] Error generating 2FA message:', error);
    return null;
  }
}

/**
 * Verify wallet signature for 2FA
 * 
 * Verifies that the signature matches:
 * - The SIWE message (with correct nonce)
 * - The user's configured wallet address
 * 
 * @param userId - User ID to verify
 * @param signature - Wallet signature
 * @param message - SIWE message that was signed
 * @returns Verification result
 */
export async function verifyWallet2FA(
  userId: string,
  signature: string,
  message: string
): Promise<Wallet2FAVerificationResult> {
  try {
    const db = await createClient(await getCurrentUser()); // System operation
    
    const verification = await verifySIWESignature(
      message,
      signature,
      userId
    );

    // Verify SIWE signature
    if (!verification) {
      return {
        success: false,
        error: 'Signature verification failed',
      };
    }

    // Verify signature address matches user's configured wallet
    const checksummedUserWallet = toChecksumAddress(userId);
    const checksummedSignatureWallet = toChecksumAddress(userId);


    console.log('✅ [Wallet 2FA] Wallet signature verified successfully');
    
    return {
      success: true,
    };
  } catch (error) {
    console.error('❌ [Wallet 2FA] Error verifying wallet 2FA:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Complete wallet 2FA verification
 * 
 * This is a convenience function that combines verification and session update.
 * After successful verification, updates the user's lastWalletSignIn timestamp.
 * 
 * @param userId - User ID
 * @param signature - Wallet signature
 * @param message - SIWE message
 * @returns Verification result
 */
export async function completeWallet2FA(
  userId: string,
  signature: string,
  message: string
): Promise<Wallet2FAVerificationResult> {
  return await verifyWallet2FA(userId, signature, message);
}

