import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { getModelFieldTypes, getZodSchemaForField, getFieldTypeFromName } from './utils/schema-type-mapper';
import { CompleteEntityGenerator } from './complete-entity-generator';

/**
 * Enhanced Production Auto Generator
 * Generates production-ready API endpoints and components with all advanced features
 */

export interface EntityConfig {
  name: string;
  fields: string[];
  relations: string[];
  operations: string[];
  ui: {
    form: boolean;
    table: boolean;
    card: boolean;
    modal: boolean;
  };
  validation: {
    required: string[];
    optional: string[];
    enums?: Record<string, string[]>;
  };
  searchFields: string[];
  filterFields: string[];
}

export class EnhancedProductionGenerator {
  private outputDir: string;
  private entities: EntityConfig[];

  constructor(outputDir: string = './src/generated') {
    this.outputDir = outputDir;
    this.entities = this.getEntityConfigs();
  }

  private getEntityConfigs(): EntityConfig[] {
    return [
      // USER MANAGEMENT
      {
        name: 'User',
        fields: ['email', 'name', 'bio', 'status', 'role', 'isPremium', 'loyaltyPoints', 'createdAt', 'updatedAt'],
        relations: ['preferences', 'addresses', 'orders', 'reviews', 'blogPosts', 'cart'],
        operations: ['create', 'read', 'update', 'delete', 'list'],
        ui: { form: true, table: true, card: true, modal: true },
        validation: {
          required: ['email'],
          optional: ['name', 'bio'],
          enums: {
            role: ['ADMIN', 'CUSTOMER', 'VENDOR', 'MODERATOR'],
            status: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']
          }
        },
        searchFields: ['name', 'email', 'role', 'status'],
        filterFields: ['role', 'status', 'isPremium']
      },
      {
        name: 'UserPreferences',
        fields: ['userId', 'themeMode', 'language', 'currency', 'emailNotifications', 'pushNotifications'],
        relations: ['user', 'customThemes'],
        operations: ['create', 'read', 'update'],
        ui: { form: true, table: false, card: true, modal: false },
        validation: {
          required: ['userId'],
          optional: ['themeMode', 'language', 'currency'],
          enums: {
            themeMode: ['LIGHT', 'DARK', 'SYSTEM', 'CUSTOM']
          }
        },
        searchFields: [],
        filterFields: ['themeMode']
      },
      {
        name: 'Address',
        fields: ['userId', 'type', 'firstName', 'lastName', 'address1', 'city', 'postalCode', 'country', 'isDefault'],
        relations: ['user'],
        operations: ['create', 'read', 'update', 'delete', 'list'],
        ui: { form: true, table: true, card: true, modal: true },
        validation: {
          required: ['userId', 'firstName', 'lastName', 'address1', 'city', 'postalCode', 'country'],
          optional: ['address2', 'company', 'phone']
        },
        searchFields: ['city', 'country'],
        filterFields: ['type', 'isDefault']
      },
      {
        name: 'AddressBook',
        fields: ['userId', 'name', 'firstName', 'lastName', 'address1', 'city', 'postalCode', 'country', 'isDefault'],
        relations: ['user'],
        operations: ['create', 'read', 'update', 'delete', 'list'],
        ui: { form: true, table: true, card: true, modal: true },
        validation: {
          required: ['userId', 'name', 'firstName', 'lastName', 'address1', 'city', 'postalCode', 'country'],
          optional: ['address2', 'company', 'phone']
        },
        searchFields: ['name', 'city'],
        filterFields: ['isDefault', 'isBilling', 'isShipping']
      },

      // MARKETPLACE
      {
        name: 'Category',
        fields: ['name', 'slug', 'description', 'image', 'parentId', 'isActive'],
        relations: ['parent', 'children', 'products'],
        operations: ['create', 'read', 'update', 'delete', 'list'],
        ui: { form: true, table: true, card: true, modal: true },
        validation: {
          required: ['name', 'slug'],
          optional: ['description', 'image', 'parentId']
        },
        searchFields: ['name', 'description'],
        filterFields: ['isActive', 'parentId']
      },
      {
        name: 'Product',
        fields: ['name', 'description', 'price', 'sku', 'inventory', 'status', 'featuredImage', 'featured'],
        relations: ['category', 'vendor', 'variants', 'reviews', 'orderItems', 'wishlistItems', 'cartItems'],
        operations: ['create', 'read', 'update', 'delete', 'list'],
        ui: { form: true, table: true, card: true, modal: true },
        validation: {
          required: ['name', 'price', 'sku', 'categoryId', 'vendorId'],
          optional: ['description', 'inventory', 'featuredImage'],
          enums: {
            status: ['DRAFT', 'ACTIVE', 'INACTIVE', 'SOLD_OUT', 'DISCONTINUED']
          }
        },
        searchFields: ['name', 'description', 'sku'],
        filterFields: ['status', 'categoryId', 'vendorId', 'featured']
      },
      {
        name: 'ProductVariant',
        fields: ['productId', 'name', 'sku', 'price', 'inventory', 'attributes'],
        relations: ['product', 'orderItems', 'cartItems'],
        operations: ['create', 'read', 'update', 'delete', 'list'],
        ui: { form: true, table: true, card: true, modal: true },
        validation: {
          required: ['productId', 'name', 'sku'],
          optional: ['price', 'inventory', 'image']
        },
        searchFields: ['name', 'sku'],
        filterFields: ['productId']
      },

      // VENDOR
      {
        name: 'VendorProfile',
        fields: ['userId', 'businessName', 'businessType', 'description', 'logo', 'isVerified', 'rating'],
        relations: ['user', 'products', 'orders', 'reviews'],
        operations: ['create', 'read', 'update', 'delete', 'list'],
        ui: { form: true, table: true, card: true, modal: true },
        validation: {
          required: ['userId', 'businessName', 'businessType'],
          optional: ['description', 'logo', 'website', 'phone']
        },
        searchFields: ['businessName', 'description'],
        filterFields: ['isVerified', 'businessType']
      },

      // ORDERS & PAYMENTS
      {
        name: 'Order',
        fields: ['orderNumber', 'userId', 'vendorId', 'subtotal', 'totalAmount', 'status', 'paymentStatus'],
        relations: ['user', 'vendor', 'items', 'payment', 'notifications'],
        operations: ['create', 'read', 'update', 'delete', 'list'],
        ui: { form: false, table: true, card: true, modal: false },
        validation: {
          required: ['orderNumber', 'userId', 'subtotal', 'totalAmount'],
          optional: ['vendorId', 'trackingNumber'],
          enums: {
            status: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'],
            paymentStatus: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED']
          }
        },
        searchFields: ['orderNumber'],
        filterFields: ['status', 'paymentStatus', 'userId', 'vendorId']
      },
      {
        name: 'OrderItem',
        fields: ['orderId', 'productId', 'variantId', 'quantity', 'price', 'totalPrice'],
        relations: ['order', 'product', 'variant'],
        operations: ['create', 'read', 'update', 'delete', 'list'],
        ui: { form: true, table: true, card: true, modal: false },
        validation: {
          required: ['orderId', 'productId', 'quantity', 'price'],
          optional: ['variantId']
        },
        searchFields: [],
        filterFields: ['orderId', 'productId']
      },
      {
        name: 'Payment',
        fields: ['orderId', 'amount', 'currency', 'method', 'status', 'provider'],
        relations: ['order'],
        operations: ['create', 'read', 'update', 'list'],
        ui: { form: false, table: true, card: true, modal: false },
        validation: {
          required: ['orderId', 'amount', 'method'],
          optional: ['provider', 'providerPaymentId'],
          enums: {
            method: ['CREDIT_CARD', 'DEBIT_CARD', 'PAYPAL', 'STRIPE', 'BANK_TRANSFER', 'CASH_ON_DELIVERY', 'CRYPTO'],
            status: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED']
          }
        },
        searchFields: ['providerPaymentId'],
        filterFields: ['status', 'method', 'orderId']
      },

      // SHOPPING
      {
        name: 'Cart',
        fields: ['userId', 'sessionId', 'isActive'],
        relations: ['user', 'items'],
        operations: ['create', 'read', 'update', 'delete', 'list'],
        ui: { form: false, table: true, card: true, modal: false },
        validation: {
          required: [],
          optional: ['userId', 'sessionId']
        },
        searchFields: [],
        filterFields: ['userId', 'isActive']
      },
      {
        name: 'CartItem',
        fields: ['cartId', 'productId', 'variantId', 'quantity', 'customizations'],
        relations: ['cart', 'product', 'variant'],
        operations: ['create', 'read', 'update', 'delete', 'list'],
        ui: { form: true, table: true, card: true, modal: false },
        validation: {
          required: ['cartId', 'productId', 'quantity'],
          optional: ['variantId', 'customizations']
        },
        searchFields: [],
        filterFields: ['cartId', 'productId']
      },
      {
        name: 'WishlistItem',
        fields: ['userId', 'productId', 'variantId', 'notes'],
        relations: ['user', 'product'],
        operations: ['create', 'read', 'delete', 'list'],
        ui: { form: true, table: true, card: true, modal: false },
        validation: {
          required: ['userId', 'productId'],
          optional: ['variantId', 'notes']
        },
        searchFields: [],
        filterFields: ['userId', 'productId']
      },

      // REVIEWS
      {
        name: 'Review',
        fields: ['userId', 'productId', 'vendorId', 'rating', 'title', 'content', 'isVerified', 'isApproved'],
        relations: ['user', 'product', 'vendor'],
        operations: ['create', 'read', 'update', 'delete', 'list'],
        ui: { form: true, table: true, card: true, modal: true },
        validation: {
          required: ['userId', 'productId', 'rating', 'content'],
          optional: ['title', 'vendorId', 'images']
        },
        searchFields: ['title', 'content'],
        filterFields: ['rating', 'isVerified', 'isApproved', 'productId']
      },

      // BLOG
      {
        name: 'BlogPost',
        fields: ['authorId', 'title', 'slug', 'content', 'excerpt', 'featuredImage', 'images', 'tags', 'category', 'metaTitle', 'metaDescription', 'status', 'publishedAt'],
        relations: ['author', 'comments'],
        operations: ['create', 'read', 'update', 'delete', 'list'],
        ui: { form: true, table: true, card: true, modal: true },
        validation: {
          required: ['authorId', 'title', 'slug', 'content'],
          optional: ['excerpt', 'featuredImage', 'images', 'tags', 'category', 'metaTitle', 'metaDescription', 'publishedAt'],
          enums: {
            status: ['DRAFT', 'PUBLISHED', 'ARCHIVED', 'SCHEDULED']
          }
        },
        searchFields: ['title', 'content', 'excerpt', 'tags'],
        filterFields: ['status', 'category', 'authorId']
      },
      {
        name: 'Comment',
        fields: ['postId', 'userId', 'parentId', 'content', 'isApproved'],
        relations: ['post', 'user', 'parent', 'replies'],
        operations: ['create', 'read', 'update', 'delete', 'list'],
        ui: { form: true, table: true, card: true, modal: false },
        validation: {
          required: ['userId', 'content'],
          optional: ['postId', 'parentId']
        },
        searchFields: ['content'],
        filterFields: ['isApproved', 'postId', 'userId']
      },

      // AI SYSTEM
      {
        name: 'ChatSession',
        fields: ['userId', 'title', 'aiProfile', 'isActive'],
        relations: ['user', 'messages', 'interactions'],
        operations: ['create', 'read', 'update', 'delete', 'list'],
        ui: { form: true, table: true, card: true, modal: false },
        validation: {
          required: ['userId'],
          optional: ['title', 'aiProfile'],
          enums: {
            aiProfile: ['ARCHITECT', 'DEVELOPER', 'TESTER', 'DEVOPS', 'WRITER']
          }
        },
        searchFields: ['title'],
        filterFields: ['userId', 'aiProfile', 'isActive']
      },
      {
        name: 'ChatMessage',
        fields: ['sessionId', 'role', 'content', 'metadata'],
        relations: ['session'],
        operations: ['create', 'read', 'list'],
        ui: { form: false, table: true, card: true, modal: false },
        validation: {
          required: ['sessionId', 'role', 'content'],
          optional: ['metadata']
        },
        searchFields: ['content'],
        filterFields: ['sessionId', 'role']
      },
      {
        name: 'AIInteraction',
        fields: ['userId', 'sessionId', 'type', 'input', 'output', 'tokensUsed', 'cost'],
        relations: ['user', 'session'],
        operations: ['create', 'read', 'list'],
        ui: { form: false, table: true, card: true, modal: false },
        validation: {
          required: ['userId', 'type', 'input'],
          optional: ['sessionId', 'output', 'tokensUsed', 'cost']
        },
        searchFields: ['input', 'output'],
        filterFields: ['userId', 'type', 'sessionId']
      },

      // NOTIFICATIONS (Enhanced with click navigation and detailed view)
      {
        name: 'Notification',
        fields: [
          'userId', 'recipientId', 'senderId', 'type', 'title', 'message',
          'status', 'priority', 'link', 'linkText', 'metadata', 'isBroadcast',
          'targetRoles', 'readAt', 'sentAt', 'expiresAt'
        ],
        relations: ['user', 'recipient', 'sender', 'order', 'product', 'review'],
        operations: ['create', 'read', 'update', 'delete', 'list', 'bulkUpdate', 'bulkArchive'],
        ui: {
          form: true,
          table: true,
          card: true,
          modal: true,
        },
        validation: {
          required: ['type', 'title', 'message'],
          optional: ['userId', 'recipientId', 'senderId', 'link', 'linkText', 'metadata', 'targetRoles'],
          enums: {
            type: ['ANNOUNCEMENT', 'SYSTEM', 'ORDER_UPDATE', 'SECURITY', 'PROMOTION', 'REVIEW_REQUEST'],
            status: ['UNREAD', 'READ', 'ARCHIVED'],
            priority: ['LOW', 'NORMAL', 'HIGH', 'URGENT']
          }
        },
        searchFields: ['title', 'message'],
        filterFields: ['userId', 'recipientId', 'type', 'status', 'priority', 'isBroadcast'],
      },

      // SYSTEM
      {
        name: 'SystemConfig',
        fields: ['key', 'value', 'type', 'description', 'isPublic'],
        relations: [],
        operations: ['create', 'read', 'update', 'delete', 'list'],
        ui: { form: true, table: true, card: false, modal: true },
        validation: {
          required: ['key', 'value'],
          optional: ['description', 'type']
        },
        searchFields: ['key', 'description'],
        filterFields: ['type', 'isPublic']
      },
      {
        name: 'AuditLog',
        fields: ['action', 'entityType', 'entityId', 'userId', 'ipAddress', 'success'],
        relations: ['user'],
        operations: ['create', 'read', 'list'],
        ui: { form: false, table: true, card: false, modal: false },
        validation: {
          required: ['action', 'entityType', 'entityId'],
          optional: ['userId', 'ipAddress', 'metadata']
        },
        searchFields: ['action', 'entityType'],
        filterFields: ['action', 'entityType', 'userId', 'success']
      },

      // THEME SYSTEM
      {
        name: 'CustomTheme',
        fields: ['userId', 'name', 'description', 'lightMode', 'darkMode', 'isActive', 'isPublic'],
        relations: ['user', 'merchantThemes'],
        operations: ['create', 'read', 'update', 'delete', 'list'],
        ui: { form: true, table: true, card: true, modal: true },
        validation: {
          required: ['userId', 'name'],
          optional: ['description', 'logo', 'backgroundImage']
        },
        searchFields: ['name', 'description'],
        filterFields: ['userId', 'isActive', 'isPublic']
      },
      {
        name: 'MerchantTheme',
        fields: ['merchantId', 'name', 'businessName', 'brandColors', 'isActive', 'isDefault'],
        relations: ['merchant', 'customTheme'],
        operations: ['create', 'read', 'update', 'delete', 'list'],
        ui: { form: true, table: true, card: true, modal: true },
        validation: {
          required: ['merchantId', 'name', 'businessName'],
          optional: ['customThemeId', 'description', 'logo']
        },
        searchFields: ['name', 'businessName'],
        filterFields: ['merchantId', 'isActive', 'isDefault']
      },

      // DATABASE ANALYTICS (NEW)
      {
        name: 'DatabaseAnalytics',
        fields: ['id', 'totalRecords', 'totalTables', 'databaseSize', 'lastBackup', 'connectionStatus', 'uptime', 'activeConnections', 'maxConnections', 'timestamp', 'isDataFresh'],
        relations: [],
        operations: ['read', 'list'],
        ui: { form: false, table: true, card: true, modal: false },
        validation: {
          required: ['totalRecords', 'totalTables', 'databaseSize', 'timestamp'],
          optional: ['lastBackup', 'connectionStatus', 'uptime', 'activeConnections', 'maxConnections', 'isDataFresh']
        },
        searchFields: [],
        filterFields: ['connectionStatus', 'isDataFresh']
      },

      // MARKETPLACE LISTING
      {
        name: 'MarketplaceListing',
        fields: ['assetId', 'tokenAddress', 'seller', 'pricePerToken', 'totalTokens', 'availableTokens', 'soldTokens', 'isActive', 'listingType', 'lastSoldAt'],
        relations: ['realEstateAsset'],
        operations: ['create', 'read', 'update', 'delete', 'list'],
        ui: { form: true, table: true, card: true, modal: true },
        validation: {
          required: ['assetId', 'tokenAddress', 'seller', 'pricePerToken', 'totalTokens', 'availableTokens'],
          optional: ['soldTokens', 'lastSoldAt'],
          enums: {
            listingType: ['PRIMARY', 'SECONDARY']
          }
        },
        searchFields: ['assetId', 'tokenAddress'],
        filterFields: ['isActive', 'listingType', 'seller']
      }
    ];
  }

  async generateAll() {
    console.log('🚀 Enhanced Production Generator Starting...');

    // Create output directories
    this.createDirectories();

    // Generate enhanced API endpoints
    await this.generateEnhancedAPIEndpoints();

    // Generate enhanced React components
    await this.generateEnhancedComponents();

    // Generate enhanced hooks
    await this.generateEnhancedHooks();

    // Generate enhanced types
    await this.generateEnhancedTypes();

    // Generate navigation configuration
    await this.generateNavigation();

    // Generate and fix custom routes (admin, QTech, webhooks)
    await this.generateCustomRoutes();

    // Generate API routes in src/app/api/ and admin pages in src/app/admin/
    await this.generatePagesAndApiRoutes();

    console.log('✅ Enhanced Production Generation Complete!');
  }

  /**
   * Generate API routes in src/app/api/ and admin pages in src/app/admin/
   * using CompleteEntityGenerator
   */
  private async generatePagesAndApiRoutes(): Promise<void> {
    console.log('📄 Generating API routes and admin pages...');

    try {
      const generator = new CompleteEntityGenerator('zenstack/schema.zmodel');

      await generator.generate({
        types: true,        // Generate types using CompleteEntityGenerator
        hooks: true,       // Generate hooks using CompleteEntityGenerator
        api: false,         // Already generated by generateEnhancedAPIEndpoints
        apiRoutes: true,    // Generate API routes in src/app/api/
        components: true, // Already generated by generateEnhancedComponents
        pages: true,        // Generate admin pages in src/app/admin/
        databaseFirst: true, // Enable database-first mode for stores/services imports
        verifyFiles: false,
        allowDifferences: false
      });

      console.log('✅ API routes and admin pages generation completed');
    } catch (error) {
      console.error('❌ Error generating API routes and pages:', error);
      throw error;
    }
  }

  /**
   * Generate and fix custom routes (admin, QTech, webhooks)
   */
  private async generateCustomRoutes(): Promise<void> {
    try {
      const { CustomRouteGenerator } = await import('./custom-route-generator');
      const generator = new CustomRouteGenerator();
      await generator.generate();
      console.log('✅ Custom route generation completed');
    } catch (error) {
      console.warn('⚠️  Custom route generation skipped:', error);
    }
  }

  private async generateNavigation() {
    console.log('🧭 Generating navigation configuration...');

    try {
      const { navigationGenerator } = await import('./navigation-generator');
      await navigationGenerator.generate();
      console.log('✅ Navigation generation completed');
    } catch (error) {
      console.warn('⚠️  Navigation generation skipped (navigation-generator plugin not available)');
    }
  }

  private createDirectories() {
    const dirs = [
      'api',
      'components',
      'hooks',
      'types'
    ];

    dirs.forEach(dir => {
      const fullPath = join(this.outputDir, dir);
      if (!existsSync(fullPath)) {
        mkdirSync(fullPath, { recursive: true });
      }
    });
  }

  async generateEnhancedAPIEndpoints() {
    console.log('📡 Generating enhanced API endpoints...');

    for (const entity of this.entities) {
      const apiContent = this.generateEnhancedAPIEndpoint(entity);
      const filePath = join(this.outputDir, 'api', `${entity.name.toLowerCase()}s.ts`);
      writeFileSync(filePath, apiContent);
    }
  }

  private generateEnhancedAPIEndpoint(entity: EntityConfig): string {
    const entityName = entity.name;
    const entityNameLower = entity.name.toLowerCase();
    // Convert to camelCase for Prisma client (e.g., BlogPost -> blogPost)
    const entityNameCamel = entity.name.charAt(0).toLowerCase() + entity.name.slice(1);
    const entityNamePlural = `${entityNameLower}s`;

    // Generate validation schemas
    const createSchema = this.generateValidationSchema(entity, 'create');
    const updateSchema = this.generateValidationSchema(entity, 'update');
    const querySchema = this.generateQuerySchema(entity);

    // Generate where clause builder
    const whereClauseBuilder = this.generateWhereClauseBuilder(entity);

    return `import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import type { AuthUser } from '@/lib/auth';
import { OrderBy, SortOrder } from '@zenstackhq/orm';
import { z } from 'zod';

// Enhanced validation schemas
${createSchema}

${updateSchema}

${querySchema}

// Build where clause for filtering and search
function buildWhereClause(query: any) {
  const where: any = {};

${whereClauseBuilder}

  return where;
}

/**
 * GET /api/${entityNamePlural} - List ${entityNameLower}s with advanced filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Create database client with user context for access control
    const db = createClient(currentUser);

    // Query parameter validation
    const { searchParams } = new URL(request.url);
    const query = querySchema.parse(Object.fromEntries(searchParams));

    // Build where clause
    const where = buildWhereClause(query);

    // Parallel database queries for performance
    const [items, total] = await Promise.all([
      db.${entityNameCamel}.findMany({
        where,
        include: {
${entity.relations.map(rel => `          ${rel}: true`).join(',\n')}
        },
        orderBy: { createdAt: 'desc' as unknown as SortOrder & { [x: string]: SortOrder; [x: number]: SortOrder; } & { [x: string]: OrderBy<any, any, true, false>; [x: number]: OrderBy<any, any, true, false>; } },
        skip: (query.page - 1) * query.limit as unknown as number,
        take: query.limit as unknown as number
      }),
      db.${entityNameCamel}.count({ where }) as unknown as number
    ]);

    // Response with pagination metadata
    return NextResponse.json({
      ${entityNamePlural}: items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit)
      }
    });
  } catch (error) {
    // Enhanced error handling
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error fetching ${entityNamePlural}:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ${entityNamePlural}' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/${entityNamePlural} - Create a new ${entityNameLower}
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Request body validation
    const body = await request.json();
    const validatedData = create${entityName}Schema.parse(body);

    // Create database client with user context for access control
    const db = createClient(currentUser);

    // Create entity with business logic
    const item = await db.${entityNameCamel}.create({
      data: {
${entity.fields.map(field => `        ${field}: validatedData.${field},`).join('\n')}
      },
      include: {
${entity.relations.map(rel => `        ${rel}: true`).join(',\n')}
      }
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    // Enhanced error handling
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating ${entityNameLower}:', error);
    return NextResponse.json(
      { error: 'Failed to create ${entityNameLower}' },
      { status: 500 }
    );
  }
}`;
  }

  private generateValidationSchema(entity: EntityConfig, type: 'create' | 'update'): string {
    const schemaName = type === 'create' ? `create${entity.name}Schema` : `update${entity.name}Schema`;
    const fields = type === 'create' ? entity.validation.required : entity.validation.optional;

    // Get field types from schema
    const fieldTypes = getModelFieldTypes(entity.name);

    let schema = `const ${schemaName} = z.object({\n`;

    fields.forEach(field => {
      const isRequired = type === 'create' && entity.validation.required.includes(field);
      const enumValues = entity.validation.enums?.[field];
      const fieldInfo = fieldTypes.get(field);

      if (enumValues) {
        schema += `  ${field}: z.enum([${enumValues.map(v => `'${v}'`).join(', ')}])${isRequired ? '' : '.optional()'},\n`;
      } else if (fieldInfo) {
        // Use schema-parsed type
        const zodSchema = getZodSchemaForField(fieldInfo, isRequired);
        schema += `  ${field}: ${zodSchema},\n`;
      } else {
        // Fallback to name-based type inference
        const zodType = getFieldTypeFromName(field);
        schema += `  ${field}: ${zodType}${isRequired ? '' : '.optional()'},\n`;
      }
    });

    schema += '});';
    return schema;
  }

  private generateQuerySchema(entity: EntityConfig): string {
    let schema = `const querySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  search: z.string().optional(),`;

    entity.filterFields.forEach(field => {
      const enumValues = entity.validation.enums?.[field];
      if (enumValues) {
        schema += `\n  ${field}: z.enum([${enumValues.map(v => `'${v}'`).join(', ')}]).optional(),`;
      } else {
        schema += `\n  ${field}: z.string().optional(),`;
      }
    });

    schema += '\n});';
    return schema;
  }

  private generateWhereClauseBuilder(entity: EntityConfig): string {
    let builder = '';

    // Add filter fields
    entity.filterFields.forEach(field => {
      builder += `  if (query.${field}) where.${field} = query.${field};\n`;
    });

    // Add search functionality
    if (entity.searchFields.length > 0) {
      builder += `\n  if (query.search) {
    where.OR = [
${entity.searchFields.map(field => `      { ${field}: { contains: query.search, mode: 'insensitive' } }`).join(',\n')}
    ];
  }`;
    }

    return builder;
  }

  async generateEnhancedComponents() {
    console.log('🎨 Generating enhanced React components...');

    for (const entity of this.entities) {
      if (entity.ui.table) {
        const tableContent = this.generateEnhancedTableComponent(entity);
        const tablePath = join(this.outputDir, 'components', `${entity.name}Table.tsx`);
        writeFileSync(tablePath, tableContent);
      }

      if (entity.ui.form) {
        const formContent = this.generateEnhancedFormComponent(entity);
        const formPath = join(this.outputDir, 'components', `${entity.name}Form.tsx`);
        writeFileSync(formPath, formContent);
      }
    }
  }

  private generateEnhancedTableComponent(entity: EntityConfig): string {
    const entityName = entity.name;
    const entityNameLower = entity.name.toLowerCase();
    const entityNamePlural = `${entityNameLower}s`;

    return `'use client';
// ✅ Note: Table components use local useState for pagination/filters (acceptable)
// Form data management uses GeneratedFormStore - see dialog/modal components

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

interface ${entityName} {
  id: string;
${entity.fields.map(field => `  ${field}?: string;`).join('\n')}
  createdAt: string;
  updatedAt: string;
}

interface ${entityName}TableProps {
  className?: string;
}

interface ${entityName}Response {
  ${entityNamePlural}: ${entityName}[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export function ${entityName}Table({ className }: ${entityName}TableProps) {
  const [${entityNamePlural}, set${entityNamePlural}] = useState<${entityName}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  // ✅ REDUX/ZUSTAND PATTERN - Manual fetch function (user-triggered)
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search }),
        ...Object.entries(filters).reduce((acc, [key, value]) => {
          if (value && value !== 'all') acc[key] = value;
          return acc;
        }, {} as Record<string, string>)
      });

      const response = await fetch(\`/api/${entityNamePlural}?\${params}\`);
      if (!response.ok) throw new Error('Failed to fetch ${entityNamePlural}');

      const data: ${entityName}Response = await response.json();
      set${entityNamePlural}(data.${entityNamePlural});
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // ✅ REDUX/ZUSTAND PATTERN - Single mount-time initialization
  useEffect(() => {
    fetchData();
  }, []); // ✅ Empty deps - initial load only

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData(); // ✅ User-triggered refetch
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(1);
    // ✅ Note: User must click "Apply Filters" or "Refresh" button to refetch
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchData(); // ✅ User-triggered page change refetch
  };

  // Loading state
  if (loading && ${entityNamePlural}.length === 0) {
    return (
      <div className={\`flex items-center justify-center p-8 \${className}\`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={\`bg-red-50 border border-red-200 rounded-lg p-4 \${className}\`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-red-800">Error loading ${entityNamePlural}</h3>
            <p className="mt-2 text-sm text-red-700">{error}</p>
          </div>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try again
          </Button>
        </div>
      </div>
    );
  }

  // Empty state
  if (${entityNamePlural}.length === 0 && !loading) {
    return (
      <div className={\`bg-white shadow rounded-lg p-8 text-center \${className}\`}>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No ${entityNamePlural} found</h3>
        <p className="text-gray-500 mb-4">
          {search || Object.values(filters).some(f => f && f !== 'all') 
            ? 'No ${entityNamePlural} match your search criteria.' 
            : 'No ${entityNamePlural} available yet.'}
        </p>
        {(search || Object.values(filters).some(f => f && f !== 'all')) && (
          <Button onClick={() => { setSearch(''); setFilters({}); setPage(1); }} variant="outline">
            Clear filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={\`bg-white shadow rounded-lg \${className}\`}>
      {/* Header with search and filters */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">${entityName}s</h2>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Search and filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search ${entityNamePlural}..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </form>

${entity.filterFields.map(field => {
      const enumValues = entity.validation.enums?.[field];
      if (enumValues) {
        return `          <select
            value={filters.${field} || 'all'}
            onChange={(e) => handleFilterChange('${field}', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All ${field.charAt(0).toUpperCase() + field.slice(1)}</option>
${enumValues.map(value => `            <option value="${value}">${value}</option>`).join('\n')}
          </select>`;
      }
      return '';
    }).filter(Boolean).join('\n')}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
${entity.fields.slice(0, 4).map(field => `              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ${field.charAt(0).toUpperCase() + field.slice(1)}
              </th>`).join('\n')}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {${entityNamePlural}.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.id.slice(0, 8)}...
                </td>
${entity.fields.slice(0, 4).map(field => {
      const enumValues = entity.validation.enums?.[field];
      if (enumValues) {
        return `                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge variant="outline" className={
                    item.${field} === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                    item.${field} === 'INACTIVE' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }>
                    {item.${field} || '-'}
                  </Badge>
                </td>`;
      }
      return `                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.${field} || '-'}
                </td>`;
    }).join('\n')}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(item.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              variant="outline"
              size="sm"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
              variant="outline"
              size="sm"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}`;
  }

  private generateEnhancedFormComponent(entity: EntityConfig): string {
    const entityName = entity.name;
    const entityNameLower = entity.name.toLowerCase();

    return `'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface ${entityName}FormProps {
  initialData?: Partial<${entityName}>;
  onSubmit?: (data: any) => void;
  onSuccess?: () => void;
  className?: string;
}

interface ${entityName} {
  id?: string;
${entity.fields.map(field => `  ${field}?: string;`).join('\n')}
}

export function ${entityName}Form({ 
  initialData, 
  onSubmit, 
  onSuccess, 
  className 
}: ${entityName}FormProps) {
  const [formData, setFormData] = useState<Partial<${entityName}>>(initialData || {});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      // Validation
      const validationErrors: Record<string, string> = {};
      
${entity.validation.required.map(field => `      if (!formData.${field}) {
        validationErrors.${field} = '${field.charAt(0).toUpperCase() + field.slice(1)} is required';
      }`).join('\n')}

      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      // Submit data
      if (onSubmit) {
        await onSubmit(formData);
      } else {
        // Default API submission
        const response = await fetch('/api/${entityNameLower}s', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to save');
        }

        toast({
          title: 'Success',
          description: '${entityName} saved successfully',
        });

        if (onSuccess) onSuccess();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>${entityName} Form</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
${entity.fields.map(field => {
      const isRequired = entity.validation.required.includes(field);
      const enumValues = entity.validation.enums?.[field];

      if (enumValues) {
        return `          <div>
            <Label htmlFor="${field}">${field.charAt(0).toUpperCase() + field.slice(1)}${isRequired ? ' *' : ''}</Label>
            <Select value={formData.${field} || ''} onValueChange={(value) => handleChange('${field}', value.toUpperCase())}>
              <SelectTrigger>
                <SelectValue placeholder="Select ${field}" />
              </SelectTrigger>
              <SelectContent>
${enumValues.map(value => `                <SelectItem value="${value}">${value}</SelectItem>`).join('\n')}
              </SelectContent>
            </Select>
            {errors.${field} && <p className="text-sm text-red-600 mt-1">{errors.${field}}</p>}
          </div>`;
      } else if (field === 'content' || field === 'bio') {
        return `          <div>
            <Label htmlFor="${field}">${field.charAt(0).toUpperCase() + field.slice(1)}${isRequired ? ' *' : ''}</Label>
            <Textarea
              id="${field}"
              value={formData.${field} || ''}
              onChange={(e) => handleChange('${field}', e.target.value)}
              placeholder="Enter ${field}"
              rows={4}
            />
            {errors.${field} && <p className="text-sm text-red-600 mt-1">{errors.${field}}</p>}
          </div>`;
      } else {
        return `          <div>
            <Label htmlFor="${field}">${field.charAt(0).toUpperCase() + field.slice(1)}${isRequired ? ' *' : ''}</Label>
            <Input
              id="${field}"
              type="${field === 'email' ? 'email' : field === 'price' ? 'number' : 'text'}"
              value={formData.${field} || ''}
              onChange={(e) => handleChange('${field}', e.target.value)}
              placeholder="Enter ${field}"
            />
            {errors.${field} && <p className="text-sm text-red-600 mt-1">{errors.${field}}</p>}
          </div>`;
      }
    }).join('\n')}
          
          <div className="flex space-x-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setFormData(initialData || {})}>
              Reset
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}`;
  }

  async generateEnhancedHooks() {
    console.log('🪝 Generating enhanced React hooks...');

    for (const entity of this.entities) {
      const hookContent = this.generateEnhancedHook(entity);
      const hookPath = join(this.outputDir, 'hooks', `use${entity.name}.ts`);
      writeFileSync(hookPath, hookContent);
    }
  }

  private generateEnhancedHook(entity: EntityConfig): string {
    const entityName = entity.name;
    const entityNameLower = entity.name.toLowerCase();
    const entityNamePlural = `${entityNameLower}s`;

    return `import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
// ✅ Note: useEffect limited to mount-time initialization only

interface ${entityName} {
  id: string;
${entity.fields.map(field => `  ${field}?: string;`).join('\n')}
  createdAt: string;
  updatedAt: string;
}

interface ${entityName}Response {
  ${entityNamePlural}: ${entityName}[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface Use${entityName}Options {
  autoFetch?: boolean;
  page?: number;
  limit?: number;
  filters?: Record<string, string>;
  search?: string;
}

export function use${entityName}(options: Use${entityName}Options = {}) {
  const {
    autoFetch = true,
    page: initialPage = 1,
    limit = 10,
    filters = {},
    search = ''
  } = options;

  const [${entityNamePlural}, set${entityNamePlural}] = useState<${entityName}[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: initialPage,
    limit,
    total: 0,
    pages: 0
  });
  const [currentFilters, setCurrentFilters] = useState(filters);
  const [currentSearch, setCurrentSearch] = useState(search);

  const { toast } = useToast();

  const fetch${entityNamePlural} = useCallback(async (params: {
    page?: number;
    limit?: number;
    filters?: Record<string, string>;
    search?: string;
  } = {}) => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        page: (params.page || pagination.page).toString(),
        limit: (params.limit || pagination.limit).toString(),
        ...(params.search || currentSearch ? { search: params.search || currentSearch } : {}),
        ...Object.entries(params.filters || currentFilters).reduce((acc, [key, value]) => {
          if (value) acc[key] = value;
          return acc;
        }, {} as Record<string, string>)
      });

      const response = await fetch(\`/api/${entityNamePlural}?\${queryParams}\`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch ${entityNamePlural}');
      }

      const data: ${entityName}Response = await response.json();
      set${entityNamePlural}(data.${entityNamePlural});
      setPagination(data.pagination);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, currentFilters, currentSearch, toast]);

  const create${entityName} = useCallback(async (data: Partial<${entityName}>) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/${entityNamePlural}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create ${entityNameLower}');
      }

      const new${entityName} = await response.json();
      set${entityNamePlural}(prev => [new${entityName}, ...prev]);
      
      toast({
        title: 'Success',
        description: '${entityName} created successfully',
      });

      return new${entityName};
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const update${entityName} = useCallback(async (id: string, data: Partial<${entityName}>) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(\`/api/${entityNamePlural}/\${id}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update ${entityNameLower}');
      }

      const updated${entityName} = await response.json();
      set${entityNamePlural}(prev => prev.map(item => 
        item.id === id ? updated${entityName} : item
      ));
      
      toast({
        title: 'Success',
        description: '${entityName} updated successfully',
      });

      return updated${entityName};
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const delete${entityName} = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(\`/api/${entityNamePlural}/\${id}\`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete ${entityNameLower}');
      }

      set${entityNamePlural}(prev => prev.filter(item => item.id !== id));
      
      toast({
        title: 'Success',
        description: '${entityName} deleted successfully',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const setFilters = useCallback((filters: Record<string, string>) => {
    setCurrentFilters(filters);
    fetch${entityNamePlural}({ filters, page: 1 });
  }, [fetch${entityNamePlural}]);

  const setSearch = useCallback((search: string) => {
    setCurrentSearch(search);
    fetch${entityNamePlural}({ search, page: 1 });
  }, [fetch${entityNamePlural}]);

  const setPage = useCallback((page: number) => {
    fetch${entityNamePlural}({ page });
  }, [fetch${entityNamePlural}]);

  // ✅ REDUX/ZUSTAND PATTERN - Single mount-time initialization
  useEffect(() => {
    if (autoFetch) {
      fetch${entityNamePlural}();
    }
  }, []); // ✅ Empty deps - only check autoFetch once on mount

  return {
    ${entityNamePlural},
    loading,
    error,
    pagination,
    create${entityName},
    update${entityName},
    delete${entityName},
    refetch: fetch${entityNamePlural},
    setFilters,
    setSearch,
    setPage,
    currentFilters,
    currentSearch
  };
}`;
  }

  async generateEnhancedTypes() {
    console.log('📝 Generating enhanced TypeScript types...');

    const typesContent = this.generateEnhancedTypesFile();
    const typesPath = join(this.outputDir, 'types', 'index.ts');
    writeFileSync(typesPath, typesContent);
  }

  private generateEnhancedTypesFile(): string {
    return `// Enhanced auto-generated types for all entities

${this.entities.map(entity => `export interface ${entity.name} {
  id: string;
${entity.fields.map(field => `  ${field}?: string;`).join('\n')}
  createdAt: string;
  updatedAt: string;
}`).join('\n\n')}

// API Response types
${this.entities.map(entity => `export interface ${entity.name}Response {
  ${entity.name.toLowerCase()}s: ${entity.name}[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}`).join('\n\n')}

// Form data types
${this.entities.map(entity => `export interface ${entity.name}FormData {
${entity.fields.map(field => `  ${field}?: string;`).join('\n')}
}`).join('\n\n')}

// Filter types
${this.entities.map(entity => `export interface ${entity.name}Filters {
${entity.filterFields.map(field => `  ${field}?: string;`).join('\n')}
  search?: string;
  page?: number;
  limit?: number;
}`).join('\n\n')}

// Hook options types
${this.entities.map(entity => `export interface Use${entity.name}Options {
  autoFetch?: boolean;
  page?: number;
  limit?: number;
  filters?: ${entity.name}Filters;
  search?: string;
}`).join('\n\n')}`;
  }
}

// Export for use in scripts
export const enhancedProductionGenerator = new EnhancedProductionGenerator();

// CLI interface
if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case 'generate':
      enhancedProductionGenerator.generateAll().catch(console.error);
      break;
    case 'api':
      enhancedProductionGenerator.generateEnhancedAPIEndpoints().catch(console.error);
      break;
    case 'components':
      enhancedProductionGenerator.generateEnhancedComponents().catch(console.error);
      break;
    case 'hooks':
      enhancedProductionGenerator.generateEnhancedHooks().catch(console.error);
      break;
    case 'types':
      enhancedProductionGenerator.generateEnhancedTypes().catch(console.error);
      break;
    default:
      console.log('Usage: tsx plugins/enhanced-production-generator.ts <command>');
      console.log('Commands:');
      console.log('  generate     - Generate all enhanced components');
      console.log('  api          - Generate enhanced API endpoints only');
      console.log('  components   - Generate enhanced React components only');
      console.log('  hooks        - Generate enhanced React hooks only');
      console.log('  types        - Generate enhanced TypeScript types only');
      break;
  }
}
