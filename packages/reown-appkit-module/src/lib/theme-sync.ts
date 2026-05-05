// Cross-domain theme synchronization for Tokenizin
// This ensures theme state is consistent across all project builds
import React from 'react';
export interface ThemeSyncState {
  mode: 'light' | 'dark' | 'system';
  primaryColor: string;
  fontSize: 'sm' | 'md' | 'lg';
  compactMode: boolean;
  sidebarCollapsed: boolean;
  timestamp: number;
}

export class ThemeSyncManager {
  private static instance: ThemeSyncManager;
  private listeners: Set<(state: ThemeSyncState) => void> = new Set();
  private currentState: ThemeSyncState | null = null;
  private syncKey = 'tokenizin-palace-theme-sync';
  private storageKey = 'tokenizin-palace-theme-state';
  private isInitialized = false;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): ThemeSyncManager {
    if (!ThemeSyncManager.instance) {
      ThemeSyncManager.instance = new ThemeSyncManager();
    }
    return ThemeSyncManager.instance;
  }

  private initialize() {
    if (this.isInitialized) return;
    
    // Load initial state from localStorage
    this.loadState();
    
    // Set up storage event listener for cross-tab synchronization
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageChange.bind(this));
      
      // Set up periodic sync check (reduced frequency to prevent flickering)
      // Only check every 5 seconds instead of 1 second to reduce conflicts
      setInterval(() => {
        this.checkForUpdates();
      }, 5000);
    }
    
    this.isInitialized = true;
  }

  private loadState(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as ThemeSyncState;
        // Check if state is recent (within 5 minutes)
        if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
          this.currentState = parsed;
          this.applyState(parsed);
        }
      }
    } catch (error) {
      console.warn('Failed to load theme state:', error);
    }
  }

  private saveState(state: ThemeSyncState): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stateWithTimestamp = {
        ...state,
        timestamp: Date.now()
      };
      
      localStorage.setItem(this.storageKey, JSON.stringify(stateWithTimestamp));
      localStorage.setItem(this.syncKey, Date.now().toString());
      
      this.currentState = stateWithTimestamp;
    } catch (error) {
      console.warn('Failed to save theme state:', error);
    }
  }

  private handleStorageChange(event: StorageEvent): void {
    if (event.key === this.syncKey && event.newValue) {
      // Another tab updated the theme, check for changes
      setTimeout(() => {
        this.checkForUpdates();
      }, 100);
    }
  }

  private checkForUpdates(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as ThemeSyncState;
        
        // Check if this is a newer state than what we have
        // Also check if the state actually changed to prevent unnecessary re-applications
        if (!this.currentState || parsed.timestamp > this.currentState.timestamp) {
          // Check if state actually changed (not just timestamp)
          const stateChanged = !this.currentState || 
            this.currentState.mode !== parsed.mode ||
            this.currentState.primaryColor !== parsed.primaryColor ||
            this.currentState.fontSize !== parsed.fontSize ||
            this.currentState.compactMode !== parsed.compactMode ||
            this.currentState.sidebarCollapsed !== parsed.sidebarCollapsed;
          
          if (stateChanged) {
          this.currentState = parsed;
          this.applyState(parsed);
          this.notifyListeners(parsed);
          } else {
            // Just update timestamp to prevent re-processing
            this.currentState = parsed;
          }
        }
      }
    } catch (error) {
      console.warn('Failed to check for theme updates:', error);
    }
  }

  private applyState(state: ThemeSyncState): void {
    if (typeof window === 'undefined') return;
    
    const root = document.documentElement;
    
    // Determine expected theme class
    let expectedThemeClass: 'dark' | 'light';
    if (state.mode === 'dark') {
      expectedThemeClass = 'dark';
    } else if (state.mode === 'light') {
      expectedThemeClass = 'light';
    } else {
      // System mode - check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      expectedThemeClass = prefersDark ? 'dark' : 'light';
    }
    
    // Only apply if theme class doesn't match expected state
    const hasDark = root.classList.contains('dark');
    const hasLight = root.classList.contains('light');
    
    if (expectedThemeClass === 'dark' && !hasDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else if (expectedThemeClass === 'light' && !hasLight) {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    // If already matches, skip to prevent unnecessary DOM manipulation
    
    // Apply custom primary color
    if (state.primaryColor && state.primaryColor !== '#3b82f6') {
      root.style.setProperty('--custom-primary', state.primaryColor);
      root.classList.add('custom-theme');
    } else {
      root.style.removeProperty('--custom-primary');
      root.classList.remove('custom-theme');
    }
    
    // Apply font size
    root.classList.remove('text-sm', 'text-base', 'text-lg');
    root.classList.add(`text-${state.fontSize}`);
    
    // Apply compact mode
    if (state.compactMode) {
      root.classList.add('compact-mode');
    } else {
      root.classList.remove('compact-mode');
    }
    
    // Apply sidebar state
    if (state.sidebarCollapsed) {
      root.classList.add('sidebar-collapsed');
    } else {
      root.classList.remove('sidebar-collapsed');
    }
  }

  private notifyListeners(state: ThemeSyncState): void {
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.warn('Theme listener error:', error);
      }
    });
  }

  // Public API
  public getCurrentState(): ThemeSyncState | null {
    return this.currentState;
  }

  public updateState(updates: Partial<ThemeSyncState>): void {
    const newState: ThemeSyncState = {
      mode: 'system',
      primaryColor: '#3b82f6',
      fontSize: 'md',
      compactMode: false,
      sidebarCollapsed: false,
      timestamp: Date.now(),
      ...this.currentState,
      ...updates
    };
    
    this.saveState(newState);
    this.applyState(newState);
    this.notifyListeners(newState);
  }

  public subscribe(listener: (state: ThemeSyncState) => void): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  public syncWithNextThemes(theme: string): void {
    let mode: 'light' | 'dark' | 'system' = 'system';
    
    if (theme === 'light') mode = 'light';
    else if (theme === 'dark') mode = 'dark';
    else mode = 'system';
    
    this.updateState({ mode });
  }

  public syncWithDocusaurus(): void {
    // Check if we're in a Docusaurus environment
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/blog')) {
      // Try to sync with Docusaurus theme
      const docusaurusTheme = document.documentElement.getAttribute('data-theme');
      if (docusaurusTheme) {
        this.syncWithNextThemes(docusaurusTheme);
      }
    }
  }
}

// Hook for React components
export function useThemeSync() {
  const [state, setState] = React.useState<ThemeSyncState | null>(null);
  const manager = ThemeSyncManager.getInstance();

  React.useEffect(() => {
    // Get initial state
    setState(manager.getCurrentState());
    
    // Subscribe to updates
    const unsubscribe = manager.subscribe((newState) => {
      setState(newState);
    });
    
    return unsubscribe;
  }, [manager]);

  const updateTheme = React.useCallback((updates: Partial<ThemeSyncState>) => {
    manager.updateState(updates);
  }, [manager]);

  const syncWithNextThemes = React.useCallback((theme: string) => {
    manager.syncWithNextThemes(theme);
  }, [manager]);

  return {
    themeState: state,
    updateTheme,
    syncWithNextThemes,
    manager
  };
}

// Initialize theme sync on module load
if (typeof window !== 'undefined') {
  const manager = ThemeSyncManager.getInstance();
  
  // Sync with Docusaurus if we're on a blog page
  if (window.location.pathname.startsWith('/blog')) {
    manager.syncWithDocusaurus();
  }
}

export default ThemeSyncManager;
