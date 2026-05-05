// Client-side API client for React components
// This provides API-based data access without any hardcoded mock data

// Type definitions for API responses (should match database schema)
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  profileImageUrl?: string;
  role: string;
  status: string;
  isPremium: boolean;
  loyaltyPoints: number;
  totalSpent: number;
  bio?: string;
  website?: string;
  location?: string;
  phone?: string;
  dateOfBirth?: Date;
  emailVerified?: Date;
  password?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface UserPreferences {
  id: string;
  userId: string;
  themeMode: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  primaryFont: string;
  secondaryFont: string;
  fontSize: string;
  lineHeight: string;
  sidebarCollapsed: boolean;
  compactMode: boolean;
  animationsEnabled: boolean;
  reducedMotion: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  marketingEmails: boolean;
  profileVisibility: string;
  showOnlineStatus: boolean;
  allowDirectMessages: boolean;
  language: string;
  currency: string;
  dateFormat: string;
  timeFormat: string;
  aiProfile: string;
  aiTemperature: number;
  aiMaxTokens: number;
  aiStreaming: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatSession {
  id: string;
  userId: string;
  title?: string;
  aiProfile: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  metadata?: any;
  createdAt: Date;
}

export interface AIInteraction {
  id: string;
  userId: string;
  sessionId?: string;
  type: string;
  input: string;
  output?: string;
  metadata?: any;
  tokensUsed?: number;
  cost?: number;
  duration?: number;
  createdAt: Date;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  sku: string;
  price: number;
  comparePrice?: number;
  costPrice?: number;
  categoryId: string;
  vendorId: string;
  images: any;
  videos: any;
  tags: any;
  specifications?: any;
  dimensions?: any;
  materials: any;
  colors: any;
  sizes: any;
  trackInventory: boolean;
  inventory: number;
  lowStockThreshold: number;
  allowBackorder: boolean;
  metaTitle?: string;
  metaDescription?: string;
  featured: boolean;
  status: string;
  isLuxury: boolean;
  isExclusive: boolean;
  requiresApproval: boolean;
  premiumOnly: boolean;
  viewCount: number;
  purchaseCount: number;
  wishlistCount: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  vendorId?: string;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  shippingAddress: any;
  billingAddress: any;
  trackingNumber?: string;
  estimatedDelivery?: Date;
  deliveredAt?: Date;
  customerNotes?: string;
  internalNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Review {
  id: string;
  userId: string;
  productId: string;
  vendorId?: string;
  orderId?: string;
  rating: number;
  title?: string;
  content: string;
  images: any;
  isVerified: boolean;
  isApproved: boolean;
  moderatedBy?: string;
  moderatedAt?: Date;
  helpfulCount: number;
  reportCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BlogPost {
  id: string;
  authorId: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featuredImage?: string;
  images: any;
  tags: any;
  category?: string;
  metaTitle?: string;
  metaDescription?: string;
  status: string;
  publishedAt?: Date;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemConfig {
  id: string;
  key: string;
  value: string;
  type: string;
  description?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// API client class that uses fetch to communicate with server endpoints
export class APIClient {
  private baseUrl: string;

  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getUserWithPreferences(userId: string) {
    if (!userId) {
      throw new Error('User ID is required');
    }
    return this.request(`/users/${userId}/preferences`);
  }

  async createUser(userData: any) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(userId: string, userData: any) {
    return this.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async updateUserPreferences(userId: string, preferencesData: any) {
    return this.request(`/users/${userId}/preferences`, {
      method: 'PUT',
      body: JSON.stringify(preferencesData),
    });
  }

  async updateUserTheme(userId: string, themeData: any) {
    return this.request(`/users/${userId}/theme`, {
      method: 'PUT',
      body: JSON.stringify(themeData),
    });
  }

  async getProductsWithRatings(categoryId?: string) {
    const params = categoryId ? `?categoryId=${categoryId}` : '';
    return this.request(`/products/ratings${params}`);
  }

  async trackAIInteraction(userId: string, interaction: any) {
    return this.request('/ai/interactions', {
      method: 'POST',
      body: JSON.stringify({ userId, ...interaction }),
    });
  }

  async getMarketplaceStats() {
    return this.request('/marketplace/stats');
  }

  async createChatSession(userId: string, title?: string, aiProfile?: string) {
    return this.request('/chat/sessions', {
      method: 'POST',
      body: JSON.stringify({ userId, title, aiProfile }),
    });
  }

  async getChatSessions(userId: string) {
    return this.request(`/chat/sessions?userId=${userId}`);
  }

  async addChatMessage(sessionId: string, role: string, content: string, metadata?: any) {
    return this.request('/chat/messages', {
      method: 'POST',
      body: JSON.stringify({ sessionId, role, content, metadata }),
    });
  }

  async getBlogPosts(status?: string) {
    const params = status ? `?status=${status}` : '';
    return this.request(`/blog/posts${params}`);
  }

  async getSystemConfig(key: string) {
    return this.request(`/system/config/${key}`);
  }

  async setSystemConfig(key: string, value: string, type: string = 'string', description?: string) {
    return this.request('/system/config', {
      method: 'POST',
      body: JSON.stringify({ key, value, type, description }),
    });
  }
}

// API-based database wrapper that follows database-first approach
export class TigerPalaceDB {
  private api: APIClient;

  constructor(apiClient?: APIClient) {
    this.api = apiClient || new APIClient();
  }

  // All methods delegate to API calls - no hardcoded data
  async getUserWithPreferences(userId: string) {
    return this.api.getUserWithPreferences(userId);
  }

  async createUser(userData: any) {
    return this.api.createUser(userData);
  }

  async updateUser(userId: string, userData: any) {
    return this.api.updateUser(userId, userData);
  }

  async updateUserPreferences(userId: string, preferencesData: any) {
    return this.api.updateUserPreferences(userId, preferencesData);
  }

  async updateUserTheme(userId: string, themeData: any) {
    return this.api.updateUserTheme(userId, themeData);
  }

  async getProductsWithRatings(categoryId?: string) {
    return this.api.getProductsWithRatings(categoryId);
  }

  async trackAIInteraction(userId: string, interaction: any) {
    return this.api.trackAIInteraction(userId, interaction);
  }

  async getMarketplaceStats() {
    return this.api.getMarketplaceStats();
  }

  async createChatSession(userId: string, title?: string, aiProfile?: string) {
    return this.api.createChatSession(userId, title, aiProfile);
  }

  async getChatSessions(userId: string) {
    return this.api.getChatSessions(userId);
  }

  async addChatMessage(sessionId: string, role: string, content: string, metadata?: any) {
    return this.api.addChatMessage(sessionId, role, content, metadata);
  }

  async getBlogPosts(status?: string) {
    return this.api.getBlogPosts(status);
  }

  async getSystemConfig(key: string) {
    return this.api.getSystemConfig(key);
  }

  async setSystemConfig(key: string, value: string, type: string = 'string', description?: string) {
    return this.api.setSystemConfig(key, value, type, description);
  }
}

// Export API-based functions that get data from database via API routes
export async function getDb() {
  return new APIClient();
}

export async function getTigerPalaceDB(): Promise<TigerPalaceDB> {
  return new TigerPalaceDB();
}
