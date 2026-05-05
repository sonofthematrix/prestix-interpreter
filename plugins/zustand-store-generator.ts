import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, basename, extname, relative } from 'path';
import { execSync } from 'child_process';

/**
 * Zustand Store Generator Plugin
 * 
 * Analyzes existing Zustand stores and generates new stores based on:
 * - Schema models (ZenStack)
 * - Existing store patterns
 * - Configuration files
 * 
 * Integrates with /1-sync command for automatic store generation
 */

interface StorePattern {
  name: string;
  path: string;
  hasImmer: boolean;
  hasPersist: boolean;
  hasDevtools: boolean;
  stateProperties: string[];
  loadingStates: string[];
  errorStates: string[];
  actions: string[];
  convenienceHooks: string[];
  imports: string[];
}

interface StoreConfig {
  storeName: string;
  description: string;
  stateProperties: Array<{
    name: string;
    type: string;
    description?: string;
    defaultValue?: string;
    optional?: boolean;
  }>;
  loadingStates: Array<{
    name: string;
    defaultValue?: string;
  }>;
  errorStates: Array<{
    name: string;
    defaultValue?: string;
  }>;
  actions: Array<{
    name: string;
    returnType: string;
    parameters: Array<{ name: string; type: string; optional?: boolean }>;
    description?: string;
    isAsync?: boolean;
    // Custom action logic customization
    apiEndpoint?: string; // Custom API endpoint path (e.g., '/api/users')
    httpMethod?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'; // HTTP method
    customLogic?: string; // Custom implementation code (overrides default)
    requestBody?: string; // Custom request body construction code
    responseHandler?: string; // Custom response handling code
    errorHandler?: string; // Custom error handling code
  }>;
  enums?: Array<{
    name: string;
    values: Array<{ key: string; value: string }>;
  }>;
  imports?: string[];
  withPersist?: boolean;
  withDevtools?: boolean;
  persistKeys?: string[];
  convenienceHooks?: Array<{ name: string; selector: string }>;
}

interface StoreGenerationReport {
  analyzedStores: StorePattern[];
  generatedStores: string[];
  updatedStores: string[];
  recommendations: string[];
  errors: string[];
}

export class ZustandStoreGenerator {
  private projectRoot: string;
  private storesDir: string;
  private generatorScript: string;
  private report: StoreGenerationReport;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.storesDir = join(projectRoot, 'src/lib/store');
    this.generatorScript = join(projectRoot, 'scripts/generate-zustand-store.ts');
    
    this.report = {
      analyzedStores: [],
      generatedStores: [],
      updatedStores: [],
      recommendations: [],
      errors: []
    };
  }

  /**
   * Main entry point - analyze stores and generate recommendations
   */
  async analyze(): Promise<StoreGenerationReport> {
    console.log('📦 Analyzing Zustand stores...\n');

    try {
      // Phase 1: Analyze existing stores
      await this.analyzeExistingStores();

      // Phase 2: Identify missing stores based on schema models
      await this.identifyMissingStores();

      // Phase 3: Generate recommendations
      this.generateRecommendations();

      console.log('\n✅ Store analysis completed');
      return this.report;

    } catch (error) {
      console.error('❌ Store analysis failed:', error);
      this.report.errors.push(`Analysis failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Generate a store from configuration
   */
  async generateStore(config: StoreConfig): Promise<string> {
    console.log(`\n🎯 Generating store: ${config.storeName}...`);

    try {
      const fileName = `${config.storeName.charAt(0).toLowerCase() + config.storeName.slice(1)}Store.ts`;
      const filePath = join(this.storesDir, fileName);

      // Generate store content directly
      const content = this.generateStoreContent(config);
      writeFileSync(filePath, content, 'utf-8');

      this.report.generatedStores.push(filePath);
      console.log(`   ✅ Generated: ${filePath}`);
      return filePath;
    } catch (error) {
      const errorMsg = `Failed to generate store ${config.storeName}: ${error instanceof Error ? error.message : String(error)}`;
      console.error(`   ❌ ${errorMsg}`);
      this.report.errors.push(errorMsg);
      throw error;
    }
  }

  /**
   * Generate store content directly
   */
  private generateStoreContent(config: StoreConfig): string {
    const storeName = config.storeName;
    const lowerStoreName = storeName.charAt(0).toLowerCase() + storeName.slice(1);

    // Generate imports
    const imports = [
      "import { create } from 'zustand';",
      "import { immer } from 'zustand/middleware/immer';",
    ];

    if (config.withDevtools) {
      imports.push("import { devtools } from 'zustand/middleware';");
    }

    if (config.withPersist) {
      imports.push("import { persist } from 'zustand/middleware';");
    }

    // Add type imports from config
    if (config.imports && config.imports.length > 0) {
      config.imports.forEach(imp => imports.push(imp));
    } else {
      // Fallback imports if config doesn't provide them
      // Convert store name to type file name (preserve casing for UI components)
      // e.g., "UIComponentStore" -> "uIComponent", "QtechTransactionStore" -> "qtechTransaction"
      let typeFileName = storeName;
      // Remove "Store" suffix if present
      if (typeFileName.endsWith('Store')) {
        typeFileName = typeFileName.slice(0, -5);
      }
      
      // Determine type name (PascalCase)
      let typeName = typeFileName;
      // For UI components starting with UI, keep as is
      if (typeFileName.startsWith('UI')) {
        typeName = typeFileName;
        typeFileName = 'u' + typeFileName.slice(1); // uIComponent
      } else if (typeFileName.startsWith('uI')) {
        typeName = 'UI' + typeFileName.slice(2); // UIComponent
        // typeFileName already correct (uIComponent)
      } else {
        // For others, convert first letter to lowercase for file name
        typeFileName = typeFileName.charAt(0).toLowerCase() + typeFileName.slice(1);
        typeName = storeName.replace('Store', ''); // Keep original for type name
      }
      
      imports.push(`import { ${typeName} } from '@/generated/types/${typeFileName}-types';`);
      imports.push("import { createClient } from '@/lib/db';");
      imports.push("import { getCurrentUser } from '@/lib/auth';");
    }

    // Generate interface
    const interfaceProps = config.stateProperties.map(prop =>
      `  ${prop.name}${prop.optional ? '?' : ''}: ${prop.type};`
    ).join('\n');

    const loadingProps = config.loadingStates.map(state =>
      `    ${state.name}: boolean;`
    ).join('\n');

    const errorProps = config.errorStates.map(state =>
      `    ${state.name}?: string;`
    ).join('\n');

    const actionSignatures = config.actions.map(action => {
      const params = action.parameters.map(p => `${p.name}${p.optional ? '?' : ''}: ${p.type}`).join(', ');
      return `    ${action.name}: (${params}) => ${action.returnType};`;
    }).join('\n');

    // Generate initial state
    const initialStateProps = config.stateProperties.map(prop =>
      `  ${prop.name}: ${prop.defaultValue || 'undefined'},`
    ).join('\n');

    const initialLoadingProps = config.loadingStates.map(state =>
      `    ${state.name}: ${state.defaultValue || 'false'},`
    ).join('\n');

    const initialErrorProps = config.errorStates.map(state =>
      `    ${state.name}: ${state.defaultValue || 'undefined'},`
    ).join('\n');

    // Generate actions
    const actionImplementations = config.actions.map(action => {
      const asyncKeyword = action.isAsync ? 'async ' : '';
      const params = action.parameters.map(p => `${p.name}${p.optional ? '?' : ''}: ${p.type}`).join(', ');

      // Generate basic action implementation
      let implementation = `    ${action.name}: ${asyncKeyword}(${params}) => {\n`;

      if (action.name === 'fetchItems') {
        implementation += this.generateFetchItemsAction(config);
      } else if (action.name === 'addItem') {
        implementation += this.generateCreateItemAction(config);
      } else if (action.name === 'updateItem') {
        implementation += this.generateUpdateItemAction(config);
      } else if (action.name === 'deleteItem') {
        implementation += this.generateDeleteItemAction(config);
      } else if (action.name === 'selectItem') {
        implementation += this.generateSelectItemAction();
      } else if (action.name === 'reset') {
        implementation += this.generateResetAction();
      } else {
        implementation += `      // TODO: Implement ${action.name}\n`;
      }

      implementation += '    }';
      return implementation;
    }).join(',\n');

    // Generate middleware chain
    // Structure: devtools(persist(immer(...), {...}), { name: 'StoreName' })
    let middlewareChain = 'create(';
    let closeChain = ')';

    // Build middleware chain from outside in
    if (config.withDevtools) {
      middlewareChain += 'devtools(';
      closeChain = `, { name: '${storeName}' })${closeChain}`;
    }

    if (config.withPersist) {
      middlewareChain += 'persist(';
      // When both persist and devtools are enabled, persist closes with }), and devtools config follows
      // Structure: persist(immer(...), {...}), { name: 'StoreName' }
      const persistConfig = `, {\n        name: '${lowerStoreName}-store',\n        partialize: (state: ${storeName}State) => ({\n          items: state.items,\n          selectedItemId: state.selectedItemId\n        }),\n      }`;
      if (config.withDevtools) {
        // If devtools is enabled, persist closes with }), then devtools config follows
        // Structure: persist(immer(...), {...}), { name: 'StoreName' }
        closeChain = `${persistConfig}\n    )${closeChain}`;
      } else {
        // If no devtools, persist just closes with })
        closeChain = `${persistConfig})${closeChain}`;
      }
    }

    middlewareChain += 'immer((set, get) => ({';
    closeChain = `}))${closeChain}`;

    // Generate convenience hooks
    const convenienceHooks = [
      `// Convenience hooks`,
      `export const use${storeName}Actions = () =>`,
      `  use${storeName}Store((state) => state.actions);`,
      `export const use${storeName}Loading = () =>`,
      `  use${storeName}Store((state) => state.loading);`,
      `export const use${storeName}Errors = () =>`,
      `  use${storeName}Store((state) => state.errors);`,
    ].join('\n');

    return `${imports.join('\n')}

/**
 * ${config.description}
 */

export interface ${storeName}State {
  // State properties
${interfaceProps}

  // Loading states
  loading: {
${loadingProps}
  };

  // Error states
  errors: {
${errorProps}
  };

  // Actions
  actions: {
${actionSignatures}
  };
}

const initialState: Omit<${storeName}State, 'actions'> = {
${initialStateProps}
  loading: {
${initialLoadingProps}
  },
  errors: {
${initialErrorProps}
  },
};

export const use${storeName}Store = create<${storeName}State>()(
  ${middlewareChain}
    ...initialState,

    actions: {
${actionImplementations}
    }
  ${closeChain}
);

${convenienceHooks}
`;
  }

  private generateFetchItemsAction(config: StoreConfig): string {
    const modelName = config.storeName;
    const lowerModelName = modelName.charAt(0).toLowerCase() + modelName.slice(1);

    return `      set((state) => {
        state.loading.fetchItems = true;
        delete state.errors.fetchItems;
      });

      try {
        const response = await fetch('/api/${lowerModelName}', {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(\`Failed to fetch ${lowerModelName}: HTTP \${response.status}\`);
        }

        const result = await response.json();
        const items = result.success ? result.data : result;

        set((state) => {
          state.items = Array.isArray(items) ? items : [];
          state.loading.fetchItems = false;
        });
      } catch (error: any) {
        set((state) => {
          state.errors.fetchItems = error.message || 'fetchItems failed';
          state.loading.fetchItems = false;
        });
      }`;
  }

  private generateCreateItemAction(config: StoreConfig): string {
    const modelName = config.storeName;
    const lowerModelName = modelName.charAt(0).toLowerCase() + modelName.slice(1);

    return `      set((state) => {
        state.loading.saveItem = true;
        delete state.errors.saveItem;
      });

      try {
        const response = await fetch('/api/${lowerModelName}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(item),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || \`Failed to create ${lowerModelName}: HTTP \${response.status}\`);
        }

        const newItem = await response.json();

        set((state) => {
          state.items.push(newItem);
          state.loading.saveItem = false;
        });
      } catch (error: any) {
        set((state) => {
          state.errors.saveItem = error.message || 'Failed to create item';
          state.loading.saveItem = false;
        });
      }`;
  }

  private generateUpdateItemAction(config: StoreConfig): string {
    const modelName = config.storeName;
    const lowerModelName = modelName.charAt(0).toLowerCase() + modelName.slice(1);

    return `      set((state) => {
        state.loading.saveItem = true;
        delete state.errors.saveItem;
      });

      try {
        const response = await fetch(\`/api/${lowerModelName}/\${id}\`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || \`Failed to update ${lowerModelName}: HTTP \${response.status}\`);
        }

        const updatedItem = await response.json();

        set((state) => {
          const index = state.items.findIndex((item) => item.id === id);
          if (index !== -1) {
            state.items[index] = updatedItem;
          }
          state.loading.saveItem = false;
        });
      } catch (error: any) {
        set((state) => {
          state.errors.saveItem = error.message || 'Failed to update item';
          state.loading.saveItem = false;
        });
      }`;
  }

  private generateDeleteItemAction(config: StoreConfig): string {
    const modelName = config.storeName;
    const lowerModelName = modelName.charAt(0).toLowerCase() + modelName.slice(1);

    return `      set((state) => {
        state.loading.deleteItem = true;
        delete state.errors.deleteItem;
      });

      try {
        const response = await fetch(\`/api/${lowerModelName}/\${id}\`, {
          method: 'DELETE',
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || \`Failed to delete ${lowerModelName}: HTTP \${response.status}\`);
        }

        set((state) => {
          state.items = state.items.filter((item) => item.id !== id);
          if (state.selectedItemId === id) {
            state.selectedItemId = null;
          }
          state.loading.deleteItem = false;
        });
      } catch (error: any) {
        set((state) => {
          state.errors.deleteItem = error.message || 'deleteItem failed';
          state.loading.deleteItem = false;
        });
      }`;
  }

  private generateSelectItemAction(): string {
    return `      set((state) => {
        state.selectedItemId = itemId;
      })`;
  }

  private generateResetAction(): string {
    return `      set((state) => {
        Object.assign(state, initialState);
      })`;
  }

  /**
   * Generate stores for schema models that don't have stores
   */
  async generateStoresForModels(models: Array<{ name: string; fields: string[] }>): Promise<void> {
    console.log('\n🎯 Generating stores for schema models...');

    for (const model of models) {
      const fullStoreName = `${model.name}Store`;
      const storeFileName = `${model.name.charAt(0).toLowerCase() + model.name.slice(1)}Store.ts`;
      const storePath = join(this.storesDir, storeFileName);

      // Skip if store already exists
      if (existsSync(storePath)) {
        console.log(`   ⏭️  Skipping ${fullStoreName} (already exists)`);
        continue;
      }

      // Generate basic store config
      const modelName = model.name;
      const config: StoreConfig = {
        storeName: modelName,
        description: `${modelName} state management store`,
        stateProperties: [
          {
            name: 'items',
            type: `Array<${modelName}>`,
            description: `List of ${modelName.toLowerCase()} items`,
            defaultValue: '[]',
            optional: false
          },
          {
            name: 'selectedItemId',
            type: 'string | null',
            description: 'Currently selected item ID',
            defaultValue: 'null',
            optional: false
          }
        ],
        loadingStates: [
          { name: 'fetchItems', defaultValue: 'false' },
          { name: 'saveItem', defaultValue: 'false' },
          { name: 'deleteItem', defaultValue: 'false' }
        ],
        errorStates: [
          { name: 'fetchItems', defaultValue: '' },
          { name: 'saveItem', defaultValue: '' },
          { name: 'deleteItem', defaultValue: '' }
        ],
        actions: [
          {
            name: 'fetchItems',
            returnType: 'Promise<void>',
            description: `Fetch ${modelName.toLowerCase()} items from API`,
            isAsync: true,
            parameters: [],
            apiEndpoint: `\`/api/${modelName.charAt(0).toLowerCase() + modelName.slice(1)}\``,
            httpMethod: 'GET'
          },
          {
            name: 'addItem',
            returnType: 'Promise<void>',
            description: `Add a new ${modelName.toLowerCase()} item`,
            isAsync: true,
            parameters: [
              {
                name: 'item',
                type: `Partial<${modelName}>`,
                optional: false
              }
            ],
            apiEndpoint: `\`/api/${modelName.charAt(0).toLowerCase() + modelName.slice(1)}\``,
            httpMethod: 'POST',
            requestBody: 'JSON.stringify(item)'
          },
          {
            name: 'updateItem',
            returnType: 'Promise<void>',
            description: `Update an existing ${modelName.toLowerCase()} item`,
            isAsync: true,
            parameters: [
              {
                name: 'id',
                type: 'string',
                optional: false
              },
              {
                name: 'updates',
                type: `Partial<${modelName}>`,
                optional: false
              }
            ],
            apiEndpoint: `\`/api/${modelName.charAt(0).toLowerCase() + modelName.slice(1)}/\${id}\``,
            httpMethod: 'PATCH',
            requestBody: 'JSON.stringify(updates)'
          },
          {
            name: 'deleteItem',
            returnType: 'Promise<void>',
            description: `Delete a ${modelName.toLowerCase()} item`,
            isAsync: true,
            parameters: [
              {
                name: 'id',
                type: 'string',
                optional: false
              }
            ],
            apiEndpoint: `\`/api/${modelName.charAt(0).toLowerCase() + modelName.slice(1)}/\${id}\``,
            httpMethod: 'DELETE'
          },
          {
            name: 'selectItem',
            returnType: 'void',
            description: 'Select an item by ID',
            isAsync: false,
            parameters: [
              {
                name: 'itemId',
                type: 'string | null',
                optional: false
              }
            ]
          },
          {
            name: 'reset',
            returnType: 'void',
            description: 'Reset store to initial state',
            isAsync: false,
            parameters: []
          }
        ],
        withPersist: true,
        withDevtools: true,
        persistKeys: ['items', 'selectedItemId'],
        imports: [
          `import type { ${modelName} } from '@/generated/types/${modelName.charAt(0).toLowerCase() + modelName.slice(1)}-types';`
        ]
      };

      try {
        await this.generateStore(config);
      } catch (error) {
        console.error(`   ❌ Failed to generate store for ${fullStoreName}:`, error);
      }
    }
  }

  /**
   * Analyze existing Zustand stores to extract patterns
   */
  private async analyzeExistingStores(): Promise<void> {
    if (!existsSync(this.storesDir)) {
      console.log(`   ⚠️  Stores directory not found: ${this.storesDir}`);
      return;
    }

    const storeFiles = readdirSync(this.storesDir)
      .filter(file => file.endsWith('.ts') && file.includes('Store'))
      .map(file => join(this.storesDir, file));

    console.log(`   Found ${storeFiles.length} store files`);

    for (const storeFile of storeFiles) {
      try {
        const content = readFileSync(storeFile, 'utf-8');
        const pattern = this.extractStorePattern(storeFile, content);
        this.report.analyzedStores.push(pattern);
      } catch (error) {
        console.error(`   ⚠️  Failed to analyze ${storeFile}:`, error);
      }
    }

    console.log(`   ✅ Analyzed ${this.report.analyzedStores.length} stores`);
  }

  /**
   * Extract patterns from a store file
   */
  private extractStorePattern(filePath: string, content: string): StorePattern {
    const name = basename(filePath, extname(filePath));
    
    // Extract middleware usage
    const hasImmer = content.includes('immer') || content.includes('zustand/middleware/immer');
    const hasPersist = content.includes('persist') || (content.includes('zustand/middleware') && content.includes('persist'));
    const hasDevtools = content.includes('devtools') || (content.includes('zustand/middleware') && content.includes('devtools'));

    // Extract state properties (look for interface definitions)
    const stateProperties: string[] = [];
    const stateInterfaceMatch = content.match(/interface\s+(\w+State)\s*\{([^}]+)\}/s);
    if (stateInterfaceMatch) {
      const interfaceContent = stateInterfaceMatch[2];
      const propertyMatches = interfaceContent.matchAll(/(\w+)\s*:\s*([^;]+);/g);
      for (const match of propertyMatches) {
        if (!match[1].includes('loading') && !match[1].includes('error') && !match[1].includes('action')) {
          stateProperties.push(match[1]);
        }
      }
    }

    // Extract loading states
    const loadingStates: string[] = [];
    const loadingMatch = content.match(/loading:\s*\{([^}]+)\}/s);
    if (loadingMatch) {
      const loadingContent = loadingMatch[1];
      const loadingMatches = loadingContent.matchAll(/(\w+)\s*:\s*boolean/g);
      for (const match of loadingMatches) {
        loadingStates.push(match[1]);
      }
    }

    // Extract error states
    const errorStates: string[] = [];
    const errorMatch = content.match(/errors:\s*\{([^}]+)\}/s);
    if (errorMatch) {
      const errorContent = errorMatch[1];
      const errorMatches = errorContent.matchAll(/(\w+)\??\s*:\s*string/g);
      for (const match of errorMatches) {
        errorStates.push(match[1]);
      }
    }

    // Extract actions
    const actions: string[] = [];
    const actionsMatch = content.match(/actions:\s*\{([^}]+)\}/s);
    if (actionsMatch) {
      const actionsContent = actionsMatch[1];
      const actionMatches = actionsContent.matchAll(/(\w+)\s*:\s*\([^)]*\)\s*=>/g);
      for (const match of actionMatches) {
        actions.push(match[1]);
      }
    }

    // Extract convenience hooks
    const convenienceHooks: string[] = [];
    const hookMatches = content.matchAll(/export\s+const\s+(use\w+)\s*=/g);
    for (const match of hookMatches) {
      if (match[1] !== `use${name}Store`) {
        convenienceHooks.push(match[1]);
      }
    }

    // Extract imports
    const imports: string[] = [];
    const importMatches = content.matchAll(/^import\s+.*$/gm);
    for (const match of importMatches) {
      imports.push(match[0]);
    }

    return {
      name,
      path: filePath,
      hasImmer,
      hasPersist,
      hasDevtools,
      stateProperties,
      loadingStates,
      errorStates,
      actions,
      convenienceHooks,
      imports
    };
  }

  /**
   * Identify missing stores based on schema models
   */
  private async identifyMissingStores(): Promise<void> {
    // Try to find schema file
    const schemaPaths = [
      join(this.projectRoot, 'schema.zmodel'),
      join(this.projectRoot, 'zenstack/schema.zmodel'),
      join(this.projectRoot, 'prisma/schema.zmodel')
    ];

    let schemaPath: string | null = null;
    for (const path of schemaPaths) {
      if (existsSync(path)) {
        schemaPath = path;
        break;
      }
    }

    if (!schemaPath) {
      console.log('   ⚠️  Schema file not found, skipping model-based store generation');
      return;
    }

    try {
      const schemaContent = readFileSync(schemaPath, 'utf-8');
      const modelMatches = schemaContent.matchAll(/model\s+(\w+)\s*\{/g);
      const models: string[] = [];
      
      for (const match of modelMatches) {
        models.push(match[1]);
      }

      console.log(`   Found ${models.length} models in schema`);

      // Check which models don't have stores
      const existingStoreNames = this.report.analyzedStores.map(s => 
        s.name.replace('Store', '').toLowerCase()
      );

      for (const modelName of models) {
        const modelNameLower = modelName.toLowerCase();
        const hasStore = existingStoreNames.some(name => 
          name === modelNameLower || name === `${modelNameLower}store`
        );

        if (!hasStore) {
          // Skip system models
          const systemModels = ['Token', 'Session', 'OAuth', 'Verification', 'Config', 'Account', 'Settings'];
          if (!systemModels.some(sys => modelName.includes(sys))) {
            this.report.recommendations.push(
              `Generate store for model: ${modelName} (${modelName}Store)`
            );
          }
        }
      }
    } catch (error) {
      console.error('   ⚠️  Failed to analyze schema:', error);
    }
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(): void {
    // Analyze patterns and suggest improvements
    const storesWithoutImmer = this.report.analyzedStores.filter(s => !s.hasImmer);
    if (storesWithoutImmer.length > 0) {
      this.report.recommendations.push(
        `${storesWithoutImmer.length} stores missing immer middleware (recommended for immutable updates)`
      );
    }

    const storesWithoutDevtools = this.report.analyzedStores.filter(s => !s.hasDevtools);
    if (storesWithoutDevtools.length > 0) {
      this.report.recommendations.push(
        `${storesWithoutDevtools.length} stores missing devtools middleware (recommended for debugging)`
      );
    }

    // Check for stores with missing error handling
    const storesWithoutErrorStates = this.report.analyzedStores.filter(s => s.errorStates.length === 0);
    if (storesWithoutErrorStates.length > 0) {
      this.report.recommendations.push(
        `${storesWithoutErrorStates.length} stores missing error states (recommended for better UX)`
      );
    }
  }

  /**
   * Get analysis report
   */
  getReport(): StoreGenerationReport {
    return this.report;
  }
}

/**
 * Plugin instance for integration
 */
export const zustandStoreGenerator = new ZustandStoreGenerator();

/**
 * Standalone function for plugin integration
 */
export async function generateZustandStores(options: {
  models?: Array<{ name: string; fields: string[] }>;
  configs?: StoreConfig[];
} = {}): Promise<StoreGenerationReport> {
  const generator = new ZustandStoreGenerator();
  
  // Analyze existing stores
  await generator.analyze();

  // Generate stores for models if provided
  if (options.models && options.models.length > 0) {
    await generator.generateStoresForModels(options.models);
  }

  // Generate stores from configs if provided
  if (options.configs && options.configs.length > 0) {
    for (const config of options.configs) {
      try {
        await generator.generateStore(config);
      } catch (error) {
        console.error(`Failed to generate store from config:`, error);
      }
    }
  }

  return generator.getReport();
}
