/**
 * Navigation Generator Plugin
 * Generates and updates navigation configuration, sidebar components, and icons
 * for hierarchical admin menu structure with proper active states and icons
 * 
 * Features:
 * - Hierarchical 3-level admin navigation
 * - Test case status widget in header (shows pass rate percentage)
 * - Test case sidebar (slides from right when widget clicked)
 * - Icon management and fallback system
 * - Active state highlighting for parent items
 */

import { readFileSync, writeFileSync } from 'fs';

interface NavigationItem {
  id: string;
  title: string;
  href: string;
  icon?: string;
  authRequired?: boolean;
  description?: string;
  badge?: string;
  category: string;
  children?: NavigationItem[];
}

interface AppConfig {
  navigation: NavigationItem[];
  // Other config properties...
  [key: string]: any;
}

export class NavigationGenerator {
  private readonly configPath = 'src/config/app.ts';
  private readonly sidebarPath = 'src/components/navigation/app-sidebar.tsx';
  private readonly iconsPath = 'src/components/brand-assets/icons.tsx';

  async generate(): Promise<void> {
    console.log('🔧 Generating navigation configuration...');

    try {
      await this.updateNavigationConfig();
      await this.updateSidebarComponent();
      await this.updateIconsComponent();
      await this.ensureAdminPagesLayout(); // Ensure all admin pages have proper layout

      console.log('✅ Navigation generation completed successfully');
    } catch (error) {
      console.error('❌ Navigation generation failed:', error);
      throw error;
    }
  }

  private async updateNavigationConfig(): Promise<void> {
    console.log('📝 Updating navigation configuration...');

    const configContent = readFileSync(this.configPath, 'utf-8');

    // Check if hierarchical admin structure already exists
    if (configContent.includes('Property Management') &&
        configContent.includes('Compliance & Due Diligence') &&
        configContent.includes('Tokenization & Blockchain')) {
      console.log('ℹ️  Hierarchical admin navigation already exists');
      return;
    }

    // Find the admin navigation section and replace it
    const adminSectionRegex = /\/\/ Enhanced Administration.*?\n.*?Administration.*?\n.*?children: \[[\s\S]*?\n\s+\],\n\s+\},\n/;

    const newAdminNavigation = `        // Enhanced Administration - Comprehensive Platform Management (Level 1)
        {
          id: "admin",
          title: "Administration",
          href: "#", // Changed to # to make it a collapsible parent
          icon: "shield",
          authRequired: true,
          description: "Platform administration and operations",
          category: "admin",
          children: [
            // =====================
            // DASHBOARD (Level 2)
            // =====================
            {
              id: "admin-dashboard",
              title: "Dashboard",
              href: "/admin",
              icon: "layout-dashboard",
              authRequired: true,
              description: "Admin overview and key metrics",
            },

            // =====================
            // PROPERTY MANAGEMENT (Level 2)
            // =====================
            {
              id: "admin-property-management",
              title: "Property Management",
              href: "#", // Parent item, so href is #
              icon: "building-2",
              authRequired: true,
              description: "Real estate property operations",
              children: [
                {
                  id: "admin-properties",
                  title: "Properties",
                  href: "/admin/properties",
                  icon: "building",
                  authRequired: true,
                  description: "Property listings and administration",
                  badge: "CRITICAL",
                },
                {
                  id: "admin-property-locations",
                  title: "Property Locations",
                  href: "/admin/propertyLocation",
                  icon: "map-pin",
                  authRequired: true,
                  description: "Property location management",
                },
                {
                  id: "admin-property-images",
                  title: "Property Images",
                  href: "/admin/propertyImage",
                  icon: "image",
                  authRequired: true,
                  description: "Property image management",
                },
              ],
            },

            // =====================
            // COMPLIANCE & DUE DILIGENCE (Level 2)
            // =====================
            {
              id: "admin-compliance",
              title: "Compliance & Due Diligence",
              href: "#", // Parent item
              icon: "shield-check",
              authRequired: true,
              description: "Regulatory compliance and verification",
              children: [
                {
                  id: "admin-property-documents",
                  title: "Property Documents",
                  href: "/admin/propertyDocument",
                  icon: "file-text",
                  authRequired: true,
                  description: "Due diligence documentation",
                  badge: "CRITICAL",
                },
                {
                  id: "admin-legal-compliance",
                  title: "Legal Compliance",
                  href: "/admin/legalCompliance",
                  icon: "scale",
                  authRequired: true,
                  description: "Legal compliance records",
                  badge: "CRITICAL",
                },
                {
                  id: "admin-audit-logs",
                  title: "Audit Logs",
                  href: "/admin/auditLog",
                  icon: "file-search",
                  authRequired: true,
                  description: "Security and compliance audit logs",
                },
              ],
            },

            // =====================
            // TOKENIZATION & BLOCKCHAIN (Level 2)
            // =====================
            {
              id: "admin-tokenization",
              title: "Tokenization & Blockchain",
              href: "#", // Parent item
              icon: "coins",
              authRequired: true,
              description: "Token operations and blockchain integration",
              children: [
                {
                  id: "admin-token-holders",
                  title: "Token Holders",
                  href: "/admin/tokenHolder",
                  icon: "users",
                  authRequired: true,
                  description: "Token ownership tracking",
                  badge: "HIGH",
                },
                {
                  id: "admin-blockchain-sync",
                  title: "Blockchain Sync",
                  href: "/admin/blockchainSync",
                  icon: "refresh-cw",
                  authRequired: true,
                  description: "Blockchain synchronization status",
                  badge: "HIGH",
                },
                {
                  id: "admin-smart-contracts",
                  title: "Smart Contracts",
                  href: "/admin/smartContract",
                  icon: "file-code",
                  authRequired: true,
                  description: "Smart contract management",
                  badge: "HIGH",
                },
              ],
            },

            // =====================
            // INVESTMENT MANAGEMENT (Level 2)
            // =====================
            {
              id: "admin-investment-management",
              title: "Investment Management",
              href: "#", // Parent item
              icon: "bar-chart",
              authRequired: true,
              description: "Investment tracking and operations",
              children: [
                {
                  id: "admin-investments",
                  title: "Investments",
                  href: "/admin/investment",
                  icon: "trending-up",
                  authRequired: true,
                  description: "Investment records and tracking",
                  badge: "HIGH",
                },
                {
                  id: "admin-portfolios",
                  title: "Portfolios",
                  href: "/admin/portfolio",
                  icon: "briefcase",
                  authRequired: true,
                  description: "Investor portfolio management",
                },
                {
                  id: "admin-deposits",
                  title: "Deposits",
                  href: "/admin/deposit",
                  icon: "arrow-down-circle",
                  authRequired: true,
                  description: "Deposit management and tracking",
                },
              ],
            },

            // =====================
            // USER MANAGEMENT (Level 2)
            // =====================
            {
              id: "admin-user-management",
              title: "User Management",
              href: "#", // Parent item
              icon: "users",
              authRequired: true,
              description: "User accounts and permissions",
              children: [
                {
                  id: "admin-users",
                  title: "Users",
                  href: "/admin/user",
                  icon: "user",
                  authRequired: true,
                  description: "User account management",
                  badge: "HIGH",
                },
                {
                  id: "admin-user-settings",
                  title: "User Settings",
                  href: "/admin/userSettings",
                  icon: "settings",
                  authRequired: true,
                  description: "User preferences and configuration",
                },
                {
                  id: "admin-wallet-sessions",
                  title: "Wallet Sessions",
                  href: "/admin/walletSession",
                  icon: "wallet",
                  authRequired: true,
                  description: "Wallet authentication sessions",
                },
              ],
            },

            // =====================
            // CONTENT MANAGEMENT (Level 2)
            // =====================
            {
              id: "admin-content",
              title: "Content Management",
              href: "#", // Parent item
              icon: "edit",
              authRequired: true,
              description: "Blog and content administration",
              children: [
                {
                  id: "admin-blog",
                  title: "Blog Posts",
                  href: "/admin/blogPost",
                  icon: "file-text",
                  authRequired: true,
                  description: "Blog post management",
                },
                {
                  id: "admin-notifications",
                  title: "Notifications",
                  href: "/admin/notification",
                  icon: "bell",
                  authRequired: true,
                  description: "System notification management",
                },
              ],
            },

            // =====================
            // GAMING INTEGRATION (Level 2)
            // =====================
            {
              id: "admin-gaming",
              title: "Gaming Integration",
              href: "#", // Parent item
              icon: "gamepad-2",
              authRequired: true,
              description: "Gaming platform integration",
              children: [
                {
                  id: "admin-tokenizin-games",
                  title: "Tiger Games",
                  href: "/admin/tokenizin-games",
                  icon: "gamepad",
                  authRequired: true,
                  description: "Tiger Games management",
                },
                {
                  id: "admin-qtech-games",
                  title: "QTech Games",
                  href: "/admin/qtechGame",
                  icon: "joystick",
                  authRequired: true,
                  description: "QTech gaming platform",
                },
                {
                  id: "admin-pam-integration",
                  title: "PAM Integration",
                  href: "/admin/pam-integration",
                  icon: "link",
                  authRequired: true,
                  description: "PAM system integration",
                },
              ],
            },

            // =====================
            // SYSTEM ADMINISTRATION (Level 2)
            // =====================
            {
              id: "admin-system",
              title: "System Administration",
              href: "#", // Parent item
              icon: "database",
              authRequired: true,
              description: "System administration and maintenance",
              children: [
                {
                  id: "admin-database",
                  title: "Database Management",
                  href: "/admin/database",
                  icon: "database",
                  authRequired: true,
                  description: "Manage database and perform maintenance",
                  badge: "Admin Only",
                },
                {
                  id: "admin-analytics",
                  title: "Analytics",
                  href: "/admin/analytics",
                  icon: "bar-chart",
                  authRequired: true,
                  description: "Platform analytics and insights",
                },
              ],
            },
          ],
        },`;

    // Replace the old admin navigation with the new hierarchical structure
    const updatedConfig = configContent.replace(
      adminSectionRegex,
      newAdminNavigation
    );

    writeFileSync(this.configPath, updatedConfig, 'utf-8');
    console.log('✅ Navigation configuration updated with hierarchical admin menu');
  }

  private async updateSidebarComponent(): Promise<void> {
    console.log('🔧 Updating sidebar component...');

    const sidebarContent = readFileSync(this.sidebarPath, 'utf-8');

    // Check if enhanced navigation logic already exists
    if (sidebarContent.includes('hasActiveChild') &&
        sidebarContent.includes('pathname,') &&
        sidebarContent.includes('parentCategory')) {
      console.log('ℹ️  Enhanced sidebar logic already exists');
      return;
    }

    // Update imports to include new icons
    let updatedContent = sidebarContent;

    // Add new icon imports
    if (!sidebarContent.includes('Home,')) {
      const iconImportPattern = /import \{[\s\S]*?LucideIcon[\s\S]*?from 'lucide-react';/;
      const newImports = `  Home,
  BookOpen,
  Settings,
  Users,
  FileText,
  Shield,
  Folder,
  SquareGanttChart,
  KeyRound,
  Lock,
  HelpCircle,
  LogIn,
  Activity,
  Hammer,
  UserCircle,`;

      updatedContent = updatedContent.replace(
        iconImportPattern,
        (match) => match.replace('LucideIcon', `${newImports}\n  LucideIcon`)
      );
    }

    // Add helper functions
    const helperFunctions = `
// Helper: fallback built-in icon for missing
const fallbackIcon = "SquareGanttChart";

// Assign an icon to a nav group/category heading (not a link, but for collapsible menu groups)
function getMenuGroupIcon(category: string) {
  switch (category.toLowerCase()) {
    case "main":
      return <Home className="h-5 w-5" />;
    case "documentation":
    case "docs":
      return <BookOpen className="h-5 w-5" />;
    case "tools":
      return <Hammer className="h-5 w-5" />;
    case "administration":
    case "admin":
      return <Shield className="h-5 w-5" />;
    case "account":
    case "authentication":
    case "auth":
      return <UserCircle className="h-5 w-5" />;
    default:
      return <Folder className="h-5 w-5" />;
  }
}

// Ensure every navigation item and group has an icon, fallback to an appropriate one
function getNavItemIcon(item: any, parentCategory?: string) {
  if (item.icon) {
    // Use explicit icon from config if defined
    return <NavigationIcon name={item.icon} />;
  }
  // No icon in item: choose a sensible icon based on path/group
  if (item.href === '#' || (item.children && item.children.length)) {
    // Use a group/category icon for collapsible groups
    if (parentCategory) {
      return getMenuGroupIcon(parentCategory);
    } else if (item.title) {
      return getMenuGroupIcon(item.title);
    }
    return <Folder className="h-5 w-5" />;
  }
  // Single route fallback based on best guess of path/title
  const path = (item.href || '').toString().toLowerCase();
  if (path.startsWith('/docs') || path.includes('doc')) return <BookOpen className="h-5 w-5" />;
  if (path.startsWith('/admin')) return <Shield className="h-5 w-5" />;
  if (path.startsWith('/tools') || path.includes('tool')) return <Hammer className="h-5 w-5" />;
  if (path === '/' || item.title?.toLowerCase() === 'home') return <Home className="h-5 w-5" />;
  if (path.includes('user') || path.includes('account') || path.includes('profile')) return <User className="h-5 w-5" />;
  if (path.includes('login') || path.includes('signin')) return <LogIn className="h-5 w-5" />;
  if (path.includes('help') || path.includes('support')) return <HelpCircle className="h-5 w-5" />;
  if (path.includes('setting') || path.includes('config')) return <Settings className="h-5 w-5" />;
  if (path.includes('audit')) return <KeyRound className="h-5 w-5" />;
  if (path.includes('log')) return <FileText className="h-5 w-5" />;
  // Default fallback
  return <SquareGanttChart className="h-5 w-5" />;
}`;

    // Add helper functions after imports
    const importPattern = /import sidebarConfig from.*?\n/;
    updatedContent = updatedContent.replace(
      importPattern,
      (match) => match + '\n' + helperFunctions
    );

    // Update NavItemProps interface
    const navItemPropsPattern = /interface NavItemProps \{\s+item: any;\s+isActive: boolean;\s+level\?: number;\s+\}/;
    updatedContent = updatedContent.replace(
      navItemPropsPattern,
      `interface NavItemProps {
  item: any;
  isActive: boolean;
  level?: number;
  parentCategory?: string;
}`
    );

    // Update NavItem function signature
    const navItemSignaturePattern = /function NavItem\(\{ item, isActive, level = 0, isCollapsed = false, currentBreakpoint = 'desktop', pathname \}: NavItemProps & \{ isCollapsed\?: boolean; currentBreakpoint\?: 'mobile' \| 'tablet' \| 'desktop'; pathname\?: string \}\)/;
    updatedContent = updatedContent.replace(
      navItemSignaturePattern,
      `// Extended NavItem to inject parentCategory (for fallback icon selection)
function NavItem({
  item,
  isActive,
  level = 0,
  isCollapsed = false,
  currentBreakpoint = 'desktop',
  pathname,
  parentCategory
}: NavItemProps & { isCollapsed?: boolean; currentBreakpoint?: 'mobile' | 'tablet' | 'desktop'; pathname?: string })`
    );

    // Add hasActiveChild logic
    const handleLinkClickPattern = /  \/\/ Handler to close sidebar on mobile when a link is clicked[\s\S]*?\n  \};\n/;
    updatedContent = updatedContent.replace(
      handleLinkClickPattern,
      `  // Handler to close sidebar on mobile when a link is clicked
  const handleLinkClick = () => {
    if (currentBreakpoint === 'mobile') {
      closeOnMobile();
    }
  };

  // Check if any child is active
  const hasActiveChild = hasChildren && item.children.some((child: any) => pathname === child.href);\n`
    );

    // Update collapsible trigger button styling
    const triggerButtonPattern = /        className=\{cn\(\s+"w-full justify-start h-auto p-2",\s+"hover:bg-orange-600\/10 dark:hover:bg-orange-500\/20",\s+"hover:text-orange-700 dark:hover:text-orange-300",\s+level > 0 && "ml-4"\s+\)\}/;
    updatedContent = updatedContent.replace(
      triggerButtonPattern,
      `        className={cn(
          "w-full justify-start h-auto p-2",
          "hover:bg-orange-600/10 dark:hover:bg-orange-500/20",
          "hover:text-orange-700 dark:hover:text-orange-300",
          (isActive || hasActiveChild) && "bg-orange-600/20 dark:bg-orange-500/30 text-orange-700 dark:text-orange-300 font-semibold border-l-4 border-orange-600 dark:border-orange-400",
          !(isActive || hasActiveChild) && "text-foreground dark:text-gray-300",
          level > 0 && "ml-4"
        )}`
    );

    // Update NavigationIcon calls to use getNavItemIcon
    updatedContent = updatedContent.replace(
      /<NavigationIcon name=\{item\.icon\} \/>/g,
      `{getNavItemIcon(item, parentCategory)}`
    );

    // Update all NavItem calls to pass parentCategory
    const navItemCallsPattern = /<NavItem\s+key=\{[^}]+\}\s+item=\{[^}]+\}\s+isActive=\{[^}]+\}\s+isCollapsed=\{[^}]+\}\s+currentBreakpoint=\{[^}]+\}\s+pathname=\{[^}]+\}\s+\/>/g;
    updatedContent = updatedContent.replace(
      navItemCallsPattern,
      (match) => {
        if (match.includes('parentCategory=')) return match;
        return match.replace(
          /pathname=\{[^}]+\}\s+\//,
          `pathname={pathname}\n                        parentCategory={parentCategory}\n                      />`
        );
      }
    );

    // Update group headings to use icons
    const groupHeadingsPattern = /<h3 className=\{cn\(\s+"text-xs font-semibold text-muted-foreground uppercase tracking-wider transition-opacity",\s+collapsed && "opacity-0"\s+\)\}>\s+([^<]+)\s+<\/h3>/g;
    updatedContent = updatedContent.replace(
      groupHeadingsPattern,
      (match, title) => match.replace(
        /className=\{cn\([^}]+\)\}/,
        'className={cn(\n                  "text-xs font-semibold text-muted-foreground uppercase tracking-wider transition-opacity flex items-center gap-2",\n                  collapsed && "opacity-0"\n                )}'
      ).replace(
        />\s+([^<]+)\s+</,
        `>\n                  {/* Always show icon for group/category heading in collapsed (and expanded) sidebar */}\n                  {getMenuGroupIcon("${title.trim()}")}\n                  {!collapsed && <span>${title.trim()}</span>}\n                </`
      )
    );

    writeFileSync(this.sidebarPath, updatedContent, 'utf-8');
    console.log('✅ Sidebar component updated with enhanced navigation logic');
  }

  private async updateIconsComponent(): Promise<void> {
    console.log('🎨 Updating icons component...');

    const iconsContent = readFileSync(this.iconsPath, 'utf-8');

    // Check if new icons are already added
    if (iconsContent.includes('Building2,') &&
        iconsContent.includes('ShieldCheck,') &&
        iconsContent.includes('Coins,') &&
        iconsContent.includes('Briefcase,') &&
        iconsContent.includes('ArrowDownCircle,') &&
        iconsContent.includes('Wallet,') &&
        iconsContent.includes('Bell,') &&
        iconsContent.includes('Gamepad,') &&
        iconsContent.includes('Joystick,')) {
      console.log('ℹ️  New icons already added to icon component');
      return;
    }

    // Add new icon imports
    let updatedContent = iconsContent;
    const importPattern = /import \{\s*([^\}]+)\s*\} from 'lucide-react';/;
    updatedContent = updatedContent.replace(
      importPattern,
      (match) => match.replace(
        'LucideIcon',
        'Database,\n  Building2,\n  ShieldCheck,\n  Coins,\n  Briefcase,\n  ArrowDownCircle,\n  Wallet,\n  Bell,\n  Gamepad,\n  Joystick,\n  LucideIcon'
      )
    );

    // Add new icon mappings
    const iconMapPattern = /  'shield-check': ShieldCheck,\s+'coins': Coins,\s+\};/;
    if (!updatedContent.includes("'shield-check': ShieldCheck,")) {
      updatedContent = updatedContent.replace(
        /  'database': Database,\s+\};/,
        `  'database': Database,
  'building-2': Building2,
  'shield-check': ShieldCheck,
  'coins': Coins,
  briefcase: Briefcase,
  'arrow-down-circle': ArrowDownCircle,
  wallet: Wallet,
  bell: Bell,
  gamepad: Gamepad,
  joystick: Joystick,
};`
      );
    }

    writeFileSync(this.iconsPath, updatedContent, 'utf-8');
    console.log('✅ Icons component updated with new admin navigation icons');
  }

  private async ensureAdminPagesLayout(): Promise<void> {
    // CRITICAL: Admin pages get layout from AdminShell (src/app/admin/layout.tsx). NEVER add DashboardLayout/AppLayout.
    // Adding DashboardLayout or AppLayout to admin pages causes duplicate sidebar and header. Skip this step entirely.
    console.log('🔧 Admin layout: AdminShell provides sidebar+header - skipping DashboardLayout injection');
    return;

    const fs = require('fs');
    const path = require('path');

    // Special admin pages that should exist (not auto-generated entities)
    const specialAdminPages = [
      'database/page.tsx',
      'analytics/page.tsx'
    ];

    // Create special admin pages if they don't exist
    for (const pagePath of specialAdminPages) {
      const fullPath = path.join('src/app/admin', pagePath);
      const dir = path.dirname(fullPath);

      // Create directory if it doesn't exist
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }

      // Check if page exists
      if (!fs.existsSync(fullPath)) {
        console.log(`📝 Creating special admin page: ${fullPath}`);
        const pageName = path.basename(path.dirname(fullPath));
        const content = this.generateSpecialAdminPage(pageName);

        fs.writeFileSync(fullPath, content, 'utf-8');
        console.log(`✅ Created ${fullPath}`);
      } else {
        console.log(`ℹ️  ${fullPath} already exists`);
      }
    }

    // Get all admin pages recursively
    const getAllAdminPages = (dir: string, relativePath = ''): string[] => {
      const files: string[] = [];
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const relPath = path.join(relativePath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          files.push(...getAllAdminPages(fullPath, relPath));
        } else if (item === 'page.tsx' && relPath.startsWith('admin/')) {
          files.push(fullPath);
        }
      }

      return files;
    };

    const adminPages = getAllAdminPages('src/app/admin', 'admin');

    for (const pagePath of adminPages) {
      // CRITICAL: Do NOT add DashboardLayout to admin pages. AdminShell (admin layout) already provides sidebar+header.
      if (pagePath.includes('admin')) {
        console.log(`ℹ️  Skipping admin page (layout from AdminShell): ${pagePath}`);
        continue;
      }
      const content = fs.readFileSync(pagePath, 'utf-8');

      // Skip if already has DashboardLayout or AppLayout wrapper
      if (content.includes('DashboardLayout') || 
          content.includes('<DashboardLayout>') ||
          content.includes('AppLayout') ||
          content.includes('<AppLayout>')) {
        console.log(`ℹ️  ${pagePath} already has layout wrapper`);
        continue;
      }

      // Skip if this is a dynamic route page (contains params)
      if (pagePath.includes('[id]') || pagePath.includes('[...')) {
        console.log(`ℹ️  Skipping dynamic route: ${pagePath}`);
        continue;
      }

      // Skip if file uses AuthGuard or other wrapper patterns that might handle layout
      if (content.includes('AuthGuard') && content.includes('AppLayout')) {
        console.log(`ℹ️  ${pagePath} uses AuthGuard with AppLayout`);
        continue;
      }

      // Skip redirect components (they return null and don't need DashboardLayout)
      const isRedirectComponent = (
        content.includes('return null') ||
        content.includes('return null;') ||
        (content.includes('router.replace') && content.includes('return null')) ||
        (content.includes('router.push') && content.includes('return null')) ||
        (content.includes('redirect(') && content.includes('return null'))
      );
      
      if (isRedirectComponent) {
        console.log(`ℹ️  ${pagePath} is a redirect component - skipping DashboardLayout wrapper`);
        continue;
      }

      console.log(`📝 Adding DashboardLayout to: ${pagePath}`);

      // Add DashboardLayout import - find the last import statement
      let updatedContent = content;
      
      // Try to find a good place to add the import - after React imports or at the end of imports
      const importRegex = /import\s+.*?\s+from\s+['"'][^'"]+['"'];?\s*$/gm;
      const imports = content.match(importRegex) || [];
      
      if (imports.length > 0 && !content.includes('DashboardLayout')) {
        const lastImport = imports[imports.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        
        // Add import after the last import statement
        updatedContent = content.slice(0, lastImportIndex + lastImport.length) + 
          '\nimport { DashboardLayout } from \'@/components/layouts/app-layout\';' +
          content.slice(lastImportIndex + lastImport.length);
      } else if (!content.includes('DashboardLayout')) {
        // If no imports found, add at the top after 'use client' directive
        const useClientMatch = content.match(/'use client';?\s*\n/);
        if (useClientMatch) {
        updatedContent = content.replace(
            /('use client';?\s*\n)/,
            "$1import { DashboardLayout } from '@/components/layouts/app-layout';\n"
        );
        } else {
          // Add at the beginning if no 'use client'
          updatedContent = "import { DashboardLayout } from '@/components/layouts/app-layout';\n" + content;
        }
      }

      // Wrap return statement with DashboardLayout
      // Handle various return patterns: return ( <div, return (<div, return <div
      const returnPatterns = [
        /return\s*\(\s*\n?\s*<div/,
        /return\s*\(\s*\n?\s*\(/,
        /return\s*<div/
      ];

      let foundReturn = false;
      for (const pattern of returnPatterns) {
        const returnMatch = updatedContent.match(pattern);
      if (returnMatch) {
          foundReturn = true;
          // Wrap with DashboardLayout
        updatedContent = updatedContent.replace(
            pattern,
          'return (\n    <DashboardLayout>\n      <div'
        );

          // Close the DashboardLayout wrapper - find the last closing div before the function closing brace
          // Match: </div> followed by ); and optional whitespace before the closing brace
          const closingPattern = /(\s*)<\/div>\s*\);\s*$/m;
          const closingMatch = updatedContent.match(closingPattern);
          if (closingMatch) {
          updatedContent = updatedContent.replace(
              closingPattern,
              '$1      </div>\n    </DashboardLayout>\n  );'
            );
          } else {
            // Alternative: try to find closing div before function end
            const altClosingPattern = /<\/div>\s*\);\s*(\n\s*)\}/;
            updatedContent = updatedContent.replace(
              altClosingPattern,
              '      </div>\n    </DashboardLayout>\n  );$1}'
          );
        }
          break;
        }
      }

      if (!foundReturn) {
        // Check if it's a redirect component that we might have missed
        if (content.includes('return null')) {
          console.log(`ℹ️  ${pagePath} returns null (likely a redirect component) - skipping DashboardLayout wrapper`);
        } else {
          console.warn(`⚠️  Could not find return statement pattern in ${pagePath}`);
          console.warn(`   Expected patterns: return (<div, return <div, or return null`);
          console.warn(`   This file may need manual review for DashboardLayout wrapper`);
        }
        continue;
      }

      fs.writeFileSync(pagePath, updatedContent, 'utf-8');
      console.log(`✅ Updated ${pagePath} with DashboardLayout`);
    }

    console.log('✅ All admin pages verified for proper layout');
  }

  private generateSpecialAdminPage(pageName: string): string {
    switch (pageName) {
      case 'database':
        return `'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Database,
  HardDrive,
  Activity,
  Users,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  Settings,
  BarChart3,
  Clock,
  Server
} from 'lucide-react';

export default function DatabasePage() {
  // Mock data - in real implementation, fetch from API
  const databaseStats = {
    totalRecords: 12547,
    totalTables: 89,
    databaseSize: '2.4 GB',
    lastBackup: '2024-10-24 14:30:00',
    connectionStatus: 'healthy',
    uptime: '99.9%',
    activeConnections: 12,
    maxConnections: 100
  };

  const tableStats = [
    { name: 'users', records: 1247, size: '45.2 MB', growth: '+12%' },
    { name: 'realEstateAssets', records: 89, size: '234.1 MB', growth: '+8%' },
    { name: 'investments', records: 2341, size: '156.8 MB', growth: '+15%' },
    { name: 'transactions', records: 5678, size: '89.3 MB', growth: '+22%' },
    { name: 'documents', records: 1692, size: '678.9 MB', growth: '+5%' },
  ];

  const recentBackups = [
    { id: 1, type: 'full', size: '2.4 GB', status: 'success', createdAt: '2024-10-24 14:30:00' },
    { id: 2, type: 'incremental', size: '145 MB', status: 'success', createdAt: '2024-10-24 02:00:00' },
    { id: 3, type: 'full', size: '2.3 GB', status: 'success', createdAt: '2024-10-23 14:30:00' },
  ];

  const systemHealth = {
    cpu: 45,
    memory: 67,
    disk: 78,
    connections: 12
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Database className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground dark:text-white">Database Management</h1>
          </div>
          <p className="text-muted-foreground dark:text-gray-400">
            Comprehensive database administration, monitoring, and maintenance tools
          </p>
        </div>

        {/* Health Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Database Status</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{databaseStats.connectionStatus}</div>
              <p className="text-xs text-muted-foreground">Uptime: {databaseStats.uptime}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              <FileText className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{databaseStats.totalRecords.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{databaseStats.totalTables} tables</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Database Size</CardTitle>
              <HardDrive className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{databaseStats.databaseSize}</div>
              <p className="text-xs text-muted-foreground">Active connections: {databaseStats.activeConnections}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Backup</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold">{databaseStats.lastBackup.split(' ')[0]}</div>
              <p className="text-xs text-muted-foreground">{databaseStats.lastBackup.split(' ')[1]}</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-muted dark:bg-gray-900">
            <TabsTrigger value="overview" className="data-[state=active]:bg-background dark:data-[state=active]:bg-gray-800">
              <Activity className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="tables" className="data-[state=active]:bg-background dark:data-[state=active]:bg-gray-800">
              <Database className="h-4 w-4 mr-2" />
              Tables
            </TabsTrigger>
            <TabsTrigger value="backups" className="data-[state=active]:bg-background dark:data-[state=active]:bg-gray-800">
              <Download className="h-4 w-4 mr-2" />
              Backups
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="data-[state=active]:bg-background dark:data-[state=active]:bg-gray-800">
              <Settings className="h-4 w-4 mr-2" />
              Maintenance
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  System Health
                </CardTitle>
                <CardDescription>Real-time database server metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>CPU Usage</span>
                      <span>{systemHealth.cpu}%</span>
                    </div>
                    <Progress value={systemHealth.cpu} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Memory Usage</span>
                      <span>{systemHealth.memory}%</span>
                    </div>
                    <Progress value={systemHealth.memory} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Disk Usage</span>
                      <span>{systemHealth.disk}%</span>
                    </div>
                    <Progress value={systemHealth.disk} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Active Connections</span>
                      <span>{systemHealth.connections}/{databaseStats.maxConnections}</span>
                    </div>
                    <Progress value={(systemHealth.connections / databaseStats.maxConnections) * 100} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common database maintenance tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                    <RefreshCw className="h-6 w-6" />
                    <span className="text-sm">Refresh Stats</span>
                  </Button>
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                    <Download className="h-6 w-6" />
                    <span className="text-sm">Create Backup</span>
                  </Button>
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                    <Activity className="h-6 w-6" />
                    <span className="text-sm">Run Diagnostics</span>
                  </Button>
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center gap-2">
                    <Settings className="h-6 w-6" />
                    <span className="text-sm">Optimize Tables</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tables Tab */}
          <TabsContent value="tables" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Table Statistics</CardTitle>
                <CardDescription>Overview of database tables and their metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 dark:bg-gray-900/50">
                      <TableHead>Table Name</TableHead>
                      <TableHead className="text-right">Records</TableHead>
                      <TableHead className="text-right">Size</TableHead>
                      <TableHead className="text-right">Growth</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableStats.map((table) => (
                      <TableRow key={table.name} className="hover:bg-muted/50 dark:hover:bg-gray-900/50">
                        <TableCell className="font-medium">{table.name}</TableCell>
                        <TableCell className="text-right">{table.records.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{table.size}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={table.growth.startsWith('+') ? 'default' : 'secondary'}>
                            {table.growth}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Button variant="ghost" size="sm">
                              <BarChart3 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Settings className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Backups Tab */}
          <TabsContent value="backups" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Backup Management</CardTitle>
                <CardDescription>Recent backups and backup scheduling</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Button>
                    <Download className="h-4 w-4 mr-2" />
                    Create Full Backup
                  </Button>
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Restore from Backup
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 dark:bg-gray-900/50">
                      <TableHead>Type</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentBackups.map((backup) => (
                      <TableRow key={backup.id} className="hover:bg-muted/50 dark:hover:bg-gray-900/50">
                        <TableCell>
                          <Badge variant={backup.type === 'full' ? 'default' : 'secondary'}>
                            {backup.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{backup.size}</TableCell>
                        <TableCell>
                          <Badge variant={backup.status === 'success' ? 'default' : 'destructive'}>
                            {backup.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{backup.createdAt}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Maintenance Tab */}
          <TabsContent value="maintenance" className="space-y-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Maintenance Warning</AlertTitle>
              <AlertDescription>
                These operations may temporarily affect database performance. Schedule during low-traffic periods.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Table Maintenance</CardTitle>
                  <CardDescription>Optimize and repair database tables</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full" variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Analyze Tables
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Optimize Tables
                  </Button>
                  <Button className="w-full" variant="outline">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Check Table Integrity
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Index Management</CardTitle>
                  <CardDescription>Manage database indexes for performance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full" variant="outline">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analyze Index Usage
                  </Button>
                  <Button className="w-full" variant="outline">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Rebuild Indexes
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Activity className="h-4 w-4 mr-2" />
                    Update Statistics
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
  );
}`;

      case 'analytics':
        return `'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  Eye,
  MousePointer,
  Clock,
  Globe,
  Smartphone,
  Monitor,
  Calendar,
  Download,
  RefreshCw,
  Filter,
  Target,
  Zap,
  Award
} from 'lucide-react';

export default function AnalyticsPage() {
  // Mock analytics data - in real implementation, fetch from API
  const overviewStats = {
    totalUsers: 1247,
    activeUsers: 892,
    totalRevenue: 2456789,
    totalInvestments: 15678923,
    pageViews: 45678,
    uniqueVisitors: 12345,
    avgSessionDuration: '4m 32s',
    bounceRate: '32.5%'
  };

  const userGrowth = [
    { month: 'Jan', users: 1200, active: 850 },
    { month: 'Feb', users: 1350, active: 920 },
    { month: 'Mar', users: 1420, active: 980 },
    { month: 'Apr', users: 1580, active: 1100 },
    { month: 'May', users: 1720, active: 1250 },
    { month: 'Jun', users: 1890, active: 1380 },
  ];

  const topPages = [
    { page: '/marketplace', views: 12345, unique: 8765, avgTime: '3m 24s' },
    { page: '/investments', views: 9876, unique: 6543, avgTime: '5m 12s' },
    { page: '/properties', views: 7654, unique: 5432, avgTime: '4m 56s' },
    { page: '/profile', views: 6543, unique: 4321, avgTime: '2m 18s' },
    { page: '/about', views: 4321, unique: 3210, avgTime: '1m 45s' },
  ];

  const deviceStats = [
    { device: 'Desktop', percentage: 65, sessions: 29876 },
    { device: 'Mobile', percentage: 28, sessions: 12876 },
    { device: 'Tablet', percentage: 7, sessions: 3210 },
  ];

  const investmentMetrics = {
    totalInvested: 15678923,
    averageInvestment: 8500,
    totalProperties: 89,
    fundedProperties: 67,
    averageFundingRate: 78.5,
    topInvestor: 'John Smith',
    topInvestorAmount: 250000
  };

  // Create reference for template literal scope
  const metrics = investmentMetrics;


  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold text-foreground dark:text-white">Platform Analytics</h1>
                <p className="text-muted-foreground dark:text-gray-400">
                  Comprehensive insights into platform performance and user behavior
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Select defaultValue="30days">
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="90days">Last 90 days</SelectItem>
                  <SelectItem value="1year">Last year</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overviewStats.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+12.5%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Activity className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overviewStats.activeUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+8.2%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Investments</CardTitle>
              <DollarSign className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">\${(overviewStats.totalInvestments / 1000000).toFixed(1)}M</div> 
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+15.3%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Page Views</CardTitle>
              <Eye className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overviewStats.pageViews.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+22.1%</span> from last month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Analytics Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-muted dark:bg-gray-900">
            <TabsTrigger value="overview" className="data-[state=active]:bg-background dark:data-[state=active]:bg-gray-800">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-background dark:data-[state=active]:bg-gray-800">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="investments" className="data-[state=active]:bg-background dark:data-[state=active]:bg-gray-800">
              <DollarSign className="h-4 w-4 mr-2" />
              Investments
            </TabsTrigger>
            <TabsTrigger value="traffic" className="data-[state=active]:bg-background dark:data-[state=active]:bg-gray-800">
              <Globe className="h-4 w-4 mr-2" />
              Traffic
            </TabsTrigger>
            <TabsTrigger value="performance" className="data-[state=active]:bg-background dark:data-[state=active]:bg-gray-800">
              <TrendingUp className="h-4 w-4 mr-2" />
              Performance
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Growth Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>User Growth</CardTitle>
                  <CardDescription>Monthly user registration and activity trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {userGrowth.map((month) => (
                      <div key={month.month} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{month.month}</span>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">Total</div>
                            <div className="font-semibold">{month.users}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">Active</div>
                            <div className="font-semibold">{month.active}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Key Performance Indicators */}
              <Card>
                <CardHeader>
                  <CardTitle>Key Metrics</CardTitle>
                  <CardDescription>Important platform performance indicators</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Average Session Duration</span>
                    <span className="font-semibold">{overviewStats.avgSessionDuration}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Bounce Rate</span>
                    <span className="font-semibold">{overviewStats.bounceRate}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Conversion Rate</span>
                    <span className="font-semibold">3.2%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Customer Satisfaction</span>
                    <span className="font-semibold">4.8/5</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Demographics</CardTitle>
                  <CardDescription>User distribution by location and device</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">United States</span>
                      <span className="font-semibold">42%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">United Kingdom</span>
                      <span className="font-semibold">18%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Canada</span>
                      <span className="font-semibold">12%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Germany</span>
                      <span className="font-semibold">8%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Other</span>
                      <span className="font-semibold">20%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>User Engagement</CardTitle>
                  <CardDescription>User activity and retention metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Daily Active Users</span>
                        <span>1,247</span>
                      </div>
                      <Progress value={75} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Weekly Active Users</span>
                        <span>3,456</span>
                      </div>
                      <Progress value={85} className="h-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Monthly Active Users</span>
                        <span>8,921</span>
                      </div>
                      <Progress value={92} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Investments Tab */}
          <TabsContent value="investments" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{'$' + (metrics.totalInvested / 1000000).toFixed(1) + 'M'}</div>
                  <p className="text-xs text-muted-foreground">Across all properties</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Properties Funded</CardTitle>
                  <Target className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.fundedProperties + '/' + metrics.totalProperties}</div>
                  <p className="text-xs text-muted-foreground">{(((metrics.fundedProperties / metrics.totalProperties) * 100).toFixed(1))}% funded</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Top Investor</CardTitle>
                  <Award className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold">{metrics.topInvestor}</div>
                  <p className="text-xs text-muted-foreground">{'$' + metrics.topInvestorAmount.toLocaleString() + ' invested'}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Investment Trends</CardTitle>
                <CardDescription>Monthly investment activity and growth</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Average Investment Amount</span>
                      <span className="font-semibold">{'$' + metrics.averageInvestment.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Funding Success Rate</span>
                    <span className="font-semibold">{metrics.averageFundingRate + '%'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">New Investors This Month</span>
                    <span className="font-semibold">127</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Traffic Tab */}
          <TabsContent value="traffic" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Pages */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Pages</CardTitle>
                  <CardDescription>Most visited pages and user engagement</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 dark:bg-gray-900/50">
                        <TableHead>Page</TableHead>
                        <TableHead className="text-right">Views</TableHead>
                        <TableHead className="text-right">Unique</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topPages.map((page) => (
                        <TableRow key={page.page} className="hover:bg-muted/50 dark:hover:bg-gray-900/50">
                          <TableCell className="font-medium">{page.page}</TableCell>
                          <TableCell className="text-right">{page.views.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{page.unique.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Device Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Device Usage</CardTitle>
                  <CardDescription>User device preferences and sessions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {deviceStats.map((device) => (
                    <div key={device.device} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-2">
                          {device.device === 'Desktop' && <Monitor className="h-4 w-4" />}
                          {device.device === 'Mobile' && <Smartphone className="h-4 w-4" />}
                          {device.device === 'Tablet' && <Monitor className="h-4 w-4" />}
                          {device.device}
                        </span>
                        <span>{device.percentage}% ({device.sessions.toLocaleString()})</span>
                      </div>
                      <Progress value={device.percentage} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Page Performance</CardTitle>
                  <CardDescription>Load times and user experience metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Average Load Time</span>
                    <span className="font-semibold">2.3s</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">First Contentful Paint</span>
                    <span className="font-semibold">1.2s</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Largest Contentful Paint</span>
                    <span className="font-semibold">3.1s</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Cumulative Layout Shift</span>
                    <span className="font-semibold">0.08</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Conversion Funnel</CardTitle>
                  <CardDescription>User journey through key actions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Page Visits</span>
                      <span>100%</span>
                    </div>
                    <Progress value={100} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Account Creation</span>
                      <span>45%</span>
                    </div>
                    <Progress value={45} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Property Investment</span>
                      <span>12%</span>
                    </div>
                    <Progress value={12} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Portfolio Creation</span>
                      <span>8%</span>
                    </div>
                    <Progress value={8} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
  );
}`;

      default:
        return `'use client';

import React from 'react';

export default function ${pageName.charAt(0).toUpperCase() + pageName.slice(1)}Page() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold">${pageName.charAt(0).toUpperCase() + pageName.slice(1)}</h1>
      <p className="text-muted-foreground">Page content coming soon...</p>
    </div>
  );
}`;
    }
  }
}

// Export singleton instance
export const navigationGenerator = new NavigationGenerator();
