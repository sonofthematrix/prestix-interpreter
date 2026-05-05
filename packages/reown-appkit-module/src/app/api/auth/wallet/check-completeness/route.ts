// User Completeness Check API Endpoint
// Checks if all required user records exist and returns missing records

import { toChecksumAddress } from '@/lib/address-utils';
import { createClient } from '@/lib/db';
import { getSystemUser } from '@/lib/utils/system-user';
import { initializeNewUser } from '@/lib/services/user-initialization';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/wallet/check-completeness - Check user completeness
 * 
 * Verifies that all required user records exist:
 * - User record
 * - Account record
 * - UserPreferences
 * - UserQtechAccount
 * - Portfolio
 * - UserEngagementMetrics
 * - AddressBook entry
 * 
 * Returns missing records and can optionally initialize them.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, initializeMissing = false } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Use system user context for completeness check (no user auth required)
    const systemUser = getSystemUser();
    const db = await createClient(systemUser);

    const checksummedAddress = toChecksumAddress(walletAddress);

    // Find user by wallet address
    const user = await db.user.findUnique({
      where: { walletAddress: checksummedAddress },
      include: {
        accounts: true,
        preferences: true,
        userQtechAccount: true,
        portfolio: true,
        engagementMetrics: true,
        addressBooks: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { 
          error: 'User not found',
          isComplete: false,
          missingRecords: ['user'],
        },
        { status: 404 }
      );
    }

    // Check for missing records
    const missingRecords: string[] = [];

    if (!user.accounts || user.accounts.length === 0) {
      missingRecords.push('account');
    }

    if (!user.preferences) {
      missingRecords.push('preferences');
    }

    if (!user.userQtechAccount || user.userQtechAccount.length === 0) {
      missingRecords.push('userQtechAccount');
    }

    if (!user.portfolio || user.portfolio.length === 0) {
      missingRecords.push('portfolio');
    }

    if (!user.engagementMetrics) {
      missingRecords.push('engagementMetrics');
    }

    if (!user.addressBooks || user.addressBooks.length === 0) {
      missingRecords.push('addressBooks');
    }

    const isComplete = missingRecords.length === 0;

    // If initialization requested and records are missing, initialize them
    if (initializeMissing && !isComplete) {
      console.log(`🔄 [Completeness Check] Initializing missing records for user ${user.id}:`, missingRecords);

      const userAgent = request.headers.get('user-agent') || undefined;
      const ipAddress = request.headers.get('x-forwarded-for') || 
                       request.headers.get('x-real-ip') || 
                       'unknown';

      const initResult = await initializeNewUser({
        userId: user.id,
        email: user.email,
        name: user.name || 'User',
        walletAddress: checksummedAddress,
        authMethod: (user.authMethod || 'wallet') as 'email' | 'wallet' | 'social',
        provider: 'wallet',
        providerAccountId: checksummedAddress,
        ipAddress,
        userAgent,
      });

      if (initResult.success) {
        console.log('✅ [Completeness Check] Missing records initialized successfully');
        
        // Re-check completeness after initialization
        const updatedUser = await db.user.findUnique({
          where: { id: user.id },
          include: {
            accounts: true,
            preferences: true,
            userQtechAccount: true,
            portfolio: true,
            engagementMetrics: true,
            addressBooks: true,
          },
        });

        // Re-check missing records
        const stillMissing: string[] = [];
        if (!updatedUser?.accounts || updatedUser.accounts.length === 0) stillMissing.push('account');
        if (!updatedUser?.preferences) stillMissing.push('preferences');
        if (!updatedUser?.userQtechAccount || updatedUser.userQtechAccount.length === 0) stillMissing.push('userQtechAccount');
        if (!updatedUser?.portfolio || updatedUser.portfolio.length === 0) stillMissing.push('portfolio');
        if (!updatedUser?.engagementMetrics) stillMissing.push('engagementMetrics');
        if (!updatedUser?.addressBooks || updatedUser.addressBooks.length === 0) stillMissing.push('addressBooks');

        return NextResponse.json({
          success: true,
          isComplete: stillMissing.length === 0,
          missingRecords: stillMissing,
          initialized: true,
          user: {
            id: updatedUser?.id,
            email: updatedUser?.email,
            name: updatedUser?.name,
            walletAddress: updatedUser?.walletAddress,
          },
        });
      } else {
        console.warn('⚠️ [Completeness Check] Initialization had errors:', initResult.errors);
        return NextResponse.json({
          success: false,
          isComplete: false,
          missingRecords,
          initialized: false,
          errors: initResult.errors,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            walletAddress: user.walletAddress,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      isComplete,
      missingRecords,
      initialized: false,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        walletAddress: user.walletAddress,
      },
    });

  } catch (error) {
    console.error('❌ [Completeness Check] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check user completeness',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

