// ============================================================================
// REAL-TIME SYNCHRONIZATION STORE
// ============================================================================
import {useEffect} from 'react';
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { 
  RealtimeEvent, 
  SubscriptionOptions,
  ApiResponse
} from './types';
import { useAuthStore } from './auth-store';

// ============================================================================
// REALTIME STORE
// ============================================================================

interface RealtimeState {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  
  // Subscriptions
  subscriptions: Map<string, SubscriptionOptions>;
  activeSubscriptions: Set<string>;
  
  // Event handling
  eventHandlers: Map<string, (event: RealtimeEvent) => void>;
  eventQueue: RealtimeEvent[];
  isProcessingQueue: boolean;
  
  // Actions
  connect: () => Promise<boolean>;
  disconnect: () => void;
  reconnect: () => Promise<boolean>;
  
  // Subscription management
  subscribe: (id: string, options: SubscriptionOptions) => void;
  unsubscribe: (id: string) => void;
  unsubscribeAll: () => void;
  
  // Event handling
  addEventHandler: (model: string, handler: (event: RealtimeEvent) => void) => void;
  removeEventHandler: (model: string) => void;
  handleEvent: (event: RealtimeEvent) => void;
  processEventQueue: () => void;
  
  // Helpers
  setConnectionState: (connected: boolean, error?: string) => void;
  addToQueue: (event: RealtimeEvent) => void;
  clearQueue: () => void;
  resubscribeAll: () => void;
}
 
// WebSocket connection instance
let ws: WebSocket | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let heartbeatTimer: NodeJS.Timeout | null = null;

export const useRealtimeStore = create<RealtimeState>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial state
        isConnected: false,
        isConnecting: false,
        connectionError: null,
        reconnectAttempts: 0,
        maxReconnectAttempts: 5,
        subscriptions: new Map(),
        activeSubscriptions: new Set(),
        eventHandlers: new Map(),
        eventQueue: [],
        isProcessingQueue: false,

        // Actions
        connect: async () => {
          const state = get();
          if (state.isConnected || state.isConnecting) {
            return state.isConnected;
          }

          set((state) => {
            state.isConnecting = true;
            state.connectionError = null;
          });

          try {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/api/realtime`;
            
            ws = new WebSocket(wsUrl);

            ws.onopen = () => {
              set((state) => {
                state.isConnected = true;
                state.isConnecting = false;
                state.connectionError = null;
                state.reconnectAttempts = 0;
              });

              // Start heartbeat
              startHeartbeat();
              
              // Resubscribe to all active subscriptions
              get().resubscribeAll();
              
              console.log('WebSocket connected');
            };

            ws.onmessage = (event) => {
              try {
                const data = JSON.parse(event.data);
                
                if (data.type === 'pong') {
                  // Heartbeat response
                  return;
                }
                
                if (data.type === 'event') {
                  const realtimeEvent: RealtimeEvent = data.event;
                  get().handleEvent(realtimeEvent);
                }
              } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
              }
            };

            ws!.onclose = (event) => {
              set((state) => {
                state.isConnected = false;
                state.isConnecting = false;
              });

              stopHeartbeat();
              
              // Attempt to reconnect if not a clean close
              if (event.code !== 1000 && get().reconnectAttempts < get().maxReconnectAttempts) {
                get().reconnect();
              }
              
              console.log('WebSocket disconnected:', event.code, event.reason);
            };

            ws!.onerror = (error) => {
              set((state) => {
                state.connectionError = 'WebSocket connection error';
                state.isConnecting = false;
              });
              
              console.error('WebSocket error:', error);
            };

            return true;
          } catch (error) {
            set((state) => {
              state.connectionError = error instanceof Error ? error.message : 'Connection failed';
              state.isConnecting = false;
            });
            return false;
          }
        },

        disconnect: () => {
          if (ws) {
            ws.close(1000, 'Client disconnect');
            ws = null;
          }
          
          stopHeartbeat();
          
          if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
          }
          
          set((state) => {
            state.isConnected = false;
            state.isConnecting = false;
            state.connectionError = null;
            state.reconnectAttempts = 0;
            state.activeSubscriptions.clear();
          });
        },

        reconnect: async () => {
          const state = get();
          if (state.isConnected || state.isConnecting) {
            return state.isConnected;
          }

          set((state) => {
            state.reconnectAttempts++;
          });

          const delay = Math.min(1000 * Math.pow(2, state.reconnectAttempts), 30000);
          
          return new Promise((resolve) => {
            reconnectTimer = setTimeout(async () => {
              const success = await get().connect();
              resolve(success);
            }, delay);
          });
        },

        // Subscription management
        subscribe: (id, options) => {
          set((state) => {
            state.subscriptions.set(id, options);
            state.activeSubscriptions.add(id);
          });

          // Send subscription to server if connected
          if (get().isConnected && ws) {
            ws.send(JSON.stringify({
              type: 'subscribe',
              id,
              options,
            }));
          }
        },

        unsubscribe: (id) => {
          set((state) => {
            state.subscriptions.delete(id);
            state.activeSubscriptions.delete(id);
          });

          // Send unsubscription to server if connected
          if (get().isConnected && ws) {
            ws.send(JSON.stringify({
              type: 'unsubscribe',
              id,
            }));
          }
        },

        unsubscribeAll: () => {
          set((state) => {
            state.subscriptions.clear();
            state.activeSubscriptions.clear();
          });

          // Send unsubscribe all to server if connected
          if (get().isConnected && ws) {
            ws.send(JSON.stringify({
              type: 'unsubscribe_all',
            }));
          }
        },

        // Event handling
        addEventHandler: (model, handler) => {
          set((state) => {
            state.eventHandlers.set(model, handler);
          });
        },

        removeEventHandler: (model) => {
          set((state) => {
            state.eventHandlers.delete(model);
          });
        },

        handleEvent: (event) => {
          // Add to queue for processing
          get().addToQueue(event);
          
          // Process queue if not already processing
          if (!get().isProcessingQueue) {
            get().processEventQueue();
          }
        },

        processEventQueue: () => {
          set((state) => {
            state.isProcessingQueue = true;
          });

          const { eventQueue, eventHandlers } = get();
          
          while (eventQueue.length > 0) {
            const event = eventQueue.shift();
            if (!event) continue;

            // Call specific model handler
            const handler = eventHandlers.get(event.model);
            if (handler) {
              try {
                handler(event);
              } catch (error) {
                console.error(`Error handling event for model ${event.model}:`, error);
              }
            }

            // Call global event handlers
            const globalHandler = eventHandlers.get('*');
            if (globalHandler) {
              try {
                globalHandler(event);
              } catch (error) {
                console.error('Error handling global event:', error);
              }
            }
          }

          set((state) => {
            state.isProcessingQueue = false;
          });
        },

        // Helpers
        setConnectionState: (connected, error) => {
          set((state) => {
            state.isConnected = connected;
            state.connectionError = error || null;
            if (connected) {
              state.reconnectAttempts = 0;
            }
          });
        },

        addToQueue: (event) => {
          set((state) => {
            state.eventQueue.push(event);
          });
        },

        clearQueue: () => {
          set((state) => {
            state.eventQueue = [];
          });
        },

        // Resubscribe to all active subscriptions
        resubscribeAll: () => {
          const { subscriptions, isConnected } = get();
          
          if (!isConnected || !ws) return;

          subscriptions.forEach((options, id) => {
            ws!.send(JSON.stringify({
              type: 'subscribe',
              id,
              options,
            }));
          });
        },
      }))
    ),
    { name: 'RealtimeStore' }
  )
);

// ============================================================================
// HEARTBEAT MANAGEMENT
// ============================================================================

const startHeartbeat = () => {
  stopHeartbeat();
  
  heartbeatTimer = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {;
      ws.send(JSON.stringify({ type: 'ping' }));
    }
  }, 30000); // Send ping every 30 seconds
};

const stopHeartbeat = () => {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
};

// ============================================================================
// REALTIME HOOKS
// ============================================================================

export const useRealtime = () => {
  const realtimeStore = useRealtimeStore();
  
  return {
    isConnected: realtimeStore.isConnected,
    isConnecting: realtimeStore.isConnecting,
    connectionError: realtimeStore.connectionError,
    connect: realtimeStore.connect,
    disconnect: realtimeStore.disconnect,
    reconnect: realtimeStore.reconnect,
  };
};

export const useRealtimeSubscription = (id: string, options: SubscriptionOptions) => {
  const realtimeStore = useRealtimeStore();
  
  // Subscribe on mount
  useEffect(() => {;
    realtimeStore.subscribe(id, options);
    
    return () => {
      realtimeStore.unsubscribe(id);
    };
  }, [id, JSON.stringify(options)]);
  
  return {
    isSubscribed: realtimeStore.activeSubscriptions.has(id),
    subscribe: () => realtimeStore.subscribe(id, options),
    unsubscribe: () => realtimeStore.unsubscribe(id),
  };
};

export const useRealtimeEventHandler = (model: string, handler: (event: RealtimeEvent) => void) => {
  const realtimeStore = useRealtimeStore();
  
  useEffect(() => {;  
    realtimeStore.addEventHandler(model, handler);
    
    return () => {
      realtimeStore.removeEventHandler(model);
    };
  }, [model, handler]);
};

// ============================================================================
// MODEL-SPECIFIC REALTIME HOOKS
// ============================================================================

export const useUserRealtime = () => {
  useRealtimeEventHandler('User', (event) => {
    // Handle user realtime events
    console.log('User event:', event);  
  });   
  
  return {
    subscribeToUsers: () => {
      const realtimeStore = useRealtimeStore();
      realtimeStore.subscribe('users', {
        models: ['User'],
      });
    },
    unsubscribeFromUsers: () => {
      const realtimeStore = useRealtimeStore();
      realtimeStore.unsubscribe('users');
    },
  };
};

export const useSpaceRealtime = () => {
  useRealtimeEventHandler('Space', (event) => {
    // Handle space realtime events
    console.log('Space event:', event);
  });
  
  return {
    subscribeToSpaces: () => {
      const realtimeStore = useRealtimeStore();
      realtimeStore.subscribe('spaces', {
        models: ['Space'],
      });
    },
    unsubscribeFromSpaces: () => {
      const realtimeStore = useRealtimeStore();
      realtimeStore.unsubscribe('spaces');
    },
  };
};

export const useTodoRealtime = () => {
  useRealtimeEventHandler('List', (event) => {
    // Handle list realtime events
    console.log('List event:', event);
  });
  
  useRealtimeEventHandler('Todo', (event) => {
    // Handle todo realtime events
    console.log('Todo event:', event);
  });
  
  return {
    subscribeToTodos: (spaceId?: number) => {
      const realtimeStore = useRealtimeStore();
      realtimeStore.subscribe('todos', {
        models: ['List', 'Todo'],
        filters: spaceId ? { spaceId } : undefined,
      });
    },
    unsubscribeFromTodos: () => {
      const realtimeStore = useRealtimeStore();
      realtimeStore.unsubscribe('todos');
    },
  };
};

// ============================================================================
// REALTIME INITIALIZATION
// ============================================================================

export const initializeRealtime = async () => {
  const realtimeStore = useRealtimeStore();
  
  // Connect to WebSocket
  await realtimeStore.connect();
  
  // Set up default subscriptions based on user context
  const authStore = useAuthStore.getState();
  if (authStore.user) {
    // Subscribe to user updates
    realtimeStore.subscribe('user-updates', {
      models: ['User'],
      filters: { id: authStore.user.id.toString() }, 
    });  
    
    // Subscribe to spaces the user is a member of
    // const spaceIds = authStore.user.spaces.map((su: any)   => su.space.id);
    // if (spaceIds.length > 0) { 
    //   realtimeStore.subscribe('user-spaces', {
    //     models: ['Space', 'List', 'Todo'],
    //     filters: { id: { in: spaceIds } },
    //   });  
    // }
  }
};

// ============================================================================
// CLEANUP ON PAGE UNLOAD
// ============================================================================

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    const realtimeStore = useRealtimeStore.getState();
  realtimeStore.disconnect();
  });
}
