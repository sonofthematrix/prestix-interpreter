/**
 * API Error Handler Utility
 * Provides standardized error handling and empty state management for API routes
 */

import { NextResponse } from 'next/server';

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  details?: any;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export class APIErrorHandler {
  /**
   * Handle API errors and return appropriate responses
   */
  static handleError(error: unknown): NextResponse<APIResponse<never>> {
    console.error('API Error:', error);

    // Handle custom API errors
    if (error instanceof APIError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: error.statusCode }
      );
    }

    // Handle ZenStack/Zod validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          code: 'VALIDATION_ERROR',
          details: (error as any).issues,
        },
        { status: 400 }
      );
    }

    // Handle generic errors
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }

  /**
   * Return success response with data
   */
  static success<T>(data: T, statusCode: number = 200): NextResponse<APIResponse<T>> {
    return NextResponse.json(
      {
        success: true,
        data,
      },
      { status: statusCode }
    );
  }

  /**
   * Return paginated success response
   */
  static successPaginated<T>(
    data: T[],
    page: number,
    pageSize: number,
    total: number
  ): NextResponse<APIResponse<T[]>> {
    return NextResponse.json(
      {
        success: true,
        data,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
      { status: 200 }
    );
  }

  /**
   * Return empty data response (not an error, just no data)
   */
  static empty<T extends any[]>(): NextResponse<APIResponse<T>> {
    return NextResponse.json(
      {
        success: true,
        data: [] as T,
        pagination: {
          page: 1,
          pageSize: 0,
          total: 0,
          totalPages: 0,
        },
      },
      { status: 200 }
    );
  }

  /**
   * Validate required fields
   */
  static validateRequired(fields: Record<string, any>, requiredFields: string[]): void {
    const missing = requiredFields.filter(field => !fields[field]);
    if (missing.length > 0) {
      throw new APIError(
        `Missing required fields: ${missing.join(', ')}`,
        400,
        'MISSING_FIELDS',
        { missing }
      );
    }
  }

  /**
   * Validate user authorization
   */
  static validateAuthorization(
    currentUserId: string | undefined,
    targetUserId: string,
    userRole?: string
  ): void {
    if (!currentUserId) {
      throw new APIError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const isAdmin = userRole === 'ADMIN';
    const isOwner = currentUserId === targetUserId;

    if (!isAdmin && !isOwner) {
      throw new APIError('Forbidden', 403, 'FORBIDDEN');
    }
  }
}

/**
 * Safe database query wrapper with error handling
 */
export async function safeQuery<T>(
  queryFn: () => Promise<T>,
  fallbackValue: T
): Promise<T> {
  try {
    const result = await queryFn();
    return result ?? fallbackValue;
  } catch (error) {
    console.error('Query error:', error);
    return fallbackValue;
  }
}

/**
 * Paginated query helper
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function getPaginationParams(searchParams: URLSearchParams): PaginationParams {
  return {
    page: Math.max(1, parseInt(searchParams.get('page') || '1', 10)),
    pageSize: Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10))),
    sortBy: searchParams.get('sortBy') || 'createdAt',
    sortOrder: (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc',
  };
}

/**
 * Calculate pagination offsets
 */
export function getPaginationOffsets(page: number, pageSize: number) {
  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

/**
 * Empty data checker
 */
export function isEmpty(data: any): boolean {
  if (data === null || data === undefined) return true;
  if (Array.isArray(data)) return data.length === 0;
  if (typeof data === 'object') return Object.keys(data).length === 0;
  return false;
}

