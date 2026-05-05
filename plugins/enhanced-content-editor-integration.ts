/**
 * Enhanced Content Editor Integration
 * Integrates the enhanced content editor with the auto-generation plugin
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// Declare webpack global for TypeScript
declare const __webpack_require__: any;

// Conditional import - template may not be available during Vercel builds
// Initialize with defaults
let generateEnhancedFormTemplate: any = () => '';
let generateEnhancedDialogTemplate: any = () => '';
let CONTENT_EDITOR_CONFIGS: any = [];
type ContentEditorConfig = any;

// Helper function to safely load template module
// Using function to prevent webpack from statically analyzing the require
function loadTemplateModule(modulePath: string): any {
  try {
    // Skip during webpack builds to avoid static analysis
    if (typeof __webpack_require__ !== 'undefined') {
      return null;
    }
    // @ts-ignore - Module may not exist during builds
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const req = eval('require'); // Prevent webpack from analyzing
    return req(modulePath);
  } catch {
    return null;
  }
}

// Only try to load template if not in Vercel build environment
// Skip loading during builds to avoid webpack static analysis issues
const isBuildEnvironment = typeof process !== 'undefined' && (
  process.env.VERCEL === '1' || 
  process.env.NODE_ENV === 'production' ||
  process.env.NEXT_PHASE === 'phase-production-build'
);

if (!isBuildEnvironment) {
  // Try to load template file
  const templateModule = loadTemplateModule('./templates/enhanced-content-editor-template');
  if (templateModule) {
    generateEnhancedFormTemplate = templateModule.generateEnhancedFormTemplate || generateEnhancedFormTemplate;
    generateEnhancedDialogTemplate = templateModule.generateEnhancedDialogTemplate || generateEnhancedDialogTemplate;
    CONTENT_EDITOR_CONFIGS = templateModule.CONTENT_EDITOR_CONFIGS || CONTENT_EDITOR_CONFIGS;
  } else {
    // Template not available - try stub file as fallback
    const stubModule = loadTemplateModule('./enhanced-content-editor-template-stub');
    if (stubModule) {
      generateEnhancedFormTemplate = stubModule.generateEnhancedFormTemplate || generateEnhancedFormTemplate;
      generateEnhancedDialogTemplate = stubModule.generateEnhancedDialogTemplate || generateEnhancedDialogTemplate;
      CONTENT_EDITOR_CONFIGS = stubModule.CONTENT_EDITOR_CONFIGS || CONTENT_EDITOR_CONFIGS;
    } else if (process.env.NODE_ENV !== 'production') {
      // Both template and stub not available - defaults already set above
      console.warn('⚠️  Enhanced content editor template not found, using defaults');
    }
  }
}

export interface EnhancedEditorIntegrationConfig {
  outputDir: string;
  models: string[];
  overwriteExisting?: boolean;
  generateBackups?: boolean;
}

/**
 * Enhanced Content Editor Integration Class
 */
export class EnhancedContentEditorIntegration {
  private config: EnhancedEditorIntegrationConfig;

  constructor(config: EnhancedEditorIntegrationConfig) {
    this.config = {
      overwriteExisting: false,
      generateBackups: true,
      ...config
    };
  }

  /**
   * Generate enhanced forms for all configured models
   */
  async generateEnhancedForms() {
    console.log('🚀 Enhanced Content Editor Integration');
    console.log('=====================================');

    for (const modelName of this.config.models) {
      await this.generateForModel(modelName);
    }

    console.log('\n✅ Enhanced content editor integration complete!');
    console.log('\n📁 Generated files structure:');
    console.log(`${this.config.outputDir}/`);
    console.log('├── forms/              # Enhanced form components');
    console.log('├── dialogs/            # Enhanced dialog components');
    console.log('└── backups/            # Backup of original files (if enabled)');
  }

  /**
   * Generate enhanced components for a specific model
   */
  private async generateForModel(modelName: string) {
    console.log(`\n🔧 Processing ${modelName}...`);

    const config = CONTENT_EDITOR_CONFIGS[modelName];
    if (!config) {
      console.log(`⚠️  No content editor configuration found for ${modelName}, skipping...`);
      return;
    }

    try {
      // Generate enhanced form
      await this.generateEnhancedForm(modelName, config);
      
      // Generate enhanced dialog
      await this.generateEnhancedDialog(modelName, config);
      
      console.log(`✅ ${modelName} enhanced components generated successfully`);
    } catch (error) {
      console.error(`❌ Failed to generate enhanced components for ${modelName}:`, error);
    }
  }

  /**
   * Generate enhanced form component
   */
  private async generateEnhancedForm(modelName: string, config: ContentEditorConfig) {
    const lowerName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    const formDir = join(this.config.outputDir, 'forms');
    const formPath = join(formDir, `enhanced-${lowerName}-form.tsx`);

    // Create directory if it doesn't exist
    if (!existsSync(formDir)) {
      mkdirSync(formDir, { recursive: true });
    }

    // Backup existing file if enabled
    if (this.config.generateBackups && existsSync(formPath)) {
      await this.backupFile(formPath, modelName, 'form');
    }

    // Generate and write the enhanced form
    const formContent = generateEnhancedFormTemplate(config);
    
    if (!this.config.overwriteExisting && existsSync(formPath)) {
      console.log(`⚠️  Enhanced form for ${modelName} already exists, skipping...`);
      return;
    }

    writeFileSync(formPath, formContent, 'utf8');
    console.log(`📝 Generated enhanced form: ${formPath}`);
  }

  /**
   * Generate enhanced dialog component
   */
  private async generateEnhancedDialog(modelName: string, config: ContentEditorConfig) {
    const lowerName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    const dialogDir = join(this.config.outputDir, 'dialogs');
    const dialogPath = join(dialogDir, `enhanced-${lowerName}-dialog.tsx`);

    // Create directory if it doesn't exist
    if (!existsSync(dialogDir)) {
      mkdirSync(dialogDir, { recursive: true });
    }

    // Backup existing file if enabled
    if (this.config.generateBackups && existsSync(dialogPath)) {
      await this.backupFile(dialogPath, modelName, 'dialog');
    }

    // Generate and write the enhanced dialog
    const dialogContent = generateEnhancedDialogTemplate(config);
    
    if (!this.config.overwriteExisting && existsSync(dialogPath)) {
      console.log(`⚠️  Enhanced dialog for ${modelName} already exists, skipping...`);
      return;
    }

    writeFileSync(dialogPath, dialogContent, 'utf8');
    console.log(`📝 Generated enhanced dialog: ${dialogPath}`);
  }

  /**
   * Backup existing file
   */
  private async backupFile(filePath: string, modelName: string, type: string) {
    const backupDir = join(this.config.outputDir, 'backups');
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(backupDir, `${modelName.toLowerCase()}-${type}-${timestamp}.tsx.backup`);
    
    const fs = require('fs');
    fs.copyFileSync(filePath, backupPath);
    console.log(`💾 Backed up existing file: ${backupPath}`);
  }

  /**
   * Update existing components to use enhanced editor
   */
  async updateExistingComponents() {
    console.log('\n🔄 Updating existing components...');

    for (const modelName of this.config.models) {
      await this.updateModelComponents(modelName);
    }

    console.log('✅ Existing components updated successfully!');
  }

  /**
   * Update components for a specific model
   */
  private async updateModelComponents(modelName: string) {
    const lowerName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    const config = CONTENT_EDITOR_CONFIGS[modelName];
    
    if (!config) {
      console.log(`⚠️  No configuration for ${modelName}, skipping update...`);
      return;
    }

    // Update form component
    const formPath = join('src/components/admin', `${lowerName}-form.tsx`);
    if (existsSync(formPath)) {
      await this.updateFormComponent(formPath, config);
      console.log(`✅ Updated form component: ${formPath}`);
    }

    // Update dialog component
    const dialogPath = join('src/components/admin', `${lowerName}-dialog.tsx`);
    if (existsSync(dialogPath)) {
      await this.updateDialogComponent(dialogPath, config);
      console.log(`✅ Updated dialog component: ${dialogPath}`);
    }
  }

  /**
   * Update form component to use enhanced content editor
   */
  private async updateFormComponent(filePath: string, config: ContentEditorConfig) {
    const fs = require('fs');
    let content = fs.readFileSync(filePath, 'utf8');

    // Add import for EnhancedContentEditor
    if (!content.includes('EnhancedContentEditor')) {
      const importMatch = content.match(/(import.*from '@\/components\/ui\/.*';)/);
      if (importMatch) {
        const newImport = `${importMatch[1]}\nimport { EnhancedContentEditor } from '@/components/admin/enhanced-content-editor';`;
        content = content.replace(importMatch[1], newImport);
      }
    }

    // Replace content field inputs with EnhancedContentEditor
    for (const field of config.contentFields) {
      const inputPattern = new RegExp(
        `<Input[^>]*id="${field}"[^>]*value={[^}]*}[^>]*onChange={[^}]*}[^>]*placeholder="[^"]*"[^>]*\\/?>`,
        'g'
      );
      
      const replacement = `<EnhancedContentEditor
                value={formData.${field} as string || ''}
                onChange={(value) => handleChange('${field}', value)}
                label="${field.charAt(0).toUpperCase() + field.slice(1)}"
                placeholder="Start writing your ${field}..."
                required={true}
                minHeight={${config.minHeight}}
                maxHeight={${config.maxHeight}}
                showPreview={${config.enablePreview}}
                showAIAssistant={${config.enableAI}}
                autoSave={mode === 'edit'}
                className="w-full"
              />`;

      content = content.replace(inputPattern, replacement);
    }

    fs.writeFileSync(filePath, content, 'utf8');
  }

  /**
   * Update dialog component (placeholder for future enhancements)
   */
  private async updateDialogComponent(filePath: string, config: ContentEditorConfig) {
    // For now, dialogs will use the updated form components
    // Future enhancements can be added here
    console.log(`📝 Dialog component ${filePath} will use updated form automatically`);
  }
}

/**
 * Plugin for zen generate command integration
 */
export class EnhancedContentEditorPlugin {
  private integration: EnhancedContentEditorIntegration;

  constructor(config: Partial<EnhancedEditorIntegrationConfig> = {}) {
    const defaultConfig: EnhancedEditorIntegrationConfig = {
      outputDir: './src/components/admin/enhanced',
      models: ['BlogPost', 'Documentation', 'Product'],
      overwriteExisting: false,
      generateBackups: true,
      ...config
    };

    this.integration = new EnhancedContentEditorIntegration(defaultConfig);
  }

  /**
   * Run enhanced content editor integration
   */
  async generate() {
    await this.integration.generateEnhancedForms();
  }

  /**
   * Update existing components
   */
  async update() {
    await this.integration.updateExistingComponents();
  }
}

// Export for use in package.json scripts
export const enhancedContentEditorPlugin = new EnhancedContentEditorPlugin();

/**
 * CLI runner function
 */
export async function runEnhancedContentEditorIntegration() {
  const plugin = new EnhancedContentEditorPlugin({
    outputDir: './src/components/admin/enhanced',
    models: Object.keys(CONTENT_EDITOR_CONFIGS),
    overwriteExisting: process.argv.includes('--overwrite'),
    generateBackups: !process.argv.includes('--no-backup'),
  });

  if (process.argv.includes('--update')) {
    await plugin.update();
  } else {
    await plugin.generate();
  }
}

// Run if called directly
if (require.main === module) {
  runEnhancedContentEditorIntegration().catch(console.error);
}
