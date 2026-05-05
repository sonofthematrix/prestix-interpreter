// ============================================================================
// CORE ZUSTAND STORES FOR ZENSTACK MODELS
// ============================================================================

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { 
  UserWithRelations, 
  StoreState,
  ApiResponse,
  PaginatedResponse,
  QueryOptions,
  RealtimeEvent
} from './types';

// ============================================================================
// USER STORE
// ============================================================================

interface UserState extends StoreState {
  // State
  currentUser: UserWithRelations | null;
  users: Record<string, UserWithRelations>;
  userList: UserWithRelations[];
  
  // Actions
  setCurrentUser: (user: UserWithRelations | null) => void;
  setUsers: (users: UserWithRelations[]) => void;
  addUser: (user: UserWithRelations) => void;
  updateUser: (id: string, updates: Partial<UserWithRelations>) => void;
  removeUser: (id: string) => void;
  fetchUser: (id: string) => Promise<UserWithRelations | null>;
  fetchUsers: (options?: QueryOptions) => Promise<PaginatedResponse<UserWithRelations>>;
  searchUsers: (query: string) => Promise<UserWithRelations[]>;
  
  // Real-time
  handleRealtimeEvent: (event: RealtimeEvent) => void;
}

export const useUserStore = create<UserState>()(
  devtools(
    (set, get) => ({
          // Initial state
          currentUser: null,
          users: {},
          userList: [],
          isLoading: false,
          isInitialized: false,
          error: null,
          lastUpdated: {},
          cache: {},

          // Actions
          setCurrentUser: (user) => set((state) => ({
            currentUser: user,
            users: user ? { ...state.users, [user.id]: user } : state.users
          })),

          setUsers: (users) => set((state) => ({
            userList: users,
            users: users.reduce((acc, user) => ({ ...acc, [user.id]: user }), state.users),
            lastUpdated: { ...state.lastUpdated, users: new Date() }
          })),

          addUser: (user) => set((state) => ({
            users: { ...state.users, [user.id]: user },
            userList: [...state.userList, user]
          })),

          updateUser: (id, updates) => set((state) => {
            if (!state.users[id]) return state;
            return {
              users: { ...state.users, [id]: { ...state.users[id], ...updates } },
              userList: state.userList.map(u => u.id === id ? { ...u, ...updates } : u),
              currentUser: state.currentUser?.id === id ? { ...state.currentUser, ...updates } : state.currentUser
            };
          }),

          removeUser: (id) => set((state) => {
            const { [id]: removed, ...users } = state.users;
            return {
              users,
              userList: state.userList.filter(u => u.id !== id),
              currentUser: state.currentUser?.id === id ? null : state.currentUser
            };
          }),

          fetchUser: async (id) => {
            set({ isLoading: true, error: null });
            try {
              const response = await fetch(`/api/users/${id}`);
              const result: ApiResponse<UserWithRelations> = await response.json();
              
              if (result.success && result.data) {
                set((state) => ({
                  users: { ...state.users, [id]: result.data! },
                  lastUpdated: { ...state.lastUpdated, [`user-${id}`]: new Date() }
                }));
                return result.data;
              }
              return null;
            } catch (error) {
              set({ error: error instanceof Error ? error.message : 'Failed to fetch user' });
              return null;
            } finally {
              set({ isLoading: false });
            }
          },

          fetchUsers: async (options = {}) => {
            set({ isLoading: true, error: null });
            try {
              const params = new URLSearchParams();
              if (options.page) params.append('page', options.page.toString());
              if (options.pageSize) params.append('pageSize', options.pageSize.toString());
              if (options.search) params.append('search', options.search);
              if (options.filters) params.append('filters', JSON.stringify(options.filters));
              if (options.sort) params.append('sort', JSON.stringify(options.sort));

              const response = await fetch(`/api/users?${params}`);
              const result: PaginatedResponse<UserWithRelations> = await response.json();
              
              set((state) => ({
                userList: result.data,
                users: result.data.reduce((acc, user) => ({ ...acc, [user.id]: user }), state.users),
                lastUpdated: { ...state.lastUpdated, users: new Date() }
              }));
              
              return result;
            } catch (error) {
              set({ error: error instanceof Error ? error.message : 'Failed to fetch users' });
              return { data: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 } };
            } finally {
              set({ isLoading: false });
            }
          },

          searchUsers: async (query) => {
            try {
              const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
              const result: ApiResponse<UserWithRelations[]> = await response.json();
              return result.success ? result.data || [] : [];
            } catch (error) {
              console.error('Failed to search users:', error);
              return [];
            }
          },

          handleRealtimeEvent: (event) => set((state) => {
            if (event.model !== 'User') return state;
            
            switch (event.type) {
              case 'create':
              case 'upsert':
                if (event.data) {
                  const exists = state.userList.find(u => u.id === event.data.id);
                  return {
                    users: { ...state.users, [event.data.id]: event.data },
                    userList: exists ? state.userList : [...state.userList, event.data]
                  };
                }
                break;
              case 'update':
                if (state.users[event.id]) {
                  return {
                    users: { ...state.users, [event.id]: { ...state.users[event.id], ...event.data } },
                    userList: state.userList.map(u => u.id === event.id ? { ...u, ...event.data } : u),
                    currentUser: state.currentUser?.id === event.id ? { ...state.currentUser, ...event.data } : state.currentUser
                  };
                }
                break;
              case 'delete':
                const { [event.id]: removed, ...users } = state.users;
                return {
                  users,
                  userList: state.userList.filter(u => u.id !== event.id),
                  currentUser: state.currentUser?.id === event.id ? null : state.currentUser
                };
            }
            return state;
          }),
        }),
    { name: 'UserStore' }
  )
);