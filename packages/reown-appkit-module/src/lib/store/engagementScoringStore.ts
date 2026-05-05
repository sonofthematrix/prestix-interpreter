import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

/**
 * Engagement Scoring Store
 * 
 * Manages user engagement scores and subscription tier eligibility
 * Caches expensive scoring calculations and provides real-time tier updates
 */

export type SubscriptionTier = 'BRONZE' | 'SILVER' | 'GOLD';

export interface EngagementScores {
  userId: string;
  marketplaceScore: number; // 0-100
  gamificationScore: number; // 0-100
  activityScore: number; // 0-100
  totalEngagementScore: number; // 0-100
  tierMultiplier: number; // 1.0, 1.2, or 1.5
  qualifiesForSilver: boolean;
  qualifiesForGold: boolean;
  currentTier: SubscriptionTier;
  lastCalculated: Date;
}

export interface TierBenefits {
  tier: SubscriptionTier;
  roiBonus: number; // Percentage points (e.g., 2 for +2%)
  cashbackRate: number; // Percentage (e.g., 3 for 3%)
  monthlyBonus: number; // Dollar amount
  earlyAccessHours: number; // Hours before public
  maxSavedProperties: number;
  supportResponseTime: string;
  features: string[];
}

interface EngagementScoringState {
  // Cached scores
  scores: Record<string, EngagementScores>; // userId -> scores
  
  // Tier benefits (static data)
  tierBenefits: Record<SubscriptionTier, TierBenefits>;
  
  // Calculation status
  calculating: Set<string>; // userIds currently calculating
  
  // Loading states
  loading: {
    calculate: boolean;
    checkUpgrade: boolean;
  };
  
  // Error states
  errors: {
    calculate?: string;
    checkUpgrade?: string;
  };
  
  // Cache TTL (10 minutes - scores change less frequently)
  cacheTTL: number;
  
  // Actions
  actions: {
    // Scoring actions
    calculateEngagementScore: (userId: string, forceRefresh?: boolean) => Promise<EngagementScores>;
    getCachedScore: (userId: string) => EngagementScores | null;
    checkTierUpgrade: (userId: string) => Promise<boolean>;
    
    // Tier benefits
    getTierBenefits: (tier: SubscriptionTier) => TierBenefits;
    setTierBenefits: (tier: SubscriptionTier, benefits: TierBenefits) => void;
    
    // Cache management
    invalidateCache: (userId: string) => void;
    invalidateAllCache: () => void;
    isCacheValid: (userId: string) => boolean;
    
    // Loading and error management
    setLoading: (key: keyof EngagementScoringState['loading'], loading: boolean) => void;
    setError: (key: keyof EngagementScoringState['errors'], error?: string) => void;
    clearErrors: () => void;
    
    // Utility actions
    reset: () => void;
  };
}

const defaultTierBenefits: Record<SubscriptionTier, TierBenefits> = {
  BRONZE: {
    tier: 'BRONZE',
    roiBonus: 0,
    cashbackRate: 1,
    monthlyBonus: 0,
    earlyAccessHours: 0,
    maxSavedProperties: 10,
    supportResponseTime: '48 hours',
    features: ['Basic marketplace access', 'Standard support'],
  },
  SILVER: {
    tier: 'SILVER',
    roiBonus: 1,
    cashbackRate: 2,
    monthlyBonus: 25,
    earlyAccessHours: 24,
    maxSavedProperties: 25,
    supportResponseTime: '24 hours',
    features: [
      'Basic marketplace access',
      'Standard support',
      'Early property access',
      'Enhanced ROI',
      'Monthly bonus',
    ],
  },
  GOLD: {
    tier: 'GOLD',
    roiBonus: 2,
    cashbackRate: 3,
    monthlyBonus: 50,
    earlyAccessHours: 48,
    maxSavedProperties: 50,
    supportResponseTime: '12 hours',
    features: [
      'Basic marketplace access',
      'Standard support',
      'Early property access',
      'Enhanced ROI',
      'Monthly bonus',
      'Priority support',
      'Exclusive properties',
    ],
  },
};

const initialState: Omit<EngagementScoringState, 'actions'> = {
  scores: {},
  tierBenefits: defaultTierBenefits,
  calculating: new Set(),
  loading: {
    calculate: false,
    checkUpgrade: false,
  },
  errors: {},
  cacheTTL: 10 * 60 * 1000, // 10 minutes
};

export const useEngagementScoringStore = create<EngagementScoringState>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        actions: {
          calculateEngagementScore: async (userId, forceRefresh = false) => {
            // Check cache first
            if (!forceRefresh) {
              const cached = get().scores[userId];
              if (cached && get().actions.isCacheValid(userId)) {
                return cached;
              }
            }

            // Prevent duplicate calculations
            if (get().calculating.has(userId)) {
              // Wait for existing calculation
              return new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                  const cached = get().scores[userId];
                  if (cached && !get().calculating.has(userId)) {
                    clearInterval(checkInterval);
                    resolve(cached);
                  }
                }, 100);
              });
            }

            set((state) => {
              state.loading.calculate = true;
              state.calculating.add(userId);
              delete state.errors.calculate;
            });

            try {
              const response = await fetch(`/api/users/${userId}/calculate-engagement`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
              });

              if (!response.ok) {
                throw new Error(`Failed to calculate engagement score: ${response.status}`);
              }

              const data = await response.json();

              const scores: EngagementScores = {
                userId,
                marketplaceScore: data.marketplaceScore || 0,
                gamificationScore: data.gamificationScore || 0,
                activityScore: data.activityScore || 0,
                totalEngagementScore: data.totalEngagementScore || 0,
                tierMultiplier: data.tierMultiplier || 1.0,
                qualifiesForSilver: data.qualifiesForSilver || false,
                qualifiesForGold: data.qualifiesForGold || false,
                currentTier: data.currentTier || 'BRONZE',
                lastCalculated: new Date(),
              };

              set((state) => {
                state.scores[userId] = scores;
                state.loading.calculate = false;
                state.calculating.delete(userId);
              });

              return scores;
            } catch (error: any) {
              set((state) => {
                state.errors.calculate = error.message;
                state.loading.calculate = false;
                state.calculating.delete(userId);
              });
              throw error;
            }
          },

          getCachedScore: (userId) => {
            return get().scores[userId] || null;
          },

          checkTierUpgrade: async (userId) => {
            set((state) => {
              state.loading.checkUpgrade = true;
              delete state.errors.checkUpgrade;
            });

            try {
              // Calculate score first
              const scores = await get().actions.calculateEngagementScore(userId);

              // Check if user qualifies for upgrade
              const canUpgrade = scores.qualifiesForSilver || scores.qualifiesForGold;

              set((state) => {
                state.loading.checkUpgrade = false;
              });

              return canUpgrade;
            } catch (error: any) {
              set((state) => {
                state.errors.checkUpgrade = error.message;
                state.loading.checkUpgrade = false;
              });
              return false;
            }
          },

          getTierBenefits: (tier) => {
            return get().tierBenefits[tier];
          },

          setTierBenefits: (tier, benefits) =>
            set((state) => {
              state.tierBenefits[tier] = benefits;
            }),

          invalidateCache: (userId) =>
            set((state) => {
              delete state.scores[userId];
            }),

          invalidateAllCache: () =>
            set((state) => {
              state.scores = {};
            }),

          isCacheValid: (userId) => {
            const cacheTTL = get().cacheTTL;
            const cached = get().scores[userId];
            if (!cached) return false;
            const age = Date.now() - cached.lastCalculated.getTime();
            return age < cacheTTL;
          },

          setLoading: (key, loading) =>
            set((state) => {
              state.loading[key] = loading;
            }),

          setError: (key, error) =>
            set((state) => {
              if (error) {
                state.errors[key] = error;
              } else {
                delete state.errors[key];
              }
            }),

          clearErrors: () =>
            set((state) => {
              state.errors = {};
            }),

          reset: () => set(() => ({ ...initialState })),
        },
      })),
      {
        name: 'engagement-scoring-store',
        partialize: (state) => ({
          scores: state.scores,
          tierBenefits: state.tierBenefits,
        }),
      }
    ),
    { name: 'Engagement Scoring Store' }
  )
);

// Convenience hooks
export const useEngagementScoringActions = () =>
  useEngagementScoringStore((state) => state.actions);
export const useEngagementScore = (userId: string) =>
  useEngagementScoringStore((state) => state.scores[userId]);
export const useTierBenefits = (tier: SubscriptionTier) =>
  useEngagementScoringStore((state) => state.tierBenefits[tier]);
export const useEngagementScoringLoading = () =>
  useEngagementScoringStore((state) => state.loading);
export const useEngagementScoringErrors = () =>
  useEngagementScoringStore((state) => state.errors);

