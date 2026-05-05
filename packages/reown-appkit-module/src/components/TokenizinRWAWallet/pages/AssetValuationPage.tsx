'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Building2, TrendingUp, DollarSign, PieChart, ArrowUpRight } from 'lucide-react';
import { TigerSpinner } from '../../common/TigerSpinner';
import Image from 'next/image';

interface Asset {
  id: string;
  title: string;
  imageUrl?: string;
  tokenAmount: number;
  tokenPrice: number;
  totalValue: number;
  purchasePrice: number;
  currentValue: number;
  roi: number;
  tokensOwned: number;
  totalTokens: number;
  status: 'active' | 'pending' | 'sold';
}

interface AssetValuationData {
  totalPortfolioValue: number;
  totalInvested: number;
  totalReturn: number;
  totalROI: number;
  assets: Asset[];
}

export function AssetValuationPage() {
  const [valuationData, setValuationData] = useState<AssetValuationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch asset valuation data from API
    setTimeout(() => {
      setValuationData({
        totalPortfolioValue: 125000,
        totalInvested: 100000,
        totalReturn: 25000,
        totalROI: 25,
        assets: [
          {
            id: '1',
            title: 'Villa Serene Waves',
            imageUrl: '/properties/villa-1.jpg',
            tokenAmount: 500,
            tokenPrice: 200,
            totalValue: 100000,
            purchasePrice: 80000,
            currentValue: 100000,
            roi: 25,
            tokensOwned: 500,
            totalTokens: 1000,
            status: 'active',
          },
          {
            id: '2',
            title: 'Luxury Penthouse',
            imageUrl: '/properties/penthouse-1.jpg',
            tokenAmount: 250,
            tokenPrice: 100,
            totalValue: 25000,
            purchasePrice: 20000,
            currentValue: 25000,
            roi: 25,
            tokensOwned: 250,
            totalTokens: 500,
            status: 'active',
          },
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

  if (!valuationData) return null;

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      {/* Portfolio Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-[rgba(28,58,54,0.9)] to-[rgba(15,42,38,0.9)] border-2 border-orange-600/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-orange-400" />
              <span className="text-xs text-[#B8A898]">Portfolio Value</span>
            </div>
            <div className="text-xl font-bold text-[#F8F5F0]">
              ${valuationData.totalPortfolioValue.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[rgba(28,58,54,0.9)] to-[rgba(15,42,38,0.9)] border-2 border-orange-600/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <span className="text-xs text-[#B8A898]">Total ROI</span>
            </div>
            <div className="text-xl font-bold text-green-400">
              {valuationData.totalROI}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Overview */}
      <Card className="bg-gradient-to-br from-[rgba(28,58,54,0.9)] to-[rgba(15,42,38,0.9)] border-2 border-orange-600/30">
        <CardHeader>
          <CardTitle className="text-[#F8F5F0] flex items-center gap-2">
            <PieChart className="h-5 w-5 text-orange-400" />
            Portfolio Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-[rgba(10,58,42,0.6)] border border-orange-600/20">
            <span className="text-sm text-[#B8A898]">Total Invested</span>
            <span className="text-sm font-bold text-[#F8F5F0]">
              ${valuationData.totalInvested.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-[rgba(10,58,42,0.6)] border border-green-500/20">
            <span className="text-sm text-[#B8A898]">Total Return</span>
            <span className="text-sm font-bold text-green-400">
              +${valuationData.totalReturn.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-[rgba(10,58,42,0.6)] border border-orange-600/20">
            <span className="text-sm text-[#B8A898]">Current Value</span>
            <span className="text-sm font-bold text-orange-400">
              ${valuationData.totalPortfolioValue.toLocaleString()}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Assets List */}
      <Card className="bg-gradient-to-br from-[rgba(28,58,54,0.9)] to-[rgba(15,42,38,0.9)] border-2 border-orange-600/30">
        <CardHeader>
          <CardTitle className="text-[#F8F5F0] flex items-center gap-2">
            <Building2 className="h-5 w-5 text-orange-400" />
            Your Assets ({valuationData.assets.length})
          </CardTitle>
          <CardDescription className="text-[#B8A898]">
            Properties you own tokens for
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {valuationData.assets.map((asset) => (
              <div
                key={asset.id}
                className="p-4 rounded-xl bg-gradient-to-r from-[rgba(28,58,54,0.9)] to-[rgba(15,42,38,0.9)] border-2 border-orange-600/30 hover:border-orange-500/50 transition-all"
              >
                <div className="flex gap-4">
                  {asset.imageUrl && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-orange-500/50 flex-shrink-0">
                      <Image
                        src={asset.imageUrl}
                        alt={asset.title}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                        unoptimized
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-[#F8F5F0] text-sm truncate">
                        {asset.title}
                      </h3>
                      <Badge
                        className={
                          asset.status === 'active'
                            ? 'bg-green-500/20 text-green-400 border-green-500/30'
                            : asset.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                            : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                        }
                      >
                        {asset.status}
                      </Badge>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#B8A898]">Ownership</span>
                        <span className="text-[#F8F5F0] font-medium">
                          {asset.tokensOwned} / {asset.totalTokens} tokens
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#B8A898]">Current Value</span>
                        <span className="text-[#F8F5F0] font-bold">
                          ${asset.currentValue.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#B8A898]">ROI</span>
                        <span className="text-green-400 font-bold flex items-center gap-1">
                          <ArrowUpRight className="h-3 w-3" />
                          {asset.roi}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

