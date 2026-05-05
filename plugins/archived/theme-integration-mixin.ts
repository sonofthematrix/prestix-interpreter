/**
 * Theme Integration Mixin for Auto-Generation System
 * Adds user theme preference support to all generated components
 */

export const THEME_IMPORTS = `
import { useThemeStore } from '@/stores/ui-stores';
`.trim();

export const THEME_HOOK_USAGE = `
  const { theme } = useThemeStore();
`.trim();

export const THEME_AWARE_WRAPPER = (content: string) => `
  <div
    className="bg-card dark:bg-gray-800 text-foreground dark:text-white"
    style={{
      '--component-primary': theme.primaryColor,
      '--component-accent': theme.accentColor,
      '--component-font-size': theme.fontSize
    } as React.CSSProperties}
  >
    ${content}
  </div>
`;

export const THEME_AWARE_CARD = `
  <Card className="bg-card dark:bg-gray-800 border-border dark:border-gray-700">
    <CardHeader>
      <CardTitle className="text-foreground dark:text-white">{title}</CardTitle>
    </CardHeader>
    <CardContent className="text-muted-foreground dark:text-gray-400">
      {content}
    </CardContent>
  </Card>
`;

export const THEME_AWARE_BUTTON = `
  <Button
    className="bg-primary dark:bg-primary hover:bg-primary/90"
    style={{
      '--btn-bg': theme.primaryColor
    } as React.CSSProperties}
  >
    {label}
  </Button>
`;

export const THEME_AWARE_INPUT = `
  <Input
    className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
    {...props}
  />
`;

export const THEME_AWARE_TABLE_ROW = `
  <TableRow className="hover:bg-muted dark:hover:bg-gray-800/50 transition-colors">
    {children}
  </TableRow>
`;

export const THEME_AWARE_FORM_FIELD = `
  <div className="space-y-2">
    <Label className="text-foreground dark:text-white">{label}</Label>
    <Input
      className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"
      {...fieldProps}
    />
  </div>
`;

/**
 * Enhanced component template with theme support
 */
export function generateThemeAwareComponentTemplate(
  componentName: string,
  content: string,
  includeThemeStore: boolean = true
): string {
  const themeImports = includeThemeStore ? THEME_IMPORTS : '';
  const themeHook = includeThemeStore ? THEME_HOOK_USAGE : '';
  
  return `
"use client";

import React from 'react';
${themeImports}

export function ${componentName}() {
${themeHook}

  return (
${content}
  );
}
`.trim();
}

/**
 * Wraps any component code with theme awareness
 */
export function enhanceComponentWithTheme(
  componentCode: string,
  componentName: string
): string {
  // Check if already has theme support
  if (componentCode.includes('useThemeStore')) {
    return componentCode;
  }

  // Add theme imports after other imports using regex to find complete import statements
  const importRegex = /import\s+(?:{[^}]*}|[\w\s,*]+)\s+from\s+['"][^'"]+['"];?/gs;
  const matches = Array.from(componentCode.matchAll(importRegex));
  
  if (matches.length === 0) {
    // No imports found, add at the beginning
    return THEME_IMPORTS + '\n\n' + componentCode;
  }

  // Find the end of the last import statement
  const lastImport = matches[matches.length - 1];
  const insertPosition = lastImport.index! + lastImport[0].length;
  
  // Insert theme imports
  const beforeImports = componentCode.slice(0, insertPosition);
  const afterImports = componentCode.slice(insertPosition);
  
  const enhanced = beforeImports + '\n' + THEME_IMPORTS + afterImports;
  
  // Add theme hook usage after component function declaration
  const functionMatch = enhanced.match(/export\s+(?:default\s+)?function\s+\w+\s*\([^)]*\)\s*{/);
  if (!functionMatch) {
    return enhanced;
  }
  
  const funcEndIndex = enhanced.indexOf(functionMatch[0]) + functionMatch[0].length;
  const beforeFunc = enhanced.slice(0, funcEndIndex);
  const afterFunc = enhanced.slice(funcEndIndex);
  
  return beforeFunc + '\n  ' + THEME_HOOK_USAGE + '\n' + afterFunc;
}

/**
 * Generate theme-aware CSS classes for common components
 */
export const THEME_CSS_CLASSES = {
  card: 'bg-card dark:bg-gray-800 border-border dark:border-gray-700',
  cardHeader: 'border-b border-border dark:border-gray-700',
  cardTitle: 'text-foreground dark:text-white',
  cardContent: 'text-muted-foreground dark:text-gray-400',
  button: 'bg-primary dark:bg-primary hover:bg-primary/90 text-primary-foreground',
  buttonSecondary: 'bg-secondary dark:bg-gray-700 hover:bg-secondary/80 text-secondary-foreground dark:text-white',
  input: 'bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600',
  label: 'text-foreground dark:text-white',
  table: 'bg-card dark:bg-gray-800 border border-border dark:border-gray-700',
  tableRow: 'hover:bg-muted dark:hover:bg-gray-800/50 transition-colors border-b border-border dark:border-gray-700',
  tableHeader: 'bg-muted dark:bg-gray-900/50 text-foreground dark:text-white font-medium',
  tableCell: 'text-muted-foreground dark:text-gray-400',
  dialog: 'bg-card dark:bg-gray-800 border-border dark:border-gray-700',
  dialogTitle: 'text-foreground dark:text-white',
  dialogDescription: 'text-muted-foreground dark:text-gray-400',
  badge: 'bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-white border border-border dark:border-gray-600',
  separator: 'bg-border dark:bg-gray-700',
};

/**
 * Generate inline styles that respect user theme preferences
 */
export function generateThemeInlineStyles(
  customPrimary?: boolean,
  customAccent?: boolean,
  customFontSize?: boolean
): string {
  const styles: string[] = [];
  
  if (customPrimary) {
    styles.push("'--component-primary': theme.primaryColor");
  }
  if (customAccent) {
    styles.push("'--component-accent': theme.accentColor");
  }
  if (customFontSize) {
    styles.push("'--component-font-size': theme.fontSize");
  }
  
  if (styles.length === 0) {
    return '';
  }
  
  return `style={{
      ${styles.join(',\n      ')}
    } as React.CSSProperties}`;
}

/**
 * Wraps admin table components with theme awareness
 */
export function generateThemeAwareAdminTable(tableName: string, tableContent: string): string {
  return `
"use client";

import React from 'react';
import { useThemeStore } from '@/stores/ui-stores';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function ${tableName}AdminTable() {
  const { theme } = useThemeStore();

  return (
    <div
      className="p-4 md:p-6"
      style={{
        '--table-primary': theme.primaryColor,
        '--table-accent': theme.accentColor
      } as React.CSSProperties}
    >
      <Card className="${THEME_CSS_CLASSES.card}">
        <CardHeader className="${THEME_CSS_CLASSES.cardHeader}">
          <CardTitle className="${THEME_CSS_CLASSES.cardTitle}">
            ${tableName}
          </CardTitle>
        </CardHeader>
        <CardContent>
${tableContent}
        </CardContent>
      </Card>
    </div>
  );
}
`.trim();
}

/**
 * Generate theme-aware form component wrapper
 */
export function generateThemeAwareFormWrapper(formName: string, formFields: string): string {
  return `
"use client";

import React from 'react';
import { useThemeStore } from '@/stores/ui-stores';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ${formName}Form() {
  const { theme } = useThemeStore();

  return (
    <div
      className="max-w-2xl mx-auto p-4 md:p-6"
      style={{
        '--form-primary': theme.primaryColor,
        '--form-font-size': theme.fontSize
      } as React.CSSProperties}
    >
      <Card className="${THEME_CSS_CLASSES.card}">
        <CardHeader>
          <CardTitle className="${THEME_CSS_CLASSES.cardTitle}">
            ${formName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
${formFields}
              <Button
                type="submit"
                className="${THEME_CSS_CLASSES.button}"
                style={{
                  backgroundColor: theme.primaryColor
                }}
              >
                Submit
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
`.trim();
}

export default {
  THEME_IMPORTS,
  THEME_HOOK_USAGE,
  THEME_CSS_CLASSES,
  generateThemeAwareComponentTemplate,
  enhanceComponentWithTheme,
  generateThemeInlineStyles,
  generateThemeAwareAdminTable,
  generateThemeAwareFormWrapper,
};

