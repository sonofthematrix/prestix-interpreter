#!/usr/bin/env tsx
/**
 * Custom Route Generator
 * 
 * Generates and fixes custom API routes (admin, QTech, webhooks) to ensure
 * they follow ZenStack v3 patterns with proper user context.
 * 
 * Handles:
 * - Admin routes (/api/admin/*)
 * - QTech routes (/api/qtech/*)
 * - Webhook handlers
 * - Custom integration routes
 */

import { existsSync, readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join, dirname, basename, relative } from 'path';

interface RouteFix {
  path: string;
  fixed: boolean;
  error?: string;
  warnings: string[];
}

interface CustomRouteConfig {
  path: string;
  type: 'admin' | 'qtech' | 'webhook' | 'integration';
  requiresAuth: boolean;
  requiresAdmin: boolean;
  usesDatabase: boolean;
  usesQTechProxy: boolean;
}

export class CustomRouteGenerator {
  private projectRoot: string;
  private apiRoutesDir: string;
  private fixes: RouteFix[] = [];
  private customRoutes: CustomRouteConfig[] = [];

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.apiRoutesDir = join(projectRoot, 'src/app/api');
  }

  /**
   * Main generation/fix entry point
   */
  async generate(): Promise<{ fixed: number; warnings: number; errors: number }> {
    console.log('🔧 Custom Route Generator');
    console.log('=========================\n');

    // Find all custom routes
    await this.scanCustomRoutes();

    // Fix routes that need fixing
    await this.fixCustomRoutes();

    // Generate templates for future routes
    await this.generateTemplates();

    const fixed = this.fixes.filter(f => f.fixed).length;
    const warnings = this.fixes.reduce((sum, f) => sum + f.warnings.length, 0);
    const errors = this.fixes.filter(f => f.error).length;

    console.log('\n📊 Summary:');
    console.log(`   ✅ Fixed: ${fixed}`);
    console.log(`   ⚠️  Warnings: ${warnings}`);
    console.log(`   ❌ Errors: ${errors}`);

    return { fixed, warnings, errors };
  }

  /**
   * Scan for custom routes in admin, qtech, and webhook directories
   */
  private async scanCustomRoutes(): Promise<void> {
    console.log('📁 Scanning for custom routes...');

    // Scan all API routes, not just custom directories
    const allRoutes = this.findRouteFiles(this.apiRoutesDir);
    console.log(`   Found ${allRoutes.length} total API routes`);

    // Categorize routes
    const adminRoutes: string[] = [];
    const qtechRoutes: string[] = [];
    const webhookRoutes: string[] = [];
    const otherRoutes: string[] = [];

    for (const routeFile of allRoutes) {
      const relativePath = relative(this.apiRoutesDir, routeFile);
      
      if (relativePath.startsWith('admin/')) {
        adminRoutes.push(routeFile);
      } else if (relativePath.startsWith('qtech/')) {
        qtechRoutes.push(routeFile);
      } else if (relativePath.startsWith('webhooks/') || relativePath.includes('/webhook')) {
        webhookRoutes.push(routeFile);
      } else {
        // Check if it's a custom route (not in generated/api)
        const routePath = relativePath.replace(/\/route\.ts$/, '');
        const isGenerated = routePath.includes('generated') || 
                           routePath.match(/^[a-z]+s?$/); // Simple plural routes like "users", "products"
        
        // Always include assettransfers as custom (blockchain-specific endpoint)
        const isCustomEndpoint = routePath === 'assettransfers';
        
        if (!isGenerated || isCustomEndpoint) {
          otherRoutes.push(routeFile);
        }
      }
    }

    console.log(`   Found ${adminRoutes.length} routes in admin/`);
    console.log(`   Found ${qtechRoutes.length} routes in qtech/`);
    console.log(`   Found ${webhookRoutes.length} routes in webhook/`);
    console.log(`   Found ${otherRoutes.length} other custom routes`);

    // Analyze all routes
    for (const routeFile of adminRoutes) {
      const config = await this.analyzeRoute(routeFile, 'admin');
      if (config) this.customRoutes.push(config);
    }

    for (const routeFile of qtechRoutes) {
      const config = await this.analyzeRoute(routeFile, 'qtech');
      if (config) this.customRoutes.push(config);
    }

    for (const routeFile of webhookRoutes) {
      const config = await this.analyzeRoute(routeFile, 'webhook');
      if (config) this.customRoutes.push(config);
    }

    for (const routeFile of otherRoutes) {
      const config = await this.analyzeRoute(routeFile, 'integration');
      if (config) this.customRoutes.push(config);
    }

    console.log(`   Total custom routes: ${this.customRoutes.length}\n`);
  }

  /**
   * Find all route.ts files recursively
   */
  private findRouteFiles(dir: string): string[] {
    const files: string[] = [];

    if (!existsSync(dir)) return files;

    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        files.push(...this.findRouteFiles(fullPath));
      } else if (entry.isFile() && entry.name === 'route.ts') {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Analyze a route file to determine its configuration
   */
  private async analyzeRoute(filePath: string, type: 'admin' | 'qtech' | 'webhook' | 'integration'): Promise<CustomRouteConfig | null> {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const relativePath = relative(this.apiRoutesDir, filePath);
      const routePath = '/' + relativePath.replace(/\/route\.ts$/, '').replace(/\\/g, '/');

      // Detect special route types
      const isAuthRoute = routePath.includes('/auth/');
      const isPublicRoute = content.includes('Public endpoint') || 
                           content.includes('public data access') ||
                           content.includes('createClient(null');
      const isWebhookRoute = routePath.includes('/webhook') || 
                            routePath.includes('/qtech/wallet') ||
                            content.includes('webhook') ||
                            content.includes('QTech Common Wallet API');

      return {
        path: routePath,
        type: isWebhookRoute ? 'webhook' : (isAuthRoute ? 'integration' : type),
        requiresAuth: this.detectAuthRequirement(content) && !isPublicRoute && !isWebhookRoute,
        requiresAdmin: this.detectAdminRequirement(content),
        usesDatabase: this.detectDatabaseUsage(content),
        usesQTechProxy: this.detectQTechProxyUsage(content),
      };
    } catch (error) {
      console.error(`   ❌ Error analyzing ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Detect if route requires authentication
   */
  private detectAuthRequirement(content: string): boolean {
    return content.includes('getCurrentUser') || 
           content.includes('getServerSession') ||
           content.includes('validateAdmin');
  }

  /**
   * Detect if route requires admin role
   */
  private detectAdminRequirement(content: string): boolean {
    return content.includes("role !== 'ADMIN'") ||
           content.includes("role !== 'MODERATOR'") ||
           content.includes('validateAdmin') ||
           content.includes('Admin access required');
  }

  /**
   * Detect if route uses database
   */
  private detectDatabaseUsage(content: string): boolean {
    return content.includes('createClient') ||
           content.includes('getDb') ||
           content.includes('db.') ||
           content.includes('PrismaClient');
  }

  /**
   * Detect if route uses QTech proxy
   */
  private detectQTechProxyUsage(content: string): boolean {
    return content.includes('qtechStaticProxy') ||
           content.includes('qtech-proxy') ||
           content.includes('callQTechApi');
  }

  /**
   * Fix custom routes to use proper user context
   */
  private async fixCustomRoutes(): Promise<void> {
    console.log('🔧 Fixing custom routes...\n');

    for (const route of this.customRoutes) {
      const routeFile = this.getRouteFilePath(route.path);
      if (!routeFile || !existsSync(routeFile)) continue;

      const fix = await this.fixRoute(routeFile, route);
      this.fixes.push(fix);

      if (fix.fixed) {
        console.log(`   ✅ Fixed: ${route.path}`);
      } else if (fix.error) {
        console.log(`   ❌ Error: ${route.path} - ${fix.error}`);
      } else if (fix.warnings.length > 0) {
        console.log(`   ⚠️  ${route.path} - ${fix.warnings.length} warning(s)`);
      }
    }
  }

  /**
   * Get file path from route path
   */
  private getRouteFilePath(routePath: string): string | null {
    // Remove leading slash and convert to file path
    const pathParts = routePath.replace(/^\//, '').split('/');
    const filePath = join(this.apiRoutesDir, ...pathParts, 'route.ts');
    return filePath;
  }

  /**
   * Fix a single route file
   */
  private async fixRoute(filePath: string, config: CustomRouteConfig): Promise<RouteFix> {
    const warnings: string[] = [];
    
    try {
      let content = readFileSync(filePath, 'utf-8');
      let fixed = false;

      // Skip files marked as custom endpoints (like assettransfers)
      if (content.includes('DO NOT AUTO-GENERATE') || 
          content.includes('Custom Endpoint')) {
        return { path: config.path, fixed: false, warnings: [] };
      }

      // Check if already using proper patterns
      if (this.isRouteCompliant(content, config)) {
        return { path: config.path, fixed: false, warnings: [] };
      }

      // Fix 1: Add missing imports
      if (config.usesDatabase && !content.includes("import { createClient }")) {
        content = this.addCreateClientImport(content);
        fixed = true;
      }

      if (config.requiresAuth && !content.includes("import { getCurrentUser }")) {
        content = this.addGetCurrentUserImport(content);
        fixed = true;
      }

      // Fix 1.5: Fix getCurrentUser() calls without request parameter
      if (config.requiresAuth && content.includes('getCurrentUser()') && !content.includes('getCurrentUser(request)')) {
        content = this.fixGetCurrentUserCalls(content);
        fixed = true;
      }

      // Fix 2: Fix getDb() calls - replace with createClient(user)
      if (config.usesDatabase && content.includes('getDb()')) {
        content = this.fixGetDbCalls(content, config);
        fixed = true;
      }

      // Fix 2.5: Fix createClient() calls without user context
      if (config.usesDatabase && (content.includes('createClient()') || content.includes('createClient(null'))) {
        content = this.fixCreateClientCalls(content, config);
        fixed = true;
      }

      // Fix 3: Ensure proper authentication checks
      if (config.requiresAuth && !this.hasProperAuthCheck(content, config)) {
        content = this.addAuthCheck(content, config);
        fixed = true;
      }

      // Fix 4: Remove PrismaClient usage if present
      if (content.includes('PrismaClient') && !content.includes('// Migration/Seeding only')) {
        warnings.push('Route uses PrismaClient - should use createClient(user) for runtime');
        // Don't auto-fix PrismaClient as it might be intentional for migrations
      }

      if (fixed) {
        // Add auto-generated header comment
        if (!content.includes('Auto-generated by CustomRouteGenerator')) {
          const headerComment = `// Auto-generated by CustomRouteGenerator
// DO NOT EDIT - Auto-generated custom route
// ✅ ZenStack v3 ORM: Uses createClient(user) not PrismaClient
// ✅ Access Control: Respects ZenStack @@allow/@@deny rules

`;
          content = headerComment + content;
        }
        writeFileSync(filePath, content, 'utf-8');
      }

      return { path: config.path, fixed, warnings };
    } catch (error) {
      return {
        path: config.path,
        fixed: false,
        error: error instanceof Error ? error.message : String(error),
        warnings
      };
    }
  }

  /**
   * Check if route is compliant with ZenStack v3 patterns
   */
  private isRouteCompliant(content: string, config: CustomRouteConfig): boolean {
    // Must use createClient(user) not createClient() or getDb()
    if (config.usesDatabase) {
      // Check for getDb() usage
      if (content.includes('getDb()')) {
        return false;
      }
      
      // Check for createClient() without user context
      if ((content.includes('createClient()') || content.includes('createClient(null')) && 
          !content.includes('createClient(user') && 
          !content.includes('createClient(currentUser') &&
          !content.includes('createClient(systemUser') &&
          !content.includes('createClient(session')) {
        return false;
      }
    }

    // Must use getCurrentUser(request) not getCurrentUser()
    if (config.requiresAuth && content.includes('getCurrentUser()') && !content.includes('getCurrentUser(request)')) {
      return false;
    }

    // Must have auth check if required
    if (config.requiresAuth && !this.hasProperAuthCheck(content, config)) {
      return false;
    }

    return true;
  }

  /**
   * Add createClient import if missing
   */
  private addCreateClientImport(content: string): string {
    if (content.includes("import { createClient }")) return content;

    // Find NextRequest import and add after it
    const nextRequestMatch = content.match(/import\s+.*from\s+['"]next\/server['"];?/);
    if (nextRequestMatch) {
      const insertPos = nextRequestMatch.index! + nextRequestMatch[0].length;
      return content.slice(0, insertPos) + 
        "\nimport { createClient } from '@/lib/db';" +
        content.slice(insertPos);
    }

    // Fallback: add at top after other imports
    const lastImportMatch = content.match(/import\s+.*from\s+['"][^'"]+['"];?\n/g);
    if (lastImportMatch) {
      const lastImport = lastImportMatch[lastImportMatch.length - 1];
      const insertPos = content.indexOf(lastImport) + lastImport.length;
      return content.slice(0, insertPos) + 
        "\nimport { createClient } from '@/lib/db';" +
        content.slice(insertPos);
    }

    return content;
  }

  /**
   * Add getCurrentUser and AuthUser type imports if missing
   */
  private addGetCurrentUserImport(content: string): string {
    // Check if getCurrentUser import already exists
    if (content.includes("import { getCurrentUser }")) {
      // Check if AuthUser type is also imported, if not add it to existing import
      if (!content.includes("type AuthUser") && !content.includes("AuthUser }")) {
        // Try to consolidate into existing import
        content = content.replace(
          /import\s*{\s*getCurrentUser\s*}\s*from\s*['"]@\/lib\/auth['"];?/g,
          "import { getCurrentUser, type AuthUser } from '@/lib/auth';"
        );
      }
      return content;
    }

    // Check if AuthUser type is imported separately
    const hasAuthUserType = content.includes("import type { AuthUser }") || content.includes("import { AuthUser }");

    // Find NextRequest import and add after it
    const nextRequestMatch = content.match(/import\s+.*from\s+['"]next\/server['"];?/);
    if (nextRequestMatch) {
      const insertPos = nextRequestMatch.index! + nextRequestMatch[0].length;
      const authImport = hasAuthUserType 
        ? "\nimport { getCurrentUser } from '@/lib/auth';"
        : "\nimport { getCurrentUser, type AuthUser } from '@/lib/auth';";
      return content.slice(0, insertPos) + authImport + content.slice(insertPos);
    }

    // Fallback: add at top after other imports
    const lastImportMatch = content.match(/import\s+.*from\s+['"][^'"]+['"];?\n/g);
    if (lastImportMatch) {
      const lastImport = lastImportMatch[lastImportMatch.length - 1];
      const insertPos = content.indexOf(lastImport) + lastImport.length;
      const authImport = hasAuthUserType 
        ? "\nimport { getCurrentUser } from '@/lib/auth';"
        : "\nimport { getCurrentUser, type AuthUser } from '@/lib/auth';";
      return content.slice(0, insertPos) + authImport + content.slice(insertPos);
    }

    return content;
  }

  /**
   * Fix getCurrentUser() calls to include request parameter
   */
  private fixGetCurrentUserCalls(content: string): string {
    // Pattern: const user = await getCurrentUser();
    content = content.replace(
      /const\s+user\s*=\s*await\s+getCurrentUser\(\s*\);?/g,
      'const user = await getCurrentUser(request);'
    );
    
    // Pattern: const currentUser = await getCurrentUser();
    content = content.replace(
      /const\s+currentUser\s*=\s*await\s+getCurrentUser\(\s*\);?/g,
      'const currentUser = await getCurrentUser(request);'
    );
    
    // Pattern: await getCurrentUser() (standalone)
    content = content.replace(
      /await\s+getCurrentUser\(\s*\);?/g,
      'await getCurrentUser(request)'
    );
    
    return content;
  }

  /**
   * Fix getDb() calls to use createClient(user)
   */
  private fixGetDbCalls(content: string, config: CustomRouteConfig): string {
    // First, ensure we have user variable available
    const hasUserVar = content.includes('const user = await getCurrentUser') || 
                       content.includes('const currentUser = await getCurrentUser');
    
    // Remove getDb import if present
    content = content.replace(
      /import\s*{\s*getDb\s*}\s*from\s*['"]@\/lib\/db['"];?\n?/g,
      ''
    );
    
    // Pattern 1: const db = await getDb();
    if (hasUserVar) {
      // Use existing user variable
      content = content.replace(
        /const\s+db\s*=\s*await\s+getDb\(\s*\);?/g,
        (match) => {
          if (content.includes('const currentUser = await getCurrentUser')) {
            return 'const db = createClient(currentUser);';
          }
          return 'const db = createClient(user);';
        }
      );
    } else if (config.requiresAuth) {
      // User will be added by addAuthCheck, so use 'user' variable name
      content = content.replace(
        /const\s+db\s*=\s*await\s+getDb\(\s*\);?/g,
        'const db = createClient(user);'
      );
    } else {
      // No auth required, but still need user context for ZenStack
      // Use system user
      content = content.replace(
        /const\s+db\s*=\s*await\s+getDb\(\s*\);?/g,
        `const systemUser: AuthUser = {
      id: 'xronr0y2ule1my2abd0wfulc',
      email: 'system@tigerpalacepro.com',
      name: 'System Admin',
      role: 'ADMIN',
    };
    const db = createClient(systemUser);`
      );
    }
    
    // Pattern 2: db = await getDb();
    content = content.replace(
      /db\s*=\s*await\s+getDb\(\s*\);?/g,
      'db = createClient(user);'
    );
    
    return content;
  }

  /**
   * Fix createClient() calls to use user context
   */
  private fixCreateClientCalls(content: string, config: CustomRouteConfig): string {
    // First, fix getCurrentUser() calls that don't have request parameter
    // Pattern: const user = await getCurrentUser();
    content = content.replace(
      /const\s+user\s*=\s*await\s+getCurrentUser\(\s*\);?/g,
      'const user = await getCurrentUser(request);'
    );
    
    // Pattern: const currentUser = await getCurrentUser();
    content = content.replace(
      /const\s+currentUser\s*=\s*await\s+getCurrentUser\(\s*\);?/g,
      'const currentUser = await getCurrentUser(request);'
    );
    
    // Fix createClient(null) or createClient(null as any) - use system user instead
    content = content.replace(
      /createClient\(\s*null\s*(as\s+any)?\s*\)/g,
      `createClient({
      id: 'xronr0y2ule1my2abd0wfulc',
      email: 'system@tigerpalacepro.com',
      name: 'System Admin',
      role: 'ADMIN',
    } as AuthUser)`
    );
    
    // Pattern 1: const db = createClient();
    // First, ensure we have user variable available
    const hasUserVar = content.includes('const user = await getCurrentUser') || 
                       content.includes('const currentUser = await getCurrentUser');
    
    if (!hasUserVar && config.requiresAuth) {
      // User will be added by addAuthCheck, so use 'user' variable name
      content = content.replace(
        /const\s+db\s*=\s*createClient\(\s*\);?/g,
        'const db = createClient(user);'
      );
    } else if (hasUserVar) {
      // Use existing user variable
      content = content.replace(
        /const\s+db\s*=\s*createClient\(\s*\);?/g,
        (match) => {
          if (content.includes('const currentUser = await getCurrentUser')) {
            return match.replace('createClient()', 'createClient(currentUser)');
          }
          return match.replace('createClient()', 'createClient(user)');
        }
      );
    } else {
      // No auth required, but still need user context for ZenStack
      // Use system user or minimal user context
      content = content.replace(
        /const\s+db\s*=\s*createClient\(\s*\);?/g,
        `const systemUser: AuthUser = {
      id: 'xronr0y2ule1my2abd0wfulc',
      email: 'system@tigerpalacepro.com',
      name: 'System Admin',
      role: 'ADMIN',
    };
    const db = createClient(systemUser);`
      );
    }

    // Pattern 2: db = createClient();
    content = content.replace(
      /db\s*=\s*createClient\(\s*\);?/g,
      'db = createClient(user);'
    );

    return content;
  }

  /**
   * Check if route has proper authentication check
   */
  private hasProperAuthCheck(content: string, config: CustomRouteConfig): boolean {
    if (config.requiresAdmin) {
      return (content.includes('getCurrentUser(request)') || content.includes('getCurrentUser()')) && 
             (content.includes("role !== 'ADMIN'") || 
              content.includes('validateAdmin') ||
              content.includes('Admin access required'));
    }
    return content.includes('getCurrentUser(request)') || content.includes('getCurrentUser()') || content.includes('getServerSession');
  }

  /**
   * Add authentication check to route
   */
  private addAuthCheck(content: string, config: CustomRouteConfig): string {
    // Find the first export async function
    const functionMatch = content.match(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\([^)]*\)\s*\{/);
    if (!functionMatch) return content;

    const insertPos = functionMatch.index! + functionMatch[0].length;
    const indent = '  ';

    let authCheck = '';
    if (config.requiresAdmin) {
      authCheck = `
${indent}try {
${indent}  const user = await getCurrentUser(request);
${indent}  if (!user) {
${indent}    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
${indent}  }
${indent}
${indent}  if (user.role !== 'ADMIN' && user.role !== 'MODERATOR') {
${indent}    return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
${indent}  }

${indent}  // Create database client with user context for access control
${indent}  const db = createClient(user);
`;
    } else {
      authCheck = `
${indent}try {
${indent}  const user = await getCurrentUser(request);
${indent}  if (!user) {
${indent}    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
${indent}  }

${indent}  // Create database client with user context for access control
${indent}  const db = createClient(user);
`;
    }

    return content.slice(0, insertPos) + authCheck + content.slice(insertPos);
  }

  /**
   * Generate templates for future custom routes
   */
  private async generateTemplates(): Promise<void> {
    console.log('\n📝 Generating templates for custom routes...');

    const templatesDir = join(this.projectRoot, 'plugins/templates/custom-routes');
    if (!existsSync(templatesDir)) {
      const { mkdirSync } = await import('fs');
      mkdirSync(templatesDir, { recursive: true });
    }

    // Admin route template
    const adminTemplate = this.generateAdminRouteTemplate();
    writeFileSync(join(templatesDir, 'admin-route.ts.template'), adminTemplate);

    // QTech route template
    const qtechTemplate = this.generateQTechRouteTemplate();
    writeFileSync(join(templatesDir, 'qtech-route.ts.template'), qtechTemplate);

    // Webhook route template
    const webhookTemplate = this.generateWebhookRouteTemplate();
    writeFileSync(join(templatesDir, 'webhook-route.ts.template'), webhookTemplate);

    console.log('   ✅ Templates generated');
  }

  /**
   * Generate admin route template
   */
  private generateAdminRouteTemplate(): string {
    return `import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import type { AuthUser } from '@/lib/auth';

/**
 * Admin Route Template
 * Auto-generated by CustomRouteGenerator
 * 
 * This template ensures proper user context and admin authorization
 */

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Admin authorization check
    if (user.role !== 'ADMIN' && user.role !== 'MODERATOR') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Create database client with user context for access control
    const db = createClient(user);

    // TODO: Implement route logic here
    const { searchParams } = new URL(request.url);
    
    // Example: Fetch data
    // const data = await db.model.findMany();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Admin authorization check
    if (user.role !== 'ADMIN' && user.role !== 'MODERATOR') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Create database client with user context for access control
    const db = createClient(user);

    // TODO: Implement route logic here
    const body = await request.json();
    
    // Example: Create data
    // const result = await db.model.create({ data: body });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Admin route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
`;
  }

  /**
   * Generate QTech route template
   */
  private generateQTechRouteTemplate(): string {
    return `import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import type { AuthUser } from '@/lib/auth';
import { qtechStaticProxy } from '@/lib/services/qtech-static-proxy';

/**
 * QTech Route Template
 * Auto-generated by CustomRouteGenerator
 * 
 * This template ensures proper user context and QTech proxy usage
 */

export async function GET(request: NextRequest) {
  try {
    // Optional: Check authentication for premium features
    const user = await getCurrentUser(request);

    const { searchParams } = new URL(request.url);
    
    // Build query parameters for QTech API
    const qtechParams: Record<string, string> = {};
    
    // TODO: Extract query parameters
    // const provider = searchParams.get('provider');
    // if (provider) qtechParams.provider_id = provider;

    // Fetch from QTech API with proxy
    const result = await qtechStaticProxy.getGames(qtechParams);

    if (!result.success) {
      console.error('❌ Failed to fetch from QTech:', result.error);
      return NextResponse.json(
        {
          error: result.error || 'Failed to fetch from QTech',
          details: 'QTech API error',
        },
        { status: result.statusCode || 500 }
      );
    }

    // If database access is needed, use user context
    if (user) {
      const db = createClient(user);
      // TODO: Use database if needed
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error: any) {
    console.error('❌ QTech route error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process QTech request',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check for write operations
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Create database client with user context
    const db = createClient(user);

    const body = await request.json();
    
    // TODO: Implement QTech write operation
    // Example: Call QTech API via proxy
    // const result = await qtechStaticProxy.postData(endpoint, body);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    console.error('❌ QTech route error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process QTech request',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
`;
  }

  /**
   * Generate webhook route template
   */
  private generateWebhookRouteTemplate(): string {
    return `import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db';
import type { AuthUser } from '@/lib/auth';

/**
 * Webhook Route Template
 * Auto-generated by CustomRouteGenerator
 * 
 * Webhooks typically use system user context or signature verification
 */

export async function POST(request: NextRequest) {
  try {
    // Webhook signature verification (if required)
    // const signature = request.headers.get('x-webhook-signature');
    // if (!verifySignature(signature, body)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    // For webhooks, use system user context if database access is needed
    const systemUser: AuthUser = {
      id: 'xronr0y2ule1my2abd0wfulc',
      email: 'system@tigerpalacepro.com',
      name: 'System Admin',
      role: 'ADMIN',
    };
    const db = createClient(systemUser);

    const body = await request.json();
    
    // TODO: Process webhook payload
    // Example: Update database based on webhook data
    // await db.model.update({ where: { id: body.id }, data: body });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process webhook',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
`;
  }
}

// CLI entry point
if (require.main === module) {
  const generator = new CustomRouteGenerator();
  generator.generate()
    .then(({ fixed, warnings, errors }) => {
      process.exit(errors > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('❌ Generation failed:', error);
      process.exit(1);
    });
}

