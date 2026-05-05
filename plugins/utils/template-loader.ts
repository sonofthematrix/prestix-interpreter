/**
 * Template Loader Utility
 * Loads and processes templates from plugins/templates/ directory
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export interface TemplateVariables {
  [key: string]: string | number | boolean | undefined;
}

export class TemplateLoader {
  private templatesDir: string;
  private templatesCache: Map<string, string> = new Map();

  constructor(projectRoot: string = process.cwd()) {
    this.templatesDir = join(projectRoot, 'plugins/templates');
  }

  /**
   * Load a template file
   */
  loadTemplate(templateName: string): string | null {
    // Check cache first
    if (this.templatesCache.has(templateName)) {
      return this.templatesCache.get(templateName)!;
    }

    const templatePath = join(this.templatesDir, templateName);
    
    if (!existsSync(templatePath)) {
      console.warn(`⚠️  Template not found: ${templatePath}`);
      return null;
    }

    try {
      const content = readFileSync(templatePath, 'utf-8');
      this.templatesCache.set(templateName, content);
      return content;
    } catch (error) {
      console.error(`❌ Failed to load template ${templateName}:`, error);
      return null;
    }
  }

  /**
   * Process template with variables
   * Supports simple variable substitution: {{variableName}}
   */
  processTemplate(template: string, variables: TemplateVariables): string {
    let processed = template;

    // Replace variables: {{variableName}}
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      processed = processed.replace(regex, String(value ?? ''));
    }

    // Remove any remaining unreplaced variables
    processed = processed.replace(/\{\{[\w]+\}\}/g, '');

    return processed;
  }

  /**
   * Load and process a template in one step
   */
  loadAndProcess(templateName: string, variables: TemplateVariables): string | null {
    const template = this.loadTemplate(templateName);
    if (!template) {
      return null;
    }

    return this.processTemplate(template, variables);
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.templatesCache.clear();
  }

  /**
   * Check if template exists
   */
  templateExists(templateName: string): boolean {
    const templatePath = join(this.templatesDir, templateName);
    return existsSync(templatePath);
  }

  /**
   * Get available templates
   */
  getAvailableTemplates(): string[] {
    try {
      const { readdirSync } = require('fs');
      if (!existsSync(this.templatesDir)) {
        return [];
      }
      return readdirSync(this.templatesDir)
        .filter((file: string) => file.endsWith('.ts') || file.endsWith('.tsx'));
    } catch (error) {
      console.error('Failed to list templates:', error);
      return [];
    }
  }
}

// Export singleton instance
export const templateLoader = new TemplateLoader();

