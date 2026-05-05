'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Trophy, TrendingUp, Star, Award, ChevronRight, Target } from 'lucide-react';
import { TigerSpinner } from '../../common/TigerSpinner';

interface TierData {
  currentTier: 'BRONZE' | 'SILVER' | 'GOLD';
  engagementScore: number;
  marketplaceScore: number;
  gamingScore: number;
  activityScore: number;
  nextTier?: 'SILVER' | 'GOLD';
  progressToNextTier: number;
  tierMultiplier: number;
  effectiveROI: number;
  benefits: string[];
}

export function TierRankingPage() {
  const [tierData, setTierData] = useState<TierData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch tier data from API
    setTimeout(() => {
      setTierData({
        currentTier: 'SILVER',
        engagementScore: 65,
        marketplaceScore: 70,
        gamingScore: 60,
        activityScore: 55,
        nextTier: 'GOLD',
        progressToNextTier: 65,
        tierMultiplier: 1.2,
        effectiveROI: 14.5,
        benefits: [
          'Enhanced 14% ROI (+2% bonus)',
          '3% gaming cashback',
          '$50 monthly gaming rewards',
          '24-hour early property access',
          'Advanced analytics',
        ],
      });
      setIsLoading(false);
    }, 1000);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <TigerSpinner size="lg" />
      </div>
    );
  }

  if (!tierData) return null;

  const tierColors = {
    BRONZE: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    SILVER: 'bg-gray-400/20 text-gray-300 border-gray-400/30',
    GOLD: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  };

  const nextTierRequirements = {
    SILVER: {
      marketplace: '$10,000+ invested',
      gaming: '$1,000+ wagered',
      activity: '30+ actions/month',
    },
    GOLD: {
      marketplace: '$500,000+ invested',
      gaming: '$25,000+ wagered',
      activity: '200+ actions/month',
    },
  };

  return (
    <div className="space-y-4">
      {/* Current Tier Card */}
      <Card className="bg-gradient-to-br from-[rgba(28,58,54,0.9)] to-[rgba(15,42,38,0.9)] border-2 border-orange-600/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-[#F8F5F0] flex items-center gap-2">
                <Trophy className="h-5 w-5 text-orange-400" />
                Current Tier
              </CardTitle>
              <CardDescription className="text-[#B8A898] mt-1">
                Your membership level and benefits
              </CardDescription>
            </div>
            <Badge className={tierColors[tierData.currentTier]}>
              {tierData.currentTier}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-[rgba(10,58,42,0.6)] border border-orange-600/20">
              <div className="text-xs text-[#B8A898] mb-1">Effective ROI</div>
              <div className="text-xl font-bold text-orange-400">
                {tierData.effectiveROI}%
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[rgba(10,58,42,0.6)] border border-orange-600/20">
              <div className="text-xs text-[#B8A898] mb-1">Tier Multiplier</div>
              <div className="text-xl font-bold text-orange-400">
                {tierData.tierMultiplier}x
              </div>
            </div>
          </div>

          {/* Progress to Next Tier */}
          {tierData.nextTier && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#B8A898]">Progress to {tierData.nextTier}</span>
                <span className="text-[#F8F5F0] font-medium">{tierData.progressToNextTier}%</span>
              </div>
              <div className="h-2 bg-[rgba(10,58,42,0.6)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all"
                  style={{ width: `${tierData.progressToNextTier}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Engagement Scores */}
      <Card className="bg-gradient-to-br from-[rgba(28,58,54,0.9)] to-[rgba(15,42,38,0.9)] border-2 border-orange-600/30">
        <CardHeader>
          <CardTitle className="text-[#F8F5F0] flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-400" />
            Engagement Scores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#B8A898]">Marketplace</span>
              <span className="text-sm font-medium text-[#F8F5F0]">{tierData.marketplaceScore}/100</span>
            </div>
            <div className="h-2 bg-[rgba(10,58,42,0.6)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-600"
                style={{ width: `${tierData.marketplaceScore}%` }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#B8A898]">Gaming</span>
              <span className="text-sm font-medium text-[#F8F5F0]">{tierData.gamingScore}/100</span>
            </div>
            <div className="h-2 bg-[rgba(10,58,42,0.6)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                style={{ width: `${tierData.gamingScore}%` }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#B8A898]">Activity</span>
              <span className="text-sm font-medium text-[#F8F5F0]">{tierData.activityScore}/100</span>
            </div>
            <div className="h-2 bg-[rgba(10,58,42,0.6)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-purple-600"
                style={{ width: `${tierData.activityScore}%` }}
              />
            </div>
          </div>
          <div className="pt-2 border-t border-orange-600/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#F8F5F0]">Total Engagement</span>
              <span className="text-lg font-bold text-orange-400">{tierData.engagementScore}/100</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tier Benefits */}
      <Card className="bg-gradient-to-br from-[rgba(28,58,54,0.9)] to-[rgba(15,42,38,0.9)] border-2 border-orange-600/30">
        <CardHeader>
          <CardTitle className="text-[#F8F5F0] flex items-center gap-2">
            <Star className="h-5 w-5 text-orange-400" />
            Your Benefits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {tierData.benefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-[#B8A898]">
                <Award className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Next Tier Requirements */}
      {tierData.nextTier && (
        <Card className="bg-gradient-to-br from-[rgba(28,58,54,0.9)] to-[rgba(15,42,38,0.9)] border-2 border-orange-600/30">
          <CardHeader>
            <CardTitle className="text-[#F8F5F0] flex items-center gap-2">
              <Target className="h-5 w-5 text-orange-400" />
              Unlock {tierData.nextTier} Tier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(nextTierRequirements[tierData.nextTier]).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-[rgba(10,58,42,0.6)]">
                  <span className="text-sm text-[#B8A898] capitalize">{key}</span>
                  <span className="text-sm font-medium text-[#F8F5F0]">{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

