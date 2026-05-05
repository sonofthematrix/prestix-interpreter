/**
 * Theme Generator Integration
 * Patches the CompleteEntityGenerator to include theme support in all generated components
 */

import {
  THEME_IMPORTS,
  THEME_HOOK_USAGE,
  THEME_CSS_CLASSES,
  enhanceComponentWithTheme,
  generateThemeInlineStyles,
} from './theme-integration-mixin';

/**
 * Enhances generated admin table component with theme support
 */
export function enhanceAdminTableWithTheme(
  originalCode: string,
  modelName: string
): string {
  // Add theme imports if not present
  if (!originalCode.includes('useThemeStore')) {
    // Find the end of all imports by looking for the last closing of an import statement
    // Imports end with either ';' or '} from'
    const importRegex = /import\s+(?:{[^}]*}|[\w\s,*]+)\s+from\s+['"][^'"]+['"];?/gs;
    const matches = Array.from(originalCode.matchAll(importRegex));
    
    if (matches.length > 0) {
      const lastImport = matches[matches.length - 1];
      const insertPosition = lastImport.index! + lastImport[0].length;
      
      originalCode = 
        originalCode.slice(0, insertPosition) +
        '\n' + THEME_IMPORTS +
        originalCode.slice(insertPosition);
    }
  }
  
  // Add theme hook in component - find the function body opening brace
  if (!originalCode.includes('const { theme } = useThemeStore()')) {
    const funcMatch = originalCode.match(/export\s+(?:default\s+)?function\s+\w+AdminTable\s*\(\s*\)\s*{/);
    if (funcMatch) {
      const funcIndex = originalCode.indexOf(funcMatch[0]) + funcMatch[0].length;
      
      originalCode =
        originalCode.slice(0, funcIndex) +
        '\n  ' + THEME_HOOK_USAGE + '\n' +
        originalCode.slice(funcIndex);
    }
  }
  
  // Replace hardcoded className strings with theme-aware ones
  originalCode = originalCode
    .replace(
      /className="bg-white dark:bg-gray-800/g,
      `className="${THEME_CSS_CLASSES.card}`
    )
    .replace(
      /className="bg-card"/g,
      `className="${THEME_CSS_CLASSES.card}"`
    )
    .replace(
      /className="border-b"/g,
      `className="${THEME_CSS_CLASSES.cardHeader}"`
    )
    .replace(
      /className="hover:bg-muted dark:hover:bg-gray-800\/50"/g,
      `className="${THEME_CSS_CLASSES.tableRow}"`
    );
  
  // Add theme inline styles to main wrapper
  const wrapperMatch = originalCode.match(/<div\s+className="p-4 md:p-6">/);
  if (wrapperMatch) {
    const wrapperIndex = originalCode.indexOf(wrapperMatch[0]);
    const wrapperEnd = wrapperIndex + wrapperMatch[0].length;
    
    const inlineStyles = `
      style={{
        '--table-primary': theme.primaryColor,
        '--table-accent': theme.accentColor,
        '--table-font-size': theme.fontSize
      } as React.CSSProperties}`;
    
    originalCode =
      originalCode.slice(0, wrapperIndex) +
      `<div className="p-4 md:p-6"${inlineStyles}>` +
      originalCode.slice(wrapperEnd);
  }
  
  return originalCode;
}

/**
 * Enhances generated form component with theme support
 */
export function enhanceFormWithTheme(
  originalCode: string,
  modelName: string
): string {
  // Add theme imports
  if (!originalCode.includes('useThemeStore')) {
    const importRegex = /import\s+(?:{[^}]*}|[\w\s,*]+)\s+from\s+['"][^'"]+['"];?/gs;
    const matches = Array.from(originalCode.matchAll(importRegex));
    
    if (matches.length > 0) {
      const lastImport = matches[matches.length - 1];
      const insertPosition = lastImport.index! + lastImport[0].length;
      
      originalCode = 
        originalCode.slice(0, insertPosition) +
        '\n' + THEME_IMPORTS +
        originalCode.slice(insertPosition);
    }
  }
  
  // Add theme hook - find the function body opening brace (after params closing paren)
  if (!originalCode.includes('const { theme } = useThemeStore()')) {
    const funcMatch = originalCode.match(/export\s+(?:default\s+)?function\s+\w+Form\s*\([^)]*\)\s*{/);
    if (funcMatch) {
      const funcIndex = originalCode.indexOf(funcMatch[0]) + funcMatch[0].length;
      
      originalCode =
        originalCode.slice(0, funcIndex) +
        '\n  ' + THEME_HOOK_USAGE + '\n' +
        originalCode.slice(funcIndex);
    }
  }
  
  // Replace className strings with theme-aware ones
  originalCode = originalCode
    .replace(
      /className="bg-background dark:bg-gray-900 text-foreground dark:text-white border-border dark:border-gray-600"/g,
      `className="${THEME_CSS_CLASSES.input}"`
    )
    .replace(
      /className="text-foreground dark:text-white"/g,
      `className="${THEME_CSS_CLASSES.label}"`
    )
    .replace(
      /className="bg-card dark:bg-gray-800 border-border dark:border-gray-700"/g,
      `className="${THEME_CSS_CLASSES.card}"`
    );
  
  // Add inline styles to form wrapper
  const formMatch = originalCode.match(/<form[^>]*onSubmit={[^}]+}/);
  if (formMatch) {
    const formIndex = originalCode.indexOf(formMatch[0]);
    const formEnd = formIndex + formMatch[0].length;
    
    const inlineStyles = `
      style={{
        '--form-primary': theme.primaryColor,
        '--form-font-size': theme.fontSize
      } as React.CSSProperties}`;
    
    // Add style attribute before closing tag
    if (!originalCode.slice(formIndex, formEnd).includes('style=')) {
      const classNameEnd = originalCode.indexOf('>', formIndex);
      originalCode =
        originalCode.slice(0, classNameEnd) +
        inlineStyles +
        originalCode.slice(classNameEnd);
    }
  }
  
  // Replace Button components with theme-aware versions
  originalCode = originalCode.replace(
    /<Button\s+type="submit"([^>]*)>/g,
    (match, attrs) => {
      if (match.includes('style=')) {
        return match;
      }
      return `<Button
        type="submit"${attrs}
        className="${THEME_CSS_CLASSES.button}"
        style={{ backgroundColor: theme.primaryColor }}
      >`;
    }
  );
  
  return originalCode;
}

/**
 * Enhances generated view page with theme support
 */
export function enhanceViewPageWithTheme(
  originalCode: string,
  modelName: string
): string {
  // Add theme imports
  if (!originalCode.includes('useThemeStore')) {
    const importRegex = /import\s+(?:{[^}]*}|[\w\s,*]+)\s+from\s+['"][^'"]+['"];?/gs;
    const matches = Array.from(originalCode.matchAll(importRegex));
    
    if (matches.length > 0) {
      const lastImport = matches[matches.length - 1];
      const insertPosition = lastImport.index! + lastImport[0].length;
      
      originalCode = 
        originalCode.slice(0, insertPosition) +
        '\n' + THEME_IMPORTS +
        originalCode.slice(insertPosition);
    }
  }
  
  // Add theme hook - find the function body opening brace (after params)
  if (!originalCode.includes('const { theme } = useThemeStore()')) {
    const funcMatch = originalCode.match(/export\s+default\s+function\s+\w+ViewPage\s*\([^)]*\)\s*{/);
    if (funcMatch) {
      const funcIndex = originalCode.indexOf(funcMatch[0]) + funcMatch[0].length;
      
      originalCode =
        originalCode.slice(0, funcIndex) +
        '\n  ' + THEME_HOOK_USAGE + '\n' +
        originalCode.slice(funcIndex);
    }
  }
  
  // Apply theme CSS classes
  originalCode = originalCode
    .replace(
      /className="bg-card dark:bg-gray-800"/g,
      `className="${THEME_CSS_CLASSES.card}"`
    )
    .replace(
      /className="text-foreground dark:text-white"/g,
      `className="${THEME_CSS_CLASSES.cardTitle}"`
    )
    .replace(
      /className="text-muted-foreground dark:text-gray-400"/g,
      `className="${THEME_CSS_CLASSES.cardContent}"`
    );
  
  return originalCode;
}

/**
 * Enhances generated list page with theme support
 */
export function enhanceListPageWithTheme(
  originalCode: string,
  modelName: string
): string {
  // For list pages that use admin tables, the theme support comes from enhanceAdminTableWithTheme
  // Just ensure the imports are present
  if (!originalCode.includes('useThemeStore')) {
    return enhanceComponentWithTheme(originalCode, modelName);
  }
  return originalCode;
}

/**
 * Apply all theme enhancements to generated code
 */
export function applyThemeEnhancements(
  code: string,
  componentType: 'admin-table' | 'form' | 'view' | 'list' | 'component',
  modelName: string
): string {
  switch (componentType) {
    case 'admin-table':
      return enhanceAdminTableWithTheme(code, modelName);
    case 'form':
      return enhanceFormWithTheme(code, modelName);
    case 'view':
      return enhanceViewPageWithTheme(code, modelName);
    case 'list':
      return enhanceListPageWithTheme(code, modelName);
    case 'component':
      return enhanceComponentWithTheme(code, modelName);
    default:
      return code;
  }
}

/**
 * Generate theme-aware CSS classes string
 */
export function getThemeClass(componentPart: keyof typeof THEME_CSS_CLASSES): string {
  return THEME_CSS_CLASSES[componentPart];
}

export default {
  enhanceAdminTableWithTheme,
  enhanceFormWithTheme,
  enhanceViewPageWithTheme,
  enhanceListPageWithTheme,
  applyThemeEnhancements,
  getThemeClass,
  THEME_CSS_CLASSES,
};

