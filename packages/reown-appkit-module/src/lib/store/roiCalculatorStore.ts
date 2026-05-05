import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

/**
 * ROI Calculator Store
 * 
 * Caches expensive ROI calculations and provides real-time ROI updates
 * Integrates with gaming and investment ROI calculations
 */

export interface UserROI {
  userId: string;
  gamingROI: number;
  totalGamingSpent: number;
  totalGamingWon: number;
  lastCalculated: Date;
}

export interface InvestmentImpact {
  userId: string;
  totalInvestmentValue: number;
  totalFundedToGaming: number;
  currentGamingBalance: number;
  netGamingResult: number;
  totalCurrentValue: number;
  originalInvestmentValue: number;
  overallROI: number;
  gamingROI: number;
  lastCalculated: Date;
}

interface ROICalculatorState {
  // Cached ROI data
  userROI: Record<string, UserROI>; // userId -> ROI
  investmentImpact: Record<string, InvestmentImpact>; // userId -> Impact
  
  // Calculation status
  calculating: Set<string>; // userIds currently calculating
  
  // Loading states
  loading: {
    gamingROI: boolean;
    investmentImpact: boolean;
  };
  
  // Error states
  errors: {
    gamingROI?: string;
    investmentImpact?: string;
  };
  
  // Cache TTL (5 minutes)
  cacheTTL: number;
  
  // Actions
  actions: {
    // ROI calculation actions
    calculateGamingROI: (userId: string, forceRefresh?: boolean) => Promise<number>;
    calculateInvestmentImpact: (userId: string, forceRefresh?: boolean) => Promise<InvestmentImpact>;
    getCachedROI: (userId: string) => UserROI | null;
    getCachedInvestmentImpact: (userId: string) => InvestmentImpact | null;
    
    // Cache management
    invalidateCache: (userId: string) => void;
    invalidateAllCache: () => void;
    isCacheValid: (userId: string, type: 'gaming' | 'investment') => boolean;
    
    // Loading and error management
    setLoading: (key: keyof ROICalculatorState['loading'], loading: boolean) => void;
    setError: (key: keyof ROICalculatorState['errors'], error?: string) => void;
    clearErrors: () => void;
    
    // Utility actions
    reset: () => void;
  };
}

const initialState: Omit<ROICalculatorState, 'actions'> = {
  userROI: {},
  investmentImpact: {},
  calculating: new Set(),
  loading: {
    gamingROI: false,
    investmentImpact: false,
  },
  errors: {},
  cacheTTL: 5 * 60 * 1000, // 5 minutes
};

export const useROICalculatorStore = create<ROICalculatorState>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        actions: {
          calculateGamingROI: async (userId, forceRefresh = false) => {
            // Check cache first
            if (!forceRefresh) {
              const cached = get().userROI[userId];
              if (cached && get().actions.isCacheValid(userId, 'gaming')) {
                return cached.gamingROI;
              }
            }

            // Prevent duplicate calculations
            if (get().calculating.has(userId)) {
              // Wait for existing calculation
              return new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                  const cached = get().userROI[userId];
                  if (cached && !get().calculating.has(userId)) {
                    clearInterval(checkInterval);
                    resolve(cached.gamingROI);
                  }
                }, 100);
              });
            }

            set((state) => {
              state.loading.gamingROI = true;
              state.calculating.add(userId);
              delete state.errors.gamingROI;
            });

            try {
              const response = await fetch(`/api/users/${userId}/roi-calculator`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ type: 'gaming' }),
              });

              if (!response.ok) {
                throw new Error(`Failed to calculate ROI: ${response.status}`);
              }

              const data = await response.json();

              const roi: UserROI = {
                userId,
                gamingROI: data.gamingROI || 0,
                totalGamingSpent: data.totalGamingSpent || 0,
                totalGamingWon: data.totalGamingWon || 0,
                lastCalculated: new Date(),
              };

              set((state) => {
                state.userROI[userId] = roi;
                state.loading.gamingROI = false;
                state.calculating.delete(userId);
              });

              return roi.gamingROI;
            } catch (error: any) {
              set((state) => {
                state.errors.gamingROI = error.message;
                state.loading.gamingROI = false;
                state.calculating.delete(userId);
              });
              throw error;
            }
          },

          calculateInvestmentImpact: async (userId, forceRefresh = false) => {
            // Check cache first
            if (!forceRefresh) {
              const cached = get().investmentImpact[userId];
              if (cached && get().actions.isCacheValid(userId, 'investment')) {
                return cached;
              }
            }

            // Prevent duplicate calculations
            if (get().calculating.has(userId)) {
              // Wait for existing calculation
              return new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                  const cached = get().investmentImpact[userId];
                  if (cached && !get().calculating.has(userId)) {
                    clearInterval(checkInterval);
                    resolve(cached);
                  }
                }, 100);
              });
            }

            set((state) => {
              state.loading.investmentImpact = true;
              state.calculating.add(userId);
              delete state.errors.investmentImpact;
            });

            try {
              const response = await fetch(`/api/users/${userId}/roi-calculator`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ type: 'investment' }),
              });

              if (!response.ok) {
                throw new Error(`Failed to calculate investment impact: ${response.status}`);
              }

              const data = await response.json();

              const impact: InvestmentImpact = {
                userId,
                totalInvestmentValue: data.totalInvestmentValue || 0,
                totalFundedToGaming: data.totalFundedToGaming || 0,
                currentGamingBalance: data.currentGamingBalance || 0,
                netGamingResult: data.netGamingResult || 0,
                totalCurrentValue: data.totalCurrentValue || 0,
                originalInvestmentValue: data.originalInvestmentValue || 0,
                overallROI: data.overallROI || 0,
                gamingROI: data.gamingROI || 0,
                lastCalculated: new Date(),
              };

              set((state) => {
                state.investmentImpact[userId] = impact;
                state.loading.investmentImpact = false;
                state.calculating.delete(userId);
              });

              return impact;
            } catch (error: any) {
              set((state) => {
                state.errors.investmentImpact = error.message;
                state.loading.investmentImpact = false;
                state.calculating.delete(userId);
              });
              throw error;
            }
          },

          getCachedROI: (userId) => {
            return get().userROI[userId] || null;
          },

          getCachedInvestmentImpact: (userId) => {
            return get().investmentImpact[userId] || null;
          },

          invalidateCache: (userId) =>
            set((state) => {
              delete state.userROI[userId];
              delete state.investmentImpact[userId];
            }),

          invalidateAllCache: () =>
            set((state) => {
              state.userROI = {};
              state.investmentImpact = {};
            }),

          isCacheValid: (userId, type) => {
            const cacheTTL = get().cacheTTL;
            const now = Date.now();

            if (type === 'gaming') {
              const cached = get().userROI[userId];
              if (!cached) return false;
              const age = now - cached.lastCalculated.getTime();
              return age < cacheTTL;
            } else {
              const cached = get().investmentImpact[userId];
              if (!cached) return false;
              const age = now - cached.lastCalculated.getTime();
              return age < cacheTTL;
            }
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
        name: 'roi-calculator-store',
        partialize: (state) => ({
          userROI: state.userROI,
          investmentImpact: state.investmentImpact,
        }),
      }
    ),
    { name: 'ROI Calculator Store' }
  )
);

// Convenience hooks
export const useROICalculatorActions = () =>
  useROICalculatorStore((state) => state.actions);
export const useUserROI = (userId: string) =>
  useROICalculatorStore((state) => state.userROI[userId]);
export const useInvestmentImpact = (userId: string) =>
  useROICalculatorStore((state) => state.investmentImpact[userId]);
export const useROICalculatorLoading = () =>
  useROICalculatorStore((state) => state.loading);
export const useROICalculatorErrors = () =>
  useROICalculatorStore((state) => state.errors);

