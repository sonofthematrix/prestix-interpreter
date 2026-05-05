/**
 * Component Generator Plugin
 * Auto-generates React components, hooks, and API endpoints from database schema
 */

export interface ComponentConfig {
  model: string;
  fields: string[];
  relations?: string[];
  operations?: ('create' | 'read' | 'update' | 'delete' | 'list')[];
  ui?: {
    form?: boolean;
    table?: boolean;
    card?: boolean;
    modal?: boolean;
  };
}

export interface GeneratedComponents {
  components: Record<string, string>;
  hooks: Record<string, string>;
  api: Record<string, string>;
  types: Record<string, string>;
}

/**
 * Component Generator Class
 */
export class ComponentGenerator {
  private schema: any;

  constructor() {
    // In a real implementation, this would load the ZenStack schema
    this.schema = {};
  }

  /**
   * Generate components for a model
   */
  generateComponents(config: ComponentConfig): GeneratedComponents {
    const { model, fields, relations = [], operations = ['create', 'read', 'update', 'delete', 'list'] } = config;

    const components: Record<string, string> = {};
    const hooks: Record<string, string> = {};
    const api: Record<string, string> = {};
    const types: Record<string, string> = {};

    // Generate TypeScript types
    types[`${model}Types`] = this.generateTypes(model, fields, relations);

    // Generate React hooks
    if (operations.includes('read')) {
      hooks[`use${this.capitalize(model)}`] = this.generateReadHook(model, fields, relations);
    }
    if (operations.includes('list')) {
      hooks[`use${this.capitalize(model)}List`] = this.generateListHook(model, fields, relations);
    }
    if (operations.includes('create')) {
      hooks[`useCreate${this.capitalize(model)}`] = this.generateCreateHook(model, fields);
    }
    if (operations.includes('update')) {
      hooks[`useUpdate${this.capitalize(model)}`] = this.generateUpdateHook(model, fields);
    }
    if (operations.includes('delete')) {
      hooks[`useDelete${this.capitalize(model)}`] = this.generateDeleteHook(model);
    }

    // Generate API routes
    if (operations.includes('read')) {
      api[`${model}Api`] = this.generateApiRoutes(model, operations);
    }

    // Generate UI components
    if (config.ui?.form && operations.includes('create')) {
      components[`${this.capitalize(model)}Form`] = this.generateFormComponent(model, fields);
    }
    if (config.ui?.table && operations.includes('list')) {
      components[`${this.capitalize(model)}Table`] = this.generateTableComponent(model, fields);
    }
    if (config.ui?.card && operations.includes('read')) {
      components[`${this.capitalize(model)}Card`] = this.generateCardComponent(model, fields);
    }
    if (config.ui?.modal) {
      components[`${this.capitalize(model)}Modal`] = this.generateModalComponent(model, fields, operations);
    }

    return { components, hooks, api, types };
  }

  private generateTypes(model: string, fields: string[], relations: string[]): string {
    const capitalizedModel = this.capitalize(model);

    // Define proper field types based on the schema
    const getFieldType = (field: string): string => {
      const fieldTypeMap: Record<string, string> = {
        // User fields
        'email': 'string',
        'name': 'string',
        'phone': 'string',
        'bio': 'string',
        'status': 'string',
        'role': 'string',
        'isPremium': 'boolean',
        'loyaltyPoints': 'number',
        'totalSpent': 'number',
        
        // Product fields
        'title': 'string',
        'content': 'string',
        'excerpt': 'string',
        'description': 'string',
        'price': 'number',
        'sku': 'string',
        'inventory': 'number',
        'slug': 'string',
        'categoryId': 'string',
        'vendorId': 'string',
        
        // Category fields
        'isActive': 'boolean',
        
        // Order fields
        'totalAmount': 'number',
        'subtotal': 'number',
        'taxAmount': 'number',
        'shippingAmount': 'number',
        
        // Review fields
        'rating': 'number',
        'isVerified': 'boolean',
        'isApproved': 'boolean',
        
        // Vendor fields
        'businessName': 'string',
        'businessType': 'string',
        // 'isVerified' is already defined under Review fields, so do not repeat here
        
        // Blog fields
        'publishedAt': 'Date',
        'authorId': 'string',
      };
      
      return fieldTypeMap[field] || 'any';
    };

    return `// Auto-generated types for ${model}
export interface ${capitalizedModel} {
  id: string;
  ${fields.map(field => `${field}: ${getFieldType(field)};`).join('\n  ')}
  ${relations.map(relation => `${relation}: any;`).join('\n  ')}
  createdAt: Date;
  updatedAt: Date;
}

export interface Create${capitalizedModel}Input {
  ${fields.map(field => {
    const type = getFieldType(field);
    const isRequired = ['email', 'name', 'title', 'content', 'slug', 'authorId', 'categoryId', 'vendorId', 'rating', 'businessName', 'businessType'].includes(field);
    return `${field}${isRequired ? '' : '?'}: ${type};`;
  }).join('\n  ')}
}

export interface Update${capitalizedModel}Input {
  ${fields.map(field => `${field}?: ${getFieldType(field)};`).join('\n  ')}
}

export interface ${capitalizedModel}Filters {
  ${fields.map(field => `${field}?: ${getFieldType(field)};`).join('\n  ')}
  limit?: number;
  offset?: number;
  orderBy?: Record<string, 'asc' | 'desc'>;
}`;
  }

  private generateReadHook(model: string, fields: string[], relations: string[]): string {
    const capitalizedModel = this.capitalize(model);
    const includeClause = relations.length > 0 ? `, include: { ${relations.map(rel => `${rel}: true`).join(', ')} }` : '';

    return `// Auto-generated hook for reading ${model}
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/db';

const db = createClient();

export function use${capitalizedModel}(id: string) {
  return useQuery({
    queryKey: ['${model}', id],
    queryFn: () => db.${model}.findUnique({
      where: { id }${includeClause}
    }),
    enabled: !!id
  });
}`;
  }

  private generateListHook(model: string, fields: string[], relations: string[]): string {
    const capitalizedModel = this.capitalize(model);
    const includeClause = relations.length > 0 ? `, include: { ${relations.map(rel => `${rel}: true`).join(', ')} }` : '';

    return `// Auto-generated hook for listing ${model}s
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/db';
import type { ${capitalizedModel}Filters } from '../types/${model}-${model}Types';

const db = createClient();

export function use${capitalizedModel}List(filters: ${capitalizedModel}Filters = {}) {
  return useQuery({
    queryKey: ['${model}s', filters],
    queryFn: () => db.${model}.findMany({
      where: filters as any,
      orderBy: filters.orderBy || { createdAt: 'desc' },
      skip: filters.offset,
      take: filters.limit || 10${includeClause}
    })
  });
}`;
  }

  private generateCreateHook(model: string, fields: string[]): string {
    const capitalizedModel = this.capitalize(model);

    return `// Auto-generated hook for creating ${model}
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/db';
import type { Create${capitalizedModel}Input } from '../types/${model}-${model}Types';

const db = createClient();

export function useCreate${capitalizedModel}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Create${capitalizedModel}Input) =>
      db.${model}.create({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${model}s'] });
    }
  });
}`;
  }

  private generateUpdateHook(model: string, fields: string[]): string {
    const capitalizedModel = this.capitalize(model);

    return `// Auto-generated hook for updating ${model}
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/db';
import type { Update${capitalizedModel}Input } from '../types/${model}-${model}Types';

const db = createClient();

export function useUpdate${capitalizedModel}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Update${capitalizedModel}Input }) =>
      db.${model}.update({ where: { id }, data }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['${model}', result.id] });
      queryClient.invalidateQueries({ queryKey: ['${model}s'] });
    }
  });
}`;
  }

  private generateDeleteHook(model: string): string {
    const capitalizedModel = this.capitalize(model);

    return `// Auto-generated hook for deleting ${model}
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/db';

const db = createClient();

export function useDelete${capitalizedModel}() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      db.${model}.delete({ where: { id: id as string } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${model}s'] });
    }
  });
}`;
  }

  private generateApiRoutes(model: string, operations: string[]): string {
    const routes: string[] = [];

    if (operations.includes('list')) {
      routes.push(`
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filters = Object.fromEntries(searchParams);

  const data = await db.${model}.findMany({
    where: filters,
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  return Response.json(data);
}`);
    }

    if (operations.includes('create')) {
      routes.push(`
export async function POST(request: Request) {
  const data = await request.json();

  const result = await db.${model}.create({ data });

  return Response.json(result, { status: 201 });
}`);
    }

    return `// Auto-generated API routes for ${model}
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

${routes.join('\n')}`;
  }

  private generateFormComponent(model: string, fields: string[]): string {
    const capitalizedModel = this.capitalize(model);
    const fieldElements = fields.map(field => {
      const fieldType = this.getFieldType(field);
      let inputType = 'text';
      let valueExpression = `formData.${field} || ''`;
      let changeHandler = `(e) => handleChange('${field}', e.target.value)`;

           if (fieldType === 'boolean') {
             inputType = 'checkbox';
             valueExpression = `formData.${field} || false`;
             changeHandler = `(e) => handleChange('${field}', e.target.checked)`;
             
             return '      <div>\n' +
               '        <label className="block text-sm font-medium mb-1">\n' +
               '          ' + this.capitalize(field) + ' *\n' +
               '        </label>\n' +
               '        <input\n' +
               '          type="' + inputType + '"\n' +
               '          checked={' + valueExpression + '}\n' +
               '          onChange={' + changeHandler + '}\n' +
               '          className="w-full p-2 border rounded"\n' +
               '        />\n' +
               '      </div>';
           } else if (fieldType === 'Date') {
        inputType = 'datetime-local';
        valueExpression = `formData.${field} ? new Date(formData.${field}).toISOString().slice(0, 16) : ''`;
        changeHandler = `(e) => handleChange('${field}', e.target.value ? new Date(e.target.value) : null)`;
      } else if (fieldType === 'number') {
        inputType = 'number';
        valueExpression = `formData.${field} || ''`;
        changeHandler = `(e) => handleChange('${field}', e.target.value ? Number(e.target.value) : null)`;
      }

      return '      <div>\n' +
        '        <label className="block text-sm font-medium mb-1">\n' +
        '          ' + this.capitalize(field) + ' *\n' +
        '        </label>\n' +
        '        <input\n' +
        '          type="' + inputType + '"\n' +
        '          value={' + valueExpression + '}\n' +
        '          onChange={' + changeHandler + '}\n' +
        '          className="w-full p-2 border rounded"\n' +
        '        />\n' +
        '      </div>';
    }).join('\n');

    return `'use client';
import React from 'react';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCreate${capitalizedModel} } from '../hooks/${model}-useCreate${capitalizedModel}';
import type { Create${capitalizedModel}Input } from '../types/${model}-${model}Types';

export function ${capitalizedModel}Form() {
  const [formData, setFormData] = useState<Partial<Create${capitalizedModel}Input>>({});
  const createMutation = useCreate${capitalizedModel}();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      createMutation.mutate(formData as Create${capitalizedModel}Input);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
` + fieldElements + `

      <Button
        type="submit"
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? 'Creating...' : 'Create ${capitalizedModel}'}
      </Button>
    </form>
  );
}`;
  }

  private generateTableComponent(model: string, fields: string[]): string {
    const capitalizedModel = this.capitalize(model);
    const headerElements = fields.map(field => 
      '            <th className="px-4 py-2">' + this.capitalize(field) + '</th>'
    ).join('\n');
    const cellElements = fields.map(field => {
      const fieldType = this.getFieldType(field);
      let cellContent = `{item.${field}}`;
      
      if (fieldType === 'Date') {
        cellContent = `{item.${field} ? new Date(item.${field}).toLocaleDateString() : '-'}`;
      } else if (fieldType === 'number') {
        cellContent = `{item.${field} ? item.${field}.toLocaleString() : '-'}`;
      } else if (fieldType === 'boolean') {
        cellContent = `{item.${field} ? 'Yes' : 'No'}`;
      } else if (field === 'content' || field === 'description' || field === 'bio') {
        // Long text fields - truncate and show tooltip
        cellContent = `{item.${field} ? (item.${field}.length > 50 ? item.${field}.substring(0, 50) + '...' : item.${field}) : '-'}`;
      } else if (field.includes('markdown') || field.includes('md')) {
        // Markdown fields - show as "Markdown" with length
        cellContent = `{item.${field} ? \`Markdown (\${item.${field}.length} chars)\` : '-'}`;
      }
      
      return '              <td className="px-4 py-2">' + cellContent + '</td>';
    }).join('\n');

    return `'use client';
import React from 'react';

import { use${capitalizedModel}List } from '../hooks/${model}-use${capitalizedModel}List';

export function ${capitalizedModel}Table() {
  const { data: items, isLoading } = use${capitalizedModel}List();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full table-auto">
        <thead>
          <tr>
` + headerElements + `
          </tr>
        </thead>
        <tbody>
          {items?.map((item) => (
            <tr key={item.id}>
` + cellElements + `
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}`;
  }

  private generateCardComponent(model: string, fields: string[]): string {
    const capitalizedModel = this.capitalize(model);
    const fieldElements = fields.slice(0, 3).map(field => {
      const fieldType = this.getFieldType(field);
      let fieldValue = `{item.${field}}`;
      
      if (fieldType === 'Date') {
        fieldValue = `{item.${field} ? new Date(item.${field}).toLocaleDateString() : '-'}`;
      } else if (fieldType === 'number') {
        fieldValue = `{item.${field} ? item.${field}.toLocaleString() : '-'}`;
      } else if (fieldType === 'boolean') {
        fieldValue = `{item.${field} ? 'Yes' : 'No'}`;
      } else if (field === 'content' || field === 'description' || field === 'bio') {
        // Long text fields - truncate with tooltip
        return '      <div className="mb-2">\n' +
          '        <span className="font-semibold">' + this.capitalize(field) + ':</span>\n' +
          '        <TooltipProvider>\n' +
          '          <Tooltip>\n' +
          '            <TooltipTrigger asChild>\n' +
          '              <span className="cursor-help line-clamp-2">\n' +
          '                {item.' + field + ' ? (item.' + field + '.length > 100 ? item.' + field + '.substring(0, 100) + \'...\' : item.' + field + ') : \'-\'}\n' +
          '              </span>\n' +
          '            </TooltipTrigger>\n' +
          '            <TooltipContent className="max-w-sm">\n' +
          '              <p className="whitespace-normal break-words">{item.' + field + ' || \'No ' + field + '\'}</p>\n' +
          '            </TooltipContent>\n' +
          '          </Tooltip>\n' +
          '        </TooltipProvider>\n' +
          '      </div>';
      } else if (field.includes('markdown') || field.includes('md')) {
        // Markdown fields - show as "Markdown" with length and tooltip
        return '      <div className="mb-2">\n' +
          '        <span className="font-semibold">' + this.capitalize(field) + ':</span>\n' +
          '        <TooltipProvider>\n' +
          '          <Tooltip>\n' +
          '            <TooltipTrigger asChild>\n' +
          '              <span className="cursor-help">\n' +
          '                {item.' + field + ' ? `Markdown (${item.' + field + '.length} chars)` : \'-\'}\n' +
          '              </span>\n' +
          '            </TooltipTrigger>\n' +
          '            <TooltipContent className="max-w-sm">\n' +
          '              <p className="whitespace-normal break-words">{item.' + field + ' || \'No content\'}</p>\n' +
          '            </TooltipContent>\n' +
          '          </Tooltip>\n' +
          '        </TooltipProvider>\n' +
          '      </div>';
      } else if (field === 'title' || field === 'name' || field.includes('Title') || field.includes('Name')) {
        // Title/Name fields - truncate with tooltip
        return '      <div className="mb-2">\n' +
          '        <span className="font-semibold">' + this.capitalize(field) + ':</span>\n' +
          '        <TooltipProvider>\n' +
          '          <Tooltip>\n' +
          '            <TooltipTrigger asChild>\n' +
          '              <span className="cursor-help truncate block">' + fieldValue + '</span>\n' +
          '            </TooltipTrigger>\n' +
          '            <TooltipContent>\n' +
          '              <p>{item.' + field + ' || \'No ' + field + '\'}</p>\n' +
          '            </TooltipContent>\n' +
          '          </Tooltip>\n' +
          '        </TooltipProvider>\n' +
          '      </div>';
      }
      
      return '      <div className="mb-2">\n' +
        '        <span className="font-semibold">' + this.capitalize(field) + ':</span>\n' +
        '        <TooltipProvider>\n' +
        '          <Tooltip>\n' +
        '            <TooltipTrigger asChild>\n' +
        '              <span className="cursor-help truncate block">' + fieldValue + '</span>\n' +
        '            </TooltipTrigger>\n' +
        '            <TooltipContent>\n' +
        '              <p>{item.' + field + ' || \'No data\'}</p>\n' +
        '            </TooltipContent>\n' +
        '          </Tooltip>\n' +
        '        </TooltipProvider>\n' +
        '      </div>';
    }).join('\n');

    return `'use client';
import React from 'react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { use${capitalizedModel} } from '../hooks/${model}-use${capitalizedModel}';

interface ${capitalizedModel}CardProps {
  id: string;
}

export function ${capitalizedModel}Card({ id }: ${capitalizedModel}CardProps) {
  const { data: item, isLoading } = use${capitalizedModel}(id);

  if (isLoading) return <div>Loading...</div>;
  if (!item) return <div>Not found</div>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
` + fieldElements + `
    </div>
  );
}`;
  }

  private generateModalComponent(model: string, fields: string[], operations: string[]): string {
    const capitalizedModel = this.capitalize(model);
    const fieldElements = fields.map(field => {
      const fieldType = this.getFieldType(field);
      let inputType = 'text';
      let valueExpression = `formData.${field} || ''`;
      let changeHandler = `(e) => setFormData(prev => ({ ...prev, ${field}: e.target.value }))`;

      if (fieldType === 'boolean') {
        inputType = 'checkbox';
        valueExpression = `formData.${field} || false`;
        changeHandler = `(e) => setFormData(prev => ({ ...prev, ${field}: e.target.checked }))`;
        
        return '      <div>\n' +
          '        <label className="block text-sm font-medium mb-1">\n' +
          '          ' + this.capitalize(field) + ' *\n' +
          '        </label>\n' +
          '        <input\n' +
          '          type="' + inputType + '"\n' +
          '          checked={' + valueExpression + '}\n' +
          '          onChange={' + changeHandler + '}\n' +
          '          className="w-full p-2 border rounded"\n' +
          '        />\n' +
          '      </div>';
      } else if (fieldType === 'Date') {
        inputType = 'datetime-local';
        valueExpression = `formData.${field} ? new Date(formData.${field}).toISOString().slice(0, 16) : ''`;
        changeHandler = `(e) => setFormData(prev => ({ ...prev, ${field}: e.target.value ? new Date(e.target.value) : null }))`;
      } else if (fieldType === 'number') {
        inputType = 'number';
        valueExpression = `formData.${field} || ''`;
        changeHandler = `(e) => setFormData(prev => ({ ...prev, ${field}: e.target.value ? Number(e.target.value) : null }))`;
      }

      return '          <div>\n' +
        '            <label className="block text-sm font-medium mb-1">\n' +
        '              ' + this.capitalize(field) + '\n' +
        '            </label>\n' +
        '            <input\n' +
        '              type="' + inputType + '"\n' +
        '              value={' + valueExpression + '}\n' +
        '              onChange={' + changeHandler + '}\n' +
        '              className="w-full p-2 border rounded"\n' +
        '            />\n' +
        '          </div>';
    }).join('\n');

    return `'use client';
import React from 'react';

import { useState } from 'react';
import { useCreate${capitalizedModel} } from '../hooks/${model}-useCreate${capitalizedModel}';
import { useUpdate${capitalizedModel} } from '../hooks/${model}-useUpdate${capitalizedModel}';
import type { Create${capitalizedModel}Input, Update${capitalizedModel}Input } from '../types/${model}-${model}Types';

interface ${capitalizedModel}ModalProps {
  isOpen: boolean;
  onClose: () => void;
  editItem?: any;
}

export function ${capitalizedModel}Modal({ isOpen, onClose, editItem }: ${capitalizedModel}ModalProps) {
  const [formData, setFormData] = useState<Partial<Create${capitalizedModel}Input>>(editItem || {});
  const createMutation = useCreate${capitalizedModel}();
  const updateMutation = useUpdate${capitalizedModel}();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editItem) {
      updateMutation.mutate({ id: editItem.id, data: formData as Update${capitalizedModel}Input }, {
        onSuccess: onClose
      });
    } else {
      createMutation.mutate(formData as Create${capitalizedModel}Input, {
        onSuccess: onClose
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">
          {editItem ? 'Edit' : 'Create'} ${capitalizedModel}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
` + fieldElements + `

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}`;
  }

  private getFieldType(field: string): string {
    const fieldTypeMap: Record<string, string> = {
      // User fields
      'email': 'string',
      'name': 'string',
      'phone': 'string',
      'bio': 'string',
      'status': 'string',
      'role': 'string',
      'isPremium': 'boolean',
      'loyaltyPoints': 'number',
      'totalSpent': 'number',
      
      // Product fields
      'title': 'string',
      'content': 'string',
      'excerpt': 'string',
      'description': 'string',
      'price': 'number',
      'sku': 'string',
      'inventory': 'number',
      'slug': 'string',
      'categoryId': 'string',
      'vendorId': 'string',
      
      // Category fields
      'isActive': 'boolean',
      
      // Order fields
      'totalAmount': 'number',
      'subtotal': 'number',
      'taxAmount': 'number',
      'shippingAmount': 'number',
      
      // Review fields
      'rating': 'number',
      'isVerified': 'boolean',
      'isApproved': 'boolean',
      
      // Vendor fields
      'businessName': 'string',
      'businessType': 'string',
      
      // Blog fields
      'publishedAt': 'Date',
      'authorId': 'string',
    };
    
    return fieldTypeMap[field] || 'any';
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Generate components for all default models
   */
  generateAllComponents(): Record<string, GeneratedComponents> {
    // Define configurations for each model
    const configs: ComponentConfig[] = [
      {
        model: 'user',
        fields: ['email', 'name', 'phone', 'bio'],
        relations: ['preferences', 'orders'],
        operations: ['create', 'read', 'update', 'delete', 'list'],
        ui: { form: true, table: true, card: true, modal: true }
      },
      {
        model: 'product',
        fields: ['name', 'description', 'price', 'sku', 'inventory'],
        relations: ['category', 'vendor', 'variants'],
        operations: ['create', 'read', 'update', 'delete', 'list'],
        ui: { form: true, table: true, card: true, modal: true }
      },
      {
        model: 'order',
        fields: ['status', 'totalAmount', 'subtotal', 'taxAmount'],
        relations: ['user', 'items', 'payment'],
        operations: ['create', 'read', 'update', 'list'],
        ui: { table: true, card: true }
      },
      {
        model: 'category',
        fields: ['name', 'description', 'slug'],
        relations: ['products', 'children'],
        operations: ['create', 'read', 'update', 'delete', 'list'],
        ui: { form: true, table: true }
      }
    ];

    const allComponents: Record<string, GeneratedComponents> = {};

    for (const config of configs) {
      allComponents[config.model] = this.generateComponents(config);
    }

    return allComponents;
  }
}

/**
 * Auto-generate components for all models
 */
export function generateAllComponents() {
  const generator = new ComponentGenerator();

  // Define configurations for each model
  const configs: ComponentConfig[] = [
    {
      model: 'user',
      fields: ['email', 'name', 'phone', 'bio'],
      relations: ['preferences', 'orders'],
      operations: ['create', 'read', 'update', 'delete', 'list'],
      ui: { form: true, table: true, card: true, modal: true }
    },
    {
      model: 'product',
      fields: ['name', 'description', 'price', 'sku', 'inventory'],
      relations: ['category', 'vendor', 'variants'],
      operations: ['create', 'read', 'update', 'delete', 'list'],
      ui: { form: true, table: true, card: true, modal: true }
    },
    {
      model: 'order',
      fields: ['status', 'totalAmount', 'subtotal', 'taxAmount'],
      relations: ['user', 'items', 'payment'],
      operations: ['create', 'read', 'update', 'list'],
      ui: { table: true, card: true }
    },
    {
      model: 'category',
      fields: ['name', 'description', 'slug'],
      relations: ['products', 'children'],
      operations: ['create', 'read', 'update', 'delete', 'list'],
      ui: { form: true, table: true }
    }
  ];

  const allComponents: Record<string, GeneratedComponents> = {};

  for (const config of configs) {
    allComponents[config.model] = generator.generateComponents(config);
  }

  return allComponents;
}

// Export the generated components
export const generatedComponents = generateAllComponents();
