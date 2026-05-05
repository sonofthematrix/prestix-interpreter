/**
 * ZenStack Plugins Index
 * Export all plugins and utilities for auto-generation
 */

export * from './auto-generator';
export * from './component-generator';
export * from './entity-mutation-hooks';
export * from './query-api-hooks';

// Export specific items to avoid naming conflicts
export { enhancedAutoGenerator } from './enhanced-auto-generator';
export type { EntityConfig as EnhancedEntityConfig } from './enhanced-auto-generator';
export { enhancedProductionGenerator } from './enhanced-production-generator';
export type { EntityConfig as ProductionEntityConfig } from './enhanced-production-generator';

// Re-export commonly used items
export { AppStateSyncGenerator, appStateSyncGenerator } from './app-state-sync-generator';
export { runAutoGenerator, ZenStackAutoGeneratorPlugin } from './auto-generator';
export { ComponentGenerator } from './component-generator';
export { DeploymentConfigGenerator, deploymentConfigGenerator } from './deployment-config-generator';
export { DocumentationSyncPlugin, documentationSyncPlugin } from './documentation-sync-plugin';
export { dbWithPlugins } from './entity-mutation-hooks';
export { NavigationGenerator, navigationGenerator } from './navigation-generator';
export { dbWithApiPlugins } from './query-api-hooks';
export { ZustandStoreGenerator, zustandStoreGenerator, generateZustandStores } from './zustand-store-generator';

/**
 * Plugin Registry
 * Manages all available plugins
 */
export class PluginRegistry {
  private static instance: PluginRegistry;
  private plugins: Map<string, any> = new Map();

  private constructor() {
    // Initialize built-in plugins
    try {
      this.registerPlugin('entity-mutation-hooks', require('./entity-mutation-hooks'));
      this.registerPlugin('query-api-hooks', require('./query-api-hooks'));
      this.registerPlugin('component-generator', require('./component-generator'));
      this.registerPlugin('auto-generator', require('./auto-generator'));
      this.registerPlugin('enhanced-auto-generator', require('./enhanced-auto-generator'));
      this.registerPlugin('enhanced-production-generator', require('./enhanced-production-generator'));

      // Enhanced content editor integration may not be available during Vercel builds
      try {
        this.registerPlugin('enhanced-content-editor-integration', require('./enhanced-content-editor-integration'));
      } catch (e) {
        console.warn('⚠️  Enhanced content editor integration not available (expected during Vercel builds)');
      }

      // Template files are text templates (with placeholders), not executable TS modules.
      // Register them by file reference instead of requiring/transpiling.
      const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
      if (!isProduction) {
        const { existsSync } = require('node:fs');
        const { join } = require('node:path');
        const templatesDir = join(__dirname, 'templates');

        const registerTemplateRef = (pluginName: string, fileName: string, warningMessage: string) => {
          const templatePath = join(templatesDir, fileName);
          if (existsSync(templatePath)) {
            this.registerPlugin(pluginName, { type: 'template-file', path: templatePath });
          } else {
            console.warn(warningMessage);
          }
        };

        registerTemplateRef(
          'header-wagmi-dependent-template',
          'header-wagmi-dependent-template.tsx',
          '⚠️  Header wagmi-dependent template file not available'
        );
        registerTemplateRef(
          'app-header-template',
          'app-header-template.tsx',
          '⚠️  App header template file not available'
        );
        registerTemplateRef(
          'admin-page-template',
          'admin-page-template.tsx',
          '⚠️  Admin page template file not available'
        );
        registerTemplateRef(
          'admin-table-template',
          'admin-table-template.tsx',
          '⚠️  Admin table template file not available'
        );
      }

      this.registerPlugin('deployment-config-generator', require('./deployment-config-generator'));
      this.registerPlugin('navigation-generator', require('./navigation-generator'));
      this.registerPlugin('zustand-store-generator', require('./zustand-store-generator'));
    } catch (error) {
      console.warn('Some plugins could not be loaded:', error);
    }
  }

  static getInstance(): PluginRegistry {
    if (!PluginRegistry.instance) {
      PluginRegistry.instance = new PluginRegistry();
    }
    return PluginRegistry.instance;
  }

  registerPlugin(name: string, plugin: any) {
    this.plugins.set(name, plugin);
  }

  getPlugin(name: string) {
    return this.plugins.get(name);
  }

  getAllPlugins() {
    return Array.from(this.plugins.entries());
  }

  async runPlugin(name: string, ...args: any[]) {
    const plugin = this.getPlugin(name);
    if (!plugin) {
      throw new Error(`Plugin '${name}' not found`);
    }

    if (typeof plugin.run === 'function') {
      return await plugin.run(...args);
    } else if (typeof plugin === 'function') {
      return await plugin(...args);
    } else {
      throw new Error(`Plugin '${name}' has no run method`);
    }
  }
}

// Export singleton instance
export const pluginRegistry = PluginRegistry.getInstance();

/**
 * Quick setup functions for common use cases
 */

export async function setupBasicPlugins() {
  console.log('🔧 Setting up basic ZenStack plugins...');

  // Import the enhanced databases
  const { dbWithPlugins } = await import('./entity-mutation-hooks');
  const { dbWithApiPlugins } = await import('./query-api-hooks');

  console.log('✅ Basic plugins loaded');
  console.log('📦 Available: dbWithPlugins, dbWithApiPlugins');

  return {
    dbWithPlugins,
    dbWithApiPlugins
  };
}

export async function generateAllComponents() {
  console.log('🎨 Generating all UI components...');

  const { ComponentGenerator } = await import('./component-generator');
  const generator = new ComponentGenerator();

  const components = generator.generateAllComponents();

  console.log('✅ Components generated for models:', Object.keys(components));

  return components;
}

export async function runFullAutoGeneration() {
  console.log('🚀 Running full auto-generation...');

  const { ZenStackAutoGeneratorPlugin } = await import('./auto-generator');
  const generator = new ZenStackAutoGeneratorPlugin();

  await generator.generate();

  console.log('✅ Full auto-generation completed');
}

export async function runEnhancedProductionGeneration() {
  console.log('🚀 Running enhanced production generation...');

  const { enhancedProductionGenerator } = await import('./enhanced-production-generator');
  await enhancedProductionGenerator.generateAll();

  console.log('✅ Enhanced production generation completed');
}

export async function runEnhancedContentEditorIntegration() {
  console.log('🚀 Running enhanced content editor integration...');

  const { enhancedContentEditorPlugin } = await import('./enhanced-content-editor-integration');
  await enhancedContentEditorPlugin.generate();

  console.log('✅ Enhanced content editor integration completed');
}

export async function runNavigationGeneration() {
  console.log('🚀 Running navigation generation...');

  const { navigationGenerator } = await import('./navigation-generator');
  await navigationGenerator.generate();

  console.log('✅ Navigation generation completed');
}

export async function updateExistingComponentsWithEnhancedEditor() {
  console.log('🔄 Updating existing components with enhanced content editor...');

  const { enhancedContentEditorPlugin } = await import('./enhanced-content-editor-integration');
  await enhancedContentEditorPlugin.update();

  console.log('✅ Existing components updated with enhanced content editor');
}

export async function generateDatabaseAnalytics() {
  console.log('📊 Generating database analytics components and patterns...');

  try {
    // Generate database analytics store
    const { useDatabaseAnalytics } = await import('../src/stores/database-analytics-store');
    console.log('✅ Database analytics store loaded');

    // Generate API endpoint for database stats
    const { enhancedProductionGenerator } = await import('./enhanced-production-generator');
    await enhancedProductionGenerator.generateAll();

    console.log('✅ Database analytics generation completed');
  } catch (error) {
    console.warn('⚠️  Database analytics generation skipped (dependencies not available)');
    console.warn('   Run: bun install && bun zen:generate');
  }
}

export async function syncAppState() {
  console.log('🔄 Running application state synchronization...');

  const { AppStateSyncGenerator } = await import('./app-state-sync-generator');
  const generator = new AppStateSyncGenerator();

  const report = await generator.sync();

  console.log('✅ Application state synchronization completed');
  return report;
}

export async function generateZustandStoresForModels(models: Array<{ name: string; fields: string[] }>) {
  console.log('📦 Generating Zustand stores for models...');

  const { generateZustandStores } = await import('./zustand-store-generator');
  const report = await generateZustandStores({ models });

  console.log('✅ Zustand store generation completed');
  return report;
}

/**
 * Verify template registry health
 * Ensures all required template files exist before sync/generation runs.
 */
export async function checkTemplateRegistryHealth() {
  const { existsSync } = require('node:fs');
  const { join } = require('node:path');

  const templatesDir = join(__dirname, 'templates');
  const requiredTemplates = [
    'route-template.ts',
    'component-template.tsx',
    'form-template.tsx',
    'hook-template.ts',
    'api-client-template.ts',
    'sidebar-template.tsx',
    'admin-page-template.tsx',
    'admin-table-template.tsx',
    'header-wagmi-dependent-template.tsx',
    'app-header-template.tsx',
  ];

  const optionalTemplates = [
    'qtech-service-template.ts',
    'qtech-webhook-route-template.ts',
  ];

  console.log('🩺 Template Registry Health Check');
  console.log('================================');
  console.log(`📁 Templates directory: ${templatesDir}`);

  const missingRequired: string[] = [];

  for (const file of requiredTemplates) {
    const fullPath = join(templatesDir, file);
    if (existsSync(fullPath)) {
      console.log(`✅ Required: ${file}`);
    } else {
      console.log(`❌ Required missing: ${file}`);
      missingRequired.push(file);
    }
  }

  for (const file of optionalTemplates) {
    const fullPath = join(templatesDir, file);
    if (existsSync(fullPath)) {
      console.log(`✅ Optional: ${file}`);
    } else {
      console.log(`ℹ️  Optional missing: ${file}`);
    }
  }

  if (missingRequired.length > 0) {
    console.log('\n❌ Template registry health check failed');
    console.log(`Missing required templates (${missingRequired.length}):`);
    for (const file of missingRequired) {
      console.log(`   - ${file}`);
    }
    process.exitCode = 1;
    return {
      ok: false,
      missingRequired,
    };
  }

  console.log('\n✅ Template registry health check passed');
  return {
    ok: true,
    missingRequired: [],
  };
}

/**
 * Documentation synchronization (standalone)
 * Can be called independently or as part of syncAppState
 */
export async function syncTestFailuresToGeneration() {
  console.log('🔄 Running test failure to generation sync...');

  // Skip during Vercel builds - scripts/ directory is excluded via .vercelignore
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    console.warn('⚠️  Test failure sync script skipped (not available in production builds)');
    return;
  }

  try {
    // Use template literal to prevent webpack from statically analyzing the import path
    // This script is excluded from Vercel builds via .vercelignore
    const basePath = '../scripts/';
    const scriptName = 'sync-test-failures-to-generation';
    // @ts-ignore - Dynamic import path that may not exist in production
    const module = await import(`${basePath}${scriptName}`);
    const { syncTestFailuresToGeneration } = module;
    await syncTestFailuresToGeneration();
    console.log('✅ Test failure to generation sync completed');
  } catch (error) {
    // Script may not be available during Vercel builds (excluded by .vercelignore)
    console.warn('⚠️  Test failure sync script not available (expected during Vercel builds)');
    console.warn('   Skipping test failure sync - this is normal if scripts/ is excluded');
  }
}

/**
 * Integration with zen generate command
 * Add this to your package.json scripts:
 *
 * "zen:generate:full": "tsx plugins/index.ts generate-full"
 */
export async function generateFull() {
  // First run ZenStack schema generation
  const { execSync } = require('child_process');
  console.log('🔧 Running zen generate...');
  execSync('bun run zen:generate', { stdio: 'inherit' });

  // Then run auto-generation
  await runFullAutoGeneration();

  // Generate navigation configuration and components
  await runNavigationGeneration();

  console.log('✅ Full generation completed with navigation');
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];

  switch (command) {
    case 'generate-full':
      generateFull().catch(console.error);
      break;
    case 'generate-components':
      generateAllComponents().catch(console.error);
      break;
    case 'generate-production':
      runEnhancedProductionGeneration().catch(console.error);
      break;
    case 'generate-enhanced-editor':
      runEnhancedContentEditorIntegration().catch(console.error);
      break;
    case 'update-enhanced-editor':
      updateExistingComponentsWithEnhancedEditor().catch(console.error);
      break;
    case 'generate-navigation':
      runNavigationGeneration().catch(console.error);
      break;
    case 'setup-plugins':
      setupBasicPlugins().catch(console.error);
      break;
    case 'generate-database-analytics':
      generateDatabaseAnalytics().catch(console.error);
      break;
    case 'sync-app-state':
      syncAppState().catch(console.error);
      break;
    case 'sync-documentation':
      syncTestFailuresToGeneration().catch(console.error);
      break;
    case 'sync-test-failures':
      syncTestFailuresToGeneration().catch(console.error);
      break;
    case 'generate-stores':
      // Generate stores for all models in schema
      (async () => {
        const { ZustandStoreGenerator } = await import('./zustand-store-generator');
        const generator = new ZustandStoreGenerator();
        await generator.analyze();
        const report = generator.getReport();
        console.log('\n📊 Store Analysis Report:');
        console.log(`   Analyzed: ${report.analyzedStores.length} stores`);
        console.log(`   Recommendations: ${report.recommendations.length}`);
        if (report.recommendations.length > 0) {
          report.recommendations.forEach(rec => console.log(`   - ${rec}`));
        }
      })().catch(console.error);
      break;
    case 'template-health':
      checkTemplateRegistryHealth().catch(console.error);
      break;
    default:
      console.log('Usage: tsx plugins/index.ts <command>');
      console.log('Commands:');
      console.log('  generate-full           - Run zen generate + auto-generation');
      console.log('  generate-components     - Generate UI components only');
      console.log('  generate-production     - Generate enhanced production components');
      console.log('  generate-enhanced-editor - Generate enhanced content editor forms');
      console.log('  update-enhanced-editor  - Update existing components with enhanced editor');
      console.log('  generate-navigation     - Generate navigation configuration and icons');
      console.log('  generate-database-analytics - Generate database analytics components and patterns');
      console.log('  sync-app-state         - Synchronize app state and update generation templates');
      console.log('  sync-test-failures     - Sync test failures to generation templates');
      console.log('  generate-stores        - Analyze and generate Zustand stores');
      console.log('  template-health        - Verify required template files exist');
      console.log('  setup-plugins          - Setup basic plugins');
      break;
  }
}
