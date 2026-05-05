// ============================================================================
// DOCUMENTATION STORE FOR ZENSTACK APPLICATION
// ============================================================================

import { useMemo } from 'react';
import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// ============================================================================
// TYPES
// ============================================================================

export interface Documentation {
  id: string;
  title: string;
  slug: string;
  description?: string;
  content: string;
  version: string;
  blobUrl?: string;
  blobPath?: string;
  blobVersion?: string;
  category?: string;
  tags: string[];
  isPublic: boolean;
  metaTitle?: string;
  metaDescription?: string;
  viewCount: number;
  lastViewedAt?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  authorId: string;
  author: {
    id: string;
    name?: string;
    email: string;
    profileImageUrl?: string;
  };
  versions?: DocumentationVersion[];
}

export interface DocumentationVersion {
  id: string;
  documentationId: string;
  version: string;
  content: string;
  blobUrl?: string;
  blobPath?: string;
  changeLog?: string;
  changeType: 'major' | 'minor' | 'patch';
  createdAt: string;
  authorId: string;
  author: {
    id: string;
    name?: string;
    email: string;
  };
}

export interface DocumentationData {
  title: string;
  slug: string;
  description?: string;
  content: string;
  category?: string;
  tags: string[];
  isPublic: boolean;
  metaTitle?: string;
  metaDescription?: string;
  changeLog?: string;
  changeType: 'major' | 'minor' | 'patch';
}

export interface DocumentationFilters {
  category?: string;
  tags?: string[];
  isPublic?: boolean;
  authorId?: string;
  search?: string;
}

export interface DocumentationPagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface DocumentationState {
  // State
  documentation: Documentation[];
  currentDocumentation: Documentation | null;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: string | null;
  
  // Filters and pagination
  filters: DocumentationFilters;
  pagination: DocumentationPagination;
  
  // UI state
  selectedDocumentation: Documentation | null;
  isEditing: boolean;
  isPreview: boolean;
  
  // Actions
  fetchDocumentation: (options?: { 
    filters?: DocumentationFilters; 
    pagination?: Partial<DocumentationPagination>;
  }) => Promise<void>;
  fetchDocumentationById: (id: string) => Promise<Documentation | null>;
  fetchDocumentationBySlug: (slug: string) => Promise<Documentation | null>;
  createDocumentation: (data: DocumentationData) => Promise<Documentation | null>;
  updateDocumentation: (id: string, data: Partial<DocumentationData>) => Promise<Documentation | null>;
  deleteDocumentation: (id: string) => Promise<boolean>;
  
  // Version management
  createVersion: (documentationId: string, data: Partial<DocumentationData>) => Promise<DocumentationVersion | null>;
  fetchVersions: (documentationId: string) => Promise<DocumentationVersion[]>;
  
  // UI actions
  setSelectedDocumentation: (documentation: Documentation | null) => void;
  setEditing: (editing: boolean) => void;
  setPreview: (preview: boolean) => void;
  setFilters: (filters: Partial<DocumentationFilters>) => void;
  clearFilters: () => void;
  
  // State management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

// ============================================================================
// DOCUMENTATION STORE
// ============================================================================

export const useDocumentationStore = create<DocumentationState>()( 
  devtools(
    persist(
      immer((set, get: () => DocumentationState) => ({
        // Initial state
        documentation: [],
        currentDocumentation: null,
        isLoading: false,
        isCreating: false,
        isUpdating: false,
        isDeleting: false,
        error: null,
        
        filters: {},
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          hasMore: false,
        },
        
        selectedDocumentation: null,
        isEditing: false,
        isPreview: false,
    
    // Actions
    fetchDocumentation: async (options = {}) => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });
      
      try {
        const { filters = {}, pagination = {} } = options;
        const currentFilters = { ...get().filters, ...filters };
        const currentPagination = { ...get().pagination, ...pagination };
        
        // Build query parameters
        const params = new URLSearchParams();
        
        if (currentFilters.category) params.append('category', currentFilters.category);
        if (currentFilters.tags?.length) params.append('tags', currentFilters.tags.join(','));
        if (currentFilters.isPublic !== undefined) params.append('isPublic', currentFilters.isPublic.toString());
        if (currentFilters.authorId) params.append('authorId', currentFilters.authorId);
        if (currentFilters.search) params.append('search', currentFilters.search);
        
        params.append('limit', currentPagination.limit.toString());
        params.append('offset', ((currentPagination.page - 1) * currentPagination.limit).toString());
        
        const response = await fetch(`/api/documentation?${params.toString()}`, {
          credentials: 'include' // Include cookies for authentication
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch documentation: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        set((state) => {
          state.documentation = data.documentation || [];
          state.pagination = {
            ...currentPagination,
            total: data.pagination?.total || 0,
            hasMore: data.pagination?.hasMore || false,
          };
          state.filters = currentFilters;
          state.isLoading = false;
        });
        
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to fetch documentation';
          state.isLoading = false;
        });
      }
    },
    
    fetchDocumentationById: async (id: string) => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });
      
      try {
        const response = await fetch(`/api/documentation/${id}`, {
          credentials: 'include' // Include cookies for authentication
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch documentation: ${response.statusText}`);
        }
        
        const data = await response.json();
        const documentation = data.documentation;
        
        set((state) => {
          state.currentDocumentation = documentation;
          state.isLoading = false;
          
          // Update in list if exists
          const index = state.documentation.findIndex(doc => doc.id === id);
          if (index !== -1) {
            state.documentation[index] = documentation;
          }
        });
        
        return documentation;
        
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to fetch documentation';
          state.isLoading = false;
        });
        return null;
      }
    },
    
    fetchDocumentationBySlug: async (slug: string) => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });
      
      try {
        // First, try to find by slug in the current list
        const existingDoc = get().documentation.find(doc => doc.slug === slug);
        if (existingDoc) {
          set((state) => {
            state.currentDocumentation = existingDoc;
            state.isLoading = false;
          });
          return existingDoc;
        }
        
        // If not found, fetch from API
        const response = await fetch('/api/documentation', {
          credentials: 'include' // Include cookies for authentication
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch documentation list: ${response.statusText}`);
        }
        
        const data = await response.json();
        const doc = data.documentation?.find((d: Documentation) => d.slug === slug);
        
        if (!doc) {
          throw new Error('Documentation not found');
        }
        
        // Fetch full documentation details
        const fullResponse = await fetch(`/api/documentation/${doc.id}`, {
          credentials: 'include' // Include cookies for authentication
        });
        
        if (!fullResponse.ok) {
          throw new Error(`Failed to fetch documentation: ${fullResponse.statusText}`);
        }
        
        const fullData = await fullResponse.json();
        const documentation = fullData.documentation;
        
        set((state) => {
          state.currentDocumentation = documentation;
          state.isLoading = false;
        });
        
        return documentation;
        
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to fetch documentation';
          state.isLoading = false;
        });
        return null;
      }
    },
    
    createDocumentation: async (data: DocumentationData) => {
      set((state) => {
        state.isCreating = true;
        state.error = null;
      });
      
      try {
        const response = await fetch('/api/documentation/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Include cookies for authentication
          body: JSON.stringify(data),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create documentation');
        }
        
        const result = await response.json();
        const documentation = result.documentation;
        
        set((state) => {
          state.documentation.unshift(documentation);
          state.currentDocumentation = documentation;
          state.isCreating = false;
        });
        
        return documentation;
        
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to create documentation';
          state.isCreating = false;
        });
        return null;
      }
    },
    
    updateDocumentation: async (id: string, data: Partial<DocumentationData>) => {
      set((state) => {
        state.isUpdating = true;
        state.error = null;
      });
      
      try {
        const response = await fetch('/api/documentation/upload', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Include cookies for authentication
          body: JSON.stringify({
            id,
            ...data
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update documentation');
        }
        
        const result = await response.json();
        const documentation = result.documentation;
        
        set((state) => {
          const index = state.documentation.findIndex(doc => doc.id === id);
          if (index !== -1) {
            state.documentation[index] = documentation;
          }
          if (state.currentDocumentation?.id === id) {
            state.currentDocumentation = documentation;
          }
          state.isUpdating = false;
        });
        
        return documentation;
        
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to update documentation';
          state.isUpdating = false;
        });
        return null;
      }
    },
    
    deleteDocumentation: async (id: string) => {
      set((state) => {
        state.isDeleting = true;
        state.error = null;
      });
      
      try {
        const response = await fetch(`/api/documentation/${id}`, {
          method: 'DELETE',
          credentials: 'include' // Include cookies for authentication
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete documentation');
        }
        
        set((state) => {
          state.documentation = state.documentation.filter(doc => doc.id !== id);
          if (state.currentDocumentation?.id === id) {
            state.currentDocumentation = null;
          }
          if (state.selectedDocumentation?.id === id) {
            state.selectedDocumentation = null;
          }
          state.isDeleting = false;
        });
        
        return true;
        
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to delete documentation';
          state.isDeleting = false;
        });
        return false;
      }
    },
    
    createVersion: async (documentationId: string, data: Partial<DocumentationData>) => {
      try {
        const response = await fetch('/api/documentation/upload', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Include cookies for authentication
          body: JSON.stringify({
            id: documentationId,
            ...data
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create version');
        }
        
        const result = await response.json();
        const documentation = result.documentation;
        
        set((state) => {
          const index = state.documentation.findIndex(doc => doc.id === documentationId);
          if (index !== -1) {
            state.documentation[index] = documentation;
          }
          if (state.currentDocumentation?.id === documentationId) {
            state.currentDocumentation = documentation;
          }
        });
        
        return documentation.versions?.[0] || null;
        
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to create version';
        });
        return null;
      }
    },
    
    fetchVersions: async (documentationId: string) => {
      try {
        const response = await fetch(`/api/documentation/${documentationId}`, {
          credentials: 'include' // Include cookies for authentication
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch versions: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.documentation?.versions || [];
        
      } catch (error) {
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to fetch versions';
        });
        return [];
      }
    },
    
    // UI actions
    setSelectedDocumentation: (documentation: Documentation | null) => {
      set((state) => {
        state.selectedDocumentation = documentation;
      });
    },
    
    setEditing: (editing: boolean) => {
      set((state) => {
        state.isEditing = editing;
      });
    },
    
    setPreview: (preview: boolean) => {
      set((state) => {
        state.isPreview = preview;
      });
    },
    
    setFilters: (filters: Partial<DocumentationFilters>) => {
      set((state) => {
        state.filters = { ...state.filters, ...filters };
      });
    },
    
    clearFilters: () => {
      set((state) => {
        state.filters = {};
      });
    },
    
    // State management
    setLoading: (loading: boolean) => {
      set((state) => {
        state.isLoading = loading;
      });
    },
    
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
    
    reset: () => {
      set((state) => {
        state.documentation = [];
        state.currentDocumentation = null;
        state.selectedDocumentation = null;
        state.isLoading = false;
        state.isCreating = false;
        state.isUpdating = false;
        state.isDeleting = false;
        state.error = null;
        state.isEditing = false;
        state.isPreview = false;
        state.filters = {};
        state.pagination = {
          page: 1,
          limit: 10,
          total: 0,
          hasMore: false,
        };
      });
    },
      })),
      {
        name: 'documentation-store',
        partialize: (state) => ({
          filters: state.filters,
          pagination: state.pagination,
        }),
      }
    ),
    {
      name: 'documentation-store-devtools',
    } 
  )
) as any;

// ============================================================================
// SELECTORS
// ============================================================================

export const useDocumentation = () => useDocumentationStore((state) => state.documentation);
export const useCurrentDocumentation = () => useDocumentationStore((state) => state.currentDocumentation);
export const useDocumentationLoading = () => useDocumentationStore((state) => state.isLoading);
export const useDocumentationError = () => useDocumentationStore((state) => state.error);
export const useDocumentationFilters = () => useDocumentationStore((state) => state.filters);
export const useDocumentationPagination = () => useDocumentationStore((state) => state.pagination);

// ============================================================================
// ACTIONS
// ============================================================================

export const useDocumentationActions = () => {
  const fetchDocumentation = useDocumentationStore((state) => state.fetchDocumentation);
  const fetchDocumentationById = useDocumentationStore((state) => state.fetchDocumentationById);
  const fetchDocumentationBySlug = useDocumentationStore((state) => state.fetchDocumentationBySlug);
  const createDocumentation = useDocumentationStore((state) => state.createDocumentation);
  const updateDocumentation = useDocumentationStore((state) => state.updateDocumentation);
  const deleteDocumentation = useDocumentationStore((state) => state.deleteDocumentation);
  const createVersion = useDocumentationStore((state) => state.createVersion);
  const fetchVersions = useDocumentationStore((state) => state.fetchVersions);
  const setSelectedDocumentation = useDocumentationStore((state) => state.setSelectedDocumentation);
  const setEditing = useDocumentationStore((state) => state.setEditing);
  const setPreview = useDocumentationStore((state) => state.setPreview);
  const setFilters = useDocumentationStore((state) => state.setFilters);
  const clearFilters = useDocumentationStore((state) => state.clearFilters);
  const setLoading = useDocumentationStore((state) => state.setLoading);
  const setError = useDocumentationStore((state) => state.setError);
  const clearError = useDocumentationStore((state) => state.clearError);
  const reset = useDocumentationStore((state) => state.reset);

  return {
    fetchDocumentation,
    fetchDocumentationById,
    fetchDocumentationBySlug,
    createDocumentation,
    updateDocumentation,
    deleteDocumentation,
    createVersion,
    fetchVersions,
    setSelectedDocumentation,
    setEditing,
    setPreview,
    setFilters,
    clearFilters,
    setLoading,
    setError,
    clearError,
    reset,
  };
};

// ============================================================================
// COMPUTED SELECTORS
// ============================================================================

export const useFilteredDocumentation = () => {
  const documentation = useDocumentationStore((state) => state.documentation);
  const filters = useDocumentationStore((state) => state.filters);
  
  return useMemo(() => {
    return documentation.filter((doc) => {
      if (filters.category && doc.category !== filters.category) return false;
      if (filters.tags?.length && !filters.tags.some(tag => doc.tags.includes(tag))) return false;
      if (filters.isPublic !== undefined && doc.isPublic !== filters.isPublic) return false;
      if (filters.authorId && doc.authorId !== filters.authorId) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          doc.title.toLowerCase().includes(searchLower) ||
          doc.description?.toLowerCase().includes(searchLower) ||
          doc.content.toLowerCase().includes(searchLower) ||
          doc.tags.some(tag => tag.toLowerCase().includes(searchLower))
        );
      }
      return true;
    });
  }, [documentation, filters]);
};

export const useDocumentationStats = () => {
  const documentation = useDocumentationStore((state) => state.documentation);
  
  return useMemo(() => {
    return {
      total: documentation.length,
      public: documentation.filter(doc => doc.isPublic).length,
      private: documentation.filter(doc => !doc.isPublic).length,
      categories: [...new Set(documentation.map(doc => doc.category).filter(Boolean))],
      tags: [...new Set(documentation.flatMap(doc => doc.tags))],
    };
  }, [documentation]);
};
