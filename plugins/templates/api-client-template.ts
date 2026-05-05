// Auto-generated API client template based on current patterns
// Last synced: 2026-03-01T09:29:34.596Z
// This template can be used to generate/regenerate API client classes

// @ts-nocheck - Template file: imports resolve when used in component location

// Generated API Client for {{modelName}}

import type { {{modelName}}, Create{{modelName}}Input, Update{{modelName}}Input, {{modelName}}Filter, {{modelName}}SortOrder, {{modelName}}WithRelations } from '../types/{{lowerModelName}}-types';

class {{modelName}}Api {
  private baseUrl = '/api/{{lowerModelName}}';

  /**
   * Fetch {{modelName}} by ID
   */
  async getById(id: string): Promise<{{modelName}} | null> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch {{modelName}}: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Fetch all {{modelName}} with optional filtering and sorting
   */
  async getAll(filter?: {{modelName}}Filter, sortOrder?: {{modelName}}SortOrder): Promise<{{modelName}}[]> {
    const params = new URLSearchParams();
    if (filter) params.append('filter', JSON.stringify(filter));
    if (sortOrder) params.append('sortOrder', JSON.stringify(sortOrder));
    
    const response = await fetch(`${this.baseUrl}?${params}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch {{modelName}} list: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Fetch {{modelName}} with relations
   */
  async getWithRelations(id: string): Promise<{{modelName}}WithRelations | null> {
    const response = await fetch(`${this.baseUrl}/${id}?include=relations`, {
      credentials: 'include',
    });
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch {{modelName}} with relations: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Create a new {{modelName}}
   */
  async create(data: Create{{modelName}}Input): Promise<{{modelName}}> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to create {{modelName}}`);
    }
    return response.json();
  }

  /**
   * Update an existing {{modelName}}
   */
  async update(id: string, data: Partial<Update{{modelName}}Input>): Promise<{{modelName}}> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to update {{modelName}}`);
    }
    return response.json();
  }

  /**
   * Delete a {{modelName}}
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to delete {{modelName}}`);
    }
  }

  /**
   * Get paginated {{modelName}} list
   */
  async getPaginated(
    page: number,
    pageSize: number,
    filter?: {{modelName}}Filter,
    sortOrder?: {{modelName}}SortOrder
  ): Promise<{ data: {{modelName}}[]; total: number; page: number; pageSize: number }> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());
    if (filter) params.append('filter', JSON.stringify(filter));
    if (sortOrder) params.append('sortOrder', JSON.stringify(sortOrder));
    
    const response = await fetch(`${this.baseUrl}?${params}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch paginated {{modelName}} list: ${response.statusText}`);
    }
    return response.json();
  }
}

export const {{lowerModelName}}Api = new {{modelName}}Api();
