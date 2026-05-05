/**
 * Analytics Page Component
 *
 * Comprehensive wallet analytics dashboard with:
 * - Portfolio value chart
 * - Transaction statistics
 * - Token distribution pie chart
 * - Trading performance metrics
 * - Gas usage analysis
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { TigerSpinner } from '../../common/TigerSpinner';
// Note: This hook should be implemented locally or removed if not needed
// import { useWalletAnalytics } from '../../hooks/wallet/useWalletAnalytics';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  PieChart,
  BarChart3,
  RefreshCw,
  Flame,
  Target,
  Award,
} from 'lucide-react';
import { Button } from '../../ui/button';

export function AnalyticsPage() {
  // Placeholder implementation - useWalletAnalytics should be implemented locally
  const analytics = null;
  const isLoading = false;
  const error = null;
  const refresh = () => {};

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <TigerSpinner size="lg" />
        <p className="text-sm text-[#B8A898] ml-3">Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-400">
        <p className="mb-2">Failed to load analytics</p>
        <p className="text-xs text-[#B8A898] mb-4">{error}</p>
        <Button onClick={refresh} size="sm" variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8 text-[#B8A898]">
        <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No analytics data available</p>
      </div>
    );
  }

  const isPositive24h = analytics.portfolioChange24h >= 0;
  const isPositive7d = analytics.portfolioChange7d >= 0;

  return (
    <div className="space-y-4 pb-4">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#F8F5F0]">Portfolio Analytics</h2>
        <Button
          onClick={refresh}
          size="sm"
          variant="ghost"
          className="text-xs"
          disabled={isLoading}
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Portfolio Value Summary */}
      <Card className="bg-gradient-to-r from-[rgba(28,58,54,0.9)] to-[rgba(15,42,38,0.9)] border-2 border-blue-600/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-[#B8A898] flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Total Portfolio Value
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="text-3xl font-bold text-[#F8F5F0]">
              ${analytics.currentPortfolioValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                {isPositive24h ? (
                  <TrendingUp className="h-4 w-4 text-green-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-400" />
                )}
                <span
                  className={`text-sm font-medium ${
                    isPositive24h ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {isPositive24h ? '+' : ''}
                  {analytics.portfolioChange24h.toFixed(2)}%
                </span>
                <span className="text-xs text-[#B8A898]">24h</span>
              </div>
              <div className="flex items-center gap-1">
                {isPositive7d ? (
                  <TrendingUp className="h-4 w-4 text-green-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-400" />
                )}
                <span
                  className={`text-sm font-medium ${
                    isPositive7d ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {isPositive7d ? '+' : ''}
                  {analytics.portfolioChange7d.toFixed(2)}%
                </span>
                <span className="text-xs text-[#B8A898]">7d</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Statistics */}
      <Card className="bg-gradient-to-r from-[rgba(28,58,54,0.9)] to-[rgba(15,42,38,0.9)] border-2 border-purple-600/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-[#B8A898] flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Transaction Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-bold text-[#F8F5F0]">
                {analytics.transactionStats.totalTransactions}
              </div>
              <div className="text-xs text-[#B8A898]">Total Transactions</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">
                {analytics.transactionStats.successfulTransactions}
              </div>
              <div className="text-xs text-[#B8A898]">Successful</div>
            </div>
            <div>
              <div className="text-xl font-bold text-[#F8F5F0] flex items-center gap-1">
                <Flame className="h-4 w-4 text-orange-400" />
                {analytics.transactionStats.totalGasSpent}
              </div>
              <div className="text-xs text-[#B8A898]">Total Gas (ETH)</div>
            </div>
            <div>
              <div className="text-xl font-bold text-[#F8F5F0]">
                ${analytics.transactionStats.totalGasSpentUSD.toFixed(2)}
              </div>
              <div className="text-xs text-[#B8A898]">Gas Cost (USD)</div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-blue-600/20">
            <div className="text-xs text-[#B8A898] mb-2">Transaction Breakdown</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#B8A898]">Transfers:</span>
                <span className="text-[#F8F5F0] font-medium">
                  {analytics.transactionStats.transactionsByType.transfers}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#B8A898]">Swaps:</span>
                <span className="text-[#F8F5F0] font-medium">
                  {analytics.transactionStats.transactionsByType.swaps}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#B8A898]">Approvals:</span>
                <span className="text-[#F8F5F0] font-medium">
                  {analytics.transactionStats.transactionsByType.approvals}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#B8A898]">Contracts:</span>
                <span className="text-[#F8F5F0] font-medium">
                  {analytics.transactionStats.transactionsByType.contractInteractions}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Token Distribution */}
      <Card className="bg-gradient-to-r from-[rgba(28,58,54,0.9)] to-[rgba(15,42,38,0.9)] border-2 border-green-600/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-[#B8A898] flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Token Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.tokenDistribution.map((token, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-[#F8F5F0]">
                    {token.symbol}
                  </span>
                  <span className="text-sm font-bold text-green-400">
                    {token.percentage}%
                  </span>
                </div>
                <div className="w-full h-2 bg-[#0F2A26] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all"
                    style={{ width: `${token.percentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-[#B8A898]">
                    Balance: {token.balance}
                  </span>
                  <span className="text-xs text-[#B8A898]">
                    ${token.value.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trading Performance */}
      <Card className="bg-gradient-to-r from-[rgba(28,58,54,0.9)] to-[rgba(15,42,38,0.9)] border-2 border-orange-600/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-[#B8A898] flex items-center gap-2">
            <Target className="h-4 w-4" />
            Trading Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-bold text-[#F8F5F0]">
                {analytics.tradingPerformance.totalTrades}
              </div>
              <div className="text-xs text-[#B8A898]">Total Trades</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">
                {analytics.tradingPerformance.winRate.toFixed(1)}%
              </div>
              <div className="text-xs text-[#B8A898]">Win Rate</div>
            </div>
            <div>
              <div
                className={`text-xl font-bold ${
                  analytics.tradingPerformance.totalProfitLoss >= 0
                    ? 'text-green-400'
                    : 'text-red-400'
                }`}
              >
                {analytics.tradingPerformance.totalProfitLoss >= 0 ? '+' : ''}$
                {analytics.tradingPerformance.totalProfitLoss.toFixed(2)}
              </div>
              <div className="text-xs text-[#B8A898]">Total P/L</div>
            </div>
            <div>
              <div className="text-xl font-bold text-blue-400">
                ${analytics.tradingPerformance.averageProfit.toFixed(2)}
              </div>
              <div className="text-xs text-[#B8A898]">Avg Profit</div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-orange-600/20 grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Award className="h-3 w-3 text-green-400" />
                <span className="text-xs text-[#B8A898]">Best Trade</span>
              </div>
              <div className="text-lg font-bold text-green-400">
                +${analytics.tradingPerformance.bestTrade.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <TrendingDown className="h-3 w-3 text-red-400" />
                <span className="text-xs text-[#B8A898]">Worst Trade</span>
              </div>
              <div className="text-lg font-bold text-red-400">
                ${analytics.tradingPerformance.worstTrade.toFixed(2)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Last Updated */}
      <div className="text-center text-xs text-[#B8A898]">
        Last updated: {analytics.lastUpdated.toLocaleString()}
      </div>
    </div>
  );
}
