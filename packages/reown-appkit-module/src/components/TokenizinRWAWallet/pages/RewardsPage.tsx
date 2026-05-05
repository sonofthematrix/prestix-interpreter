'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Gift, Coins, Calendar, TrendingUp, Clock } from 'lucide-react';
import { TigerSpinner } from '../../common/TigerSpinner';

interface RewardData {
  totalRewards: number;
  monthlyRewards: number;
  cashbackRate: number;
  totalCashback: number;
  upcomingRewards: Array<{
    type: string;
    amount: number;
    date: string;
    status: 'pending' | 'available';
  }>;
  rewardHistory: Array<{
    type: string;
    amount: number;
    date: string;
    status: 'completed';
  }>;
}

export function RewardsPage() {
  const [rewardData, setRewardData] = useState<RewardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRewardsData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/rewards');
        if (!response.ok) {
          throw new Error('Failed to fetch rewards data');
        }
        const data = await response.json();
        setRewardData(data);
      } catch (error) {
        console.error('Error fetching rewards data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load rewards data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRewardsData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <TigerSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!rewardData) return null;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-[rgba(28,58,54,0.9)] to-[rgba(15,42,38,0.9)] border-2 border-orange-600/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="h-4 w-4 text-orange-400" />
              <span className="text-xs text-[#B8A898]">Total Rewards</span>
            </div>
            <div className="text-2xl font-bold text-[#F8F5F0]">
              ${rewardData.totalRewards.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[rgba(28,58,54,0.9)] to-[rgba(15,42,38,0.9)] border-2 border-orange-600/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="h-4 w-4 text-orange-400" />
              <span className="text-xs text-[#B8A898]">Cashback Rate</span>
            </div>
            <div className="text-2xl font-bold text-[#F8F5F0]">
              {rewardData.cashbackRate}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Rewards */}
      <Card className="bg-gradient-to-br from-[rgba(28,58,54,0.9)] to-[rgba(15,42,38,0.9)] border-2 border-orange-600/30">
        <CardHeader>
          <CardTitle className="text-[#F8F5F0] flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-400" />
            Monthly Rewards
          </CardTitle>
          <CardDescription className="text-[#B8A898]">
            Your recurring monthly benefits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-[rgba(10,58,42,0.6)] border border-orange-600/20">
            <div>
              <div className="text-sm font-medium text-[#F8F5F0]">Monthly Gaming Bonus</div>
              <div className="text-xs text-[#B8A898]">Paid on the 15th of each month</div>
            </div>
            <div className="text-lg font-bold text-orange-400">
              ${rewardData.monthlyRewards}
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-[rgba(10,58,42,0.6)] border border-orange-600/20">
            <div>
              <div className="text-sm font-medium text-[#F8F5F0]">Total Cashback Earned</div>
              <div className="text-xs text-[#B8A898]">From gaming activities</div>
            </div>
            <div className="text-lg font-bold text-orange-400">
              ${rewardData.totalCashback.toFixed(2)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Rewards */}
      <Card className="bg-gradient-to-br from-[rgba(28,58,54,0.9)] to-[rgba(15,42,38,0.9)] border-2 border-orange-600/30">
        <CardHeader>
          <CardTitle className="text-[#F8F5F0] flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-400" />
            Upcoming Rewards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {rewardData.upcomingRewards.map((reward, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-[rgba(10,58,42,0.6)] border border-orange-600/20"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium text-[#F8F5F0]">{reward.type}</div>
                  <div className="text-xs text-[#B8A898]">{new Date(reward.date).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-orange-400">${reward.amount.toFixed(2)}</span>
                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                    {reward.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reward History */}
      <Card className="bg-gradient-to-br from-[rgba(28,58,54,0.9)] to-[rgba(15,42,38,0.9)] border-2 border-orange-600/30">
        <CardHeader>
          <CardTitle className="text-[#F8F5F0] flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-400" />
            Recent Rewards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {rewardData.rewardHistory.map((reward, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-[rgba(10,58,42,0.6)] border border-orange-600/20"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium text-[#F8F5F0]">{reward.type}</div>
                  <div className="text-xs text-[#B8A898]">{new Date(reward.date).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-green-400">+${reward.amount.toFixed(2)}</span>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                    {reward.status}
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

