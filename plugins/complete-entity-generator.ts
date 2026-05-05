/**
 * Complete Entity Generator
 * Generates types, hooks, API routes, components, and pages for all entities
 * Following ZenStack v3 Best Practices
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { validateDocumentationRouting } from './config/documentation-routing-config';
import {
  usesStripePayment,
  getStripePaymentCreateNotice,
  getStripePaymentRouteComment,
} from './config/entity-generation-config';
import { EnhancedFormGenerator } from './enhanced-form-generator';
import { shouldUseEnhancedContentEditor } from './utils/content-field-detector';
import { FileVerificationSystem } from './utils/file-verification';
import { templateLoader } from './utils/template-loader';

interface ModelConfig {
  name: string;
  fields: FieldConfig[];
  relations: RelationConfig[];
  accessControl: AccessControlConfig;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

interface FieldConfig {
  name: string;
  type: string;
  typeName?: string;
  isOptional: boolean;
  isArray: boolean;
  isComputed?: boolean;
  defaultValue?: any;
  isEnum?: boolean;
  enumValues?: string[];
  isBlob?: boolean; // Vercel Blob storage field
  isDocument?: boolean; // Document/file field
  isImage?: boolean; // Image field
}

interface RelationConfig {
  name: string;
  model: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
  isOptional: boolean;
}

interface AccessControlConfig {
  publicRead: boolean;
  userRead: 'all' | 'own' | 'none';
  userWrite: 'all' | 'own' | 'none';
  vendorWrite: 'all' | 'own' | 'none';
  adminWrite: 'all';
  customRules?: string[];
}

export class CompleteEntityGenerator {
  private baseDir = 'src/generated';
  private enhancedFormGenerator: EnhancedFormGenerator;
  private models: Map<string, ModelConfig> = new Map();
  private enums: Map<string, string[]> = new Map();
  private schemaPath: string;
  private verificationSystem: FileVerificationSystem | null = null;
  private useTempDir: boolean = false;
  private projectRoot: string = process.cwd();
  
  constructor(schemaPath: string = 'zenstack/schema.zmodel') {
    this.schemaPath = schemaPath;
    this.loadModels();
  }

  private loadModels() {
    // Parse ZModel schema file
    const schemaContent = readFileSync(this.schemaPath, 'utf-8');
    
    // Parse enums first
    this.parseEnums(schemaContent);
    
    const models = this.parseZModelSchema(schemaContent);
    
    models.forEach(model => {
      this.models.set(model.name, model);
    });
    
    console.log(`✅ Loaded ${this.models.size} models and ${this.enums.size} enums from schema`);
  }

  private parseEnums(content: string) {
    const enumRegex = /enum\s+(\w+)\s*{([^}]+)}/gs;
    let match;

    while ((match = enumRegex.exec(content)) !== null) {
      const name = match[1];
      const body = match[2];
      
      // Parse enum values - exclude comments and ZenStack directives
      const values = body
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('//') && !line.startsWith('@@'))
        .map(line => line.replace(/,.*$/, '').trim());
      
      this.enums.set(name, values);
    }
  }

  private parseZModelSchema(content: string): ModelConfig[] {
    const models: ModelConfig[] = [];

    // Use brace-counting to properly extract model bodies.
    // The old regex /model\s+(\w+)\s*{([^}]+)}/gs broke on JSON default values
    // like @default("{}") because [^}]+ stops at the first } inside the string,
    // causing all fields after the first JSON-default field to be silently dropped.
    const modelDeclRegex = /\bmodel\s+(\w+)\s*\{/g;
    let declMatch: RegExpExecArray | null;

    while ((declMatch = modelDeclRegex.exec(content)) !== null) {
      const name = declMatch[1];
      const bodyStart = declMatch.index + declMatch[0].length;

      // Walk forward counting braces to find the matching closing brace.
      // Balanced {…} inside @default("{}") don't change the net depth.
      let depth = 1;
      let pos = bodyStart;
      let inString = false;
      let stringChar = '';

      while (pos < content.length && depth > 0) {
        const ch = content[pos];

        if (inString) {
          if (ch === '\\') {
            pos++; // skip escaped char
          } else if (ch === stringChar) {
            inString = false;
          }
        } else {
          if (ch === '"' || ch === "'") {
            inString = true;
            stringChar = ch;
          } else if (ch === '{') {
            depth++;
          } else if (ch === '}') {
            depth--;
          }
        }
        pos++;
      }

      const body = content.slice(bodyStart, pos - 1);

      const accessControl = this.parseAccessControl(body);

      // Override public read access for specific models that should be public
      const publicModels = ['Documentation', 'PropertyRental', 'RealEstateAsset', 'BlogPost'];
      if (publicModels.includes(name)) {
        accessControl.publicRead = true;
      }

      const config: ModelConfig = {
        name,
        fields: this.parseFields(body),
        relations: this.parseRelations(body),
        accessControl,
        category: this.categorizeModel(name),
        priority: this.determinePriority(name)
      };

      models.push(config);
    }

    return models;
  }

  private parseFields(body: string): FieldConfig[] {
    const fields: FieldConfig[] = [];
    const lines = body.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) continue;
      
      const fieldMatch = /^(\w+)\s+(\w+)(\[\])?(\?)?/.exec(trimmed);
      if (fieldMatch) {
        const [, name, type, isArray, isOptional] = fieldMatch;
        
        // Check if type is an enum first
        const isEnum = this.enums.has(type);
        
        // Skip if it's a relation (capitalized type that's not an enum or scalar)
        if (!isEnum && type[0] === type[0].toUpperCase() && !['String', 'Int', 'Boolean', 'DateTime', 'Float', 'Decimal', 'Json', 'Bytes'].includes(type)) {
          continue;
        }
        
        const enumValues = isEnum ? this.enums.get(type) : undefined;
        
        fields.push({
          name,
          type,
          typeName: type,
          isOptional: !!isOptional,
          isArray: !!isArray,
          isComputed: trimmed.includes('@computed'),
          defaultValue: this.extractDefault(trimmed),
          isEnum,
          enumValues
        });
      }
    }
    
    return fields;
  }

  private parseRelations(body: string): RelationConfig[] {
    const relations: RelationConfig[] = [];
    const lines = body.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) continue;
      
      const fieldMatch = /^(\w+)\s+(\w+)(\[\])?(\?)?/.exec(trimmed);
      if (fieldMatch) {
        const [, name, type, isArray, isOptional] = fieldMatch;
        
        // Check if it's a relation (capitalized type that's not a scalar or enum)
        const isEnum = this.enums.has(type);
        if (!isEnum && type[0] === type[0].toUpperCase() && !['String', 'Int', 'Boolean', 'DateTime', 'Float', 'Decimal', 'Json', 'Bytes'].includes(type)) {
          relations.push({
            name,
            model: type,
            type: isArray ? 'one-to-many' : 'many-to-one',
            isOptional: !!isOptional
          });
        }
      }
    }
    
    return relations;
  }

  private parseAccessControl(body: string): AccessControlConfig {
    const allowLines: string[] = body.match(/@@allow\([^)]+\)/g) || [];
    
    // Check for public read access patterns
    const hasPublicRead = allowLines.some(line => 
      (line.includes("'read'") && line.includes('true')) ||
      (line.includes("'read'") && line.includes('isPublic')) ||
      line.includes("'read', true")
    );
    
    return {
      publicRead: hasPublicRead,
      userRead: 'own',
      userWrite: 'own',
      vendorWrite: 'none',
      adminWrite: 'all',
      customRules: allowLines
    };
  }

  private extractDefault(line: string): any {
    const defaultMatch = /@default\(([^)]+)\)/.exec(line);
    if (defaultMatch) {
      const value = defaultMatch[1];
      if (value === 'now()') return 'now()';
      if (value === 'cuid()') return 'cuid()';
      if (value === 'uuid()') return 'uuid()';
      if (value === 'autoincrement()') return 'autoincrement()';
      if (value === 'true') return true;
      if (value === 'false') return false;
      if (!isNaN(Number(value))) return Number(value);
      return value.replace(/['"]/g, '');
    }
    return undefined;
  }

  private categorizeModel(name: string): string {
    const categories: Record<string, string[]> = {
      'Core User Management': ['User', 'UserPreferences', 'Account', 'Session', 'Address', 'AddressBook', 'Settings', 'VerificationToken', 'PasswordResetToken', 'UserActivity'],
      'Documentation': ['Documentation', 'DocumentationVersion', 'DocumentationConfig', 'Document', 'PropertyOnboarding'],
      'E-Commerce': ['Category', 'Product', 'ProductVariant', 'VendorProfile', 'Order', 'OrderItem', 'Payment', 'Cart', 'CartItem', 'WishlistItem', 'Review'],
      'Blog & Content': ['BlogPost', 'Comment', 'SavedPost', 'BlogPostLike', 'AIInteraction'],
      'Communication': ['Notification', 'NotificationTemplate', 'ChatSession', 'ChatMessage'],
      'Real Estate': ['RealEstateAsset', 'Image', 'Portfolio', 'Investment', 'InvestmentPerformance', 'MonthlyReturn', 'Deposit', 'TokenHolder', 'Collection', 'InvestmentGamingTransfer'],
      'Investment Analysis': ['PropertyCashFlow', 'MarketComparable', 'PropertyValuation', 'FinancialMetrics', 'PropertyExpense', 'PropertyRental', 'InvestmentBenchmark', 'InvestmentRisk', 'CashFlowProjection', 'PortfolioAnalysis', 'MarketIntelligence'],
      'Gaming - PAM': ['UserPamMapping', 'PamTransaction', 'PamErrorLog', 'Game', 'GameOperator'],
      'Gaming - QTech': ['UserQtechAccount', 'QtechGameRound', 'QtechTransaction', 'QtechErrorLog', 'QtechProvider', 'QtechGame', 'GamingSession', 'QtechBalanceSnapshot', 'QtechNGRAggregation'],
      'Wallet & Web3': ['WalletSession', 'WalletConnection', 'WalletTransaction', 'RevokedToken'],
      'System': ['SystemConfig', 'AuditLog', 'RevokedTokenFamily', 'OAuthState'],
      'UI Generation': ['UIComponent', 'UIComponentField', 'UIComponentInstance', 'UILayout', 'UILayoutInstance', 'UIGenerationRequest'],
      'Payments': ['Customer', 'Price', 'Subscription', 'StripeProduct', 'StripePrice', 'StripePayment', 'ImageUpload']
    };
    
    for (const [category, models] of Object.entries(categories)) {
      if (models.includes(name)) return category;
    }
    
    return 'Other';
  }

  private determinePriority(name: string): 'critical' | 'high' | 'medium' | 'low' {
    const critical = ['User', 'Account', 'Session', 'Settings'];
    const high = ['Product', 'Order', 'BlogPost', 'RealEstateAsset', 'Investment', 'PropertyCashFlow', 'FinancialMetrics', 'PortfolioAnalysis'];
    const medium = ['Notification', 'Category', 'Review', 'Portfolio', 'PropertyValuation', 'InvestmentRisk', 'MarketComparable', 'InvestmentBenchmark'];
    
    if (critical.includes(name)) return 'critical';
    if (high.includes(name)) return 'high';
    if (medium.includes(name)) return 'medium';
    return 'low';
  }

  /**
   * Generate TypeScript types for a model
   */
  private generateTypes(model: ModelConfig): string {
    const { name, fields, relations } = model;

    // Collect enums used by this model's fields and emit them inline
    const usedEnums = new Map<string, string[]>();
    for (const f of fields) {
      if (f.isEnum && f.typeName && this.enums.has(f.typeName)) {
        if (!usedEnums.has(f.typeName)) {
          usedEnums.set(f.typeName, this.enums.get(f.typeName)!);
        }
      }
    }
    const enumDeclarations = [...usedEnums.entries()]
      .map(([enumName, values]) =>
        `export type ${enumName} = ${values.map(v => `'${v}'`).join(' | ')};`)
      .join('\n');
    
    return `// Generated Types for ${name}
// DO NOT EDIT - Auto-generated by CompleteEntityGenerator

${this.generateImports(model)}
${enumDeclarations ? `\n${enumDeclarations}\n` : ''}
/**
 * ${name} entity type
 */
export interface ${name} {
${fields.map(f => `  ${f.name}${f.isOptional ? '?' : ''}: ${this.getTypeScriptType(f.type, f.isArray)};`).join('\n')}
${relations.map(r => `  ${r.name}?: ${r.model}${r.type === 'one-to-many' ? '[]' : ''};`).join('\n')}
}

/**
 * Create ${name} input (omits auto-generated fields)
 */
export type Create${name}Input = Omit<${name}, 'id' | 'createdAt' | 'updatedAt'${this.getOmittedFields(fields)}>;

/**
 * Update ${name} input (all fields optional except id)
 */
export type Update${name}Input = Partial<Create${name}Input> & { id: string };

/**
 * ${name} filter for queries
 */
export interface ${name}Filter {
${fields.filter(f => !f.isComputed).map(f => `  ${f.name}?: ${this.getFilterType(f.type, f.isArray)};`).join('\n')}
}

/**
 * ${name} sort order
 */
export type ${name}SortOrder = {
${fields.filter(f => !f.isComputed && !f.isArray).map(f => `  ${f.name}?: 'asc' | 'desc';`).join('\n')}
};

/**
 * ${name} with relations
 */
export interface ${name}WithRelations extends ${name} {
${relations.map(r => `  ${r.name}: ${r.model}${r.type === 'one-to-many' ? '[]' : ''};`).join('\n')}
}
`;
  }

  private generateImports(model: ModelConfig): string {
    const imports = new Set<string>();
    
    model.relations.forEach(r => {
      if (r.model !== model.name) {
        imports.add(r.model);
      }
    });
    
    if (imports.size === 0) return '';
    
    return `import type { ${Array.from(imports).join(', ')} } from './index';\n`;
  }

  private getTypeScriptType(type: string, isArray: boolean): string {
    const typeMap: Record<string, string> = {
      'String': 'string',
      'Int': 'number',
      'BigInt': 'bigint',
      'Float': 'number',
      'Decimal': 'number',
      'Boolean': 'boolean',
      'DateTime': 'Date',
      'Json': 'any',
      'Bytes': 'Buffer'
    };
    
    const tsType = typeMap[type] || type;
    return isArray ? `${tsType}[]` : tsType;
  }

  private getFilterType(type: string, isArray: boolean): string {
    if (isArray) {
      return `{ has?: ${this.getTypeScriptType(type, false)}; hasSome?: ${this.getTypeScriptType(type, false)}[]; hasEvery?: ${this.getTypeScriptType(type, false)}[]; isEmpty?: boolean }`;
    }
    
    const baseType = this.getTypeScriptType(type, false);
    
    if (type === 'String') {
      return `${baseType} | { equals?: ${baseType}; not?: ${baseType}; in?: ${baseType}[]; notIn?: ${baseType}[]; contains?: ${baseType}; startsWith?: ${baseType}; endsWith?: ${baseType} }`;
    }
    
    if (['Int', 'Float', 'Decimal', 'DateTime'].includes(type)) {
      return `${baseType} | { equals?: ${baseType}; not?: ${baseType}; in?: ${baseType}[]; notIn?: ${baseType}[]; lt?: ${baseType}; lte?: ${baseType}; gt?: ${baseType}; gte?: ${baseType} }`;
    }
    
    return `${baseType} | { equals?: ${baseType}; not?: ${baseType}; in?: ${baseType}[]; notIn?: ${baseType}[] }`;
  }

  private getOmittedFields(fields: FieldConfig[]): string {
    const autoFields = fields
      .filter(f => f.isComputed || f.defaultValue === 'autoincrement()')
      .map(f => ` | '${f.name}'`)
      .join('');
    
    return autoFields;
  }

  /**
   * Generate React Query hooks for a model
   */
  private generateHooks(model: ModelConfig): string {
    const { name } = model;
    const lowerName = name.charAt(0).toLowerCase() + name.slice(1);
    
    return `// Generated Hooks for ${name}
// DO NOT EDIT - Auto-generated by CompleteEntityGenerator

'use client';

import { useQuery, useMutation, useQueryClient, useInfiniteQuery, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import type { ${name}, Create${name}Input, Update${name}Input, ${name}Filter, ${name}SortOrder, ${name}WithRelations } from '../types/${lowerName}-types';
import { ${lowerName}Api } from '../api/${lowerName}/${lowerName}Api';

/**
 * Hook to fetch a single ${name} by ID
 */
export function use${name}(
  id: string | undefined,
  options?: Omit<UseQueryOptions<${name} | null>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['${lowerName}', id],
    queryFn: () => id ? ${lowerName}Api.getById(id) : null,
    enabled: !!id,
    ...options
  });
}

/**
 * Hook to fetch ${name} list with filtering and sorting
 */
export function use${name}List(
  filter?: ${name}Filter,
  sortOrder?: ${name}SortOrder,
  options?: Omit<UseQueryOptions<${name}[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['${lowerName}', 'list', filter, sortOrder],
    queryFn: () => ${lowerName}Api.getAll(filter, sortOrder),
    ...options
  });
}

/**
 * Hook to fetch ${name} with relations
 */
export function use${name}WithRelations(
  id: string | undefined,
  options?: Omit<UseQueryOptions<${name}WithRelations | null>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['${lowerName}', 'withRelations', id],
    queryFn: () => id ? ${lowerName}Api.getWithRelations(id) : null,
    enabled: !!id,
    ...options
  });
}

/**
 * Hook to create a new ${name}
 */
export function useCreate${name}(
  options?: UseMutationOptions<${name}, Error, Create${name}Input>
) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Create${name}Input) => ${lowerName}Api.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${lowerName}'] });
    },
    ...options
  });
}

/**
 * Hook to update an existing ${name}
 */
export function useUpdate${name}(
  options?: UseMutationOptions<${name}, Error, Update${name}Input>
) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Update${name}Input) => ${lowerName}Api.update(data.id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['${lowerName}'] });
      queryClient.setQueryData(['${lowerName}', data.id], data);
    },
    ...options
  });
}

/**
 * Hook to delete a ${name}
 */
export function useDelete${name}(
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => ${lowerName}Api.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['${lowerName}'] });
      queryClient.removeQueries({ queryKey: ['${lowerName}', id] });
    },
    ...options
  });
}

/**
 * Hook for paginated ${name} list
 */
export function use${name}Paginated(
  page: number = 1,
  pageSize: number = 20,
  filter?: ${name}Filter,
  sortOrder?: ${name}SortOrder,
  options?: Omit<UseQueryOptions<{ data: ${name}[]; total: number; page: number; pageSize: number }>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['${lowerName}', 'paginated', page, pageSize, filter, sortOrder],
    queryFn: () => ${lowerName}Api.getPaginated(page, pageSize, filter, sortOrder),
    ...options
  });
}

/**
 * Hook for infinite scroll ${name} list
 */
export function use${name}Infinite(
  pageSize: number = 20,
  filter?: ${name}Filter,
  sortOrder?: ${name}SortOrder
) {
  return useInfiniteQuery({
    queryKey: ['${lowerName}', 'infinite', filter, sortOrder],
    queryFn: ({ pageParam = 1 }) => 
      ${lowerName}Api.getPaginated(pageParam, pageSize, filter, sortOrder),
    getNextPageParam: (lastPage) => 
      lastPage.page * lastPage.pageSize < lastPage.total ? lastPage.page + 1 : undefined,
    initialPageParam: 1
  });
}
`;
  }

  /**
   * Generate API client for a model
   */
  private generateApi(model: ModelConfig): string {
    const { name } = model;
    const lowerName = name.charAt(0).toLowerCase() + name.slice(1);
    
    return `// Generated API Client for ${name}
// DO NOT EDIT - Auto-generated by CompleteEntityGenerator

import type { ${name}, Create${name}Input, Update${name}Input, ${name}Filter, ${name}SortOrder, ${name}WithRelations } from '../../types/${lowerName}-types';

class ${name}Api {
  private baseUrl = '/api/${lowerName}';

  /**
   * Fetch ${name} by ID
   */
  async getById(id: string): Promise<${name} | null> {
    const response = await fetch(\`\${this.baseUrl}/\${id}\`, {
      credentials: 'include',
    });
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(\`Failed to fetch ${name}: \${response.statusText}\`);
    }
    return response.json();
  }

  /**
   * Fetch all ${name} with optional filtering and sorting
   */
  async getAll(filter?: ${name}Filter, sortOrder?: ${name}SortOrder): Promise<${name}[]> {
    const params = new URLSearchParams();
    if (filter) params.append('filter', JSON.stringify(filter));
    if (sortOrder) params.append('sortOrder', JSON.stringify(sortOrder));
    
    const response = await fetch(\`\${this.baseUrl}?\${params}\`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(\`Failed to fetch ${name} list: \${response.statusText}\`);
    }
    return response.json();
  }

  /**
   * Fetch ${name} with relations
   */
  async getWithRelations(id: string): Promise<${name}WithRelations | null> {
    const response = await fetch(\`\${this.baseUrl}/\${id}?include=relations\`, {
      credentials: 'include',
    });
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(\`Failed to fetch ${name} with relations: \${response.statusText}\`);
    }
    return response.json();
  }

  /**
   * Create a new ${name}
   */
  async create(data: Create${name}Input): Promise<${name}> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || \`Failed to create ${name}\`);
    }
    return response.json();
  }

  /**
   * Update an existing ${name}
   */
  async update(id: string, data: Partial<Update${name}Input>): Promise<${name}> {
    const response = await fetch(\`\${this.baseUrl}/\${id}\`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || \`Failed to update ${name}\`);
    }
    return response.json();
  }

  /**
   * Delete a ${name}
   */
  async delete(id: string): Promise<void> {
    const response = await fetch(\`\${this.baseUrl}/\${id}\`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || \`Failed to delete ${name}\`);
    }
  }

  /**
   * Get paginated ${name} list
   */
  async getPaginated(
    page: number,
    pageSize: number,
    filter?: ${name}Filter,
    sortOrder?: ${name}SortOrder
  ): Promise<{ data: ${name}[]; total: number; page: number; pageSize: number }> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());
    if (filter) params.append('filter', JSON.stringify(filter));
    if (sortOrder) params.append('sortOrder', JSON.stringify(sortOrder));
    
    const response = await fetch(\`\${this.baseUrl}?\${params}\`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(\`Failed to fetch paginated ${name} list: \${response.statusText}\`);
    }
    return response.json();
  }
}

export const ${lowerName}Api = new ${name}Api();
`;
  }

  /**
   * Generate admin-specific API route for ImageUpload at /api/admin/blobs
   * This is a convenience route for admin blob management with admin-only access
   */
  private generateAdminBlobsRoute(model: ModelConfig): string {
    if (model.name !== 'ImageUpload') {
      return '';
    }
    
    return `// Generated Admin API Route for ImageUpload (admin/blobs)
// DO NOT EDIT - Auto-generated by CompleteEntityGenerator

import type { AuthUser } from '@/lib/auth';
import { OrderBy, SortOrder } from '@zenstackhq/orm';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/blobs
 * Fetch all blob uploads with optional filtering (ADMIN ONLY)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = createClient(user);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const blobs = await db.imageUpload.findMany({
      skip: (page - 1) * pageSize as unknown as number,
      take: pageSize as unknown as number,
      orderBy: { createdAt: 'desc' as unknown as SortOrder & { [x: string]: SortOrder; [x: number]: SortOrder; } & { [x: string]: OrderBy<any, any, true, false>; [x: number]: OrderBy<any, any, true, false>; } }
    });

    const total = await db.imageUpload.count() as unknown as number;

    return NextResponse.json({
      success: true,
      data: blobs,
      pagination: {
        total,
        page,
        pageSize,
        hasMore: (page - 1) * pageSize + blobs.length < total
      }
    });
  } catch (error) {
    console.error('Error fetching blobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blobs' },
      { status: 500 }
    );
  }
}
`;
  }

  /**
   * Generate admin-specific API route by ID for ImageUpload at /api/admin/blobs/[id]
   */
  private generateAdminBlobsRouteById(model: ModelConfig): string {
    if (model.name !== 'ImageUpload') {
      return '';
    }
    
    return `// Generated Admin API Route for ImageUpload by ID (admin/blobs/[id])
// DO NOT EDIT - Auto-generated by CompleteEntityGenerator

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { del } from '@vercel/blob';
import type { AuthUser } from '@/lib/auth';

/**
 * GET /api/admin/blobs/[id]
 * Get a specific blob upload (ADMIN ONLY)
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = createClient(user as unknown as AuthUser);
    const { id } = await context.params;
    const blob = await db.imageUpload.findUnique({ where: { id } });
    
    if (!blob) {
      return NextResponse.json({ error: 'Blob not found' }, { status: 404 });
    }
    
    return NextResponse.json(blob);
  } catch (error) {
    console.error('Error fetching blob:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blob' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/blobs/[id]
 * Delete a blob upload (ADMIN ONLY)
 * Also deletes from Vercel Blob storage
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = createClient(user as unknown as AuthUser);
    const { id } = await context.params;
    
    const blob = await db.imageUpload.findUnique({ where: { id } });
    if (!blob) {
      return NextResponse.json({ error: 'Blob not found' }, { status: 404 });
    }
    
    // Delete from Vercel Blob storage
    try {
      await del(blob.originalUrl);
    } catch (blobError) {
      console.warn('Failed to delete blob from Vercel storage:', blobError);
      // Continue with database deletion even if blob deletion fails
    }
    
    // Delete from database
    await db.imageUpload.delete({ where: { id } });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting blob:', error);
    return NextResponse.json(
      { error: 'Failed to delete blob' },
      { status: 500 }
    );
  }
}
`;
  }

  /**
   * Generate Next.js API route for a model
   */
  private generateApiRoute(model: ModelConfig): string {
    const { name, accessControl } = model;
    const lowerName = name.charAt(0).toLowerCase() + name.slice(1);
    
    // Try template first, fallback to hardcoded generation
    if (templateLoader.templateExists('route-template.ts')) {
      try {
        const template = templateLoader.loadTemplate('route-template.ts');
        if (template && template.trim().length > 0) {
          const baseRoute = templateLoader.processTemplate(template, {
            modelName: name,
            lowerModelName: lowerName,
            authRequired: !accessControl.publicRead ? 'true' : 'false',
            userContext: 'true',
          });
          // Verify template was processed correctly
          if (baseRoute && baseRoute.includes(name) && baseRoute.includes(lowerName)) {
            return this.enhanceRouteFromTemplate(baseRoute, model);
          } else {
            console.warn(`⚠️  Template processing failed for ${name}, falling back to hardcoded generation`);
          }
        }
      } catch (error) {
        console.warn(`⚠️  Template loading failed for ${name}: ${error}, falling back to hardcoded generation`);
      }
    }
    
    // Fallback to hardcoded generation (always reliable)
    const stripeComment = usesStripePayment(name)
      ? `\n// ✅ Stripe Payment: ${getStripePaymentRouteComment(name)}`
      : '';
    return `// Generated API Route for ${name}
// DO NOT EDIT - Auto-generated by CompleteEntityGenerator
// ✅ Edge Runtime Compatible: Uses only Edge-compatible APIs
// ✅ ZenStack v3 ORM: Uses createClient(user) not PrismaClient
// ✅ Access Control: Respects ZenStack @@allow/@@deny rules${this.isQTechModel(name) ? '\n// ✅ QTech Integration: Includes QTech-specific validation' : ''}${stripeComment}

import type { AuthUser } from '@/lib/auth';
import type { ${name}Filter, ${name}SortOrder } from '@/generated/types/${lowerName}-types';
import { OrderBy, SortOrder } from '@zenstackhq/orm';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/db';
import { AuditActivityLogger } from '@/lib/services/audit-activity-logger';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/${lowerName}
 * Fetch all ${name} with optional filtering and pagination
 */
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

    const sessionGet = await getCurrentUser(request);
    
    ${!accessControl.publicRead ? `if (!sessionGet) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }` : `// ✅ Allow public access for ${lowerName} - ZenStack access policies will filter appropriately`}

    // Create database client with user context
    let db;
    try {
      db = createClient(sessionGet as unknown as AuthUser);
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
    
    let filter: ${name}Filter | undefined;
    let sortOrder: ${name}SortOrder | undefined;

    try {
      const filterParam = searchParams.get('filter');
      if (filterParam) {
        filter = JSON.parse(filterParam) as ${name}Filter;
      }
      const sortOrderParam = searchParams.get('sortOrder');
      if (sortOrderParam) {
        sortOrder = JSON.parse(sortOrderParam) as ${name}SortOrder;
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
        db.${lowerName}.findMany({
      where: filter as any,
      orderBy: (sortOrder || { createdAt: 'desc' }) as unknown as SortOrder & { [x: string]: SortOrder; [x: number]: SortOrder; } & { [x: string]: OrderBy<any, any, true, false>; [x: number]: OrderBy<any, any, true, false>; },
      skip: (page - 1) * pageSize as unknown as number,
      take: pageSize as unknown as number
        }),
        db.${lowerName}.count({ where: filter as any }) as unknown as number
      ]);
    } catch (queryError) {
      console.error('Database query error:', queryError);
      return NextResponse.json(
        {
          success: false,
          error: 'Database query failed',
          message: queryError instanceof Error ? queryError.message : 'Failed to fetch ${name} from database',
        },
        { status: 500 },
      );
    }

    ${name === 'Documentation' ? `
    // Extract categories from documentation
    const categories = [...new Set(data.map(doc => doc.category).filter(Boolean))];

    return NextResponse.json({
      documentation: data,
      categories,
      pagination: {
        total,
        page,
        pageSize,
        hasMore: (page - 1) * pageSize + data.length < total
      }
    });` : `
    return NextResponse.json({
      success: true,
      data,
      count: data.length,
      pagination: {
        total,
        page,
        pageSize,
        hasMore: (page - 1) * pageSize + data.length < total,
        totalPages: Math.ceil(total / pageSize)
      }
    });`}
  } catch (error) {
    console.error('Error fetching ${name}:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch ${name}';
    return NextResponse.json(
      { 
        error: 'Failed to fetch ${name}',
        message: errorMessage,
        details: error instanceof Error ? error.stack : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/${lowerName}
 * Create a new ${name}
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user with request parameter
    let sessionPost;
    try {
      sessionPost = await getCurrentUser(request);
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

    if (!sessionPost) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create database client with user context
    let db;
    try {
      db = createClient(sessionPost as unknown as AuthUser);
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

    ${this.generateDateFieldCleaning(model)}

    // Get session metadata for audit logging
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    ${this.generateTokenValidationLogic(model)}

    // Create entity
    let ${lowerName}Created;
    try {
      ${lowerName}Created = await db.${lowerName}.create({
      data: cleanedData
    });
    } catch (createError) {
      console.error('Database create error:', createError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create ${name}',
          message: createError instanceof Error ? createError.message : 'Database create operation failed',
        },
        { status: 500 },
      );
    }

    // Log creation with audit and activity tracking
    try {
    await AuditActivityLogger.logCreate(
      '${name}',
      ${lowerName}Created.id,
      sessionPost.id,
      ${lowerName}Created,
      {
        ipAddress,
        userAgent,
        source: 'api',
      }
    );
    } catch (auditError) {
      // Log audit error but don't fail the creation
      console.error('Audit logging error:', auditError);
    }

    return NextResponse.json(${lowerName}Created, { status: 201 });
  } catch (error) {
    // Catch-all for unexpected errors
    console.error('Unexpected error creating ${name}:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create ${name}';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: errorMessage,
        ...(process.env.NODE_ENV === 'development' && errorStack ? { details: errorStack } : {})
      },
      { status: 500 }
    );
  }
}
`;
  }

  /**
   * Generate API route for src/generated/api/ location (with correct import paths)
   * This is a variant of generateApiRoute with adjusted import paths for src/generated/api/
   */
  private generateApiRouteForGeneratedApi(model: ModelConfig): string {
    const { name, accessControl } = model;
    const lowerName = name.charAt(0).toLowerCase() + name.slice(1);
    
    // Same as generateApiRoute but with correct import paths for src/generated/api/
    return `// Generated API Route for ${name}
// DO NOT EDIT - Auto-generated by CompleteEntityGenerator
// ✅ Edge Runtime Compatible: Uses only Edge-compatible APIs
// ✅ ZenStack v3 ORM: Uses createClient(user) not PrismaClient
// ✅ Access Control: Respects ZenStack @@allow/@@deny rules${this.isQTechModel(name) ? '\n// ✅ QTech Integration: Includes QTech-specific validation' : ''}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db';
import { AuditActivityLogger } from '@/lib/services/audit-activity-logger';
import type { AuthUser } from '@/lib/auth';
import { getCurrentUser } from '@/lib/auth';
import type { ${name}Filter, ${name}SortOrder } from '@/generated/types/${lowerName}-types';

/**
 * GET /api/${lowerName}
 * Fetch all ${name} with optional filtering and pagination
 */
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
      ${!accessControl.publicRead ? `return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        },
        { status: 401 },
      );` : `// ✅ Allow public access for ${lowerName} - ZenStack access policies will filter appropriately
      user = null;`}
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
    
    let filter: ${name}Filter | undefined;
    let sortOrder: ${name}SortOrder | undefined;

    try {
      const filterParam = searchParams.get('filter');
      if (filterParam) {
        filter = JSON.parse(filterParam) as ${name}Filter;
      }
      const sortOrderParam = searchParams.get('sortOrder');
      if (sortOrderParam) {
        sortOrder = JSON.parse(sortOrderParam) as ${name}SortOrder;
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
        db.${lowerName}.findMany({
      where: filter as any,
      orderBy: (sortOrder || { createdAt: 'desc' }) as unknown as SortOrder & { [x: string]: SortOrder; [x: number]: SortOrder; } & { [x: string]: OrderBy<any, any, true, false>; [x: number]: OrderBy<any, any, true, false>; },
      skip: (page - 1) * pageSize as unknown as number,
      take: pageSize as unknown as number
        }),
        db.${lowerName}.count({ where: filter as any }) as unknown as number
      ]);
    } catch (queryError) {
      console.error('Database query error:', queryError);
      return NextResponse.json(
        {
          success: false,
          error: 'Database query failed',
          message: queryError instanceof Error ? queryError.message : 'Failed to fetch ${name} from database',
        },
        { status: 500 },
      );
    }

    ${name === 'Documentation' ? `
    // Extract categories from documentation
    const categories = [...new Set(data.map(doc => doc.category).filter(Boolean))];

    return NextResponse.json({
      documentation: data,
      categories,
      pagination: {
        total,
        page,
        pageSize,
        hasMore: (page - 1) * pageSize + data.length < total
      }
    });` : `
    return NextResponse.json({
      success: true,
      data,
      count: data.length,
      pagination: {
        total,
        page,
        pageSize,
        hasMore: (page - 1) * pageSize + data.length < total,
        totalPages: Math.ceil(total / pageSize)
      }
    });`}
  } catch (error) {
    console.error('Error fetching ${name}:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch ${name}';
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch ${name}',
        message: errorMessage,
        details: error instanceof Error ? error.stack : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/${lowerName}
 * Create a new ${name}
 */
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
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        },
        { status: 401 }
      );
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
    
    ${this.generateDateFieldCleaning(model)}
    
    // Get session metadata for audit logging
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;
    
    ${this.generateTokenValidationLogic(model)}
    
    // Create entity
    let ${lowerName}Created;
    try {
      ${lowerName}Created = await db.${lowerName}.create({
      data: cleanedData
    });
    } catch (createError) {
      console.error('Database create error:', createError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create ${name}',
          message: createError instanceof Error ? createError.message : 'Database create operation failed',
        },
        { status: 500 },
      );
    }
    
    // Log creation with audit and activity tracking
    try {
    await AuditActivityLogger.logCreate(
      '${name}',
      ${lowerName}Created.id,
      user.id,
      ${lowerName}Created,
      { ipAddress, userAgent, source: 'api' }
    );
    } catch (auditError) {
      // Log audit error but don't fail the creation
      console.error('Audit logging error:', auditError);
    }
    
    return NextResponse.json(
      {
        success: true,
        data: ${lowerName}Created,
      },
      { status: 201 }
    );
  } catch (error) {
    // Catch-all for unexpected errors
    console.error('Unexpected error creating ${name}:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create ${name}';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: errorMessage,
        ...(process.env.NODE_ENV === 'development' && errorStack ? { details: errorStack } : {}),
      },
      { status: 500 }
    );
  }
}
`;
  }

  /**
   * Generate pluralized API route with Zod validation (for manually edited patterns)
   * Used for endpoints like addressbooks.ts, wishlistitems.ts, aiinteractions.ts
   */
  private generatePluralApiRoute(model: ModelConfig): string {
    const { name, fields, relations } = model;
    const lowerName = name.charAt(0).toLowerCase() + name.slice(1);
    const pluralName = this.getPluralForm(lowerName);
    
    // Generate Zod schema for create - use key fields only
    const keyFields = fields.filter(f => 
      !['id', 'createdAt', 'updatedAt'].includes(f.name) &&
      !f.isComputed &&
      f.type !== 'Json'
    ).slice(0, 10); // Limit to prevent overly large schemas
    
    const requiredFields = keyFields.filter(f => !f.isOptional);
    const optionalFields = keyFields.filter(f => f.isOptional);
    
    const createSchemaFields = requiredFields.length > 0 ? requiredFields.map(f => {
      const zodType = this.getZodType(f);
      return `  ${f.name}: ${zodType},`;
    }).join('\n') : '  // No required fields';
    
    const updateSchemaFields = optionalFields.length > 0 ? optionalFields.map(f => {
      const zodType = this.getZodType(f);
      return `  ${f.name}: ${zodType}.optional(),`;
    }).join('\n') : '  // No optional fields';
    
    // Generate query schema based on common filterable fields
    const queryFields = fields.filter(f => 
      ['String', 'Int', 'Boolean'].includes(f.type) &&
      !['id', 'createdAt', 'updatedAt'].includes(f.name)
    ).slice(0, 5);
    
    const querySchemaFields = [
      `  page: z.string().optional().transform(val => val ? parseInt(val) : 1),`,
      `  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),`,
      `  search: z.string().optional(),`,
      ...queryFields.map(f => `  ${f.name}: z.string().optional(),`)
    ].join('\n');
    
    // Generate buildWhereClause function
    const whereClauseFields = queryFields.map(f => {
      if (f.type === 'String') {
        return `  if (query.${f.name}) where.${f.name} = query.${f.name};`;
      } else if (f.type === 'Boolean') {
        return `  if (query.${f.name}) where.${f.name} = query.${f.name} === 'true';`;
      }
      return `  if (query.${f.name}) where.${f.name} = query.${f.name};`;
    }).join('\n');
    
    // Generate search OR clause if there are string fields
    const stringFields = fields.filter(f => f.type === 'String' && !['id'].includes(f.name)).slice(0, 2);
    const searchOrClause = stringFields.length > 0 ? `
  if (query.search) {
    where.OR = [
${stringFields.map(f => `      { ${f.name}: { contains: query.search, mode: 'insensitive' } }`).join(',\n')}
    ];
  }` : '';
    
    // Generate include relations
    const includeRelations = relations.length > 0 ? relations.slice(0, 5).map(r => `          ${r.name}: true`).join(',\n') : '';
    const includeBlock = includeRelations ? `\n        include: {\n${includeRelations}\n        },` : '';
    
    return `import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db';
import { AuditActivityLogger } from '@/lib/services/audit-activity-logger';
import type { AuthUser } from '@/lib/auth';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

// Enhanced validation schemas
const create${name}Schema = z.object({
${createSchemaFields}
});

const update${name}Schema = z.object({
${updateSchemaFields}
});

const querySchema = z.object({
${querySchemaFields}
});

// Build where clause for filtering and search
function buildWhereClause(query: any) {
  const where: any = {};

${whereClauseFields}${searchOrClause}

  return where;
}

/**
 * GET /api/${pluralName} - List ${pluralName} with advanced filtering and pagination
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
      db.${lowerName}.findMany({
        where,${includeBlock}
        orderBy: { createdAt: 'desc' as unknown as SortOrder & { [x: string]: SortOrder; [x: number]: SortOrder; } & { [x: string]: OrderBy<any, any, true, false>; [x: number]: OrderBy<any, any, true, false>; } },
        skip: (query.page - 1) * query.limit as unknown as number,
        take: query.limit as unknown as number
      }),
      db.${lowerName}.count({ where }) as unknown as number
    ]);

    // Response with pagination metadata
    return NextResponse.json({
      ${pluralName}: items,
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

    console.error('Error fetching ${pluralName}:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ${pluralName}' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/${pluralName} - Create a new ${lowerName}
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
    const validatedData = create${name}Schema.parse(body);

    // Create database client with user context for access control
    const db = createClient(currentUser as unknown as AuthUser);

    // Create entity with business logic
    const item = await db.${lowerName}.create({
      data: {
${requiredFields.length > 0 ? requiredFields.map(f => `        ${f.name}: validatedData.${f.name},`).join('\n') : '        // No required fields'}
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: item,
      },
      { status: 201 }
    );
  } catch (error) {
    // Enhanced error handling
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating ${lowerName}:', error);
    return NextResponse.json(
      { error: 'Failed to create ${lowerName}' },
      { status: 500 }
    );
  }
}
`;
  }

  /**
   * Check if a model needs a pluralized API endpoint
   * Based on manually edited files in src/generated/api/
   */
  private needsPluralEndpoint(modelName: string): boolean {
    const pluralModels = [
      'AddressBook', 'Address', 'WishlistItem', 'AIInteraction', 'AuditLog',
      'BlockchainBalance', 'BlockchainContract', 'BlogPost', 'CartItem', 'Cart',
      'Category', 'ChatMessage', 'ChatSession', 'Comment', 'ContractCall',
      'ContractEvent', 'CustomTheme', 'DatabaseAnalytics', 'DataSyncConfig',
      'GovernanceProposal', 'MerchantTheme', 'Notification', 'OrderItem', 'Order',
      'Payment', 'Product', 'ProductVariant', 'Review', 'SystemConfig',
      'TokenizedAsset', 'UserPreference', 'User', 'VendorProfile'
    ];
    return pluralModels.includes(modelName);
  }

  /**
   * Get plural form of a word (simple implementation)
   */
  private getPluralForm(word: string): string {
    // Handle common pluralization rules
    if (word.endsWith('y') && !['ay', 'ey', 'iy', 'oy', 'uy'].some(suffix => word.endsWith(suffix))) {
      return word.slice(0, -1) + 'ies';
    } else if (word.endsWith('s') || word.endsWith('x') || word.endsWith('z') || word.endsWith('ch') || word.endsWith('sh')) {
      return word + 'es';
    } else if (word.endsWith('f')) {
      return word.slice(0, -1) + 'ves';
    } else if (word.endsWith('fe')) {
      return word.slice(0, -2) + 'ves';
    }
    return word + 's';
  }

  /**
   * Get Zod type for a field
   */
  private getZodType(field: FieldConfig): string {
    switch (field.type) {
      case 'String':
        return 'z.string()';
      case 'Int':
        return 'z.number().int()';
      case 'Float':
      case 'Decimal':
        return 'z.number()';
      case 'Boolean':
        return 'z.boolean()';
      case 'DateTime':
        return 'z.string()'; // Accept string, will be converted
      case 'Json':
        return 'z.any()';
      default:
        if (field.isEnum && field.enumValues && field.enumValues.length > 0) {
          return `z.enum([${field.enumValues.map(v => `'${v}'`).join(', ')}])`;
        }
        return 'z.string()';
    }
  }

  /**
   * Enhance route template with model-specific logic
   */
  private enhanceRouteFromTemplate(baseRoute: string, model: ModelConfig): string {
    const { name, accessControl } = model;
    const lowerName = name.charAt(0).toLowerCase() + name.slice(1);

    // Prepend Stripe payment notice for entities that use Stripe
    if (usesStripePayment(name)) {
      const stripeComment = `// ✅ Stripe Payment: ${getStripePaymentRouteComment(name)}\n`;
      const firstComment = baseRoute.match(/^\/\/[^\n]*/m);
      if (firstComment) {
        baseRoute = stripeComment + baseRoute;
      }
    }

    // Check if model-specific imports already exist (from template)
    const modelFilterType = `${name}Filter`;
    const modelSortOrderType = `${name}SortOrder`;
    const hasModelImports = baseRoute.includes(modelFilterType) && baseRoute.includes(modelSortOrderType);
    
    // Only add imports if they don't already exist
    if (!hasModelImports) {
      const modelImports = `import type { ${name}Filter, ${name}SortOrder } from '@/generated/types/${lowerName}-types';
import { AuditActivityLogger } from '@/lib/services/audit-activity-logger';
import type { AuthUser } from '@/lib/auth';`;
      
      // Find the first import line and add model-specific imports after it
      const importMatch = baseRoute.match(/^import[^;]+;/m);
      if (importMatch) {
        const firstImportIndex = baseRoute.indexOf(importMatch[0]);
        const afterFirstImport = baseRoute.indexOf('\n', firstImportIndex) + 1;
        baseRoute = baseRoute.slice(0, afterFirstImport) + modelImports + '\n' + baseRoute.slice(afterFirstImport);
      }
    }
    
    // Remove duplicate imports if any
    let enhanced = baseRoute;
    const importLines = enhanced.match(/^import[^;]+;/gm) || [];
    const seenImports = new Set<string>();
    const uniqueImports: string[] = [];
    
    for (const importLine of importLines) {
      const normalized = importLine.trim();
      if (!seenImports.has(normalized)) {
        seenImports.add(normalized);
        uniqueImports.push(importLine);
      }
    }
    
    // Replace all imports with unique ones
    if (importLines.length !== uniqueImports.length) {
      const firstImportIndex = enhanced.indexOf(importLines.map[0]);  
      const lastImportIndex = enhanced.lastIndexOf(importLines[importLines.length - 1]) + importLines[importLines.length - 1].length;
      const beforeImports = enhanced.slice(0, firstImportIndex);
      const afterImports = enhanced.slice(lastImportIndex);
      enhanced = beforeImports + uniqueImports.join('\n') + '\n' + afterImports;
    }
    
    // Replace placeholder comments with actual implementation (if they exist)
    enhanced = enhanced
      .replace('// Query logic here', this.generateQueryLogic(model))
      .replace('// Create logic here', this.generateCreateLogic(model));
    
    // Check if handlers already exist by looking for function declarations
    const hasGetHandler = /export async function GET\s*\(/m.test(enhanced);
    const hasPostHandler = /export async function POST\s*\(/m.test(enhanced);
    
    // If template already has complete handlers, don't replace them
    // The template handlers are already model-specific after variable replacement
    if (hasGetHandler && hasPostHandler) {
      // Template has complete handlers - just return enhanced route with fixed imports
      return enhanced;
    }
    
    // Only add/replace handlers if they don't exist in template
    // Replace GET handler if it exists, otherwise add it
    if (hasGetHandler) {
      // Find and replace the GET handler using brace counting for nested structures
      const getStartIndex = enhanced.indexOf('export async function GET');
      if (getStartIndex !== -1) {
        // Find the matching closing brace
        let braceCount = 0;
        let i = getStartIndex;
        let foundStart = false;
        while (i < enhanced.length) {
          if (enhanced[i] === '{') {
            braceCount++;
            foundStart = true;
          } else if (enhanced[i] === '}') {
            braceCount--;
            if (foundStart && braceCount === 0) {
              // Found the end of the function
              const getEndIndex = i + 1;
              const beforeGet = enhanced.slice(0, getStartIndex);
              const afterGet = enhanced.slice(getEndIndex);
              enhanced = beforeGet + this.generateGetHandler(model) + '\n' + afterGet;
              break;
            }
          }
          i++;
        }
      }
    } else {
      // Handler doesn't exist, add it before POST handler or at the end
      const postHandlerIndex = enhanced.indexOf('export async function POST');
      if (postHandlerIndex !== -1) {
        enhanced = enhanced.slice(0, postHandlerIndex) + 
                   this.generateGetHandler(model) + '\n\n' + 
                   enhanced.slice(postHandlerIndex);
      } else {
        enhanced += '\n\n' + this.generateGetHandler(model);
      }
    }
    
    // Replace POST handler if it exists, otherwise add it
    if (hasPostHandler) {
      // Find and replace the POST handler using brace counting
      const postStartIndex = enhanced.indexOf('export async function POST');
      if (postStartIndex !== -1) {
        // Find the matching closing brace
        let braceCount = 0;
        let i = postStartIndex;
        let foundStart = false;
        while (i < enhanced.length) {
          if (enhanced[i] === '{') {
            braceCount++;
            foundStart = true;
          } else if (enhanced[i] === '}') {
            braceCount--;
            if (foundStart && braceCount === 0) {
              // Found the end of the function
              const postEndIndex = i + 1;
              const beforePost = enhanced.slice(0, postStartIndex);
              const afterPost = enhanced.slice(postEndIndex);
              enhanced = beforePost + this.generatePostHandler(model) + (afterPost.trim() ? '\n' + afterPost : '');
              break;
            }
          }
          i++;
        }
      }
    } else {
      // Handler doesn't exist, add it at the end
      enhanced += '\n\n' + this.generatePostHandler(model);
    }
    
    return enhanced;
  }

  /**
   * Generate query logic for GET handler
   */
  private generateQueryLogic(model: ModelConfig): string {
    const { name } = model;
    const lowerName = name.charAt(0).toLowerCase() + name.slice(1);
    
    return `const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const filter = searchParams.get('filter') 
      ? JSON.parse(searchParams.get('filter')!) as ${name}Filter
      : undefined;
    const sortOrder = searchParams.get('sortOrder')
      ? JSON.parse(searchParams.get('sortOrder')!) as ${name}SortOrder
      : undefined;

    const data = await db.${lowerName}.findMany({
      where: filter as any,
      orderBy: (sortOrder || { createdAt: 'desc' }) as unknown as SortOrder & { [x: string]: SortOrder; [x: number]: SortOrder; } & { [x: string]: OrderBy<any, any, true, false>; [x: number]: OrderBy<any, any, true, false>; },
      skip: (page - 1) * pageSize as unknown as number,
      take: pageSize as unknown as number
    });
    const total = await db.${lowerName}.count({ where: filter as any }) as unknown as number;`;
  }

  /**
   * Generate create logic for POST handler
   */
  private generateCreateLogic(model: ModelConfig): string {
    const { name } = model;
    const lowerName = name.charAt(0).toLowerCase() + name.slice(1);
    
    return `const body = await request.json();
    ${this.generateDateFieldCleaning(model)}
    
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;
    
    ${this.generateTokenValidationLogic(model)}
    
    const ${lowerName}Created = await db.${lowerName}.create({
      data: cleanedData
    });
    
    await AuditActivityLogger.logCreate(
      '${name}',
      ${lowerName}Created.id,
      user.id,
      ${lowerName}Created,
      { ipAddress, userAgent, source: 'api' }
    );`;
  }

  /**
   * Generate GET handler with model-specific logic
   */
  private generateGetHandler(model: ModelConfig): string {
    const { name, accessControl } = model;
    const lowerName = name.charAt(0).toLowerCase() + name.slice(1);
    
    return `export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    ${!accessControl.publicRead ? `if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }` : ''}
    
    const db = createClient(user as unknown as AuthUser);
    ${this.generateQueryLogic(model)}
    
    return NextResponse.json({
      success: true,
      data,
      pagination: {
        total,
        page,
        pageSize,
        hasMore: (page - 1) * pageSize + data.length < total
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
        ...(process.env.NODE_ENV === 'development' && errorStack ? { details: errorStack } : {}),
      },
      { status: 500 }
    );
  }
}`;
  }

  /**
   * Generate POST handler with model-specific logic
   */
  private generatePostHandler(model: ModelConfig): string {
    const { name } = model;
    const lowerName = name.charAt(0).toLowerCase() + name.slice(1);
    
    return `export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const db = createClient(user as unknown as AuthUser);
    ${this.generateCreateLogic(model)}
    
    return NextResponse.json(${lowerName}Created, { status: 201 });
  } catch (error) {
    // Catch-all for unexpected errors
    console.error('Unexpected error creating ${name}:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create ${name}';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: errorMessage,
        ...(process.env.NODE_ENV === 'development' && errorStack ? { details: errorStack } : {}),
      },
      { status: 500 }
    );
  }
}`;
  }

  /**
   * Generate token validation logic for token-related models
   */
  private generateTokenValidationLogic(model: ModelConfig): string {
    const { name } = model;
    const lowerName = name.charAt(0).toLowerCase() + name.slice(1);

    // Token validation for Investment creation
    if (name === 'Investment') {
      return `
    // ✅ TOKEN VALIDATION: Ensure sufficient tokens available
    if (cleanedData.realEstateAssetId && cleanedData.tokenAmount) {
      const asset = await db.realEstateAsset.findUnique({
        where: { id: cleanedData.realEstateAssetId },
        select: { totalTokens: true, soldTokens: true, tokenPrice: true, title: true }
      });

      if (!asset) {
        return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
      }

      const availableTokens = asset.totalTokens - (asset.soldTokens || 0);
      
      if (cleanedData.tokenAmount > availableTokens) {
        return NextResponse.json({
          error: 'Insufficient tokens available',
          available: availableTokens,
          requested: cleanedData.tokenAmount,
          asset: asset.title
        }, { status: 400 });
      }

      // Ensure investment amount matches token price
      const expectedAmount = cleanedData.tokenAmount * asset.tokenPrice;
      if (cleanedData.amount && Math.abs(cleanedData.amount - expectedAmount) > 0.01) {
        console.log(\`⚠️  Adjusting investment amount: \${cleanedData.amount} → \${expectedAmount}\`);
        cleanedData.amount = expectedAmount;
      }
    }`;
    }

    // Token validation for RealEstateAsset updates
    if (name === 'RealEstateAsset') {
      return `
    // ✅ TOKEN VALIDATION: Ensure token counts are consistent
    if (cleanedData.totalTokens !== undefined) {
      const currentSoldTokens = cleanedData.soldTokens || 0;
      
      if (currentSoldTokens > cleanedData.totalTokens) {
        return NextResponse.json({
          error: 'Invalid token configuration',
          message: \`Sold tokens (\${currentSoldTokens}) cannot exceed total tokens (\${cleanedData.totalTokens})\`
        }, { status: 400 });
      }

      // Auto-calculate available tokens
      cleanedData.availableTokens = cleanedData.totalTokens - currentSoldTokens;
    }`;
    }

    // Token validation for TokenHolder creation
    if (name === 'TokenHolder') {
      return `
    // ✅ TOKEN VALIDATION: Verify token holder doesn't exceed available tokens
    if (cleanedData.realEstateAssetId && cleanedData.tokenAmount) {
      const asset = await db.realEstateAsset.findUnique({
        where: { id: cleanedData.realEstateAssetId },
        select: { totalTokens: true, soldTokens: true, title: true }
      });

      if (!asset) {
        return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
      }

      const availableTokens = asset.totalTokens - (asset.soldTokens || 0);
      
      if (cleanedData.tokenAmount > availableTokens) {
        return NextResponse.json({
          error: 'Cannot create token holder',
          message: \`Requested \${cleanedData.tokenAmount} tokens but only \${availableTokens} available for \${asset.title}\`
        }, { status: 400 });
      }
    }`;
    }

    // QTech model validation
    if (this.isQTechModel(name)) {
      return this.generateQTechValidation(name);
    }

    return '// No token validation required for this model';
  }

  /**
   * Check if model is QTech-related
   */
  private isQTechModel(modelName: string): boolean {
    const qtechModels = [
      'UserQtechAccount',
      'QtechGame',
      'QtechTransaction',
      'QtechProvider',
      'QtechGameRound',
      'QtechErrorLog',
      'QtechBalanceSnapshot',
      'QtechNGRAggregation',
      'GamingSession'
    ];
    return qtechModels.includes(modelName);
  }

  /**
   * Generate QTech-specific validation logic
   */
  private generateQTechValidation(modelName: string): string {
    if (modelName === 'GamingSession') {
      return this.generateGamingSessionValidation();
    }
    
    if (modelName === 'UserQtechAccount') {
      return this.generateUserQtechAccountValidation();
    }
    
    return '// No QTech validation required for this model';
  }

  /**
   * Generate GamingSession validation
   */
  private generateGamingSessionValidation(): string {
    return `
    // ✅ QTech VALIDATION: Ensure user has active QTech account
    if (cleanedData.userId) {
      const qtechAccount = await db.userQtechAccount.findUnique({
        where: { userId: cleanedData.userId },
        select: { status: true, walletSessionId: true, lastKnownBalance: true }
      });

      if (!qtechAccount) {
        return NextResponse.json({
          error: 'QTech account not found',
          message: 'User must have a QTech account to start gaming session'
        }, { status: 404 });
      }

      if (qtechAccount.status !== 'ACTIVE') {
        return NextResponse.json({
          error: 'QTech account not active',
          message: 'User QTech account is not active'
        }, { status: 400 });
      }

      // Set initial balance from QTech account if not provided
      if (!cleanedData.initialBalance && qtechAccount.lastKnownBalance) {
        cleanedData.initialBalance = qtechAccount.lastKnownBalance.toNumber();
      }

      // Use existing wallet session or create new one
      if (qtechAccount.walletSessionId) {
        cleanedData.qtechSessionId = qtechAccount.walletSessionId;
      }
    }`;
  }

  /**
   * Generate UserQtechAccount validation
   */
  private generateUserQtechAccountValidation(): string {
    return `
    // ✅ QTech VALIDATION: Ensure user exists and is valid
    if (cleanedData.userId) {
      const user = await db.user.findUnique({
        where: { id: cleanedData.userId },
        select: { id: true, role: true }
      });

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Set default status if not provided
      if (!cleanedData.status) {
        cleanedData.status = 'ACTIVE';
      }
    }`;
  }

  /**
   * Generate token validation logic for token-related model updates
   */
  private generateTokenValidationLogicForUpdate(model: ModelConfig): string {
    const { name } = model;

    // Token validation for Investment updates
    if (name === 'Investment') {
      return `
    // ✅ TOKEN VALIDATION: Ensure sufficient tokens available for updates
    if (cleanedData.realEstateAssetId || cleanedData.tokenAmount) {
      const assetId = cleanedData.realEstateAssetId || old${name}.realEstateAssetId;
      const newTokenAmount = cleanedData.tokenAmount || old${name}.tokenAmount;
      const oldTokenAmount = old${name}.tokenAmount || 0;
      
      if (assetId && newTokenAmount !== oldTokenAmount) {
        const asset = await db.realEstateAsset.findUnique({
          where: { id: assetId },
          select: { totalTokens: true, soldTokens: true, tokenPrice: true, title: true }
        });

        if (!asset) {
          return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
        }

        // Calculate available tokens considering the current investment
        const availableTokens = asset.totalTokens - (asset.soldTokens || 0) + oldTokenAmount;
        
        if (newTokenAmount > availableTokens) {
          return NextResponse.json({
            error: 'Insufficient tokens available for update',
            available: availableTokens,
            requested: newTokenAmount,
            current: oldTokenAmount,
            asset: asset.title
          }, { status: 400 });
        }

        // Ensure investment amount matches token price
        const expectedAmount = newTokenAmount * asset.tokenPrice;
        if (cleanedData.amount && Math.abs(cleanedData.amount - expectedAmount) > 0.01) {
          console.log(\`⚠️  Adjusting investment amount: \${cleanedData.amount} → \${expectedAmount}\`);
          cleanedData.amount = expectedAmount;
        }
      }
    }`;
    }

    // Token validation for RealEstateAsset updates
    if (name === 'RealEstateAsset') {
      return `
    // ✅ TOKEN VALIDATION: Ensure token counts remain consistent on updates
    if (cleanedData.totalTokens !== undefined || cleanedData.soldTokens !== undefined) {
      const newTotalTokens = cleanedData.totalTokens !== undefined ? cleanedData.totalTokens : old${name}.totalTokens;
      const newSoldTokens = cleanedData.soldTokens !== undefined ? cleanedData.soldTokens : old${name}.soldTokens || 0;
      
      if (newSoldTokens > newTotalTokens) {
        return NextResponse.json({
          error: 'Invalid token configuration update',
          message: \`Sold tokens (\${newSoldTokens}) cannot exceed total tokens (\${newTotalTokens})\`
        }, { status: 400 });
      }

      // Auto-calculate available tokens
      cleanedData.availableTokens = newTotalTokens - newSoldTokens;
    }`;
    }

    // Token validation for TokenHolder updates
    if (name === 'TokenHolder') {
      return `
    // ✅ TOKEN VALIDATION: Verify token holder update doesn't exceed available tokens
    if (cleanedData.tokenAmount !== undefined) {
      const assetId = cleanedData.realEstateAssetId || old${name}.realEstateAssetId;
      const newTokenAmount = cleanedData.tokenAmount;
      const oldTokenAmount = old${name}.tokenAmount || 0;
      
      if (assetId && newTokenAmount !== oldTokenAmount) {
        const asset = await db.realEstateAsset.findUnique({
          where: { id: assetId },
          select: { totalTokens: true, soldTokens: true, title: true }
        });

        if (!asset) {
          return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
        }

        // Calculate available tokens considering the current holder
        const availableTokens = asset.totalTokens - (asset.soldTokens || 0) + oldTokenAmount;
        
        if (newTokenAmount > availableTokens) {
          return NextResponse.json({
            error: 'Cannot update token holder',
            message: \`Requested \${newTokenAmount} tokens but only \${availableTokens} available for \${asset.title}\`
          }, { status: 400 });
        }
      }
    }`;
    }

    // QTech model validation for updates
    if (this.isQTechModel(name)) {
      return this.generateQTechValidationForUpdate(name);
    }

    return '// No token validation required for this model update';
  }

  /**
   * Generate QTech-specific validation logic for updates
   */
  private generateQTechValidationForUpdate(modelName: string): string {
    if (modelName === 'GamingSession') {
      return `
    // ✅ QTech VALIDATION: Ensure QTech account is still active on update
    if (cleanedData.userId) {
      const qtechAccount = await db.userQtechAccount.findUnique({
        where: { userId: cleanedData.userId },
        select: { status: true }
      });

      if (!qtechAccount || qtechAccount.status !== 'ACTIVE') {
        return NextResponse.json({
          error: 'QTech account not active',
          message: 'Cannot update gaming session - QTech account is not active'
        }, { status: 400 });
      }
    }`;
    }
    
    return '// No QTech validation required for this model update';
  }

  /**
   * Generate Next.js API route for a single model instance
   */
  private generateApiRouteById(model: ModelConfig): string {
    const { name, relations, accessControl } = model;
    const lowerName = name.charAt(0).toLowerCase() + name.slice(1);
    
    // Generate include object for all relations
    const relationIncludes = relations
      .map(r => `      ${r.name}: true`)
      .join(',\n');
    
    return `// Generated API Route for ${name} by ID
// DO NOT EDIT - Auto-generated by CompleteEntityGenerator

import type { AuthUser } from '@/lib/auth';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/db';
import { AuditActivityLogger } from '@/lib/services/audit-activity-logger';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/${lowerName}/[id]
 * Fetch a single ${name} by ID
 * Query parameters:
 *   - include=relations: Include all relations
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Unwrap params for Next.js 15+ compatibility
    const params = await context.params;
    
    const session${name} = await getCurrentUser(request);
    
    ${!accessControl.publicRead ? `if (!session${name}) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }` : `// ✅ Allow public access for ${lowerName} - ZenStack access policies will filter appropriately`}

    const db = createClient(session${name} as unknown as AuthUser);

    // Check if relations should be included
    const { searchParams } = new URL(request.url);
    const includeRelations = searchParams.get('include') === 'relations';

    ${name === 'Documentation' ? `
    // Try to find by ID first, then by slug for Documentation
    let ${lowerName}Found = await db.${lowerName}.findUnique({
      where: { id: params.id },
      ...(includeRelations && {
        include: {
${relationIncludes}
        }
      })
    });

    // If not found by ID, try by slug for Documentation
    if (!${lowerName}Found) {
      ${lowerName}Found = await db.${lowerName}.findFirst({
        where: { 
          slug: params.id,
          isPublic: true,
          isActive: true
        },
        ...(includeRelations && {
          include: {
${relationIncludes}
          }
        })
      });
    }` : `
    const ${lowerName}Found = await db.${lowerName}.findUnique({
      where: { id: params.id },
      ...(includeRelations && {
        include: {
${relationIncludes}
        }
      })
    });`}

    if (!${lowerName}Found) {
      return NextResponse.json(
        { error: '${name} not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(${lowerName}Found);
  } catch (error) {
    console.error('Error fetching ${name}:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch ${name}';
    return NextResponse.json(
      { 
        error: 'Failed to fetch ${name}',
        message: errorMessage,
        details: error instanceof Error ? error.stack : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/${lowerName}/[id]
 * Update a ${name}
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Unwrap params for Next.js 15+ compatibility
    const params = await context.params;
    
    const session${name} = await getCurrentUser(request);
    
    if (!session${name}) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = createClient(session${name} as unknown as AuthUser);
    const body = await request.json();

    ${this.generateDateFieldCleaning(model)}

    // Get session metadata for audit logging
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    // Fetch old data before update for audit trail
    const old${name} = await db.${lowerName}.findUnique({
      where: { id: params.id }
    });

    if (!old${name}) {
      return NextResponse.json(
        { error: '${name} not found' },
        { status: 404 }
      );
    }

    ${this.generateTokenValidationLogicForUpdate(model)}

    // Update entity
    const ${lowerName}Updated = await db.${lowerName}.update({
      where: { id: params.id },
      data: cleanedData
    });

    // Log update with before/after data
    await AuditActivityLogger.logUpdate(
      '${name}',
      params.id,
      session${name}.id,
      old${name},
      ${lowerName}Updated,
      {
        ipAddress,
        userAgent,
        source: 'api',
      }
    );

    return NextResponse.json(${lowerName}Updated);
  } catch (error) {
    console.error('Error updating ${name}:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update ${name}';
    return NextResponse.json(
      { 
        error: 'Failed to update ${name}',
        message: errorMessage,
        details: error instanceof Error ? error.stack : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/${lowerName}/[id]
 * Delete a ${name}
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Unwrap params for Next.js 15+ compatibility
    const params = await context.params;
    
    const session${name} = await getCurrentUser(request);
    
    if (!session${name}) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = createClient(session${name} as unknown as AuthUser);

    // Get session metadata for audit logging
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    // Fetch entity before deletion for audit trail
    const ${lowerName}ToDelete = await db.${lowerName}.findUnique({
      where: { id: params.id }
    });

    if (!${lowerName}ToDelete) {
      return NextResponse.json(
        { error: '${name} not found' },
        { status: 404 }
      );
    }

    ${name === 'ImageUpload' ? `
    // ✅ VERCEL BLOB DELETION: Delete from Vercel Blob storage for ImageUpload
    try {
      const { del } = await import('@vercel/blob');
      await del(${lowerName}ToDelete.originalUrl);
    } catch (blobError) {
      console.warn('Failed to delete blob from Vercel storage:', blobError);
      // Continue with database deletion even if blob deletion fails
    }` : ''}

    // Delete entity
    await db.${lowerName}.delete({
      where: { id: params.id }
    });

    // Log deletion with entity data
    await AuditActivityLogger.logDelete(
      '${name}',
      params.id,
      session${name}.id,
      ${lowerName}ToDelete,
      {
        ipAddress,
        userAgent,
        source: 'api',
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting ${name}:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete ${name}';
    return NextResponse.json(
      { 
        error: 'Failed to delete ${name}',
        message: errorMessage,
        details: error instanceof Error ? error.stack : String(error)
      },
      { status: 500 }
    );
  }
}
`;
  }

  /**
   * Generate date field cleaning code for models with DateTime fields
   * Converts empty strings and null values to undefined to prevent validation errors
   */
  private generateDateFieldCleaning(model: ModelConfig): string {
    const { fields } = model;
    
    // Find all DateTime fields
    const dateFields = fields.filter(f => f.type === 'DateTime');
    
    // If no date fields, just return the body as cleanedData
    if (dateFields.length === 0) {
      return `const cleanedData = body;`;
    }
    
    // Generate cleaning code for each date field
    return `
    // Clean up date fields - convert empty strings to undefined
    const cleanedData = { ...body };
    ${dateFields.map(f => `if (cleanedData.${f.name} === '' || cleanedData.${f.name} === null) {
      delete cleanedData.${f.name};
    }`).join('\n    ')}`;
  }

  /**
   * Generate React component for a model
   */
  private generateComponent(model: ModelConfig, databaseFirst: boolean = false): string {
    const { name, fields } = model;
    const lowerName = name.charAt(0).toLowerCase() + name.slice(1);
    
    const displayFields = fields.filter(f => 
      !['id', 'createdAt', 'updatedAt'].includes(f.name) && 
      !f.isComputed
    ).slice(0, 5);
    
    return `// Generated Component for ${name}
// DO NOT EDIT - Auto-generated by CompleteEntityGenerator
${databaseFirst ? '// ⚠️ DATABASE-FIRST DATA POLICY ENFORCED' : ''}
// All data in this component MUST come from database queries, never hardcoded

'use client';

import React from 'react';
import { use${name}List, useCreate${name}, useUpdate${name}, useDelete${name} } from '@/generated/hooks/${lowerName}-hooks';
import type { ${name}, Create${name}Input } from '@/generated/types/${lowerName}-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function ${name}List() {
  const { data: ${lowerName}s, isLoading, error } = use${name}List();
  const deleteMutation = useDelete${name}();

  if (isLoading) {
    return <div className="p-4">Loading ${name}s...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">Error: {error.message}</div>;
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this ${name}?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">${name}s</h2>
        <Button>Add ${name}</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {${lowerName}s?.map((${lowerName}) => (
          <Card key={${lowerName}.id}>
            <CardHeader>
              <CardTitle>${displayFields[0] ? `{${lowerName}.${displayFields[0].name}}` : `${name}`}</CardTitle>
            </CardHeader>
            <CardContent>
              ${displayFields.slice(1).map(f => `<p className="text-sm text-gray-600">${f.name}: {${lowerName}.${f.name}}</p>`).join('\n              ')}
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm">Edit</Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => handleDelete(${lowerName}.id)}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function ${name}Form({ 
  initialData, 
  onSuccess 
}: { 
  initialData?: ${name}; 
  onSuccess?: () => void;
}) {
  const createMutation = useCreate${name}();
  const updateMutation = useUpdate${name}();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
${displayFields.map(f => `      ${f.name}: formData.get('${f.name}') as ${this.getTypeScriptType(f.type, false)},`).join('\n')}
    } as Create${name}Input;

    if (initialData) {
      await updateMutation.mutateAsync({ ...data, id: initialData.id });
    } else {
      await createMutation.mutateAsync(data);
    }

    onSuccess?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-xl font-semibold">
        {initialData ? 'Edit' : 'Create'} ${name}
      </h3>

${displayFields.map(f => `      <div>
        <label htmlFor="${f.name}" className="block text-sm font-medium mb-1">
          ${f.name}
        </label>
        <input
          type="${this.getInputType(f.type)}"
          id="${f.name}"
          name="${f.name}"
          defaultValue={initialData?.${f.name} as any}
          required={${!f.isOptional}}
          className="w-full px-3 py-2 border rounded-md"
        />
      </div>`).join('\n\n')}

      <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
        {initialData ? 'Update' : 'Create'} ${name}
      </Button>
    </form>
  );
}
`;
  }

  private getInputType(type: string): string {
    const inputMap: Record<string, string> = {
      'String': 'text',
      'Int': 'number',
      'Float': 'number',
      'Decimal': 'number',
      'Boolean': 'checkbox',
      'DateTime': 'datetime-local'
    };
    
    return inputMap[type] || 'text';
  }

  /**
   * Generate admin table component for a model
   */
  private generateAdminTableComponent(model: ModelConfig, databaseFirst: boolean = false): string {
    const { name, fields } = model;
    const lowerName = name.charAt(0).toLowerCase() + name.slice(1);
    
    // Get fields for table display, ensuring id is first
    const idField = fields.find(f => f.name === 'id');
    let displayFields: any[];
    
    // For User model, use specific admin-friendly fields
    if (name === 'User') {
      const userAdminFields = fields.filter(f => 
        ['id', 'email', 'name', 'profileImageUrl', 'role', 'status', 'createdAt'].includes(f.name)
      );
      displayFields = userAdminFields.length > 0 ? userAdminFields : (idField ? [idField] : []);
    } else {
      // For other models, exclude sensitive and timestamp fields except createdAt for admin oversight
      const otherFields = fields.filter(f => 
        f.name !== 'id' &&
        !['password', 'updatedAt'].includes(f.name) && 
        !f.isComputed
      ).slice(0, 5); // Take 5 more fields after id
      
      displayFields = idField ? [idField, ...otherFields] : otherFields;
    }
    
    // Check if the model has wallet-related fields
    const hasWalletFields = fields.some(f => 
      f.name.toLowerCase().includes('wallet') || 
      f.name === 'email' && name === 'User'
    );
    
    // Check if the model has image fields
    const hasImageFields = displayFields.some(f => this.isImageField(f.name));
    
    // Check if model has logo/cover/gallery for first-column thumbnail (VenueProfile, VendorProfile, etc.)
    const hasLogoOrImageFields = this.modelHasLogoOrImageColumn(fields);
    const logoImageUrlExpression = this.buildLogoImageUrlExpression(fields);
    
    return `// Generated Admin Table Component for ${name}
// DO NOT EDIT - Auto-generated by CompleteEntityGenerator
${databaseFirst ? '// ⚠️ DATABASE-FIRST DATA POLICY ENFORCED' : ''}
// All data in this component MUST come from database queries, never hardcoded

'use client';

import React, { useState } from 'react';
import { use${name}Paginated } from '@/generated/hooks/${lowerName}-hooks';
import type { ${name} } from '@/generated/types/${lowerName}-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';${hasImageFields ? `
import { AutoGenProfileAvatar } from '@/components/common/UnifiedProfileAvatar';` : ''}
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  X,
  MoreVertical,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Building2
} from 'lucide-react';${hasLogoOrImageFields ? `
import { CachedImage } from '@/components/common/CachedImage';` : ''}${hasWalletFields ? `
import { obfuscateWalletAddress } from '@/lib/utils';` : ''}
import { formatDistanceToNow } from 'date-fns';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type SortDirection = 'asc' | 'desc';

export function ${name}AdminTable() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Sorting handler
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
    setPage(1); // Reset to first page when sorting changes
  };

  // Build filter object
  const filter: any = {};
  if (searchQuery) {
    filter.OR = [
      ${displayFields.filter(f => f.type === 'String').map(f => `{ ${f.name}: { contains: searchQuery, mode: 'insensitive' } }`).join(',\n      ')}
    ];
  }

  const { data: response, isLoading, error } = use${name}Paginated(
    page,
    pageSize,
    filter,
    { [sortField]: sortDirection }
  );

  const items = (response as any)?.data || [];
  const total = (response as any)?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const handleRowClick = (itemId: string, e: React.MouseEvent) => {
    // Don't trigger if clicking on the actions button
    if ((e.target as HTMLElement).closest('[data-actions-trigger]')) {
      return;
    }
    router.push(\`/admin/${lowerName}/\${itemId}\`);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSortField('createdAt');
    setSortDirection('desc');
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground dark:text-white">${name} Management</h2>
          <p className="text-muted-foreground dark:text-gray-400">
            Manage ${lowerName}s and their data
          </p>
        </div>
        <Link href="/admin/${lowerName}/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add ${name}
          </Button>
        </Link>
      </div>

      {/* Stats Card */}
      <Card className="bg-card dark:bg-gray-800 border-border dark:border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-foreground dark:text-white">Total ${name}s</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground dark:text-white">{total}</div>
        </CardContent>
      </Card>

      {/* Enhanced Search and Filter Container */}
      <Collapsible open={filtersExpanded} onOpenChange={setFiltersExpanded} className="mb-6">
        <div className="bg-card dark:bg-gray-800 rounded-xl border border-border dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
          {/* Search Header Section */}
          <div className="bg-gradient-to-r from-primary/5 to-accent/5 dark:from-primary/10 dark:to-accent/10 p-6 border-b border-border dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary dark:text-primary/80" />
                <Input
                  placeholder="Search ${lowerName}s..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="pl-12 pr-4 py-3 h-12 text-base bg-background dark:bg-gray-900 border-border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary dark:focus:border-primary/60 transition-all duration-200 w-full"
                />
              </div>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="flex-shrink-0 h-12 px-6 bg-background dark:bg-gray-900 border-border dark:border-gray-600 transition-all duration-200"
                  title="Toggle Advanced Filters"
                >
                  <Filter className="h-5 w-5 mr-2 text-primary dark:text-primary/80" />
                  <span className="font-medium text-foreground dark:text-white">Filters</span>
                  <ChevronDown className={\`h-4 w-4 ml-2 text-muted-foreground transition-transform duration-200 \${filtersExpanded ? 'rotate-180' : ''}\`} />
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>

          {/* Collapsible Filter Options */}
          <CollapsibleContent>
            <div className="p-6 bg-muted/30 dark:bg-gray-800/50">
              <div className="space-y-6">
                {/* Filter Section Header */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-1 w-8 bg-gradient-to-r from-primary to-accent rounded-full"></div>
                  <h3 className="text-sm font-semibold text-foreground dark:text-white uppercase tracking-wide">Advanced Filters</h3>
                </div>
                
                {/* Filter Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-border dark:border-gray-700">
                  <div className="text-xs text-muted-foreground dark:text-gray-400">
                    {items?.length || 0} ${lowerName}s found
                  </div>
                  <div className="flex gap-2">
                    {searchQuery && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={handleClearFilters}
                        className="text-xs text-muted-foreground"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Clear All
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Table */}
      <Card className="bg-card dark:bg-gray-800 border-border dark:border-gray-700 transition-all duration-200 hover:shadow-lg dark:hover:shadow-gray-900/50">
        <CardContent className="p-0">
          {isLoading ? (
            ${this.generateRichLoadingState(name)}
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-12">
              <div className="rounded-full bg-destructive/10 dark:bg-red-900/20 p-6 mb-4">
                <AlertTriangle className="h-12 w-12 text-destructive dark:text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-foreground dark:text-white mb-1">
                Error loading ${lowerName}s
              </h3>
              <p className="text-sm text-muted-foreground dark:text-gray-400 mb-4">{error.message}</p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : items.length === 0 ? (
            ${this.generateRichEmptyState(name, true, true)}
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 dark:bg-gray-900/50">
                    ${hasLogoOrImageFields ? `<TableHead className="w-14 text-foreground dark:text-white">Logo</TableHead>
                    ` : ''}${displayFields.map(f => `<TableHead className="text-foreground dark:text-white">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8 data-[state=open]:bg-accent text-foreground dark:text-white"
                        onClick={() => handleSort('${f.name}')}
                      >
                        ${f.name}
                        {sortField === '${f.name}' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="ml-2 h-4 w-4" />
                          ) : (
                            <ArrowDown className="ml-2 h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
                        )}
                      </Button>
                    </TableHead>`).join('\n                    ')}
                    <TableHead className="text-right text-foreground dark:text-white">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item: any) => (
                    <TableRow 
                      key={item.id}
                      className="cursor-pointer hover:bg-muted/50 dark:hover:bg-gray-900/50 transition-colors"
                      onClick={(e) => handleRowClick(item.id, e)}
                    >
                      ${hasLogoOrImageFields ? `<TableCell className="w-14 p-2">
                        {(() => {
                          const imageUrl = ${logoImageUrlExpression};
                          return imageUrl ? (
                            <div className="relative h-10 w-10 rounded-md overflow-hidden bg-muted dark:bg-gray-700 flex-shrink-0">
                              <CachedImage
                                src={imageUrl}
                                alt={item.businessName || item.name || item.title || 'Logo'}
                                width={40}
                                height={40}
                                className="h-10 w-10 object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-10 w-10 rounded-md bg-muted dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                              <Building2 className="h-5 w-5 text-muted-foreground dark:text-gray-400" />
                            </div>
                          );
                        })()}
                      </TableCell>
                      ` : ''}${displayFields.map(f => this.generateTableCell(f, lowerName, hasWalletFields, hasImageFields)).join('\n                      ')}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              data-actions-trigger
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <Link href={\`/admin/${lowerName}/\${item.id}\`}>
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                            </Link>
                            <Link href={\`/admin/${lowerName}/\${item.id}/edit\`}>
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit ${name}
                              </DropdownMenuItem>
                            </Link>
                            <DropdownMenuSeparator />
                            <Link href={\`/admin/${lowerName}/\${item.id}/delete\`}>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete ${name}
                              </DropdownMenuItem>
                            </Link>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-4 border-t">
                <div className="flex items-center gap-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} items
                  </p>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => {
                      setPageSize(Number(value));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue placeholder="Rows per page" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 / page</SelectItem>
                      <SelectItem value="20">20 / page</SelectItem>
                      <SelectItem value="50">50 / page</SelectItem>
                      <SelectItem value="100">100 / page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium">{page}</span>
                    <span className="text-sm text-muted-foreground">of</span>
                    <span className="text-sm font-medium">{totalPages}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
`;
  }

  /**
   * Generate table cell rendering code for a field
   */
  private generateTableCell(field: FieldConfig, modelName: string, hasWalletFields: boolean, hasImageFields: boolean): string {
    const isWalletField = field.name.toLowerCase().includes('wallet') || field.name === 'email';
    const isImageField = this.isImageField(field.name);
    const isProfileImage = field.name.toLowerCase().includes('profile') || 
                          field.name.toLowerCase().includes('avatar');
    
    // Profile/Avatar images as circular avatars
    if (isImageField && isProfileImage && hasImageFields) {
      return `<TableCell className="text-foreground dark:text-white">
                        <AutoGenProfileAvatar
                          userId={item.id}
                          profileImageUrl={item.${field.name}}
                          size="sm"
                        />
                      </TableCell>`;
    }
    
    // Regular images (non-profile) as small thumbnails
    if (isImageField && !isProfileImage && hasImageFields) {
      return `<TableCell className="text-foreground dark:text-white">
                        <img
                          src={item.${field.name} || '/placeholder-image.png'}
                          alt="${field.name}"
                          className="h-10 w-16 object-cover rounded border border-border dark:border-gray-600"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder-image.png';
                          }}
                        />
                      </TableCell>`;
    }
    
    if (field.type === 'Boolean') {
      return `<TableCell className="text-foreground dark:text-white">
                        <Badge 
                          variant={item.${field.name} ? 'default' : 'outline'}
                          className="bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-white border-border dark:border-gray-600"
                        >
                          {item.${field.name} ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>`;
    }
    
    if (field.type === 'DateTime') {
      return `<TableCell className="text-sm text-muted-foreground dark:text-gray-400">
                        {item.${field.name}
                          ? formatDistanceToNow(new Date(item.${field.name}), { addSuffix: true })
                          : 'N/A'}
                      </TableCell>`;
    }
    
    if (isWalletField && hasWalletFields) {
      return `<TableCell className="max-w-[200px] text-foreground dark:text-white" title={item.${field.name} || 'N/A'}>
                        <span className="truncate block">
                          {item.${field.name} ? obfuscateWalletAddress(item.${field.name}) : 'N/A'}
                        </span>
                      </TableCell>`;
    }
    
    // ID field with monospace font
    if (field.name === 'id') {
      return `<TableCell className="font-mono text-xs text-foreground dark:text-white">
                        {item.${field.name}}
                      </TableCell>`;
    }

    // JSON fields - format as readable JSON
    if (field.type === 'Json') {
      return `<TableCell className="text-foreground dark:text-white max-w-[300px]">
                        <pre className="text-xs bg-muted dark:bg-gray-900 p-2 rounded whitespace-pre-wrap overflow-hidden text-ellipsis">
                          {item.${field.name} ? JSON.stringify(item.${field.name}, null, 2) : 'N/A'}
                        </pre>
                      </TableCell>`;
    }

    return `<TableCell className="text-foreground dark:text-white">
                        {item.${field.name} || 'N/A'}
                      </TableCell>`;
  }

  /**
   * Generate dialog component for CRUD operations
   */
  private generateCrudDialog(model: ModelConfig): string {
    const { name, fields, relations } = model;
    const lowerName = name.charAt(0).toLowerCase() + name.slice(1);
    
    // Get editable fields (excluding system fields)
    const editableFields = fields.filter(f => 
      !['id', 'createdAt', 'updatedAt', 'password'].includes(f.name) && 
      !f.isComputed// Exclude relations for now
    ); // No cap - include all schema fields
    
    // Get mandatory relations for creation, excluding relations where an enum field with the same name exists
    const enumFieldNames = new Set(editableFields.filter(f => f.isEnum).map(f => f.name));
    const primitiveTypes = ['BigInt', 'String', 'Int', 'Float', 'Decimal', 'Boolean', 'DateTime', 'Json', 'Bytes'];
    const mandatoryRelations = relations.filter(r => 
      !r.isOptional && 
      r.type === 'many-to-one' &&
      !enumFieldNames.has(r.name) // Exclude if enum field with same name exists
    );
    
    // Also handle optional relations that might be useful for forms
    const optionalRelations = relations.filter(r => 
      r.isOptional && 
      r.type === 'many-to-one' &&
      !enumFieldNames.has(r.name) &&
      !primitiveTypes.includes(r.model)
    );
    
    // Combine all relations for dropdown generation
    const allRelations = [...mandatoryRelations, ...optionalRelations];
    
    // Deduplicate relations by model name to prevent duplicate hooks
    const uniqueRelationsByModel = new Map<string, typeof allRelations[0]>();
    allRelations.forEach(rel => {
      const relLower = rel.model.charAt(0).toLowerCase() + rel.model.slice(1);
      if (!uniqueRelationsByModel.has(relLower)) {
        uniqueRelationsByModel.set(relLower, rel);
      }
    });
    const uniqueRelations = Array.from(uniqueRelationsByModel.values());
    
    // Get enum fields and their types
    const enumFields = editableFields.filter(f => f.isEnum && f.typeName);
    const enumImports = enumFields.length > 0
      ? `import { ${[...new Set(enumFields.map(f => f.typeName))].join(', ')}, getEnumValues, getEnumLabel } from '@/lib/enums';`
      : '';
    
    // Get display fields for details view
    const displayFields = fields.filter(f => 
      !['password'].includes(f.name) && 
      !f.isComputed // Exclude relations from display
    ).slice(0, 20); // Show more fields in view
    
    const hasWalletFields = fields.some(f => 
      f.name.toLowerCase().includes('wallet') || 
      f.name === 'email' && name === 'User'
    );
    
    const hasImageFields = editableFields.some(f => this.isImageField(f.name)) || 
                          displayFields.some(f => this.isImageField(f.name));
    
    const hasEnumFields = editableFields.some(f => f.isEnum);
    const hasSelectFields = hasEnumFields || allRelations.length > 0;
    
    return `'use client';

import React, { useEffect } from 'react';${uniqueRelations.length > 0 ? `
import { useQuery } from '@tanstack/react-query';` : ''}${enumImports ? `
${enumImports}` : ''}
import { useCreate${name}, useUpdate${name} } from '@/generated/hooks/${lowerName}-hooks';
import type { ${name}, Create${name}Input } from '@/generated/types/${lowerName}-types';
import { useGeneratedFormStore } from '@/stores/generated-form-store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';${hasSelectFields ? `
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';` : ''}${hasImageFields ? `
import { ImageUpload } from '@/components/ui/image-upload';` : ''}${hasWalletFields ? `
import { obfuscateWalletAddress } from '@/lib/utils';` : ''}
import { formatDistanceToNow } from 'date-fns';
import { Loader2 } from 'lucide-react';

interface ${name}DialogProps {
  mode: 'view' | 'create' | 'edit';
  isOpen: boolean;
  onClose: () => void;
  data?: ${name} | null;
  onSuccess?: () => void;
}

// ✅ REDUX/ZUSTAND PATTERN - Default form data (replaces useState initial state)
const defaultFormData: Partial<Create${name}Input> = {
${editableFields.map(f => {
  if (f.isEnum) {
    return `  ${f.name}: '',`;
  }
  if (f.type === 'String') {
    return `  ${f.name}: '',`;
  }
  if (f.type === 'Int' || f.type === 'Float' || f.type === 'Decimal') {
    return `  ${f.name}: 0,`;
  }
  if (f.type === 'Boolean') {
    return `  ${f.name}: false,`;
  }
  if (f.type === 'DateTime') {
    return `  ${f.name}: '',`;
  }
  return `  ${f.name}: '',`;
}).join('\n')}
};

export function ${name}Dialog({ mode, isOpen, onClose, data, onSuccess }: ${name}DialogProps) {
  const createMutation = useCreate${name}();
  const updateMutation = useUpdate${name}();
  
  // ✅ REDUX/ZUSTAND PATTERN - Use Generated Form Store instead of useState
  const {
    initializeForm,
    updateField,
    getFormData,
    submitForm,
    setFieldError,
    isFormDirty,
    destroyForm,
  } = useGeneratedFormStore();
  
  // Generate unique form ID based on entity, mode, and data ID
  const formId = \`${lowerName}-\${mode}-\${data?.id || 'new'}\`;
${uniqueRelations.map(rel => {
  const relLower = rel.model.charAt(0).toLowerCase() + rel.model.slice(1);
  const apiEndpoint = `/api/${relLower}`;
  return `
  // Fetch ${rel.model} options via API (shared across all ${rel.model} relations)
  const { data: ${relLower}Response, isLoading: ${relLower}Loading, error: ${relLower}Error } = useQuery({
    queryKey: ['${relLower}Options'],
    queryFn: async () => {
      const response = await fetch('${apiEndpoint}?pageSize=100', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch ${rel.model} options');
      const result = await response.json();
      return Array.isArray(result.data) ? result.data : result.data || [];
    },
    enabled: isOpen && (mode === 'create' || mode === 'edit'),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  const ${relLower}Options = ${relLower}Response || [];`;
}).join('')}

  // ✅ REDUX/ZUSTAND PATTERN - Single mount-time initialization (acceptable useEffect)
  useEffect(() => {
    if (!isOpen) return;
    
    // Prepare initial data based on mode
    let initialData: Partial<Create${name}Input>;
    
    if (data && (mode === 'edit' || mode === 'view')) {
      // Edit/View mode - use existing data
      initialData = {
${editableFields.map(f => {
  if (f.isEnum) {
    return `        ${f.name}: data.${f.name} ? String(data.${f.name}).toUpperCase() : '',`;
  }
  if (f.type === 'Int' || f.type === 'Float' || f.type === 'Decimal') {
    return `        ${f.name}: data.${f.name} ?? 0,`;
  }
  if (f.type === 'Boolean') {
    return `        ${f.name}: data.${f.name} ?? false,`;
  }
  if (f.type === 'DateTime') {
    return `        ${f.name}: data.${f.name} || '',`;
  }
  return `        ${f.name}: data.${f.name} || '',`;
}).join('\n')}
      };
    } else {
      // Create mode - use defaults
      initialData = defaultFormData;
    }
    
    // Initialize form in store
    initializeForm(formId, '${name}', mode, {}, initialData);
    
    return () => {
      // ✅ Cleanup on unmount - only remove if not dirty (preserve drafts)
      if (!isFormDirty(formId)) {
        destroyForm(formId);
      }
    };
  }, [isOpen]); // ✅ Empty deps except isOpen - reinitialize when dialog opens

  // ✅ REDUX/ZUSTAND PATTERN - Get form data from store
  const formData = getFormData<Partial<Create${name}Input>>(formId) ?? defaultFormData;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const success = await submitForm(formId, async (formData) => {
      // Clean up form data - remove undefined/empty values
      const cleanedData = Object.entries(formData).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          acc[key] = value;
        }
        return acc;
      }, {} as any);

      if (mode === 'create') {
        return await createMutation.mutateAsync(cleanedData as Create${name}Input);
      } else if (mode === 'edit' && data) {
        return await updateMutation.mutateAsync({ 
          id: data.id, 
          ...cleanedData 
        } as any);
      }
      throw new Error('Invalid form mode');
    });

    if (success) {
      onSuccess?.();
      onClose();
      destroyForm(formId);
    } else {
      const form = getFormData(formId);
      const errors = form?.submission?.submitErrors || [];
      if (errors.length > 0) {
        alert('Error: ' + errors.join(', '));
      } else {
        alert('Error: Failed to save');
      }
    }
  };

  // ✅ REDUX/ZUSTAND PATTERN - Update via store action instead of setState
  const handleChange = (field: string, value: any) => {
    updateField(formId, field, value);
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card dark:bg-gray-800 border-border dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-foreground dark:text-white">
            {mode === 'view' && \`View ${name}\`}
            {mode === 'create' && \`Create New ${name}\`}
            {mode === 'edit' && \`Edit ${name}\`}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground dark:text-gray-400">
            {mode === 'view' && \`View details for this ${lowerName}\`}
            {mode === 'create' && \`Fill in the information to create a new ${lowerName}\`}
            {mode === 'edit' && \`Update the information for this ${lowerName}\`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'view' ? (
            // View Mode - Display Only
            <div className="space-y-4">
              ${displayFields.map(f => this.generateViewField(f, lowerName, hasWalletFields)).join('\n              ')}
            </div>
          ) : (
            // Create/Edit Mode - Form Fields
            <div className="space-y-4">
              ${editableFields.map(f => this.generateFormField(f, name)).join('\n              ')}
              ${allRelations.length > 0 ? `
              {/* Relations (Mandatory and Optional) */}
              ${allRelations.map(r => this.generateRelationField(r)).join('\n              ')}` : ''}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              {mode === 'view' ? 'Close' : 'Cancel'}
            </Button>
            {mode !== 'view' && (
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'create' ? 'Create' : 'Save Changes'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Delete Confirmation Dialog
interface ${name}DeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  itemName?: string;
}

export function ${name}DeleteDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  isDeleting,
  itemName 
}: ${name}DeleteDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card dark:bg-gray-800 border-border dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-foreground dark:text-white">Delete ${name}</DialogTitle>
          <DialogDescription className="text-muted-foreground dark:text-gray-400">
            Are you sure you want to delete this ${lowerName}?
            {itemName && (
              <span className="block mt-2 font-semibold text-foreground dark:text-white">
                "{itemName}"
              </span>
            )}
            <span className="block mt-2 text-destructive dark:text-red-400">
              This action cannot be undone.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="destructive" 
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete ${name}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
`;
  }

  /**
   * Generate view field for dialog (read-only display)
   */
  private generateViewField(field: FieldConfig, modelName: string, hasWalletFields: boolean): string {
    const isWalletField = field.name.toLowerCase().includes('wallet') || field.name === 'email';
    const isImageField = this.isImageField(field.name);
    const label = field.name.charAt(0).toUpperCase() + field.name.slice(1).replace(/([A-Z])/g, ' $1');
    
    if (isImageField) {
      // Determine default placeholder based on field name and model
      const isProfileImage = field.name.toLowerCase().includes('profile') || 
                            field.name.toLowerCase().includes('avatar');
      const defaultPlaceholder = isProfileImage ? '/images/avatars/tiger6.png' : '/placeholder-image.png';
      
      return `<div>
                <Label className="text-muted-foreground">${label}</Label>
                <div className="mt-2">
                  <div className="relative">
                    <img
                      src={${modelName}?.${field.name} || '${defaultPlaceholder}'}
                      alt="${label}"
                      className="w-full max-w-md h-48 object-cover rounded-lg border"
                      onError={(e) => {
                        e.currentTarget.src = '${defaultPlaceholder}';
                      }}
                    />
                    {${modelName}?.${field.name} && (
                      <p className="text-xs text-muted-foreground mt-2 break-all">{${modelName}.${field.name}}</p>
                    )}
                  </div>
                </div>
              </div>`;
    }
    
    if (field.type === 'Boolean') {
      return `<div>
                <Label className="text-muted-foreground">${label}</Label>
                <div className="mt-1">
                  <Badge variant={${modelName}?.${field.name} ? 'default' : 'outline'}>
                    {${modelName}?.${field.name} ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>`;
    }
    
    if (field.type === 'DateTime') {
      return `<div>
                <Label className="text-muted-foreground">${label}</Label>
                <p className="mt-1 text-sm">
                  {${modelName}?.${field.name} 
                    ? formatDistanceToNow(new Date(${modelName}.${field.name}), { addSuffix: true })
                    : 'N/A'}
                </p>
              </div>`;
    }
    
    if (isWalletField && hasWalletFields) {
      return `<div className="min-w-0">
                <Label className="text-muted-foreground">${label}</Label>
                <p className="mt-1 text-sm font-mono break-all" title={${modelName}?.${field.name} || 'N/A'}>
                  {${modelName}?.${field.name} ? obfuscateWalletAddress(${modelName}.${field.name}) : 'N/A'}
                </p>
              </div>`;
    }
    
    return `<div>
              <Label className="text-muted-foreground">${label}</Label>
              <p className="mt-1 text-sm">
                {${modelName}?.${field.name} || 'N/A'}
              </p>
            </div>`;
  }

  /**
   * Generate form field for dialog (editable input)
   */
  private generateFormField(field: FieldConfig, entityName: string = ''): string {
    const label = field.name.charAt(0).toUpperCase() + field.name.slice(1).replace(/([A-Z])/g, ' $1');
    const inputType = this.getInputType(field.type);
    
    // Check if this is a multi-image field (JSON array for images/videos)
    const isMultiImageField = this.isMultiImageField(field);
    const isMultiVideoField = field.type === 'Json' && field.name.toLowerCase() === 'videos';
    
    if (isMultiImageField || isMultiVideoField) {
      return `<AdminMultiImageField
                value={formData.${field.name} as string[]}
                onChange={(urls) => handleChange('${field.name}', urls)}
                label="${label}"
                required={${!field.isOptional}}
                acceptVideos={${isMultiVideoField}}
                maxImages={50}
              />`;
    }
    
    // Blob/Image/Document fields (checked before enum fields)
    if (field.isBlob || field.isImage || field.isDocument) {
      const componentName = field.isArray ? 'AdminMultiBlobField' : 'AdminBlobField';
      const accept = field.isImage ? 'image/*' : field.isDocument ? 'application/pdf,image/*' : '*/*';
      const maxFiles = field.isArray ? (field.name.toLowerCase().includes('image') ? 20 : 10) : 1;
      const entityTypeValue = entityName || 'Entity';
      return `<div>
                <${componentName}
                  value={formData.${field.name}${field.isArray ? ' || []' : ' || null'}}
                  onChange={(value) => handleChange('${field.name}', value)}
                  label="${label}"
                  required={${!field.isOptional}}
                  accept="${accept}"
                  maxSize={10}
                  ${field.isArray ? `maxFiles={${maxFiles}}` : ''}
                  category="${field.name.toLowerCase()}"
                  entityId={formData.id}
                  entityType="${entityTypeValue}"
                />
              </div>`;
    }
    
    // Check if this is a single image field (legacy support)
    const isImageField = this.isImageField(field.name);
    
    if (isImageField) {
      return `<AdminImageField
                value={formData.${field.name} as string}
                onChange={(url) => handleChange('${field.name}', url)}
                label="${label}"
                required={${!field.isOptional}}
              />`;
    }
    
    if (field.type === 'String' && (field.name.toLowerCase().includes('description') || field.name.toLowerCase().includes('bio'))) {
      return `<div>
                <Label htmlFor="${field.name}">
                  ${label}
                  ${!field.isOptional ? ' <span className="text-destructive">*</span>' : ''}
                </Label>
                <Textarea
                  id="${field.name}"
                  value={formData.${field.name} as string || ''}
                  onChange={(e) => handleChange('${field.name}', e.target.value)}
                  placeholder="Enter ${field.name}"
                  rows={3}
                  ${!field.isOptional ? 'required' : ''}
                />
              </div>`;
    }
    
    if (field.type === 'Boolean') {
      return `<div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="${field.name}"
                  checked={formData.${field.name} as boolean || false}
                  onChange={(e) => handleChange('${field.name}', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="${field.name}">${label}</Label>
              </div>`;
    }
    
    // Enum Select fields - Enhanced with responsive styling and loading states
    if (field.isEnum && field.typeName) {
      return `<div className="w-full">
                <Label htmlFor="${field.name}" className="text-foreground dark:text-white mb-2 block">
                  ${label}
                  ${!field.isOptional ? ' <span className="text-destructive dark:text-red-400">*</span>' : ''}
                </Label>
                <Select
                  value={formData.${field.name} || ''}
                  onValueChange={(value) => handleChange('${field.name}', value.toUpperCase())}
                  ${!field.isOptional ? 'required' : ''}
                  disabled={false}
                >
                  <SelectTrigger 
                    id="${field.name}" 
                    className="w-full bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600 hover:bg-orange-600/10 dark:hover:bg-orange-500/20 hover:text-orange-700 dark:hover:text-orange-300 hover:border-orange-600/30 dark:hover:border-orange-400/40 transition-colors duration-200"
                  >
                    <SelectValue placeholder="Select ${field.name}" />
                  </SelectTrigger>
                  <SelectContent className="bg-background dark:bg-gray-900 border-border dark:border-gray-600 max-h-[300px] overflow-y-auto">
                    {getEnumValues(${field.typeName}).map((value) => (
                      <SelectItem 
                        key={value} 
                        value={value}
                        className="focus:bg-orange-600/10 dark:focus:bg-orange-500/20 focus:text-orange-700 dark:focus:text-orange-300 transition-colors duration-200 cursor-pointer"
                      >
                        {getEnumLabel(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>`;
    }
    
    // Special handling for DateTime fields
    if (field.type === 'DateTime') {
      return `<div>
                <Label htmlFor="${field.name}" className="text-foreground dark:text-white">
                  ${label}
                  ${!field.isOptional ? ' <span className="text-destructive dark:text-red-400">*</span>' : ''}
                </Label>
                <Input
                  id="${field.name}"
                  type="datetime-local"
                  value={formData.${field.name} ? new Date(formData.${field.name}).toISOString().slice(0, 16) : ''}
                  onChange={(e) => handleChange('${field.name}', e.target.value ? new Date(e.target.value).toISOString() : ${field.isOptional ? 'null' : "''"} )}
                  placeholder="Enter ${field.name}"
                  className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                  ${!field.isOptional ? 'required' : ''}
                />
              </div>`;
    }

    return `<div>
              <Label htmlFor="${field.name}" className="text-foreground dark:text-white">
                ${label}
                ${!field.isOptional ? ' <span className="text-destructive dark:text-red-400">*</span>' : ''}
              </Label>
              <Input
                id="${field.name}"
                type="${inputType}"
                value={formData.${field.name} as any || ''}
                onChange={(e) => handleChange('${field.name}', ${inputType === 'number' ? 'Number(e.target.value)' : 'e.target.value'})}
                placeholder="Enter ${field.name}"
                className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                ${!field.isOptional ? 'required' : ''}
              />
            </div>`;
  }

  /**
   * Group form fields into logical sections and render them with SectionHeader separators.
   * For small entities (≤8 fields) renders a flat grid. For larger entities, groups fields
   * into named sections based on common naming conventions.
   */
  private generateFormSections(model: ModelConfig, editableFields: FieldConfig[]): string {
    if (editableFields.length <= 8) {
      // Simple flat grid for small entities
      return `<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${editableFields.map(f => this.generateFormField(f, model.name)).join('\n        ')}
      </div>`;
    }

    // Define section grouping rules based on field name patterns
    const sectionRules: Array<{ id: string; label: string; icon: string; patterns: RegExp[] }> = [
      { id: 'basic', label: 'Basic Information', icon: 'Info', patterns: [/^(name|title|businessName|businessType|description|tagline|bio|summary|label|type|category)$/i] },
      { id: 'media', label: 'Media', icon: 'ImageIcon', patterns: [/^(logo|coverImage|image|avatar|thumbnail|photo|banner|gallery|video|videoUrl|images|photos|pictures)$/i] },
      { id: 'location', label: 'Location', icon: 'MapPin', patterns: [/^(address|city|state|country|postalCode|zipCode|latitude|longitude|googlePlaceId|location|region)$/i] },
      { id: 'contact', label: 'Contact', icon: 'Phone', patterns: [/^(phone|email|website|socialLinks|twitter|instagram|facebook|linkedin|tiktok|contact)$/i] },
      { id: 'operations', label: 'Operations', icon: 'Clock', patterns: [/^(operatingHours|hours|schedule|capacity|ageRestriction|dressCode|parkingInfo|parking|rules|policy)$/i] },
      { id: 'business', label: 'Business & Finance', icon: 'Banknote', patterns: [/^(taxId|businessLicense|bankDetails|commissionRate|defaultCommissionRate|customCommissionRate|revenue|earnings|totalRevenue|price|cost|fee|rate|percentage|deposit|depositPercentage|requireDeposit)$/i] },
      { id: 'status', label: 'Status & Verification', icon: 'CheckCircle2', patterns: [/^(status|isActive|isVerified|isEnabled|isPublished|verificationDate|verificationNotes|approved)$/i] },
      { id: 'settings', label: 'Settings', icon: 'Settings', patterns: [/^(autoAccept|autoAcceptBookings|notification|setting|config|preference|enable|disable|allow|require)$/i] },
      { id: 'metrics', label: 'Performance Metrics', icon: 'TrendingUp', patterns: [/^(rating|totalReviews|totalBookings|totalRevenue|score|count|views|clicks|conversion)$/i] },
    ];

    // Assign each field to a section
    const sections = new Map<string, FieldConfig[]>();
    const unassigned: FieldConfig[] = [];

    for (const field of editableFields) {
      let assigned = false;
      for (const rule of sectionRules) {
        if (rule.patterns.some(p => p.test(field.name))) {
          if (!sections.has(rule.id)) sections.set(rule.id, []);
          sections.get(rule.id)!.push(field);
          assigned = true;
          break;
        }
      }
      if (!assigned) unassigned.push(field);
    }

    // Build the JSX output
    const parts: string[] = [];

    for (const rule of sectionRules) {
      const sectionFields = sections.get(rule.id);
      if (!sectionFields || sectionFields.length === 0) continue;

      parts.push(`{/* === ${rule.label} === */}
      <div className="col-span-full">
        <div className="flex items-center gap-2 pt-2 pb-1">
          <span className="text-sm font-semibold text-foreground dark:text-white uppercase tracking-wide">${rule.label}</span>
          <div className="flex-1 h-px bg-border dark:bg-gray-700" />
        </div>
      </div>
      ${sectionFields.map(f => this.generateFormField(f, model.name)).join('\n      ')}`);
    }

    if (unassigned.length > 0) {
      parts.push(`{/* === Additional Fields === */}
      ${unassigned.map(f => this.generateFormField(f, model.name)).join('\n      ')}`);
    }

    return `<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      ${parts.join('\n      ')}
    </div>`;
  }

  /**
   * Generate relation select field for dialog - Enhanced with API fetching and responsive styling
   */
  private generateRelationField(relation: RelationConfig): string {
    const label = relation.name.charAt(0).toUpperCase() + relation.name.slice(1).replace(/([A-Z])/g, ' $1');
    const relLower = relation.model.charAt(0).toLowerCase() + relation.model.slice(1);
    const idField = `${relation.name}Id`;
    const loadingVar = `${relLower}Loading`;
    const errorVar = `${relLower}Error`;
    
    return `<div className="w-full">
              <Label htmlFor="${idField}" className="text-foreground dark:text-white mb-2 block">
                ${label}
                ${!relation.isOptional ? ' <span className="text-destructive dark:text-red-400">*</span>' : ''}
              </Label>
              <Select
                value={formData.${idField} as string || ''}
                onValueChange={(value) => handleChange('${idField}', value)}
                ${!relation.isOptional ? 'required' : ''}
                disabled={${loadingVar}}
              >
                <SelectTrigger 
                  id="${idField}" 
                  className="w-full bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600 hover:bg-orange-600/10 dark:hover:bg-orange-500/20 hover:text-orange-700 dark:hover:text-orange-300 hover:border-orange-600/30 dark:hover:border-orange-400/40 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <SelectValue placeholder={${loadingVar} ? 'Loading...' : 'Select ${relation.name}'} />
                </SelectTrigger>
                  <SelectContent className="bg-background dark:bg-gray-900 border-border dark:border-gray-600 max-h-[300px] overflow-y-auto">
                  {${loadingVar} ? (
                    <div className="p-4 text-center text-muted-foreground dark:text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                      Loading options...
                    </div>
                  ) : ${errorVar} ? (
                    <div className="p-4 text-center text-destructive dark:text-red-400 text-sm">
                      Failed to load options
                    </div>
                  ) : (
                    <>
                      ${relation.isOptional ? `<SelectItem value="" className="focus:bg-orange-600/10 dark:focus:bg-orange-500/20 focus:text-orange-700 dark:focus:text-orange-300 transition-colors duration-200 cursor-pointer">
                        <span className="text-muted-foreground dark:text-gray-400">None</span>
                      </SelectItem>` : ''}
                      {${relLower}Options && ${relLower}Options.length > 0 ? (
                        ${relLower}Options.map((item: any) => (
                          <SelectItem 
                            key={item.id} 
                            value={item.id}
                            className="focus:bg-orange-600/10 dark:focus:bg-orange-500/20 focus:text-orange-700 dark:focus:text-orange-300 transition-colors duration-200 cursor-pointer"
                          >
                            {item.name || item.title || item.email || item.id}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-4 text-center text-muted-foreground dark:text-gray-400 text-sm">
                          No options available
                        </div>
                      )}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>`;
  }

  /**
   * Check if a field name represents an image field
   */
  private isImageField(fieldName: string): boolean {
    const imageKeywords = ['image', 'picture', 'photo', 'avatar', 'thumbnail', 'cover', 'banner', 'icon', 'logo', 'gallery'];
    const lowerFieldName = fieldName.toLowerCase();
    return imageKeywords.some(keyword => lowerFieldName.includes(keyword));
  }

  /**
   * Check if model has logo/cover/gallery fields for first-column thumbnail in admin table
   */
  private modelHasLogoOrImageColumn(fields: FieldConfig[]): boolean {
    const logoFieldNames = ['logo', 'coverImage', 'cover', 'imageUrl', 'image'];
    return fields.some(f =>
      logoFieldNames.includes(f.name) ||
      (f.name === 'gallery' && f.type === 'Json')
    );
  }

  /**
   * Build expression for primary image URL with fallback: logo → coverImage → cover → imageUrl → image → gallery[0]
   */
  private buildLogoImageUrlExpression(fields: FieldConfig[]): string {
    const fieldNames = fields.map(f => f.name);
    const parts: string[] = [];
    for (const name of ['logo', 'coverImage', 'cover', 'imageUrl', 'image']) {
      if (fieldNames.includes(name)) {
        parts.push(`item.${name}`);
      }
    }
    if (fieldNames.includes('gallery')) {
      parts.push('(Array.isArray(item.gallery) && item.gallery?.length > 0 ? item.gallery[0] : null)');
    }
    return parts.length > 0 ? parts.join(' || ') : 'null';
  }

  /**
   * Check if a field represents multiple images (JSON array)
   */
  private isMultiImageField(field: FieldConfig): boolean {
    return field.type === 'Json' && ['images', 'gallery'].includes(field.name.toLowerCase());
  }

  /**
   * Check if a field is a video URL field
   */
  private isVideoUrlField(fieldName: string): boolean {
    return ['videoUrl', 'video', 'videourl'].includes(fieldName.toLowerCase());
  }

  /**
   * Get media fields for a model (single image, multi image, video)
   */
  private getMediaFieldsForModel(model: ModelConfig): {
    singleImage: string[];
    multiImage: string[];
    videoUrl: string | null;
  } {
    const { fields } = model;
    const singleImage: string[] = [];
    const multiImage: string[] = [];
    const seen = new Set<string>();
    let videoUrl: string | null = null;

    for (const f of fields) {
      if (seen.has(f.name)) continue;
      if (this.isMultiImageField(f)) {
        multiImage.push(f.name);
        seen.add(f.name);
      } else if (this.isImageField(f.name) && f.type === 'String') {
        singleImage.push(f.name);
        seen.add(f.name);
      } else if (this.isVideoUrlField(f.name)) {
        videoUrl = f.name;
        seen.add(f.name);
      }
    }
    return { singleImage, multiImage, videoUrl };
  }

  /**
   * Format field name to readable label (e.g., soldTokens -> Sold Tokens)
   */
  private formatFieldLabel(fieldName: string): string {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Generate proper display value for a field in detail views
   */
  private generateFieldDisplayValue(variableName: string, field: FieldConfig): string {
    const fieldRef = `${variableName}.${field.name}`;

    if (field.type === 'DateTime') {
      return `{new Date(${fieldRef}).toLocaleDateString()}`;
    }

    if (field.type === 'Json') {
      return `<pre className="text-xs bg-muted dark:bg-gray-900 p-2 rounded whitespace-pre-wrap max-w-full overflow-x-auto">
        {${fieldRef} ? JSON.stringify(${fieldRef}, null, 2) : 'N/A'}
      </pre>`;
    }

    if (field.type === 'Int' || field.type === 'Float') {
      return `{${fieldRef}?.toLocaleString()}`;
    }

    return `{${fieldRef}}`;
  }

  /**
   * TAB NAVIGATION: Determine which tabs should be generated based on model fields
   */
  private getTabsForModel(model: ModelConfig): Array<{
    id: string;
    label: string;
    icon?: string;
  }> {
    const { fields, relations } = model;
    const tabs: Array<{ id: string; label: string; icon?: string }> = [];

    // Always include Overview tab
    tabs.push({ id: 'overview', label: 'Overview', icon: 'Info' });

    // Add Details tab if there are many fields
    const displayFields = fields.filter(f => 
      !['id', 'password', 'createdAt', 'updatedAt'].includes(f.name) && !f.isComputed
    );
    
    if (displayFields.length > 6) {
      tabs.push({ id: 'details', label: 'Details', icon: 'FileText' });
    }

    // Add Financials tab if there are financial fields
    const hasFinancials = fields.some(f => 
      ['price', 'value', 'cost', 'revenue', 'income', 'appraisal', 'market'].some(keyword =>
        f.name.toLowerCase().includes(keyword)
      )
    );
    if (hasFinancials) {
      tabs.push({ id: 'financials', label: 'Financials', icon: 'DollarSign' });
    }

    // Add Documents tab if there's a documents relation
    const hasDocuments = relations.some(r => r.name.toLowerCase().includes('document'));
    if (hasDocuments) {
      tabs.push({ id: 'documents', label: 'Documents', icon: 'FileText' });
    }

    // Add Media tab if there are image fields
    const hasImages = fields.some(f => 
      this.isImageField(f.name) || this.isMultiImageField(f)
    );
    if (hasImages) {
      tabs.push({ id: 'media', label: 'Media', icon: 'Image' });
    }

    // Add Relations tab if there are multiple relations
    if (relations.length > 2) {
      tabs.push({ id: 'relations', label: 'Relations', icon: 'Link' });
    }

    return tabs;
  }

  /**
   * TAB NAVIGATION: Generate Overview tab content with inline edit
   */
  private generateOverviewTabContent(model: ModelConfig): string {
    const { name, fields } = model;
    const lowerName = name.charAt(0).toLowerCase() + name.slice(1);

    // Get key overview fields (description, title, main attributes)
    const overviewFields = fields.filter(f => 
      ['title', 'name', 'description', 'status', 'type', 'category'].some(keyword =>
        f.name.toLowerCase().includes(keyword)
      ) || ['String', 'Int'].includes(f.type)
    ).slice(0, 8);

    // Editable overview fields for inline edit (deduplicate by field name)
    const overviewEditableFieldsRaw = fields.filter(f =>
      ['title', 'name', 'description', 'tagline', 'type', 'businessname', 'businesstype', 'category'].some(k =>
        f.name.toLowerCase().includes(k)
      ) && ['String', 'Int'].includes(f.type) && !f.isComputed
    );
    const seenNames = new Set<string>();
    const overviewEditableFields = overviewEditableFieldsRaw.filter(f => {
      if (seenNames.has(f.name)) return false;
      seenNames.add(f.name);
      return true;
    }).slice(0, 6);

    const hasEditableOverview = overviewEditableFields.length > 0;
    const progressFields = this.hasProgressFields(model);

    const overviewEditFormInit = overviewEditableFields.map(f => `${f.name}: ${lowerName}.${f.name} ?? ''`).join(', ');
    const overviewEditPayload = overviewEditableFields.map(f => `${f.name}: overviewEditForm.${f.name} || undefined`).join(', ');

    const overviewEditFormFields = overviewEditableFields.map(f => {
      if (f.name === 'description' || f.name.toLowerCase().includes('description')) {
        return `<div>
                          <Label htmlFor="overview-${f.name}" className="text-foreground dark:text-white">${this.formatFieldLabel(f.name)}</Label>
                          <Textarea
                            id="overview-${f.name}"
                            value={overviewEditForm.${f.name} ?? ''}
                            onChange={(e) => setOverviewEditForm((prev) => ({ ...prev, ${f.name}: e.target.value }))}
                            rows={4}
                            className="mt-2 bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                          />
                        </div>`;
      }
      return `<div>
                          <Label htmlFor="overview-${f.name}" className="text-foreground dark:text-white">${this.formatFieldLabel(f.name)}</Label>
                          <Input
                            id="overview-${f.name}"
                            value={overviewEditForm.${f.name} ?? ''}
                            onChange={(e) => setOverviewEditForm((prev) => ({ ...prev, ${f.name}: e.target.value }))}
                            className="mt-2 bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                          />
                        </div>`;
    }).join('\n                          ');

    return `<TabsContent value="overview" className="space-y-4 mt-4">
                    ${hasEditableOverview ? `
                    <div className="flex justify-end">
                      <Button
                        variant={overviewEditMode ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          if (!overviewEditMode && ${lowerName}) {
                            setOverviewEditForm({
                              ${overviewEditFormInit}
                            });
                          }
                          setOverviewEditMode(!overviewEditMode);
                        }}
                        disabled={updateMutation.isPending}
                      >
                        {overviewEditMode ? (
                          <>
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </>
                        ) : (
                          <>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit Overview
                          </>
                        )}
                      </Button>
                    </div>

                    {overviewEditMode ? (
                      <div className="space-y-6 p-4 rounded-lg border border-border dark:border-gray-700 bg-muted/30 dark:bg-gray-900/30">
                        ${overviewEditFormFields}
                        <div className="flex gap-2">
                          <Button
                            onClick={async () => {
                              try {
                                await updateMutation.mutateAsync({
                                  id: unwrappedParams.id,
                                  ${overviewEditPayload}
                                });
                                toast.success('Overview updated successfully');
                                setOverviewEditMode(false);
                                refetch();
                              } catch (err) {
                                toast.error(err instanceof Error ? err.message : 'Failed to update overview');
                              }
                            }}
                            disabled={updateMutation.isPending}
                          >
                            {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                    ` : ''}
                    {/* Description/Overview Section */}
                    ${fields.some(f => f.name === 'description') ? `
                    <div>
                      <h3 className="font-semibold text-foreground dark:text-white mb-2">Description</h3>
                      <p className="text-muted-foreground dark:text-gray-400">
                        {${lowerName}.description}
                      </p>
                    </div>
                    
                    <Separator className="bg-border dark:bg-gray-700" />
                    ` : ''}

                    {/* Key Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      ${overviewFields.filter(f => f.name !== 'description').map(f => {
                        const icon = this.getIconForField(f.name);
                        // Replace 'Link' with 'LinkIcon' to avoid conflict with next/link
                        const iconName = icon === 'Link' ? 'LinkIcon' : icon;
                        return `{${lowerName}.${f.name} && (
                        <div className="flex items-center gap-2">
                          <${iconName} className="h-5 w-5 text-muted-foreground dark:text-gray-400" />
                          <div>
                            <div className="text-sm text-muted-foreground dark:text-gray-400">${this.formatFieldLabel(f.name)}</div>
                            <div className="font-semibold text-foreground dark:text-white">{${lowerName}.${f.name}}</div>
                          </div>
                        </div>
                      )}`;
                      }).join('\n                      ')}
                    </div>

                    ${progressFields ? `
                    <Separator className="bg-border dark:bg-gray-700" />
                    
                    {/* Progress Section */}
                    <div>
                      <h3 className="font-semibold text-foreground dark:text-white mb-3">Progress</h3>
                      ${this.generateProgressIndicator(
                        `${lowerName}.${progressFields.numerator}`,
                        `${lowerName}.${progressFields.denominator}`,
                        `${this.formatFieldLabel(progressFields.numerator)}`
                      )}
                    </div>
                    ` : ''}

                    {/* Features/Tags if array field exists */}
                    ${fields.some(f => f.isArray && f.type === 'String') ? `
                    {${lowerName}.features && ${lowerName}.features.length > 0 && (
                      <>
                        <Separator className="bg-border dark:bg-gray-700" />
                        <div>
                          <h3 className="font-semibold text-foreground dark:text-white mb-3">Features</h3>
                          <div className="flex flex-wrap gap-2">
                            {${lowerName}.features.map((feature: string, index: number) => (
                              <Badge key={index} variant="outline" className="border-border dark:border-gray-600 text-foreground dark:text-white">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                    ` : ''}
                    ${hasEditableOverview ? `
                      </>
                    )}
                    ` : ''}
                  </TabsContent>`;
  }

  /**
   * TAB NAVIGATION: Generate Details tab content
   */
  private generateDetailsTabContent(model: ModelConfig): string {
    const { name, fields } = model;
    const lowerName = name.charAt(0).toLowerCase() + name.slice(1);

    // Get detailed fields (excluding overview fields)
    const detailFields = fields.filter(f => 
      !['id', 'password', 'createdAt', 'updatedAt', 'description'].includes(f.name) && 
      !f.isComputed &&
      !this.isImageField(f.name)
    ).slice(0, 12);

    const leftColumnFields = detailFields.slice(0, Math.ceil(detailFields.length / 2));
    const rightColumnFields = detailFields.slice(Math.ceil(detailFields.length / 2));

    return `<TabsContent value="details" className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        ${leftColumnFields.map(f => `{${lowerName}.${f.name} && (
                          <div>
                            <div className="text-sm text-muted-foreground dark:text-gray-400">${this.formatFieldLabel(f.name)}</div>
                            <div className="font-semibold text-foreground dark:text-white">
                              ${this.generateFieldDisplayValue(lowerName, f)}
                            </div>
                          </div>
                        )}`).join('\n                        ')}
                      </div>
                      <div className="space-y-3">
                        ${rightColumnFields.map(f => `{${lowerName}.${f.name} && (
                          <div>
                            <div className="text-sm text-muted-foreground dark:text-gray-400">${this.formatFieldLabel(f.name)}</div>
                            <div className="font-semibold text-foreground dark:text-white">
                              ${this.generateFieldDisplayValue(lowerName, f)}
                            </div>
                          </div>
                        )}`).join('\n                        ')}
                      </div>
                    </div>
                  </TabsContent>`;
  }

  /**
   * TAB NAVIGATION: Generate Financials tab content
   */
  private generateFinancialsTabContent(model: ModelConfig): string {
    const { name, fields } = model;
    const lowerName = name.charAt(0).toLowerCase() + name.slice(1);

    // Get financial fields
    const financialFields = fields.filter(f => 
      ['price', 'value', 'cost', 'revenue', 'income', 'appraisal', 'market', 'rental', 'token'].some(keyword =>
        f.name.toLowerCase().includes(keyword)
      ) && (f.type === 'Int' || f.type === 'Float' || f.type === 'Decimal')
    );

    return `<TabsContent value="financials" className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      ${financialFields.map(f => {
                        const isRevenue = f.name.toLowerCase().includes('revenue') || f.name.toLowerCase().includes('income');
                        return `{${lowerName}.${f.name} && (
                        <div className="bg-muted/50 dark:bg-gray-900/50 rounded-lg p-4 border border-border dark:border-gray-700">
                          <div className="text-sm text-muted-foreground dark:text-gray-400">${this.formatFieldLabel(f.name)}</div>
                          <div className="text-2xl font-bold ${isRevenue ? 'text-green-600 dark:text-green-400' : 'text-foreground dark:text-white'}">
                            \${${lowerName}.${f.name}.toLocaleString()}
                          </div>
                        </div>
                      )}`;
                      }).join('\n                      ')}
                    </div>
                  </TabsContent>`;
  }

  /**
   * IMAGE GALLERY: Generate enhanced Media tab with thumbnails, inline edit, and videoUrl
   */
  private generateMediaTabContent(model: ModelConfig): string {
    const { name, fields } = model;
    const lowerName = name.charAt(0).toLowerCase() + name.slice(1);
    const mediaFields = this.getMediaFieldsForModel(model);

    const hasMediaFields = mediaFields.singleImage.length > 0 || mediaFields.multiImage.length > 0 || mediaFields.videoUrl;

    if (!hasMediaFields) {
      return `<TabsContent value="media" className="space-y-4 mt-4">
                    <div className="space-y-6">
                      <p className="text-sm text-muted-foreground dark:text-gray-400">No media fields for this entity.</p>
                    </div>
                  </TabsContent>`;
    }

    // Build combined images array from single + multi image fields
    const singleImageRefs = mediaFields.singleImage.map(f => `${lowerName}.${f} ? String(${lowerName}.${f}) : ''`).join(', ');
    const multiImageSpread = mediaFields.multiImage.map(f => `...(parseGallery(${lowerName}.${f}) || [])`).join(', ');
    const allImagesArray = mediaFields.multiImage.length > 0
      ? `[${singleImageRefs ? singleImageRefs + ', ' : ''}${multiImageSpread}].filter(Boolean)`
      : mediaFields.singleImage.length > 0
        ? `[${singleImageRefs}].filter(Boolean)`
        : `[]`;

    // Media edit form initial state
    const mediaEditFormInit = [
      ...mediaFields.singleImage.map(f => `${f}: ${lowerName}.${f} || ''`),
      ...mediaFields.multiImage.map(f => `${f}: parseGallery(${lowerName}.${f})`),
      ...(mediaFields.videoUrl ? [`${mediaFields.videoUrl}: ${lowerName}.${mediaFields.videoUrl} || ''`] : []),
    ].join(', ');

    // Media edit form update payload
    const mediaEditPayload = [
      ...mediaFields.singleImage.map(f => `${f}: mediaEditForm.${f} || undefined`),
      ...mediaFields.multiImage.map(f => `${f}: mediaEditForm.${f} as any`),
      ...(mediaFields.videoUrl ? [`${mediaFields.videoUrl}: mediaEditForm.${mediaFields.videoUrl} || undefined`] : []),
    ].join(', ');

    // Inline edit form fields
    const editFormFields: string[] = [];
    mediaFields.singleImage.forEach(f => {
      editFormFields.push(`<AdminImageField
                            value={mediaEditForm.${f}}
                            onChange={(url) => setMediaEditForm((prev) => ({ ...prev, ${f}: url }))}
                            label="${this.formatFieldLabel(f)}"
                            required={false}
                          />`);
    });
    mediaFields.multiImage.forEach(f => {
      editFormFields.push(`<AdminMultiImageField
                            value={mediaEditForm.${f}}
                            onChange={(urls) => setMediaEditForm((prev) => ({ ...prev, ${f}: urls }))}
                            label="${this.formatFieldLabel(f)}"
                            required={false}
                            maxImages={20}
                          />`);
    });
    if (mediaFields.videoUrl) {
      editFormFields.push(`<div>
                            <Label htmlFor="media-videoUrl" className="text-foreground dark:text-white">Video URL</Label>
                            <Input
                              id="media-videoUrl"
                              type="url"
                              value={mediaEditForm.${mediaFields.videoUrl}}
                              onChange={(e) => setMediaEditForm((prev) => ({ ...prev, ${mediaFields.videoUrl}: e.target.value }))}
                              placeholder="https://youtube.com/... or https://vimeo.com/..."
                              className="mt-2 bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
                            />
                          </div>`);
    }

    // Video embed section
    let videoEmbedSection = '';
    if (mediaFields.videoUrl) {
      videoEmbedSection = `
                          {${lowerName}.${mediaFields.videoUrl} && (
                            <div>
                              <h3 className="font-semibold text-foreground dark:text-white mb-3">Promotional Video</h3>
                              <div className="rounded-lg overflow-hidden border border-border dark:border-gray-700 bg-muted dark:bg-gray-900">
                                {${lowerName}.${mediaFields.videoUrl}.includes('youtube.com') || ${lowerName}.${mediaFields.videoUrl}.includes('youtu.be') ? (
                                  <div className="aspect-video">
                                    <iframe
                                      src={${lowerName}.${mediaFields.videoUrl}.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                                      title="Video"
                                      className="w-full h-full"
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                    />
                                  </div>
                                ) : ${lowerName}.${mediaFields.videoUrl}.includes('vimeo.com') ? (
                                  <div className="aspect-video">
                                    <iframe
                                      src={${lowerName}.${mediaFields.videoUrl}.replace('vimeo.com/', 'player.vimeo.com/video/')}
                                      title="Video"
                                      className="w-full h-full"
                                      allow="autoplay; fullscreen; picture-in-picture"
                                      allowFullScreen
                                    />
                                  </div>
                                ) : (
                                  <div className="p-4">
                                    <a
                                      href={${lowerName}.${mediaFields.videoUrl}}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary dark:text-orange-400 hover:underline flex items-center gap-2"
                                    >
                                      <LinkIcon className="h-4 w-4" />
                                      {${lowerName}.${mediaFields.videoUrl}}
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}`;
    }

    return `<TabsContent value="media" className="space-y-4 mt-4">
                    <div className="space-y-6">
                      <div className="flex justify-end">
                        <Button
                          variant={mediaEditMode ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            if (!mediaEditMode && ${lowerName}) {
                              setMediaEditForm({
                                ${mediaEditFormInit}
                              });
                            }
                            setMediaEditMode(!mediaEditMode);
                          }}
                          disabled={updateMutation.isPending}
                        >
                          {mediaEditMode ? (
                            <>
                              <X className="h-4 w-4 mr-2" />
                              Cancel
                            </>
                          ) : (
                            <>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit Media
                            </>
                          )}
                        </Button>
                      </div>

                      {mediaEditMode ? (
                        <div className="space-y-6 p-4 rounded-lg border border-border dark:border-gray-700 bg-muted/30 dark:bg-gray-900/30">
                          ${editFormFields.join('\n                          ')}
                          <div className="flex gap-2">
                            <Button
                              onClick={async () => {
                                try {
                                  await updateMutation.mutateAsync({
                                    id: unwrappedParams.id,
                                    ${mediaEditPayload}
                                  });
                                  toast.success('Media updated successfully');
                                  setMediaEditMode(false);
                                  refetch();
                                } catch (err) {
                                  toast.error(err instanceof Error ? err.message : 'Failed to update media');
                                }
                              }}
                              disabled={updateMutation.isPending}
                            >
                              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                              <Save className="h-4 w-4 mr-2" />
                              Save Changes
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {${allImagesArray}.length === 0 ? (
                            <p className="text-sm text-muted-foreground dark:text-gray-400 mb-4">
                              No images yet. Click &quot;Edit Media&quot; to add images.
                            </p>
                          ) : (
                            <div>
                              <h3 className="font-semibold text-foreground dark:text-white mb-3">Images</h3>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                {${allImagesArray}.map((img: string, idx: number) => (
                                  <div
                                    key={\`\${img}-\${idx}\`}
                                    className="relative aspect-square rounded-lg overflow-hidden border border-border dark:border-gray-700 cursor-pointer group"
                                    onClick={() => {
                                      setLightboxImages(${allImagesArray});
                                      setLightboxIndex(idx);
                                      setLightboxOpen(true);
                                    }}
                                  >
                                    <img
                                      src={img}
                                      alt={\`Image \${idx + 1}\`}
                                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                      <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 text-white text-xs rounded px-2 py-1 bg-black/60">
                                      #{idx + 1}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          ${videoEmbedSection}
                        </>
                      )}
                    </div>
                  </TabsContent>`;
  }

  /**
   * IMAGE GALLERY: Generate lightbox modal component
   */
  private generateLightboxModal(): string {
    return `
      {/* Image Lightbox Modal */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-7xl max-h-[95vh] p-0 bg-black/95 dark:bg-black/98 border-none">
          <div className="relative w-full h-[90vh] flex items-center justify-center">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Image Counter */}
            <div className="absolute top-4 left-4 z-50 bg-black/70 text-white px-4 py-2 rounded-md">
              {lightboxIndex + 1} / {lightboxImages.length}
            </div>

            {/* Previous Button */}
            {lightboxImages.length > 1 && lightboxIndex > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-12 w-12"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(prev => Math.max(0, prev - 1));
                }}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
            )}

            {/* Next Button */}
            {lightboxImages.length > 1 && lightboxIndex < lightboxImages.length - 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-12 w-12"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(prev => Math.min(lightboxImages.length - 1, prev + 1));
                }}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            )}

            {/* Main Image */}
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <img
                src={lightboxImages[lightboxIndex]}
                alt={\`Image \${lightboxIndex + 1}\`}
                className="max-w-full max-h-full object-contain"
                style={{
                  transform: \`scale(\${lightboxZoom})\`,
                  transition: 'transform 0.2s ease-out',
                  cursor: lightboxZoom > 1 ? 'grab' : 'default'
                }}
              />
            </div>

            {/* Zoom Controls */}
            <div className="absolute bottom-4 right-4 z-50 flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 bg-black/70"
                onClick={() => setLightboxZoom(prev => Math.max(0.5, prev - 0.25))}
                disabled={lightboxZoom <= 0.5}
              >
                <ZoomOut className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 bg-black/70"
                onClick={() => setLightboxZoom(1)}
              >
                {Math.round(lightboxZoom * 100)}%
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 bg-black/70"
                onClick={() => setLightboxZoom(prev => Math.min(3, prev + 0.25))}
                disabled={lightboxZoom >= 3}
              >
                <ZoomIn className="h-5 w-5" />
              </Button>
            </div>

            {/* Thumbnail Strip */}
            {lightboxImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-2 max-w-[80%] overflow-x-auto px-4 py-2 bg-black/70 rounded-md">
                {lightboxImages.map((img, idx) => (
                  <button
                    key={idx}
                    className={\`relative w-16 h-16 flex-shrink-0 rounded overflow-hidden border-2 transition-all \${
                      idx === lightboxIndex 
                        ? 'border-primary ring-2 ring-primary' 
                        : 'border-white/30 hover:border-white/60'
                    }\`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIndex(idx);
                      setLightboxZoom(1);
                    }}
                  >
                    <img
                      src={img}
                      alt={\`Thumbnail \${idx + 1}\`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Keyboard Navigation */}
      {lightboxOpen && (
        <script
          dangerouslySetInnerHTML={{
            __html: \`
              document.addEventListener('keydown', function(e) {
                if (e.key === 'ArrowLeft' && \${lightboxIndex} > 0) {
                  // Previous image
                  document.querySelector('[data-lightbox-prev]')?.click();
                } else if (e.key === 'ArrowRight' && \${lightboxIndex} < \${lightboxImages.length - 1}) {
                  // Next image  
                  document.querySelector('[data-lightbox-next]')?.click();
                } else if (e.key === 'Escape') {
                  // Close lightbox
                  document.querySelector('[data-lightbox-close]')?.click();
                } else if (e.key === '+' || e.key === '=') {
                  // Zoom in
                  document.querySelector('[data-lightbox-zoom-in]')?.click();
                } else if (e.key === '-' || e.key === '_') {
                  // Zoom out
                  document.querySelector('[data-lightbox-zoom-out]')?.click();
                } else if (e.key === '0') {
                  // Reset zoom
                  document.querySelector('[data-lightbox-zoom-reset]')?.click();
                }
              });
            \`
          }}
        />
      )}
    `;
  }

  /**
   * ENHANCED DOCUMENTS: Generate Documents tab content with multi-select and bulk operations
   */
  private generateDocumentsTabContent(model: ModelConfig): string {
    const { name, relations } = model;
    const lowerName = name.charAt(0).toLowerCase() + name.slice(1);

    const documentsRelation = relations.find(r => r.name.toLowerCase().includes('document'));
    if (!documentsRelation) return '';

    return `<TabsContent value="documents" className="space-y-4 mt-4">
                    {${lowerName}.${documentsRelation.name} && Array.isArray(${lowerName}.${documentsRelation.name}) && (${lowerName}.${documentsRelation.name} as any[]).length > 0 ? (
                      <>
                        {/* Bulk Actions Bar */}
                        <div className="flex items-center justify-between p-4 bg-muted/50 dark:bg-gray-900/50 rounded-lg border border-border dark:border-gray-700">
                          <div className="flex items-center gap-4">
                            <Checkbox
                              checked={selectedDocumentIds.size === (${lowerName}.${documentsRelation.name} as any[]).length}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedDocumentIds(new Set((${lowerName}.${documentsRelation.name} as any[]).map((d: any) => d.id)));
                                } else {
                                  setSelectedDocumentIds(new Set());
                                }
                              }}
                            />
                            <span className="text-sm font-medium text-foreground dark:text-white">
                              {selectedDocumentIds.size > 0 
                                ? \`\${selectedDocumentIds.size} selected\` 
                                : 'Select all'}
                            </span>
                          </div>
                          
                          {selectedDocumentIds.size > 0 && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleBulkDownload}
                                disabled={isBulkDownloading}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                {isBulkDownloading ? 'Downloading...' : \`Download (\${selectedDocumentIds.size})\`}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedDocumentIds(new Set())}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Documents List */}
                        <div className="space-y-3">
                          {(${lowerName}.${documentsRelation.name} as any[]).map((document: any, index: number) => {
                            const isSelected = selectedDocumentIds.has(document.id);
                            const fileIcon = getFileIcon(document.type);
                            
                            return (
                              <div 
                                key={index} 
                                className={\`flex items-center gap-4 p-4 rounded-lg border transition-all \${
                                  isSelected 
                                    ? 'border-primary dark:border-primary bg-primary/5 dark:bg-primary/10' 
                                    : 'border-border dark:border-gray-700 hover:bg-muted/50 dark:hover:bg-gray-900/50'
                                }\`}
                              >
                                {/* Checkbox */}
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    const newSelected = new Set(selectedDocumentIds);
                                    if (checked) {
                                      newSelected.add(document.id);
                                    } else {
                                      newSelected.delete(document.id);
                                    }
                                    setSelectedDocumentIds(newSelected);
                                  }}
                                />

                                {/* File Icon */}
                                <div className="flex-shrink-0">
                                  {fileIcon}
                                </div>

                                {/* Document Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-foreground dark:text-white truncate">
                                    {document.name || document.title || 'Document'}
                                  </div>
                                  <div className="flex items-center gap-3 text-sm text-muted-foreground dark:text-gray-400 mt-1">
                                    <span>{document.type || 'PDF'}</span>
                                    {document.size && <span>• {formatFileSize(document.size)}</span>}
                                    {document.createdAt && (
                                      <span>• Added {formatDistanceToNow(new Date(document.createdAt), { addSuffix: true })}</span>
                                    )}
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setPreviewDocument(document);
                                      setDocumentPreviewOpen(true);
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    asChild
                                  >
                                    <a href={document.url} download target="_blank" rel="noopener noreferrer">
                                      <Download className="h-4 w-4" />
                                    </a>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    asChild
                                  >
                                    <a href={document.url} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="h-4 w-4" />
                                    </a>
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <div className="rounded-full bg-muted dark:bg-gray-900 p-6 w-fit mx-auto mb-4">
                          <FileText className="h-12 w-12 text-muted-foreground dark:text-gray-400" />
                        </div>
                        <h3 className="font-medium text-foreground dark:text-white mb-1">No documents</h3>
                        <p className="text-sm text-muted-foreground dark:text-gray-400">
                          No documents have been uploaded yet
                        </p>
                      </div>
                    )}
                  </TabsContent>`;
  }

  /**
   * ENHANCED DOCUMENTS: Generate document preview modal
   */
  private generateDocumentPreviewModal(): string {
    return `
      {/* Document Preview Modal */}
      <Dialog open={documentPreviewOpen} onOpenChange={setDocumentPreviewOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0">
          {previewDocument && (
            <div className="flex flex-col h-[85vh]">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border dark:border-gray-700">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold text-foreground dark:text-white truncate">
                    {previewDocument.name || previewDocument.title || 'Document Preview'}
                  </h2>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground dark:text-gray-400 mt-1">
                    <span>{previewDocument.type || 'PDF'}</span>
                    {previewDocument.size && <span>• {formatFileSize(previewDocument.size)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={previewDocument.url} download>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </a>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDocumentPreviewOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Preview Content */}
              <div className="flex-1 overflow-auto bg-muted/30 dark:bg-gray-950/30">
                {previewDocument.type?.toLowerCase().includes('pdf') ? (
                  <iframe
                    src={previewDocument.url}
                    className="w-full h-full"
                    title="Document Preview"
                  />
                ) : previewDocument.type?.toLowerCase().match(/image|jpg|jpeg|png|gif|webp/) ? (
                  <div className="flex items-center justify-center h-full p-6">
                    <img
                      src={previewDocument.url}
                      alt={previewDocument.name || 'Preview'}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                    <FileText className="h-16 w-16 text-muted-foreground dark:text-gray-400 mb-4" />
                    <p className="text-foreground dark:text-white font-medium mb-2">
                      Preview not available
                    </p>
                    <p className="text-sm text-muted-foreground dark:text-gray-400 mb-4">
                      This file type cannot be previewed in the browser
                    </p>
                    <Button variant="outline" asChild>
                      <a href={previewDocument.url} download>
                        <Download className="h-4 w-4 mr-2" />
                        Download to view
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    `;
  }

  /**
   * ENHANCED DOCUMENTS: Generate file icon based on type
   */
  private generateFileIconHelper(model: ModelConfig): string {
    const { name, relations } = model;
    const lowerName = name.charAt(0).toLowerCase() + name.slice(1);
    const documentsRelation = relations.find(r => r.name.toLowerCase().includes('document'));
    
    if (!documentsRelation) return '';
    
    return `
  // Helper function to get file icon based on type
  const getFileIcon = (type: string) => {
    const lowerType = (type || '').toLowerCase();
    
    if (lowerType.includes('pdf')) {
      return <div className="w-10 h-10 rounded bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
        <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />
      </div>;
    } else if (lowerType.includes('doc') || lowerType.includes('word')) {
      return <div className="w-10 h-10 rounded bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
        <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      </div>;
    } else if (lowerType.includes('xls') || lowerType.includes('excel') || lowerType.includes('sheet')) {
      return <div className="w-10 h-10 rounded bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
        <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
      </div>;
    } else if (lowerType.includes('image') || lowerType.match(/jpg|jpeg|png|gif|webp/)) {
      return <div className="w-10 h-10 rounded bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
        <ImageIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
      </div>;
    } else {
      return <div className="w-10 h-10 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
      </div>;
    }
  };

  // Helper function to format file size
  const formatFileSize = (bytes: number | string): string => {
    const size = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
    if (isNaN(size)) return 'Unknown size';
    
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
    if (size < 1024 * 1024 * 1024) return (size / 1024 / 1024).toFixed(1) + ' MB';
    return (size / 1024 / 1024 / 1024).toFixed(1) + ' GB';
  };

  // Bulk download handler
  const handleBulkDownload = async () => {
    setIsBulkDownloading(true);
    try {
      const selectedDocs = (${lowerName}.${documentsRelation.name} as any[]).filter((d: any) => 
        selectedDocumentIds.has(d.id)
      );

      // Download each document
      for (const doc of selectedDocs) {
        const link = document.createElement('a');
        link.href = doc.url;
        link.download = doc.name || 'document';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Clear selection after download
      setSelectedDocumentIds(new Set());
    } catch (error) {
      console.error('Bulk download error:', error);
    } finally {
      setIsBulkDownloading(false);
    }
  };
    `;
  }

  /**
   * TAB NAVIGATION: Generate Relations tab content
   */
  private generateRelationsTabContent(model: ModelConfig): string {
    const { name, relations } = model;
    const lowerName = name.charAt(0).toLowerCase() + name.slice(1);

    // Exclude document relations (handled separately)
    const displayRelations = relations.filter(r => !r.name.toLowerCase().includes('document'));

    return `<TabsContent value="relations" className="space-y-4 mt-4">
                    <div className="space-y-6">
                      ${displayRelations.map(r => {
                        const isArray = r.type === 'one-to-many';
                        return `{${lowerName}.${r.name} && (
                        <div>
                          <h3 className="font-semibold text-foreground dark:text-white mb-3">${this.formatFieldLabel(r.name)}</h3>
                          ${isArray ? `
                          {Array.isArray(${lowerName}.${r.name}) && (${lowerName}.${r.name} as any[]).length > 0 ? (
                            <div className="space-y-2">
                              {(${lowerName}.${r.name} as any[]).map((item: any, index: number) => (
                                <div key={index} className="p-3 rounded-lg border border-border dark:border-gray-700 hover:bg-muted/50 dark:hover:bg-gray-900/50 transition-colors">
                                  <div className="font-medium text-foreground dark:text-white">
                                    {item.name || item.title || item.email || item.id}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground dark:text-gray-400">No ${r.name} found</p>
                          )}
                          ` : `
                          <div className="p-4 rounded-lg border border-border dark:border-gray-700">
                            <div className="font-medium text-foreground dark:text-white">
                              {(${lowerName}.${r.name} as any)?.name || (${lowerName}.${r.name} as any)?.title || (${lowerName}.${r.name} as any)?.email || (${lowerName}.${r.name} as any)?.id}
                            </div>
                          </div>
                          `}
                        </div>
                      )}`;
                      }).join('\n                      ')}
                    </div>
                  </TabsContent>`;
  }

  /**
   * TAB NAVIGATION: Get appropriate icon for a field name
   */
  private getIconForField(fieldName: string): string {
    const lowerName = fieldName.toLowerCase();
    
    if (lowerName.includes('email')) return 'Mail';
    if (lowerName.includes('phone')) return 'Phone';
    if (lowerName.includes('address') || lowerName.includes('location')) return 'MapPin';
    if (lowerName.includes('date') || lowerName.includes('time')) return 'Calendar';
    if (lowerName.includes('bed')) return 'Bed';
    if (lowerName.includes('bath')) return 'Bath';
    if (lowerName.includes('size') || lowerName.includes('area')) return 'Ruler';
    if (lowerName.includes('price') || lowerName.includes('value')) return 'DollarSign';
    if (lowerName.includes('status')) return 'CheckCircle';
    if (lowerName.includes('type') || lowerName.includes('category')) return 'Tag';
    if (lowerName.includes('build')) return 'Building2';
    if (lowerName.includes('user') || lowerName.includes('owner')) return 'User';
    
    return 'Info';
  }

  /**
   * QUICK WIN: Check if model has progress indicator fields (e.g., soldTokens/totalTokens)
   * Excludes DateTime fields (e.g. completedAt) - progress numerator must be numeric.
   */
  private hasProgressFields(model: ModelConfig): { numerator: string; denominator: string } | null {
    const fields = model.fields;
    
    // Check for token fields
    const soldField = fields.find(f => f.name === 'soldTokens' || f.name === 'sold');
    const totalField = fields.find(f => f.name === 'totalTokens' || f.name === 'total');
    
    if (soldField && totalField) {
      return { numerator: soldField.name, denominator: totalField.name };
    }
    
    // Check for soldCount/totalInventory (venue tickets, inventory)
    const soldCountField = fields.find(f => f.name === 'soldCount');
    const totalInventoryField = fields.find(f => f.name === 'totalInventory');
    if (soldCountField && totalInventoryField) {
      return { numerator: soldCountField.name, denominator: totalInventoryField.name };
    }
    
    // Check for other progress patterns (completed/total, used/capacity, etc.)
    // Exclude DateTime - completedAt is a date, not a count
    const progressPatterns = [
      { num: 'completed', denom: 'total' },
      { num: 'used', denom: 'capacity' },
      { num: 'filled', denom: 'size' },
      { num: 'current', denom: 'max' }
    ];
    
    for (const pattern of progressPatterns) {
      const numField = fields.find(f =>
        f.name.toLowerCase().includes(pattern.num) &&
        f.type !== 'DateTime' // Exclude DateTime (e.g. completedAt)
      );
      const denomField = fields.find(f => f.name.toLowerCase().includes(pattern.denom));
      if (numField && denomField) {
        return { numerator: numField.name, denominator: denomField.name };
      }
    }
    
    return null;
  }

  /**
   * QUICK WIN: Generate progress indicator component
   */
  private generateProgressIndicator(numerator: string, denominator: string, label: string): string {
    return `<div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground dark:text-gray-400">${label}</span>
                    <span className="font-medium text-foreground dark:text-white">
                      {${numerator} || 0} / {${denominator} || 0}
                    </span>
                  </div>
                  <Progress value={((${numerator} || 0) / (${denominator} || 1)) * 100} className="h-2" />
                  <p className="text-xs text-muted-foreground dark:text-gray-400 text-center">
                    {(((${numerator} || 0) / (${denominator} || 1)) * 100).toFixed(1)}% Complete
                  </p>
                </div>`;
  }

  /**
   * QUICK WIN: Generate rich loading state with icon and message
   */
  private generateRichLoadingState(entityName: string, fullPage: boolean = false): string {
    if (fullPage) {
      return `<div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary dark:text-blue-400 mx-auto mb-4" />
              <p className="text-muted-foreground dark:text-gray-400">Loading ${entityName} details...</p>
            </div>
          </div>
        </div>`;
    } else {
      return `<div className="flex items-center justify-center p-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary dark:text-blue-400 mx-auto mb-4" />
                <p className="text-muted-foreground dark:text-gray-400">Loading ${entityName}s...</p>
              </div>
            </div>`;
    }
  }

  /**
   * QUICK WIN: Generate rich empty state with icon, message, and optional action
   */
  private generateRichEmptyState(entityName: string, searchActive: boolean = false, showCreateButton: boolean = false): string {
    const lowerName = entityName.charAt(0).toLowerCase() + entityName.slice(1);
    
    return `<div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted dark:bg-gray-900 p-6 mb-4">
                <AlertCircle className="h-12 w-12 text-muted-foreground dark:text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-foreground dark:text-white mb-1">
                No ${lowerName}s found
              </h3>
              <p className="text-sm text-muted-foreground dark:text-gray-400 mb-4 max-w-sm">
                ${searchActive 
                  ? `No ${lowerName}s match your search criteria. Try adjusting your filters.` 
                  : `Get started by creating your first ${lowerName}.`
                }
              </p>
              ${searchActive ? `
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
              ` : showCreateButton ? `
              <Link href="/admin/${lowerName}/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create ${entityName}
                </Button>
              </Link>
              ` : ''}
            </div>`;
  }

  /**
   * Generate reusable form component for create/edit operations
   */
  private generateFormComponent(model: ModelConfig, databaseFirst: boolean = false): string {
    const { name, fields, relations } = model;
    const lowerName = name.charAt(0).toLowerCase() + name.slice(1);
    
    // Check if specialized form store exists
    const specializedStorePath = `src/stores/form-stores/${lowerName}-form-store.ts`;
    const hasSpecializedStore = existsSync(join(this.projectRoot, specializedStorePath));
    
    // Get editable fields - no cap, include all fields from schema
    const editableFields = fields.filter(f => 
      !['id', 'createdAt', 'updatedAt', 'password'].includes(f.name) && 
      !f.isComputed
    );
    
    // Get enum fields and their types
    const enumFields = editableFields.filter(f => f.isEnum && f.typeName);
    const enumImports = enumFields.length > 0
      ? `import { ${[...new Set(enumFields.map(f => f.typeName))].join(', ')}, getEnumValues, getEnumLabel } from '@/lib/enums';`
      : '';
    
    // Get mandatory relations (excluding enum fields and primitive types)
    const enumFieldNames = new Set(editableFields.filter(f => f.isEnum).map(f => f.name));
    const primitiveTypes = ['BigInt', 'String', 'Int', 'Float', 'Decimal', 'Boolean', 'DateTime', 'Json', 'Bytes'];
    const mandatoryRelations = relations.filter(r => 
      !r.isOptional && 
      r.type === 'many-to-one' &&
      !enumFieldNames.has(r.name) &&
      !primitiveTypes.includes(r.model)
    );
    
    // Also handle optional relations that might be useful for forms
    const optionalRelations = relations.filter(r => 
      r.isOptional && 
      r.type === 'many-to-one' &&
      !enumFieldNames.has(r.name) &&
      !primitiveTypes.includes(r.model)
    );
    
    // Combine all relations for dropdown generation
    const allRelations = [...mandatoryRelations, ...optionalRelations];
    
    // Deduplicate relations by model name to prevent duplicate hooks
    const uniqueRelationsByModel = new Map<string, typeof allRelations[0]>();
    allRelations.forEach(rel => {
      const relLower = rel.model.charAt(0).toLowerCase() + rel.model.slice(1);
      if (!uniqueRelationsByModel.has(relLower)) {
        uniqueRelationsByModel.set(relLower, rel);
      }
    });
    const uniqueRelations = Array.from(uniqueRelationsByModel.values());
    
    // Generate import statements for fetching relation data via API
    const relationImports = uniqueRelations.length > 0 
      ? `import { useQuery } from '@tanstack/react-query';` 
      : '';
    
    // Generate API fetching hooks for relation data - using API endpoints instead of direct hooks
    // Only generate one hook per unique model
    const relationHooks = uniqueRelations.length > 0
      ? uniqueRelations.map(r => {
          const relModel = r.model;
          const relLower = relModel.charAt(0).toLowerCase() + relModel.slice(1);
          // Handle camelCase model names (e.g., RealEstateAsset -> realEstateAsset)
          const apiEndpoint = `/api/${relLower}`;
          return `  // Fetch ${relModel} options via API
  const { data: ${relLower}Response, isLoading: ${relLower}Loading, error: ${relLower}Error } = useQuery({
    queryKey: ['${relLower}Options'],
    queryFn: async () => {
      const response = await fetch('${apiEndpoint}?pageSize=100', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch ${relModel} options');
      const result = await response.json();
      return Array.isArray(result.data) ? result.data : result.data || [];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  const ${relLower}Options = ${relLower}Response || [];`;
        }).join('\n')
      : '';
    
    return `// Generated Form Component for ${name}
// DO NOT EDIT - Auto-generated by CompleteEntityGenerator
${databaseFirst ? '// ⚠️ DATABASE-FIRST DATA POLICY ENFORCED' : ''}
// All data in this component MUST come from database queries, never hardcoded

'use client';

import React, { useEffect } from 'react';
import { useCreate${name}, useUpdate${name} } from '@/generated/hooks/${lowerName}-hooks';
${relationImports}
${enumImports}
${hasSpecializedStore ? `import { use${name}FormStore, type ${name}FormData } from '@/stores/form-stores/${lowerName}-form-store';` : 'import { useGeneratedFormStore } from \'@/stores/generated-form-store\';'}
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ${name}, Create${name}Input, Update${name}Input } from '@/generated/types/${lowerName}-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
${editableFields.some(f => f.isBlob || f.isImage || f.isDocument) ? `import { AdminBlobField } from '@/components/admin/shared/AdminBlobField';` : ''}
import { AdminImageField } from '@/components/admin/shared/AdminImageField';
import { AdminMultiImageField } from '@/components/admin/shared/AdminMultiImageField';
import { Loader2 } from 'lucide-react';

interface ${name}FormProps {
  mode: 'create' | 'edit';
  data?: ${name};
  onSuccess: () => void;
  onCancel: () => void;
}

// ✅ REDUX/ZUSTAND PATTERN - Default form data
const defaultFormData: any = {
${editableFields.map(f => {
  if (f.isEnum) {
    return `  ${f.name}: '',`;
  }
  if (f.type === 'String') {
    return `  ${f.name}: '',`;
  }
  if (f.type === 'Int' || f.type === 'Float' || f.type === 'Decimal') {
    return `  ${f.name}: 0,`;
  }
  if (f.type === 'Boolean') {
    return `  ${f.name}: false,`;
  }
  if (f.type === 'DateTime') {
    return `  ${f.name}: '',`;
  }
  return `  ${f.name}: '',`;
}).join('\n')}
};

export function ${name}Form({ mode, data, onSuccess, onCancel }: ${name}FormProps) {
  // ✅ REDUX/ZUSTAND PATTERN - Use ${hasSpecializedStore ? 'Specialized' : 'Generated'} Form Store
  const {
    initializeForm,
    updateField,
    getFormData,  
    submitForm,
    setFieldError,
    isFormDirty,
    destroyForm${hasSpecializedStore ? `,
    getFormErrors` : ''},
  } = ${hasSpecializedStore ? `use${name}FormStore()` : 'useGeneratedFormStore()'};
  
  const createMutation = useCreate${name}();
  const updateMutation = useUpdate${name}();
  
  // Generate unique form ID
  const formId = \`${lowerName}-form-\${mode}-\${data?.id || 'new'}\`;
${relationHooks ? '\n  // Fetch relation data from API endpoints\n' + relationHooks : ''}

  // ✅ REDUX/ZUSTAND PATTERN - Single mount-time initialization
  useEffect(() => {
    // Prepare initial data
    let initialData: any;
    
    if (data && mode === 'edit') {
      initialData = {
${editableFields.map(f => {
  if (f.isEnum) {
    return `        ${f.name}: data.${f.name} ? String(data.${f.name}).toUpperCase() : '',`;
  }
  if (f.type === 'Int' || f.type === 'Float' || f.type === 'Decimal') {
    return `        ${f.name}: data.${f.name} ?? 0,`;
  }
  if (f.type === 'Boolean') {
    return `        ${f.name}: data.${f.name} ?? false,`;
  }
  if (f.type === 'DateTime') {
    return `        ${f.name}: data.${f.name} || '',`;
  }
  return `        ${f.name}: data.${f.name} || '',`;
}).join('\n')}
      };
    } else {
      initialData = defaultFormData;
    }
    
    ${hasSpecializedStore ? `initializeForm(formId, initialData);` : `initializeForm(formId, '${name}', mode, {}, initialData);`}
    
    return () => {
      // ✅ Cleanup - preserve dirty forms (drafts)
      if (!isFormDirty(formId)) {
        destroyForm(formId);
      }
    };
  }, []); // ✅ Empty deps - runs once on mount

  // ✅ REDUX/ZUSTAND PATTERN - Get form data from store
  const formData = getFormData(formId) ?? defaultFormData;

  const handleChange = (field: ${hasSpecializedStore ? `keyof ${name}FormData` : 'string'}, value: any) => {
    updateField(formId, field, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clean up form data
    const cleanedData = Object.entries(formData).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {} as any);

    // Use submitForm callback pattern
    const success = await submitForm(formId, async () => {
      if (mode === 'create') {
        await createMutation.mutateAsync(cleanedData as Create${name}Input);
      } else if (mode === 'edit' && data) {
        await updateMutation.mutateAsync({
          id: data.id,
          ...cleanedData
        } as Update${name}Input);
      }
    });

    if (success) {
      toast.success(\`${name} \${mode === 'create' ? 'created' : 'updated'} successfully\`);
      onSuccess();
      destroyForm(formId);
    } else {
      ${hasSpecializedStore 
        ? `const formErrors = getFormErrors(formId);
      const allErrors = Object.values(formErrors).flat();
      if (allErrors.length > 0) {
        toast.error(\`Validation Error: \${allErrors.join(', ')}\`);
      } else {
        toast.error(\`Failed to \${mode} ${lowerName}\`);
      }`
        : `const form = getFormData(formId);
      const errors = form?.submission?.submitErrors || [];
      if (errors.length > 0) {
        toast.error(\`Validation Error: \${errors.join(', ')}\`);
      } else {
        toast.error(\`Failed to \${mode} ${lowerName}\`);
      }`}
    }
  };
  
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      ${this.generateFormSections(model, editableFields)}
      ${allRelations.length > 0 ? `
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Relations */}
        ${allRelations.map(r => this.generateRelationField(r)).join('\n        ')}
      </div>` : ''}

      <div className="flex justify-end gap-3 pt-6 border-t border-border dark:border-gray-700">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? 'Create' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
`;
  }

  /**
   * Generate admin list page for a model with proper layout integration
   */
  private generateAdminListPage(model: ModelConfig): string {
    const { name } = model;
    const lowerName = name.charAt(0).toLowerCase() + name.slice(1);
    
    return `'use client';

import React from 'react';
import { ${name}AdminTable } from '@/components/admin/${lowerName}-admin-table';

// Force dynamic rendering - admin pages use context hooks
export const dynamic = 'force-dynamic';

// Admin layout (AdminShell) provides sidebar+header - do NOT wrap in DashboardLayout
export default function ${name}AdminPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <${name}AdminTable />
    </div>
  );
}
`;
  }

  /**
   * Generate create page for a model
   */
  private generateCreatePage(model: ModelConfig): string {
    const { name } = model;
    const lowerName = name.charAt(0).toLowerCase() + name.slice(1);
    const stripeNotice = usesStripePayment(name) ? getStripePaymentCreateNotice(name) : null;

    return `'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ${name}Form } from '@/components/admin/${lowerName}-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Force dynamic rendering - admin pages use context hooks
export const dynamic = 'force-dynamic';

export default function Create${name}Page() {
  const router = useRouter();
  const { toast } = useToast();

  const handleSuccess = () => {
    toast({
      title: "Success",
      description: "${name} created successfully",
    });
    router.push('/admin/${lowerName}');
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Breadcrumb Navigation */}
      <div className="mb-6">
        <Link href="/admin/${lowerName}">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to ${name}s
          </Button>
        </Link>
      </div>

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Create ${name}</h1>
        <p className="text-muted-foreground mt-2">
          Fill in the information to create a new ${lowerName}
        </p>
      </div>

      ${stripeNotice ? `{/* Stripe Payment Notice */}
      <Alert className="mb-6 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
        <CreditCard className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        <AlertDescription className="text-orange-800 dark:text-orange-200">
          ${stripeNotice}
        </AlertDescription>
      </Alert>

      ` : ''}
      {/* Form Card */}
      <Card className="bg-card dark:bg-gray-800 border-border dark:border-gray-700 transition-all duration-200 hover:shadow-lg dark:hover:shadow-gray-900/50">
        <CardHeader>
          <CardTitle className="text-foreground dark:text-white">New ${name}</CardTitle>
          <CardDescription className="text-muted-foreground dark:text-gray-400">
            Enter the details for the new ${lowerName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <${name}Form 
            mode="create"
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </CardContent>
      </Card>
    </div>
  );
}
`;
  }

  /**
   * Generate view page for a model
   */
  private generateViewPage(model: ModelConfig): string {
    const { name, fields } = model;
    const lowerName = name.charAt(0).toLowerCase() + name.slice(1);
    
    // Get display fields - no cap, use all schema fields
    const displayFields = fields.filter(f => 
      !['password', 'createdAt', 'updatedAt'].includes(f.name) && 
      !f.isComputed
    );

    const hasWalletFields = fields.some(f => 
      f.name.toLowerCase().includes('wallet') || f.name === 'email'
    );
    
    // Check for progress fields
    const progressFields = this.hasProgressFields(model);
    const hasProgress = progressFields !== null;
    
    // Get tabs and required icons for this model
    const tabs = this.getTabsForModel(model);
    const hasMediaTab = tabs.some(t => t.id === 'media');
    const mediaFields = hasMediaTab ? this.getMediaFieldsForModel(model) : null;
    const hasEditableMedia = hasMediaTab && mediaFields &&
      (mediaFields.singleImage.length > 0 || mediaFields.multiImage.length > 0 || mediaFields.videoUrl);
    const hasOverviewTab = tabs.some(t => t.id === 'overview');
    const overviewEditableFieldsRaw = hasOverviewTab ? fields.filter(f =>
      ['title', 'name', 'description', 'tagline', 'type', 'businessname', 'businesstype', 'category'].some(k =>
        f.name.toLowerCase().includes(k)
      ) && ['String', 'Int'].includes(f.type) && !f.isComputed
    ) : [];
    const overviewSeenNames = new Set<string>();
    const overviewEditableFields = overviewEditableFieldsRaw.filter(f => {
      if (overviewSeenNames.has(f.name)) return false;
      overviewSeenNames.add(f.name);
      return true;
    }).slice(0, 6);
    const hasEditableOverview = hasOverviewTab && overviewEditableFields.length > 0;
    const hasEditableContent = hasEditableMedia || hasEditableOverview;
    
    // Base icons that are always imported
    const baseIcons = new Set([
      'ArrowLeft', 'Edit', 'Trash2', 'Loader2', 'AlertTriangle',
      'ExternalLink', 'ZoomIn', 'ZoomOut', 'ChevronLeft', 'ChevronRight', 'ChevronDown',
      'X', 'Download', 'Eye', 'FileText', 'Image', 'Link',
      ...(hasEditableContent ? ['Pencil', 'Save'] as const : [])
    ]);
    
    // Collect additional icons needed, excluding base icons
    const additionalIcons = [...new Set(
      tabs.map(t => t.icon).filter(Boolean)
        .concat(fields.map(f => this.getIconForField(f.name)))
    )].filter(icon => icon && !baseIcons.has(icon));
    
    const additionalIconsStr = additionalIcons.length > 0 ? `,\n  ${additionalIcons.join(',\n  ')}` : '';
    
    // Check if we need the Link icon (will be aliased to avoid conflict with next/link)
    const needsLinkIcon = tabs.some(t => t.icon === 'Link') || 
                         fields.some(f => this.getIconForField(f.name) === 'Link');

    return `'use client';

import React from 'react';
import { use${name}${hasEditableContent ? `, useUpdate${name}` : ''} } from '@/generated/hooks/${lowerName}-hooks';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';${hasEditableContent ? `
import { Input } from '@/components/ui/input';` : ''}${hasProgress ? `
import { Progress } from '@/components/ui/progress';` : ''}${hasEditableMedia ? `
import { AdminImageField } from '@/components/admin/shared/AdminImageField';
import { AdminMultiImageField } from '@/components/admin/shared/AdminMultiImageField';` : ''}${hasEditableContent ? `
import { toast } from 'sonner';` : ''}${hasEditableOverview ? `
import { Textarea } from '@/components/ui/textarea';` : ''}

// Force dynamic rendering - admin pages use context hooks
export const dynamic = 'force-dynamic';
${hasEditableMedia && mediaFields && mediaFields.multiImage.length > 0 ? `
/** Parse gallery from JSON string or array */
function parseGallery(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((v: unknown): v is string => typeof v === 'string') : [];
    } catch {
      return value.trim() ? [value] : [];
    }
  }
  return [];
}
` : ''}
import {
  ArrowLeft,
  Edit,
  Trash2,
  Loader2,
  AlertTriangle,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  X,
  Download,
  Eye,
  FileText,
  Image as ImageIcon${needsLinkIcon ? `,\n  Link as LinkIcon` : ''}${hasEditableContent ? `,\n  Pencil,\n  Save` : ''}${additionalIconsStr}
} from 'lucide-react';${hasWalletFields ? `
import { obfuscateWalletAddress } from '@/lib/utils';` : ''}
import { formatDistanceToNow } from 'date-fns';

export default function View${name}Page({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState('overview');
  
  // Lightbox state for image gallery
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [lightboxIndex, setLightboxIndex] = React.useState(0);
  const [lightboxImages, setLightboxImages] = React.useState<string[]>([]);
  const [lightboxZoom, setLightboxZoom] = React.useState(1);
  
  // Document management state
  const [selectedDocumentIds, setSelectedDocumentIds] = React.useState<Set<string>>(new Set());
  const [isBulkDownloading, setIsBulkDownloading] = React.useState(false);
  const [documentPreviewOpen, setDocumentPreviewOpen] = React.useState(false);
  const [previewDocument, setPreviewDocument] = React.useState<any>(null);${hasEditableMedia ? `
  
  // Media tab inline edit state
  const [mediaEditMode, setMediaEditMode] = React.useState(false);
  const [mediaEditForm, setMediaEditForm] = React.useState<Record<string, any>>({});` : ''}${hasEditableOverview ? `
  
  // Overview tab inline edit state
  const [overviewEditMode, setOverviewEditMode] = React.useState(false);
  const [overviewEditForm, setOverviewEditForm] = React.useState<Record<string, any>>({});` : ''}
  
  // Unwrap params for Next.js 15+ compatibility
  const unwrappedParams = React.use(params);
  const { data: ${lowerName}, isLoading, error${hasEditableContent ? ', refetch' : ''} } = use${name}(unwrappedParams.id);${hasEditableContent ? `
  const updateMutation = useUpdate${name}();` : ''}

  ${this.getTabsForModel(model).some(t => t.id === 'documents') ? this.generateFileIconHelper(model) : ''}

  if (isLoading) {
    return (
      ${this.generateRichLoadingState(name, true)}
    );
  }

  if (error || !${lowerName}) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="rounded-full bg-destructive/10 dark:bg-red-900/20 p-6 mb-4">
            <AlertTriangle className="h-12 w-12 text-destructive dark:text-red-400" />
          </div>
          <h3 className="text-lg font-medium text-foreground dark:text-white mb-1">
            Error loading ${lowerName}
          </h3>
          <p className="text-sm text-muted-foreground dark:text-gray-400 mb-4">
            {error?.message || 'Failed to load ${lowerName} details'}
          </p>
          <Button onClick={() => router.push('/admin/${lowerName}')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to ${name}s
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Breadcrumb Navigation */}
      <div className="mb-6">
        <Link href="/admin/${lowerName}">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to ${name}s
            </Button>
          </Link>
        </div>

        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">${name} Details</h1>
            <p className="text-muted-foreground mt-2">
              View details for this ${lowerName}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={\`/admin/${lowerName}/\${unwrappedParams.id}/edit\`}>
              <Button>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
            <Link href={\`/admin/${lowerName}/\${unwrappedParams.id}/delete\`}>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </Link>
          </div>
        </div>

        {/* Details Card with Tabs */}
        <Card className="bg-card dark:bg-gray-800 border-border dark:border-gray-700 transition-all duration-200 hover:shadow-lg dark:hover:shadow-gray-900/50">
          <CardHeader>
            <CardTitle className="text-foreground dark:text-white">${name} Information</CardTitle>
            <CardDescription className="text-muted-foreground dark:text-gray-400">
              Detailed information about this ${lowerName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-${this.getTabsForModel(model).length} bg-muted dark:bg-gray-900">
                ${this.getTabsForModel(model).map(tab => `<TabsTrigger value="${tab.id}">${tab.label}</TabsTrigger>`).join('\n                ')}
              </TabsList>

              ${this.generateOverviewTabContent(model)}
              ${this.getTabsForModel(model).some(t => t.id === 'details') ? this.generateDetailsTabContent(model) : ''}
              ${this.getTabsForModel(model).some(t => t.id === 'financials') ? this.generateFinancialsTabContent(model) : ''}
              ${this.getTabsForModel(model).some(t => t.id === 'media') ? this.generateMediaTabContent(model) : ''}
              ${this.getTabsForModel(model).some(t => t.id === 'documents') ? this.generateDocumentsTabContent(model) : ''}
              ${this.getTabsForModel(model).some(t => t.id === 'relations') ? this.generateRelationsTabContent(model) : ''}
            </Tabs>
          </CardContent>
        </Card>

        ${this.getTabsForModel(model).some(t => t.id === 'media') ? this.generateLightboxModal() : ''}
        ${this.getTabsForModel(model).some(t => t.id === 'documents') ? this.generateDocumentPreviewModal() : ''}
      </div>
  );
}
`;
  }

  /**
   * Generate edit page for a model
   */
  private generateEditPage(model: ModelConfig): string {
    const { name } = model;
    const lowerName = name.charAt(0).toLowerCase() + name.slice(1);
    
    return `'use client';

import React from 'react';
import { use${name} } from '@/generated/hooks/${lowerName}-hooks';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ${name}Form } from '@/components/admin/${lowerName}-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';

// Force dynamic rendering - admin pages use context hooks
export const dynamic = 'force-dynamic';
import { useToast } from '@/hooks/use-toast';

export default function Edit${name}Page({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { toast } = useToast();
  // Unwrap params for Next.js 15+ compatibility
  const unwrappedParams = React.use(params);
  const { data: ${lowerName}, isLoading, error } = use${name}(unwrappedParams.id);

  const handleSuccess = () => {
    toast({
      title: "Success",
      description: "${name} updated successfully",
    });
    router.push(\`/admin/${lowerName}/\${unwrappedParams.id}\`);
  };

  const handleCancel = () => {
    router.back();
  };

  if (isLoading) {
    return (
      ${this.generateRichLoadingState(name, true)}
    );
  }

  if (error || !${lowerName}) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="rounded-full bg-destructive/10 dark:bg-red-900/20 p-6 mb-4">
            <AlertTriangle className="h-12 w-12 text-destructive dark:text-red-400" />
          </div>
          <h3 className="text-lg font-medium text-foreground dark:text-white mb-1">
            Error loading ${lowerName}
          </h3>
          <p className="text-sm text-muted-foreground dark:text-gray-400 mb-4">
            {error?.message || 'Failed to load ${lowerName} for editing'}
          </p>
          <Button onClick={() => router.push('/admin/${lowerName}')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to ${name}s
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Breadcrumb Navigation */}
      <div className="mb-6 flex items-center gap-2">
        <Link href="/admin/${lowerName}">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to ${name}s
            </Button>
          </Link>
          <span className="text-muted-foreground">/</span>
          <Link href={\`/admin/${lowerName}/\${unwrappedParams.id}\`}>
            <Button variant="ghost" size="sm">
              View ${name}
            </Button>
          </Link>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Edit ${name}</h1>
          <p className="text-muted-foreground mt-2">
            Update the information for this ${lowerName}
          </p>
        </div>

        {/* Form Card */}
        <Card className="bg-card dark:bg-gray-800 border-border dark:border-gray-700 transition-all duration-200 hover:shadow-lg dark:hover:shadow-gray-900/50">
          <CardHeader>
            <CardTitle className="text-foreground dark:text-white">Edit ${name}</CardTitle>
            <CardDescription className="text-muted-foreground dark:text-gray-400">
              Make changes to the ${lowerName} details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <${name}Form 
              mode="edit"
              data={${lowerName}}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </CardContent>
        </Card>
      </div>
  );
}
`;
  }

  /**
   * Generate delete page for a model
   */
  private generateDeletePage(model: ModelConfig): string {
    const { name } = model;
    const lowerName = name.charAt(0).toLowerCase() + name.slice(1);
    
    return `'use client';

import React, { useState } from 'react';
import { use${name}, useDelete${name} } from '@/generated/hooks/${lowerName}-hooks';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, AlertTriangle, Loader2 } from 'lucide-react';

// Force dynamic rendering - admin pages use context hooks
export const dynamic = 'force-dynamic';
import { useToast } from '@/hooks/use-toast';

export default function Delete${name}Page({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  // Unwrap params for Next.js 15+ compatibility
  const unwrappedParams = React.use(params);
  
  const { data: ${lowerName}, isLoading, error } = use${name}(unwrappedParams.id);
  const deleteMutation = useDelete${name}();

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteMutation.mutateAsync(unwrappedParams.id);
      
      toast({
        title: "Success",
        description: "${name} deleted successfully",
      });
      
      router.push('/admin/${lowerName}');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete ${lowerName}",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error || !${lowerName}) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center p-12">
          <p className="text-destructive">Error loading ${lowerName}</p>
          <Button onClick={() => router.push('/admin/${lowerName}')} className="mt-4">
            Back to ${name}s
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Breadcrumb Navigation */}
        <div className="mb-6 flex items-center gap-2">
          <Link href="/admin/${lowerName}">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to ${name}s
            </Button>
          </Link>
          <span className="text-muted-foreground">/</span>
          <Link href={\`/admin/${lowerName}/\${unwrappedParams.id}\`}>
            <Button variant="ghost" size="sm">
              View ${name}
            </Button>
          </Link>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-destructive">Delete ${name}</h1>
          <p className="text-muted-foreground mt-2">
            Permanently delete this ${lowerName}
          </p>
        </div>

        {/* Warning Card */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirm Deletion
            </CardTitle>
            <CardDescription>
              This action cannot be undone
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                You are about to permanently delete this ${lowerName}. This action cannot be undone
                and all associated data will be lost.
              </AlertDescription>
            </Alert>

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">You are deleting:</p>
              <p className="text-sm text-muted-foreground font-mono">
                {${lowerName}.id}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isDeleting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1"
              >
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
`;
  }

  /**
   * Main generation method
   */
  async generate(options: {
    models?: string[];
    categories?: string[];
    priorities?: ('critical' | 'high' | 'medium' | 'low')[];
    types?: boolean;
    hooks?: boolean;
    api?: boolean;
    apiRoutes?: boolean;
    components?: boolean;
    pages?: boolean;
    databaseFirst?: boolean;
    verifyFiles?: boolean;
    allowDifferences?: boolean;
  } = {}) {

    // Validate documentation routing configuration
    const routingValidation = validateDocumentationRouting();
    if (!routingValidation.isValid) {
      console.warn('⚠️  Documentation routing configuration issues:');
      routingValidation.errors.forEach(error => console.warn(`   ❌ ${error}`));
      routingValidation.warnings.forEach(warning => console.warn(`   ⚠️  ${warning}`));
    } else {
      console.log('✅ Documentation routing configuration is valid');
    }
    const {
      models: modelNames,
      categories,
      priorities,
      types = true,
      hooks = true,
      api = true,
      apiRoutes = true,
      components = true,
      pages = true,
      databaseFirst = false,
      verifyFiles = false,
      allowDifferences = false
    } = options;

    // Initialize verification system if enabled
    if (verifyFiles) {
      this.verificationSystem = new FileVerificationSystem(process.cwd(), this.baseDir);
      this.verificationSystem.initializeTempDir();
      this.useTempDir = true;
      console.log('🔍 File verification enabled - files will be generated to temporary directory first');
    }

    // Filter models based on options
    let modelsToGenerate = Array.from(this.models.values());

    if (modelNames?.length) {
      modelsToGenerate = modelsToGenerate.filter(m => modelNames.includes(m.name));
    }

    if (categories?.length) {
      modelsToGenerate = modelsToGenerate.filter(m => categories.includes(m.category));
    }

    if (priorities?.length) {
      modelsToGenerate = modelsToGenerate.filter(m => priorities.includes(m.priority));
    }

    console.log(`\n🚀 Generating code for ${modelsToGenerate.length} models...\n`);

    // Create directories
    this.ensureDirectories();

    // Generate code for each model
    for (const model of modelsToGenerate) {
      console.log(`📦 Generating ${model.name} (${model.category}, ${model.priority})...`);

      const lowerName = model.name.charAt(0).toLowerCase() + model.name.slice(1);

      if (types) {
        const typesCode = this.generateTypes(model);
        this.writeFile(`types/${lowerName}-types.ts`, typesCode);
      }

      if (hooks) {
        const hooksCode = this.generateHooks(model);
        this.writeFile(`hooks/${lowerName}-hooks.ts`, hooksCode);
      }

      if (api) {
        const apiCode = this.generateApi(model);
        // Write to directory structure: api/vendorProfile/vendorProfileApi.ts
        this.writeFile(`api/${lowerName}/${lowerName}Api.ts`, apiCode);
      }

      if (apiRoutes) {
        const apiRouteCode = this.generateApiRoute(model);
        const apiRouteByIdCode = this.generateApiRouteById(model);
        
        // Write to src/app/api/ (standard Next.js route location)
        this.writeFile(`../app/api/${lowerName}/route.ts`, apiRouteCode);
        this.writeFile(`../app/api/${lowerName}/[id]/route.ts`, apiRouteByIdCode);
        
        // ALSO write to src/generated/api/ for backward compatibility and sync
        // This ensures files in src/generated/api/ are auto-generated and synchronized
        // Use different import paths for src/generated/api/ location
        // Check if model needs pluralized endpoint (based on manually edited patterns)
        let generatedApiRouteCode: string;
        let generatedFileName: string;
        
        if (this.needsPluralEndpoint(model.name)) {
          // Use pluralized route generator for models that need it
          generatedApiRouteCode = this.generatePluralApiRoute(model);
          const pluralName = this.getPluralForm(lowerName);
          generatedFileName = `../generated/api/${pluralName}.ts`;
        } else {
          // Use standard route generator
          generatedApiRouteCode = this.generateApiRouteForGeneratedApi(model);
          generatedFileName = `../generated/api/${lowerName}.ts`;
        }
        
        this.writeFile(generatedFileName, generatedApiRouteCode);
        
        // Generate admin-specific routes for ImageUpload
        if (model.name === 'ImageUpload') {
          const adminBlobsRouteCode = this.generateAdminBlobsRoute(model);
          const adminBlobsRouteByIdCode = this.generateAdminBlobsRouteById(model);
          if (adminBlobsRouteCode) {
            this.writeFile(`../app/api/admin/blobs/route.ts`, adminBlobsRouteCode);
          }
          if (adminBlobsRouteByIdCode) {
            this.writeFile(`../app/api/admin/blobs/[id]/route.ts`, adminBlobsRouteByIdCode);
          }
        }
      }

      if (components) {
        const componentCode = this.generateComponent(model, databaseFirst);
        this.writeFile(`components/${lowerName}-component.tsx`, componentCode);

        // Generate admin table component (now with page links instead of dialogs)
        const adminTableCode = this.generateAdminTableComponent(model, databaseFirst);
        this.writeFile(`../components/admin/${lowerName}-admin-table.tsx`, adminTableCode);

        // Generate form component (reusable across pages)
        const formCode = this.generateFormComponent(model, databaseFirst);
        this.writeFile(`../components/admin/${lowerName}-form.tsx`, formCode);
        
        // === ENHANCED CONTENT EDITOR INTEGRATION ===
        // Generate enhanced forms for models with content fields
        try {
          if (shouldUseEnhancedContentEditor(model.name, model.fields)) {
            this.enhancedFormGenerator = new EnhancedFormGenerator();
            this.enhancedFormGenerator.generateForModel(model.name, model.fields, model.relations, databaseFirst);
            console.log(`✅ Generated enhanced content editor form for ${model.name}`);
          }
        } catch (error) {
          console.warn(`⚠️  Could not generate enhanced content editor form for ${model.name}:`, error);
        }
        // === END ENHANCED CONTENT EDITOR INTEGRATION ===
        
        // === MARKETPLACE ENHANCEMENT ===
        // Marketplace enhancements removed (archived)
        // === END MARKETPLACE ENHANCEMENT ===
      }

      if (pages) {
        // Generate admin list page
        const listPageCode = this.generateAdminListPage(model);
        this.writeFile(`../app/admin/${lowerName}/page.tsx`, listPageCode);
        
        // Generate create page
        const createPageCode = this.generateCreatePage(model);
        this.writeFile(`../app/admin/${lowerName}/create/page.tsx`, createPageCode);
        
        // Generate view page
        const viewPageCode = this.generateViewPage(model);
        this.writeFile(`../app/admin/${lowerName}/[id]/page.tsx`, viewPageCode);
        
        // Generate edit page
        const editPageCode = this.generateEditPage(model);
        this.writeFile(`../app/admin/${lowerName}/[id]/edit/page.tsx`, editPageCode);
        
        // Generate delete page
        const deletePageCode = this.generateDeletePage(model);
        this.writeFile(`../app/admin/${lowerName}/[id]/delete/page.tsx`, deletePageCode);
      }
    }

    // Generate index files
    this.generateIndexFiles(modelsToGenerate);

    // Verify files if verification is enabled
    if (verifyFiles && this.verificationSystem) {
      const result = this.verificationSystem.compareFiles();
      this.verificationSystem.printReport(result);
      
      if (this.verificationSystem.verificationPassed(result, allowDifferences)) {
        console.log('\n✅ Verification passed! Copying files to final location...');
        this.verificationSystem.copyTempToFinal();
        this.verificationSystem.cleanupTempDir();
        console.log('\n✨ Generation and verification complete!');
      } else {
        console.log('\n❌ Verification failed! Files differ from existing versions.');
        console.log('📝 Review the differences above before committing.');
        console.log(`📁 Temporary files are in: ${this.verificationSystem.getTempDir()}`);
        console.log('\nTo proceed despite differences, run with --allow-differences flag');
        this.useTempDir = false; // Switch back to normal mode for cleanup
        throw new Error('File verification failed - files differ from existing versions');
      }
    }

    console.log(`\n✅ Code generation complete! Generated files in ${this.baseDir}/\n`);
  }

  private ensureDirectories() {
    const dirs = [
      this.baseDir,
      `${this.baseDir}/types`,
      `${this.baseDir}/hooks`,
      `${this.baseDir}/api`,
      `${this.baseDir}/components`,
      'src/app/api',
      'src/app/admin',
      'src/components/admin',
      'src/components/marketplace'
    ];

    for (const dir of dirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Validate generated content doesn't contain corruption patterns
   */
  private validateGeneratedContent(content: string, filePath: string): boolean {
    // Check for corruption pattern: `}, { status: 401 });` on its own line (not in return statement)
    // followed by orphaned `}` on next line
    // Legitimate usage: return NextResponse.json({...}, { status: 401 });
    // Corruption: }, { status: 401 });\n    }
    // 
    // The corruption pattern appears when a function ends with }, then }, { status: 401 }); appears
    // on a new line, followed by another }
    const corruptionPattern = /^(\s*),\s*\{\s*status:\s*401\s*\}\);\s*$/m;
    
    // Check if }, { status: 401 }); appears on its own line (not preceded by "return")
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Check if this line is just }, { status: 401 });
      if (trimmed === '}, { status: 401 });') {
        // Check if previous line doesn't contain "return"
        const prevLine = i > 0 ? lines[i - 1] : '';
        if (!prevLine.includes('return') && !prevLine.includes('NextResponse.json')) {
          // Check if next line is just }
          const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : '';
          if (nextLine === '}') {
            console.error(`❌ Validation failed for ${filePath}: Contains corruption pattern`);
            console.error(`   Line ${i + 1}: ${trimmed}`);
            console.error(`   Previous line doesn't contain 'return' statement`);
            return false;
          }
        }
      }
    }

    // Check for duplicate function definitions
    const functionMatches = content.match(/export async function \w+\(/g);
    if (functionMatches) {
      const functionNames = functionMatches.map(m => m.match(/function (\w+)/)?.[1]).filter(Boolean);
      const duplicates = functionNames.filter((name, index) => functionNames.indexOf(name) !== index);
      
      if (duplicates.length > 0) {
        console.error(`❌ Validation failed for ${filePath}: Duplicate function definitions: ${duplicates.join(', ')}`);
        return false;
      }
    }

    // Check for model name mismatches - ensure generated model names match actual model names
    const dbQueryMatches = content.matchAll(/db\.(\w+)\.(findMany|findUnique|findFirst|create|update|delete|count|aggregate)/g);
    for (const match of dbQueryMatches) {
      const modelName = match[1];
      const pascalCaseModel = modelName.charAt(0).toUpperCase() + modelName.slice(1);
      
      // Check if model exists in loaded models
      if (!this.models.has(pascalCaseModel) && !this.models.has(modelName)) {
        // Known incorrect model names that should be caught
        const incorrectModels = ['adminBlob', 'adminblob', 'AdminBlob'];
        if (incorrectModels.includes(modelName)) {
          console.error(`❌ Validation failed for ${filePath}: Uses incorrect model name ${modelName}`);
          return false;
        }
      }
    }

    // Check for balanced braces (basic syntax check)
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    const braceDiff = Math.abs(openBraces - closeBraces);
    
    if (braceDiff > 3) {
      console.warn(`⚠️  Brace imbalance in ${filePath}: ${openBraces} open vs ${closeBraces} close (diff: ${braceDiff})`);
      // Don't fail for brace imbalance - might be false positive
    }

    return true;
  }

  private writeFile(relativePath: string, content: string) {
    // Validate content before writing
    if (!this.validateGeneratedContent(content, relativePath)) {
      throw new Error(`Generated content validation failed for ${relativePath}. See errors above.`);
    }
    
    // Write to temp directory if verification is enabled
    if (this.useTempDir && this.verificationSystem) {
      this.verificationSystem.writeToTemp(relativePath, content);
      return;
    }
    
    // Otherwise write directly to final location
    const fullPath = join(this.baseDir, relativePath);
    const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
    
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    
    writeFileSync(fullPath, content, 'utf-8');
  }

  private generateIndexFiles(models: ModelConfig[]) {
    // Types index
    const typesIndex = models
      .map(m => {
        const lowerName = m.name.charAt(0).toLowerCase() + m.name.slice(1);
        return `export * from './${lowerName}-types';`;
      })
      .join('\n');
    this.writeFile('types/index.ts', typesIndex);

    // Hooks index
    const hooksIndex = models
      .map(m => {
        const lowerName = m.name.charAt(0).toLowerCase() + m.name.slice(1);
        return `export * from './${lowerName}-hooks';`;
      })
      .join('\n');
    this.writeFile('hooks/index.ts', hooksIndex);

    // API index
    const apiIndex = models
      .map(m => {
        const lowerName = m.name.charAt(0).toLowerCase() + m.name.slice(1);
        return `export * from './${lowerName}/${lowerName}Api';`;
      })
      .join('\n');
    this.writeFile('api/index.ts', apiIndex);

    // Components index
    const componentsIndex = models
      .map(m => {
        const lowerName = m.name.charAt(0).toLowerCase() + m.name.slice(1);
        return `export * from './${lowerName}-component';`;
      })
      .join('\n');
    this.writeFile('components/index.ts', componentsIndex);
  }
}

// CLI execution
if (require.main === module) {
  const generator = new CompleteEntityGenerator();
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const options: any = {
    types: true,
    hooks: true,
    api: true,
    apiRoutes: true,
    components: true,
    pages: true
  };

  if (args.includes('--models')) {
    const modelIndex = args.indexOf('--models');
    options.models = args[modelIndex + 1].split(',');
  }

  if (args.includes('--categories')) {
    const catIndex = args.indexOf('--categories');
    options.categories = args[catIndex + 1].split(',');
  }

  if (args.includes('--priorities')) {
    const priIndex = args.indexOf('--priorities');
    options.priorities = args[priIndex + 1].split(',');
  }

  generator.generate(options).catch(console.error);
}

export default CompleteEntityGenerator;
