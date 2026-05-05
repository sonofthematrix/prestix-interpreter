import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { ComponentGenerator } from './component-generator';

/**
 * Auto Generator Plugin
 * Integrates with zen generate to auto-create components, hooks, and API routes
 */

export interface AutoGeneratorConfig {
  outputDir: string;
  models: string[];
  generateUI?: boolean;
  generateAPI?: boolean;
  generateHooks?: boolean;
  generateTypes?: boolean;
}

/**
 * Auto Generator Class
 */
export class AutoGenerator {
  private generator: ComponentGenerator;
  private config: AutoGeneratorConfig;

  constructor(config: AutoGeneratorConfig) {
    this.generator = new ComponentGenerator();
    this.config = config;
  }

  /**
   * Generate all components and write to files
   */
  async generateAll() {
    console.log('🚀 Starting auto-generation...');

    // Ensure output directories exist
    this.ensureDirectories();

    // Generate for each model
    for (const model of this.config.models) {
      await this.generateForModel(model);
    }

    console.log('✅ Auto-generation completed!');
  }

  private async generateForModel(model: string) {
    console.log(`📝 Generating components for ${model}...`);

    const config = this.getModelConfig(model);
    const generated = this.generator.generateComponents(config);

    // Write types
    if (this.config.generateTypes && generated.types) {
      await this.writeGeneratedFiles('types', model, generated.types);
    }

    // Write hooks
    if (this.config.generateHooks && generated.hooks) {
      await this.writeGeneratedFiles('hooks', model, generated.hooks);
    }

    // Write API routes
    if (this.config.generateAPI && generated.api) {
      await this.writeGeneratedFiles('api', model, generated.api);
    }

    // Write components
    if (this.config.generateUI && generated.components) {
      await this.writeGeneratedFiles('components', model, generated.components);
    }
  }

  private getModelConfig(model: string) {
    // Default configuration for each model based on actual schema
    const configs: Record<string, any> = {
      user: {
        model: 'user',
        fields: ['email', 'name', 'phone', 'bio', 'status'],
        relations: ['preferences', 'orders', 'addresses'],
        operations: ['create', 'read', 'update', 'delete', 'list'],
        ui: { form: true, table: true, card: true, modal: true }
      },
      product: {
        model: 'product',
        fields: ['name', 'description', 'price', 'sku', 'inventory', 'status'],
        relations: ['category', 'vendor', 'variants', 'reviews'],
        operations: ['create', 'read', 'update', 'delete', 'list'],
        ui: { form: true, table: true, card: true, modal: true }
      },
      order: {
        model: 'order',
        fields: ['status', 'totalAmount', 'subtotal', 'taxAmount', 'shippingAmount'],
        relations: ['user', 'items', 'payment', 'vendor'],
        operations: ['create', 'read', 'update', 'list'],
        ui: { table: true, card: true, modal: false }
      },
      category: {
        model: 'category',
        fields: ['name', 'description', 'slug', 'isActive'],
        relations: ['products', 'children', 'parent'],
        operations: ['create', 'read', 'update', 'delete', 'list'],
        ui: { form: true, table: true, card: false, modal: true }
      },
      vendorProfile: {
        model: 'vendorProfile',
        fields: ['businessName', 'description', 'businessType', 'isVerified'],
        relations: ['user', 'products', 'orders'],
        operations: ['create', 'read', 'update', 'list'],
        ui: { form: true, table: true, card: true, modal: true }
      },
      review: {
        model: 'review',
        fields: ['rating', 'title', 'content', 'isVerified'],
        relations: ['user', 'product', 'vendor'],
        operations: ['create', 'read', 'update', 'delete', 'list'],
        ui: { form: true, table: true, card: true, modal: false }
      },
      blogPost: {
        model: 'blogPost',
        fields: ['title', 'content', 'excerpt', 'status', 'publishedAt', 'authorId', 'slug'],
        relations: ['author', 'comments'],
        operations: ['create', 'read', 'update', 'delete', 'list'],
        ui: { form: true, table: true, card: true, modal: true }
      }
    };

    return configs[model] || {
      model,
      fields: ['name', 'description'],
      relations: [],
      operations: ['create', 'read', 'update', 'delete', 'list'],
      ui: { form: true, table: true, card: true, modal: true }
    };
  }

  private ensureDirectories() {
    const dirs = [
      this.config.outputDir,
      join(this.config.outputDir, 'types'),
      join(this.config.outputDir, 'hooks'),
      join(this.config.outputDir, 'api'),
      join(this.config.outputDir, 'components')
    ];

    for (const dir of dirs) {
      try {
        mkdirSync(dir, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }
    }
  }

  private async writeGeneratedFiles(type: string, model: string, files: Record<string, string>) {
    const outputDir = join(this.config.outputDir, type);

    for (const [fileName, content] of Object.entries(files)) {
      // Use .tsx for component files since they contain JSX
      const fileExtension = type === 'components' ? 'tsx' : 'ts';
      const filePath = join(outputDir, `${model}-${fileName}.${fileExtension}`);

      // Debug logging
      if (type === 'components') {
        console.log(`  🔍 DEBUG: type="${type}", fileExtension="${fileExtension}", filePath="${filePath}"`);
      }

      try {
        writeFileSync(filePath, content, 'utf8');
        console.log(`  ✓ Generated ${type}/${model}-${fileName}.${fileExtension}`);
      } catch (error) {
        console.error(`  ✗ Failed to generate ${type}/${model}-${fileName}.${fileExtension}:`, error);
      }
    }
  }
}

/**
 * Plugin for zen generate command integration
 */
export class ZenStackAutoGeneratorPlugin {
  private generator: AutoGenerator;

  constructor(config: Partial<AutoGeneratorConfig> = {}) {
    const defaultConfig: AutoGeneratorConfig = {
      outputDir: './src/generated',
      models: ['user', 'product', 'order', 'category', 'vendorProfile', 'review', 'blogPost'],
      generateUI: true,
      generateAPI: true,
      generateHooks: true,
      generateTypes: true,
      ...config
    };

    this.generator = new AutoGenerator(defaultConfig);
  }

  /**
   * Run auto-generation (call this from zen generate)
   */
  async generate() {
    console.log('🔧 ZenStack Auto Generator Plugin');
    console.log('=====================================');

    await this.generator.generateAll();

    console.log('\n📁 Generated files structure:');
    console.log('./src/generated/');
    console.log('├── types/          # TypeScript type definitions');
    console.log('├── hooks/          # React Query hooks');
    console.log('├── api/           # Next.js API route handlers');
    console.log('└── components/    # React UI components');
  }
}

// Export for use in package.json scripts
export const autoGenerator = new ZenStackAutoGeneratorPlugin();

/**
 * CLI runner for manual execution
 */
export async function runAutoGenerator() {
  await autoGenerator.generate();
}

// If run directly
if (require.main === module) {
  runAutoGenerator().catch(console.error);
}
