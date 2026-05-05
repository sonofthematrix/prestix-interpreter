import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

/**
 * Property Blockchain Store
 * 
 * Manages property tokenization deployment state and blockchain integration
 * Tracks deployment lifecycle: PENDING → DEPLOYING → DEPLOYED → FAILED
 */

export enum DeploymentStatus {
  PENDING = 'PENDING',
  DEPLOYING = 'DEPLOYING',
  DEPLOYED = 'DEPLOYED',
  FAILED = 'FAILED',
}

export interface PropertyBlockchainDeployment {
  propertyId: string;
  networkId: string;
  assetId?: number;
  registryAddress?: string;
  tokenAddress?: string;
  marketplaceAddress?: string;
  deploymentStatus: DeploymentStatus;
  deploymentTxHash?: string;
  deploymentError?: string;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number; // milliseconds
}

export interface PropertyWithBlockchain {
  propertyId: string;
  title: string;
  tokenAddress?: string;
  registryAddress?: string;
  marketplaceAddress?: string;
  totalTokens?: number;
  tokenPrice?: number;
  isTokenized: boolean;
  deploymentStatus: DeploymentStatus;
}

interface PropertyBlockchainState {
  // Deployments tracking
  deployments: Record<string, PropertyBlockchainDeployment>; // propertyId -> deployment
  
  // Properties with blockchain data
  properties: Record<string, PropertyWithBlockchain>; // propertyId -> property
  
  // Sync status
  syncStatus: {
    isSyncing: boolean;
    lastSynced?: Date;
    error?: string;
  };
  
  // Loading states
  loading: {
    deploy: boolean;
    sync: boolean;
    fetch: boolean;
  };
  
  // Error states
  errors: {
    deploy?: string;
    sync?: string;
    fetch?: string;
  };
  
  // Actions
  actions: {
    // Deployment actions
    startDeployment: (propertyId: string, networkId: string) => void;
    updateDeploymentStatus: (
      propertyId: string,
      status: DeploymentStatus,
      updates?: Partial<PropertyBlockchainDeployment>
    ) => void;
    trackDeployment: (deployment: PropertyBlockchainDeployment) => void;
    getDeploymentStatus: (propertyId: string) => DeploymentStatus | null;
    
    // Property actions
    setProperty: (property: PropertyWithBlockchain) => void;
    updateProperty: (
      propertyId: string,
      updates: Partial<PropertyWithBlockchain>
    ) => void;
    getProperty: (propertyId: string) => PropertyWithBlockchain | undefined;
    
    // Sync actions
    syncPropertyStatus: (propertyId: string) => Promise<void>;
    syncAllProperties: () => Promise<void>;
    setSyncStatus: (status: Partial<PropertyBlockchainState['syncStatus']>) => void;
    
    // Loading and error management
    setLoading: (key: keyof PropertyBlockchainState['loading'], loading: boolean) => void;
    setError: (key: keyof PropertyBlockchainState['errors'], error?: string) => void;
    clearErrors: () => void;
    
    // Utility actions
    reset: () => void;
  };
}

const initialState: Omit<PropertyBlockchainState, 'actions'> = {
  deployments: {},
  properties: {},
  syncStatus: {
    isSyncing: false,
  },
  loading: {
    deploy: false,
    sync: false,
    fetch: false,
  },
  errors: {},
};

export const usePropertyBlockchainStore = create<PropertyBlockchainState>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        actions: {
          startDeployment: (propertyId, networkId) =>
            set((state) => {
              state.deployments[propertyId] = {
                propertyId,
                networkId,
                deploymentStatus: DeploymentStatus.DEPLOYING,
                startedAt: new Date(),
              };
              state.loading.deploy = true;
              delete state.errors.deploy;
            }),

          updateDeploymentStatus: (propertyId, status, updates) =>
            set((state) => {
              const deployment = state.deployments[propertyId];
              if (deployment) {
                deployment.deploymentStatus = status;
                if (updates) {
                  Object.assign(deployment, updates);
                }
                if (status === DeploymentStatus.DEPLOYED || status === DeploymentStatus.FAILED) {
                  deployment.completedAt = new Date();
                  if (deployment.startedAt) {
                    deployment.duration =
                      deployment.completedAt.getTime() - deployment.startedAt.getTime();
                  }
                  state.loading.deploy = false;
                }
              }
            }),

          trackDeployment: (deployment) =>
            set((state) => {
              state.deployments[deployment.propertyId] = deployment;
            }),

          getDeploymentStatus: (propertyId) => {
            const deployment = get().deployments[propertyId];
            return deployment?.deploymentStatus || null;
          },

          setProperty: (property) =>
            set((state) => {
              state.properties[property.propertyId] = property;
            }),

          updateProperty: (propertyId, updates) =>
            set((state) => {
              const property = state.properties[propertyId];
              if (property) {
                Object.assign(property, updates);
              }
            }),

          getProperty: (propertyId) => {
            return get().properties[propertyId];
          },

          syncPropertyStatus: async (propertyId) => {
            set((state) => {
              state.loading.sync = true;
              state.syncStatus.isSyncing = true;
              delete state.errors.sync;
            });

            try {
              const response = await fetch(
                `/api/properties/${propertyId}/blockchain-status`,
                {
                  credentials: 'include',
                }
              );

              if (!response.ok) {
                throw new Error(`Failed to sync property status: ${response.status}`);
              }

              const data = await response.json();

              set((state) => {
                if (data.deployment) {
                  state.deployments[propertyId] = data.deployment;
                }
                if (data.property) {
                  state.properties[propertyId] = data.property;
                }
                state.loading.sync = false;
                state.syncStatus.isSyncing = false;
                state.syncStatus.lastSynced = new Date();
              });
            } catch (error: any) {
              set((state) => {
                state.errors.sync = error.message;
                state.loading.sync = false;
                state.syncStatus.isSyncing = false;
              });
            }
          },

          syncAllProperties: async () => {
            set((state) => {
              state.loading.sync = true;
              state.syncStatus.isSyncing = true;
              delete state.errors.sync;
            });

            try {
              const response = await fetch('/api/blockchain/sync-status', {
                credentials: 'include',
              });

              if (!response.ok) {
                throw new Error(`Failed to sync properties: ${response.status}`);
              }

              const data = await response.json();

              set((state) => {
                if (data.deployments) {
                  Object.assign(state.deployments, data.deployments);
                }
                if (data.properties) {
                  Object.assign(state.properties, data.properties);
                }
                state.loading.sync = false;
                state.syncStatus.isSyncing = false;
                state.syncStatus.lastSynced = new Date();
              });
            } catch (error: any) {
              set((state) => {
                state.errors.sync = error.message;
                state.loading.sync = false;
                state.syncStatus.isSyncing = false;
              });
            }
          },

          setSyncStatus: (status) =>
            set((state) => {
              Object.assign(state.syncStatus, status);
            }),

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
        name: 'property-blockchain-store',
        partialize: (state) => ({
          deployments: state.deployments,
          properties: state.properties,
          syncStatus: state.syncStatus,
        }),
      }
    ),
    { name: 'Property Blockchain Store' }
  )
);

// Convenience hooks
export const usePropertyBlockchainActions = () =>
  usePropertyBlockchainStore((state) => state.actions);
export const usePropertyDeployments = () =>
  usePropertyBlockchainStore((state) => state.deployments);
export const usePropertyBlockchainProperties = () =>
  usePropertyBlockchainStore((state) => state.properties);
export const usePropertyBlockchainSyncStatus = () =>
  usePropertyBlockchainStore((state) => state.syncStatus);
export const usePropertyBlockchainLoading = () =>
  usePropertyBlockchainStore((state) => state.loading);
export const usePropertyBlockchainErrors = () =>
  usePropertyBlockchainStore((state) => state.errors);

