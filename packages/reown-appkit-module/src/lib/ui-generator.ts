/**
 * UI Generator - Auto-generates UI components from ZModel schema
 * This is the core engine that transforms schema definitions into React components
 */

import { z } from 'zod';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface UIGenerationConfig {
  models: ModelConfig[];
  themes: ThemeConfig[];
  layouts: LayoutConfig[];
  components: ComponentConfig[];
}

export interface ModelConfig {
  name: string;
  type: 'form' | 'table' | 'card' | 'list' | 'detail';
  title: string;
  description?: string;
  fields: FieldConfig[];
  actions?: ActionConfig[];
  layout?: LayoutType;
  validation?: ValidationConfig;
  styling?: StylingConfig;
}

export interface FieldConfig {
  name: string;
  type: FieldType;
  label?: string;
  description?: string;
  required?: boolean;
  readonly?: boolean;
  hidden?: boolean;
  placeholder?: string;
  defaultValue?: any;
  options?: OptionConfig[];
  validation?: FieldValidationConfig;
  styling?: FieldStylingConfig;
  dependencies?: FieldDependency[];
}

export interface ThemeConfig {
  name: string;
  type: 'light' | 'dark' | 'custom';
  colors: ColorScheme;
  typography: TypographyConfig;
  spacing: SpacingConfig;
  components: ComponentThemeConfig;
}

export interface LayoutConfig {
  name: string;
  type: 'grid' | 'flex' | 'card' | 'sectioned' | 'sidebar';
  structure: LayoutStructure;
  responsive: ResponsiveConfig;
  styling: LayoutStylingConfig;
}

export interface ComponentConfig {
  name: string;
  type: ComponentType;
  template: string;
  props: ComponentPropsConfig;
  variants: ComponentVariant[];
  slots: ComponentSlot[];
}

// ============================================================================
// ENUMS AND TYPES
// ============================================================================

export type FieldType = 
  | 'text' | 'email' | 'password' | 'number' | 'date' | 'datetime' | 'time'
  | 'boolean' | 'select' | 'multiselect' | 'textarea' | 'rich_text'
  | 'file' | 'image' | 'url' | 'phone' | 'json' | 'array' | 'object';

export type ComponentType = 
  | 'form' | 'table' | 'card' | 'list' | 'navigation' | 'layout' | 'widget';

export type LayoutType = 
  | 'single' | 'two-column' | 'three-column' | 'sidebar' | 'grid' | 'flex';

export type ValidationType = 
  | 'required' | 'email' | 'min_length' | 'max_length' | 'pattern' | 'custom';

// ============================================================================
// CONFIGURATION INTERFACES
// ============================================================================

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  warning: string;
  success: string;
  info: string;
}

export interface TypographyConfig {
  fontFamily: {
    primary: string;
    secondary: string;
    mono: string;
  };
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };
  fontWeight: {
    normal: string;
    medium: string;
    semibold: string;
    bold: string;
  };
  lineHeight: {
    tight: string;
    normal: string;
    relaxed: string;
  };
}

export interface SpacingConfig {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
}

export interface ComponentThemeConfig {
  button: ButtonThemeConfig;
  input: InputThemeConfig;
  card: CardThemeConfig;
  table: TableThemeConfig;
  form: FormThemeConfig;
}

export interface ButtonThemeConfig {
  variants: {
    primary: string;
    secondary: string;
    outline: string;
    ghost: string;
    destructive: string;
  };
  sizes: {
    sm: string;
    md: string;
    lg: string;
  };
}

export interface InputThemeConfig {
  base: string;
  variants: {
    default: string;
    error: string;
    success: string;
  };
  sizes: {
    sm: string;
    md: string;
    lg: string;
  };
}

export interface CardThemeConfig {
  base: string;
  header: string;
  content: string;
  footer: string;
  variants: {
    default: string;
    elevated: string;
    outlined: string;
  };
}

export interface TableThemeConfig {
  base: string;
  header: string;
  row: string;
  cell: string;
  variants: {
    default: string;
    striped: string;
    bordered: string;
  };
}

export interface FormThemeConfig {
  base: string;
  field: string;
  label: string;
  error: string;
  help: string;
}

// ============================================================================
// VALIDATION CONFIGURATION
// ============================================================================

export interface ValidationConfig {
  schema: z.ZodSchema;
  messages: Record<string, string>;
  async?: boolean;
}

export interface FieldValidationConfig {
  type: ValidationType;
  value?: any;
  message?: string;
  custom?: (value: any) => boolean | string;
}

export interface FieldDependency {
  field: string;
  condition: (value: any) => boolean;
  action: 'show' | 'hide' | 'enable' | 'disable' | 'require' | 'optional';
}

// ============================================================================
// STYLING CONFIGURATION
// ============================================================================

export interface StylingConfig {
  className?: string;
  style?: React.CSSProperties;
  variants?: Record<string, string>;
  responsive?: ResponsiveStylingConfig;
}

export interface FieldStylingConfig {
  className?: string;
  style?: React.CSSProperties;
  container?: {
    className?: string;
    style?: React.CSSProperties;
  };
  label?: {
    className?: string;
    style?: React.CSSProperties;
  };
  input?: {
    className?: string;
    style?: React.CSSProperties;
  };
  error?: {
    className?: string;
    style?: React.CSSProperties;
  };
}

export interface LayoutStylingConfig {
  className?: string;
  style?: React.CSSProperties;
  grid?: {
    columns?: number;
    gap?: string;
    className?: string;
  };
  flex?: {
    direction?: 'row' | 'column';
    wrap?: boolean;
    justify?: string;
    align?: string;
    gap?: string;
    className?: string;
  };
}

export interface ResponsiveConfig {
  breakpoints: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  behavior: 'mobile-first' | 'desktop-first';
}

export interface ResponsiveStylingConfig {
  sm?: StylingConfig;
  md?: StylingConfig;
  lg?: StylingConfig;
  xl?: StylingConfig;
}

// ============================================================================
// ACTION CONFIGURATION
// ============================================================================

export interface ActionConfig {
  name: string;
  label: string;
  type: 'button' | 'link' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  disabled?: boolean | ((data: any) => boolean);
  onClick?: (data: any) => void | Promise<void>;
  href?: string;
  confirm?: {
    title: string;
    message: string;
  };
}

// ============================================================================
// COMPONENT CONFIGURATION
// ============================================================================

export interface ComponentPropsConfig {
  [key: string]: {
    type: string;
    required?: boolean;
    default?: any;
    description?: string;
  };
}

export interface ComponentVariant {
  name: string;
  props: Record<string, any>;
  styling: StylingConfig;
}

export interface ComponentSlot {
  name: string;
  description?: string;
  required?: boolean;
  fallback?: React.ReactNode;
}

export interface OptionConfig {
  value: any;
  label: string;
  disabled?: boolean;
  description?: string;
}

export interface LayoutStructure {
  type: 'grid' | 'flex' | 'absolute';
  areas?: string[];
  columns?: number | string[];
  rows?: number | string[];
  gap?: string;
  padding?: string;
  margin?: string;
}

// ============================================================================
// UI GENERATOR CLASS
// ============================================================================

export class UIGenerator {
  private config: UIGenerationConfig;

  constructor(config: UIGenerationConfig) {
    this.config = config;
  }

  /**
   * Generate a form component from model configuration
   */
  generateForm(modelName: string): string {
    const model = this.config.models.find(m => m.name === modelName);
    if (!model) {
      throw new Error(`Model ${modelName} not found`);
    }

    const formTemplate = this.getFormTemplate(model);
    return this.compileTemplate(formTemplate, { model });
  }

  /**
   * Generate a table component from model configuration
   */
  generateTable(modelName: string): string {
    const model = this.config.models.find(m => m.name === modelName);
    if (!model) {
      throw new Error(`Model ${modelName} not found`);
    }

    const tableTemplate = this.getTableTemplate(model);
    return this.compileTemplate(tableTemplate, { model });
  }

  /**
   * Generate a card component from model configuration
   */
  generateCard(modelName: string): string {
    const model = this.config.models.find(m => m.name === modelName);
    if (!model) {
      throw new Error(`Model ${modelName} not found`);
    }

    const cardTemplate = this.getCardTemplate(model);
    return this.compileTemplate(cardTemplate, { model });
  }

  /**
   * Generate a complete page from model configuration
   */
  generatePage(modelName: string, pageType: 'list' | 'detail' | 'form'): string {
    const model = this.config.models.find(m => m.name === modelName);
    if (!model) {
      throw new Error(`Model ${modelName} not found`);
    }

    const pageTemplate = this.getPageTemplate(model, pageType);
    return this.compileTemplate(pageTemplate, { model, pageType });
  }

  /**
   * Generate theme CSS from theme configuration
   */
  generateTheme(themeName: string): string {
    const theme = this.config.themes.find(t => t.name === themeName);
    if (!theme) {
      throw new Error(`Theme ${themeName} not found`);
    }

    return this.generateThemeCSS(theme);
  }

  /**
   * Generate layout component from layout configuration
   */
  generateLayout(layoutName: string): string {
    const layout = this.config.layouts.find(l => l.name === layoutName);
    if (!layout) {
      throw new Error(`Layout ${layoutName} not found`);
    }

    const layoutTemplate = this.getLayoutTemplate(layout);
    return this.compileTemplate(layoutTemplate, { layout });
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private getFormTemplate(model: ModelConfig): string {
    return `
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

// Generated form component for ${model.name}
export function ${model.name}Form({ 
  data, 
  onSubmit, 
  onCancel,
  className 
}: {
  data?: any;
  onSubmit: (data: any) => void | Promise<void>;
  onCancel?: () => void;
  className?: string;
}) {
  const form = useForm({
    resolver: zodResolver(validationSchema),
    defaultValues: data || {}
  });

  const handleSubmit = async (values: any) => {
    try {
      await onSubmit(values);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>${model.title}</CardTitle>
        ${model.description ? `<p className="text-muted-foreground">${model.description}</p>` : ''}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            ${this.generateFormFields(model.fields)}
            <div className="flex justify-end space-x-2">
              ${model.actions?.map(action => this.generateActionButton(action)).join('\n              ') || ''}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
`;
  }

  private getTableTemplate(model: ModelConfig): string {
    return `
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

// Generated table component for ${model.name}
export function ${model.name}Table({ 
  data, 
  loading,
  onAction,
  className 
}: {
  data: any[];
  loading?: boolean;
  onAction?: (action: string, item: any) => void;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>${model.title}</CardTitle>
        ${model.description ? `<p className="text-muted-foreground">${model.description}</p>` : ''}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              ${model.fields.map(field => `<TableHead>${field.label || field.name}</TableHead>`).join('\n              ')}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={${model.fields.length + 1}} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={${model.fields.length + 1}} className="text-center">
                  No data available
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, index) => (
                <TableRow key={index}>
                  ${model.fields.map(field => this.generateTableCell(field)).join('\n                  ')}
                  <TableCell>
                    <div className="flex space-x-2">
                      ${model.actions?.map(action => this.generateTableAction(action)).join('\n                      ') || ''}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
`;
  }

  private getCardTemplate(model: ModelConfig): string {
    return `
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Generated card component for ${model.name}
export function ${model.name}Card({ 
  data, 
  onAction,
  className 
}: {
  data: any;
  onAction?: (action: string, item: any) => void;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>${model.title}</CardTitle>
        ${model.description ? `<p className="text-muted-foreground">${model.description}</p>` : ''}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          ${model.fields.map(field => this.generateCardField(field)).join('\n          ')}
        </div>
        ${model.actions?.length ? `
        <div className="flex justify-end space-x-2 mt-4">
          ${model.actions.map(action => this.generateActionButton(action)).join('\n          ')}
        </div>
        ` : ''}
      </CardContent>
    </Card>
  );
}
`;
  }

  private getPageTemplate(model: ModelConfig, pageType: string): string {
    return `
import React from 'react';
import { ${model.name}Form } from './${model.name}Form';
import { ${model.name}Table } from './${model.name}Table';
import { ${model.name}Card } from './${model.name}Card';

// Generated page component for ${model.name}
export function ${model.name}Page() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">${model.title}</h1>
      ${pageType === 'form' ? `<${model.name}Form />` : ''}
      ${pageType === 'list' ? `<${model.name}Table />` : ''}
      ${pageType === 'detail' ? `<${model.name}Card />` : ''}
    </div>
  );
}
`;
  }

  private getLayoutTemplate(layout: LayoutConfig): string {
    return `
import React from 'react';
import { cn } from '@/lib/utils';

// Generated layout component: ${layout.name}
export function ${layout.name}Layout({ 
  children, 
  className 
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("${layout.styling?.className || ''}", className)}>
      ${this.generateLayoutStructure(layout.structure)}
    </div>
  );
}
`;
  }

  private generateFormFields(fields: FieldConfig[]): string {
    return fields.map(field => {
      switch (field.type) {
        case 'text':
        case 'email':
        case 'password':
        case 'number':
        case 'url':
        case 'phone':
          return this.generateInputField(field);
        case 'textarea':
          return this.generateTextareaField(field);
        case 'select':
          return this.generateSelectField(field);
        case 'boolean':
          return this.generateCheckboxField(field);
        case 'date':
        case 'datetime':
          return this.generateDateField(field);
        case 'file':
        case 'image':
          return this.generateFileField(field);
        default:
          return this.generateInputField(field);
      }
    }).join('\n            ');
  }

  private generateInputField(field: FieldConfig): string {
    return `
            <FormField
              control={form.control}
              name="${field.name}"
              render={({ field: formField }) => (
                <FormItem>
                  <FormLabel>${field.label || field.name}</FormLabel>
                  <FormControl>
                    <Input
                      {...formField}
                      type="${field.type}"
                      placeholder="${field.placeholder || ''}"
                      ${field.readonly ? 'readOnly' : ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />`;
  }

  private generateTextareaField(field: FieldConfig): string {
    return `
            <FormField
              control={form.control}
              name="${field.name}"
              render={({ field: formField }) => (
                <FormItem>
                  <FormLabel>${field.label || field.name}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...formField}
                      placeholder="${field.placeholder || ''}"
                      ${field.readonly ? 'readOnly' : ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />`;
  }

  private generateSelectField(field: FieldConfig): string {
    return `
            <FormField
              control={form.control}
              name="${field.name}"
              render={({ field: formField }) => (
                <FormItem>
                  <FormLabel>${field.label || field.name}</FormLabel>
                  <Select onValueChange={formField.onChange} defaultValue={formField.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="${field.placeholder || 'Select...'}" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      ${field.options?.map(option => `
                        <SelectItem value="${option.value}">${option.label}</SelectItem>
                      `).join('') || ''}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />`;
  }

  private generateCheckboxField(field: FieldConfig): string {
    return `
            <FormField
              control={form.control}
              name="${field.name}"
              render={({ field: formField }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={formField.value}
                      onCheckedChange={formField.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>${field.label || field.name}</FormLabel>
                  </div>
                </FormItem>
              )}
            />`;
  }

  private generateDateField(field: FieldConfig): string {
    return `
            <FormField
              control={form.control}
              name="${field.name}"
              render={({ field: formField }) => (
                <FormItem>
                  <FormLabel>${field.label || field.name}</FormLabel>
                  <FormControl>
                    <Input
                      {...formField}
                      type="${field.type}"
                      placeholder="${field.placeholder || ''}"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />`;
  }

  private generateFileField(field: FieldConfig): string {
    return `
            <FormField
              control={form.control}
              name="${field.name}"
              render={({ field: formField }) => (
                <FormItem>
                  <FormLabel>${field.label || field.name}</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept="${field.type === 'image' ? 'image/*' : '*'}"
                      onChange={(e) => formField.onChange(e.target.files?.[0])}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />`;
  }

  private generateTableCell(field: FieldConfig): string {
    return `<TableCell>{item.${field.name}}</TableCell>`;
  }

  private generateCardField(field: FieldConfig): string {
    return `
          <div>
            <label className="text-sm font-medium text-muted-foreground">${field.label || field.name}</label>
            <p className="text-sm">{data.${field.name}}</p>
          </div>`;
  }

  private generateActionButton(action: ActionConfig): string {
    return `
              <Button
                type="${action.type}"
                variant="${action.variant || 'outline'}"
                size="${action.size || 'sm'}"
                ${action.onClick ? 'onClick={() => onAction?.("' + action.name + '", data)}' : ''}
                ${action.href ? 'asChild' : ''}
              >
                ${action.icon ? `<${action.icon} className="w-4 h-4 mr-2" />` : ''}
                ${action.label}
              </Button>`;
  }

  private generateTableAction(action: ActionConfig): string {
    return `
                      <Button
                        variant="${action.variant || 'ghost'}"
                        size="sm"
                        onClick={() => onAction?.("${action.name}", item)}
                      >
                        ${action.icon ? `<${action.icon} className="w-4 h-4" />` : action.label}
                      </Button>`;
  }

  private generateLayoutStructure(structure: LayoutStructure): string {
    switch (structure.type) {
      case 'grid':
        return `
      <div className="grid grid-cols-${structure.columns || 1} gap-${structure.gap || '4'}">
        {children}
      </div>`;
      case 'flex':
        return `
      <div className="flex flex-col gap-${structure.gap || '4'}">
        {children}
      </div>`;
      default:
        return `{children}`;
    }
  }

  private generateThemeCSS(theme: ThemeConfig): string {
    return `
:root {
  /* Colors */
  --color-primary: ${theme.colors.primary};
  --color-secondary: ${theme.colors.secondary};
  --color-accent: ${theme.colors.accent};
  --color-background: ${theme.colors.background};
  --color-surface: ${theme.colors.surface};
  --color-text: ${theme.colors.text};
  --color-text-secondary: ${theme.colors.textSecondary};
  --color-border: ${theme.colors.border};
  --color-error: ${theme.colors.error};
  --color-warning: ${theme.colors.warning};
  --color-success: ${theme.colors.success};
  --color-info: ${theme.colors.info};

  /* Typography */
  --font-family-primary: ${theme.typography.fontFamily.primary};
  --font-family-secondary: ${theme.typography.fontFamily.secondary};
  --font-family-mono: ${theme.typography.fontFamily.mono};
  
  /* Spacing */
  --spacing-xs: ${theme.spacing.xs};
  --spacing-sm: ${theme.spacing.sm};
  --spacing-md: ${theme.spacing.md};
  --spacing-lg: ${theme.spacing.lg};
  --spacing-xl: ${theme.spacing.xl};
  --spacing-2xl: ${theme.spacing['2xl']};
  --spacing-3xl: ${theme.spacing['3xl']};
}

/* Component Styles */
.btn-primary {
  background-color: var(--color-primary);
  color: white;
}

.btn-secondary {
  background-color: var(--color-secondary);
  color: white;
}

.card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
}

.text-primary {
  color: var(--color-text);
}

.text-secondary {
  color: var(--color-text-secondary);
}
`;
  }

  private compileTemplate(template: string, context: any): string {
    // Simple template compilation - replace {{variable}} with context values
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return context[key] || match;
    });
  }
}

// ============================================================================
// EXPORT DEFAULT CONFIGURATION
// ============================================================================

export const defaultUIGenerationConfig: UIGenerationConfig = {
  models: [],
  themes: [
    {
      name: 'default',
      type: 'light',
      colors: {
        primary: '#D2691E',
        secondary: '#0A3A2A',
        accent: '#E6B800',
        background: '#F8F5F0',
        surface: '#FFFFFF',
        text: '#3D2C20',
        textSecondary: '#6B7280',
        border: '#E5E7EB',
        error: '#EF4444',
        warning: '#F59E0B',
        success: '#10B981',
        info: '#3B82F6'
      },
      typography: {
        fontFamily: {
          primary: 'Inter, sans-serif',
          secondary: 'Inter, sans-serif',
          mono: 'JetBrains Mono, monospace'
        },
        fontSize: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          '2xl': '1.5rem',
          '3xl': '1.875rem'
        },
        fontWeight: {
          normal: '400',
          medium: '500',
          semibold: '600',
          bold: '700'
        },
        lineHeight: {
          tight: '1.25',
          normal: '1.5',
          relaxed: '1.75'
        }
      },
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
        '2xl': '3rem',
        '3xl': '4rem'
      },
      components: {
        button: {
          variants: {
            primary: 'bg-primary text-white hover:bg-primary/90',
            secondary: 'bg-secondary text-white hover:bg-secondary/90',
            outline: 'border border-primary text-primary hover:bg-primary hover:text-white',
            ghost: 'text-primary hover:bg-primary/10',
            destructive: 'bg-destructive text-white hover:bg-destructive/90'
          },
          sizes: {
            sm: 'h-8 px-3 text-sm',
            md: 'h-10 px-4',
            lg: 'h-12 px-6 text-lg'
          }
        },
        input: {
          base: 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
          variants: {
            default: 'border-input',
            error: 'border-destructive',
            success: 'border-green-500'
          },
          sizes: {
            sm: 'h-8 px-2 text-sm',
            md: 'h-10 px-3',
            lg: 'h-12 px-4 text-lg'
          }
        },
        card: {
          base: 'rounded-lg border bg-card text-card-foreground shadow-sm',
          header: 'flex flex-col space-y-1.5 p-6',
          content: 'p-6 pt-0',
          footer: 'flex items-center p-6 pt-0',
          variants: {
            default: 'border-border',
            elevated: 'shadow-lg',
            outlined: 'border-2'
          }
        },
        table: {
          base: 'w-full caption-bottom text-sm',
          header: 'border-b',
          row: 'border-b transition-colors hover:bg-muted/50',
          cell: 'p-4 align-middle',
          variants: {
            default: 'border-border',
            striped: 'even:bg-muted/50',
            bordered: 'border border-border'
          }
        },
        form: {
          base: 'space-y-6',
          field: 'space-y-2',
          label: 'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          error: 'text-sm font-medium text-destructive',
          help: 'text-sm text-muted-foreground'
        }
      }
    }
  ],
  layouts: [
    {
      name: 'default',
      type: 'flex',
      structure: {
        type: 'flex',
        gap: '6'
      },
      responsive: {
        breakpoints: {
          sm: '640px',
          md: '768px',
          lg: '1024px',
          xl: '1280px'
        },
        behavior: 'mobile-first'
      },
      styling: {
        className: 'container mx-auto p-6'
      }
    }
  ],
  components: []
};

export default UIGenerator;
