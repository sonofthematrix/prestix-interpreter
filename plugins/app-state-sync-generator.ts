import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { basename, extname, join } from 'path';
import { hasStripePaymentFields } from './config/entity-generation-config';

/**
 * Application State Synchronization Generator
 * 
 * Analyzes the current state of the application and synchronizes auto-generation
 * templates to match actual implementation patterns.
 * 
 * Usage: bun run sync:app-state
 * Or trigger with: /sync in Cursor chat
 */

interface RoutePattern {
  path: string;
  methods: string[];
  authRequired: boolean;
  userContext: boolean;
  patterns: {
    errorHandling: string[];
    validation: string[];
    responseFormat: string;
  };
}

interface ComponentPattern {
  name: string;
  path: string;
  props: string[];
  hooks: string[];
  apiCalls: string[];
  styling: {
    framework: string;
    darkMode: boolean;
    responsive: boolean;
  };
}

interface ModelPattern {
  name: string;
  fields: string[];
  relations: string[];
  operations: string[];
  apiRoutes: string[];
  components: string[];
  /** True when model has paymentIntentId, stripePaymentId, or stripeChargeId (Stripe payment flow) */
  stripePaymentEnabled?: boolean;
}

interface ServicePattern {
  path: string;
  className: string;
  hasAuthUser: boolean;
  hasCreateClient: boolean;
  hasUserContext: boolean;
  hasSystemDb: boolean;
  hasPrismaDirect: boolean;
  missingUserContext: number;
  recommendations: string[];
}

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
}

interface SyncReport {
  timestamp: string;
  routes: RoutePattern[];
  components: ComponentPattern[];
  models: ModelPattern[];
  services: ServicePattern[];
  stores?: StorePattern[];
  templatesUpdated: string[];
  generationNeeded: string[];
  documentation?: {
    consolidated: number;
    cleaned: number;
    synced: number;
    skipped: number;
    needsRegeneration: string[];
    errors: string[];
  };
  warnings: string[];
}

export class AppStateSyncGenerator {
  private projectRoot: string;
  private apiRoutesDir: string;
  private componentsDir: string;
  private schemaPath: string;
  private templatesDir: string;
  private storesDir: string;
  private zustandGenerator: any;
  private report: SyncReport;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.apiRoutesDir = join(projectRoot, 'src/app/api');
    this.componentsDir = join(projectRoot, 'src/components');
    // Try multiple possible schema locations
    this.schemaPath = this.findSchemaFile(projectRoot);
    this.templatesDir = join(projectRoot, 'plugins/templates');
    this.storesDir = join(projectRoot, 'src/lib/store');
    
    this.report = {
      timestamp: new Date().toISOString(),
      routes: [],
      components: [],
      models: [],
      services: [],
      stores: [],
      templatesUpdated: [],
      generationNeeded: [],
      warnings: []
    };
  }

  /**
   * Main synchronization entry point
   * @param options - Synchronization options
   * @param options.skipDatabaseSync - Skip database synchronization (relational sync) to speed up execution
   */
  async sync(options: { skipDatabaseSync?: boolean } = {}): Promise<SyncReport> {
    console.log('🔄 Starting Application State Synchronization...\n');

    try {
      // Phase 1: Analyze current state
      console.log('📊 Phase 1: Analyzing current application state...');
      await this.analyzeRoutes();
      await this.analyzeComponents();
      await this.analyzeAllServices();
      await this.analyzeSchema();
      
      // Phase 2: Compare with templates
      console.log('\n🔍 Phase 2: Comparing with generation templates...');
      await this.compareWithTemplates();
      
      // Phase 3: Update templates
      console.log('\n✏️  Phase 3: Updating generation templates...');
      await this.updateTemplates();
      
      // Phase 4: Identify missing components/routes
      console.log('\n🎯 Phase 4: Identifying missing components and routes...');
      await this.identifyMissingGeneration();
      
      // Phase 5: Ensure admin pages have proper layouts
      console.log('\n🔧 Phase 5: Ensuring admin pages have proper layouts...');
      await this.ensureAdminPagesLayout();
      
      // Phase 6: Synchronize documentation
      console.log('\n📚 Phase 6: Synchronizing documentation...');
      await this.syncDocumentation(options.skipDatabaseSync);
      
      // Phase 7: Check QTech proxy compliance
      console.log('\n🔍 Phase 7: Checking QTech proxy compliance...');
      await this.checkQTechProxyCompliance();
      
      // Phase 8: Analyze Zustand stores
      console.log('\n📦 Phase 8: Analyzing Zustand stores...');
      await this.analyzeZustandStores();
      
      // Phase 9: Generate sync report
      console.log('\n📝 Phase 9: Generating synchronization report...');
      this.generateReport();
      
      console.log('\n✅ Synchronization completed successfully!');
      return this.report;
      
    } catch (error) {
      console.error('❌ Synchronization failed:', error);
      throw error;
    }
  }

  /**
   * Analyze all API routes and extract patterns
   * Includes both src/app/api and src/generated/api directories
   */
  private async analyzeRoutes(): Promise<void> {
    if (!existsSync(this.apiRoutesDir)) {
      this.report.warnings.push(`API routes directory not found: ${this.apiRoutesDir}`);
      return;
    }

    // Analyze routes in src/app/api
    const routes = this.findRoutes(this.apiRoutesDir);
    console.log(`   Found ${routes.length} API route files in src/app/api`);

    // Also analyze route files in src/generated/api (if they export GET/POST)
    const generatedApiDir = join(this.projectRoot, 'src/generated/api');
    if (existsSync(generatedApiDir)) {
      // Find all .ts files in generated/api that export route handlers
      const generatedFiles = readdirSync(generatedApiDir, { withFileTypes: true })
        .filter(entry => entry.isFile() && entry.name.endsWith('.ts') && !entry.name.includes('-api.ts'))
        .map(entry => join(generatedApiDir, entry.name))
        .filter(file => {
          try {
            const content = readFileSync(file, 'utf-8');
            // Only include files that export route handlers (GET/POST)
            return content.includes('export async function GET') || 
                   content.includes('export async function POST');
          } catch {
            return false;
          }
        });
      console.log(`   Found ${generatedFiles.length} route files in src/generated/api`);
      routes.push(...generatedFiles);
    }

    console.log(`   Total: ${routes.length} API route files`);

    for (const routeFile of routes) {
      try {
        const content = readFileSync(routeFile, 'utf-8');
        const routePath = this.extractRoutePath(routeFile);
        
        const pattern: RoutePattern = {
          path: routePath,
          methods: this.extractHttpMethods(content),
          authRequired: this.detectAuthRequirement(content),
          userContext: this.detectUserContext(content),
          patterns: {
            errorHandling: this.extractErrorHandlingPatterns(content),
            validation: this.extractValidationPatterns(content),
            responseFormat: this.extractResponseFormat(content)
          }
        };

        this.report.routes.push(pattern);

        // Check for non-compliant patterns and add warnings
        if (content.includes('const db = createClient();') || 
            content.includes('const db = createClient()')) {
          // Skip warnings for auto-generated custom routes
          const isAutoGenerated = content.includes('Auto-generated by CustomRouteGenerator') ||
                                  content.includes('Auto-generated by CompleteEntityGenerator') ||
                                  content.includes('Auto-generated by EnhancedProductionGenerator');
          
          // Skip warnings for routes that don't use database
          const usesDatabase = content.includes('db.') || 
                              content.includes('createClient') ||
                              content.includes('PrismaClient');
          
          if (!isAutoGenerated && usesDatabase) {
            this.report.warnings.push(
              `Route ${routePath}: Uses global db client without user context - should use createClient(user)`
            );
          }
        }

        if (pattern.userContext === false && this.isRouteFile(content)) {
          // Skip warnings for auto-generated custom routes
          const isAutoGenerated = content.includes('Auto-generated by CustomRouteGenerator') ||
                                  content.includes('Auto-generated by CompleteEntityGenerator') ||
                                  content.includes('Auto-generated by EnhancedProductionGenerator');
          
          // Skip warnings for routes that don't actually call createClient
          const actuallyUsesCreateClient = content.includes('createClient(') && 
                                         !content.includes('// import') &&
                                         !content.includes('// import {');
          
          // Skip warnings for routes that use Drizzle ORM directly (not ZenStack)
          const usesDrizzleDirectly = content.includes("from '@/lib/drizzle'") ||
                                     content.includes("from '@/lib/drizzle-schema'");
          
          // Skip warnings for custom endpoints (like assettransfers - blockchain-specific)
          const isCustomEndpoint = content.includes('Custom Endpoint') ||
                                  content.includes('DO NOT AUTO-GENERATE') ||
                                  routePath.includes('/assettransfers');
          
          if (!isAutoGenerated && actuallyUsesCreateClient && !usesDrizzleDirectly && !isCustomEndpoint) {
            this.report.warnings.push(
              `Route ${routePath}: Missing user context in createClient() calls`
            );
          }
        }
      } catch (error) {
        this.report.warnings.push(`Failed to analyze route ${routeFile}: ${error}`);
      }
    }
  }

  /**
   * Helper to check if content is a route file
   */
  private isRouteFile(content: string): boolean {
    return content.includes('export async function GET') || 
           content.includes('export async function POST');
  }

  /**
   * Analyze all components and extract patterns
   */
  private async analyzeComponents(): Promise<void> {
    if (!existsSync(this.componentsDir)) {
      this.report.warnings.push(`Components directory not found: ${this.componentsDir}`);
      return;
    }

    const components = this.findComponents(this.componentsDir);
    console.log(`   Found ${components.length} component files`);

    for (const componentFile of components) {
      try {
        const content = readFileSync(componentFile, 'utf-8');
        const componentName = this.extractComponentName(componentFile);
        
        const pattern: ComponentPattern = {
          name: componentName,
          path: componentFile.replace(this.projectRoot, ''),
          props: this.extractProps(content),
          hooks: this.extractHooks(content),
          apiCalls: this.extractApiCalls(content),
          styling: {
            framework: this.detectStylingFramework(content),
            darkMode: this.detectDarkMode(content),
            responsive: this.detectResponsive(content)
          }
        };

        this.report.components.push(pattern);
      } catch (error) {
        this.report.warnings.push(`Failed to analyze component ${componentFile}: ${error}`);
      }
    }
  }

  /**
   * Analyze schema.zmodel and extract model patterns
   */
  private async analyzeSchema(): Promise<void> {
    if (!existsSync(this.schemaPath)) {
      this.report.warnings.push(`Schema file not found: ${this.schemaPath}`);
      return;
    }

    try {
      const content = readFileSync(this.schemaPath, 'utf-8');
      const models = this.extractModels(content);
      console.log(`   Found ${models.length} models in schema`);

      for (const model of models) {
        const pattern: ModelPattern = {
          name: model.name,
          fields: model.fields,
          relations: model.relations,
          operations: [],
          apiRoutes: [],
          components: [],
          stripePaymentEnabled: hasStripePaymentFields(model.fields),
        };

        // Check if API routes exist for this model
        pattern.apiRoutes = this.findModelApiRoutes(model.name);
        
        // Check if components exist for this model
        pattern.components = this.findModelComponents(model.name);
        
        // Determine operations based on existing routes
        pattern.operations = this.determineOperations(pattern.apiRoutes);

        this.report.models.push(pattern);
      }
    } catch (error) {
      this.report.warnings.push(`Failed to analyze schema: ${error}`);
    }
  }

  /**
   * Compare current state with generation templates
   */
  private async compareWithTemplates(): Promise<void> {
    const templateFiles = this.findTemplateFiles();
    console.log(`   Found ${templateFiles.length} template files`);

    for (const templateFile of templateFiles) {
      try {
        const template = readFileSync(templateFile, 'utf-8');
        const updates = this.detectTemplateUpdates(templateFile, template);
        
        if (updates.length > 0) {
          this.report.templatesUpdated.push(templateFile);
        }
      } catch (error) {
        this.report.warnings.push(`Failed to compare template ${templateFile}: ${error}`);
      }
    }
  }

  /**
   * Update generation templates based on current patterns
   */
  private async updateTemplates(): Promise<void> {
    // Update route template with most common patterns
    const commonRoutePatterns = this.extractCommonRoutePatterns();
    await this.updateRouteTemplate(commonRoutePatterns);

    // Update component template with most common patterns
    const commonComponentPatterns = this.extractCommonComponentPatterns();
    await this.updateComponentTemplate(commonComponentPatterns);

    // Update sidebar template from actual sidebar component
    await this.updateSidebarTemplate();

    // Update hook template from actual hook implementation
    await this.updateHookTemplate();

    // Update form template from actual form component
    await this.updateFormTemplate();

    // Update admin table template from actual admin table component
    await this.updateAdminTableTemplate();

    // Update admin page template from actual admin page component
    await this.updateAdminPageTemplate();

    // Update API client template from actual API client implementation
    await this.updateApiClientTemplate();

    // Update QTech service template from actual QTech service implementations
    await this.updateQTechServiceTemplate();

    // Update QTech webhook route template from actual QTech webhook routes
    await this.updateQTechWebhookRouteTemplate();

    // Update HeaderWagmiDependent template from actual component
    await this.updateHeaderWagmiDependentTemplate();

    // Update AppHeader template from actual component (PRESTIX.VIP logo / PrestixLogo)
    await this.updateAppHeaderTemplate();

    // Update model configuration
    await this.updateModelConfigurations();
  }

  /**
   * Identify what needs to be generated
   */
  private async identifyMissingGeneration(): Promise<void> {
    for (const model of this.report.models) {
      const modelNameLower = model.name.toLowerCase();
      
      // Check if API routes exist for this model
      const modelRoutes = this.report.routes.filter(route => {
        const routePath = route.path.toLowerCase();
        // Check if route path contains model name (accounting for pluralization and different formats)
        return routePath.includes(modelNameLower) || 
               routePath.includes(modelNameLower + 's') ||
               routePath.includes('/' + modelNameLower + '/') ||
               routePath.includes('/' + modelNameLower + 's/');
      });

      // Get methods that exist for this model
      const existingMethods = new Set<string>();
      modelRoutes.forEach(route => {
        route.methods.forEach(method => existingMethods.add(method));
      });

      // Only flag as missing if NO routes exist for this model at all
      // Or if it's a critical model that should have CRUD operations
      const criticalModels = ['User', 'Product', 'Order', 'Investment', 'RealEstateAsset', 'Portfolio'];
      const isCritical = criticalModels.includes(model.name);
      
      // Skip if model has any routes OR if it's a system/internal model
      const isSystemModel = model.name.includes('Token') || 
                          model.name.includes('Session') || 
                          model.name.includes('OAuth') ||
                          model.name.includes('Verification') ||
                          model.name.includes('Config') ||
                          model.name === 'Account' || // Already exists
                          model.name === 'Settings';

      if (isSystemModel) {
        continue; // Skip system models
      }

      if (modelRoutes.length === 0) {
        // No routes found at all - this definitely needs generation
        if (isCritical) {
          this.report.generationNeeded.push(
            `API routes for ${model.name}: GET, POST, PATCH, DELETE (CRITICAL - none found)`
          );
        } else {
          this.report.generationNeeded.push(
            `API routes for ${model.name}: GET, POST (no routes found)`
          );
        }
      } else if (isCritical && existingMethods.size < 3) {
        // Critical model exists but missing some operations
        const missingMethods = ['GET', 'POST', 'PATCH', 'DELETE'].filter(
          m => !existingMethods.has(m)
        );
        if (missingMethods.length > 0) {
          this.report.generationNeeded.push(
            `API routes for ${model.name}: ${missingMethods.join(', ')} (partial CRUD exists)`
          );
        }
      }

      // Check for components only for critical/user-facing models
      if (isCritical || model.name.includes('User') || model.name.includes('Product') || 
          model.name.includes('Order') || model.name.includes('Investment')) {
        const formComponent = this.report.components.find(
          c => {
            const compName = c.name.toLowerCase();
            return (compName.includes(modelNameLower) || compName.includes(modelNameLower + 's')) && 
                   (compName.includes('form') || compName.includes('create') || compName.includes('edit'));
          }
        );

        if (!formComponent) {
          this.report.generationNeeded.push(`Form component for ${model.name}`);
        }

        const tableComponent = this.report.components.find(
          c => {
            const compName = c.name.toLowerCase();
            return (compName.includes(modelNameLower) || compName.includes(modelNameLower + 's')) && 
                   (compName.includes('table') || compName.includes('list') || compName.includes('grid'));
          }
        );

        if (!tableComponent) {
          this.report.generationNeeded.push(`Table/List component for ${model.name}`);
        }
      }
    }
  }

  /**
   * Generate synchronization report
   */
  private generateReport(): void {
    const reportPath = join(this.projectRoot, 'sync-report.json');
    writeFileSync(reportPath, JSON.stringify(this.report, null, 2));
    console.log(`   Report saved to: ${reportPath}`);

    // Print summary
    console.log('\n📊 Synchronization Summary:');
    console.log(`   Routes analyzed: ${this.report.routes.length}`);
    console.log(`   Components analyzed: ${this.report.components.length}`);
    console.log(`   Services analyzed: ${this.report.services.length}`);
    console.log(`   Models analyzed: ${this.report.models.length}`);
    console.log(`   Stores analyzed: ${this.report.stores?.length || 0}`);
    console.log(`   Templates updated: ${this.report.templatesUpdated.length}`);
    console.log(`   Generation needed: ${this.report.generationNeeded.length}`);
    console.log(`   Warnings: ${this.report.warnings.length}`);

    // Print service compliance summary
    if (this.report.services.length > 0) {
      const compliantServices = this.report.services.filter(s => !s.hasPrismaDirect && s.missingUserContext === 0);
      const nonCompliantServices = this.report.services.filter(s => s.hasPrismaDirect || s.missingUserContext > 0);
      console.log(`\n📦 Service Analysis:`);
      console.log(`   ✅ Compliant: ${compliantServices.length}`);
      console.log(`   ⚠️  Needs attention: ${nonCompliantServices.length}`);
      if (nonCompliantServices.length > 0) {
        nonCompliantServices.slice(0, 5).forEach(s => {
          console.log(`      - ${s.path}: ${s.recommendations.length} recommendation(s)`);
        });
        if (nonCompliantServices.length > 5) {
          console.log(`      ... and ${nonCompliantServices.length - 5} more (see sync-report.json)`);
        }
      }
    }

    // Stripe payment entities summary (detected from schema: paymentIntentId, stripePaymentId, stripeChargeId)
    const stripeModels = this.report.models.filter((m) => m.stripePaymentEnabled);
    if (stripeModels.length > 0) {
      console.log('\n💳 Stripe Payment Entities (schema-detected):');
      stripeModels.forEach((m) => {
        console.log(`   - ${m.name} (use /api/payment/create-intent for paid creation)`);
      });
      console.log('   Add to plugins/config/entity-generation-config.ts STRIPE_PAYMENT_ENTITIES for auto-gen Stripe notices.');
    }

    if (this.report.generationNeeded.length > 0) {
      console.log('\n🎯 Recommended Generation:');
      this.report.generationNeeded.forEach((item) => {
        console.log(`   - ${item}`);
      });
    }

    if (this.report.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.report.warnings.forEach(warning => {
        console.log(`   - ${warning}`);
      });
    }
  }

  // Helper methods

  private findSchemaFile(projectRoot: string): string {
    // Try common schema locations
    const possiblePaths = [
      join(projectRoot, 'schema.zmodel'),
      join(projectRoot, 'zenstack/schema.zmodel'),
      join(projectRoot, 'prisma/schema.zmodel'),
    ];

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        return path;
      }
    }

    // Return first path as default (will generate warning)
    return possiblePaths[0];
  }

  private findRoutes(dir: string, routes: string[] = []): string[] {
    if (!existsSync(dir)) return routes;

    const entries = readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        this.findRoutes(fullPath, routes);
      } else if (entry.isFile() && (entry.name === 'route.ts' || entry.name === 'route.tsx')) {
        routes.push(fullPath);
      }
    }
    
    return routes;
  }

  private findComponents(dir: string, components: string[] = []): string[] {
    if (!existsSync(dir)) return components;

    const entries = readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        this.findComponents(fullPath, components);
      } else if (entry.isFile() && (extname(entry.name) === '.tsx' || extname(entry.name) === '.ts')) {
        components.push(fullPath);
      }
    }
    
    return components;
  }

  private extractRoutePath(filePath: string): string {
    const parts = filePath.split('/api/')[1]?.split('/route.ts')[0] || '';
    return `/${parts}`;
  }

  private extractHttpMethods(content: string): string[] {
    const methods: string[] = [];
    if (content.includes('export async function GET')) methods.push('GET');
    if (content.includes('export async function POST')) methods.push('POST');
    if (content.includes('export async function PATCH')) methods.push('PATCH');
    if (content.includes('export async function PUT')) methods.push('PUT');
    if (content.includes('export async function DELETE')) methods.push('DELETE');
    return methods;
  }

  private detectAuthRequirement(content: string): boolean {
    return content.includes('getCurrentUser') || 
           content.includes('getServerSession') ||
           content.includes('Unauthorized');
  }

  private detectUserContext(content: string): boolean {
    return content.includes('createClient(user)') || 
           content.includes('createClient(authUser)') ||
           content.includes('createClient(effectiveUser)') ||
           content.includes('createClient(session.user)') ||
           content.includes('createWebhookClient') ||
           content.includes('createClient(sessionGet') ||
           content.includes('createClient(sessionPost') ||
           content.includes('createClient(currentUser') ||
           content.includes('createClient(user as unknown') ||
           content.includes('createClient(authUser as unknown') ||
           content.includes('createClient(effectiveUser as unknown') ||
           content.includes('createClient(currentUser as unknown') ||
           content.includes('createClient(sessionPost as unknown') ||
           content.includes('createClient(sessionGet as unknown') ||
           content.includes('createClient(systemUser') ||
           content.includes('createClient(adminContext') ||
           content.includes('createClient(adminUser') ||
           (content.includes('createClient({') && content.includes('id:') && content.includes('role:')) ||
           /createClient\s*\(\s*\w+\s+as\s+unknown\s+as\s+AuthUser/.test(content);
  }

  private extractErrorHandlingPatterns(content: string): string[] {
    const patterns: string[] = [];
    if (content.includes('try {') && content.includes('catch')) patterns.push('try-catch');
    if (content.includes('NextResponse.json({ error:')) patterns.push('json-error-response');
    if (content.includes('status: 4') || content.includes('status: 5')) patterns.push('http-status-codes');
    return patterns;
  }

  private extractValidationPatterns(content: string): string[] {
    const patterns: string[] = [];
    if (content.includes('z.object') || content.includes('import { z }')) patterns.push('zod');
    if (content.includes('.parse(')) patterns.push('runtime-validation');
    if (content.includes('schema.parse')) patterns.push('schema-validation');
    return patterns;
  }

  private extractResponseFormat(content: string): string {
    if (content.includes('NextResponse.json({ success: true')) return 'success-object';
    if (content.includes('NextResponse.json({ data:')) return 'data-wrapper';
    if (content.includes('NextResponse.json({')) return 'json-object';
    return 'unknown';
  }

  private extractComponentName(filePath: string): string {
    return basename(filePath, extname(filePath));
  }

  private extractProps(content: string): string[] {
    const propMatches = content.match(/interface\s+\w+Props\s*\{([^}]+)\}/s);
    if (!propMatches) return [];
    
    const propsContent = propMatches[1];
    const propLines = propsContent.split('\n').filter(line => line.trim() && !line.includes('//'));
    return propLines.map(line => line.trim().split(':')[0]?.trim()).filter(Boolean);
  }

  private extractHooks(content: string): string[] {
    const hooks: string[] = [];
    const hookPatterns = ['useState', 'useEffect', 'useCallback', 'useMemo', 'useQuery', 'useMutation'];
    
    hookPatterns.forEach(hook => {
      if (content.includes(hook)) {
        hooks.push(hook);
      }
    });
    
    return hooks;
  }

  private extractApiCalls(content: string): string[] {
    const apiCalls: string[] = [];
    const fetchMatches = content.matchAll(/fetch\(['"`]([^'"`]+)['"`]/g);
    
    for (const match of fetchMatches) {
      apiCalls.push(match[1]);
    }
    
    return apiCalls;
  }

  private detectStylingFramework(content: string): string {
    if (content.includes('className=') && content.includes('tailwind')) return 'tailwind';
    if (content.includes('style=')) return 'inline';
    if (content.includes('styled.')) return 'styled-components';
    return 'unknown';
  }

  private detectDarkMode(content: string): boolean {
    return content.includes('dark:') || content.includes('darkMode') || content.includes('useTheme');
  }

  private detectResponsive(content: string): boolean {
    return content.includes('md:') || content.includes('lg:') || content.includes('sm:') || content.includes('responsive');
  }

  private extractModels(content: string): Array<{ name: string; fields: string[]; relations: string[] }> {
    const models: Array<{ name: string; fields: string[]; relations: string[] }> = [];
    
    // Improved regex to handle multi-line model definitions
    const modelRegex = /model\s+(\w+)\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/gs;
    let match;
    
    while ((match = modelRegex.exec(content)) !== null) {
      const modelName = match[1];
      const modelContent = match[2];
      
      // Extract field definitions (more robust pattern)
      const fieldLines = modelContent.split('\n').filter(line => {
        const trimmed = line.trim();
        return trimmed && 
               !trimmed.startsWith('//') && 
               !trimmed.startsWith('@@') &&
               trimmed.includes(' ');
      });
      
      const fields = fieldLines.map(line => {
        const fieldPart = line.trim().split(/\s+/)[0];
        return fieldPart;
      }).filter(Boolean);
      
      // Extract relations (look for @relation or relation field patterns)
      const relations: string[] = [];
      fieldLines.forEach(line => {
        if (line.includes('@relation') || line.includes('relation')) {
          const relationMatch = line.match(/(\w+)\s+(\w+)/);
          if (relationMatch) {
            relations.push(relationMatch[1]);
          }
        }
      });
      
      models.push({
        name: modelName,
        fields: fields,
        relations: relations
      });
    }
    
    return models;
  }

  private findModelApiRoutes(modelName: string): string[] {
    const routes: string[] = [];
    const routePath = `api/${modelName.toLowerCase()}`;
    
    this.report.routes.forEach(route => {
      if (route.path.includes(modelName.toLowerCase())) {
        routes.push(route.path);
      }
    });
    
    return routes;
  }

  private findModelComponents(modelName: string): string[] {
    const components: string[] = [];
    
    this.report.components.forEach(component => {
      if (component.name.toLowerCase().includes(modelName.toLowerCase())) {
        components.push(component.name);
      }
    });
    
    return components;
  }

  private determineOperations(apiRoutes: string[]): string[] {
    const operations: string[] = [];
    
    apiRoutes.forEach(route => {
      const routePattern = this.report.routes.find(r => r.path === route);
      if (routePattern) {
        operations.push(...routePattern.methods);
      }
    });
    
    return [...new Set(operations)];
  }

  private findTemplateFiles(): string[] {
    if (!existsSync(this.templatesDir)) {
      return [];
    }

    const templates: string[] = [];
    const entries = readdirSync(this.templatesDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(this.templatesDir, entry.name);
      if (entry.isFile() && (extname(entry.name) === '.ts' || extname(entry.name) === '.tsx')) {
        templates.push(fullPath);
      }
    }
    
    return templates;
  }

  private detectTemplateUpdates(templateFile: string, template: string): string[] {
    const updates: string[] = [];
    // Add logic to detect what needs updating
    return updates;
  }

  private extractCommonRoutePatterns(): RoutePattern {
    if (this.report.routes.length === 0) {
      return {
        path: '',
        methods: [],
        authRequired: false,
        userContext: false,
        patterns: {
          errorHandling: [],
          validation: [],
          responseFormat: 'json-object'
        }
      };
    }

    // Find most common patterns
    const authCount = this.report.routes.filter(r => r.authRequired).length;
    const userContextCount = this.report.routes.filter(r => r.userContext).length;
    
    return {
      path: '',
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      authRequired: authCount > this.report.routes.length / 2,
      userContext: userContextCount > this.report.routes.length / 2,
      patterns: {
        errorHandling: ['try-catch', 'json-error-response'],
        validation: ['zod'],
        responseFormat: 'success-object'
      }
    };
  }

  private extractCommonComponentPatterns(): ComponentPattern {
    if (this.report.components.length === 0) {
      return {
        name: '',
        path: '',
        props: [],
        hooks: ['useState', 'useEffect'],
        apiCalls: [],
        styling: {
          framework: 'tailwind',
          darkMode: true,
          responsive: true
        }
      };
    }

    const darkModeCount = this.report.components.filter(c => c.styling.darkMode).length;
    const responsiveCount = this.report.components.filter(c => c.styling.responsive).length;
    
    return {
      name: '',
      path: '',
      props: [],
      hooks: ['useState', 'useEffect', 'useCallback'],
      apiCalls: [],
      styling: {
        framework: 'tailwind',
        darkMode: darkModeCount > this.report.components.length / 2,
        responsive: responsiveCount > this.report.components.length / 2
      }
    };
  }

  private async updateRouteTemplate(patterns: RoutePattern): Promise<void> {
    // Update route generation template
    const templatePath = join(this.templatesDir, 'route-template.ts');
    
    // Create template directory if it doesn't exist
    if (!existsSync(this.templatesDir)) {
      const { mkdirSync } = require('fs');
      mkdirSync(this.templatesDir, { recursive: true });
    }
    
    // Generate updated template based on patterns
    const template = this.generateRouteTemplate(patterns);
    writeFileSync(templatePath, template);
    this.report.templatesUpdated.push(templatePath);
  }

  private async updateComponentTemplate(patterns: ComponentPattern): Promise<void> {
    const templatePath = join(this.templatesDir, 'component-template.tsx');
    
    // Create template directory if it doesn't exist
    if (!existsSync(this.templatesDir)) {
      const { mkdirSync } = require('fs');
      mkdirSync(this.templatesDir, { recursive: true });
    }
    
    const template = this.generateComponentTemplate(patterns);
    writeFileSync(templatePath, template);
    this.report.templatesUpdated.push(templatePath);
  }

  private async updateSidebarTemplate(): Promise<void> {
    const sidebarPath = join(this.projectRoot, 'src/components/navigation/app-sidebar.tsx');
    const templatePath = join(this.templatesDir, 'sidebar-template.tsx');
    
    // Create template directory if it doesn't exist
    if (!existsSync(this.templatesDir)) {
      const { mkdirSync } = require('fs');
      mkdirSync(this.templatesDir, { recursive: true });
    }
    
    // Only update if sidebar component exists
    if (!existsSync(sidebarPath)) {
      console.log('   Sidebar component not found, skipping template update');
      return;
    }
    
    try {
      // Read the actual sidebar component
      const sidebarContent = readFileSync(sidebarPath, 'utf-8');
      
      // Add template header with sync timestamp
      const templateHeader = `// Auto-generated sidebar template based on current patterns
// Last synced: ${new Date().toISOString()}
// This template can be used to generate/regenerate the sidebar component
//
// NOTE: Path aliases (@/) will resolve correctly when this template is used
// in the actual component location (src/components/navigation/)
// TypeScript errors here are expected and can be ignored - they won't affect
// the generated component.

// @ts-nocheck - Template file: imports resolve when used in component location

`;
      
      // Remove any existing template header from sidebar content
      const cleanContent = sidebarContent.replace(/^\/\/ Auto-generated sidebar template.*?@ts-nocheck.*?\n\n/gm, '');
      
      // Combine header with content
      const templateContent = templateHeader + cleanContent;
      
      // Write to template file
      writeFileSync(templatePath, templateContent, 'utf-8');
      this.report.templatesUpdated.push(templatePath);
      console.log('   Sidebar template updated');
    } catch (error) {
      this.report.warnings.push(`Failed to update sidebar template: ${error}`);
      console.log(`   ⚠️  Could not update sidebar template: ${error}`);
    }
  }

  private async updateHeaderWagmiDependentTemplate(): Promise<void> {
    const headerPath = join(this.projectRoot, 'src/components/navigation/HeaderWagmiDependent.tsx');
    const templatePath = join(this.templatesDir, 'header-wagmi-dependent-template.tsx');
    
    // Create template directory if it doesn't exist
    if (!existsSync(this.templatesDir)) {
      const { mkdirSync } = require('fs');
      mkdirSync(this.templatesDir, { recursive: true });
    }
    
    // Only update if HeaderWagmiDependent component exists
    if (!existsSync(headerPath)) {
      console.log('   HeaderWagmiDependent component not found, skipping template update');
      return;
    }
    
    try {
      // Read the actual HeaderWagmiDependent component
      const headerContent = readFileSync(headerPath, 'utf-8');
      
      // Add template header with sync timestamp
      const templateHeader = `// Auto-generated HeaderWagmiDependent template based on current patterns
// Last synced: ${new Date().toISOString()}
// This template can be used to generate/regenerate the HeaderWagmiDependent component
//
// NOTE: This component displays wallet information and token balances in the header.
// It integrates with Zustand store (useTigerWalletStore) for wallet data management.
// Path aliases (@/) will resolve correctly when this template is used
// in the actual component location (src/components/navigation/)
// TypeScript errors here are expected and can be ignored - they won't affect
// the generated component.

// @ts-nocheck - Template file: imports resolve when used in component location

`;
      
      // Remove any existing template header from header content
      const cleanContent = headerContent.replace(/^\/\/ Auto-generated HeaderWagmiDependent template.*?@ts-nocheck.*?\n\n/gm, '');
      
      // Combine header with content
      const templateContent = templateHeader + cleanContent;
      
      // Write to template file
      writeFileSync(templatePath, templateContent, 'utf-8');
      this.report.templatesUpdated.push(templatePath);
      console.log('   HeaderWagmiDependent template updated');
    } catch (error) {
      this.report.warnings.push(`Failed to update HeaderWagmiDependent template: ${error}`);
      console.log(`   ⚠️  Could not update HeaderWagmiDependent template: ${error}`);
    }
  }

  /**
   * Sync app-header.tsx (main app header with PRESTIX.VIP logo) to plugins/templates.
   * Header uses PrestixLogo wordmark (PRESTIX. white, .VIP red) - not HeaderLogo/image.
   */
  private async updateAppHeaderTemplate(): Promise<void> {
    const headerPath = join(this.projectRoot, 'src/components/navigation/app-header.tsx');
    const templatePath = join(this.templatesDir, 'app-header-template.tsx');

    if (!existsSync(this.templatesDir)) {
      const { mkdirSync } = require('fs');
      mkdirSync(this.templatesDir, { recursive: true });
    }

    if (!existsSync(headerPath)) {
      console.log('   AppHeader component not found, skipping template update');
      return;
    }

    try {
      const headerContent = readFileSync(headerPath, 'utf-8');

      const templateHeader = `// Auto-generated AppHeader template based on current patterns
// Last synced: ${new Date().toISOString()}
// This template can be used to generate/regenerate the main app header component.
//
// NOTE: Header logo uses PrestixLogo (PRESTIX.VIP wordmark: PRESTIX. white, .VIP red).
// Do NOT use HeaderLogo/image logo here - use PrestixLogo for brand consistency.
// Path aliases (@/) resolve when used in src/components/navigation/

// @ts-nocheck - Template file: imports resolve when used in component location

`;

      const cleanContent = headerContent.replace(
        /^\/\/ Auto-generated AppHeader template.*?@ts-nocheck.*?\n\n/gm,
        ''
      );
      const templateContent = templateHeader + cleanContent;
      writeFileSync(templatePath, templateContent, 'utf-8');
      this.report.templatesUpdated.push(templatePath);
      console.log('   AppHeader template updated');
    } catch (error) {
      this.report.warnings.push(`Failed to update AppHeader template: ${error}`);
      console.log(`   ⚠️  Could not update AppHeader template: ${error}`);
    }
  }

  private async updateHookTemplate(): Promise<void> {
    const hookPath = join(this.projectRoot, 'src/generated/hooks/product-hooks.ts');
    const templatePath = join(this.templatesDir, 'hook-template.ts');
    
    if (!existsSync(this.templatesDir)) {
      const { mkdirSync } = require('fs');
      mkdirSync(this.templatesDir, { recursive: true });
    }
    
    if (!existsSync(hookPath)) {
      console.log('   Hook file not found, skipping template update');
      return;
    }
    
    try {
      const hookContent = readFileSync(hookPath, 'utf-8');
      const templateHeader = `// Auto-generated hook template based on current patterns
// Last synced: ${new Date().toISOString()}
// This template can be used to generate/regenerate React Query hooks for entities

// @ts-nocheck - Template file: imports resolve when used in component location

`;
      
      // Replace Product-specific code with template variables
      const templateContent = templateHeader + hookContent
        .replace(/Product/g, '{{modelName}}')
        .replace(/product/g, '{{lowerModelName}}')
        .replace(/\/\/ Generated Hooks for Product.*?\n/g, '');
      
      writeFileSync(templatePath, templateContent, 'utf-8');
      this.report.templatesUpdated.push(templatePath);
      console.log('   Hook template updated');
    } catch (error) {
      this.report.warnings.push(`Failed to update hook template: ${error}`);
      console.log(`   ⚠️  Could not update hook template: ${error}`);
    }
  }

  private async updateFormTemplate(): Promise<void> {
    const formPath = join(this.projectRoot, 'src/components/admin/enumDefinition-form.tsx');
    const templatePath = join(this.templatesDir, 'form-template.tsx');
    
    if (!existsSync(this.templatesDir)) {
      const { mkdirSync } = require('fs');
      mkdirSync(this.templatesDir, { recursive: true });
    }
    
    if (!existsSync(formPath)) {
      console.log('   Form component not found, skipping template update');
      return;
    }
    
    try {
      const formContent = readFileSync(formPath, 'utf-8');
      const templateHeader = `// Auto-generated form template based on current patterns
// Last synced: ${new Date().toISOString()}
// This template can be used to generate/regenerate admin form components

// @ts-nocheck - Template file: imports resolve when used in component location

`;
      
      // Replace EnumDefinition-specific code with template variables
      // Strip unused useDatabaseAnalytics import (never used in generated forms)
      const templateContent = templateHeader + formContent
        .replace(/EnumDefinition/g, '{{modelName}}')
        .replace(/enumDefinition/g, '{{lowerModelName}}')
        .replace(/\/\/ Generated Form Component for EnumDefinition.*?\n/g, '')
        .replace(/\/\/ DO NOT EDIT - Auto-generated.*?\n/g, '')
        .replace(/\nimport \{ useDatabaseAnalytics \} from '@\/stores';\n?/g, '\n');
      
      writeFileSync(templatePath, templateContent, 'utf-8');
      this.report.templatesUpdated.push(templatePath);
      console.log('   Form template updated');
    } catch (error) {
      this.report.warnings.push(`Failed to update form template: ${error}`);
      console.log(`   ⚠️  Could not update form template: ${error}`);
    }
  }

  private async updateAdminTableTemplate(): Promise<void> {
    // Use venueProfile as canonical source - includes Logo column pattern for logo/coverImage/gallery
    const tablePath = join(this.projectRoot, 'src/components/admin/venueProfile-admin-table.tsx');
    const templatePath = join(this.templatesDir, 'admin-table-template.tsx');
    
    if (!existsSync(this.templatesDir)) {
      const { mkdirSync } = require('fs');
      mkdirSync(this.templatesDir, { recursive: true });
    }
    
    if (!existsSync(tablePath)) {
      console.log('   Admin table component not found, skipping template update');
      return;
    }
    
    try {
      const tableContent = readFileSync(tablePath, 'utf-8');
      const templateHeader = `// Auto-generated admin table template based on current patterns
// Last synced: ${new Date().toISOString()}
// Canonical source: venueProfile (includes Logo column for logo/coverImage/gallery)
// This template can be used to generate/regenerate admin table components

// @ts-nocheck - Template file: imports resolve when used in component location

`;
      
      // Replace VenueProfile-specific code with template variables
      // Strip unused useDatabaseAnalytics import (never used in generated admin tables)
      const templateContent = templateHeader + tableContent
        .replace(/VenueProfile/g, '{{modelName}}')
        .replace(/venueProfile/g, '{{lowerModelName}}')
        .replace(/venueProfiles/g, '{{lowerModelName}}s')
        .replace(/\/\/ Generated Admin Table Component for VenueProfile.*?\n/g, '')
        .replace(/\/\/ DO NOT EDIT - Auto-generated.*?\n/g, '')
        .replace(/\nimport \{ useDatabaseAnalytics \} from '@\/stores';\n?/g, '\n');
      
      writeFileSync(templatePath, templateContent, 'utf-8');
      this.report.templatesUpdated.push(templatePath);
      console.log('   Admin table template updated');
    } catch (error) {
      this.report.warnings.push(`Failed to update admin table template: ${error}`);
      console.log(`   ⚠️  Could not update admin table template: ${error}`);
    }
  }

  /**
   * Update admin page template from a canonical admin page (enumDefinition).
   * The source page must NOT use DashboardLayout or AppLayout so the template stays compliant;
   * admin layout (AdminShell) provides sidebar+header for all /admin routes.
   */
  private async updateAdminPageTemplate(): Promise<void> {
    const pagePath = join(this.projectRoot, 'src/app/admin/enumDefinition/page.tsx');
    const templatePath = join(this.templatesDir, 'admin-page-template.tsx');
    
    if (!existsSync(this.templatesDir)) {
      const { mkdirSync } = require('fs');
      mkdirSync(this.templatesDir, { recursive: true });
    }
    
    if (!existsSync(pagePath)) {
      console.log('   Admin page component not found, skipping template update');
      return;
    }
    
    try {
      const pageContent = readFileSync(pagePath, 'utf-8');
      const templateHeader = `// Auto-generated admin page template based on current patterns
// Last synced: ${new Date().toISOString()}
// This template can be used to generate/regenerate admin page components

// @ts-nocheck - Template file: imports resolve when used in component location

`;
      
      // Replace EnumDefinition-specific code with template variables
      const templateContent = templateHeader + pageContent
        .replace(/EnumDefinition/g, '{{modelName}}')
        .replace(/enumDefinition/g, '{{lowerModelName}}');
      
      writeFileSync(templatePath, templateContent, 'utf-8');
      this.report.templatesUpdated.push(templatePath);
      console.log('   Admin page template updated');
    } catch (error) {
      this.report.warnings.push(`Failed to update admin page template: ${error}`);
      console.log(`   ⚠️  Could not update admin page template: ${error}`);
    }
  }

  private async updateApiClientTemplate(): Promise<void> {
    const apiPath = join(this.projectRoot, 'src/generated/api/product-api.ts');
    const templatePath = join(this.templatesDir, 'api-client-template.ts');
    
    if (!existsSync(this.templatesDir)) {
      const { mkdirSync } = require('fs');
      mkdirSync(this.templatesDir, { recursive: true });
    }
    
    if (!existsSync(apiPath)) {
      console.log('   API client file not found, skipping template update');
      return;
    }
    
    try {
      const apiContent = readFileSync(apiPath, 'utf-8');
      const templateHeader = `// Auto-generated API client template based on current patterns
// Last synced: ${new Date().toISOString()}
// This template can be used to generate/regenerate API client classes

// @ts-nocheck - Template file: imports resolve when used in component location

`;
      
      // Replace Product-specific code with template variables
      const templateContent = templateHeader + apiContent
        .replace(/Product/g, '{{modelName}}')
        .replace(/product/g, '{{lowerModelName}}')
        .replace(/\/\/ Generated API Client for Product.*?\n/g, '')
        .replace(/\/\/ DO NOT EDIT - Auto-generated.*?\n/g, '');
      
      writeFileSync(templatePath, templateContent, 'utf-8');
      this.report.templatesUpdated.push(templatePath);
      console.log('   API client template updated');
    } catch (error) {
      this.report.warnings.push(`Failed to update API client template: ${error}`);
      console.log(`   ⚠️  Could not update API client template: ${error}`);
    }
  }

  /**
   * Analyze ALL service files in lib/services/ and extract patterns
   * Checks for ZenStack v3 compliance, user context usage, and patterns
   */
  private async analyzeAllServices(): Promise<void> {
    const servicesDir = join(this.projectRoot, 'lib/services');
    if (!existsSync(servicesDir)) {
      console.log('   No services directory found');
      return;
    }

    // Find all TypeScript service files (excluding .d.ts and .js files)
    const serviceFiles = readdirSync(servicesDir, { recursive: true, withFileTypes: true })
      .filter(item => {
        if (item.isDirectory()) return false;
        const name = item.name;
        return name.endsWith('.ts') && 
               !name.endsWith('.d.ts') && 
               !name.endsWith('.test.ts') &&
               !name.endsWith('.spec.ts');
      })
      .map(item => join(servicesDir, item.name));

    // Also check subdirectories
    const subdirs = readdirSync(servicesDir, { withFileTypes: true })
      .filter(item => item.isDirectory())
      .map(item => join(servicesDir, item.name));

    for (const subdir of subdirs) {
      const subFiles = readdirSync(subdir, { recursive: true, withFileTypes: true })
        .filter(item => {
          if (item.isDirectory()) return false;
          const name = item.name;
          return name.endsWith('.ts') && 
                 !name.endsWith('.d.ts') && 
                 !name.endsWith('.test.ts') &&
                 !name.endsWith('.spec.ts');
        })
        .map(item => join(subdir, item.name));
      serviceFiles.push(...subFiles);
    }

    console.log(`   Found ${serviceFiles.length} service files`);

    for (const serviceFile of serviceFiles) {
      try {
        // Skip if file doesn't exist (may have been moved or deleted)
        if (!existsSync(serviceFile)) {
          console.log(`   ⏭️  Skipping non-existent file: ${serviceFile}`);
          continue;
        }
        
        const content = readFileSync(serviceFile, 'utf-8');
        const relativePath = serviceFile.replace(this.projectRoot, '').replace(/^\//, '');
        
        // Extract service patterns
        const hasAuthUser = content.includes('AuthUser');
        const hasCreateClient = /createClient\s*\(/.test(content);
        const hasCreateClientWithUser = /createClient\s*\(\s*user/.test(content) || /createClient\s*\(\s*systemUser/.test(content) || /createClient\s*\(\s*[^)]+\s*\)/.test(content);
        const hasSystemDb = /getSystemDb\s*\(/.test(content) || /const\s+db\s*=\s*getSystemDb/.test(content);
        const hasPrismaDirect = /from\s+['"]@\/lib\/prisma['"]/.test(content) || 
                                /from\s+['"].*\/prisma['"]/.test(content) ||
                                /import\s+.*PrismaClient/.test(content) ||
                                /new\s+PrismaClient/.test(content);
        
        // Count createClient() calls without user context
        const createClientCalls = (content.match(/createClient\s*\(\)/g) || []).length;
        const createClientWithContextCalls = (content.match(/createClient\s*\(\s*[^)]+\)/g) || []).length;
        const missingUserContext = Math.max(0, createClientCalls);
        
        const className = content.match(/export\s+(?:class|function)\s+(\w+)/)?.[1] || 
                         content.match(/export\s+class\s+(\w+)/)?.[1] || 
                         basename(serviceFile, '.ts');
        
        // Generate recommendations
        const recommendations: string[] = [];
        if (hasPrismaDirect) {
          recommendations.push('Replace PrismaClient with createClient(user) for ZenStack v3 compliance');
        }
        if (missingUserContext > 0) {
          recommendations.push(`Add user context to ${missingUserContext} createClient() call(s) - use getSystemDb() for system operations`);
        }
        if (hasCreateClient && !hasSystemDb && missingUserContext > 0) {
          recommendations.push('Add getSystemDb() helper function for system-level operations');
        }
        
        const pattern: ServicePattern = {
          path: relativePath,
          className,
          hasAuthUser,
          hasCreateClient,
          hasUserContext: hasCreateClientWithUser || hasSystemDb,
          hasSystemDb,
          hasPrismaDirect,
          missingUserContext,
          recommendations
        };

        this.report.services.push(pattern);

        // Add warnings for violations
        if (hasPrismaDirect) {
          this.report.warnings.push(`Service ${relativePath}: Uses PrismaClient directly - should use createClient(user) for ZenStack v3`);
        }
        if (missingUserContext > 0 && !hasSystemDb) {
          this.report.warnings.push(`Service ${relativePath}: Has ${missingUserContext} createClient() call(s) without user context - add getSystemDb() helper`);
        }
      } catch (error) {
        this.report.warnings.push(`Failed to analyze service ${serviceFile}: ${error}`);
      }
    }
  }

  /**
   * Update QTech service template from actual QTech service implementations
   */
  private async updateQTechServiceTemplate(): Promise<void> {
    const qtechServicesDir = join(this.projectRoot, 'src/lib/services/qtech');
    const templatePath = join(this.templatesDir, 'qtech-service-template.ts');
    
    if (!existsSync(this.templatesDir)) {
      const { mkdirSync } = require('fs');
      mkdirSync(this.templatesDir, { recursive: true });
    }
    
    // Find a representative QTech service file
    const serviceFiles = existsSync(qtechServicesDir)
      ? readdirSync(qtechServicesDir, { recursive: false })
          .filter(file => file.toString().endsWith('.ts') && !file.toString().endsWith('.d.ts'))
          .map(file => join(qtechServicesDir, file.toString()))
      : [];
    
    if (serviceFiles.length === 0) {
      console.log('   No QTech service files found, skipping template update');
      return;
    }

    try {
      // Use the first service file as a template source
      const serviceFile = serviceFiles[0];
      const serviceContent = readFileSync(serviceFile, 'utf-8');
      
      const templateHeader = `// Auto-generated QTech service template based on current patterns
// Last synced: ${new Date().toISOString()}
// This template generates QTech service classes that use ZenStack v3 ORM with user context
// Based on: ${basename(serviceFile)}

// @ts-nocheck - Template file: imports resolve when used in service location

`;

      // Replace specific class names and methods with template variables
      const templateContent = templateHeader + serviceContent
        .replace(/export class \w+/g, 'export class {{ServiceName}}')
        .replace(/QtechAccountService|QtechImageManager|QtechGameLauncher/g, '{{ServiceName}}')
        .replace(/\/\*\*[\s\S]*?\*\//g, (match) => {
          // Keep the JSDoc but replace specific names
          return match.replace(/QtechAccountService|QtechImageManager|QtechGameLauncher/g, '{{ServiceName}}');
        })
        .replace(/async \w+\(/g, (match) => {
          return match.replace(/async (\w+)\(/, 'async {{operationName}}(');
        })
        .replace(/userId: string/g, '{{paramName}}: {{paramType}}')
        .replace(/user: AuthUser/g, 'user: AuthUser'); // Keep AuthUser as-is
      
      writeFileSync(templatePath, templateContent, 'utf-8');
      this.report.templatesUpdated.push(templatePath);
      console.log('   QTech service template updated');
    } catch (error) {
      this.report.warnings.push(`Failed to update QTech service template: ${error}`);
      console.log(`   ⚠️  Could not update QTech service template: ${error}`);
    }
  }

  /**
   * Check QTech proxy compliance across all QTech-related files
   */
  private async checkQTechProxyCompliance(): Promise<void> {
    const { glob } = await import('glob');
    const patterns = [
      'src/**/*qtech*.ts',
      'src/**/*qtech*.tsx',
      'src/**/*QTech*.ts',
      'src/**/*QTech*.tsx',
    ];

    const files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, { ignore: ['**/node_modules/**', '**/.next/**'] });
      files.push(...matches);
    }

    const violations: Array<{ file: string; line: number; message: string; severity: string }> = [];
    const QTECH_DOMAINS = ['api-int.qtplatform.com', 'qtplatform.com', 'qtlauncher.com'];
    const DIRECT_PATTERNS = ['qtechAxios', 'makeDirectQtechCall', 'axios.*qtplatform', 'fetch.*api-int.qtplatform'];

    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        const hasProxy = content.includes('qtechStaticProxy') || content.includes('qtech-static-proxy');
        const hasDirectCall = DIRECT_PATTERNS.some(pattern => {
          const regex = new RegExp(pattern, 'i');
          return regex.test(content);
        });

        // Check for hardcoded QTech URLs
        lines.forEach((line, index) => {
          QTECH_DOMAINS.forEach(domain => {
            if (line.includes(domain) && !line.includes('qtechStaticProxy') && !line.includes('//') && !line.includes('qtlauncher.com/images/') && !line.includes('lobby-int.qtlauncher.com')) {
              violations.push({
                file: file.replace(this.projectRoot, ''),
                line: index + 1,
                message: `Hardcoded QTech URL detected: ${domain}`,
                severity: 'HIGH',
              });
            }
          });

          // Check for qtechAxios usage
          if (line.includes('qtechAxios') && !line.includes('//')) {
            violations.push({
              file: file.replace(this.projectRoot, ''),
              line: index + 1,
              message: 'Direct axios call to QTech API. Must use qtechStaticProxy.',
              severity: 'HIGH',
            });
          }

          // Check for makeDirectQtechCall usage
          if (line.includes('makeDirectQtechCall') && !line.includes('//')) {
            violations.push({
              file: file.replace(this.projectRoot, ''),
              line: index + 1,
              message: 'Direct QTech API call function detected. Must use qtechStaticProxy.',
              severity: 'HIGH',
            });
          }
        });

        // Check if file makes QTech calls but doesn't use proxy
        if (hasDirectCall && !hasProxy) {
          violations.push({
            file: file.replace(this.projectRoot, ''),
            line: 1,
            message: 'File contains direct QTech API calls but does not use qtechStaticProxy',
            severity: 'HIGH',
          });
        }
      } catch (error) {
        this.report.warnings.push(`Failed to check proxy compliance for ${file}: ${error}`);
      }
    }

    if (violations.length > 0) {
      console.log(`   ⚠️  Found ${violations.length} proxy compliance violations`);
      violations.forEach(v => {
        this.report.warnings.push(`QTech Proxy: ${v.file}:${v.line} - [${v.severity}] ${v.message}`);
      });
    } else {
      console.log('   ✅ All QTech files compliant with proxy requirements');
    }
  }

  /**
   * Update QTech webhook route template from actual QTech webhook routes
   */
  private async updateQTechWebhookRouteTemplate(): Promise<void> {
    const qtechWebhookRoutesDir = join(this.projectRoot, 'src/app/api/qtech');
    const templatePath = join(this.templatesDir, 'qtech-webhook-route-template.ts');
    
    if (!existsSync(this.templatesDir)) {
      const { mkdirSync } = require('fs');
      mkdirSync(this.templatesDir, { recursive: true });
    }
    
    // Find QTech webhook route files
    const webhookRoutes = this.findRoutes(qtechWebhookRoutesDir).filter(file => {
      try {
        const content = readFileSync(file, 'utf-8');
        return content.includes('createWebhookClient') || 
               content.includes('Pass-Key') ||
               content.includes('Wallet-Session');
      } catch {
        return false;
      }
    });
    
    if (webhookRoutes.length === 0) {
      console.log('   No QTech webhook routes found, skipping template update');
      return;
    }

    try {
      // Use the first webhook route as a template source
      const webhookRoute = webhookRoutes[0];
      const routeContent = readFileSync(webhookRoute, 'utf-8');
      
      const templateHeader = `// Auto-generated QTech webhook route template based on current patterns
// Last synced: ${new Date().toISOString()}
// This template generates QTech webhook endpoints that use createWebhookClient
// Based on: ${basename(webhookRoute)}

// @ts-nocheck - Template file: imports resolve when used in route location

`;

      // Extract and preserve the core patterns
      const templateContent = templateHeader + routeContent
        .replace(/\/api\/qtech\/\w+/g, '/api/qtech/{{endpoint}}')
        .replace(/async function \w+/g, 'async function {{operationName}}')
        .replace(/\/\*\*[\s\S]*?\*\//g, (match) => {
          // Keep JSDoc but replace specific endpoint names
          return match.replace(/\/api\/qtech\/\w+/g, '/api/qtech/{{endpoint}}');
        });
      
      writeFileSync(templatePath, templateContent, 'utf-8');
      this.report.templatesUpdated.push(templatePath);
      console.log('   QTech webhook route template updated');
    } catch (error) {
      this.report.warnings.push(`Failed to update QTech webhook route template: ${error}`);
      console.log(`   ⚠️  Could not update QTech webhook route template: ${error}`);
    }
  }

  private async updateModelConfigurations(): Promise<void> {
    // Update enhanced-production-generator.ts with current model patterns
    const configPath = join(this.projectRoot, 'plugins/enhanced-production-generator.ts');
    if (existsSync(configPath)) {
      // Add logic to update model configurations
      console.log('   Model configurations will be updated in next generation cycle');
    }
  }

  private generateRouteTemplate(patterns: RoutePattern): string {
    return `// Auto-generated route template based on current patterns
// Last synced: ${new Date().toISOString()}
// ✅ Updated: Proper getCurrentUser(request) usage and robust error handling

import type { {{modelName}}Filter, {{modelName}}SortOrder } from '@/generated/types/{{lowerModelName}}-types';
import { OrderBy, SortOrder } from '@zenstackhq/orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { AuthUser } from '@/lib/auth';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/db';
import { AuditActivityLogger } from '@/lib/services/audit-activity-logger';


const schema = z.object({
  // Add validation schema
});


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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    let filter: {{modelName}}Filter | undefined;
    let sortOrder: {{modelName}}SortOrder | undefined;

    try {
      const filterParam = searchParams.get('filter');
      if (filterParam) {
        filter = JSON.parse(filterParam) as {{modelName}}Filter;
      }
      const sortOrderParam = searchParams.get('sortOrder');
      if (sortOrderParam) {
        sortOrder = JSON.parse(sortOrderParam) as {{modelName}}SortOrder;
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
        db.{{lowerModelName}}.findMany({
      where: filter as any,
      orderBy: (sortOrder || { createdAt: 'desc' }) as unknown as SortOrder & { [x: string]: SortOrder; [x: number]: SortOrder; } & { [x: string]: OrderBy<any, any, true, false>; [x: number]: OrderBy<any, any, true, false>; },
      skip: (page - 1) * pageSize as unknown as number,
      take: pageSize as unknown as number
        }),
        db.{{lowerModelName}}.count({ where: filter as any }) as unknown as number
      ]);
    } catch (queryError) {
      console.error('Database query error:', queryError);
      return NextResponse.json(
        {
          success: false,
          error: 'Database query failed',
          message: queryError instanceof Error ? queryError.message : 'Failed to fetch data from database',
        },
        { status: 500 },
      );
    }
    
    return NextResponse.json({
      success: true,
      data,
      pagination: {
        total,
        page,
        pageSize,
        hasMore: (page - 1) * pageSize + data.length < total,
        totalPages: Math.ceil(total / pageSize)
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
        ...(process.env.NODE_ENV === 'development' && errorStack ? { stack: errorStack } : {}),
      },
      { status: 500 }
    );
  }
}

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    
    // Clean up date fields - convert empty strings to undefined
    const cleanedData = { ...body };
    if (cleanedData.createdAt === '' || cleanedData.createdAt === null) {
      delete cleanedData.createdAt;
    }
    if (cleanedData.updatedAt === '' || cleanedData.updatedAt === null) {
      delete cleanedData.updatedAt;
    }
    
    // Get session metadata for audit logging
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;
    
    // No token validation required for this model
    
    // Create entity
    let {{lowerModelName}}Created;
    try {
      {{lowerModelName}}Created = await db.{{lowerModelName}}.create({
      data: cleanedData
    });
    } catch (createError) {
      console.error('Database create error:', createError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create {{modelName}}',
          message: createError instanceof Error ? createError.message : 'Database create operation failed',
        },
        { status: 500 },
      );
    }
    
    // Log creation with audit and activity tracking
    try {
    await AuditActivityLogger.logCreate(
      '{{modelName}}',
      {{lowerModelName}}Created.id,
      user.id,
      {{lowerModelName}}Created,
      { ipAddress, userAgent, source: 'api' }
    );
    } catch (auditError) {
      // Log audit error but don't fail the creation
      console.error('Audit logging error:', auditError);
    }
    
    return NextResponse.json({{lowerModelName}}Created, { status: 201 });
  } catch (error) {
    // Catch-all for unexpected errors
    console.error('Unexpected error creating {{modelName}}:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create {{modelName}}';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: errorMessage,
        ...(process.env.NODE_ENV === 'development' && errorStack ? { stack: errorStack } : {}),
      },
      { status: 500 }
    );
  }
}
`;
  }

  /**
   * Ensure all admin pages have proper layout wrappers.
   * NOTE: Admin pages must NOT use DashboardLayout or AppLayout. Layout comes from AdminShell (src/app/admin/layout.tsx).
   * Adding DashboardLayout/AppLayout to admin pages causes duplicate sidebar and header.
   */
  private async ensureAdminPagesLayout(): Promise<void> {
    try {
      const { NavigationGenerator } = await import('./navigation-generator');
      const navigationGenerator = new NavigationGenerator();
      
      // Use the private method via type assertion or call the public generate method
      // Since ensureAdminPagesLayout is private, we'll call generate which includes it
      await navigationGenerator.generate();
    } catch (error) {
      console.warn('⚠️  Could not ensure admin pages layout:', error);
      this.report.warnings.push('Failed to ensure admin pages have proper layouts');
    }
  }

  /**
   * Synchronize documentation (consolidate, clean, and sync with database)
   * @param skipDatabaseSync - Skip database synchronization (relational sync) to speed up execution
   */
  private async syncDocumentation(skipDatabaseSync: boolean = false): Promise<void> {
    try {
      const { DocumentationSyncPlugin } = await import('./documentation-sync-plugin');
      
      // Check if documentation sync is available
      if (!DocumentationSyncPlugin.isAvailable()) {
        console.log('   ⏭️  Documentation sync not available (scripts not found)');
        this.report.warnings.push('Documentation sync scripts not found');
        return;
      }

      const plugin = new DocumentationSyncPlugin(this.projectRoot);
      const result = await plugin.sync(skipDatabaseSync);

      // Store results in report
      this.report.documentation = {
        consolidated: result.consolidated,
        cleaned: result.cleaned,
        synced: result.synced,
        skipped: result.skipped,
        needsRegeneration: result.needsRegeneration,
        errors: result.errors,
      };

      // Add warnings if any
      if (result.errors.length > 0) {
        result.errors.forEach(error => {
          this.report.warnings.push(`Documentation sync: ${error}`);
        });
      }

    } catch (error) {
      console.warn('⚠️  Could not synchronize documentation:', error);
      this.report.warnings.push(`Documentation sync failed: ${error}`);
    }
  }

  /**
   * Analyze Zustand stores and generate missing ones
   */
  private async analyzeZustandStores(): Promise<void> {
    try {
      const { ZustandStoreGenerator } = await import('./zustand-store-generator');
      this.zustandGenerator = new ZustandStoreGenerator(this.projectRoot);
      const report = await this.zustandGenerator.analyze();

      // Store store patterns in report
      this.report.stores = report.analyzedStores.map(store => ({
        name: store.name,
        path: store.path,
        hasImmer: store.hasImmer,
        hasPersist: store.hasPersist,
        hasDevtools: store.hasDevtools,
        stateProperties: store.stateProperties,
        loadingStates: store.loadingStates,
        errorStates: store.errorStates,
        actions: store.actions
      }));

      // Add recommendations for missing stores
      report.recommendations.forEach(rec => {
        this.report.generationNeeded.push(`Store: ${rec}`);
      });

      // Add warnings for store issues
      report.errors.forEach(error => {
        this.report.warnings.push(`Store analysis: ${error}`);
      });

      console.log(`   ✅ Analyzed ${report.analyzedStores.length} stores`);
      if (report.recommendations.length > 0) {
        console.log(`   💡 ${report.recommendations.length} recommendations`);
      }

      // Generate stores for schema models that don't exist
      console.log('\n🎯 Generating missing Zustand stores...');
      await this.generateMissingZustandStores();

    } catch (error) {
      console.warn('⚠️  Could not analyze Zustand stores:', error);
      this.report.warnings.push(`Store analysis failed: ${error}`);
    }
  }

  /**
   * Generate missing Zustand stores for schema models
   */
  private async generateMissingZustandStores(): Promise<void> {
    try {
      // Get all models from the schema
      const models = this.report.models.map(model => ({
        name: model.name,
        fields: model.fields
      }));

      console.log(`   📋 Checking ${models.length} models for store generation...`);

      // Generate stores for models that don't have them
      const generatedStores: string[] = [];
      const updatedStores: string[] = [];

      for (const model of models) {
        const storeName = model.name;
        const storeFileName = `${model.name.charAt(0).toLowerCase() + model.name.slice(1)}Store.ts`;
        const storePath = join(this.storesDir, storeFileName);

        if (!existsSync(storePath)) {
          console.log(`   🎯 Generating store for ${model.name}...`);

          try {
            // Generate the store
            const storeConfig = this.createStoreConfigForModel(model);
            await this.zustandGenerator.generateStore(storeConfig);
            generatedStores.push(`${storeName}Store`);
            console.log(`   ✅ Generated ${storeName}Store`);
          } catch (error) {
            console.error(`   ❌ Failed to generate ${storeName}Store:`, error);
            this.report.warnings.push(`Failed to generate store ${storeName}Store: ${error}`);
          }
        } else {
          // Check if store needs regeneration (missing proper imports, syntax issues, etc.)
          const needsRegeneration = this.storeNeedsRegeneration(storePath, model);

          if (needsRegeneration) {
            console.log(`   🔄 Regenerating store ${storeName}Store (fixing issues)...`);
            try {
              // Generate the store
              const storeConfig = this.createStoreConfigForModel(model);
              await this.zustandGenerator.generateStore(storeConfig);
              updatedStores.push(`${storeName}Store`);
              console.log(`   ✅ Regenerated ${storeName}Store`);
            } catch (error) {
              console.error(`   ❌ Failed to regenerate ${storeName}Store:`, error);
              this.report.warnings.push(`Failed to regenerate store ${storeName}Store: ${error}`);
            }
          } else {
            // Check if store needs updates (missing immer/devtools/error states)
            const existingStore = this.report.stores?.find(s => s.name === `${storeName}Store`);
            if (existingStore) {
              const needsUpdate = !existingStore.hasImmer || !existingStore.hasDevtools || existingStore.errorStates.length === 0;

              if (needsUpdate) {
                console.log(`   🔄 Updating store ${storeName}Store (adding missing features)...`);
                try {
                  await this.updateStoreWithMissingFeatures(storePath, existingStore);
                  updatedStores.push(`${storeName}Store`);
                  console.log(`   ✅ Updated ${storeName}Store`);
                } catch (error) {
                  console.error(`   ❌ Failed to update ${storeName}Store:`, error);
                  this.report.warnings.push(`Failed to update store ${storeName}Store: ${error}`);
                }
              }
            }
          }
        }
      }

      // Update generation needed list to reflect what was actually generated
      this.report.generationNeeded = this.report.generationNeeded.filter(item =>
        !generatedStores.some(store => item.includes(store)) &&
        !updatedStores.some(store => item.includes(store))
      );

      console.log(`\n📦 Store Generation Summary:`);
      console.log(`   • Generated: ${generatedStores.length} new stores`);
      console.log(`   • Updated: ${updatedStores.length} existing stores`);
      if (generatedStores.length > 0) {
        console.log(`   • New stores: ${generatedStores.join(', ')}`);
      }
      if (updatedStores.length > 0) {
        console.log(`   • Updated stores: ${updatedStores.join(', ')}`);
      }

    } catch (error) {
      console.error('❌ Store generation failed:', error);
      this.report.warnings.push(`Store generation failed: ${error}`);
    }
  }

  /**
   * Create store configuration for a schema model
   */
  private createStoreConfigForModel(model: { name: string; fields: string[] }): any {
    const storeName = model.name;

    // Create basic state properties from model fields
    const stateProperties = [
      {
        name: 'items',
        type: `Array<${model.name}>`,
        description: `List of ${model.name.toLowerCase()} items`,
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
    ];

    // Create loading states
    const loadingStates = [
      { name: 'fetchItems', defaultValue: 'false' },
      { name: 'saveItem', defaultValue: 'false' },
      { name: 'deleteItem', defaultValue: 'false' }
    ];

    // Create error states
    const errorStates = [
      { name: 'fetchItems', defaultValue: '' },
      { name: 'saveItem', defaultValue: '' },
      { name: 'deleteItem', defaultValue: '' }
    ];

    // Create actions
    const actions = [
      {
        name: 'fetchItems',
        returnType: 'Promise<void>',
        parameters: [],
        description: `Fetch ${model.name.toLowerCase()} items from API`,
        isAsync: true
      },
      {
        name: 'addItem',
        returnType: 'Promise<void>',
        parameters: [{ name: 'item', type: `Partial<${model.name}>` }],
        description: `Add a new ${model.name.toLowerCase()} item`,
        isAsync: true
      },
      {
        name: 'updateItem',
        returnType: 'Promise<void>',
        parameters: [
          { name: 'id', type: 'string' },
          { name: 'updates', type: `Partial<${model.name}>` }
        ],
        description: `Update an existing ${model.name.toLowerCase()} item`,
        isAsync: true
      },
      {
        name: 'deleteItem',
        returnType: 'Promise<void>',
        parameters: [{ name: 'id', type: 'string' }],
        description: `Delete a ${model.name.toLowerCase()} item`,
        isAsync: true
      },
      {
        name: 'selectItem',
        returnType: 'void',
        parameters: [{ name: 'itemId', type: 'string | null', optional: true }],
        description: `Select an item by ID`
      },
      {
        name: 'reset',
        returnType: 'void',
        parameters: [],
        description: 'Reset store to initial state'
      }
    ];

    return {
      storeName,
      description: `${model.name} state management store`,
      stateProperties,
      loadingStates,
      errorStates,
      actions,
      withPersist: true,
      withDevtools: true,
      imports: [
        `import { ${model.name} } from '@/generated/types/${model.name.charAt(0).toLowerCase() + model.name.slice(1)}-types';`,
        `import { createClient } from '@/lib/db';`,
        `import { getCurrentUser } from '@/lib/auth';`
      ]
    };
  }

  /**
   * Update existing store with missing features
   */
  private async updateStoreWithMissingFeatures(storePath: string, existingStore: any): Promise<void> {
    const content = readFileSync(storePath, 'utf-8');

    let updatedContent = content;

    // Add immer if missing
    if (!existingStore.hasImmer && !content.includes('immer')) {
      // Add immer import
      if (content.includes("import { create }")) {
        updatedContent = updatedContent.replace(
          "import { create } from 'zustand';",
          "import { create } from 'zustand';\nimport { immer } from 'zustand/middleware/immer';"
        );
      }

      // Wrap create with immer
      if (!content.includes('immer(')) {
        updatedContent = updatedContent.replace(
          /create\((\w+) => \(/,
          'create(immer(($1) => ({'
        );
        updatedContent = updatedContent.replace(/\)\)$/g, '}))');
      }
    }

    // Add devtools if missing
    if (!existingStore.hasDevtools && !content.includes('devtools')) {
      // Add devtools import
      if (content.includes("import { create }")) {
        updatedContent = updatedContent.replace(
          "import { create } from 'zustand';",
          "import { create } from 'zustand';\nimport { devtools } from 'zustand/middleware';"
        );
      }

      // Wrap create with devtools
      if (!content.includes('devtools(')) {
        const storeName = existingStore.name.replace('Store', '');
        updatedContent = updatedContent.replace(
          /create\(/,
          `create(devtools(() => ({`
        );
        updatedContent = updatedContent.replace(/\)\)$/g, `}), { name: '${storeName}' }))`);
      }
    }

    // Add error states if missing
    if (existingStore.errorStates.length === 0) {
      // Add error state to initial state
      if (content.includes('error: null')) {
        // Already has error state
      } else if (content.includes('} as const')) {
        // Add error state before the closing
        updatedContent = updatedContent.replace(
          /(.*)} as const;/s,
          '$1\n  error: null,'
        );
      }
    }

    // Write updated content if changed
    if (updatedContent !== content) {
      writeFileSync(storePath, updatedContent, 'utf-8');
    }
  }

  private generateComponentTemplate(patterns: ComponentPattern): string {
    return `// Auto-generated component template based on current patterns
// Last synced: ${new Date().toISOString()}

'use client';

${patterns.hooks.includes('useState') ? "import { useState } from 'react';" : ''}
${patterns.hooks.includes('useEffect') ? "import { useEffect } from 'react';" : ''}
${patterns.hooks.includes('useCallback') ? "import { useCallback } from 'react';" : ''}
${patterns.styling.framework === 'tailwind' ? "import { cn } from '@/lib/utils';" : ''}

interface ComponentProps {
  // Add props here
}

export function Component({ ...props }: ComponentProps) {
  ${patterns.hooks.includes('useState') ? 'const [state, setState] = useState();' : ''}

  ${patterns.hooks.includes('useEffect') ? `
  useEffect(() => {
    // Effect logic
  }, []);
  ` : ''}

  ${patterns.hooks.includes('useCallback') ? `
  const handleAction = useCallback(() => {
    // Handler logic
  }, []);
  ` : ''}

  return (
    <div className={cn(
      'base-classes',
      ${patterns.styling.darkMode ? "'dark:dark-classes'" : ''},
      ${patterns.styling.responsive ? "'md:responsive-classes'" : ''}
    )}>
      {/* Component content */}
    </div>
  );
}
`;
  }

  /**
   * Check if a store needs regeneration due to import issues or other problems
   */
  private storeNeedsRegeneration(storePath: string, model: { name: string }): boolean {
    try {
      const content = readFileSync(storePath, 'utf-8');

      // Check for temporary type definitions (indicates missing proper imports)
      if (content.includes('// Temporary type definition') ||
          content.includes(`interface ${model.name} {`)) {
        return true;
      }

      // Check for missing proper imports
      const expectedImport = `import { ${model.name} } from '@/generated/types/${model.name.charAt(0).toLowerCase() + model.name.slice(1)}-types';`;
      if (!content.includes(expectedImport) && content.includes(`import { ${model.name} }`)) {
        return true;
      }

      // Check for syntax issues (missing commas, extra braces, etc.)
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Look for patterns that indicate syntax issues
        if (line.includes('})    }') || (line.includes('},') && line.includes('}    }'))) {
          return true;
        }
      }

      return false;
    } catch (error) {
      // If we can't read the file, assume it needs regeneration
      return true;
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const skipDatabaseSync = !args.includes('--db-sync');
  
  const generator = new AppStateSyncGenerator();
  generator.sync({ skipDatabaseSync })
    .then(report => {
      console.log('\n✅ Sync completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Sync failed:', error);
      process.exit(1);
    });
}

export const appStateSyncGenerator = new AppStateSyncGenerator();

