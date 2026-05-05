/**
 * Activity Feed Component
 *
 * Real-time activity feed showing:
 * - Recent transactions
 * - Token transfers
 * - NFT activity
 * - Swap operations
 * - Contract interactions
 * - Status indicators
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../ui/card';
import { TigerSpinner } from '../../common/TigerSpinner';
import {
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Check,
  X,
  Clock,
  ExternalLink,
  Coins,
  ImageIcon,
  Activity,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'send' | 'receive' | 'swap' | 'nft' | 'contract' | 'approve';
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: Date;
  hash: string;
  from?: string;
  to?: string;
  value?: string;
  token?: string;
  description: string;
  gasUsed?: string;
}

interface ActivityFeedProps {
  address?: string;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number; // ms
}

// Mock activity data (would come from blockchain indexer in production)
const generateMockActivity = (address?: string): ActivityItem[] => {
  const now = Date.now();
  return [
    {
      id: '1',
      type: 'receive',
      status: 'confirmed',
      timestamp: new Date(now - 5 * 60 * 1000),
      hash: '0xabcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd1234',
      from: '0x1234...5678',
      to: address,
      value: '0.5',
      token: 'ETH',
      description: 'Received 0.5 ETH',
      gasUsed: '21000',
    },
    {
      id: '2',
      type: 'swap',
      status: 'confirmed',
      timestamp: new Date(now - 30 * 60 * 1000),
      hash: '0xdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abc',
      description: 'Swapped 1.0 USDC for 0.0005 ETH',
      value: '1.0',
      token: 'USDC',
      gasUsed: '150000',
    },
    {
      id: '3',
      type: 'send',
      status: 'pending',
      timestamp: new Date(now - 2 * 60 * 1000),
      hash: '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
      from: address,
      to: '0xabcd...ef01',
      value: '100',
      token: 'TKNZN',
      description: 'Sending 100 TKNZN',
    },
    {
      id: '4',
      type: 'nft',
      status: 'confirmed',
      timestamp: new Date(now - 2 * 60 * 60 * 1000),
      hash: '0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff',
      description: 'Minted Tokenizin NFT #42',
      gasUsed: '180000',
    },
    {
      id: '5',
      type: 'approve',
      status: 'confirmed',
      timestamp: new Date(now - 4 * 60 * 60 * 1000),
      hash: '0xaaaabbbbccccddddeeeeffffgggghhhhiiiijjjjkkkkllllmmmmnnnnoooopppp',
      description: 'Approved USDC for Uniswap Router',
      gasUsed: '45000',
    },
    {
      id: '6',
      type: 'contract',
      status: 'failed',
      timestamp: new Date(now - 6 * 60 * 60 * 1000),
      hash: '0xffeeddccbbaa9988776655443322110000112233445566778899aabbccddeeff',
      description: 'Contract interaction failed',
      gasUsed: '50000',
    },
  ];
};

export function ActivityFeed({
  address,
  limit = 50,
  autoRefresh = true,
  refreshInterval = 30000,
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'send' | 'receive' | 'swap' | 'nft'>('all');

  useEffect(() => {
    const fetchActivities = () => {
      setIsLoading(true);
      // Simulate API call
      setTimeout(() => {
        setActivities(generateMockActivity(address));
        setIsLoading(false);
      }, 500);
    };

    fetchActivities();

    if (autoRefresh) {
      const interval = setInterval(fetchActivities, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [address, autoRefresh, refreshInterval]);

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'send':
        return <ArrowUpRight className="h-4 w-4" />;
      case 'receive':
        return <ArrowDownLeft className="h-4 w-4" />;
      case 'swap':
        return <RefreshCw className="h-4 w-4" />;
      case 'nft':
        return <ImageIcon className="h-4 w-4" />;
      case 'approve':
      case 'contract':
        return <Activity className="h-4 w-4" />;
      default:
        return <Coins className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: ActivityItem['status']) => {
    switch (status) {
      case 'confirmed':
        return <Check className="h-3 w-3 text-green-400" />;
      case 'pending':
        return <Clock className="h-3 w-3 text-yellow-400 animate-pulse" />;
      case 'failed':
        return <X className="h-3 w-3 text-red-400" />;
    }
  };

  const getStatusColor = (status: ActivityItem['status']) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-500/20 border-green-500/30';
      case 'pending':
        return 'bg-yellow-500/20 border-yellow-500/30';
      case 'failed':
        return 'bg-red-500/20 border-red-500/30';
    }
  };

  const getTypeColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'send':
        return 'bg-orange-500/20 border-orange-500/30 text-orange-400';
      case 'receive':
        return 'bg-green-500/20 border-green-500/30 text-green-400';
      case 'swap':
        return 'bg-blue-500/20 border-blue-500/30 text-blue-400';
      case 'nft':
        return 'bg-purple-500/20 border-purple-500/30 text-purple-400';
      default:
        return 'bg-gray-500/20 border-gray-500/30 text-gray-400';
    }
  };

  const filteredActivities = activities.filter(
    (activity) => filter === 'all' || activity.type === filter
  );

  const blockExplorerUrl = (hash: string) =>
    `https://sepolia.etherscan.io/tx/${hash}`;

  if (isLoading && activities.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <TigerSpinner size="lg" />
        <p className="text-sm text-[#B8A898] ml-3">Loading activity...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Buttons */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'send', 'receive', 'swap', 'nft'].map((filterType) => (
          <button
            key={filterType}
            onClick={() => setFilter(filterType as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              filter === filterType
                ? 'bg-blue-500/30 text-blue-400 border-2 border-blue-500/50'
                : 'bg-[rgba(28,58,54,0.6)] text-[#B8A898] border-2 border-transparent hover:border-blue-500/30'
            }`}
          >
            {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
          </button>
        ))}
      </div>

      {/* Activity List */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-12 text-[#B8A898]">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No activity found</p>
          </div>
        ) : (
          filteredActivities.map((activity) => (
            <Card
              key={activity.id}
              className={`overflow-hidden transition-all hover:shadow-lg bg-gradient-to-r from-[rgba(28,58,54,0.9)] to-[rgba(15,42,38,0.9)] border-2 ${getStatusColor(
                activity.status
              )}`}
            >
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border-2 ${getTypeColor(
                      activity.type
                    )}`}
                  >
                    {getActivityIcon(activity.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-medium text-[#F8F5F0] truncate">
                        {activity.description}
                      </p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {getStatusIcon(activity.status)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[#B8A898] flex-wrap">
                      <span>
                        {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                      </span>
                      {activity.gasUsed && (
                        <>
                          <span>•</span>
                          <span>{parseInt(activity.gasUsed).toLocaleString()} gas</span>
                        </>
                      )}
                      <a
                        href={blockExplorerUrl(activity.hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3 w-3" />
                        View
                      </a>
                    </div>

                    {(activity.from || activity.to) && (
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        {activity.from && (
                          <span className="text-[#B8A898] font-mono">
                            From: {activity.from}
                          </span>
                        )}
                        {activity.from && activity.to && (
                          <ArrowUpRight className="h-3 w-3 text-[#B8A898]" />
                        )}
                        {activity.to && (
                          <span className="text-[#B8A898] font-mono">To: {activity.to}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Value Badge */}
                  {activity.value && activity.token && (
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold text-[#F8F5F0]">
                        {activity.value}
                      </div>
                      <div className="text-xs text-[#B8A898]">{activity.token}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
