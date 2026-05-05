import { getTigerPalaceDB } from './database-client';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  surface: string;
  border: string;
  muted: string;
  mutedForeground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  destructive: string;
  destructiveForeground: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  info: string;
  infoForeground: string;
}

export interface ThemeConfig {
  mode: 'light' | 'dark' | 'system' | 'custom';
  colors: ThemeColors;
  fonts: {
    primary: string;
    secondary: string;
    mono: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
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

// Default Tokenizin theme configurations
export const DEFAULT_THEMES: Record<'light' | 'dark' | 'system' | 'custom', ThemeConfig> = {
  light: {
    mode: 'light',
    colors: {
      primary: '#D2691E', // Tiger Orange
      secondary: '#0A3A2A', // Forest Green
      accent: '#E6B800', // Golden Amber
      background: '#F8F5F0', // Cream
      text: '#3D2C20', // Deep Brown
      surface: '#FFFFFF',
      border: '#D4C4B0', // Warm border
      muted: '#E0D8C8', // Light beige
      mutedForeground: '#605040', // Muted brown
      card: '#FFFFFF',
      cardForeground: '#3D2C20',
      popover: '#FFFFFF',
      popoverForeground: '#3D2C20',
      destructive: '#DC2626',
      destructiveForeground: '#FFFFFF',
      success: '#16A34A',
      successForeground: '#FFFFFF',
      warning: '#D97706',
      warningForeground: '#FFFFFF',
      info: '#2563EB',
      infoForeground: '#FFFFFF',
    },
    fonts: {
      primary: 'var(--font-geist-sans)',
      secondary: 'var(--font-geist-mono)',
      mono: 'var(--font-geist-mono)',
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '3rem',
    },
    borderRadius: {
      sm: '0.25rem',
      md: '0.5rem',
      lg: '0.75rem',
      xl: '1rem',
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    },
    animations: {
      duration: {
        fast: '150ms',
        normal: '300ms',
        slow: '500ms',
      },
      easing: {
        ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      },
    },
  },

  dark: {
    mode: 'dark',
    colors: {
      primary: '#E6B800', // Golden Amber
      secondary: '#25 70% 45%', // Tiger Orange
      accent: '#D2691E', // Tiger Orange
      background: '#0A3A2A', // Deep forest green
      text: '#F8F5F0', // Soft cream
      surface: '#1E6040', // Darker green
      border: '#2A3A36', // Dark border
      muted: '#2A3A36', // Muted dark green
      mutedForeground: '#A09080', // Muted gold-grey
      card: '#1E6040',
      cardForeground: '#F8F5F0',
      popover: '#1E6040',
      popoverForeground: '#F8F5F0',
      destructive: '#DC2626',
      destructiveForeground: '#FFFFFF',
      success: '#16A34A',
      successForeground: '#FFFFFF',
      warning: '#D97706',
      warningForeground: '#FFFFFF',
      info: '#2563EB',
      infoForeground: '#FFFFFF',
    },
    fonts: {
      primary: 'var(--font-geist-sans)',
      secondary: 'var(--font-geist-mono)',
      mono: 'var(--font-geist-mono)',
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '3rem',
    },
    borderRadius: {
      sm: '0.25rem',
      md: '0.5rem',
      lg: '0.75rem',
      xl: '1rem',
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
    },
    animations: {
      duration: {
        fast: '150ms',
        normal: '300ms',
        slow: '500ms',
      },
      easing: {
        ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      },
    },
  },

  system: {
    // System theme will be determined at runtime
    mode: 'system',
    colors: {} as ThemeColors,
    fonts: {
      primary: 'var(--font-geist-sans)',
      secondary: 'var(--font-geist-mono)',
      mono: 'var(--font-geist-mono)',
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '3rem',
    },
    borderRadius: {
      sm: '0.25rem',
      md: '0.5rem',
      lg: '0.75rem',
      xl: '1rem',
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    },
    animations: {
      duration: {
        fast: '150ms',
        normal: '300ms',
        slow: '500ms',
      },
      easing: {
        ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      },
    },
  },

  custom: {
    // Custom theme will be loaded from user preferences
    mode: 'custom',
    colors: {} as ThemeColors,
    fonts: {
      primary: 'var(--font-geist-sans)',
      secondary: 'var(--font-geist-mono)',
      mono: 'var(--font-geist-mono)',
    },
    spacing: {
      xs: '0.25rem',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
      '2xl': '3rem',
    },
    borderRadius: {
      sm: '0.25rem',
      md: '0.5rem',
      lg: '0.75rem',
      xl: '1rem',
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    },
    animations: {
      duration: {
        fast: '150ms',
        normal: '300ms',
        slow: '500ms',
      },
      easing: {
        ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      },
    },
  },
};

export class ThemeManager {
  private tigerPalaceDB: any;
  private currentTheme: ThemeConfig;
  private systemTheme: 'light' | 'dark' | 'system' | 'custom';

  constructor(tigerPalaceDB?: any) {
    this.tigerPalaceDB = tigerPalaceDB;
    this.systemTheme = this.detectSystemTheme();
    this.currentTheme = this.getDefaultTheme();
  }

  async initialize() {
    this.tigerPalaceDB = await getTigerPalaceDB();
  }

  private detectSystemTheme(): 'light' | 'dark' | 'system' | 'custom' {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return 'light';
  }

  private getDefaultTheme(): ThemeConfig {
    return DEFAULT_THEMES.light;
  }

  async loadUserTheme(userId: string): Promise<ThemeConfig> {
    try {
      if (!this.tigerPalaceDB) {
        await this.initialize();
      }

      if (!userId) {
        console.warn('No user ID provided, using default theme');
        return this.getDefaultTheme();
      }

      const userData = await this.tigerPalaceDB.getUserWithPreferences(userId);
      const preferences = userData?.preferences;

      if (!preferences) {
        return this.getDefaultTheme();
      }

      const themeMode = preferences.themeMode;
      
      if (themeMode === 'SYSTEM') {
        return DEFAULT_THEMES[this.systemTheme] || DEFAULT_THEMES.light;
      }

      if (themeMode === 'CUSTOM') {
        return this.buildCustomTheme(preferences);
      }

      return DEFAULT_THEMES[themeMode] || this.getDefaultTheme();
    } catch (error) {
      console.error('Error loading user theme:', error);
      return this.getDefaultTheme();
    }
  }

  private buildCustomTheme(preferences: any): ThemeConfig {
    const customTheme = { ...DEFAULT_THEMES.custom };

    customTheme.colors = {
      primary: preferences.primaryColor || DEFAULT_THEMES.light.colors.primary,
      secondary: preferences.secondaryColor || DEFAULT_THEMES.light.colors.secondary,
      accent: preferences.accentColor || DEFAULT_THEMES.light.colors.accent,
      background: preferences.backgroundColor || DEFAULT_THEMES.light.colors.background,
      text: preferences.textColor || DEFAULT_THEMES.light.colors.text,
      surface: DEFAULT_THEMES.light.colors.surface,
      border: DEFAULT_THEMES.light.colors.border,
      muted: DEFAULT_THEMES.light.colors.muted,
      mutedForeground: DEFAULT_THEMES.light.colors.mutedForeground,
      card: DEFAULT_THEMES.light.colors.card,
      cardForeground: DEFAULT_THEMES.light.colors.cardForeground,
      popover: DEFAULT_THEMES.light.colors.popover,
      popoverForeground: DEFAULT_THEMES.light.colors.popoverForeground,
      destructive: DEFAULT_THEMES.light.colors.destructive,
      destructiveForeground: DEFAULT_THEMES.light.colors.destructiveForeground,
      success: DEFAULT_THEMES.light.colors.success,
      successForeground: DEFAULT_THEMES.light.colors.successForeground,
      warning: DEFAULT_THEMES.light.colors.warning,
      warningForeground: DEFAULT_THEMES.light.colors.warningForeground,
      info: DEFAULT_THEMES.light.colors.info,
      infoForeground: DEFAULT_THEMES.light.colors.infoForeground,
    };

    customTheme.fonts = {
      primary: preferences.primaryFont || DEFAULT_THEMES.light.fonts.primary,
      secondary: preferences.secondaryFont || DEFAULT_THEMES.light.fonts.secondary,
      mono: DEFAULT_THEMES.light.fonts.mono,
    };

    return customTheme;
  }

  async saveUserTheme(userId: string, themeData: any): Promise<void> {
    try {
      if (!this.tigerPalaceDB) {
        await this.initialize();
      }

      await this.tigerPalaceDB.updateUserTheme(userId, themeData);
    } catch (error) {
      console.error('Error saving user theme:', error);
      throw error;
    }
  }

  applyTheme(theme: ThemeConfig): void {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    
    // Apply color variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // Apply font variables
    Object.entries(theme.fonts).forEach(([key, value]) => {
      root.style.setProperty(`--font-${key}`, value);
    });

    // Apply spacing variables
    Object.entries(theme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key}`, value);
    });

    // Apply border radius variables
    Object.entries(theme.borderRadius).forEach(([key, value]) => {
      root.style.setProperty(`--radius-${key}`, value);
    });

    // Apply shadow variables
    Object.entries(theme.shadows).forEach(([key, value]) => {
      root.style.setProperty(`--shadow-${key}`, value);
    });

    // Apply animation variables
    Object.entries(theme.animations.duration).forEach(([key, value]) => {
      root.style.setProperty(`--duration-${key}`, value);
    });

    Object.entries(theme.animations.easing).forEach(([key, value]) => {
      root.style.setProperty(`--easing-${key}`, value);
    });

    // Apply theme mode class
    root.classList.remove('light', 'dark');
    if (theme.mode === 'dark' ||
        (theme.mode === 'system' && this.systemTheme === 'dark')) {
      root.classList.add('dark');
    } else {
      root.classList.add('light');
    }

    this.currentTheme = theme;
  }

  getCurrentTheme(): ThemeConfig {
    return this.currentTheme;
  }

  // Generate CSS custom properties for the theme
  generateCSSCustomProperties(theme: ThemeConfig): string {
    const properties: string[] = [];

    // Colors
    Object.entries(theme.colors).forEach(([key, value]) => {
      properties.push(`--color-${key}: ${value};`);
    });

    // Fonts
    Object.entries(theme.fonts).forEach(([key, value]) => {
      properties.push(`--font-${key}: ${value};`);
    });

    // Spacing
    Object.entries(theme.spacing).forEach(([key, value]) => {
      properties.push(`--spacing-${key}: ${value};`);
    });

    // Border radius
    Object.entries(theme.borderRadius).forEach(([key, value]) => {
      properties.push(`--radius-${key}: ${value};`);
    });

    // Shadows
    Object.entries(theme.shadows).forEach(([key, value]) => {
      properties.push(`--shadow-${key}: ${value};`);
    });

    // Animations
    Object.entries(theme.animations.duration).forEach(([key, value]) => {
      properties.push(`--duration-${key}: ${value};`);
    });

    Object.entries(theme.animations.easing).forEach(([key, value]) => {
      properties.push(`--easing-${key}: ${value};`);
    });

    return `:root {\n  ${properties.join('\n  ')}\n}`;
  }

  // Validate theme colors for accessibility
  validateThemeAccessibility(theme: ThemeConfig): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check contrast ratios (simplified validation)
    const textColor = theme.colors.text;
    const backgroundColor = theme.colors.background;

    // Add more sophisticated contrast checking here
    if (textColor === backgroundColor) {
      issues.push('Text and background colors are identical');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }
}

// Export singleton instance
export const themeManager = new ThemeManager();

// Helper functions
export const getThemeCSS = (theme: ThemeConfig): string => {
  return themeManager.generateCSSCustomProperties(theme);
};

export const validateTheme = (theme: ThemeConfig) => {
  return themeManager.validateThemeAccessibility(theme);
};
