import { createClient } from '@/lib/db';
import { createDefaultUserPreferences } from '@/lib/user-preferences';
import { AuditActivityLogger } from '@/lib/services/audit-activity-logger';

interface UserInitializationOptions {
  userId: string;
  email: string;
  name: string;
  walletAddress?: string;
  authMethod: 'wallet' | 'email' | 'social';
  provider?: string; // For social auth (e.g., 'google', 'github')
  providerAccountId?: string; // For social auth
  ipAddress?: string;
  userAgent?: string;
}

interface UserInitializationResult {
  success: boolean;
  isNewUser: boolean;
  user: any;
  account?: any;
  preferences?: any;
  activityLogged: boolean;
  errors?: string[];
}

/**
 * Onboarding Task Definitions
 * Each task represents a required or optional step for new users
 */
export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  pageUrl: string;
  isMandatory: boolean;
  category: 'profile' | 'wallet' | 'preferences' | 'marketplace' | 'exploration';
  order: number;
}

export const ONBOARDING_TASKS: OnboardingTask[] = [
  {
    id: 'complete-profile',
    title: 'Complete Your Profile',
    description: 'Add your personal information, profile picture, and bio to personalize your account',
    pageUrl: '/profile?tab=account&subtab=personal',
    isMandatory: true,
    category: 'profile',
    order: 1,
  },
  {
    id: 'connect-wallet',
    title: 'Connect Your Wallet',
    description: 'Link your Web3 wallet to access blockchain features and make investments',
    pageUrl: '/profile?tab=account&subtab=wallet',
    isMandatory: false,
    category: 'wallet',
    order: 2,
  },
  {
    id: 'setup-preferences',
    title: 'Configure Preferences',
    description: 'Set your notification preferences, theme, and communication settings',
    pageUrl: '/profile?tab=account&subtab=preferences',
    isMandatory: false,
    category: 'preferences',
    order: 3,
  },
  {
    id: 'explore-marketplace',
    title: 'Explore Marketplace',
    description: 'Browse available real estate investment opportunities',
    pageUrl: '/marketplace',
    isMandatory: false,
    category: 'marketplace',
    order: 4,
  },
  {
    id: 'view-tutorial',
    title: 'Watch Platform Tutorial',
    description: 'Learn how to navigate the platform and make your first investment',
    pageUrl: '/docs/getting-started',
    isMandatory: false,
    category: 'exploration',
    order: 5,
  },
  {
    id: 'read-guide',
    title: 'Read Investment Guide',
    description: 'Understand how real estate tokenization works and investment options',
    pageUrl: '/docs/investment-guide',
    isMandatory: false,
    category: 'exploration',
    order: 6,
  },
];

/**
 * Create onboarding notifications for a new user
 */
async function createOnboardingNotifications(
  userId: string,
  tasks: OnboardingTask[]
): Promise<void> {
  const db = createClient();
  
  // Create notifications for each task
  const notifications = await Promise.all(
    tasks.map(async (task, index) => {
      // Only send first notification immediately, others can be sent progressively
      const shouldSendImmediately = index === 0;
      
      return db.notification.create({
        data: {
          title: task.isMandatory 
            ? `🎯 ${task.title} (Required)`
            : `💡 ${task.title} (Optional)`,
          message: task.description,
          type: task.isMandatory ? 'TASK' : 'INFO' as any,
          status: shouldSendImmediately ? 'UNREAD' : 'UNREAD',
          channel: 'IN_APP',
          recipientId: userId,
          userId: userId, // Legacy field
          link: task.pageUrl,
          linkText: task.isMandatory ? 'Complete Now' : 'Explore',
          data: {
            taskId: task.id,
            isMandatory: task.isMandatory,
            category: task.category,
            order: task.order,
            onboardingTask: true,
          },
          isRead: false,
          isSent: shouldSendImmediately,
          sentAt: shouldSendImmediately ? new Date() : null,
        },
      });
    })
  );
  
  console.log(`✅ Created ${notifications.length} onboarding notifications for user ${userId}`);
}

/**
 * Comprehensive User Initialization Service
 * 
 * Creates all required schema dependencies when a new user signs up:
 * - User (already created)
 * - Account (OAuth/credentials record)
 * - UserPreferences (default settings)
 * - (UserQtechAccount removed - QTech/PAM gaming no longer in schema)
 * - Portfolio (Empty portfolio for real estate investments)
 * - UserEngagementMetrics (Membership tier tracking - starts at BRONZE)
 * - AddressBook (Empty address book entry)
 * - Audit logs (account creation)
 * - User activity (registration event)
 * - Onboarding notifications (task reminders)
 */
export async function initializeNewUser(
  options: UserInitializationOptions
): Promise<UserInitializationResult> {
  const db = createClient();
  const errors: string[] = [];
  let account: any = null;
  let preferences: any = null;
  let activityLogged = false;

  try {
    // 1. Check if user already exists and has dependencies initialized
    const existingUser = await db.user.findUnique({
      where: { id: options.userId } as any,
      include: {
        accounts: true,
        preferences: true,
        portfolio: true,
        engagementMetrics: true,
      },
    });

    if (!existingUser) {
      throw new Error(`User ${options.userId} not found`);
    }

    const accounts = (existingUser as { accounts?: unknown[] }).accounts;
    const portfolio = (existingUser as { portfolio?: unknown[] }).portfolio;
    const isNewUser = !accounts || accounts.length === 0;

    // 2. Create Account record if it doesn't exist (for OAuth/credentials tracking)
    // Use upsert to handle both new and existing accounts gracefully
    if (isNewUser || !accounts || accounts.length === 0) {
      // Determine provider and providerAccountId
      const provider = options.provider || (options.walletAddress ? 'wallet' : 'credentials');
      const providerAccountId = options.providerAccountId || options.walletAddress || options.email;
      
      if (provider && providerAccountId) {
        try {
          // Use upsert to handle existing accounts gracefully
          account = await db.account.upsert({
            where: {
              provider_providerAccountId: {
                provider: provider,
                providerAccountId: providerAccountId,
              },
            },
            update: {
              userId: options.userId,
              type: options.authMethod === 'social' || options.walletAddress ? 'oauth' : 'credentials',
            },
            create: {
              userId: options.userId,
              type: options.authMethod === 'social' || options.walletAddress ? 'oauth' : 'credentials',
              provider: provider,
              providerAccountId: providerAccountId,
            },
          } as any);
          console.log('✅ Account record ensured:', account.id);
        } catch (error: any) {
          // If upsert still fails, try to find existing account
          console.error('⚠️ Account upsert error:', error);
          errors.push(`Account creation failed: ${error.message}`);
          
          try {
            account = await db.account.findFirst({
              where: {
                userId: options.userId,
                provider: provider,
              },
            });
            if (account) {
              console.log('✅ Found existing Account record after upsert failure:', account.id);
            }
          } catch (findError) {
            console.error('❌ Failed to find existing account:', findError);
          }
        }
      } else {
        console.warn('⚠️ Cannot create Account record: missing provider or providerAccountId');
        errors.push('Account creation skipped: missing provider information');
      }
    }

    // 3. Create UserPreferences if they don't exist
    if (!existingUser.preferences) {
      try {
        preferences = await createDefaultUserPreferences(options.userId);
        console.log('✅ User preferences created:', preferences.id);
      } catch (error: any) {
        errors.push(`Preferences creation failed: ${error.message}`);
        console.error('⚠️ Preferences creation error:', error);
      }
    } else {
      preferences = existingUser.preferences;
    }

    // 4. UserQtechAccount removed - QTech/PAM gaming no longer in schema

    // 5. Create Portfolio (empty) if it doesn't exist
    // Note: portfolio is an array, but typically one per user
    if (isNewUser && (!portfolio || portfolio.length === 0)) {
      try {
        await db.portfolio.create({
          data: {
            userId: options.userId,
          },
        } as any);
        console.log('✅ Portfolio created (empty)');
      } catch (error: any) {
        errors.push(`Portfolio creation failed: ${error.message}`);
        console.error('⚠️ Portfolio creation error:', error);
      }
    }

    // 6. Create UserEngagementMetrics (Membership Tier Tracking) if it doesn't exist
    // Note: engagementMetrics is optional and singular (one per user)
    if (isNewUser && !existingUser.engagementMetrics) {
      try {
        await db.userEngagementMetrics.create({
          data: {
            userId: options.userId,
            currentTier: 'BRONZE',
          },
        } as any);
        console.log('✅ UserEngagementMetrics created (BRONZE tier)');
      } catch (error: any) {
        errors.push(`UserEngagementMetrics creation failed: ${error.message}`);
        console.error('⚠️ UserEngagementMetrics creation error:', error);
      }
    }

    // 7. Create AddressBook entry (empty) if it doesn't exist
    if (isNewUser) {
      try {
        // Check if user already has address book entries
        const existingAddressBook = await db.addressBook.findFirst({
          where: { userId: options.userId } as any,
        });

        if (!existingAddressBook) {
          // Create a default empty address book entry
          // Note: AddressBook requires firstName, lastName, address1, city, postalCode, country
          // We'll create a placeholder entry that user can update later
          const [firstName, ...lastNameParts] = (options.name || 'User').split(' ');
          const lastName = lastNameParts.join(' ') || 'User';

          await db.addressBook.create({
            data: {
              userId: options.userId,
              name: 'Default',
              firstName: firstName,
              lastName: lastName,
              address1: 'Address not set', // Placeholder
              city: 'City not set', // Placeholder
              postalCode: '00000', // Placeholder
              country: 'USA', // Default country
              isDefault: true,
            },
          });
          console.log('✅ AddressBook entry created (placeholder)');
        }
      } catch (error: any) {
        errors.push(`AddressBook creation failed: ${error.message}`);
        console.error('⚠️ AddressBook creation error:', error);
      }
    }

    // 8. Create onboarding notifications for new users
    if (isNewUser) {
      try {
        await createOnboardingNotifications(options.userId, ONBOARDING_TASKS);
        console.log('✅ Onboarding notifications created');
      } catch (error: any) {
        errors.push(`Onboarding notifications creation failed: ${error.message}`);
        console.error('⚠️ Onboarding notifications error:', error);
      }
    }

    // 9. Log account creation activity and audit
    if (isNewUser) {
      try {
        // Log user activity
        await db.userActivity.create({
          data: {
            userId: options.userId,
            action: 'account_created',
            resource: 'User',
            resourceId: options.userId,
            metadata: JSON.stringify({
              authMethod: options.authMethod,
              provider: options.provider,
              walletAddress: options.walletAddress,
              timestamp: new Date().toISOString(),
            }),
          },
        });

        // Log audit trail
        await AuditActivityLogger.logCreate(
          'User',
          options.userId,
          options.userId, // Creator is the user themselves
          {
            id: options.userId,
            email: options.email,
            name: options.name,
            authMethod: options.authMethod,
            walletAddress: options.walletAddress,
          },
          {
            ipAddress: options.ipAddress,
            userAgent: options.userAgent,
            source: 'auth',
          }
        );

        activityLogged = true;
        console.log('✅ Activity and audit logs created');
      } catch (error: any) {
        errors.push(`Activity logging failed: ${error.message}`);
        console.error('⚠️ Activity logging error:', error);
      }
    }
    console.log('✅ User initialization completed');
    
    // Filter out non-critical errors (Account already exists is expected)
    const criticalErrors = errors.filter(error => 
      !error.includes('Account creation failed') && 
      !error.includes('already exists') &&
      !error.includes('Unique constraint')
    );
    
    // Consider initialization successful if only non-critical errors occurred
    const isSuccessful = criticalErrors.length === 0;
    
    if (errors.length > 0) {
      console.log(`ℹ️ User initialization completed with ${errors.length} non-critical warnings:`, errors);
    }
    
    return {
      success: isSuccessful,
      isNewUser,
      user: existingUser,
      account,
      preferences,
      activityLogged,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error: any) {
    console.error('❌ User initialization failed:', error);
    return {  
      success: false,
      isNewUser: false,
      user: null,
      activityLogged: false,
      errors: [error.message || 'Unknown error during initialization'],
    };
  }
}

/**
 * Initialize user dependencies in a transaction for atomicity
 */
export async function initializeNewUserTransactional(
  options: UserInitializationOptions
): Promise<UserInitializationResult> {
  const db = createClient();
  
  try {
    return await db.$transaction(async (tx: any) => {
      const result = await initializeNewUser(options);
      
      // If any critical step failed, throw to rollback
      if (!result.success && result.errors?.some(e => 
        e.includes('Account') || e.includes('Preferences')
      )) {
        throw new Error(`Initialization failed: ${result.errors?.join(', ')}`);
      }
      
      return result;
    });
  } catch (error: any) {
    console.error('❌ Transactional initialization failed:', error);
    return {
      success: false,
      isNewUser: false,
      user: null,
      activityLogged: false,
      errors: [error.message || 'Transaction failed'],
    };
  }
}

/**
 * Get onboarding completion status for a user
 */
export async function getOnboardingStatus(userId: string): Promise<{
  completedTasks: string[];
  pendingTasks: OnboardingTask[];
  completionPercentage: number;
  isComplete: boolean;
}> {
  const db = createClient();
  
  // Get all notifications for this user that are onboarding tasks
  const notifications = await db.notification.findMany({
    where: { recipientId: userId } as any,
  });
  
  const onboardingNotifications = notifications.filter((n: { data?: unknown }) => {
    const data = n.data as any;
    return data && data.onboardingTask === true;
  });
  
  const completedTaskIds: string[] = [];
  const pendingTasks: OnboardingTask[] = [];
  
  for (const task of ONBOARDING_TASKS) {
    const notification = onboardingNotifications.find(
      (n: { data?: unknown }) => {
        const data = n.data as any;
        return data && data.taskId === task.id;
      }
    );
    
    if (notification?.isRead) {
      completedTaskIds.push(task.id);
    } else {
      pendingTasks.push(task);
    }
  }
  
  const completionPercentage = Math.round(
    (completedTaskIds.length / ONBOARDING_TASKS.length) * 100
  );
  
  // Consider onboarding complete if all mandatory tasks are done
  const mandatoryTasks = ONBOARDING_TASKS.filter(t => t.isMandatory);
  const completedMandatoryTasks = mandatoryTasks.filter(t => 
    completedTaskIds.includes(t.id)
  );
  const isComplete = completedMandatoryTasks.length === mandatoryTasks.length;
  
  return {
    completedTasks: completedTaskIds,
    pendingTasks,
    completionPercentage,
    isComplete,
  };
}
