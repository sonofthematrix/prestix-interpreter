import { createClient } from '@/lib/db';

/**
 * Creates default user preferences for a new user
 */
export async function createDefaultUserPreferences(userId: string) {
  const db = createClient();
  
  try {
    const defaultPreferences = await db.userPreferences.create({
      data: {
        userId,
        // Theme Preferences
        themeMode: 'DARK',
        primaryColor: '#D2691E', // Tiger Orange
        secondaryColor: '#0A3A2A', // Forest Green
        accentColor: '#E6B800', // Golden Amber
        backgroundColor: '#1a1a1a', // Dark background
        textColor: '#ffffff', // White text
        
        // Typography
        primaryFont: 'var(--font-geist-sans)',
        secondaryFont: 'var(--font-geist-mono)',
        fontSize: '16px',
        lineHeight: '1.5',
        
        // Layout Preferences
        sidebarCollapsed: false,
        compactMode: false,
        animationsEnabled: true,
        reducedMotion: false,
        
        // Notification Preferences
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
        marketingEmails: false,
        
        // Privacy Settings
        profileVisibility: 'public',
        showOnlineStatus: true,
        allowDirectMessages: true,
        
        // Language & Localization
        language: 'en',
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        
        // AI Preferences
        aiProfile: 'DEVELOPER',
        aiTemperature: 0.7,
        aiMaxTokens: 4000,
        aiStreaming: true,
      }
    });
    
    return defaultPreferences;
  } catch (error) {
    console.error('Error creating default user preferences:', error);
    throw error;
  }
}

/**
 * Gets user preferences, creating default ones if they don't exist
 */
export async function getOrCreateUserPreferences(userId: string) {
  const db = createClient();
  
  try {
    // Try to get existing preferences
    let preferences = await db.userPreferences.findUnique({
      where: { userId } as any,
    });
    
    // If no preferences exist, create default ones
    if (!preferences) {
      preferences = await createDefaultUserPreferences(userId);
    }
    
    return preferences;
  } catch (error) {
    console.error('Error getting or creating user preferences:', error);
    throw error;
  }
}
