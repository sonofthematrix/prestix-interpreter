// Auto-generated route template based on current patterns
// Last synced: 2026-03-01T09:29:34.594Z
// ✅ Updated: Proper getCurrentUser(request) usage and robust error handling

import type { {{modelName}}Filter, {{modelName}}SortOrder } from '@/generated/types/{{lowerModelName}}-types';
import { OrderBy, SortOrder } from '@zenstackhq/orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { AuthUser } from '@/lib/auth';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/db';
import { AuditActivityLogger } from '@/lib/services/audit-activity-logger';


const schema = z.object({
  // Add validation schema
});


export async function GET(request: NextRequest) {
  try {
    // Validate request URL
    let searchParams: URLSearchParams;
    try {
      searchParams = new URL(request.url).searchParams;
    } catch (urlError) {
      console.error('Invalid request URL:', urlError);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request URL',
          message: 'Unable to parse request URL',
        },
        { status: 400 },
      );
    }

    // Get authenticated user with request parameter
    let user;
    try {
      user = await getCurrentUser(request);
    } catch (authError) {
      console.error('Authentication error:', authError);
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication failed',
          message: 'Unable to authenticate user',
        },
        { status: 401 },
      );
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Create database client with user context
    let db;
    try {
      db = createClient(user as unknown as AuthUser);
    } catch (dbError) {
      console.error('Database client creation error:', dbError);
      return NextResponse.json(
        {
          success: false,
          error: 'Database connection failed',
          message: dbError instanceof Error ? dbError.message : 'Failed to create database client',
        },
        { status: 500 },
      );
    }

    // Parse query parameters with validation
    const pageParam = searchParams.get('page') || '1';
    const pageSizeParam = searchParams.get('pageSize') || '20';
    const page = Math.max(1, parseInt(pageParam) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(pageSizeParam) || 20)); // Clamp between 1-100

    let filter: {{modelName}}Filter | undefined;
    let sortOrder: {{modelName}}SortOrder | undefined;

    try {
      const filterParam = searchParams.get('filter');
      if (filterParam) {
        filter = JSON.parse(filterParam) as {{modelName}}Filter;
      }
      const sortOrderParam = searchParams.get('sortOrder');
      if (sortOrderParam) {
        sortOrder = JSON.parse(sortOrderParam) as {{modelName}}SortOrder;
      }
    } catch (parseError) {
      console.error('Error parsing query parameters:', parseError);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          message: 'Failed to parse filter or sortOrder parameters',
        },
        { status: 400 },
      );
    }

    // Execute database query
    let data;
    let total;
    try {
      [data, total] = await Promise.all([
        db.{{lowerModelName}}.findMany({
      where: filter as any,
      orderBy: (sortOrder || { createdAt: 'desc' }) as unknown as SortOrder & { [x: string]: SortOrder; [x: number]: SortOrder; } & { [x: string]: OrderBy<any, any, true, false>; [x: number]: OrderBy<any, any, true, false>; },
      skip: (page - 1) * pageSize as unknown as number,
      take: pageSize as unknown as number
        }),
        db.{{lowerModelName}}.count({ where: filter as any }) as unknown as number
      ]);
    } catch (queryError) {
      console.error('Database query error:', queryError);
      return NextResponse.json(
        {
          success: false,
          error: 'Database query failed',
          message: queryError instanceof Error ? queryError.message : 'Failed to fetch data from database',
        },
        { status: 500 },
      );
    }
    
    return NextResponse.json({
      success: true,
      data,
      pagination: {
        total,
        page,
        pageSize,
        hasMore: (page - 1) * pageSize + data.length < total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    // Catch-all for unexpected errors
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: errorMessage,
        ...(process.env.NODE_ENV === 'development' && errorStack ? { stack: errorStack } : {}),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user with request parameter
    let user;
    try {
      user = await getCurrentUser(request);
    } catch (authError) {
      console.error('Authentication error:', authError);
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication failed',
          message: 'Unable to authenticate user',
        },
        { status: 401 },
      );
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Create database client with user context
    let db;
    try {
      db = createClient(user as unknown as AuthUser);
    } catch (dbError) {
      console.error('Database client creation error:', dbError);
      return NextResponse.json(
        {
          success: false,
          error: 'Database connection failed',
          message: dbError instanceof Error ? dbError.message : 'Failed to create database client',
        },
        { status: 500 },
      );
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error('Invalid JSON in request body:', jsonError);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          message: 'Request body must be valid JSON',
        },
        { status: 400 },
      );
    }
    
    // Clean up date fields - convert empty strings to undefined
    const cleanedData = { ...body };
    if (cleanedData.createdAt === '' || cleanedData.createdAt === null) {
      delete cleanedData.createdAt;
    }
    if (cleanedData.updatedAt === '' || cleanedData.updatedAt === null) {
      delete cleanedData.updatedAt;
    }
    
    // Get session metadata for audit logging
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;
    
    // No token validation required for this model
    
    // Create entity
    let {{lowerModelName}}Created;
    try {
      {{lowerModelName}}Created = await db.{{lowerModelName}}.create({
      data: cleanedData
    });
    } catch (createError) {
      console.error('Database create error:', createError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create {{modelName}}',
          message: createError instanceof Error ? createError.message : 'Database create operation failed',
        },
        { status: 500 },
      );
    }
    
    // Log creation with audit and activity tracking
    try {
    await AuditActivityLogger.logCreate(
      '{{modelName}}',
      {{lowerModelName}}Created.id,
      user.id,
      {{lowerModelName}}Created,
      { ipAddress, userAgent, source: 'api' }
    );
    } catch (auditError) {
      // Log audit error but don't fail the creation
      console.error('Audit logging error:', auditError);
    }
    
    return NextResponse.json({{lowerModelName}}Created, { status: 201 });
  } catch (error) {
    // Catch-all for unexpected errors
    console.error('Unexpected error creating {{modelName}}:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create {{modelName}}';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: errorMessage,
        ...(process.env.NODE_ENV === 'development' && errorStack ? { stack: errorStack } : {}),
      },
      { status: 500 }
    );
  }
}
