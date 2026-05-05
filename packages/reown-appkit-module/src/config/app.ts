// Tokenizin - Centralized Application Configuration
// This file serves as the single source of truth for all app configuration

export interface NavigationItem {
  id: string;
  title: string;
  href: string;
  icon: string;
  authRequired: boolean;
  description?: string;
  badge?: string;
  children?: NavigationItem[];
  category?: 'main' | 'docs' | 'admin' | 'auth' | 'tools';
}

export interface SitemapItem {
  path: string;
  priority: number;
  authRequired?: boolean;
  lastModified?: string;
}

export interface AssetConfig {
  logos: {
    primary: string;
    light: string;
    horizontal: string;
    circular: string;
    favicon: string;
    appleTouchIcon: string;
  };
  backgrounds: {
    tiger: {
      light: string;
      dark: string;
      hero: string;
    };
    foliage: {
      banner: string;
      overlay: string;
    };
  };
  icons: {
    [key: string]: string;
  };
  placeholders: {
    profile: string;
    product: string;
    category: string;
  };
}

export interface ThemeConfig {
  colors: {
    primary: string[];
    secondary: string[];
    accent: string[];
    background: string[];
    text: string[];
  };
  fonts: {
    primary: string;
    secondary: string;
    mono: string;
  };
  animations: {
    duration: {
      fast: string;
      normal: string;
      slow: string;
    };
    easing: {
      ease: string;
      easeIn: string;
      easeOut: string;
    };
  };
}

export const AppConfig = {
  // Basic App Information
  siteName: "RWA Market",
  tagline: "Your Gateway To Asset Tokens",
  description: "Premium RWA tokenized assets",
  version: "1.0.0",
  
  // Brand Assets Configuration
  assets: {
    logos: {
      primary: "/images/logos/playToken.png",
      light: "/images/logos/playToken.png",
      horizontal: "/images/logos/playToken.png",
      circular: "/images/logos/playToken.png",
      favicon: "/images/logos/playToken.png",
      appleTouchIcon: "/apple-touch-icon.png",
    },
    backgrounds: {
      tiger: {
        light: "/images/backgrounds/bg-tokenizin-light.png",
        dark: "/images/backgrounds/bg-tokenizin-dark.png", 
        hero: "/images/backgrounds/bg-tokenizin-dark.png", // Use dark tiger background for hero
      },
      foliage: {
        banner: "/images/backgrounds/bg-tokenizin-light.png", // Fallback
        overlay: "/images/backgrounds/bg-tokenizin-dark.png", // Fallback
      },
    },
    icons: {
      // Navigation Icons
      home: "home",
      marketplace: "shopping-bag",
      profile: "user",
      settings: "settings",
      blog: "book-open",
      edit: "edit",
      about: "info",
      contact: "mail",
      help: "help-circle",
      
      // Feature Icons
      ai: "brain",
      security: "shield",
      premium: "crown",
      luxury: "gem",
      tiger: "zap",
      wrench: "wrench",
      "book-open": "book-open",
      "message-circle": "message-circle",
      "log-in": "log-in",
      "user-plus": "user-plus",
      "file-text": "file-text",
      lock: "lock",
      
      // Social Icons
      twitter: "twitter",
      instagram: "instagram", 
      linkedin: "linkedin",
      facebook: "facebook",
      
      // Admin Icons
      "grid-3x3": "grid-3x3",
      "bar-chart": "bar-chart",
      "users": "users",
      "building": "building",
      "dollar-sign": "dollar-sign",
      "trending-up": "trending-up",
      "gamepad-2": "gamepad-2",
      "link": "link",
      "zap": "zap",
    },
    placeholders: {
      profile: "/images/placeholders/default-profile.png",
      product: "/images/placeholders/default-product.png", 
      category: "/images/placeholders/default-category.png",
    },
  } as AssetConfig,

  // Navigation Structure
  navigation: [
    // Main Application Features
    {
      id: "home",
      title: "Home",
      href: "/",
      icon: "home",
      authRequired: false,
      description: "Welcome to RWA Market",
      category: "main",
    },
    {
      id: "marketplace",
      title: "Marketplace", 
      href: "/marketplace",
      icon: "marketplace",
      authRequired: false,
      description: "Discover premium goods and services",
      category: "main",
    },
    {
      id: "investments",
      title: "Investments",
      href: "/investments",
      icon: "trending-up",
      authRequired: true,
      description: "View your property purchases and portfolio",
      category: "main",
    },
    {
      id: "community",
      title: "Community",
      href: "/blog",
      icon: "users",
      authRequired: false,
      description: "Latest insights and updates",
      category: "main",
    },
    {
      id: "about",
      title: "About",
      href: "/about", 
      icon: "about",
      authRequired: false,
      description: "Learn about Tokenizin",
      category: "main",
    },
    
    // Documentation Section
    {
      id: "docs",
      title: "Docs",
      href: "/docs",
      icon: "book-open",
      authRequired: false,
      description: "Tokenizin documentation and guides",
      category: "docs",
      children: [
        {
          id: "docs-welcome",
          title: "Welcome",
          href: "/docs",
          icon: "rocket",
          authRequired: false,
          description: "Get started with Tokenizin",
        },
        {
          id: "docs-quick-start",
          title: "Quick Start",
          href: "/docs/quick-start",
          icon: "zap",
          authRequired: false,
          description: "Quick start guide",
        },
        {
          id: "docs-guides",
          title: "Guides",
          href: "/docs/guides",
          icon: "book-open",
          authRequired: false,
          description: "Comprehensive guides",
        },
        {
          id: "docs-reference",
          title: "Reference",
          href: "/docs/reference",
          icon: "code",
          authRequired: false,
          description: "API reference and specs",
        },
        {
          id: "docs-faq",
          title: "FAQ",
          href: "/docs/faq",
          icon: "help-circle",
          authRequired: false,
          description: "Frequently asked questions",
        },
      ],
    },
    
    // =====================
    // ADMIN DASHBOARD
    // =====================
    {
      id: "admin-dashboard",
      title: "Dashboard",
      href: "/admin",
      icon: "layout-dashboard",
      authRequired: true,
      description: "Admin overview and key metrics",
      category: "admin",
    },

    // =====================
    // PROPERTY MANAGEMENT (Level 2)
    // =====================
    {
      id: "admin-property-management",
      title: "Properties",
      href: "#",
      icon: "building-2",
      authRequired: true,
      description: "Real estate property operations",
      category: "admin",
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
          title: "Locations",
          href: "/admin/propertyLocation",
          icon: "map-pin",
          authRequired: true,
          description: "Property location management",
        },
        {
          id: "admin-property-images",
          title: "Images",
          href: "/admin/propertyImage",
          icon: "image",
          authRequired: true,
          description: "Property image management",
        },
        {
          id: "admin-property-onboarding",
          title: "Onboarding",
          href: "/admin/propertyOnboarding",
          icon: "file-plus",
          authRequired: true,
          description: "Property onboarding records",
        },
        {
          id: "admin-property-cash-flows",
          title: "Cash Flows",
          href: "/admin/propertyCashFlow",
          icon: "flow",
          authRequired: true,
          description: "Property cash flow data",
        },
        {
          id: "admin-property-expenses",
          title: "Expenses",
          href: "/admin/propertyExpense",
          icon: "receipt",
          authRequired: true,
          description: "Property expense records",
        },
        {
          id: "admin-property-rentals",
          title: "Rentals",
          href: "/admin/propertyRental",
          icon: "home",
          authRequired: true,
          description: "Property rental data",
        },
        {
          id: "admin-property-valuations",
          title: "Valuations",
          href: "/admin/propertyValuation",
          icon: "calculator",
          authRequired: true,
          description: "Property valuation records",
        },
      ],
    },

    // =====================
    // COMPLIANCE & DUE DILIGENCE (Level 2)
    // =====================
    {
      id: "admin-compliance",
      title: "Compliance",
      href: "#",
      icon: "shield-check",
      authRequired: true,
      description: "Regulatory compliance and verification",
      category: "admin",
      children: [
        {
          id: "admin-property-documents",
          title: "Property Docs",
          href: "/admin/document",
          icon: "file-text",
          authRequired: true,
          description: "Due diligence documentation",
          badge: "CRITICAL",
        },
        {
          id: "admin-legal-compliance",
          title: "Legal",
          href: "/admin/legalCompliance",
          icon: "scale",
          authRequired: true,
          description: "Legal compliance records",
          badge: "CRITICAL",
        },
        {
          id: "admin-audit-logs",
          title: "Logs",
          href: "/admin/auditLog",
          icon: "file-search",
          authRequired: true,
          description: "Security and compliance audit logs",
          badge: "HIGH",
        },
        {
          id: "admin-documentation",
          title: "Knowledge Base",
          href: "/admin/documentation",
          icon: "book",
          authRequired: true,
          description: "System documentation",
        },
        {
          id: "admin-documentation-versions",
          title: "Documentation Versions",
          href: "/admin/documentationVersion",
          icon: "git-branch",
          authRequired: true,
          description: "Documentation version history",
        },
        {
          id: "admin-testing-documents",
          title: "Testing Documents",
          href: "/admin/documentation/testing",
          icon: "flask-conical",
          authRequired: true,
          description: "Testing documentation and guides",
        },
      ],
    },

    // =====================
    // TOKENIZATION & BLOCKCHAIN (Level 2)
    // =====================
    {
      id: "admin-tokenization",
      title: "Tokenization",
      href: "#",
      icon: "coins",
      authRequired: true,
      description: "Token operations and blockchain integration",
      category: "admin",
      children: [
        {
          id: "admin-token-management",
          title: "Tokens",
          href: "/admin/token-management",
          icon: "coins",
          authRequired: true,
          description: "Token operations and management",
          badge: "CRITICAL",
        },
        {
          id: "admin-token-onboarding",
          title: "Token Launch",
          href: "/admin/token-onboarding",
          icon: "rocket",
          authRequired: true,
          description: "Token onboarding flow",
          badge: "HIGH",
        },
        {
          id: "admin-token-holders",
          title: "Holders",
          href: "/admin/tokenHolder",
          icon: "users",
          authRequired: true,
          description: "Token ownership tracking",
          badge: "HIGH",
        },
        {
          id: "admin-token-mint-events",
          title: "Mint",
          href: "/admin/tokenMintEvent",
          icon: "sparkles",
          authRequired: true,
          description: "Token minting events",
        },
        {
          id: "admin-token-onboarding-records",
          title: "Listing",
          href: "/admin/tokenOnboarding",
          icon: "arrow-right",
          authRequired: true,
          description: "Token onboarding records",
        },
        {
          id: "admin-blockchain",
          title: "Blockchain",
          href: "/admin/blockchain",
          icon: "link",
          authRequired: true,
          description: "Blockchain operations",
          badge: "HIGH",
        },
        {
          id: "admin-blockchain-properties",
          title: "Property Tokens",
          href: "/admin/blockchain/properties",
          icon: "building",
          authRequired: true,
          description: "Property blockchain deployment & management",
          badge: "HIGH",
        },
        {
          id: "admin-blockchain-sync",
          title: "Chains",
          href: "/admin/blockchainSync",
          icon: "refresh-cw",
          authRequired: true,
          description: "Blockchain synchronization status",
          badge: "HIGH",
        },
        {
          id: "admin-blockchain-networks",
          title: "Networks",
          href: "/admin/blockchainNetwork",
          icon: "network",
          authRequired: true,
          description: "Network configuration",
        },
        {
          id: "admin-smart-contracts",
          title: "Contracts",
          href: "/admin/smartContract",
          icon: "file-code",
          authRequired: true,
          description: "Smart contract management",
          badge: "HIGH",
        },
        {
          id: "admin-deployed-contracts",
          title: "Deployment",
          href: "/admin/deployedContract",
          icon: "package",
          authRequired: true,
          description: "Deployed contract records",
        },
        {
          id: "admin-contract-states",
          title: "Contract Data",
          href: "/admin/contractState",
          icon: "circle-dot",
          authRequired: true,
          description: "Contract state tracking",
        },
        {
          id: "admin-rpc-providers",
          title: "RPC Settings",
          href: "/admin/rpcProvider",
          icon: "server",
          authRequired: true,
          description: "RPC provider configuration",
        },
      ],
    },

    // =====================
    // INVESTMENT MANAGEMENT (Level 2)
    // =====================
    {
      id: "admin-investment-management",
      title: "Investments",
      href: "#",
      icon: "bar-chart",
      authRequired: true,
      description: "Investment tracking and operations",
      category: "admin",
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
          id: "admin-investment-performance",
          title: "Investment Performance",
          href: "/admin/investmentPerformance",
          icon: "line-chart",
          authRequired: true,
          description: "Investment performance tracking",
        },
        {
          id: "admin-investment-benchmarks",
          title: "Benchmarks",
          href: "/admin/investmentBenchmark",
          icon: "target",
          authRequired: true,
          description: "Investment benchmark data",
        },
        {
          id: "admin-investment-risk",
          title: "Risk",
          href: "/admin/investmentRisk",
          icon: "alert-triangle",
          authRequired: true,
          description: "Investment risk analysis",
        },
        {
          id: "admin-investment-gaming-transfers",
          title: "Transfers",
          href: "/admin/investmentGamingTransfer",
          icon: "gamepad-2",
          authRequired: true,
          description: "Gaming transfer records",
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
          id: "admin-portfolio-analysis",
          title: "Analysis",
          href: "/admin/portfolioAnalysis",
          icon: "pie-chart",
          authRequired: true,
          description: "Portfolio analysis reports",
        },
        {
          id: "admin-deposits",
          title: "Deposits",
          href: "/admin/deposit",
          icon: "arrow-down-circle",
          authRequired: true,
          description: "Deposit management and tracking",
        },
        {
          id: "admin-monthly-returns",
          title: "Returns",
          href: "/admin/monthlyReturn",
          icon: "calendar",
          authRequired: true,
          description: "Monthly return calculations",
        },
        {
          id: "admin-financial-metrics",
          title: "Financials",
          href: "/admin/financialMetrics",
          icon: "dollar-sign",
          authRequired: true,
          description: "Property financial metrics",
        },
        {
          id: "admin-cash-flow-projections",
          title: "Projections",
          href: "/admin/cashFlowProjection",
          icon: "trending-up",
          authRequired: true,
          description: "Cash flow projections",
        },
        {
          id: "admin-market-comparables",
          title: "Comparables",
          href: "/admin/marketComparable",
          icon: "layers",
          authRequired: true,
          description: "Market comparable properties",
        },
        {
          id: "admin-market-intelligence",
          title: "Intelligence",
          href: "/admin/marketIntelligence",
          icon: "brain",
          authRequired: true,
          description: "Market intelligence data",
        },
      ],
    },

    // =====================
    // USER MANAGEMENT (Level 2)
    // =====================
    {
      id: "admin-user-management",
      title: "Users",
      href: "#",
      icon: "users",
      authRequired: true,
      description: "User accounts and permissions",
      category: "admin",
      children: [
        {
          id: "admin-users",
          title: "All",
          href: "/admin/user",
          icon: "user",
          authRequired: true,
          description: "User account management",
          badge: "CRITICAL",
        },
        {
          id: "admin-user-settings",
          title: "Settings",
          href: "/admin/userSettings",
          icon: "settings",
          authRequired: true,
          description: "User preferences and configuration",
          badge: "HIGH",
        },
        {
          id: "admin-user-preferences",
          title: "Preferences",
          href: "/admin/userPreferences",
          icon: "sliders",
          authRequired: true,
          description: "User preference records",
        },
        {
          id: "admin-user-activity",
          title: "Activity",
          href: "/admin/userActivity",
          icon: "activity",
          authRequired: true,
          description: "User activity logs",
        },
        {
          id: "admin-user-engagement-metrics",
          title: "Engagement",
          href: "/admin/userEngagementMetrics",
          icon: "trending-up",
          authRequired: true,
          description: "User engagement analytics",
        },
        {
          id: "admin-user-qtech-accounts",
          title: "Gaming Accounts",
          href: "/admin/userQtechAccount",
          icon: "gamepad-2",
          authRequired: true,
          description: "QTech account mappings",
        },
        {
          id: "admin-user-pam-mappings",
          title: "PAM Accounts",
          href: "/admin/userPamMapping",
          icon: "link",
          authRequired: true,
          description: "PAM system mappings",
        },
        {
          id: "admin-accounts",
          title: "Accounts",
          href: "/admin/account",
          icon: "user-circle",
          authRequired: true,
          description: "User account records",
        },
        {
          id: "admin-sessions",
          title: "Sessions",
          href: "/admin/session",
          icon: "key",
          authRequired: true,
          description: "User authentication sessions (all auth methods)",
          badge: "HIGH",
        },
        {
          id: "admin-wallet-connections",
          title: "Connections",
          href: "/admin/walletConnection",
          icon: "plug",
          authRequired: true,
          description: "Wallet connection records",
        },
        {
          id: "admin-wallet-transactions",
          title: "Transactions",
          href: "/admin/walletTransaction",
          icon: "credit-card",
          authRequired: true,
          description: "Wallet transaction history",
        },
      ],
    },

    // =====================
    // CONTENT MANAGEMENT (Level 2)
    // =====================
    {
      id: "admin-content",
      title: "Content",
      href: "#",
      icon: "edit",
      authRequired: true,
      description: "Blog and content administration",
      category: "admin",
      children: [
        {
          id: "admin-blog",
          title: "Blogs",
          href: "/admin/blog",
          icon: "file-text",
          authRequired: true,
          description: "Blog management interface",
          badge: "HIGH",
        },
        {
          id: "admin-blog-posts",
          title: "Posts",
          href: "/admin/blogPost",
          icon: "file-text",
          authRequired: true,
          description: "Blog post management",
        },
        {
          id: "admin-comments",
          title: "Reviews",
          href: "/admin/comment",
          icon: "message-square",
          authRequired: true,
          description: "Blog comments",
        },
        {
          id: "admin-notifications",
          title: "Alerts",
          href: "/admin/notification",
          icon: "bell",
          authRequired: true,
          description: "System notification management",
          badge: "HIGH",
        },
        {
          id: "admin-notification-templates",
          title: "Templates",
          href: "/admin/notificationTemplate",
          icon: "mail",
          authRequired: true,
          description: "Notification templates",
        },
        {
          id: "admin-conversations",
          title: "Chats",
          href: "/admin/conversation",
          icon: "message-circle",
          authRequired: true,
          description: "User conversations",
        },
        {
          id: "admin-conversation-messages",
          title: "Messages",
          href: "/admin/conversationMessage",
          icon: "message-square",
          authRequired: true,
          description: "Conversation messages",
        },
        {
          id: "admin-chat-sessions",
          title: "Sessions",
          href: "/admin/chatSession",
          icon: "message-circle",
          authRequired: true,
          description: "Chat session records",
        },
        {
          id: "admin-chat-messages",
          title: "Messages",
          href: "/admin/chatMessage",
          icon: "message-square",
          authRequired: true,
          description: "Chat message records",
        },
        {
          id: "admin-ai-interactions",
          title: "AI",
          href: "/admin/aIInteraction",
          icon: "brain",
          authRequired: true,
          description: "AI interaction logs",
        },
      ],
    },

    // =====================
    // TESTING & QUALITY ASSURANCE (Level 2)
    // =====================
    {
      id: "admin-testing",
      title: "Testing Harness",
      href: "#",
      icon: "flask-conical",
      authRequired: true,
      description: "Platform testing and quality assurance",
      category: "admin",
      children: [
        {
          id: "admin-testing/harness",
          title: "Testing Harness",
          href: "/admin/testing/harness",
          icon: "test-tube",
          authRequired: true,
          description: "Test results and project completion analysis",
          badge: "HIGH",
        },
        {
          id: "admin-testing/qtech-certificate",
          title: "QTech Certificate",
          href: "/admin/testing/qtech-certificate",
          icon: "award",
          authRequired: true,
          description: "QTech certification testing and endpoint validation",
          badge: "CRITICAL",
        },
      ],
    },

    // =====================
    // GAMING INTEGRATION (Level 2)
    // =====================
    {
      id: "admin-gaming",
      title: "Gaming",
      href: "#",
      icon: "gamepad-2",
      authRequired: true,
      description: "Gaming platform integration",
      category: "admin",
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
          id: "admin-pam-integration",
          title: "PAM Integration",
          href: "/admin/pam-integration",
          icon: "link",
          authRequired: true,
          description: "PAM system integration",
        },
        {
          id: "admin-qtech-games",
          title: "QTech Games",
          href: "/admin/qtechGame",
          icon: "joystick",
          authRequired: true,
          description: "QTech gaming platform",
          badge: "HIGH",
        },
        {
          id: "admin-qtech-game-rounds",
          title: "QTech Game Rounds",
          href: "/admin/qtechGameRound",
          icon: "circle",
          authRequired: true,
          description: "Game round records",
        },
        {
          id: "admin-qtech-transactions",
          title: "QTech Transactions",
          href: "/admin/qtechTransaction",
          icon: "repeat",
          authRequired: true,
          description: "QTech transaction records",
          badge: "HIGH",
        },
        {
          id: "admin-qtech-error-logs",
          title: "QTech Error Logs",
          href: "/admin/qtechErrorLog",
          icon: "alert-circle",
          authRequired: true,
          description: "QTech error tracking",
        },
        {
          id: "admin-qtech-providers",
          title: "QTech Providers",
          href: "/admin/qtechProvider",
          icon: "server",
          authRequired: true,
          description: "QTech provider configuration",
        },
        {
          id: "admin-qtech-ngr-aggregations",
          title: "QTech NGR Aggregations",
          href: "/admin/qtechNGRAggregation",
          icon: "layers",
          authRequired: true,
          description: "NGR aggregation data",
        },
        {
          id: "admin-gaming-sessions",
          title: "Gaming Sessions",
          href: "/admin/gamingSession",
          icon: "play",
          authRequired: true,
          description: "Gaming session records",
        },
        {
          id: "admin-pam-transactions",
          title: "PAM Transactions",
          href: "/admin/pamTransaction",
          icon: "repeat",
          authRequired: true,
          description: "PAM transaction records",
        },
        {
          id: "admin-pam-error-logs",
          title: "PAM Error Logs",
          href: "/admin/pamErrorLog",
          icon: "alert-circle",
          authRequired: true,
          description: "PAM error tracking",
        },
        {
          id: "admin-games",
          title: "Games",
          href: "/admin/game",
          icon: "gamepad-2",
          authRequired: true,
          description: "Game definitions",
        },
        {
          id: "admin-game-operators",
          title: "Game Operators",
          href: "/admin/gameOperator",
          icon: "users",
          authRequired: true,
          description: "Game operator records",
        },
        {
          id: "admin-casino-token-config",
          title: "Casino Token Config",
          href: "/admin/casinoTokenConfig",
          icon: "coins",
          authRequired: true,
          description: "Casino token configuration",
        },
      ],
    },

    // =====================
    // SYSTEM ADMINISTRATION (Level 2)
    // =====================
    {
      id: "admin-system",
      title: "System",
      href: "#",
      icon: "database",
      authRequired: true,
      description: "System administration and maintenance",
      category: "admin",
      children: [
        {
          id: "admin-database",
          title: "Explorer",
          href: "/admin/database",
          icon: "database",
          authRequired: true,
          description: "Database management interface - Access all entities",
          badge: "CRITICAL",
        },
        {
          id: "admin-analytics",
          title: "Analytics",
          href: "/admin/analytics",
          icon: "bar-chart",
          authRequired: true,
          description: "Platform analytics and insights",
          badge: "HIGH",
        },
        {
          id: "admin-tasks",
          title: "Tasks",
          href: "/admin/tasks",
          icon: "check-square",
          authRequired: true,
          description: "Task management",
        },
        {
          id: "admin-marketplace",
          title: "Marketplace",
          href: "/admin/marketplace",
          icon: "store",
          authRequired: true,
          description: "Marketplace management",
          badge: "HIGH",
        },
        {
          id: "admin-settings",
          title: "Settings",
          href: "/admin/settings",
          icon: "settings",
          authRequired: true,
          description: "System settings",
        },
        {
          id: "admin-system-config",
          title: "Config",
          href: "/admin/systemConfig",
          icon: "settings",
          authRequired: true,
          description: "System configuration",
        },
        {
          id: "admin-images",
          title: "Images",
          href: "/admin/image",
          icon: "image",
          authRequired: true,
          description: "Image management",
        },
        {
          id: "admin-blobs",
          title: "Blobs",
          href: "/admin/blobs",
          icon: "image",
          authRequired: true,
          description: "File storage management",
        },
        {
          id: "admin-data-model",
          title: "Data Model & Enums",
          href: "/admin/data-model",
          icon: "database",
          authRequired: true,
          description: "View schema entities, enums, and relationships",
          badge: "HIGH",
        },
      ],
    },

    // =====================
    // E-COMMERCE (Level 2)
    // =====================
    {
      id: "admin-ecommerce",
      title: "E-Commerce",
      href: "#",
      icon: "shopping-bag",
      authRequired: true,
      description: "Product and order management",
      category: "admin",
      children: [
        {
          id: "admin-categories",
          title: "Categories",
          href: "/admin/category",
          icon: "folder",
          authRequired: true,
          description: "Product categories",
          badge: "HIGH",
        },
        {
          id: "admin-products",
          title: "Products",
          href: "/admin/product",
          icon: "package",
          authRequired: true,
          description: "Product management",
          badge: "HIGH",
        },
        {
          id: "admin-product-variants",
          title: "Product Variants",
          href: "/admin/productVariant",
          icon: "layers",
          authRequired: true,
          description: "Product variant records",
        },
        {
          id: "admin-vendor-profiles",
          title: "Vendor Profiles",
          href: "/admin/vendorProfile",
          icon: "store",
          authRequired: true,
          description: "Vendor profile records",
        },
        {
          id: "admin-orders",
          title: "Orders",
          href: "/admin/order",
          icon: "shopping-cart",
          authRequired: true,
          description: "Order management",
          badge: "HIGH",
        },
        {
          id: "admin-order-items",
          title: "Order Items",
          href: "/admin/orderItem",
          icon: "list",
          authRequired: true,
          description: "Order item records",
        },
        {
          id: "admin-payments",
          title: "Payments",
          href: "/admin/payment",
          icon: "credit-card",
          authRequired: true,
          description: "Payment records",
          badge: "HIGH",
        },
        {
          id: "admin-carts",
          title: "Carts",
          href: "/admin/cart",
          icon: "shopping-bag",
          authRequired: true,
          description: "Shopping cart records",
        },
        {
          id: "admin-cart-items",
          title: "Cart Items",
          href: "/admin/cartItem",
          icon: "list",
          authRequired: true,
          description: "Cart item records",
        },
        {
          id: "admin-wishlist-items",
          title: "Wishlist Items",
          href: "/admin/wishlistItem",
          icon: "heart",
          authRequired: true,
          description: "Wishlist records",
        },
        {
          id: "admin-reviews",
          title: "Reviews",
          href: "/admin/review",
          icon: "star",
          authRequired: true,
          description: "Product reviews",
        },
      ],
    },

    // =====================
    // PAYMENTS (Level 2)
    // =====================
    {
      id: "admin-payments",
      title: "Payments",
      href: "#",
      icon: "credit-card",
      authRequired: true,
      description: "Payment processing and subscriptions",
      category: "admin",
      children: [
        {
          id: "admin-stripe-payments",
          title: "Stripe Payments",
          href: "/admin/stripePayment",
          icon: "credit-card",
          authRequired: true,
          description: "Stripe payment records",
          badge: "HIGH",
        },
        {
          id: "admin-stripe-products",
          title: "Stripe Products",
          href: "/admin/stripeProduct",
          icon: "package",
          authRequired: true,
          description: "Stripe product records",
        },
        {
          id: "admin-stripe-prices",
          title: "Stripe Prices",
          href: "/admin/stripePrice",
          icon: "dollar-sign",
          authRequired: true,
          description: "Stripe price records",
        },
        {
          id: "admin-subscriptions",
          title: "Subscriptions",
          href: "/admin/subscription",
          icon: "repeat",
          authRequired: true,
          description: "User subscriptions",
          badge: "HIGH",
        },
        {
          id: "admin-prices",
          title: "Prices",
          href: "/admin/price",
          icon: "tag",
          authRequired: true,
          description: "Price records",
        },
        {
          id: "admin-customers",
          title: "Customers",
          href: "/admin/customer",
          icon: "users",
          authRequired: true,
          description: "Customer records",
        },
      ],
    },
  ] as NavigationItem[],

  // Sitemap Structure
  sitemap: [
    { path: "/", priority: 1.0 },
    { path: "/marketplace", priority: 0.9 },
    { path: "/ai-builder", priority: 0.9, authRequired: true },
    { path: "/ai-chatbot", priority: 0.9, authRequired: true },
    { path: "/dashboard", priority: 0.8, authRequired: true },
    { path: "/profile", priority: 0.7, authRequired: true },
    { path: "/blog", priority: 0.9 },
    { path: "/about", priority: 0.8 },
    { path: "/register", priority: 0.6 },
    { path: "/auth/signin", priority: 0.6 },
    { path: "/auth/signup", priority: 0.6 },
    { path: "/docs", priority: 0.7 },
    { path: "/docs/quick-start", priority: 0.7 },
    { path: "/docs/reference", priority: 0.6 },
    { path: "/auth-examples", priority: 0.5 },
    // Real Estate Admin Routes
    { path: "/admin/dashboard", priority: 0.8, authRequired: true },
    { path: "/admin/investments", priority: 0.8, authRequired: true },
    { path: "/admin/user", priority: 0.8, authRequired: true },
    { path: "/admin/properties", priority: 0.8, authRequired: true },
    { path: "/admin/deposits", priority: 0.8, authRequired: true },
    { path: "/admin/tokenomics", priority: 0.8, authRequired: true },
    // Integration Admin Routes
    { path: "/admin/tokenizin-games", priority: 0.8, authRequired: true },
    { path: "/admin/pam-integration", priority: 0.8, authRequired: true },
  ] as SitemapItem[],

  // Theme Configuration
  theme: {
    colors: {
      primary: [
        "#D2691E", // Tiger Orange
        "#E6B800", // Golden Amber  
        "#A0522D", // Warm Sienna
        "#CC6600", // Burnt Orange
        "#B87333", // Rich Copper
      ],
      secondary: [
        "#0A3A2A", // Forest Green
        "#1E6040", // Deep Jungle
        "#8B4513", // Earth Brown
        "#1A1A1A", // Charcoal
        "#E6D8B8", // Warm Gold
      ],
      accent: [
        "#FFD700", // Gold
        "#E8B4B8", // Rose Gold
        "#CD7F32", // Bronze
        "#E5E4E2", // Platinum
        "#B87333", // Copper
      ],
      background: [
        "#F8F5F0", // Cream
        "#E8E0D8", // Ivory
        "#F5F5DC", // Warm White
        "#1A1A1A", // Charcoal Dark
        "#0A3A2A", // Forest Dark
      ],
      text: [
        "#3D2C20", // Deep Brown
        "#2C1810", // Warm Black
        "#F8F5F0", // Cream White
        "#B89F6E", // Muted Gold
        "#8B7355", // Soft Gray
      ],
    },
    fonts: {
      primary: "var(--font-geist-sans)",
      secondary: "var(--font-geist-mono)", 
      mono: "var(--font-geist-mono)",
    },
    animations: {
      duration: {
        fast: "150ms",
        normal: "300ms", 
        slow: "500ms",
      },
      easing: {
        ease: "cubic-bezier(0.4, 0, 0.2, 1)",
        easeIn: "cubic-bezier(0.4, 0, 1, 1)",
        easeOut: "cubic-bezier(0, 0, 0.2, 1)",
      },
    },
  } as ThemeConfig,

  // Contact & Social
  contact: {
    email: "support@TKNZN.pro",
    phone: "+1 (555) 123-4567",
    address: "Tokenizin, Luxury District, NY 10001",
  },
  social: {
    twitter: "https://twitter.com/tigerpalacepro",
    instagram: "https://instagram.com/tigerpalacepro", 
    linkedin: "https://linkedin.com/company/tigerpalacepro",
    facebook: "https://facebook.com/tigerpalacepro",
  },

  // API Configuration
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "/api",
    timeout: 30000,
    retries: 3,
  },

  // Feature Flags
  features: {
    aiBuilder: true,
    marketplace: true,
    blog: true,
    analytics: true,
    notifications: true,
    darkMode: true,
    customThemes: true,
  },

  // SEO Configuration
  seo: {
    defaultTitle: "RWA Premium Marketplace",
    titleTemplate: "%s | RWA Token Marketplace",
    defaultDescription: "Premium RWA tokenized assets",
    defaultKeywords: ["luxury", "marketplace", "premium", "tiger palace", "ai", "high-end"],
    canonicalUrl: process.env.NEXT_PUBLIC_CANONICAL_URL || "https://TKNZN.pro",
    openGraph: {
      type: "website",
      siteName: "RWA Token Marketplace",
      locale: "en_US",
    },
  },
};

// Export individual configurations for easier imports
export const { assets, navigation, sitemap, theme, contact, social, api, features, seo } = AppConfig;

// Helper functions
export const getNavigationByAuth = (isAuthenticated: boolean) => 
  navigation.filter(item => !item.authRequired || isAuthenticated);

export const getNavigationByCategory = (category: NavigationItem['category']) =>
  navigation.filter(item => item.category === category);

export const getMainNavigation = () => getNavigationByCategory('main');
export const getDocsNavigation = () => getNavigationByCategory('docs');
export const getToolsNavigation = () => getNavigationByCategory('tools');
export const getAdminNavigation = () => getNavigationByCategory('admin');
export const getAuthNavigation = () => getNavigationByCategory('auth');

export const getSitemapByAuth = (isAuthenticated: boolean) =>
  sitemap.filter(item => !item.authRequired || isAuthenticated);

export const getAssetPath = (category: keyof AssetConfig, key: string) => {
  const assetCategory = assets[category];
  if (typeof assetCategory === 'object' && assetCategory !== null) {
    return (assetCategory as any)[key] || '';
  }
  return '';
};

export default AppConfig;
