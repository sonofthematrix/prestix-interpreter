// ============================================================================
// BLOG STORE - ZUSTAND STORE FOR BLOG POST MANAGEMENT
// ============================================================================

import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// ============================================================================
// TYPES
// ============================================================================

export interface BlogPost {
  id: string;
  authorId: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featuredImage?: string;
  images: string[];
  tags: string[];
  category?: string;
  metaTitle?: string;
  metaDescription?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | 'SCHEDULED';
  publishedAt?: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    profileImageUrl?: string;
  };
  comments?: Array<{
    id: string;
    user: {
      id: string;
      name: string;
      profileImageUrl?: string;
    };
    content: string;
    createdAt: string;
  }>;
  _count?: {
    comments: number;
  };
}

export interface BlogStoreState {
  // State
  posts: BlogPost[];
  currentPost: BlogPost | null;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  
  // Filters and search
  searchQuery: string;
  selectedCategory: string | null;
  selectedStatus: string | null;
  sortBy: 'date-desc' | 'date-asc' | 'title' | 'views';
  
  // Pagination
  currentPage: number;
  totalPages: number;
  totalPosts: number;
  postsPerPage: number;
}

export interface BlogStoreActions {
  // Data fetching
  fetchPosts: (options?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: string;
    sortBy?: string;
    forceRefresh?: boolean;
  }) => Promise<void>;
  
  fetchPost: (id: string) => Promise<BlogPost | null>;
  fetchPostBySlug: (slug: string) => Promise<BlogPost | null>;
  
  // CRUD operations
  createPost: (postData: Partial<BlogPost>) => Promise<BlogPost | null>;
  updatePost: (id: string, updates: Partial<BlogPost>) => Promise<BlogPost | null>;
  deletePost: (id: string) => Promise<boolean>;
  
  // Local state management
  setCurrentPost: (post: BlogPost | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string | null) => void;
  setSelectedStatus: (status: string | null) => void;
  setSortBy: (sortBy: 'date-desc' | 'date-asc' | 'title' | 'views') => void;
  setCurrentPage: (page: number) => void;
  
  // Utility functions
  getPostById: (id: string) => BlogPost | null;
  getPostBySlug: (slug: string) => BlogPost | null;
  getPostsByCategory: (category: string) => BlogPost[];
  getPostsByStatus: (status: string) => BlogPost[];
  getPublishedPosts: () => BlogPost[];
  getDraftPosts: () => BlogPost[];
  
  // Cache management
  clearCache: () => void;
  refreshPosts: () => Promise<void>;
  
  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
}

export type BlogStore = BlogStoreState & BlogStoreActions;

// ============================================================================
// BLOG STORE IMPLEMENTATION
// ============================================================================

export const useBlogStore = create<BlogStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          // Initial state
          posts: [],
          currentPost: null,
          loading: false,
          error: null,
          lastFetched: null,
          
          // Filters and search
          searchQuery: '',
          selectedCategory: null,
          selectedStatus: null,
          sortBy: 'date-desc',
          
          // Pagination
          currentPage: 1,
          totalPages: 0,
          totalPosts: 0,
          postsPerPage: 10,

          // ============================================================================
          // DATA FETCHING ACTIONS
          // ============================================================================

          fetchPosts: async (options = {}) => {
            const {
              page = 1,
              limit = 10,
              search = '',
              category = '',
              status = '',
              sortBy = 'date-desc',
              forceRefresh = false
            } = options;

            const state = get();
            
            // Check if we need to fetch (cache is valid for 5 minutes)
            const now = Date.now();
            const cacheValid = state.lastFetched && (now - state.lastFetched) < 5 * 60 * 1000;
            
            if (!forceRefresh && cacheValid && state.posts.length > 0) {
              console.log('📦 Using cached blog posts');
              return;
            }

            set((state) => {
              state.loading = true;
              state.error = null;
            });

            try {
              const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                ...(search && { search }),
                ...(category && { category }),
                ...(status && { status }),
                ...(sortBy && { sortBy })
              });

              // Add cache busting for force refresh
              if (forceRefresh) {
                queryParams.append('_t', Date.now().toString());
              }

              const response = await fetch(`/api/blog-posts?${queryParams}`, {
                cache: forceRefresh ? 'no-cache' : 'default',
                headers: forceRefresh ? {
                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                  'Pragma': 'no-cache',
                  'Expires': '0'
                } : {}
              });

              if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }

              const data = await response.json();
              
              set((state) => {
                state.posts = data.posts || [];
                state.currentPage = data.pagination?.page || 1;
                state.totalPages = data.pagination?.pages || 0;
                state.totalPosts = data.pagination?.total || 0;
                state.postsPerPage = data.pagination?.limit || 10;
                state.loading = false;
                state.error = null;
                state.lastFetched = now;
              });

              console.log(`📊 Fetched ${data.posts?.length || 0} blog posts`);
            } catch (error) {
              console.error('❌ Error fetching blog posts:', error);
              set((state) => {
                state.loading = false;
                state.error = error instanceof Error ? error.message : 'Failed to fetch blog posts';
              });
            }
          },

          fetchPost: async (id: string) => {
            set((state) => {
              state.loading = true;
              state.error = null;
            });

            try {
              const response = await fetch(`/api/blogposts/${id}`);
              
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }

              const post = await response.json();
              
              set((state) => {
                state.currentPost = post;
                state.loading = false;
                state.error = null;
              });

              return post;
            } catch (error) {
              console.error('❌ Error fetching blog post:', error);
              set((state) => {
                state.loading = false;
                state.error = error instanceof Error ? error.message : 'Failed to fetch blog post';
              });
              return null;
            }
          },

          fetchPostBySlug: async (slug: string) => {
            set((state) => {
              state.loading = true;
              state.error = null;
            });

            try {
              const response = await fetch(`/api/blog-posts?slug=${slug}`);
              
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }

              const data = await response.json();
              const post = data.posts?.[0] || null;
              
              set((state) => {
                state.currentPost = post;
                state.loading = false;
                state.error = null;
              });

              return post;
            } catch (error) {
              console.error('❌ Error fetching blog post by slug:', error);
              set((state) => {
                state.loading = false;
                state.error = error instanceof Error ? error.message : 'Failed to fetch blog post';
              });
              return null;
            }
          },

          // ============================================================================
          // CRUD OPERATIONS
          // ============================================================================

          createPost: async (postData: Partial<BlogPost>) => {
            set((state) => {
              state.loading = true;
              state.error = null;
            });

            try {
              const response = await fetch('/api/blog-posts', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(postData)
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
              }

              const newPost = await response.json();
              
              set((state) => {
                state.posts.unshift(newPost);
                state.totalPosts += 1;
                state.loading = false;
                state.error = null;
              });

              return newPost;
            } catch (error) {
              console.error('❌ Error creating blog post:', error);
              set((state) => {
                state.loading = false;
                state.error = error instanceof Error ? error.message : 'Failed to create blog post';
              });
              return null;
            }
          },

          updatePost: async (id: string, updates: Partial<BlogPost>) => {
            set((state) => {
              state.loading = true;
              state.error = null;
            });

            try {
              const response = await fetch(`/api/blogposts/${id}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates)
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
              }

              const updatedPost = await response.json();
              
              set((state) => {
                const index = state.posts.findIndex(post => post.id === id);
                if (index !== -1) {
                  state.posts[index] = updatedPost;
                }
                if (state.currentPost?.id === id) {
                  state.currentPost = updatedPost;
                }
                state.loading = false;
                state.error = null;
              });

              return updatedPost;
            } catch (error) {
              console.error('❌ Error updating blog post:', error);
              set((state) => {
                state.loading = false;
                state.error = error instanceof Error ? error.message : 'Failed to update blog post';
              });
              return null;
            }
          },

          deletePost: async (id: string) => {
            set((state) => {
              state.loading = true;
              state.error = null;
            });

            try {
              const response = await fetch(`/api/blogposts/${id}`, {
                method: 'DELETE'
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
              }

              set((state) => {
                state.posts = state.posts.filter(post => post.id !== id);
                state.totalPosts -= 1;
                if (state.currentPost?.id === id) {
                  state.currentPost = null;
                }
                state.loading = false;
                state.error = null;
              });

              return true;
            } catch (error) {
              console.error('❌ Error deleting blog post:', error);
              set((state) => {
                state.loading = false;
                state.error = error instanceof Error ? error.message : 'Failed to delete blog post';
              });
              return false;
            }
          },

          // ============================================================================
          // LOCAL STATE MANAGEMENT
          // ============================================================================

          setCurrentPost: (post: BlogPost | null) => {
            set((state) => {
              state.currentPost = post;
            });
          },

          setSearchQuery: (query: string) => {
            set((state) => {
              state.searchQuery = query;
            });
          },

          setSelectedCategory: (category: string | null) => {
            set((state) => {
              state.selectedCategory = category;
            });
          },

          setSelectedStatus: (status: string | null) => {
            set((state) => {
              state.selectedStatus = status;
            });
          },

          setSortBy: (sortBy: 'date-desc' | 'date-asc' | 'title' | 'views') => {
            set((state) => {
              state.sortBy = sortBy;
            });
          },

          setCurrentPage: (page: number) => {
            set((state) => {
              state.currentPage = page;
            });
          },

          // ============================================================================
          // UTILITY FUNCTIONS
          // ============================================================================

          getPostById: (id: string) => {
            const state = get();
            return state.posts.find(post => post.id === id) || null;
          },

          getPostBySlug: (slug: string) => {
            const state = get();
            return state.posts.find(post => post.slug === slug) || null;
          },

          getPostsByCategory: (category: string) => {
            const state = get();
            return state.posts.filter(post => post.category === category);
          },

          getPostsByStatus: (status: string) => {
            const state = get();
            return state.posts.filter(post => post.status === status);
          },

          getPublishedPosts: () => {
            const state = get();
            return state.posts.filter(post => post.status === 'PUBLISHED');
          },

          getDraftPosts: () => {
            const state = get();
            return state.posts.filter(post => post.status === 'DRAFT');
          },

          // ============================================================================
          // CACHE MANAGEMENT
          // ============================================================================

          clearCache: () => {
            set((state) => {
              state.posts = [];
              state.currentPost = null;
              state.lastFetched = null;
              state.error = null;
            });
          },

          refreshPosts: async () => {
            const state = get();
            await state.fetchPosts({ forceRefresh: true });
          },

          // ============================================================================
          // ERROR HANDLING
          // ============================================================================

          setError: (error: string | null) => {
            set((state) => {
              state.error = error;
            });
          },

          clearError: () => {
            set((state) => {
              state.error = null;
            });
          },
        }))
      ),
      {
        name: 'blog-store',
        partialize: (state) => ({
          // Only persist certain parts of the state
          searchQuery: state.searchQuery,
          selectedCategory: state.selectedCategory,
          selectedStatus: state.selectedStatus,
          sortBy: state.sortBy,
          currentPage: state.currentPage,
          postsPerPage: state.postsPerPage,
        }),
      }
    ),
    { name: 'BlogStore' }
  )
);

// ============================================================================
// SELECTORS (for performance optimization)
// ============================================================================

export const useBlogPosts = () => useBlogStore((state) => state.posts);
export const useCurrentBlogPost = () => useBlogStore((state) => state.currentPost);
export const useBlogLoading = () => useBlogStore((state) => state.loading);
export const useBlogError = () => useBlogStore((state) => state.error);
export const useBlogFilters = () => useBlogStore((state) => ({
  searchQuery: state.searchQuery,
  selectedCategory: state.selectedCategory,
  selectedStatus: state.selectedStatus,
  sortBy: state.sortBy,
}));
export const useBlogPagination = () => useBlogStore((state) => ({
  currentPage: state.currentPage,
  totalPages: state.totalPages,
  totalPosts: state.totalPosts,
  postsPerPage: state.postsPerPage,
}));

// ============================================================================
// EXPORT
// ============================================================================

export default useBlogStore;
