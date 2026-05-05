/**
 * Admin Statistics Helper Functions
 * 
 * Provides data fetching and statistics calculation for admin dashboard pages.
 * Uses ZenStack v3 ORM for all database operations.
 */

import { createClient } from '@/lib/db';
import { User } from '../../../zenstack/models';
import { AuthUser } from '../auth';

/**
 * Get comprehensive platform statistics for the dashboard
 */
export async function getPlatformStats(currentUser: AuthUser | null) {
  const db = await createClient(currentUser as AuthUser);

  try {
    const [
      totalUsers,
      totalAssets,
      totalInvestments,
      totalDeposits,
      activeUsers,
      publishedAssets,
      activeInvestments,
      completedDeposits,
    ] = await Promise.all([
      db.user.count(),
      db.realEstateAsset.count(),
      db.investment.count(),
      db.deposit.count(),
      db.user.count({ where: { status: 'ACTIVE' } }),
      db.realEstateAsset.count({ where: { status: 'ACTIVE' } }),
      db.investment.count({ where: { status: 'ACTIVE' } }),
      db.deposit.count({ where: { status: 'COMPLETED' } }),
    ]);

    return {
      users: { total: totalUsers, active: activeUsers },
      assets: { total: totalAssets, published: publishedAssets },
      investments: { total: totalInvestments, active: activeInvestments },
      deposits: { total: totalDeposits, completed: completedDeposits },
    };
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    return {
      users: { total: 0, active: 0 },
      assets: { total: 0, published: 0 },
      investments: { total: 0, active: 0 },
      deposits: { total: 0, completed: 0 },
    };
  }
}

/**
 * Get user management statistics
 */
export async function getUserStats(currentUser: AuthUser | null) {
  const db = await createClient(currentUser as AuthUser);

  try {
    const [total, active, inactive, suspended, pending] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { status: 'ACTIVE' } }),
      db.user.count({ where: { status: 'INACTIVE' } }),
      db.user.count({ where: { status: 'SUSPENDED' } }),
      db.user.count({ where: { status: 'PENDING_VERIFICATION' } }),
    ]);

    const byRole = await db.user.groupBy({
      by: ['role'],
      _count: true,
    });

    const byAuthMethod = await db.user.groupBy({
      by: ['authMethod'],
      _count: true,
    });

    return {
      total,
      active,
      inactive,
      suspended,
      pending,
      byRole: Object.fromEntries(byRole.map(r => [r.role, r._count])),
      byAuthMethod: Object.fromEntries(byAuthMethod.map(a => [a.authMethod, a._count])),
    };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return {
      total: 0,
      active: 0,
      inactive: 0,
      suspended: 0,
      pending: 0,
      byRole: {},
      byAuthMethod: {},
    };
  }
}

/**
 * Get property/asset statistics
 */
export async function getPropertyStats(currentUser: AuthUser | null) {
  const db = await createClient(currentUser as AuthUser);

  try {
    const [total, active, draft, sold] = await Promise.all([
      db.realEstateAsset.count(),
      db.realEstateAsset.count({ where: { status: 'ACTIVE' } }),
      db.realEstateAsset.count({ where: { status: 'DRAFT' } }),
      db.realEstateAsset.count({ where: { status: 'SOLD_OUT' } }),
    ]);

    const byType = await db.realEstateAsset.groupBy({
      by: ['assetType'],
      _count: true,
    });

    const totalDocuments = await db.document.count();
    const totalImages = await db.image.count();

    return {
      total,
      active,
      draft,
      sold,
      byType: Object.fromEntries(byType.map(t => [t.assetType, t._count])),
      documents: totalDocuments,
      images: totalImages,
    };
  } catch (error) {
    console.error('Error fetching property stats:', error);
    return {
      total: 0,
      active: 0,
      draft: 0,
      sold: 0,
      byType: {},
      documents: 0,
      images: 0,
    };
  }
}

/**
 * Get investment statistics
 */
export async function getInvestmentStats(currentUser: AuthUser | null) {
  const db = await createClient(currentUser as AuthUser);

  try {
    const [total, active, completed, pending] = await Promise.all([
      db.investment.count(),
      db.investment.count({ where: { status: 'ACTIVE' } }),
      db.investment.count({ where: { status: 'COMPLETED' } }),
      db.investment.count({ where: { status: 'PENDING' } }),
    ]);

    const totalPerformanceRecords = await db.investmentPerformance.count();
    const totalReturns = await db.monthlyReturn.count();
    const totalPortfolios = await db.portfolio.count();
    const totalTokenHolders = await db.tokenHolder.count();

    return {
      total,
      active,
      completed,
      pending,
      performanceRecords: totalPerformanceRecords,
      returns: totalReturns,
      portfolios: totalPortfolios,
      tokenHolders: totalTokenHolders,
    };
  } catch (error) {
    console.error('Error fetching investment stats:', error);
    return {
      total: 0,
      active: 0,
      completed: 0,
      pending: 0,
      performanceRecords: 0,
      returns: 0,
      portfolios: 0,
      tokenHolders: 0,
    };
  }
}

/**
 * Get deposit and payment statistics
 */
export async function getDepositStats(currentUser: AuthUser | null) {
  const db = await createClient(currentUser as AuthUser);

  try {
    const [total, pending, completed, failed] = await Promise.all([
      db.deposit.count(),
      db.deposit.count({ where: { status: 'PENDING' } }),
      db.deposit.count({ where: { status: 'COMPLETED' } }),
      db.deposit.count({ where: { status: 'FAILED' } }),
    ]);

    const totalPayments = await db.payment.count();
    const totalStripePayments = await db.stripePayment.count();
    const totalOrders = await db.order.count();

    return {
      total,
      pending,
      completed,
      failed,
      payments: totalPayments,
      stripePayments: totalStripePayments,
      orders: totalOrders,
    };
  } catch (error) {
    console.error('Error fetching deposit stats:', error);
    return {
      total: 0,
      pending: 0,
      completed: 0,
      failed: 0,
      payments: 0,
      stripePayments: 0,
      orders: 0,
    };
  }
}

/**
 * Get tokenomics statistics
 */
export async function getTokenomicsStats(currentUser: AuthUser | null) {
  const db = await createClient(currentUser as AuthUser);

  try {
    const assets = await db.realEstateAsset.findMany({
      select: {
        totalTokens: true,
        soldTokens: true,
      },
    });

    const totalSupply = assets.reduce((sum, asset) => sum + (asset.totalTokens || 0), 0);
    const soldTokens = assets.reduce((sum, asset) => sum + (asset.soldTokens || 0), 0);
    const availableTokens = totalSupply - soldTokens;

    const totalHolders = await db.tokenHolder.count();
    const totalReturns = await db.monthlyReturn.count();

    return {
      totalSupply,
      soldTokens,
      availableTokens,
      holders: totalHolders,
      returns: totalReturns,
      assetCount: assets.length,
    };
  } catch (error) {
    console.error('Error fetching tokenomics stats:', error);
    return {
      totalSupply: 0,
      soldTokens: 0,
      availableTokens: 0,
      holders: 0,
      returns: 0,
      assetCount: 0,
    };
  }
}

/**
 * Get QTech gaming statistics
 */
export async function getQTechStats(currentUser: AuthUser | null) {
  const db = await createClient(currentUser as AuthUser);

  try {
    const [
      totalProviders,
      totalGames,
      totalAccounts,
      totalTransactions,
      totalGameRounds,
      totalErrors,
    ] = await Promise.all([
      db.qtechProvider.count(),
      db.qtechGame.count(),
      db.userQtechAccount.count(),
      db.qtechTransaction.count(),
      db.qtechGameRound.count(),
      db.qtechErrorLog.count(),
    ]);

    const activeGames = await db.qtechGame.count({ where: { status: 'ACTIVE' } });
    const activeAccounts = await db.userQtechAccount.count({ where: { status: 'ACTIVE' } });

    return {
      providers: totalProviders,
      games: { total: totalGames, active: activeGames },
      accounts: { total: totalAccounts, active: activeAccounts },
      transactions: totalTransactions,
      gameRounds: totalGameRounds,
      errors: totalErrors,
    };
  } catch (error) {
    console.error('Error fetching QTech stats:', error);
    return {
      providers: 0,
      games: { total: 0, active: 0 },
      accounts: { total: 0, active: 0 },
      transactions: 0,
      gameRounds: 0,
      errors: 0,
    };
  }
}

/**
 * Get PAM integration statistics
 */
export async function getPAMStats(currentUser: AuthUser | null) {
  const db = await createClient(currentUser as AuthUser);

  try {
    const [
      totalMappings,
      totalTransactions,
      totalErrors,
      totalGames,
      totalOperators,
    ] = await Promise.all([
      db.userPamMapping.count(),
      db.pamTransaction.count(),
      db.pamErrorLog.count(),
      db.game.count(),
      db.gameOperator.count(),
    ]);

    const activeMappings = await db.userPamMapping.count({ where: { isActive: true } });
    const activeOperators = await db.gameOperator.count({ where: { isActive: true } });

    return {
      mappings: { total: totalMappings, active: activeMappings },
      transactions: totalTransactions,
      errors: totalErrors,
      games: totalGames,
      operators: { total: totalOperators, active: activeOperators },
    };
  } catch (error) {
    console.error('Error fetching PAM stats:', error);
    return {
      mappings: { total: 0, active: 0 },
      transactions: 0,
      errors: 0,
      games: 0,
      operators: { total: 0, active: 0 },
    };
  }
}
