import { existsSync, mkdirSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { getModelFieldTypes, getZodSchemaForField, getFieldTypeFromName } from './utils/schema-type-mapper';

/**
 * Enhanced Auto Generator
 * Replaces all manually written API endpoints and components with auto-generated versions
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
}

export class EnhancedAutoGenerator {
  private outputDir: string;
  private entities: EntityConfig[];

  constructor(outputDir: string = './src/generated') {
    this.outputDir = outputDir;
    this.entities = this.getEntityConfigs();
    // Filter out models that don't exist in the schema
    this.entities = this.filterExistingModels(this.entities);
  }

  /**
   * Filter out models that don't exist in the ZenStack schema
   */
  private filterExistingModels(entities: EntityConfig[]): EntityConfig[] {
    // Known models that exist as Zod schemas but not in ZenStack schema
    const knownMissingModels = [
      'BlockchainContract',
      'TokenizedAsset',
      'ContractCall',
      'DataSyncConfig',
      'GovernanceProposal',
      'BlockchainBalance'
    ];
    
    return entities.filter(entity => {
      const fieldTypes = getModelFieldTypes(entity.name);
      // If model doesn't exist, getModelFieldTypes returns empty Map
      if (fieldTypes.size === 0) {
        // Only log if it's not a known missing model
        if (!knownMissingModels.includes(entity.name)) {
          console.log(`Model ${entity.name} not found in schema`);
        }
        return false;
      }
      return true;
    });
  }

  private getEntityConfigs(): EntityConfig[] {
    return [
      {
        name: 'User',
        fields: ['email', 'name', 'bio', 'status', 'role', 'createdAt', 'updatedAt'],
        relations: ['preferences', 'addresses', 'orders', 'reviews', 'blogPosts'],
        operations: ['create', 'read', 'update', 'delete', 'list'],
        ui: { form: true, table: true, card: true, modal: true }
      },
      {
        name: 'UserPreferences',
        fields: ['userId', 'themeMode', 'language', 'currency', 'aiProfile'],
        relations: ['user'],
        operations: ['create', 'read', 'update', 'list'],
        ui: { form: true, table: false, card: true, modal: false }
      },
      {
        name: 'Product',
        fields: ['name', 'slug', 'description', 'price', 'sku', 'categoryId', 'vendorId', 'inventory', 'status'],
        relations: ['category', 'vendor', 'variants', 'reviews'],
        operations: ['create', 'read', 'update', 'delete', 'list'],
        ui: { form: true, table: true, card: true, modal: true }
      },
      {
        name: 'Category',
        fields: ['name', 'description', 'slug', 'isActive'],
        relations: ['products', 'children', 'parent'],
        operations: ['create', 'read', 'update', 'delete', 'list'],
        ui: { form: true, table: true, card: false, modal: true }
      },
      {
        name: 'Order',
        fields: ['orderNumber', 'userId', 'status', 'subtotal', 'taxAmount', 'shippingAmount', 'totalAmount', 'billingAddress', 'shippingAddress'],
        relations: ['user', 'items', 'payment', 'vendor'],
        operations: ['create', 'read', 'update', 'list'],
        ui: { table: true, card: true, modal: false, form: false }
      },
      {
        name: 'Review',
        fields: ['productId', 'vendorId', 'orderId', 'rating', 'title', 'content', 'isVerified'],
        relations: ['user', 'product', 'vendor'],
        operations: ['create', 'read', 'update', 'delete', 'list'],
        ui: { form: true, table: true, card: true, modal: false }
      },
      {
        name: 'BlogPost',
        fields: ['title', 'slug', 'content', 'excerpt', 'status', 'category', 'tags', 'authorId'],
        relations: ['author', 'comments'],
        operations: ['create', 'read', 'update', 'delete', 'list'],
        ui: { form: true, table: true, card: true, modal: true }
      },
      {
        name: 'Comment',
        fields: ['postId', 'parentId', 'content', 'isApproved'],
        relations: ['user', 'post', 'parent', 'replies'],
        operations: ['create', 'read', 'update', 'delete', 'list'],
        ui: { form: true, table: true, card: true, modal: false }
      },
      // ========== BLOCKCHAIN MODELS ==========
      {
        name: 'BlockchainContract',
        fields: ['contractAddress', 'contractType', 'network', 'chainId', 'name', 'isActive'],
        relations: ['tokenizedAssets', 'contractEvents', 'contractCalls'],
        operations: ['create', 'read', 'update', 'list'],
        ui: { form: true, table: true, card: true, modal: true }
      },
      {
        name: 'TokenizedAsset',
        fields: ['tokenId', 'network', 'assetType', 'dataStorage', 'ownerAddress', 'totalSupply', 'syncStatus'],
        relations: ['contract', 'realEstateAsset', 'transfers'],
        operations: ['create', 'read', 'update', 'list'],
        ui: { form: true, table: true, card: true, modal: true }
      },
      // AssetTransfer is excluded - it's a custom blockchain-specific endpoint
      // Located at: src/app/api/assettransfers/route.ts
      {
        name: 'ContractEvent',
        fields: ['eventName', 'transactionHash', 'blockNumber', 'isProcessed'],
        relations: ['contract'],
        operations: ['read', 'list'],
        ui: { table: true, card: false, modal: false, form: false }
      },
      {
        name: 'ContractCall',
        fields: ['methodName', 'transactionHash', 'status', 'gasUsed'],
        relations: ['contract', 'user'],
        operations: ['read', 'list'],
        ui: { table: true, card: true, modal: false, form: false }
      },
      {
        name: 'DataSyncConfig',
        fields: ['entityType', 'dataStorage', 'syncDirection', 'syncFrequency', 'isEnabled'],
        relations: ['contract', 'syncLogs'],
        operations: ['create', 'read', 'update', 'list'],
        ui: { form: true, table: true, card: true, modal: true }
      },
      {
        name: 'GovernanceProposal',
        fields: ['title', 'description', 'status', 'voteType', 'startTime', 'endTime'],
        relations: ['proposer', 'votes'],
        operations: ['create', 'read', 'update', 'list'],
        ui: { form: true, table: true, card: true, modal: true }
      },
      {
        name: 'BlockchainBalance',
        fields: ['walletAddress', 'contractAddress', 'balance', 'lockedBalance', 'syncStatus'],
        relations: ['user'],
        operations: ['read', 'list'],
        ui: { table: true, card: true, modal: false, form: false }
      }
    ];
  }

  async generateAll() {
    // Generate custom routes (admin, QTech, webhooks) first
    await this.generateCustomRoutes();
    console.log('🚀 Enhanced Auto Generator Starting...');

    // Create output directories
    this.createDirectories();

    // Generate API endpoints
    await this.generateAPIEndpoints();

    // Generate React components
    await this.generateComponents();

    // Generate hooks
    await this.generateHooks();

    // Generate types
    await this.generateTypes();

    // Generate navigation configuration
    await this.generateNavigation();

    console.log('✅ Enhanced Auto Generation Complete!');
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

  async generateAPIEndpoints() {
    console.log('📡 Generating API endpoints...');
    
    for (const entity of this.entities) {
      const apiContent = this.generateAPIEndpoint(entity);
      const filePath = join(this.outputDir, 'api', `${entity.name.toLowerCase()}s.ts`);
      writeFileSync(filePath, apiContent);
    }
  }

  /**
   * Generate data fields for create operation, including required foreign keys
   */
  private generateCreateDataFields(entity: EntityConfig): string {
    const fields: string[] = [];
    const fieldTypes = getModelFieldTypes(entity.name);
    
    // Check if userId is required in schema (even if not in entity.fields list)
    const userIdField = fieldTypes.get('userId');
    if (userIdField && !userIdField.isOptional) {
      // Add userId from currentUser if it's required
      fields.push(`        userId: currentUser.id,`);
    }
    
    // Check if authorId is required in schema
    const authorIdField = fieldTypes.get('authorId');
    if (authorIdField && !authorIdField.isOptional) {
      fields.push(`        authorId: currentUser.id,`);
    }
    
    // Add all fields from schema
    for (const field of entity.fields) {
      // Skip userId/authorId - already handled above
      if (field === 'userId' || field === 'authorId') {
        continue;
      }
      
      // Skip createdAt/updatedAt - handled by database defaults
      if (field === 'createdAt' || field === 'updatedAt') {
        continue;
      }
      
      fields.push(`        ${field}: validatedData.${field},`);
    }
    
    return fields.join('\n');
  }

  /**
   * Generate validation schema fields, excluding auto-set fields
   * Includes all required foreign keys from schema, even if not in fields list
   */
  private generateFieldSchemas(modelName: string, fields: string[], type: 'create' | 'update'): string {
    const fieldTypes = getModelFieldTypes(modelName);
    const schemas: string[] = [];
    const processedFields = new Set<string>();
    
    // First, add all required foreign keys from schema (even if not in fields list)
    // Common foreign key patterns: *Id fields that are required
    for (const [fieldName, fieldInfo] of fieldTypes.entries()) {
      // Skip userId/authorId in create schema - they come from currentUser
      if (type === 'create' && (fieldName === 'userId' || fieldName === 'authorId')) {
        continue;
      }
      
      // Include required foreign keys (fields ending in Id that are not optional)
      if (fieldName.endsWith('Id') && !fieldInfo.isOptional && type === 'create') {
        const zodSchema = getZodSchemaForField(fieldInfo, true);
        schemas.push(`  ${fieldName}: ${zodSchema},`);
        processedFields.add(fieldName);
      }
    }
    
    // Then add fields from the entity config
    for (const field of fields) {
      // Skip if already processed
      if (processedFields.has(field)) {
        continue;
      }
      
      // Skip userId/authorId in create schema - they come from currentUser
      if (type === 'create' && (field === 'userId' || field === 'authorId')) {
        continue;
      }
      
      // Skip createdAt/updatedAt - handled by database
      if (field === 'createdAt' || field === 'updatedAt') {
        continue;
      }
      
      const fieldInfo = fieldTypes.get(field);
      
      if (fieldInfo) {
        // Use schema-parsed type
        const zodSchema = getZodSchemaForField(fieldInfo, type === 'create' && !fieldInfo.isOptional);
        schemas.push(`  ${field}: ${zodSchema},`);
      } else {
        // Fallback to name-based type inference
        const zodType = getFieldTypeFromName(field);
        schemas.push(`  ${field}: ${zodType}${type === 'create' ? '' : '.optional()'},`);
      }
      
      processedFields.add(field);
    }
    
    return schemas.join('\n');
  }

  private generateAPIEndpoint(entity: EntityConfig): string {
    const entityName = entity.name;
    const entityNameLower = entityName.toLowerCase();
    const entityNameCamel = entityName.charAt(0).toLowerCase() + entityName.slice(1); // BlogPost -> blogPost
    const entityNamePlural = `${entityNameLower}s`;
    
    return `import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { OrderBy, SortOrder } from '@zenstackhq/orm';
import { z } from 'zod';

// Validation schemas
const create${entityName}Schema = z.object({
${this.generateFieldSchemas(entity.name, entity.fields, 'create')}
});

const update${entityName}Schema = z.object({
${this.generateFieldSchemas(entity.name, entity.fields, 'update')}
});

const querySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  search: z.string().optional(),
});

/**
 * GET /api/${entityNamePlural} - List ${entityNameLower}s with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Create database client with user context for access control
    const db = createClient(currentUser);

    const { searchParams } = new URL(request.url);
    const query = querySchema.parse(Object.fromEntries(searchParams));

    const where: any = {};

    if (query.search) {
      where.OR = [
${entity.fields.slice(0, 3).map(field => `        { ${field}: { contains: query.search, mode: 'insensitive' } }`).join(',\n')}
      ];
    }

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
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Create database client with user context for access control
    const db = createClient(currentUser);

    const body = await request.json();
    const validatedData = create${entityName}Schema.parse(body);

    const item = await db.${entityNameCamel}.create({
      data: {
${this.generateCreateDataFields(entity)}
      },
      include: {
${entity.relations.map(rel => `        ${rel}: true`).join(',\n')}
      }
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
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

  async generateComponents() {
    console.log('🎨 Generating React components...');
    
    for (const entity of this.entities) {
      if (entity.ui.form) {
        const formContent = this.generateFormComponent(entity);
        const formPath = join(this.outputDir, 'components', `${entity.name}Form.tsx`);
        writeFileSync(formPath, formContent);
      }
      
      if (entity.ui.table) {
        const tableContent = this.generateTableComponent(entity);
        const tablePath = join(this.outputDir, 'components', `${entity.name}Table.tsx`);
        writeFileSync(tablePath, tableContent);
      }
      
      if (entity.ui.card) {
        const cardContent = this.generateCardComponent(entity);
        const cardPath = join(this.outputDir, 'components', `${entity.name}Card.tsx`);
        writeFileSync(cardPath, cardContent);
      }
    }
  }

  private generateFormComponent(entity: EntityConfig): string {
    const entityName = entity.name;
    const entityNameLower = entityName.toLowerCase();
    
    return `'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface ${entityName}FormProps {
  initialData?: Partial<${entityName}>;
  onSubmit: (data: any) => void;
  loading?: boolean;
}

export function ${entityName}Form({ initialData, onSubmit, loading }: ${entityName}FormProps) {
  const [formData, setFormData] = useState(initialData || {});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>${entityName} Form</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
${entity.fields.map(field => `          <div>
            <Label htmlFor="${field}">${field.charAt(0).toUpperCase() + field.slice(1)}</Label>
            <Input
              id="${field}"
              value={formData.${field} || ''}
              onChange={(e) => handleChange('${field}', e.target.value)}
              placeholder="Enter ${field}"
            />
          </div>`).join('\n')}
          
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}`;
  }

  private generateTableComponent(entity: EntityConfig): string {
    const entityName = entity.name;
    const entityNameLower = entityName.toLowerCase();
    const entityNamePlural = `${entityNameLower}s`;
    
    // Filter out createdAt and updatedAt from fields since they're always required
    const regularFields = entity.fields.filter(field => 
      field !== 'createdAt' && field !== 'updatedAt'
    );
    
    return `'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ${entityName} {
  id: string;
${regularFields.map(field => `  ${field}?: string;`).join('\n')}
  createdAt: string;
  updatedAt: string;
}

interface ${entityName}TableProps {
  ${entityNamePlural}: ${entityName}[];
  onEdit?: (item: ${entityName}) => void;
  onDelete?: (id: string) => void;
}

export function ${entityName}Table({ ${entityNamePlural}, onEdit, onDelete }: ${entityName}TableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>${entityName}s</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">ID</th>
${entity.fields.slice(0, 4).map(field => `                <th className="text-left p-2">${field.charAt(0).toUpperCase() + field.slice(1)}</th>`).join('\n')}
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {${entityNamePlural}.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="p-2">{item.id}</td>
${entity.fields.slice(0, 4).map(field => `                  <td className="p-2">{item.${field} || '-'}</td>`).join('\n')}
                  <td className="p-2">
                    <div className="flex gap-2">
                      {onEdit && (
                        <Button size="sm" onClick={() => onEdit(item)}>
                          Edit
                        </Button>
                      )}
                      {onDelete && (
                        <Button size="sm" variant="destructive" onClick={() => onDelete(item.id)}>
                          Delete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}`;
  }

  private generateCardComponent(entity: EntityConfig): string {
    const entityName = entity.name;
    const entityNameLower = entityName.toLowerCase();
    
    // Filter out createdAt and updatedAt from fields since they're always required
    const regularFields = entity.fields.filter(field => 
      field !== 'createdAt' && field !== 'updatedAt'
    );
    
    return `'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ${entityName} {
  id: string;
${regularFields.map(field => `  ${field}?: string;`).join('\n')}
  createdAt: string;
  updatedAt: string;
}

interface ${entityName}CardProps {
  ${entityNameLower}: ${entityName};
  onClick?: () => void;
}

export function ${entityName}Card({ ${entityNameLower}, onClick }: ${entityName}CardProps) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardHeader>
        <CardTitle className="text-lg">
          {${entityNameLower}.${entity.fields[0] || 'id'} || 'Untitled'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
${entity.fields.slice(0, 3).map(field => `          <div>
            <span className="text-sm font-medium">${field.charAt(0).toUpperCase() + field.slice(1)}:</span>
            <span className="ml-2">{${entityNameLower}.${field} || '-'}</span>
          </div>`).join('\n')}
        </div>
        <div className="mt-4 text-xs text-gray-500">
          Created: {new Date(${entityNameLower}.createdAt).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
}`;
  }

  async generateHooks() {
    console.log('🪝 Generating React hooks...');
    
    for (const entity of this.entities) {
      const hookContent = this.generateHook(entity);
      const hookPath = join(this.outputDir, 'hooks', `use${entity.name}.ts`);
      writeFileSync(hookPath, hookContent);
    }
  }

  private generateHook(entity: EntityConfig): string {
    const entityName = entity.name;
    const entityNameLower = entityName.toLowerCase();
    const entityNamePlural = `${entityNameLower}s`;
    
    // Filter out createdAt and updatedAt from fields since they're always required
    const regularFields = entity.fields.filter(field => 
      field !== 'createdAt' && field !== 'updatedAt'
    );
    
    return `import { useState, useEffect } from 'react';

interface ${entityName} {
  id: string;
${regularFields.map(field => `  ${field}?: string;`).join('\n')}
  createdAt: string;
  updatedAt: string;
}

export function use${entityName}() {
  const [${entityNamePlural}, set${entityNamePlural}] = useState<${entityName}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch${entityNamePlural} = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/${entityNamePlural}');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      set${entityNamePlural}(data.${entityNamePlural});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const create${entityName} = async (data: Partial<${entityName}>) => {
    try {
      const response = await fetch('/api/${entityNamePlural}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create');
      await fetch${entityNamePlural}();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const update${entityName} = async (id: string, data: Partial<${entityName}>) => {
    try {
      const response = await fetch(\`/api/${entityNamePlural}/\${id}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update');
      await fetch${entityNamePlural}();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const delete${entityName} = async (id: string) => {
    try {
      const response = await fetch(\`/api/${entityNamePlural}/\${id}\`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete');
      await fetch${entityNamePlural}();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  useEffect(() => {
    fetch${entityNamePlural}();
  }, []);

  return {
    ${entityNamePlural},
    loading,
    error,
    create${entityName},
    update${entityName},
    delete${entityName},
    refetch: fetch${entityNamePlural}
  };
}`;
  }

  async generateTypes() {
    console.log('📝 Generating TypeScript types...');
    
    const typesContent = this.generateTypesFile();
    const typesPath = join(this.outputDir, 'types', 'index.ts');
    writeFileSync(typesPath, typesContent);
  }

  private generateTypesFile(): string {
    // Always generate re-exports for all type files found in types/ directory
    // Individual type files are generated by CompleteEntityGenerator via zen:generate
    const typesDir = join(this.outputDir, 'types');
    const typeExports: string[] = [];
    
    // Scan types directory for all *-types.ts files
    if (existsSync(typesDir)) {
      const files = readdirSync(typesDir);
      const typeFiles = files
        .filter(file => file.endsWith('-types.ts'))
        .sort(); // Sort for consistent output
      
      for (const typeFile of typeFiles) {
        // Remove .ts extension for import
        const moduleName = typeFile.replace('.ts', '');
        typeExports.push(`export * from './${moduleName}';`);
      }
    }
    
    // Fallback: if no type files found, generate re-exports from entity configs
    if (typeExports.length === 0) {
      for (const entity of this.entities) {
        // Convert entity name to kebab-case for filename
        // e.g., UserPreferences -> userPreferences -> user-preferences
        const entityNameLower = entity.name.charAt(0).toLowerCase() + entity.name.slice(1);
        const typeFileName = `${entityNameLower.replace(/([A-Z])/g, '-$1').toLowerCase()}-types.ts`;
        typeExports.push(`export * from './${typeFileName.replace('.ts', '')}';`);
      }
    }
    
    let content = `// Auto-generated types for all entities\n\n`;
    
    // Add re-exports for all type files
    content += `// Re-export types from individual type files\n`;
    content += typeExports.join('\n');
    content += '\n\n';
    
    // API Response types
    content += `// API Response types\n`;
    content += this.entities.map(entity => `export interface ${entity.name}Response {
  ${entity.name.toLowerCase()}s: ${entity.name}[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}`).join('\n\n');
    
    content += '\n\n';
    
    // Form data types
    content += `// Form data types\n`;
    content += this.entities.map(entity => `export interface ${entity.name}FormData {
${entity.fields.map(field => `  ${field}?: string;`).join('\n')}
}`).join('\n\n');
    
    return content;
  }
}

// Export for use in scripts
export const enhancedAutoGenerator = new EnhancedAutoGenerator();

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'generate':
    case 'all':
      enhancedAutoGenerator.generateAll().catch(console.error);
      break;
    case 'api':
      enhancedAutoGenerator.generateAPIEndpoints().catch(console.error);
      break;
    case 'components':
      enhancedAutoGenerator.generateComponents().catch(console.error);
      break;
    case 'hooks':
      enhancedAutoGenerator.generateHooks().catch(console.error);
      break;
    case 'types':
      enhancedAutoGenerator.generateTypes().catch(console.error);
      break;
    default:
      console.log('Usage: tsx plugins/enhanced-auto-generator.ts <command>');
      console.log('Commands:');
      console.log('  generate, all - Generate all (API, components, hooks, types, navigation)');
      console.log('  api          - Generate API endpoints only');
      console.log('  components   - Generate React components only');
      console.log('  hooks        - Generate React hooks only');
      console.log('  types        - Generate TypeScript types only');
      break;
  }
}
