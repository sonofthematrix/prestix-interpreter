/**
 * Entity Relationship Mapping Configuration
 * Defines parent/child relationships for navigation and Database Explorer
 */

export interface EntityRelationship {
  entityName: string;
  route: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  parentEntity?: string;
  childEntities?: string[];
  relatedEntities?: string[];
  icon: string;
  description: string;
}

/**
 * Complete entity relationship mapping
 * Maps entities to their parent/child relationships based on schema
 */
export const ENTITY_RELATIONSHIPS: Record<string, EntityRelationship> = {
  // Property Management
  'properties': {
    entityName: 'Properties',
    route: '/admin/properties',
    category: 'property',
    priority: 'critical',
    childEntities: ['propertyLocation', 'propertyImage', 'propertyOnboarding', 'propertyCashFlow', 'propertyExpense', 'propertyRental', 'propertyValuation', 'document'],
    relatedEntities: ['investment', 'tokenHolder', 'financialMetrics', 'marketComparable'],
    icon: 'building',
    description: 'Property listings and administration',
  },
  'propertyLocation': {
    entityName: 'Property Locations',
    route: '/admin/propertyLocation',
    category: 'property',
    priority: 'medium',
    parentEntity: 'properties',
    icon: 'map-pin',
    description: 'Property location data',
  },
  'propertyImage': {
    entityName: 'Property Images',
    route: '/admin/propertyImage',
    category: 'property',
    priority: 'medium',
    parentEntity: 'properties',
    icon: 'image',
    description: 'Property image gallery',
  },
  'propertyOnboarding': {
    entityName: 'Property Onboarding',
    route: '/admin/propertyOnboarding',
    category: 'property',
    priority: 'medium',
    parentEntity: 'properties',
    icon: 'file-plus',
    description: 'Property onboarding records',
  },
  'propertyCashFlow': {
    entityName: 'Property Cash Flows',
    route: '/admin/propertyCashFlow',
    category: 'property',
    priority: 'medium',
    parentEntity: 'properties',
    icon: 'flow',
    description: 'Property cash flow data',
  },
  'propertyExpense': {
    entityName: 'Property Expenses',
    route: '/admin/propertyExpense',
    category: 'property',
    priority: 'medium',
    parentEntity: 'properties',
    icon: 'receipt',
    description: 'Property expense records',
  },
  'propertyRental': {
    entityName: 'Property Rentals',
    route: '/admin/propertyRental',
    category: 'property',
    priority: 'medium',
    parentEntity: 'properties',
    icon: 'home',
    description: 'Property rental data',
  },
  'propertyValuation': {
    entityName: 'Property Valuations',
    route: '/admin/propertyValuation',
    category: 'property',
    priority: 'medium',
    parentEntity: 'properties',
    icon: 'calculator',
    description: 'Property valuation records',
  },

  // Investment Management
  'investment': {
    entityName: 'Investments',
    route: '/admin/investment',
    category: 'investment',
    priority: 'high',
    parentEntity: 'properties',
    childEntities: ['investmentPerformance', 'investmentBenchmark', 'investmentRisk', 'investmentGamingTransfer', 'monthlyReturn'],
    relatedEntities: ['portfolio', 'tokenHolder', 'deposit'],
    icon: 'trending-up',
    description: 'Investment records',
  },
  'investmentPerformance': {
    entityName: 'Investment Performance',
    route: '/admin/investmentPerformance',
    category: 'investment',
    priority: 'medium',
    parentEntity: 'investment',
    icon: 'line-chart',
    description: 'Investment performance tracking',
  },
  'investmentBenchmark': {
    entityName: 'Investment Benchmarks',
    route: '/admin/investmentBenchmark',
    category: 'investment',
    priority: 'medium',
    parentEntity: 'investment',
    icon: 'target',
    description: 'Investment benchmark data',
  },
  'investmentRisk': {
    entityName: 'Investment Risk',
    route: '/admin/investmentRisk',
    category: 'investment',
    priority: 'medium',
    parentEntity: 'investment',
    icon: 'alert-triangle',
    description: 'Investment risk analysis',
  },
  'investmentGamingTransfer': {
    entityName: 'Gaming Transfers',
    route: '/admin/investmentGamingTransfer',
    category: 'investment',
    priority: 'medium',
    parentEntity: 'investment',
    icon: 'gamepad-2',
    description: 'Gaming transfer records',
  },
  'portfolio': {
    entityName: 'Portfolios',
    route: '/admin/portfolio',
    category: 'investment',
    priority: 'high',
    parentEntity: 'user',
    childEntities: ['portfolioAnalysis'],
    relatedEntities: ['investment', 'deposit'],
    icon: 'briefcase',
    description: 'Investor portfolios',
  },
  'portfolioAnalysis': {
    entityName: 'Portfolio Analysis',
    route: '/admin/portfolioAnalysis',
    category: 'investment',
    priority: 'medium',
    parentEntity: 'portfolio',
    icon: 'pie-chart',
    description: 'Portfolio analysis reports',
  },
  'deposit': {
    entityName: 'Deposits',
    route: '/admin/deposit',
    category: 'investment',
    priority: 'high',
    parentEntity: 'user',
    relatedEntities: ['investment', 'portfolio'],
    icon: 'arrow-down-circle',
    description: 'Deposit records',
  },
  'monthlyReturn': {
    entityName: 'Monthly Returns',
    route: '/admin/monthlyReturn',
    category: 'investment',
    priority: 'medium',
    parentEntity: 'investment',
    icon: 'calendar',
    description: 'Monthly return calculations',
  },
  'financialMetrics': {
    entityName: 'Financial Metrics',
    route: '/admin/financialMetrics',
    category: 'investment',
    priority: 'medium',
    parentEntity: 'properties',
    icon: 'dollar-sign',
    description: 'Property financial metrics',
  },
  'cashFlowProjection': {
    entityName: 'Cash Flow Projections',
    route: '/admin/cashFlowProjection',
    category: 'investment',
    priority: 'medium',
    parentEntity: 'properties',
    icon: 'trending-up',
    description: 'Cash flow projections',
  },
  'marketComparable': {
    entityName: 'Market Comparables',
    route: '/admin/marketComparable',
    category: 'investment',
    priority: 'medium',
    parentEntity: 'properties',
    icon: 'layers',
    description: 'Market comparable properties',
  },
  'marketIntelligence': {
    entityName: 'Market Intelligence',
    route: '/admin/marketIntelligence',
    category: 'investment',
    priority: 'medium',
    icon: 'brain',
    description: 'Market intelligence data',
  },

  // Tokenization & Blockchain
  'token-management': {
    entityName: 'Token Management',
    route: '/admin/token-management',
    category: 'tokenization',
    priority: 'critical',
    childEntities: ['tokenHolder', 'tokenMintEvent', 'tokenOnboarding'],
    icon: 'coins',
    description: 'Token operations and management',
  },
  'tokenHolder': {
    entityName: 'Token Holders',
    route: '/admin/tokenHolder',
    category: 'tokenization',
    priority: 'high',
    parentEntity: 'properties',
    childEntities: ['tokenMintEvent'],
    relatedEntities: ['investment', 'user'],
    icon: 'users',
    description: 'Token ownership tracking',
  },
  'tokenMintEvent': {
    entityName: 'Token Mint Events',
    route: '/admin/tokenMintEvent',
    category: 'tokenization',
    priority: 'medium',
    parentEntity: 'tokenHolder',
    icon: 'sparkles',
    description: 'Token minting events',
  },
  'smartContract': {
    entityName: 'Smart Contracts',
    route: '/admin/smartContract',
    category: 'tokenization',
    priority: 'high',
    childEntities: ['deployedContract', 'contractState', 'contractUpgrade', 'contractDependency', 'contractMetrics'],
    icon: 'file-code',
    description: 'Smart contract management',
  },
  'deployedContract': {
    entityName: 'Deployed Contracts',
    route: '/admin/deployedContract',
    category: 'tokenization',
    priority: 'medium',
    parentEntity: 'smartContract',
    icon: 'package',
    description: 'Deployed contract records',
  },

  // User Management
  'user': {
    entityName: 'Users',
    route: '/admin/user',
    category: 'user',
    priority: 'critical',
    childEntities: ['account', 'userPreferences', 'userActivity', 'userEngagementMetrics', 'userQtechAccount', 'userPamMapping', 'session', 'portfolio', 'deposit', 'cart', 'wishlistItem'],
    relatedEntities: ['investment', 'tokenHolder', 'blogPost'],
    icon: 'user',
    description: 'User account management',
  },
  'account': {
    entityName: 'Accounts',
    route: '/admin/account',
    category: 'user',
    priority: 'high',
    parentEntity: 'user',
    icon: 'user-circle',
    description: 'User account records',
  },
  'userPreferences': {
    entityName: 'User Preferences',
    route: '/admin/userPreferences',
    category: 'user',
    priority: 'medium',
    parentEntity: 'user',
    icon: 'sliders',
    description: 'User preference records',
  },
  'userActivity': {
    entityName: 'User Activity',
    route: '/admin/userActivity',
    category: 'user',
    priority: 'medium',
    parentEntity: 'user',
    icon: 'activity',
    description: 'User activity logs',
  },
  'userEngagementMetrics': {
    entityName: 'User Engagement Metrics',
    route: '/admin/userEngagementMetrics',
    category: 'user',
    priority: 'medium',
    parentEntity: 'user',
    icon: 'trending-up',
    description: 'User engagement analytics',
  },
  'userQtechAccount': {
    entityName: 'User QTech Accounts',
    route: '/admin/userQtechAccount',
    category: 'user',
    priority: 'medium',
    parentEntity: 'user',
    icon: 'gamepad-2',
    description: 'QTech account mappings',
  },
  'userPamMapping': {
    entityName: 'User PAM Mappings',
    route: '/admin/userPamMapping',
    category: 'user',
    priority: 'medium',
    parentEntity: 'user',
    icon: 'link',
    description: 'PAM system mappings',
  },
  'session': {
    entityName: 'Sessions',
    route: '/admin/session',
    category: 'user',
    priority: 'high',
    parentEntity: 'user',
    childEntities: ['walletConnection', 'walletTransaction'],
    icon: 'key',
    description: 'User authentication sessions (all auth methods)',
  },
  'walletConnection': {
    entityName: 'Wallet Connections',
    route: '/admin/walletConnection',
    category: 'user',
    priority: 'medium',
    parentEntity: 'session',
    icon: 'plug',
    description: 'Wallet connection records',
  },
  'walletTransaction': {
    entityName: 'Wallet Transactions',
    route: '/admin/walletTransaction',
    category: 'user',
    priority: 'medium',
    parentEntity: 'session',
    icon: 'credit-card',
    description: 'Wallet transaction history',
  },

  // Gaming Integration
  'qtechGame': {
    entityName: 'QTech Games',
    route: '/admin/qtechGame',
    category: 'gaming',
    priority: 'high',
    childEntities: ['qtechGameRound', 'qtechTransaction', 'qtechNGRAggregation'],
    relatedEntities: ['userQtechAccount', 'gamingSession'],
    icon: 'joystick',
    description: 'QTech gaming platform',
  },
  'qtechGameRound': {
    entityName: 'QTech Game Rounds',
    route: '/admin/qtechGameRound',
    category: 'gaming',
    priority: 'medium',
    parentEntity: 'qtechGame',
    icon: 'circle',
    description: 'Game round records',
  },
  'qtechTransaction': {
    entityName: 'QTech Transactions',
    route: '/admin/qtechTransaction',
    category: 'gaming',
    priority: 'high',
    parentEntity: 'qtechGame',
    icon: 'repeat',
    description: 'QTech transaction records',
  },
  'qtechNGRAggregation': {
    entityName: 'QTech NGR Aggregations',
    route: '/admin/qtechNGRAggregation',
    category: 'gaming',
    priority: 'medium',
    parentEntity: 'qtechGame',
    icon: 'layers',
    description: 'NGR aggregation data',
  },
  'gamingSession': {
    entityName: 'Gaming Sessions',
    route: '/admin/gamingSession',
    category: 'gaming',
    priority: 'medium',
    parentEntity: 'user',
    relatedEntities: ['qtechGame'],
    icon: 'play',
    description: 'Gaming session records',
  },
  'pamTransaction': {
    entityName: 'PAM Transactions',
    route: '/admin/pamTransaction',
    category: 'gaming',
    priority: 'medium',
    parentEntity: 'user',
    icon: 'repeat',
    description: 'PAM transaction records',
  },

  // Content Management
  'blogPost': {
    entityName: 'Blog Posts',
    route: '/admin/blogPost',
    category: 'content',
    priority: 'high',
    parentEntity: 'user',
    childEntities: ['blogPostLike', 'comment', 'savedPost'],
    icon: 'file-text',
    description: 'Blog post management',
  },
  'blogPostLike': {
    entityName: 'Blog Post Likes',
    route: '/admin/blogPostLike',
    category: 'content',
    priority: 'low',
    parentEntity: 'blogPost',
    icon: 'heart',
    description: 'Blog post likes',
  },
  'comment': {
    entityName: 'Comments',
    route: '/admin/comment',
    category: 'content',
    priority: 'medium',
    parentEntity: 'blogPost',
    icon: 'message-square',
    description: 'Blog comments',
  },
  'savedPost': {
    entityName: 'Saved Posts',
    route: '/admin/savedPost',
    category: 'content',
    priority: 'low',
    parentEntity: 'blogPost',
    icon: 'bookmark',
    description: 'User saved posts',
  },
  'conversation': {
    entityName: 'Conversations',
    route: '/admin/conversation',
    category: 'content',
    priority: 'medium',
    childEntities: ['conversationMessage'],
    icon: 'message-circle',
    description: 'User conversations',
  },
  'conversationMessage': {
    entityName: 'Conversation Messages',
    route: '/admin/conversationMessage',
    category: 'content',
    priority: 'medium',
    parentEntity: 'conversation',
    icon: 'message-square',
    description: 'Conversation messages',
  },
  'chatSession': {
    entityName: 'Chat Sessions',
    route: '/admin/chatSession',
    category: 'content',
    priority: 'medium',
    parentEntity: 'user',
    childEntities: ['chatMessage'],
    icon: 'message-circle',
    description: 'Chat session records',
  },
  'chatMessage': {
    entityName: 'Chat Messages',
    route: '/admin/chatMessage',
    category: 'content',
    priority: 'medium',
    parentEntity: 'chatSession',
    icon: 'message-square',
    description: 'Chat message records',
  },

  // E-Commerce
  'category': {
    entityName: 'Categories',
    route: '/admin/category',
    category: 'ecommerce',
    priority: 'high',
    childEntities: ['product'],
    icon: 'folder',
    description: 'Product categories',
  },
  'product': {
    entityName: 'Products',
    route: '/admin/product',
    category: 'ecommerce',
    priority: 'high',
    parentEntity: 'category',
    childEntities: ['productVariant', 'review', 'orderItem'],
    relatedEntities: ['vendorProfile'],
    icon: 'package',
    description: 'Product management',
  },
  'productVariant': {
    entityName: 'Product Variants',
    route: '/admin/productVariant',
    category: 'ecommerce',
    priority: 'medium',
    parentEntity: 'product',
    icon: 'layers',
    description: 'Product variant records',
  },
  'vendorProfile': {
    entityName: 'Vendor Profiles',
    route: '/admin/vendorProfile',
    category: 'ecommerce',
    priority: 'medium',
    parentEntity: 'user',
    relatedEntities: ['product'],
    icon: 'store',
    description: 'Vendor profile records',
  },
  'order': {
    entityName: 'Orders',
    route: '/admin/order',
    category: 'ecommerce',
    priority: 'high',
    parentEntity: 'user',
    childEntities: ['orderItem', 'payment'],
    icon: 'shopping-cart',
    description: 'Order management',
  },
  'orderItem': {
    entityName: 'Order Items',
    route: '/admin/orderItem',
    category: 'ecommerce',
    priority: 'medium',
    parentEntity: 'order',
    relatedEntities: ['product'],
    icon: 'list',
    description: 'Order item records',
  },
  'payment': {
    entityName: 'Payments',
    route: '/admin/payment',
    category: 'ecommerce',
    priority: 'high',
    parentEntity: 'order',
    icon: 'credit-card',
    description: 'Payment records',
  },
  'cart': {
    entityName: 'Carts',
    route: '/admin/cart',
    category: 'ecommerce',
    priority: 'low',
    parentEntity: 'user',
    childEntities: ['cartItem'],
    icon: 'shopping-bag',
    description: 'Shopping cart records',
  },
  'cartItem': {
    entityName: 'Cart Items',
    route: '/admin/cartItem',
    category: 'ecommerce',
    priority: 'low',
    parentEntity: 'cart',
    relatedEntities: ['product'],
    icon: 'list',
    description: 'Cart item records',
  },
  'wishlistItem': {
    entityName: 'Wishlist Items',
    route: '/admin/wishlistItem',
    category: 'ecommerce',
    priority: 'low',
    parentEntity: 'user',
    relatedEntities: ['product'],
    icon: 'heart',
    description: 'Wishlist records',
  },
  'review': {
    entityName: 'Reviews',
    route: '/admin/review',
    category: 'ecommerce',
    priority: 'medium',
    parentEntity: 'product',
    icon: 'star',
    description: 'Product reviews',
  },

  // Payments
  'stripePayment': {
    entityName: 'Stripe Payments',
    route: '/admin/stripePayment',
    category: 'payments',
    priority: 'high',
    parentEntity: 'properties',
    relatedEntities: ['user'],
    icon: 'credit-card',
    description: 'Stripe payment records',
  },
  'stripeProduct': {
    entityName: 'Stripe Products',
    route: '/admin/stripeProduct',
    category: 'payments',
    priority: 'medium',
    childEntities: ['stripePrice', 'price'],
    icon: 'package',
    description: 'Stripe product records',
  },
  'stripePrice': {
    entityName: 'Stripe Prices',
    route: '/admin/stripePrice',
    category: 'payments',
    priority: 'medium',
    parentEntity: 'stripeProduct',
    icon: 'dollar-sign',
    description: 'Stripe price records',
  },
  'subscription': {
    entityName: 'Subscriptions',
    route: '/admin/subscription',
    category: 'payments',
    priority: 'high',
    parentEntity: 'user',
    relatedEntities: ['stripeProduct'],
    icon: 'repeat',
    description: 'User subscriptions',
  },
  'price': {
    entityName: 'Prices',
    route: '/admin/price',
    category: 'payments',
    priority: 'medium',
    parentEntity: 'stripeProduct',
    icon: 'tag',
    description: 'Price records',
  },
  'customer': {
    entityName: 'Customers',
    route: '/admin/customer',
    category: 'payments',
    priority: 'medium',
    parentEntity: 'user',
    icon: 'users',
    description: 'Customer records',
  },
};

/**
 * Get navigation category for grouping
 */
export const NAVIGATION_CATEGORIES = {
  'property': 'Property Management',
  'investment': 'Investment Management',
  'tokenization': 'Tokenization & Blockchain',
  'user': 'User Management',
  'gaming': 'Gaming Integration',
  'content': 'Content Management',
  'compliance': 'Compliance & Due Diligence',
  'ecommerce': 'E-Commerce',
  'payments': 'Payments',
  'system': 'System Administration',
};

/**
 * Get entity by key (route path without /admin/)
 */
function getEntityByKey(key: string): EntityRelationship | null {
  return Object.values(ENTITY_RELATIONSHIPS).find(e => {
    const routeKey = e.route.replace('/admin/', '');
    return routeKey === key || routeKey.toLowerCase() === key.toLowerCase();
  }) || null;
}

/**
 * Get entity by entity name (for parent/child relationships)
 */
function getEntityByName(name: string): EntityRelationship | null {
  const normalizedName = name.toLowerCase().replace(/\s+/g, '');
  return Object.values(ENTITY_RELATIONSHIPS).find(e => {
    const normalizedEntityName = e.entityName.toLowerCase().replace(/\s+/g, '');
    const routeKey = e.route.replace('/admin/', '').toLowerCase();
    return normalizedEntityName === normalizedName || routeKey === normalizedName || routeKey === name.toLowerCase();
  }) || null;
}

/**
 * Get child entities for a given parent
 */
export function getChildEntities(parentEntityKey: string): EntityRelationship[] {
  const parent = getEntityByKey(parentEntityKey);
  if (!parent?.childEntities) return [];
  
  return parent.childEntities
    .map(name => getEntityByName(name))
    .filter(Boolean) as EntityRelationship[];
}

/**
 * Get related entities for a given entity
 */
export function getRelatedEntities(entityKey: string): EntityRelationship[] {
  const entity = getEntityByKey(entityKey);
  if (!entity?.relatedEntities) return [];
  
  return entity.relatedEntities
    .map(name => getEntityByName(name))
    .filter(Boolean) as EntityRelationship[];
}

/**
 * Get parent entity for a given child
 */
export function getParentEntity(childEntityKey: string): EntityRelationship | null {
  const child = getEntityByKey(childEntityKey);
  if (!child?.parentEntity) return null;
  
  return getEntityByName(child.parentEntity) || null;
}

