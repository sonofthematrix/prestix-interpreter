'use client';

import { UnifiedProfileAvatar } from '@/components/common/UnifiedProfileAvatar';
import { HeaderLogo } from '@/components/brand-assets/logo';
import { getMainNavigation } from '@/config/app';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/utils/sidebar-store';
import { useSession } from 'next-auth/react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, Suspense, lazy } from 'react';
import { BreadcrumbNav } from './breadcrumb-nav';
// Theme toggle moved to user profile page
// import { ThemeToggle } from '@/components/theme/theme-toggle';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { Button } from '../ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLogout } from '@/hooks/useLogout';
import { Loader2, LogOut, Menu, Search, User, X, Wallet } from 'lucide-react';

import { TigerSpinner } from '@/components/common/TigerSpinner';
import { useAppKit, useAppKitAccount } from '@/config';
// import { TigerWalletButton } from './TigerWalletButton';
import { useAuthStore } from '@/stores/auth-store';

// Lazy load WalletInfo to prevent blocking the dropdown
const WalletInfo = lazy(() => import('./WalletInfo').then(module => ({ default: module.WalletInfo })));

// Wrapper component that only renders WalletInfo when dropdown is open
function LazyWalletInfo() {
    return (
        <Suspense
            fallback={
                <div className="flex flex-col items-center justify-center py-6 px-2 space-y-2">
                    <TigerSpinner size="sm" />
                    <span className="text-xs text-muted-foreground dark:text-gray-400">
                        Loading wallet...
                    </span>
                </div>
            }
        >
            <WalletInfo />
        </Suspense>
    );
}

interface AppHeaderProps {
    className?: string;
    onMenuToggle?: () => void;
    sidebarOpen?: boolean;
    sidebarCollapsed?: boolean;
}

// Helper function to generate user display name
function getUserDisplayName(user: any): string {
    // If user has a name, use it
    if (user.name) {
        return user.name.length > 20 ? `${user.name.substring(0, 18)}...` : user.name;
    }

    // Generate from email if available
    if (user.email) {
        const emailName = user.email.split('@')[0];
        const formatted = emailName.charAt(0).toUpperCase() + emailName.slice(1);
        return formatted.length > 20 ? `${formatted.substring(0, 18)}...` : formatted;
    }

    // Generate dynamic name from user ID
    if (user.id) {
        const hash = user.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const names = ['Tiger', 'Palace', 'Royal', 'Elite', 'Premium', 'Noble', 'Prime', 'Crown'];
        const adjectives = ['Gold', 'Silver', 'Diamond', 'Platinum', 'Ruby', 'Emerald'];
        const name = `${adjectives[hash % adjectives.length]} ${names[hash % names.length]} ${(hash % 999) + 1}`;
        return name;
    }

    return 'Guest User';
}


export function AppHeader({ className, onMenuToggle, sidebarOpen, sidebarCollapsed }: AppHeaderProps) {
    const { address, status } = useAppKitAccount();
    const pathname = usePathname();
    const [searchOpen, setSearchOpen] = useState(false);
    const { theme, resolvedTheme } = useTheme();

    // Use Zustand store for auth state instead of useEffect
    const { isLoading: authStoreLoading, isAuthenticated: authStoreAuthenticated } = useAuthStore();

    // Use the same mobile state as the app layout
    const { isMobile } = useSidebarStore();

    // Use comprehensive logout hook
    const { logout, isLoggingOut } = useLogout();

    // AppKit for wallet account modal
    const { open: openAppKit } = useAppKit();
    const { isConnected } = useAppKitAccount();

    // Handler to open AppKit account modal
    const handleOpenWalletDetails = () => {
        openAppKit({ view: 'Account' });
    };

    // Determine authentication state using Zustand store
    // Only show loading spinner when Zustand store is actively loading, not during NextAuth initial check
    // NextAuth's 'loading' status is true on initial page load, which causes unnecessary spinner
    const isSessionLoading = authStoreLoading; // Only use Zustand loading state
    const isAuthenticated = (status === 'connected' && !!address) || (authStoreAuthenticated);
    const mainNavItems = getMainNavigation();
    
    // Theme detection for dark mode
    const isDarkMode = resolvedTheme === 'dark' || theme === 'dark';

    const handleSignOut = async () => {
        await logout({
            redirectTo: '/',
            createAuditLog: true,
            showToast: true,
        });
    };

    return (
        <header
            className={cn(
                'sticky top-0 z-[70] w-full border-b border-border',
                className,
            )}
            style={{
                // Background image is optional - will fallback to solid color if image doesn't exist
                backgroundImage: `url('/images/backgrounds/bg-tokenizin-dark.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                opacity: 1,
            }}
        >
            {/* Frost effect overlay to create subtle, elegant background */}
            <div 
                className={cn(
                    "absolute inset-0 pointer-events-none transition-opacity duration-300 z-0",
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
                    className="absolute inset-0 pointer-events-none bg-gray-950/80 z-0"
                    style={{
                        mixBlendMode: 'multiply',
                    }}
                />
            )}
            {/* Additional subtle gradient overlay for depth */}
            <div 
                className={cn(
                    "absolute inset-0 pointer-events-none z-0",
                    isDarkMode 
                      ? "bg-gradient-to-br from-gray-950/40 via-gray-950/15 to-gray-950/25" 
                      : "bg-gradient-to-br from-background/30 via-transparent to-background/20"
                )}
            />
            {/* Content layer with relative positioning */}
            <div
                className={cn(
                    'relative z-10 flex h-16 items-center justify-between px-4',
                    // Mobile: no margin, Desktop: margin based on sidebar state
                    'md:ml-64 md:transition-all md:duration-300',
                    sidebarCollapsed && 'md:ml-16',
                )}
                style={{ pointerEvents: 'auto' }}
            >
                {/* Left Section - Logo, Menu Toggle, and Breadcrumbs */}
                <div className={cn(
                    "flex items-center min-w-0 flex-1 relative",
                    // Mobile: center content, Desktop: left align
                    isMobile ? "justify-center" : "space-x-4"
                )}>
                    {/* Mobile Menu Toggle - Absolutely positioned on mobile, relative on desktop */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            'z-[55]',
                            'hover:bg-orange-600/10 dark:hover:bg-orange-500/20',
                            'transition-colors',
                            // Mobile: absolute positioning to not affect flex layout
                            isMobile ? 'absolute left-4 top-1/2 transform -translate-y-1/2' : 'relative md:hidden',
                            // Desktop: hidden (sidebar toggle is in sidebar)
                            'md:hidden'
                        )}
                        onClick={onMenuToggle}
                        aria-label="Toggle menu"
                    >
                        {sidebarOpen ? (
                            <X className="h-5 w-5 text-foreground dark:text-gray-300 transition-colors hover:text-orange-700 dark:hover:text-orange-300" />
                        ) : (
                            <Menu className="h-5 w-5 text-foreground dark:text-gray-300 transition-colors hover:text-orange-700 dark:hover:text-orange-300" />
                        )}
                    </Button>

                    {/* Logo - Centered on mobile, left-aligned on desktop */}
                    <Link 
                        href="/" 
                        className={cn(
                            "flex items-center flex-shrink-0 z-[55]",
                            "hover:scale-105 transition-transform duration-300",
                            // Mobile: smaller logo, centered
                            isMobile ? "h-8" : "h-10",
                            // Desktop: normal size, first position
                            "md:h-12"
                        )}
                        aria-label="Tokenizin Home"
                    >
                        <HeaderLogo className={cn(
                            // Mobile: smaller size
                            isMobile ? "h-8 w-auto" : "h-10 w-auto",
                            // Desktop: normal size
                            "md:h-12 md:w-auto"
                        )} />
                    </Link>

                    {/* Breadcrumbs - Hidden on mobile, visible on desktop */}
                    <div className={cn('flex-1 min-w-0 hidden md:block md:ml-4')}>
                        <BreadcrumbNav />
                    </div>
                </div>

                {/* Center Section - Empty for now */}
                <div className="hidden md:flex items-center">{/* Navigation items moved to sidebar */}</div>

                {/* Right Section - Search, Notifications, User Menu */}
                <div className="flex items-center space-x-2">
                    {/* Search */}
                    {/* <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen(!searchOpen)}
            className="hidden sm:flex hover:bg-orange-600/10 dark:hover:bg-orange-500/20 transition-colors"
          >
            <Search className="h-4 w-4 text-foreground dark:text-gray-300 group-hover:text-orange-700 dark:group-hover:text-orange-300 transition-colors" />
          </Button> */}

                    {/* Theme Toggle moved to Profile Settings Page */}

                    {/* Test Case Status Widget */}
                    {/* {isAuthenticated && <TestCaseStatusWidget />} */}

                    {/* Tiger Wallet Button - Quick access to wallet when connected */}
                    {isAuthenticated && isConnected}

                    {/* Connect Wallet Button - Show when authenticated but wallet not connected */}
                    {isAuthenticated && !isConnected && (
                        <Button
                            variant="outline"
                            onClick={async () => {
                                try {
                                    console.log('🔘 [AppHeader] Opening AppKit connect modal...');
                                    await openAppKit({ view: 'Connect' });
                                    console.log('✅ [AppHeader] AppKit modal opened');
                                } catch (error) {
                                    console.error('❌ [AppHeader] Failed to open AppKit modal:', error);
                                }
                            }}
                            className="gap-2 border-[#F59E0B]/20 bg-[#0A3A2A]/50 text-[#F8F5F0] hover:bg-[#1C3A36] hover:text-[#F59E0B] transition-colors"
                        >
                            <Wallet className="h-4 w-4" />
                            <span className="hidden sm:inline">Connect Wallet</span>
                        </Button>
                    )}

                    {/* Login Button - Show when not authenticated, but hide if already on sign-in page */}
                    {!isAuthenticated && pathname !== '/auth/signin' && (
                        <Button
                            variant="outline"
                            className="gap-2 border-[#F59E0B]/20 bg-[#0A3A2A]/50 text-[#F8F5F0] hover:bg-[#1C3A36] hover:text-[#F59E0B] transition-colors"
                        >
                            <Link href="/auth/signin">
                                <User className="h-4 w-4" />
                                <span className="hidden sm:inline">Sign In</span>
                            </Link>
                        </Button>
                    )}

                    {/* Notifications */}
                    {isAuthenticated && <NotificationBell />}

                    {/* User Menu - Only show if Stack Auth user is authenticated */}
                    {/* Only show spinner when actually loading, not when unauthenticated */}
                    {isSessionLoading ? (
                        <div className="flex items-center space-x-2">
                            <TigerSpinner size="sm" />
                        </div>
                    ) : isAuthenticated ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger>
                                <Button
                                    variant="ghost"
                                    className="relative h-8 w-8 rounded-full hover:bg-orange-600/10 dark:hover:bg-orange-500/20 transition-colors p-0 overflow-hidden cursor-pointer z-[60]"
                                    aria-label="User menu"
                                    type="button"
                                    disabled={isSessionLoading}
                                >
                                    <UnifiedProfileAvatar size="sm" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-72 max-w-[calc(100vw-2rem)] sm:w-72 z-[100]" align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
                                <div className="flex items-center justify-start gap-2 p-2">
                                    <div className="flex flex-col space-y-1 leading-none">
                                        {address && (
                                            <p
                                                className="font-medium text-foreground truncate max-w-[180px]"
                                                title={getUserDisplayName(address)}
                                            >
                                                {getUserDisplayName(address)}
                                            </p>
                                        )}
                                        {address && (
                                            <p
                                                className="text-xs text-muted-foreground truncate max-w-[180px]"
                                                title={address}
                                            >
                                                {address}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Wallet Information - Lazy loaded only when dropdown is open */}
                                <DropdownMenuSeparator />
                                <div className="px-2 py-2 max-h-[60vh] overflow-y-auto">
                                    <LazyWalletInfo />
                                </div>
                                
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href="/profile" className="flex items-center">
                                        <User className="mr-2 h-4 w-4" />
                                        <span>Profile</span>
                                    </Link>
                                </DropdownMenuItem>
                                {isConnected && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            onClick={handleOpenWalletDetails}
                                            className="flex items-center"
                                        >
                                            <Wallet className="mr-2 h-4 w-4" />
                                            <span>AppKit Wallet Details</span>
                                        </DropdownMenuItem>
                                    </>
                                )}
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
                    ) : null}
                </div>

                {/* Mobile Search Bar */}
                {searchOpen && (
                    <div className="border-t border-border bg-background px-4 py-2 md:hidden">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
