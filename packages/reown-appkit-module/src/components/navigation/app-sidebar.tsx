"use client";

import { NavigationIcon } from '@/components/brand-assets';
import { UnifiedProfileAvatar } from '@/components/common/UnifiedProfileAvatar';
import { SidebarErrorBoundary } from '@/components/error-boundary';
import { Badge } from '@/components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  getNavigationByAuth,
  getNavigationByCategory
} from '@/config/app';
import sidebarConfig from '@/config/sidebar-config.json';
import { useLogout } from '@/hooks/useLogout';
import { cn } from '@/lib/utils';
import { useBreakpointEffect, useSidebarStore } from '@/utils/sidebar-store';
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  FileText,
  Folder,
  Hammer,
  HelpCircle,
  Home,
  Instagram,
  KeyRound,
  Linkedin,
  Loader2,
  LogIn,
  LogOut,
  Settings,
  Shield,
  SquareGanttChart,
  Twitter,
  User,
  UserCircle,
  X
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
}

interface AppSidebarProps {
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItemProps {
  item: any;
  isActive: boolean;
  level?: number;
  parentCategory?: string;
  onUserClick?: () => void; // Callback to mark user-initiated navigation
  onLinkClick?: () => void; // Callback to handle link clicks (for collapsing sidebar)
}

// Extended NavItem to inject parentCategory (for fallback icon selection)
function NavItem({
  item,
  isActive,
  level = 0,
  isCollapsed = false,
  isEffectivelyExpanded = false,
  currentBreakpoint = 'desktop',
  pathname,
  parentCategory,
  openGroups = new Set<string>(),
  onToggleGroup,
  onUserClick,
  onLinkClick
}: NavItemProps & { 
  isCollapsed?: boolean;
  isEffectivelyExpanded?: boolean;
  currentBreakpoint?: 'mobile' | 'tablet' | 'desktop'; 
  pathname?: string;
  openGroups?: Set<string>;
  onToggleGroup?: (itemId: string) => void;
  onUserClick?: () => void;
  onLinkClick?: () => void;
}) {
  const closeOnMobile = useSidebarStore((state) => state.closeOnMobile);
  const hasChildren = item.children && item.children.length > 0;
  const isCollapsible = hasChildren && item.href === '#';
  
  // Use controlled open state if provided, otherwise fall back to local state
  const [localIsOpen, setLocalIsOpen] = useState(isActive || false);
  const isOpen = openGroups.has(item.id) || localIsOpen;

  // Check if any child is active
  const hasActiveChild = hasChildren && item.children.some((child: any) => pathname === child.href);

  // Handler to close sidebar on mobile when a link is clicked
  // Also collapses sidebar if it was expanded via hover
  const handleLinkClick = () => {
    // Mark that user clicked a menu item
    if (onUserClick) {
      onUserClick();
    }
    
    // Call parent's link click handler to collapse sidebar if needed
    if (onLinkClick) {
      onLinkClick();
    }
    
    if (currentBreakpoint === 'mobile') {
      closeOnMobile();
    }
  };

  // Handler for toggling collapsible groups
  // Accepts optional boolean parameter from Collapsible's onOpenChange
  const handleToggle = (newOpenState?: boolean) => {
    // Don't refocus if clicking on a group that's already open and contains the current page
    const isCurrentlyOpen = isOpen;
    const isCurrentPageInGroup = hasActiveChild;
    
    // If group is open and contains current page, just toggle without scrolling/refocusing
    if (isCurrentlyOpen && isCurrentPageInGroup && onToggleGroup) {
      // Mark user click but prevent refocus
      if (onUserClick) {
        onUserClick();
      }
      onToggleGroup(item.id);
      return;
    }
    
    // Mark that user clicked a menu item
    if (onUserClick) {
      onUserClick();
    }
    
    if (onToggleGroup) {
      onToggleGroup(item.id);
    } else {
      // Use the new state if provided, otherwise toggle
      setLocalIsOpen(newOpenState !== undefined ? newOpenState : !localIsOpen);
    }
  };

  // --- Always provide every item and group with a working icon ---

  if (isCollapsible) {
    const triggerButton = (
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start h-auto p-2",
          "hover:bg-orange-600/10 dark:hover:bg-orange-500/20",
          "hover:text-orange-700 dark:hover:text-orange-300",
          (isActive || hasActiveChild) && "bg-orange-600/20 dark:bg-orange-500/30 text-orange-700 dark:text-orange-300 font-semibold border-l-4 border-orange-600 dark:border-orange-400",
          !(isActive || hasActiveChild) && "text-foreground dark:text-gray-300",
          level > 0 && "ml-4"
        )}
        aria-expanded={isOpen}
        aria-controls={`navitem-${item.id}-content`}
      >
        {/* Always an icon, from item.icon or sensible fallback */}
        <div className="flex shrink-0 items-center justify-center">
          {getNavItemIcon(item, parentCategory)}
        </div>
        <div 
          className={cn(
            "flex-1 overflow-hidden whitespace-nowrap transition-opacity duration-300",
            isEffectivelyExpanded ? "opacity-100" : "opacity-0"
          )}
        >
          <span 
            className="ml-2 text-left luxury-text"
            style={{ fontSize: 'var(--font-size-base, 16px)' }}
          >
            {item.title}
          </span>
        </div>
        {item.badge && isEffectivelyExpanded && (
          <Badge variant="secondary" className="ml-2 text-xs">
            {item.badge}
          </Badge>
        )}
        {isEffectivelyExpanded && (
          isOpen ? (
            <ChevronDown className="ml-2 h-4 w-4 transition-transform duration-200" />
          ) : (
            <ChevronRight className="ml-2 h-4 w-4 transition-transform duration-200" />
          )
        )}
      </Button>
    );

    return (
      <Collapsible 
        open={isOpen} 
        onOpenChange={(open) => {
          // Only handle if state is actually changing
          if (open !== isOpen) {
            handleToggle();
          }
        }}
      >
        <CollapsibleTrigger asChild>
          {!isEffectivelyExpanded && currentBreakpoint !== 'mobile' ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  {triggerButton}
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="font-medium">{item.title}</p>
                  {item.description && (
                    <p className="text-xs opacity-80">{item.description}</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            triggerButton
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1" id={`navitem-${item.id}-content`}>
          {item.children.map((child: any) => {
            const childIsActive = pathname === child.href;
            return (
              <NavItem
                key={child.id}
                item={child}
                isActive={childIsActive}
                level={level + 1}
                isCollapsed={isCollapsed}
                isEffectivelyExpanded={isEffectivelyExpanded}
                currentBreakpoint={currentBreakpoint}
                pathname={pathname}
                parentCategory={parentCategory || item.title}
                openGroups={openGroups}
                onToggleGroup={onToggleGroup}
                onUserClick={onUserClick}
                onLinkClick={onLinkClick}
              />
            );
          })}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  const linkElement = (
    <Link
      href={item.href}
      onClick={handleLinkClick}
      className={cn(
        "relative flex items-center h-12 transition-all duration-200",
        "hover:bg-orange-600/10 dark:hover:bg-orange-500/20",
        "hover:text-orange-700 dark:hover:text-orange-300",
        "focus:outline-none focus:ring-2 focus:ring-orange-600 dark:focus:ring-orange-400 focus:ring-offset-2",
        isActive && "bg-orange-600/20 dark:bg-orange-500/30 text-orange-700 dark:text-orange-300 font-semibold border-l-4 border-orange-600 dark:border-orange-400",
        !isActive && "text-foreground dark:text-gray-300",
        level > 0 && "ml-4"
      )}
      aria-current={isActive ? 'page' : undefined}
      data-nav-item-id={item.id}
      data-nav-item-active={isActive ? 'true' : 'false'}
    >
      <div className="absolute inset-0 mx-5 flex items-center gap-3">
        {/* Always render an icon for every nav item */}
        <div className="flex shrink-0 items-center justify-center">
          {getNavItemIcon(item, parentCategory)}
        </div>
        <div 
          className={cn(
            "flex-1 overflow-hidden whitespace-nowrap transition-opacity duration-300",
            isEffectivelyExpanded ? "opacity-100" : "opacity-0"
          )}
        >
          <span 
            className="text-sm uppercase luxury-text"
            style={{ fontSize: 'var(--font-size-base, 16px)' }}
          >
            {item.title}
          </span>
        </div>
        {item.badge && isEffectivelyExpanded && (
          <Badge variant="secondary" className="ml-auto text-xs">
            {item.badge}
          </Badge>
        )}
      </div>
    </Link>
  );

  return !isEffectivelyExpanded && currentBreakpoint !== 'mobile' ? (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {linkElement}
        </TooltipTrigger>
        <TooltipContent side="right">
          <p className="font-medium">{item.title}</p>
          {item.description && (
            <p className="text-xs opacity-80">{item.description}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : (
    linkElement
  );
}

export function AppSidebar({ className, isOpen = true, onClose }: AppSidebarProps) {
  const { data: session, status, update: updateSession } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();

  // Scroll position preservation ref
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);
  
  // Track which navigation groups should be open
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  
  // Track user-initiated menu interactions (to distinguish from automatic pathname changes)
  const userClickedMenuRef = useRef<boolean>(false);
  
  // Ref for hover timeout to handle rapid mouse movements
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Ref for sidebar element to check mouse position
  const sidebarRef = useRef<HTMLDivElement | null>(null);

  // Use comprehensive logout hook
  const { logout, isLoggingOut } = useLogout();

  // Zustand store state
  const {
    collapsed,
    toggled,
    isMobile,
    currentBreakpoint,
    showSocialIcons,
    hasEnoughSpace,
    isHovered,
    toggleCollapsed,
    toggleSidebar,
    closeOnMobile,
    setShowSocialIcons,
    setHasEnoughSpace,
    setHovered
  } = useSidebarStore();

  // Calculate effective expanded state: expanded if not collapsed OR if hovered (desktop/tablet only)
  // Memoize to ensure reactive updates when isHovered changes
  const isEffectivelyExpanded = useMemo(() => {
    return !collapsed || (isHovered && currentBreakpoint !== 'mobile');
  }, [collapsed, isHovered, currentBreakpoint]);

  // Handler to close sidebar on mobile when a navigation item is clicked
  const handleMobileNavClick = useCallback(() => {
    // Mark that user clicked a menu item
    userClickedMenuRef.current = true;
    
    if (currentBreakpoint === 'mobile') {
      closeOnMobile();
    }
  }, [currentBreakpoint, closeOnMobile]);

  // Callback to mark user-initiated navigation clicks
  const handleUserClick = useCallback(() => {
    userClickedMenuRef.current = true;
  }, []);

  // Callback to handle link clicks - collapses sidebar if expanded via hover
  const handleLinkClick = useCallback(() => {
    // On desktop/tablet: if sidebar is expanded via hover, collapse it
    // This ensures sidebar collapses when navigating to a new page
    if (currentBreakpoint !== 'mobile' && collapsed && isHovered) {
      setHovered(false);
    }
  }, [currentBreakpoint, collapsed, isHovered, setHovered]);

  // Save scroll position continuously as user scrolls
  useEffect(() => {
    const scrollViewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    if (!scrollViewport) return;

    const handleScroll = () => {
      scrollPositionRef.current = scrollViewport.scrollTop;
    };

    scrollViewport.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      scrollViewport.removeEventListener('scroll', handleScroll);
    };
  }, []); // Only set up listener once

  // Restore scroll position ONLY when user clicks menu items (not on automatic pathname changes)
  useEffect(() => {
    // Only restore scroll if user explicitly clicked a menu item
    if (userClickedMenuRef.current && scrollPositionRef.current > 0) {
      const scrollViewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      if (scrollViewport) {
        // Use requestAnimationFrame to ensure DOM is ready
        const timeoutId = setTimeout(() => {
          scrollViewport.scrollTop = scrollPositionRef.current;
          // Reset flag after restoring scroll
          userClickedMenuRef.current = false;
        }, 0);
        
        return () => clearTimeout(timeoutId);
      }
    }
    // Reset flag if pathname changes without user interaction
    userClickedMenuRef.current = false;
  }, [pathname, collapsed]); // Only restore when these change

  // ⚠️ NO PERIODIC REFRESH: Session refresh only occurs on authentication state changes
  // Removed automatic refresh to prevent unwanted background activity
  // Role updates will be reflected when user performs actions that trigger session refresh
  useEffect(() => {
    // Session role is already available from useSession hook
    // No need to periodically refresh - role updates happen on auth state changes
    if (status === 'authenticated' && session?.user) {
      // Role is automatically synced through NextAuth session updates
      // This effect only runs when authentication status changes
    }
  }, [status, session?.user]);

  const isAuthenticated = !!session;
  const isAdmin = (session?.user as any)?.email === 'alex@tokenizin.com' || (session?.user as any)?.role === 'ADMIN';
  
  const adminItems = useMemo(() => 
    isAdmin ? getNavigationByCategory('admin').filter(item => !item.authRequired || isAuthenticated) : [],
    [isAdmin, isAuthenticated]
  );
  const authItems = useMemo(() => 
    getNavigationByCategory('auth').filter(item => !item.authRequired || isAuthenticated),
    [isAuthenticated]
  );

  // Helper function to recursively find all parent groups that contain the active pathname
  const findParentGroupsForPathname = useCallback((items: any[], targetPathname: string, parentIds: string[] = []): string[] => {
    const result: string[] = [];
    
    for (const item of items) {
      const currentPath = [...parentIds, item.id];
      
      // Check if this item matches the pathname
      if (item.href === targetPathname) {
        // Return all parent IDs (excluding the item itself)
        return parentIds;
      }
      
      // Check if any child matches
      if (item.children && item.children.length > 0) {
        const childMatches = findParentGroupsForPathname(item.children, targetPathname, currentPath);
        if (childMatches.length > 0) {
          // This group contains the active item, so it should be open
          result.push(item.id);
          result.push(...childMatches);
          return result;
        }
      }
    }
    
    return result;
  }, []);

  // ⚠️ NO AUTOMATIC EXPANSION OR SCROLLING
  // Only expand groups and scroll when user explicitly clicks on menu items
  // This prevents unwanted jumps and refreshes when pathname changes automatically
  // Groups will only expand when user clicks on collapsible menu nodes

  // Toggle group handler - collapse previous group when opening a new one
  // Only scroll to active item when user explicitly clicks AND it's not already visible
  const handleToggleGroup = useCallback((itemId: string) => {
    // Mark that user clicked a menu item
    userClickedMenuRef.current = true;
    
    setOpenGroups(prev => {
      const next = new Set(prev);
      const wasOpen = next.has(itemId);
      
      if (wasOpen) {
        // Closing the group - don't scroll or refocus
        next.delete(itemId);
      } else {
        // Opening a new group - collapse all other groups first
        next.clear();
        next.add(itemId);
        
        // Only scroll to active item if it's not already visible and user is navigating to a new page
        // Don't scroll if clicking on a group that contains the current page
        setTimeout(() => {
          const activeItem = document.querySelector('[data-nav-item-active="true"]') as HTMLElement;
          if (activeItem && scrollAreaRef.current) {
            const scrollViewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
            if (scrollViewport) {
              // Check if active item is already visible in viewport
              const itemRect = activeItem.getBoundingClientRect();
              const viewportRect = scrollViewport.getBoundingClientRect();
              const isVisible = (
                itemRect.top >= viewportRect.top &&
                itemRect.bottom <= viewportRect.bottom
              );
              
              // Only scroll if item is not visible AND user is navigating (not just toggling)
              if (!isVisible && userClickedMenuRef.current) {
                const scrollTop = scrollViewport.scrollTop;
                const itemOffsetTop = activeItem.offsetTop;
                const itemHeight = itemRect.height;
                const viewportHeight = viewportRect.height;
                
                // Center the item in the viewport
                const targetScrollTop = itemOffsetTop - (viewportHeight / 2) + (itemHeight / 2);
                
                scrollViewport.scrollTo({
                  top: Math.max(0, targetScrollTop),
                  behavior: 'smooth'
                });
              }
            }
          }
        }, 350); // Wait for expansion animation (300ms) + small buffer
      }
      return next;
    });
  }, []);

  // Responsive breakpoint effect
  useBreakpointEffect();

  // Theme detection is now handled by next-themes

  // Note: Route change handling moved to app-layout component to avoid multiple renders

  // Space detection for social icons
  useEffect(() => {
    const checkSpace = () => {
      const sidebarWidth = collapsed
        ? parseInt(sidebarConfig.settings.desktop.collapsedWidth)
        : parseInt(sidebarConfig.settings.desktop.expandedWidth);

      // Show social icons if we have enough horizontal space
      setHasEnoughSpace(sidebarWidth >= 200);
    };

    checkSpace();
    window.addEventListener('resize', checkSpace);
    return () => window.removeEventListener('resize', checkSpace);
  }, [collapsed, setHasEnoughSpace]);

  // Update social icons visibility
  useEffect(() => {
    if (currentBreakpoint === 'mobile') {
      setShowSocialIcons(false);
    } else if (currentBreakpoint === 'tablet') {
      setShowSocialIcons(hasEnoughSpace && sidebarConfig.settings.tablet.showTooltips);
    } else {
      setShowSocialIcons(hasEnoughSpace);
    }
  }, [currentBreakpoint, hasEnoughSpace, setShowSocialIcons]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      } else if (e.key === 'Escape' && isMobile && toggled) {
        closeOnMobile();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar, closeOnMobile, isMobile, toggled]);

  // Group navigation items by category, filtering by authentication and role
  // (Already memoized above, keeping this comment for clarity)
  
  const handleSignOut = useCallback(async () => {
    await logout({
      redirectTo: '/',
      createAuditLog: true,
      showToast: true,
    });
  }, [logout]);

  // Hover handlers for desktop/tablet expand
  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    if (currentBreakpoint !== 'mobile' && collapsed) {
      e.preventDefault();
      e.stopPropagation();
      // Clear any pending collapse timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      setHovered(true);
    }
  }, [currentBreakpoint, collapsed, setHovered]);

  const handleMouseLeave = useCallback((e: React.MouseEvent) => {
    if (currentBreakpoint !== 'mobile') {
      e.preventDefault();
      e.stopPropagation();
      // Get the sidebar element and check if mouse is actually leaving it
      const sidebarElement = e.currentTarget as HTMLElement;
      const relatedTarget = e.relatedTarget;
      
      // Check if mouse is moving to a child element (shouldn't collapse)
      // Use more robust checking: if relatedTarget exists and is within sidebar, don't collapse
      // Ensure relatedTarget is a Node before using contains()
      if (relatedTarget && relatedTarget instanceof Node) {
        // Check if the related target is still within the sidebar or its children
        if (sidebarElement.contains(relatedTarget) || sidebarElement === relatedTarget) {
          return; // Mouse is still within sidebar, don't collapse
        }
      }
      
      // Also check if relatedTarget is an HTMLElement and check parent chain
      if (relatedTarget && relatedTarget instanceof HTMLElement) {
        let parent = relatedTarget.parentElement;
        while (parent) {
          if (parent === sidebarElement) {
            return; // Mouse moved to a child element, don't collapse
          }
          parent = parent.parentElement;
        }
      }
      
      // Clear any existing timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      
      // Always collapse when mouse leaves the sidebar if it was expanded via hover
      // This ensures the sidebar returns to collapsed state when mouse is no longer hovering
      if (collapsed && isHovered) {
        hoverTimeoutRef.current = setTimeout(() => {
          setHovered(false);
          hoverTimeoutRef.current = null;
        }, 150); // Slightly longer delay to handle edge cases, but still responsive
      }
    }
  }, [currentBreakpoint, collapsed, isHovered, setHovered]);

  // Additional safety: Global mouse move listener to ensure sidebar collapses when mouse truly leaves
  useEffect(() => {
    if (currentBreakpoint === 'mobile' || !collapsed || !isHovered) {
      return; // Only active when sidebar is expanded via hover on desktop/tablet
    }

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!sidebarRef.current) return;

      const sidebarElement = sidebarRef.current;
      const rect = sidebarElement.getBoundingClientRect();
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      // Check if mouse is outside sidebar bounds
      const isOutside = (
        mouseX < rect.left ||
        mouseX > rect.right ||
        mouseY < rect.top ||
        mouseY > rect.bottom
      );

      if (isOutside) {
        // Clear any existing timeout
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }
        
        // Collapse sidebar
        hoverTimeoutRef.current = setTimeout(() => {
          setHovered(false);
          hoverTimeoutRef.current = null;
        }, 100);
      }
    };

    // Throttle mouse move events for performance
    let throttleTimeout: NodeJS.Timeout | null = null;
    const throttledHandler = (e: MouseEvent) => {
      if (throttleTimeout) return;
      throttleTimeout = setTimeout(() => {
        handleGlobalMouseMove(e);
        throttleTimeout = null;
      }, 50); // Check every 50ms
    };

    document.addEventListener('mousemove', throttledHandler);
    
    return () => {
      document.removeEventListener('mousemove', throttledHandler);
      if (throttleTimeout) {
        clearTimeout(throttleTimeout);
      }
    };
  }, [currentBreakpoint, collapsed, isHovered, setHovered]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
    };
  }, []);

  if (!isOpen) return null;

  // Get sidebar styling based on configuration
  // When hovered on desktop/tablet, use expanded width even if collapsed
  // Memoize to ensure reactive updates when isHovered changes

  // Proper theme detection using next-themes
  const isDarkMode = resolvedTheme === 'dark' || theme === 'dark';
  
  const sidebarColors = isDarkMode
    ? sidebarConfig.appearance.darkMode
    : sidebarConfig.appearance.colors;

  const SidebarContent = () => (
    <>
      {/* Mobile Close Button - Top Right (only on mobile) */}
      {currentBreakpoint === 'mobile' && (
        <div className="relative flex items-center justify-end p-2 border-b border-border dark:border-gray-700">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 hover:bg-destructive/10 dark:hover:bg-destructive/20"
            aria-label={sidebarConfig.accessibility.ariaLabels.closeButton}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Collapse/Expand Button - Top of sidebar (desktop/tablet) */}
      {currentBreakpoint !== 'mobile' && (
        <div className={cn(
          "flex items-center border-b border-border/50 dark:border-gray-700/50 transition-all duration-200",
          !isEffectivelyExpanded ? "justify-center px-2 py-2" : "justify-end px-4 py-2"
        )}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleCollapsed}
                  className={cn(
                    "h-7 transition-all duration-200 hover:bg-primary/10 dark:hover:bg-primary/20",
                    !isEffectivelyExpanded ? "w-7 px-0" : "px-3 gap-2"
                  )}
                  aria-label={collapsed ? sidebarConfig.accessibility.ariaLabels.expandButton : sidebarConfig.accessibility.ariaLabels.collapseButton}
                >
                  {collapsed ? (
                    <ChevronRight className="ml-2 h-3.5 w-3.5 transition-transform duration-200" />
                  ) : (
                    <>
                      <ChevronLeft className="h-3.5 w-3.5 transition-transform duration-200" />
                      <span className="text-xs font-medium"></span>
                    </>
                  )}
                  <span className="sr-only">
                    {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="text-xs font-medium">
                  {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                </p>
                <p className="text-xs opacity-70">Keyboard: Ctrl+B</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Navigation Content */}
      <ScrollArea ref={scrollAreaRef} className="flex-1">
        <div className="px-4 pb-4 pt-0 space-y-6">
          {/* Main Navigation */}
          <div className="space-y-2">
            <h3 className={cn(
              "text-sm font-semibold text-muted-foreground uppercase tracking-wider transition-opacity flex items-center gap-2",
              !isEffectivelyExpanded && "opacity-0"
            )}>
              {/* Always show icon for group/category heading in collapsed (and expanded) sidebar */}
              {getMenuGroupIcon('Main')}
              <span 
                className={cn(
                  "transition-opacity duration-300",
                  isEffectivelyExpanded ? "opacity-100" : "opacity-0"
                )}
                style={{ fontSize: 'calc(var(--font-size-base, 16px) * 1.125)' }}
              >
                Main
              </span>
            </h3>
            <div className="space-y-1">
              {/* Filter out Palace Lobby from navigation items */}
              {getNavigationByCategory('main')
                .filter((item) => item.id !== 'palace-lobby')
                .map((item) => {
                const isActive = pathname === item.href ||
                  (item.children && item.children.some((child: any) => pathname === child.href));
                return (
                  <NavItem
                    key={item.id}
                    item={item}
                    isActive={isActive}
                    isCollapsed={collapsed}
                    isEffectivelyExpanded={isEffectivelyExpanded}
                    currentBreakpoint={currentBreakpoint}
                    pathname={pathname}
                    parentCategory="Main"
                    openGroups={openGroups}
                    onToggleGroup={handleToggleGroup}
                    onUserClick={handleUserClick}
                    onLinkClick={handleLinkClick}
                  />
                );
              })}
            </div>
          </div>

          {/* Documentation */}
          {getNavigationByCategory('docs').length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className={cn(
                  "text-sm font-semibold text-muted-foreground uppercase tracking-wider transition-opacity flex items-center gap-2",
                  !isEffectivelyExpanded && "opacity-0"
                )}>
                  {getMenuGroupIcon('Documentation')}
                  <span 
                    className={cn(
                      "transition-opacity duration-300",
                      isEffectivelyExpanded ? "opacity-100" : "opacity-0"
                    )}
                    style={{ fontSize: 'calc(var(--font-size-base, 16px) * 1.125)' }}
                  >
                    Documentation
                  </span>
                </h3>
                <div className="space-y-1">
                  {getNavigationByCategory('docs').map((item) => {
                    const isActive = pathname === item.href ||
                      (item.children && item.children.some((child: any) => pathname === child.href));
                    return (
                      <NavItem
                        key={item.id}
                        item={item}
                        isActive={isActive}
                        isCollapsed={collapsed}
                        isEffectivelyExpanded={isEffectivelyExpanded}
                        currentBreakpoint={currentBreakpoint}
                        pathname={pathname}
                        parentCategory="Documentation"
                        openGroups={openGroups}
                        onToggleGroup={handleToggleGroup}
                        onUserClick={handleUserClick}
                        onLinkClick={handleLinkClick}
                      />
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Tools */}
          {getNavigationByCategory('tools').length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className={cn(
                  "text-sm font-semibold text-muted-foreground uppercase tracking-wider transition-opacity flex items-center gap-2",
                  !isEffectivelyExpanded && "opacity-0"
                )}>
                  {getMenuGroupIcon('Tools')}
                  <span 
                    className={cn(
                      "transition-opacity duration-300",
                      isEffectivelyExpanded ? "opacity-100" : "opacity-0"
                    )}
                    style={{ fontSize: 'calc(var(--font-size-base, 16px) * 1.125)' }}
                  >
                    Tools
                  </span>
                </h3>
                <div className="space-y-1">
                  {getNavigationByCategory('tools').map((item) => {
                    const isActive = pathname === item.href ||
                      (item.children && item.children.some((child: any) => pathname === child.href));
                    return (
                      <NavItem
                        key={item.id}
                        item={item}
                        isActive={isActive}
                        isCollapsed={collapsed}
                        isEffectivelyExpanded={isEffectivelyExpanded}
                        currentBreakpoint={currentBreakpoint}
                        pathname={pathname}
                        parentCategory="Tools"
                        openGroups={openGroups}
                        onToggleGroup={handleToggleGroup}
                        onUserClick={handleUserClick}
                        onLinkClick={handleLinkClick}
                      />
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Administration - Only visible to ADMIN role */}
          {isAdmin && getNavigationByCategory('admin').length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className={cn(
                  "text-sm font-semibold text-muted-foreground uppercase tracking-wider transition-opacity flex items-center gap-2",
                  !isEffectivelyExpanded && "opacity-0"
                )}>
                  {getMenuGroupIcon('Administration')}
                  <span 
                    className={cn(
                      "transition-opacity duration-300",
                      isEffectivelyExpanded ? "opacity-100" : "opacity-0"
                    )}
                    style={{ fontSize: 'calc(var(--font-size-base, 16px) * 1.125)' }}
                  >
                    Administration
                  </span>
                </h3>
                <div className="space-y-1">
                  {getNavigationByCategory('admin').map((item) => {
                    const isActive = pathname === item.href ||
                      (item.children && item.children.some((child: any) => pathname === child.href));
                    return (
                      <NavItem
                        key={item.id}
                        item={item}
                        isActive={isActive}
                        isCollapsed={collapsed}
                        isEffectivelyExpanded={isEffectivelyExpanded}
                        currentBreakpoint={currentBreakpoint}
                        pathname={pathname}
                        parentCategory="Administration"
                        openGroups={openGroups}
                        onToggleGroup={handleToggleGroup}
                        onUserClick={handleUserClick}
                        onLinkClick={handleLinkClick}
                      />
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Authentication */}
          {!isAuthenticated && getNavigationByCategory('auth').length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className={cn(
                  "text-sm font-semibold text-muted-foreground uppercase tracking-wider transition-opacity flex items-center gap-2",
                  !isEffectivelyExpanded && "opacity-0"
                )}>
                  {getMenuGroupIcon('Account')}
                  <span 
                    className={cn(
                      "transition-opacity duration-300",
                      isEffectivelyExpanded ? "opacity-100" : "opacity-0"
                    )}
                    style={{ fontSize: 'calc(var(--font-size-base, 16px) * 1.125)' }}
                  >
                    Account
                  </span>
                </h3>
                <div className="space-y-1">
                  {getNavigationByCategory('auth').map((item) => {
                    const isActive = pathname === item.href ||
                      (item.children && item.children.some((child: any) => pathname === child.href));
                    return (
                      <NavItem
                        key={item.id}
                        item={item}
                        isActive={isActive}
                        isCollapsed={collapsed}
                        isEffectivelyExpanded={isEffectivelyExpanded}
                        currentBreakpoint={currentBreakpoint}
                        pathname={pathname}
                        parentCategory="Account"
                        openGroups={openGroups}
                        onToggleGroup={handleToggleGroup}
                        onUserClick={handleUserClick}
                        onLinkClick={handleLinkClick}
                      />
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Social Icons Footer */}
      {showSocialIcons && sidebarConfig.navigation.social.length > 0 && (
        <div className="p-4 border-t border-border dark:border-gray-700">
          <div className={cn(
            "flex items-center justify-center space-x-3 transition-opacity duration-300",
            !isEffectivelyExpanded && "opacity-0"
          )}>
            {sidebarConfig.navigation.social.map((social) => {
              const IconComponent = getSocialIcon(social.icon);
              return (
                <TooltipProvider key={social.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-orange-600/10 dark:hover:bg-orange-500/20 transition-colors"
                        style={{
                          color: social.color,
                        }}
                        onClick={() => window.open(social.href, '_blank')}
                        aria-label={`Visit ${social.label}`}
                      >
                        <IconComponent className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {social.label}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </div>
      )}

      {/* Sidebar Footer - Profile Section */}
      {isAuthenticated && (
        <div className="p-4 border-t border-border dark:border-gray-700">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className={cn(
                  "group w-full h-auto p-3 hover:bg-orange-600/10 dark:hover:bg-orange-500/20 transition-colors",
                  !isEffectivelyExpanded ? "justify-center" : "justify-start"
                )}
              >
                <div className={cn(
                  "flex items-center w-full",
                  !isEffectivelyExpanded ? "justify-center" : "space-x-3"
                )}>
                  <UnifiedProfileAvatar size="sm" />
                  {isEffectivelyExpanded && (
                    <>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium text-foreground dark:text-white group-hover:text-orange-700 dark:group-hover:text-orange-300 truncate">
                          {session.user?.name || session.user?.email?.split('@')[0] || 'User'}
                        </p>
                        <p className="text-xs text-muted-foreground dark:text-gray-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 truncate">
                          {(session?.user as any)?.role?.toUpperCase() || 'CUSTOMER'}
                        </p>
                      </div>
                      <ChevronUp className="h-4 w-4 text-muted-foreground dark:text-gray-400 group-hover:text-orange-700 dark:group-hover:text-orange-300" />
                    </>
                  )}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 z-[70]" align="start" side="top" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium text-foreground dark:text-white">
                    {session.user?.name || session.user?.email?.split('@')[0] || 'User'}
                  </p>
                  {session.user?.email && (
                    <p className="text-xs text-muted-foreground dark:text-gray-400">
                      {session.user.email}
                    </p>
                  )}
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" onClick={handleMobileNavClick} className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleSignOut} 
                disabled={isLoggingOut}
                className="text-red-600"
              >
                {isLoggingOut ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="mr-2 h-4 w-4" />
                )}
                <span>{isLoggingOut ? 'Signing out...' : 'Sign out'}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </>
  );

  return (
    <SidebarErrorBoundary>
      <div
        ref={sidebarRef}
        className={cn(
          "flex h-full flex-col border-r transition-all duration-300 relative",
          `bg-[${sidebarColors.background}]`,
          `border-[${sidebarColors.border}]`,
          // Only enable hover expansion on desktop/tablet
          currentBreakpoint !== 'mobile' && "group",
          className
        )}
        style={{
          width: currentBreakpoint === 'mobile' 
            ? sidebarConfig.settings.desktop.expandedWidth 
            : (collapsed && !isHovered 
                ? sidebarConfig.settings.desktop.collapsedWidth 
                : sidebarConfig.settings.desktop.expandedWidth),
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        role="navigation"
        aria-label={sidebarConfig.accessibility.ariaLabels.sidebar}
      >
        {/* Frost effect overlay to create subtle, elegant background */}
        <div 
          className={cn(
            "absolute inset-0 pointer-events-none transition-opacity duration-300",
            isDarkMode 
              ? "bg-gray-950/97 dark:bg-gray-950/97" 
              : "bg-background/90 dark:bg-gray-900/85"
          )}
          style={{
            backdropFilter: isDarkMode 
              ? 'blur(16px) saturate(120%)' 
              : 'blur(8px) saturate(180%)',
            WebkitBackdropFilter: isDarkMode 
              ? 'blur(16px) saturate(120%)' 
              : 'blur(8px) saturate(180%)',
          }}
        />
        {/* Additional dark overlay for dark mode - ensures only 5% pattern visibility */}
        {isDarkMode && (
          <div 
            className="absolute inset-0 pointer-events-none bg-gray-950/80"
            style={{
              mixBlendMode: 'multiply',
            }}
          />
        )}
        {/* Additional subtle gradient overlay for depth */}
        <div 
          className={cn(
            "absolute inset-0 pointer-events-none",
            isDarkMode 
              ? "bg-gradient-to-br from-gray-950/40 via-gray-950/15 to-gray-950/25" 
              : "bg-gradient-to-br from-background/30 via-transparent to-background/20"
          )}
        />
        {/* Content layer with relative positioning */}
        <div className="relative z-10 flex h-full flex-col">
          <SidebarContent />
        </div>
      </div>
    </SidebarErrorBoundary>
  );

  // Helper function for social icons
  function getSocialIcon(iconName: string) {
    switch (iconName) {
      case 'twitter': return Twitter;
      case 'instagram': return Instagram;
      case 'linkedin': return Linkedin;
      default: return Twitter;
    }
  }

}
