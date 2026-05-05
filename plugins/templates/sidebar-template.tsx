// Auto-generated sidebar template based on current patterns
// Last synced: 2026-03-01T09:29:34.594Z
// This template can be used to generate/regenerate the sidebar component
//
// NOTE: Path aliases (@/) will resolve correctly when this template is used
// in the actual component location (src/components/navigation/)
// TypeScript errors here are expected and can be ignored - they won't affect
// the generated component.

// @ts-nocheck - Template file: imports resolve when used in component location

"use client";

import { NavigationIcon } from '@/components/brand-assets';
import { UnifiedProfileAvatar } from '@/components/common/UnifiedProfileAvatar';
import { SidebarErrorBoundary } from '@/components/error-boundary';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useNavigation } from '@/hooks/useNavigation';
import sidebarConfig from '@/config/sidebar-config.json';
import { LogoutMenuItem } from './LogoutMenuItem';
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
  LogIn,
  Pin,
  PinOff,
  Settings,
  Shield,
  SquareGanttChart,
  Twitter,
  User,
  UserCircle,
  X,
  Copy,
  LogOut,
  Sparkles
} from 'lucide-react';
import { useAppKitSession } from '@/lib/auth/appkit-session';
import { useAppKitAccount } from '@/lib/appkit';
import { isAdminWalletAddress } from '@/lib/admin-wallet-client';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTokenOwnership } from '@/hooks/useTokenOwnership';

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
    case "lifestyle":
      return <Sparkles className="h-5 w-5" />;
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
  if (path.startsWith('/lifestyle') || path.includes('entertainment') || path.includes('venue') || path.includes('rental')) return <Sparkles className="h-5 w-5" />;
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
  const router = useRouter();
  const closeOnMobile = useSidebarStore((state) => state.closeOnMobile);
  const hasChildren = item.children && item.children.length > 0;
  const isCollapsible = hasChildren && item.href === '#';

  // Menu expansion state is controlled by the shared sidebar store.
  const isOpen = openGroups.has(item.id);

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
  const handleToggle = () => {
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
    }
  };

  // --- Always provide every item and group with a working icon ---

  if (isCollapsible) {
    const triggerButton = (
      <Button
        variant="ghost"
        className={cn(
          "w-full h-auto p-2",
          !isEffectivelyExpanded ? "justify-center" : "justify-start",
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
        {isEffectivelyExpanded && (
          <>
            <div
              className={cn(
                "flex-1 overflow-hidden whitespace-nowrap transition-opacity duration-300",
                "opacity-100"
              )}
            >
              <span
                className="ml-2 text-left luxury-text"
                style={{ fontSize: 'var(--font-size-base, 16px)' }}
              >
                {item.title}
              </span>
            </div>
            {item.badge && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {typeof item.badge === 'object'
                  ? (item.badge.name || item.badge.title || item.badge.label || String(item.badge.id || ''))
                  : String(item.badge)}
              </Badge>
            )}
            {isOpen ? (
              <ChevronDown className="ml-2 h-4 w-4 transition-transform duration-200" />
            ) : (
              <ChevronRight className="ml-2 h-4 w-4 transition-transform duration-200" />
            )}
          </>
        )}
      </Button>
    );

    return (
      <Collapsible open={isOpen} onOpenChange={handleToggle}>
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
        <CollapsibleContent
          className="space-y-1"
          id={`navitem-${item.id}-content`}
          onClick={(e) => {
            // Prevent clicks on child links from bubbling up to Collapsible
            // Only stop propagation if clicking on a link, not on empty space
            if ((e.target as HTMLElement).closest('a')) {
              e.stopPropagation();
            }
          }}
        >
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

  const handleLinkClickWithDebug = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // CRITICAL: Stop event propagation so parent Collapsible does not toggle and
    // so the Link can handle navigation (client-side segment update only).
    e.stopPropagation();

    const href = item.href?.trim() || '';
    const isNavigable = href && href !== '#' && href.startsWith('/');

    // Let Next.js Link handle in-app navigation (no preventDefault / router.push).
    // This keeps only the page segment updating and avoids full remount/flicker.
    if (isNavigable) {
      handleLinkClick();
      return;
    }

    // Call callback for sidebar state management (e.g., closing mobile sidebar)
    handleLinkClick();
  };

  const linkElement = (
    <Link
      href={item.href}
      prefetch={true}
      scroll={true}
      shallow={false}
      onClick={handleLinkClickWithDebug}
      className={cn(
        "relative flex items-center h-12 transition-all duration-200",
        !isEffectivelyExpanded ? "justify-center" : "justify-start",
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
      <div className={cn(
        "flex items-center gap-3 transition-all duration-300",
        !isEffectivelyExpanded ? "justify-center w-full" : "mx-5 w-full"
      )}>
        {/* Always render an icon for every nav item */}
        <div className="flex shrink-0 items-center justify-center">
          {getNavItemIcon(item, parentCategory)}
        </div>
        {isEffectivelyExpanded && (
          <>
            <div
              className={cn(
                "flex-1 overflow-hidden whitespace-nowrap transition-opacity duration-300",
                "opacity-100"
              )}
            >
              <span
                className="text-sm uppercase luxury-text"
                style={{ fontSize: 'var(--font-size-base, 16px)' }}
              >
                {item.title}
              </span>
            </div>
            {item.badge && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {typeof item.badge === 'object'
                  ? (item.badge.name || item.badge.title || item.badge.label || String(item.badge.id || ''))
                  : String(item.badge)}
              </Badge>
            )}
          </>
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

// Token-to-NFT Conversion Menu Item Component
function TokenToNFTConversionMenuItem({
  isCollapsed,
  isEffectivelyExpanded,
  currentBreakpoint,
  pathname,
  onLinkClick,
}: {
  isCollapsed: boolean;
  isEffectivelyExpanded: boolean;
  currentBreakpoint: string;
  pathname: string;
  onLinkClick: () => void;
}) {
  const { session } = useAppKitSession();
  const { address, isConnected, status } = useAppKitAccount();
  const { hasFullOwnership, isLoading } = useTokenOwnership();

  const isAuthenticated = session?.isConnected && !!session?.user;
  const isWalletVerified = isConnected && status === 'connected' && !!address;

  // Only show if user is authenticated, wallet is verified, and owns 100% of tokens
  if (!isAuthenticated || !isWalletVerified || !hasFullOwnership || isLoading) {
    return null;
  }

  const isActive = pathname === '/convert-tokens-to-nft';

  const linkElement = (
    <Link
      href="/convert-tokens-to-nft"
      prefetch={true}
      scroll={true}
      shallow={false}
      onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
        e.stopPropagation();
        // ✅ DO NOT prevent default - let Next.js Link handle navigation
        onLinkClick();
      }}
      className={cn(
        "relative flex items-center h-12 transition-all duration-200",
        !isEffectivelyExpanded ? "justify-center" : "justify-start",
        "hover:bg-orange-600/10 dark:hover:bg-orange-500/20",
        "hover:text-orange-700 dark:hover:text-orange-300",
        "focus:outline-none focus:ring-2 focus:ring-orange-600 dark:focus:ring-orange-400 focus:ring-offset-2",
        isActive && "bg-orange-600/20 dark:bg-orange-500/30 text-orange-700 dark:hover:text-orange-300 font-semibold border-l-4 border-orange-600 dark:border-orange-400",
        !isActive && "text-foreground dark:text-gray-300"
      )}
      aria-current={isActive ? 'page' : undefined}
      data-nav-item-id="convert-tokens-to-nft"
      data-nav-item-active={isActive ? 'true' : 'false'}
    >
      <div className={cn(
        "flex items-center gap-3 transition-all duration-300",
        !isEffectivelyExpanded ? "justify-center w-full" : "mx-5 w-full"
      )}>
        <div className="flex shrink-0 items-center justify-center">
          <Sparkles className="h-5 w-5" />
        </div>
        {isEffectivelyExpanded && (
          <div
            className={cn(
              "flex-1 overflow-hidden whitespace-nowrap transition-opacity duration-300",
              "opacity-100"
            )}
          >
            <span
              className="text-sm uppercase luxury-text"
              style={{ fontSize: 'var(--font-size-base, 16px)' }}
            >
              Convert to NFT
            </span>
          </div>
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
          <p className="font-medium">Convert Tokens to NFT</p>
          <p className="text-xs opacity-80">Convert your 100% owned tokens to ERC-721 NFT</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : (
    linkElement
  );
}

export function AppSidebar({ className, isOpen = true, onClose }: AppSidebarProps) {
  const { session } = useAppKitSession();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();

  // Scroll position preservation ref
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);

  // Track user-initiated menu interactions (to distinguish from automatic pathname changes)
  const userClickedMenuRef = useRef<boolean>(false);

  // Ref for hover timeout to handle rapid mouse movements
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Ref for sidebar element to check mouse position
  const sidebarRef = useRef<HTMLDivElement | null>(null);

  // Logout functionality is handled by LogoutMenuItem component
  // which wraps useLogout in WagmiProviderGuard

  // Zustand store state
  const {
    collapsed,
    toggled,
    isMobile,
    currentBreakpoint,
    showSocialIcons,
    hasEnoughSpace,
    isHovered,
    openGroups,
    unifiedSearchTerm,
    isDropdownOpen,
    toggleCollapsed,
    toggleSidebar,
    closeOnMobile,
    setShowSocialIcons,
    setHasEnoughSpace,
    setHovered,
    setOpenGroups,
    toggleGroup,
    openGroup,
    setUnifiedSearchTerm,
    setCopySuccess
  } = useSidebarStore();

  // Calculate effective expanded state: expanded if not collapsed
  // No hover expansion - only manual toggle
  const isEffectivelyExpanded = useMemo(() => {
    return !collapsed;
  }, [collapsed]);

  // Handler to close sidebar on mobile when a navigation item is clicked
  const handleMobileNavClick = useCallback(() => {
    // Mark that user clicked a menu item
    userClickedMenuRef.current = true;

    if (currentBreakpoint === 'mobile') {
      closeOnMobile();
    }
  }, [currentBreakpoint, closeOnMobile]);

  // Handler to copy wallet address to clipboard
  const handleCopyAddress = useCallback(async () => {
    if (!session.user?.walletAddress) return;

    try {
      await navigator.clipboard.writeText(session.user.walletAddress);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy wallet address:', err);
    }
  }, [session.user?.walletAddress]);

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
    if (session.isConnected && session.user) {
      // Role is automatically synced through NextAuth session updates
      // This effect only runs when authentication status changes
    }
  }, [session.user?.role]);

  const isAuthenticated = session.isConnected;
  // Show Administration menu when session has ADMIN role, or when connected wallet is a known admin wallet
  // (covers reconnect / stale session / role not yet synced from wallet-verify).
  const connectedAddress = session.address ?? undefined;
  const isAdmin =
    session.user?.role === 'ADMIN' ||
    (!!connectedAddress && isAdminWalletAddress(connectedAddress));

  // Keep the Administration section visible on initial load for admin users.
  // Child groups remain collapsed until the user explicitly expands them.
  useEffect(() => {
    if (!isAdmin) return;
    openGroup('admin-group');
  }, [isAdmin, openGroup]);

  // Use database-driven navigation hook
  const {
    mainItems,
    docsItems,
    toolsItems,
    lifestyleItems,
    adminItems,
    authItems,
    allItems: allNavItems,
    isLoading: navigationLoading,
    error: navigationError
  } = useNavigation();

  const normalize = useCallback((value: string | undefined) => {
    return (value || '').toLowerCase().replace(/[\s/_-]+/g, '');
  }, []);

  const matchesSearch = useCallback((item: any, term: string) => {
    if (!term) return true;
    const entity = item.href ? item.href.toString().split('/').pop() : '';
    const haystack = [
      item.title,
      item.description,
      item.href,
      item.id,
      entity
    ].map(normalize).join(' ');
    return haystack.includes(term);
  }, [normalize]);

  const filterNavTree = useCallback((items: any[], term: string): any[] => {
    if (!term) return items;
    const filtered: any[] = [];
    for (const item of items) {
      if (item.children && item.children.length > 0) {
        const children = filterNavTree(item.children, term);
        if (children.length > 0 || matchesSearch(item, term)) {
          filtered.push({ ...item, children });
        }
      } else if (matchesSearch(item, term)) {
        filtered.push(item);
      }
    }
    return filtered;
  }, [matchesSearch]);

  // Unified filtering for both main and admin items
  const filteredMainItems = useMemo(() => {
    const term = normalize(unifiedSearchTerm);
    return filterNavTree(mainItems, term);
  }, [mainItems, unifiedSearchTerm, filterNavTree, normalize]);

  const filteredLifestyleItems = useMemo(() => {
    const term = normalize(unifiedSearchTerm);
    return filterNavTree(lifestyleItems, term);
  }, [lifestyleItems, unifiedSearchTerm, filterNavTree, normalize]);

  const filteredAdminItems = useMemo(() => {
    const term = normalize(unifiedSearchTerm);
    return filterNavTree(adminItems, term);
  }, [adminItems, unifiedSearchTerm, filterNavTree, normalize]);

  // Use a ref to maintain input focus during filtering
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Maintain focus when filtered items change
  useEffect(() => {
    if (searchInputRef.current && unifiedSearchTerm) {
      // Small delay to ensure DOM has updated
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [filteredMainItems, filteredAdminItems]); // Re-focus when any filter results change
  // Groups expand only when user clicks - no automatic expansion on route change.
  // All major grouping titles (Main, Tools, Administration, Account) are visible;
  // children are hidden until the user clicks to expand.

  // Find ancestor group IDs for an item in the nav tree so we can keep them open when opening a nested group
  const getAncestorIdsForItem = useCallback((items: any[], itemId: string, ancestors: string[] = []): string[] | null => {
    for (const item of items) {
      if (item.id === itemId) return ancestors;
      if (item.children?.length) {
        const found = getAncestorIdsForItem(item.children, itemId, [...ancestors, item.id]);
        if (found !== null) return found;
      }
    }
    return null;
  }, []);

  // Toggle group handler - collapse previous group when opening a new one
  // Preserve ancestor groups when opening a nested group (e.g. opening "Properties" keeps "Marketplace" open)
  const handleToggleGroup = useCallback((itemId: string) => {
    // Mark that user clicked a menu item
    userClickedMenuRef.current = true;
    const scrollViewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    const prevScrollTop = scrollViewport?.scrollTop ?? null;

    const next = new Set(openGroups);
    const wasOpen = next.has(itemId);

    // Define parent groups that should stay open
    const parentGroups = ['main-group', 'tools-group', 'admin-group', 'account-group'];

    if (wasOpen) {
      // Closing the group - don't scroll or refocus
      next.delete(itemId);
    } else {
      // Opening a new group: keep parent groups and ancestors of this group open so the tree stays visible
      const ancestorIds = getAncestorIdsForItem(adminItems, itemId) ?? [];
      const itemsToRemove: string[] = [];
      next.forEach(id => {
        if (!parentGroups.includes(id) && !ancestorIds.includes(id)) {
          itemsToRemove.push(id);
        }
      });
      itemsToRemove.forEach(id => next.delete(id));
      next.add(itemId);
      ancestorIds.forEach(id => next.add(id));
    }
    setOpenGroups(next);

    // Restore previous scroll position after layout settles to avoid repositioning
    if (prevScrollTop !== null) {
      setTimeout(() => {
        if (scrollViewport) {
          scrollViewport.scrollTop = prevScrollTop;
        }
      }, 0);
    }
  }, [openGroups, setOpenGroups, adminItems, getAncestorIdsForItem]);

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

  // handleSignOut is now handled by LogoutMenuItem component

  if (!isOpen) return null;

  // Get sidebar styling based on configuration
  // When hovered on desktop/tablet, use expanded width even if collapsed
  // Memoize to ensure reactive updates when isHovered changes
  const sidebarWidth = useMemo(() => {
    return isEffectivelyExpanded
      ? sidebarConfig.settings.desktop.expandedWidth
      : sidebarConfig.settings.desktop.collapsedWidth;
  }, [isEffectivelyExpanded]);

  // Proper theme detection using next-themes
  const isDarkMode = resolvedTheme === 'dark' || theme === 'dark';

  const sidebarColors = isDarkMode
    ? sidebarConfig.appearance.darkMode
    : sidebarConfig.appearance.colors;

  const SidebarContent = ({ deferNonCritical = false }: { deferNonCritical?: boolean }) => (
    <>
      {/* Mobile Close Button - Top Right (only on mobile) */}
      {currentBreakpoint === 'mobile' && (
        <div className="relative flex items-center justify-end p-2 border-b border-border dark:border-gray-700">
          {isEffectivelyExpanded && (
            <Input
              ref={searchInputRef}
              value={unifiedSearchTerm}
              onChange={(e) => {
                setUnifiedSearchTerm(e.target.value);
                // Force refocus to maintain focus during filtering
                if (searchInputRef.current) {
                  searchInputRef.current.focus();
                }
              }}
              placeholder={isAdmin ? "Search all pages..." : "Search pages..."}
              className="h-9"
              aria-label="Search pages"
            />
          )}
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
          !isEffectivelyExpanded ? "justify-center px-2 py-2" : "justify-between px-4 py-2"
        )}>
          {isEffectivelyExpanded && (
            <Input
              ref={searchInputRef}
              value={unifiedSearchTerm}
              onChange={(e) => {
                setUnifiedSearchTerm(e.target.value);
                // Force refocus to maintain focus during filtering
                if (searchInputRef.current) {
                  searchInputRef.current.focus();
                }
              }}
              placeholder={isAdmin ? "Search all pages..." : "Search pages..."}
              className="h-9"
              aria-label="Search pages"
            />
          )}
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
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronLeft className="h-4 w-4 text-muted-foreground" />
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
        <div className="px-0 pb-0 pt-0 space-y-6">
          {/* Navigation Loading/Error States */}
          {navigationLoading && (
            <div className="px-4 py-2 text-sm text-muted-foreground">
              Loading navigation...
            </div>
          )}
          {navigationError && (
            <div className="px-4 py-2 text-sm text-red-600 dark:text-red-400">
              Failed to load navigation
            </div>
          )}

          {/* Main Navigation - ALWAYS expanded, NO collapse (per user requirement) */}
          <div className="space-y-2">
            <div
              className={cn(
                "w-full flex items-center h-12 px-4 rounded-md",
                "text-sm font-semibold text-muted-foreground uppercase tracking-wider",
                !isEffectivelyExpanded && "justify-center px-2"
              )}
            >
              {isEffectivelyExpanded && (
                <span style={{ fontSize: 'calc(var(--font-size-base, 16px) * 1.125)' }}>
                  Main
                </span>
              )}
            </div>
            <div className="space-y-1">
              {/* Filter out game-related pages from navigation items */}
              {(unifiedSearchTerm ? filteredMainItems : (isEffectivelyExpanded ? filteredMainItems : mainItems))
                .filter((item) => {
                  const hiddenMainTitles = new Set(['properties', 'rwa tokens']);
                  const hiddenGameIds = new Set(['palace-lobby', 'games', 'games-demo', 'game-lobby']);
                  return !hiddenGameIds.has(item.id) && !hiddenMainTitles.has((item.title || '').toLowerCase());
                })
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

              {/* Conditional Token-to-NFT Conversion Menu Item */}
              <TokenToNFTConversionMenuItem
                isCollapsed={collapsed}
                isEffectivelyExpanded={isEffectivelyExpanded}
                currentBreakpoint={currentBreakpoint}
                pathname={pathname}
                onLinkClick={handleLinkClick}
              />
            </div>
          </div>


          {/* Tools */}
          {toolsItems.length > 0 && (
            <>
              <Separator />
              <Collapsible
                open={openGroups.has('tools-group')}
                onOpenChange={() => {
                  userClickedMenuRef.current = true;
                  toggleGroup('tools-group');
                }}
                className="space-y-2"
              >
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      "w-full flex items-center justify-between h-12 px-4 rounded-md",
                      "text-sm font-semibold text-muted-foreground uppercase tracking-wider",
                      "hover:bg-orange-600/10 dark:hover:bg-orange-500/20 transition-colors",
                      "focus:outline-none focus:ring-2 focus:ring-orange-600 dark:focus:ring-orange-400",
                      !isEffectivelyExpanded && "justify-center px-2"
                    )}
                  >
                    {!isEffectivelyExpanded ? (
                      // Collapsed sidebar: show only arrow icon
                      openGroups.has('tools-group') ? (
                        <ChevronUp className="h-4 w-4 transition-transform" />
                      ) : (
                        <ChevronDown className="h-4 w-4 transition-transform" />
                      )
                    ) : (
                      // Expanded sidebar: show text and arrow
                      <>
                        <span style={{ fontSize: 'calc(var(--font-size-base, 16px) * 1.125)' }}>
                          Tools
                        </span>
                        {openGroups.has('tools-group') ? (
                          <ChevronUp className="h-4 w-4 transition-transform" />
                        ) : (
                          <ChevronDown className="h-4 w-4 transition-transform" />
                        )}
                      </>
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1">
                  {toolsItems.map((item) => {
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
                </CollapsibleContent>
              </Collapsible>
            </>
          )}


          {/* Administration - Only visible to ADMIN role */}
          {isAdmin && adminItems.length > 0 && (
            <>
              <Separator />
              <Collapsible
                open={openGroups.has('admin-group')}
                onOpenChange={() => {
                  userClickedMenuRef.current = true;
                  toggleGroup('admin-group');
                }}
                className="space-y-2"
              >
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      "w-full flex items-center justify-between h-12 px-4 rounded-md",
                      "text-sm font-semibold text-muted-foreground uppercase tracking-wider",
                      "hover:bg-orange-600/10 dark:hover:bg-orange-500/20 transition-colors",
                      "focus:outline-none focus:ring-2 focus:ring-orange-600 dark:focus:ring-orange-400",
                      !isEffectivelyExpanded && "justify-center px-2"
                    )}
                  >
                    {!isEffectivelyExpanded ? (
                      // Collapsed sidebar: show only arrow icon
                      openGroups.has('admin-group') ? (
                        <ChevronUp className="h-4 w-4 transition-transform" />
                      ) : (
                        <ChevronDown className="h-4 w-4 transition-transform" />
                      )
                    ) : (
                      // Expanded sidebar: show text and arrow
                      <>
                        <span style={{ fontSize: 'calc(var(--font-size-base, 16px) * 1.125)' }}>
                          Administration
                        </span>
                        {openGroups.has('admin-group') ? (
                          <ChevronUp className="h-4 w-4 transition-transform" />
                        ) : (
                          <ChevronDown className="h-4 w-4 transition-transform" />
                        )}
                      </>
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1">
                  {(unifiedSearchTerm ? filteredAdminItems : (isEffectivelyExpanded ? filteredAdminItems : adminItems)).map((item) => {
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
                  {unifiedSearchTerm && filteredAdminItems.length === 0 && (
                    <div className="text-sm text-muted-foreground dark:text-gray-400 px-2 py-3">
                      No admin pages match your search.
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </>
          )}

          {/* Authentication */}
          {!isAuthenticated && authItems.length > 0 && (
            <>
              <Separator />
              <Collapsible
                open={openGroups.has('account-group')}
                onOpenChange={() => {
                  userClickedMenuRef.current = true;
                  toggleGroup('account-group');
                }}
                className="space-y-2"
              >
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      "w-full flex items-center justify-between h-12 px-4 rounded-md",
                      "text-sm font-semibold text-muted-foreground uppercase tracking-wider",
                      "hover:bg-orange-600/10 dark:hover:bg-orange-500/20 transition-colors",
                      "focus:outline-none focus:ring-2 focus:ring-orange-600 dark:focus:ring-orange-400",
                      !isEffectivelyExpanded && "justify-center px-2"
                    )}
                  >
                    {!isEffectivelyExpanded ? (
                      // Collapsed sidebar: show only arrow icon
                      openGroups.has('account-group') ? (
                        <ChevronUp className="h-4 w-4 transition-transform" />
                      ) : (
                        <ChevronDown className="h-4 w-4 transition-transform" />
                      )
                    ) : (
                      // Expanded sidebar: show text and arrow
                      <>
                        <span style={{ fontSize: 'calc(var(--font-size-base, 16px) * 1.125)' }}>
                          Account
                        </span>
                        {openGroups.has('account-group') ? (
                          <ChevronUp className="h-4 w-4 transition-transform" />
                        ) : (
                          <ChevronDown className="h-4 w-4 transition-transform" />
                        )}
                      </>
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1">
                  {authItems.map((item) => {
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
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Social Icons Footer - Defer until after initial render for better LCP */}
      {!deferNonCritical && sidebarConfig.navigation.social.length > 0 && (
        <div className="p-4 border-t border-border dark:border-gray-700">
          <div className={cn(
            "flex items-center justify-center transition-all duration-300",
            isEffectivelyExpanded ? "flex-row space-x-3" : "flex-col space-y-3"
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
                    <TooltipContent side={isEffectivelyExpanded ? "top" : "right"}>
                      {social.label}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </div>
      )}

      {/* Sidebar Footer - Profile Section - HIDDEN FOR NOW */}
      {/* {!deferNonCritical && isAuthenticated && (
        <div className="border-t border-border dark:border-gray-700">
          <Collapsible open={isProfileMenuOpen} onOpenChange={setIsProfileMenuOpen}>
            <div className="p-0">
              <div className={cn(
                "group w-full rounded-md hover:bg-orange-600/10 dark:hover:bg-orange-500/20 transition-colors",
                !isEffectivelyExpanded ? "flex justify-center p-2" : "p-3"
              )}>
                <div className={cn(
                  "flex items-center w-full",
                  !isEffectivelyExpanded ? "justify-center" : "space-x-3"
                )}>
                  <CollapsibleTrigger asChild>
                    <button
                      className="flex items-center shrink-0 focus:outline-none focus:ring-2 focus:ring-orange-600 dark:focus:ring-orange-400 rounded-full"
                      aria-label={isProfileMenuOpen ? 'Collapse profile menu' : 'Expand profile menu'}
                    >
                      <div key={`avatar-${session.user?.walletAddress}`}>
                        <UnifiedProfileAvatar size="sm" />
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  
                  {isEffectivelyExpanded && (
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <CollapsibleTrigger asChild>
                            <button className="text-sm font-medium text-foreground dark:text-white group-hover:text-orange-700 dark:group-hover:text-orange-300 truncate focus:outline-none focus:underline">
                              Wallet User
                            </button>
                          </CollapsibleTrigger>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={handleCopyAddress}
                                  className="text-muted-foreground hover:text-orange-600 dark:hover:text-orange-400 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-600 dark:focus:ring-orange-400 rounded"
                                  aria-label="Copy wallet address"
                                >
                                  {copySuccess ? (
                                    <span className="text-xs text-green-600 dark:text-green-400">✓</span>
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                {copySuccess ? 'Copied!' : 'Copy wallet address'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <p className="text-xs text-muted-foreground dark:text-gray-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 truncate">
                          {session.user?.role?.toUpperCase() || 'CUSTOMER'}
                        </p>
                      </div>
                      <CollapsibleTrigger asChild>
                        <button
                          className="shrink-0 focus:outline-none focus:ring-2 focus:ring-orange-600 dark:focus:ring-orange-400 rounded p-1"
                          aria-label={isProfileMenuOpen ? 'Collapse profile menu' : 'Expand profile menu'}
                        >
                          {isProfileMenuOpen ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground dark:text-gray-400 group-hover:text-orange-700 dark:group-hover:text-orange-300 transition-transform" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground dark:text-gray-400 group-hover:text-orange-700 dark:group-hover:text-orange-300 transition-transform" />
                          )}
                        </button>
                      </CollapsibleTrigger>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <CollapsibleContent className="0 pb-0 space-y-1">
              <Link
                href="/profile"
                onClick={handleMobileNavClick}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md",
                  "text-sm text-foreground dark:text-gray-300",
                  "hover:bg-orange-600/10 dark:hover:bg-orange-500/20",
                  "hover:text-orange-700 dark:hover:text-orange-300",
                  "transition-colors"
                )}
              >
                <User className="h-4 w-4" />
                <span>Profile</span>
              </Link>
              
              <LogoutMenuItem 
                asButton={true}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md w-full text-left",
                  "text-sm",
                  "hover:bg-red-600/10 dark:hover:bg-red-500/20",
                  "transition-colors"
                )}
              />
            </CollapsibleContent>
          </Collapsible>
        </div>
      )} */}
    </>
  );

  // ✅ IMPROVED: Hover handlers with debouncing to prevent flickering
  const handleMouseEnter = useCallback(() => {
    if (currentBreakpoint !== 'mobile' && collapsed) {
      // Clear any pending collapse timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }

      // Add small delay before expanding to prevent flickering on quick mouse movements
      if (!isHovered) {
        hoverTimeoutRef.current = setTimeout(() => {
          setHovered(true);
          hoverTimeoutRef.current = null;
        }, 100); // 100ms delay before expanding
      }
    }
  }, [currentBreakpoint, collapsed, isHovered, setHovered]);

  const handleMouseLeave = useCallback((e: React.MouseEvent) => {
    if (currentBreakpoint !== 'mobile') {
      // CRITICAL FIX: Don't collapse sidebar if dropdown menu is open
      // This prevents sidebar from collapsing when clicking on wallet/profile dropdown
      if (isDropdownOpen) {
        console.log('🔒 [AppSidebar] Dropdown is open, preventing sidebar collapse');
        return;
      }

      // Get the sidebar element and check if mouse is actually leaving it
      const sidebarElement = e.currentTarget as HTMLElement;
      const relatedTarget = e.relatedTarget;

      // CRITICAL FIX: Check if relatedTarget is actually a Node before using contains()
      // React's relatedTarget is typed as EventTarget | null, which may not be a Node
      // We need to verify it's an HTMLElement (which extends Node) before calling contains()
      if (relatedTarget && relatedTarget instanceof Node) {
        const relatedElement = relatedTarget as HTMLElement;

        // Check if the related target is still within the sidebar or its children
        if (sidebarElement.contains(relatedElement) || sidebarElement === relatedElement) {
          return; // Mouse is still within sidebar, don't collapse
        }

        // Check if mouse moved to a dropdown menu (which is rendered in a portal outside sidebar)
        // Dropdown menus have data-radix-popper-content-wrapper attribute
        let checkElement: HTMLElement | null = relatedElement;
        while (checkElement) {
          if (checkElement.hasAttribute('data-radix-popper-content-wrapper') ||
            checkElement.getAttribute('role') === 'menu' ||
            checkElement.classList.contains('dropdown-content')) {
            console.log('🔒 [AppSidebar] Mouse moved to dropdown menu, preventing collapse');
            return; // Mouse moved to dropdown, don't collapse
          }
          checkElement = checkElement.parentElement;
        }

        // Also check if relatedTarget is a child of sidebar by checking parent chain
        let parent = relatedElement.parentElement;
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

      // ✅ IMPROVED: Longer delay before collapsing to prevent flickering
      // This ensures the sidebar doesn't rapidly expand/collapse on quick mouse movements
      if (collapsed && isHovered) {
        hoverTimeoutRef.current = setTimeout(() => {
          setHovered(false);
          hoverTimeoutRef.current = null;
        }, 300); // Increased from 150ms to 300ms for smoother experience
      }
    }
  }, [currentBreakpoint, collapsed, isHovered, setHovered, isDropdownOpen]);

  // ✅ IMPROVED: Removed aggressive global mouse tracking that caused flickering
  // The onMouseEnter/onMouseLeave handlers on the sidebar element are sufficient
  // for detecting when mouse enters/exits the sidebar area

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // State to control deferred rendering for performance
  const [isMounted, setIsMounted] = useState(false);
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);

  // Defer non-critical rendering until after initial paint
  useEffect(() => {
    // Use requestIdleCallback if available, otherwise setTimeout
    let timeoutId: ReturnType<typeof setTimeout> | number;

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleCallbackId = (window as any).requestIdleCallback(
        () => setIsMounted(true),
        { timeout: 2000 }
      );
      timeoutId = idleCallbackId;

      return () => {
        if (typeof timeoutId === 'number' && 'cancelIdleCallback' in window) {
          (window as any).cancelIdleCallback(timeoutId);
        }
      };
    } else {
      timeoutId = setTimeout(() => setIsMounted(true), 100);
      return () => clearTimeout(timeoutId);
    }
  }, []);

  // Preload background image without blocking render
  useEffect(() => {
    const img = new Image();
    img.onload = () => setBackgroundLoaded(true);
    img.src = '/images/backgrounds/bg-tokenizin-dark.png';
  }, []);

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
          width: sidebarWidth,
          backgroundColor: sidebarColors.background,
          borderColor: sidebarColors.border,
          // Only apply background image after it's loaded to prevent LCP blocking
          backgroundImage: backgroundLoaded ? `url('/images/backgrounds/bg-tokenizin-dark.png')` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 1,
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-image 0.3s ease-in',
          // Optimize for rendering performance
          willChange: 'width',
          contain: 'layout style paint',
        }}
        role="navigation"
        aria-label={sidebarConfig.accessibility.ariaLabels.sidebar}
      >
        {/* Frost effect overlay - defer backdrop filter until after initial render for better LCP */}
        <div
          className={cn(
            "absolute inset-0 pointer-events-none transition-opacity duration-300",
            isDarkMode
              ? "bg-gray-950/97 dark:bg-gray-950/97"
              : "bg-background/90 dark:bg-gray-900/85"
          )}
          style={{
            // Defer expensive backdrop filters until after initial render
            backdropFilter: isMounted
              ? (isDarkMode
                ? 'blur(16px) saturate(120%)'
                : 'blur(8px) saturate(180%)')
              : 'none',
            WebkitBackdropFilter: isMounted
              ? (isDarkMode
                ? 'blur(16px) saturate(120%)'
                : 'blur(8px) saturate(180%)')
              : 'none',
            // Optimize rendering
            willChange: isMounted ? 'backdrop-filter' : 'auto',
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
          <SidebarContent deferNonCritical={!isMounted} />
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
