'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Gamepad2, TrendingUp, DollarSign, Activity, BarChart3 } from 'lucide-react';
import { TigerSpinner } from '../../common/TigerSpinner';

interface GameFinancialData {
  totalWagered: number;
  totalWon: number;
  totalLost: number;
  netResult: number;
  cashbackEarned: number;
  sessionsThisMonth: number;
  averageSessionValue: number;
  winRate: number;
  recentActivity: Array<{
    game: string;
    amount: number;
    result: 'win' | 'loss';
    date: string;
  }>;
}

export function GameFinancialPage() {
  const [gameData, setGameData] = useState<GameFinancialData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGameData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/gaming/financial');
        if (!response.ok) {
          throw new Error('Failed to fetch game financial data');
        }
        const data = await response.json();
        setGameData(data);
      } catch (error) {
        console.error('Error fetching game financial data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load game financial data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGameData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <TigerSpinner size="lg" />
      </div>
    );
  }

  if (!gameData) return null;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-[rgba(28,58,54,0.9)] to-[rgba(15,42,38,0.9)] border-2 border-orange-600/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-orange-400" />
              <span className="text-xs text-[#B8A898]">Total Wagered</span>
            </div>
            <div className="text-xl font-bold text-[#F8F5F0]">
              ${gameData.totalWagered.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[rgba(28,58,54,0.9)] to-[rgba(15,42,38,0.9)] border-2 border-orange-600/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <span className="text-xs text-[#B8A898]">Net Result</span>
            </div>
            <div className={`text-xl font-bold ${gameData.netResult >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${gameData.netResult >= 0 ? '+' : ''}{gameData.netResult.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card className="bg-gradient-to-br from-[rgba(28,58,54,0.9)] to-[rgba(15,42,38,0.9)] border-2 border-orange-600/30">
        <CardHeader>
          <CardTitle className="text-[#F8F5F0] flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-orange-400" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-[rgba(10,58,42,0.6)] border border-orange-600/20">
              <div className="text-xs text-[#B8A898] mb-1">Win Rate</div>
              <div className="text-xl font-bold text-green-400">{gameData.winRate}%</div>
            </div>
            <div className="p-3 rounded-lg bg-[rgba(10,58,42,0.6)] border border-orange-600/20">
              <div className="text-xs text-[#B8A898] mb-1">Sessions (Month)</div>
              <div className="text-xl font-bold text-[#F8F5F0]">{gameData.sessionsThisMonth}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-[rgba(10,58,42,0.6)] border border-orange-600/20">
              <div className="text-xs text-[#B8A898] mb-1">Avg Session</div>
              <div className="text-xl font-bold text-[#F8F5F0]">${gameData.averageSessionValue.toFixed(2)}</div>
            </div>
            <div className="p-3 rounded-lg bg-[rgba(10,58,42,0.6)] border border-orange-600/20">
              <div className="text-xs text-[#B8A898] mb-1">Cashback Earned</div>
              <div className="text-xl font-bold text-orange-400">${gameData.cashbackEarned.toFixed(2)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Breakdown */}
      <Card className="bg-gradient-to-br from-[rgba(28,58,54,0.9)] to-[rgba(15,42,38,0.9)] border-2 border-orange-600/30">
        <CardHeader>
          <CardTitle className="text-[#F8F5F0] flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-400" />
            Financial Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-[rgba(10,58,42,0.6)] border border-green-500/20">
            <span className="text-sm text-[#B8A898]">Total Won</span>
            <span className="text-sm font-bold text-green-400">
              +${gameData.totalWon.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-[rgba(10,58,42,0.6)] border border-red-500/20">
            <span className="text-sm text-[#B8A898]">Total Lost</span>
            <span className="text-sm font-bold text-red-400">
              -${gameData.totalLost.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-[rgba(10,58,42,0.6)] border border-orange-600/20">
            <span className="text-sm text-[#B8A898]">Cashback Earned</span>
            <span className="text-sm font-bold text-orange-400">
              +${gameData.cashbackEarned.toFixed(2)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="bg-gradient-to-br from-[rgba(28,58,54,0.9)] to-[rgba(15,42,38,0.9)] border-2 border-orange-600/30">
        <CardHeader>
          <CardTitle className="text-[#F8F5F0] flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-orange-400" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {gameData.recentActivity.map((activity, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-[rgba(10,58,42,0.6)] border border-orange-600/20"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium text-[#F8F5F0]">{activity.game}</div>
                  <div className="text-xs text-[#B8A898]">{new Date(activity.date).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-bold ${
                      activity.result === 'win' ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {activity.result === 'win' ? '+' : '-'}${activity.amount}
                  </span>
                  <Badge
                    className={
                      activity.result === 'win'
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : 'bg-red-500/20 text-red-400 border-red-500/30'
                    }
                  >
                    {activity.result}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

