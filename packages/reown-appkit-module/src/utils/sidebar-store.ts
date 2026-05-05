import { create } from 'zustand';
import { useEffect, startTransition } from 'react';

interface SidebarState {
  collapsed: boolean;
  toggled: boolean;
  isMobile: boolean;
  currentBreakpoint: 'mobile' | 'tablet' | 'desktop';
  showSocialIcons: boolean;
  hasEnoughSpace: boolean;
  isHovered: boolean;
  toggleCollapsed: () => void;
  toggleSidebar: () => void;
  closeOnMobile: () => void;
  setShowSocialIcons: (show: boolean) => void;
  setHasEnoughSpace: (hasSpace: boolean) => void;
  setHovered: (hovered: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  collapsed: false,
  toggled: false,
  isMobile: false,
  currentBreakpoint: 'desktop',
  showSocialIcons: true,
  hasEnoughSpace: true,
  isHovered: false,

  toggleCollapsed: () => set((state) => ({ collapsed: !state.collapsed })),
  toggleSidebar: () => set((state) => ({ toggled: !state.toggled })),
  closeOnMobile: () => set({ toggled: false }),
  setShowSocialIcons: (show) => set({ showSocialIcons: show }),
  setHasEnoughSpace: (hasSpace) => set({ hasEnoughSpace: hasSpace }),
  setHovered: (hovered) => set({ isHovered: hovered }),
}));

// Singleton to prevent multiple breakpoint checkers from running simultaneously
let breakpointCheckerInitialized = false;
let resizeHandler: (() => void) | null = null;

export function useBreakpointEffect() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // If breakpoint checker is already initialized, don't set up another one
    if (breakpointCheckerInitialized) return;

    // Simple breakpoint detection
    const checkBreakpoint = () => {
    const width = window.innerWidth;
    let breakpoint: 'mobile' | 'tablet' | 'desktop' = 'desktop';

    if (width < 768) {
      breakpoint = 'mobile';
    } else if (width < 1024) {
      breakpoint = 'tablet';
    } else {
      breakpoint = 'desktop';
    }

      const currentState = useSidebarStore.getState();
      const isMobile = breakpoint === 'mobile';
      
      // Only update if values actually changed to prevent unnecessary re-renders
      if (
        currentState.currentBreakpoint !== breakpoint ||
        currentState.isMobile !== isMobile
      ) {
    useSidebarStore.setState({
      currentBreakpoint: breakpoint,
          isMobile: isMobile,
        });
      }
    };

    // Mark as initialized
    breakpointCheckerInitialized = true;

    // Use queueMicrotask to defer execution until after the current execution context
    // This ensures we're outside React's render/passive effects phase
    queueMicrotask(() => {
      checkBreakpoint();
    });

    // Listen for resize events with debouncing
    let resizeTimeout: NodeJS.Timeout;
    resizeHandler = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
    checkBreakpoint();
      }, 100);
    };

    window.addEventListener('resize', resizeHandler);

    // Cleanup
    return () => {
      clearTimeout(resizeTimeout);
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
        resizeHandler = null;
      }
      breakpointCheckerInitialized = false;
    };
  }, []);
}
