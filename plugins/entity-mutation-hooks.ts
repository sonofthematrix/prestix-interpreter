import { createClient } from '@/lib/db';

/**
 * Entity Mutation Hooks Plugin
 * Provides hooks for intercepting database mutations with before/after callbacks
 */

export interface MutationHookContext {
  model: string;
  action: string;
  args: any;
  proceed: (args?: any) => Promise<any>;
  loadBeforeMutationEntities?: () => Promise<any>;
  loadAfterMutationEntities?: () => Promise<any>;
}

export interface EntityMutationHooks {
  beforeEntityMutation?: (context: MutationHookContext) => void | Promise<void>;
  afterEntityMutation?: (context: MutationHookContext) => void | Promise<void>;
}

export interface PluginConfig {
  id: string;
  onEntityMutation?: EntityMutationHooks;
  onQuery?: (context: any) => Promise<any>;
}

/**
 * Enhanced database client with plugin support
 */
export class EnhancedZenStackClient {
  private plugins: PluginConfig[] = [];

  constructor(private client: ReturnType<typeof createClient>) {}

  /**
   * Add a plugin to intercept operations
   */
  $use(plugin: PluginConfig) {
    this.plugins.push(plugin);
    return this.createEnhancedClient();
  }

  private createEnhancedClient() {
    const enhanced = { ...this.client } as any;

    // Enhance all model operations
    const models = ['user', 'product', 'order', 'review', 'blogPost', 'category', 'vendorProfile'];

    models.forEach(model => {
      if (enhanced[model]) {
        const modelClient = enhanced[model];

        // Enhance CRUD operations
        ['create', 'update', 'delete', 'upsert'].forEach(operation => {
          if (modelClient[operation]) {
            const originalMethod = modelClient[operation].bind(modelClient);

            modelClient[operation] = async (args: any) => {
              // Run before hooks
              for (const plugin of this.plugins) {
                if (plugin.onEntityMutation?.beforeEntityMutation) {
                  await plugin.onEntityMutation.beforeEntityMutation({
                    model,
                    action: operation,
                    args,
                    proceed: originalMethod,
                    loadBeforeMutationEntities: operation === 'update' || operation === 'delete' ?
                      async () => {
                        if (operation === 'update' && args.where) {
                          return await enhanced[model].findUnique({ where: args.where });
                        }
                        if (operation === 'delete' && args.where) {
                          return await enhanced[model].findUnique({ where: args.where });
                        }
                        return null;
                      } : undefined
                  });
                }
              }

              // Execute operation
              const result = await originalMethod(args);

              // Run after hooks
              for (const plugin of this.plugins) {
                if (plugin.onEntityMutation?.afterEntityMutation) {
                  await plugin.onEntityMutation.afterEntityMutation({
                    model,
                    action: operation,
                    args,
                    proceed: () => Promise.resolve(result),
                    loadAfterMutationEntities: async () => {
                      if (result && typeof result === 'object' && result.id) {
                        return await enhanced[model].findUnique({ where: { id: result.id } });
                      }
                      return result;
                    }
                  });
                }
              }

              return result;
            };
          }
        });
      }
    });

    return enhanced;
  }
}

// Create enhanced client instance
export const enhancedDb = new EnhancedZenStackClient(createClient());

/**
 * Audit Log Plugin - Logs all entity mutations
 */
export const auditLogPlugin: PluginConfig = {
  id: 'audit-log',
  onEntityMutation: {
    beforeEntityMutation: async ({ model, action, args, loadBeforeMutationEntities }) => {
      console.log(`[AUDIT] ${model} ${action} - Before:`, args);

      // Store before state for comparison
      if (loadBeforeMutationEntities) {
        const beforeEntities = await loadBeforeMutationEntities();
        if (beforeEntities) {
          // In a real implementation, you'd store this in a context for after-hook comparison
          console.log(`[AUDIT] Before state:`, beforeEntities);
        }
      }
    },

    afterEntityMutation: async ({ model, action, args, loadAfterMutationEntities }) => {
      const afterEntities = await loadAfterMutationEntities?.();
      console.log(`[AUDIT] ${model} ${action} - After:`, afterEntities);

      // Create audit log entry (using AIInteraction for now)
      // TODO: Create proper AuditLog model in schema
      try {
        await createClient().aIInteraction.create({
          data: {
            type: 'AUDIT_LOG',
            input: `${model}_${action}`,
            output: 'success',
            cost: 0,
            tokensUsed: 0,
            duration: 0,
            userid: 'xronr0y2ule1my2abd0wfulc', // In real app, get from session
            metadata: {
              entityType: model,
              entityId: afterEntities?.id || args.where?.id,
              action,
              newData: afterEntities
            }
          }
        });
      } catch (error) {
        console.error('[AUDIT] Failed to create audit log:', error);
      }
    }
  }
};

/**
 * Validation Plugin - Validates data before mutations
 */
export const validationPlugin: PluginConfig = {
  id: 'validation',
  onEntityMutation: {
    beforeEntityMutation: ({ model, action, args }) => {
      console.log(`[VALIDATION] Validating ${model} ${action}`);

      // Example validations
      if (model === 'user' && action === 'create') {
        if (!args.data?.email?.includes('@')) {
          throw new Error('Invalid email format');
        }
        if (args.data?.password && args.data.password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
      }

      if (model === 'product' && action === 'create') {
        if (!args.data?.name || args.data.name.trim().length === 0) {
          throw new Error('Product name is required');
        }
        if (args.data?.price && args.data.price < 0) {
          throw new Error('Price cannot be negative');
        }
      }

      if (model === 'order' && action === 'create') {
        if (!args.data?.items || args.data.items.length === 0) {
          throw new Error('Order must have at least one item');
        }
      }
    }
  }
};

/**
 * Cache Invalidation Plugin - Clears relevant caches after mutations
 */
export const cacheInvalidationPlugin: PluginConfig = {
  id: 'cache-invalidation',
  onEntityMutation: {
    afterEntityMutation: ({ model, action, args }) => {
      console.log(`[CACHE] Invalidating cache for ${model} ${action}`);

      // Example cache invalidation logic
      // In a real app, you'd integrate with Redis, in-memory cache, etc.
      if (model === 'product') {
        // Clear product-related caches
        console.log(`[CACHE] Cleared product cache for ID: ${args.where?.id || 'new'}`);
      }

      if (model === 'user') {
        // Clear user-related caches
        console.log(`[CACHE] Cleared user cache for ID: ${args.where?.id || 'new'}`);
      }
    }
  }
};

/**
 * Notification Plugin - Sends notifications after important mutations
 */
export const notificationPlugin: PluginConfig = {
  id: 'notifications',
  onEntityMutation: {
    afterEntityMutation: async ({ model, action, args, loadAfterMutationEntities }) => {
      console.log(`[NOTIFICATION] Processing notifications for ${model} ${action}`);

      try {
        if (model === 'order' && action === 'create') {
          const order = await loadAfterMutationEntities?.();
          if (order) {
            // Send order confirmation notification (using AIInteraction for now)
            // TODO: Create proper Notification model in schema
            await createClient().aIInteraction.create({
              data: {
                type: 'NOTIFICATION',
                input: 'ORDER_CREATED',
                output: `Order #${order.id} created`,
                cost: 0,
                tokensUsed: 0,
                duration: 0,
                userId: order.userId,
                metadata: {
                  orderId: order.id,
                  notificationType: 'ORDER_CREATED'
                }
              }
            });
          }
        }

        if (model === 'product' && action === 'update') {
          const product = await loadAfterMutationEntities?.();
          if (product && args.data?.status === 'OUT_OF_STOCK') {
            // Notify users who have this in wishlist
            console.log(`[NOTIFICATION] Would notify users about out-of-stock product: ${product.name}`);
          }
        }
      } catch (error) {
        console.error('[NOTIFICATION] Failed to send notification:', error);
      }
    }
  }
};

/**
 * Business Logic Plugin - Enforces business rules
 */
export const businessLogicPlugin: PluginConfig = {
  id: 'business-logic',
  onEntityMutation: {
    beforeEntityMutation: async ({ model, action, args }) => {
      if (model === 'order' && action === 'create') {
        // Calculate totals
        let subtotal = 0;
        for (const item of args.data?.items || []) {
          const product = await createClient().product.findUnique({
            where: { id: item.productId }
          });
          if (!product) {
            throw new Error(`Product ${item.productId} not found`);
          }
          if (product.inventory < item.quantity) {
            throw new Error(`Insufficient inventory for product ${product.name}`);
          }
          subtotal += Number(product.price) * item.quantity;
        }

        // Add calculated fields
        args.data.subtotal = subtotal;
        args.data.taxAmount = subtotal * 0.08; // 8% tax
        args.data.shippingAmount = subtotal > 100 ? 0 : 10; // Free shipping over $100
        args.data.totalAmount = args.data.subtotal + args.data.taxAmount + args.data.shippingAmount;
      }
    },

    afterEntityMutation: async ({ model, action, args }) => {
      if (model === 'order' && action === 'create') {
        // Update product inventory
        for (const item of args.data?.items || []) {
          await createClient().product.update({
            where: { id: item.productId },
            data: {
              inventory: { decrement: item.quantity },
              purchaseCount: { increment: item.quantity }
            }
          });
        }
      }
    }
  }
};

// Export default enhanced database client - simplified for now
// In production, this would include the full plugin system
export const dbWithPlugins = createClient();
