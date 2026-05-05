// Auto-generated AppHeader template based on current patterns
// Last synced: 2026-03-01T09:29:34.596Z
// This template can be used to generate/regenerate the main app header component.
//
// NOTE: Header logo uses PrestixLogo (PRESTIX.VIP wordmark: PRESTIX. white, .VIP red).
// Do NOT use HeaderLogo/image logo here - use PrestixLogo for brand consistency.
// Path aliases (@/) resolve when used in src/components/navigation/

// @ts-nocheck - Template file: imports resolve when used in component location

'use client';

import { PrestixLogo } from '@/components/brand-assets/PrestixLogo';
import { getMainNavigation } from '@/config/app';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/utils/sidebar-store';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import Image from 'next/image';
import { Info } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState, Suspense, lazy, useRef, useEffect } from 'react';
import { BreadcrumbNav } from './breadcrumb-nav';
// Theme toggle moved to user profile page
// import { ThemeToggle } from '@/components/theme/theme-toggle';
import { UnifiedProfileAvatar } from '@/components/common/UnifiedProfileAvatar';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useLogout } from '@/hooks/useLogout';
import { Menu, Search, User, X, Wallet, BookOpen, Globe, ExternalLink, Copy, Check, Network, LogOut, Loader2, Pencil, Mail, KeyRound, ChevronDown } from 'lucide-react';
import { TigerSpinner } from '@/components/common/TigerSpinner';
import { useAppKit, useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react';
import { ReceiveFundsButton, NetworkSwitcherButton } from './HeaderWagmiDependent';
import { TokenizinWalletButton } from './TokenizinWalletButton';
import { useAuthStore } from '@/stores/auth-store';
import { useWagmiProviderReady } from '@/context/WagmiProviderReadyContext';
import { useAppKitSession } from '@/lib/auth/appkit-session';
import { useTokenizinWalletData } from '@/hooks/wallet/useTokenizinWalletData';
import { useTokenizinWalletStore } from '@/lib/store/tokenizinWalletStore';
import { useWalletUIStore } from '@/lib/store/walletUIStore';
import { TrendingUp, DollarSign, Send, ArrowLeftRight, ArrowDown, History, ShoppingCart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ProfileImage } from '@/components/profile/profile-image';
import { useSession } from '@/lib/auth/appkit-session';
import { useToast } from '@/hooks/use-toast';
import { WagmiProviderGuard } from '@/components/blockchain/WagmiProviderGuard';
import { detectAccountType } from '../../../packages/reown-appkit-module/src/components/TokenizinRWAWallet/utils/smartAccount';
// Removed WuiNetworkImage import - replaced with standard icon

// Lazy load WalletInfo and UserProfile to prevent blocking the dropdown
const WalletInfo = lazy(() => import('./WalletInfo').then(module => ({ default: module.WalletInfo })) as Promise<{ default: React.ComponentType<any> }>);
const UserProfile = lazy(() => import('./UserProfile').then(module => ({ default: module.UserProfile })) as Promise<{ default: React.ComponentType<{ onBack: () => void; isEditMode?: boolean; onCancelEdit?: () => void }> }>);

// Wallet and Network Icons Component - Shows wallet link, profile, receive funds, and current network
function WalletHeaderIcons({
    onProfileClick,
    onWalletClick,
    currentView,
    isSheetOpen
}: {
    onProfileClick?: () => void;
    onWalletClick?: () => void;
    currentView?: 'wallet' | 'profile';
    isSheetOpen?: boolean;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { chainId } = useAppKitNetwork();
    const { open } = useAppKit();
    const { networks } = require('../../../packages/reown-appkit-module/src/config');

    // Get current network
    const currentNetwork = networks?.find((network: any) => network.id === chainId) || networks?.[0];

    // Determine network icon based on chainId
    // chainId 1 = Ethereum Mainnet, chainId 11155111 = Sepolia Testnet
    const networkIconSrc = chainId === 1
        ? '/images/icons/eth-main.png'
        : '/images/icons/eth-test.png';
    const networkName = currentNetwork?.name || (chainId === 1 ? 'Ethereum' : 'Sepolia');

    // Determine if wallet view is active
    // Active when: sheet is open and currentView is 'wallet', OR sheet is closed and we're on /wallet route
    const isWalletViewActive = isSheetOpen
        ? currentView === 'wallet'
        : pathname?.startsWith('/wallet');

    // Determine if profile view is active
    // Active when: sheet is open and currentView is 'profile'
    const isProfileViewActive = isSheetOpen && currentView === 'profile';

    const handleWalletClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onWalletClick) {
            onWalletClick();
        } else {
            // Fallback: navigate to wallet page if callback not provided
            router.push('/wallet');
        }
    };

    const handleNetworkClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            // Open AppKit Networks view to allow network switching
            open({ view: 'Networks' });
            console.log('✅ [WalletHeaderIcons] AppKit Networks view opened');
        } catch (error) {
            console.error('❌ [WalletHeaderIcons] Failed to open AppKit Networks view:', error);
        }
    };

    const handleProfileClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (onProfileClick) {
            onProfileClick();
        }
    };

    return (
        <div className="flex items-center gap-2">
            {/* Wallet Icon - Link to wallet page */}
            <Button
                variant="ghost"
                size="icon"
                className={cn(
                    "h-6 w-6 rounded-sm transition-all",
                    isWalletViewActive
                        ? "bg-prestix-gold/10 text-prestix-gold opacity-100 border border-prestix-gold/30"
                        : "opacity-70 hover:opacity-100 hover:bg-prestix-gold/10"
                )}
                onClick={handleWalletClick}
                aria-label={isWalletViewActive ? "Wallet view active" : "Open wallet page"}
                title={isWalletViewActive ? "Wallet view active - Click to refresh" : "Open wallet page"}
            >
                <Wallet className="h-4 w-4" />
            </Button>

            {/* Profile Icon - Opens profile view */}
            <Button
                variant="ghost"
                size="icon"
                className={cn(
                    "h-6 w-6 rounded-sm transition-all",
                    isProfileViewActive
                        ? "bg-prestix-gold/10 text-prestix-gold opacity-100 border border-prestix-gold/30"
                        : "opacity-70 hover:opacity-100 hover:bg-prestix-gold/10"
                )}
                onClick={handleProfileClick}
                aria-label={isProfileViewActive ? "Profile view active" : "View profile"}
                title={isProfileViewActive ? "Profile view active - Click to refresh" : "View profile"}
            >
                <User className="h-4 w-4" />
            </Button>

            {/* Receive Funds Button - Opens AppKit Account view with QR code */}
            <WagmiProviderGuard fallback={null}>
                <ReceiveFundsButton />
            </WagmiProviderGuard>

            {/* Network Icon - Clickable to open AppKit Networks dialog */}
            <WagmiProviderGuard fallback={null}>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-sm opacity-70 hover:opacity-100 transition-opacity p-0"
                    onClick={handleNetworkClick}
                    aria-label={`Current network: ${networkName} - Click to change network`}
                    title={`Current network: ${networkName} - Click to change network`}
                >
                    <div className="relative h-6 w-6 flex items-center justify-center">
                        <Image
                            src={networkIconSrc}
                            alt={networkName}
                            fill
                            className="object-contain rounded-sm"
                            sizes="24px"
                        />
                    </div>
                </Button>
            </WagmiProviderGuard>
        </div>
    );
}

// Wallet Action Buttons Component - Buy, Send, Swap, Receive, Activity
function WalletActionButtons({ address }: { address: string }) {
    const { open } = useAppKit();
    const router = useRouter();

    const actionButtons = [
        {
            id: 'buy',
            label: 'Buy',
            icon: DollarSign,
            onClick: () => {
                try {
                    open({ view: 'OnRampProviders' });
                } catch (error) {
                    console.error('Failed to open OnRampProviders view:', error);
                    router.push('/wallet/buy');
                }
            },
        },
        {
            id: 'send',
            label: 'Send',
            icon: Send,
            onClick: () => {
                // Same interface as Buy/Swap: open AppKit modal (AppKit Send USDC / WalletSend pattern)
                try {
                    open({ view: 'WalletSend' });
                } catch (error) {
                    console.error('Failed to open WalletSend view:', error);
                    router.push('/wallet/send');
                }
            },
        },
        {
            id: 'swap',
            label: 'Swap',
            icon: ArrowLeftRight,
            onClick: () => {
                try {
                    open({ view: 'Swap' });
                } catch (error) {
                    console.error('Failed to open Swap view:', error);
                    router.push('/wallet/swap');
                }
            },
        },
        // {
        //     id: 'receive',
        //     label: 'Receive',
        //     icon: ArrowDown,
        //     onClick: () => {
        //         try {
        //             open({ view: 'Account' });
        //         } catch (error) {
        //             console.error('Failed to open Account view:', error);
        //             router.push('/wallet/receive');
        //         }
        //     },
        // },
        // {
        //     id: 'activity',
        //     label: 'Activity',
        //     icon: History,
        //     onClick: () => {
        //         router.push('/wallet');
        //     },
        // },
    ];

    return (
        <div className="mb-4">
            <div className="grid grid-cols-3 gap-2">
                {actionButtons.map((button) => {
                    const Icon = button.icon;
                    return (
                        <button
                            key={button.id}
                            onClick={button.onClick}
                            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg bg-card dark:bg-gray-800 border border-border dark:border-gray-700 hover:bg-muted dark:hover:bg-gray-700 hover:border-prestix-gold/30 transition-all group"
                            title={button.label}
                        >
                            <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-prestix-gold/20 flex items-center justify-center group-hover:bg-primary/20 dark:group-hover:bg-prestix-gold/30 transition-colors">
                                <Icon className="h-4 w-4 text-primary dark:text-prestix-gold group-hover:text-prestix-gold transition-colors" />
                            </div>
                            <span className="text-xs font-medium text-foreground dark:text-white group-hover:text-prestix-gold transition-colors">
                                {button.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// Unified Action Buttons Component - All buttons in one row (Buy, Send, Swap, Edit, Sign out)
function UnifiedActionButtons({
    address,
    showWalletActions = true,
    showEditProfile = false,
    isProfileEditMode = false,
    onEditProfileClick,
}: {
    address?: string;
    showWalletActions?: boolean;
    showEditProfile?: boolean;
    isProfileEditMode?: boolean;
    onEditProfileClick?: () => void;
}) {
    const { open } = useAppKit();
    const router = useRouter();
    const { logout, isLoggingOut } = useLogout();

    const handleSignOut = async () => {
        await logout({
            redirectTo: '/',
            createAuditLog: true,
            showToast: true,
        });
    };

    type ActionButton = {
        id: string;
        label: string;
        icon: React.ComponentType<{ className?: string }>;
        onClick: () => void | Promise<void>;
        isLogout?: boolean;
        disabled?: boolean;
        color?: 'green' | 'blue' | 'gold' | 'red';
    };

    const walletButtons: ActionButton[] = [
        {
            id: 'buy',
            label: 'Buy',
            icon: ShoppingCart,
            color: 'green',
            onClick: () => {
                try {
                    open({ view: 'OnRampProviders' });
                } catch (error) {
                    console.error('Failed to open OnRampProviders view:', error);
                    router.push('/wallet/buy');
                }
            },
        },
        {
            id: 'send',
            label: 'Send',
            icon: Send,
            color: 'blue',
            onClick: () => {
                // Same interface as Buy/Swap: open AppKit WalletSend modal (see AppKit Send USDC lab example)
                try {
                    open({ view: 'WalletSend' });
                } catch (error) {
                    console.error('Failed to open WalletSend view:', error);
                    router.push('/wallet/send');
                }
            },
        },
        {
            id: 'swap',
            label: 'Swap',
            icon: ArrowLeftRight,
            color: 'gold',
            onClick: () => {
                try {
                    open({ view: 'Swap' });
                } catch (error) {
                    console.error('Failed to open Swap view:', error);
                    router.push('/wallet/swap');
                }
            },
        },
    ];

    const editProfileButton: ActionButton = {
        id: 'edit-profile',
        label: isProfileEditMode ? 'Done' : 'Edit',
        icon: isProfileEditMode ? Check : Pencil,
        color: 'gold',
        onClick: onEditProfileClick ?? (() => router.push('/profile/edit')),
    };

    const logoutButton: ActionButton = {
        id: 'logout',
        label: isLoggingOut ? 'Signing out...' : 'Exit',
        icon: LogOut,
        color: 'red',
        onClick: handleSignOut,
        isLogout: true,
        disabled: isLoggingOut,
    };

    const allButtons: ActionButton[] = showWalletActions && address
        ? [...walletButtons, logoutButton]
        : showEditProfile
            ? [editProfileButton, logoutButton]
            : [logoutButton];

    const gridCols = showWalletActions && address ? 'grid-cols-4' : showEditProfile ? 'grid-cols-2' : 'grid-cols-1';

    return (
        <div className={`grid gap-2 ${gridCols}`}>
            {allButtons.map((button) => {
                const Icon = button.icon;
                const isLogout = button.isLogout ?? false;
                const isDisabled = button.disabled ?? false;
                const buttonColor = button.color || 'gold';

                // Define color classes based on button color
                const getColorClasses = (color: string, isLogout: boolean) => {
                    if (isLogout || color === 'red') {
                        return {
                            hoverBg: 'hover:bg-red-600/10 dark:hover:bg-red-500/20',
                            hoverBorder: 'hover:border-red-600/30 dark:hover:border-red-400/40',
                            iconBg: 'bg-red-600/10 dark:bg-red-500/20',
                            iconBgHover: 'group-hover:bg-red-600/20 dark:group-hover:bg-red-500/30',
                            iconColor: 'text-red-600 dark:text-red-400',
                            iconColorHover: 'group-hover:text-red-700 dark:group-hover:text-red-300',
                            textColor: 'text-red-600 dark:text-red-400',
                            textColorHover: 'group-hover:text-red-700 dark:group-hover:text-red-300',
                        };
                    }
                    if (color === 'green') {
                        return {
                            hoverBg: 'hover:bg-green-600/10 dark:hover:bg-green-500/20',
                            hoverBorder: 'hover:border-green-600/30 dark:hover:border-green-400/40',
                            iconBg: 'bg-green-600/10 dark:bg-green-500/20',
                            iconBgHover: 'group-hover:bg-green-600/20 dark:group-hover:bg-green-500/30',
                            iconColor: 'text-green-600 dark:text-green-400',
                            iconColorHover: 'group-hover:text-green-700 dark:group-hover:text-green-300',
                            textColor: 'text-green-600 dark:text-green-400',
                            textColorHover: 'group-hover:text-green-700 dark:group-hover:text-green-300',
                        };
                    }
                    if (color === 'blue') {
                        return {
                            hoverBg: 'hover:bg-blue-600/10 dark:hover:bg-blue-500/20',
                            hoverBorder: 'hover:border-blue-600/30 dark:hover:border-blue-400/40',
                            iconBg: 'bg-blue-600/10 dark:bg-blue-500/20',
                            iconBgHover: 'group-hover:bg-blue-600/20 dark:group-hover:bg-blue-500/30',
                            iconColor: 'text-blue-600 dark:text-blue-400',
                            iconColorHover: 'group-hover:text-blue-700 dark:group-hover:text-blue-300',
                            textColor: 'text-blue-600 dark:text-blue-400',
                            textColorHover: 'group-hover:text-blue-700 dark:group-hover:text-blue-300',
                        };
                    }
                    // Default to PRESTIX gold
                    return {
                        hoverBg: 'hover:bg-prestix-gold/10',
                        hoverBorder: 'hover:border-prestix-gold/30',
                        iconBg: 'bg-prestix-gold/10',
                        iconBgHover: 'group-hover:bg-prestix-gold/20',
                        iconColor: 'text-prestix-gold',
                        iconColorHover: 'group-hover:text-prestix-gold',
                        textColor: 'text-prestix-gold',
                        textColorHover: 'group-hover:text-prestix-gold',
                    };
                };

                const colors = getColorClasses(buttonColor, isLogout);

                return (
                    <button
                        key={button.id}
                        onClick={button.onClick}
                        disabled={isDisabled}
                        className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-lg bg-card dark:bg-gray-800 border border-border dark:border-gray-700 transition-all group ${colors.hoverBg
                            } ${colors.hoverBorder} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={button.label}
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${colors.iconBg
                            } ${colors.iconBgHover}`}>
                            {isLogout && isLoggingOut ? (
                                <Loader2 className={`h-4 w-4 ${colors.iconColor} animate-spin`} />
                            ) : (
                                <Icon className={`h-4 w-4 transition-colors ${colors.iconColor} ${colors.iconColorHover}`} />
                            )}
                        </div>
                        <span className={`text-xs font-medium transition-colors ${colors.textColor} ${colors.textColorHover}`}>
                            {button.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

// Wrapper component that only renders WalletInfo when dropdown is open
function LazyWalletInfo({ hideExplorerLink = false }: { hideExplorerLink?: boolean }) {
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
            <WalletInfo hideExplorerLink={hideExplorerLink} />
        </Suspense>
    );
}

// Component to display Total Value in sticky footer
// ✅ CORRECT: Uses Zustand store for wallet data (aligned with wallet-data-management-patterns.mdc)
function AccountTotalValue({ address }: { address: `0x${string}` | undefined }) {
    // ✅ CORRECT: Use Zustand store as primary source
    const walletStore = useTokenizinWalletStore();
    const { balances: storeBalances, isFetchingAll: storeIsLoading } = walletStore;

    // Also use hook for backward compatibility during migration
    const { balances: hookBalances, isLoading: hookIsLoading } = useTokenizinWalletData(address);

    // Prefer store data over hook data
    const balances = storeBalances || hookBalances;
    const isLoading = storeIsLoading || hookIsLoading;

    // Initialize store when address changes
    useEffect(() => {
        if (address && walletStore.currentAddress?.toLowerCase() !== address.toLowerCase()) {
            walletStore.setCurrentAddress(address);
        }
    }, [address, walletStore]);

    if (!address || !balances?.totalUSDValue || parseFloat(balances.totalUSDValue) === 0) {
        return null;
    }

    return (
        <div className="flex items-center justify-between text-xs px-4 py-2 bg-muted/50 dark:bg-gray-800/50 rounded-lg border border-border dark:border-gray-700">
            <div className="flex items-center gap-2 text-muted-foreground dark:text-gray-400">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Total Value</span>
            </div>
            {isLoading ? (
                <TigerSpinner size="sm" />
            ) : (
                <span className="font-medium text-foreground dark:text-white">
                    ${parseFloat(balances.totalUSDValue).toLocaleString()}
                </span>
            )}
        </div>
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

// Account Overview Header Component with Profile Image Upload and Address Display
// Account Overview Sheet Component - Handles view switching between Wallet and Profile
function AccountOverviewSheet({
    currentUser,
    address,
    getUserDisplayName
}: {
    currentUser: any;
    address?: string;
    getUserDisplayName: (user: any) => string;
}) {
    const [currentView, setCurrentView] = useState<'wallet' | 'profile'>('wallet');
    const [isProfileEditMode, setIsProfileEditMode] = useState(false);
    const isSheetOpen = useWalletUIStore((state) => state.accountOverviewSheetOpen);
    const setAccountOverviewSheetOpen = useWalletUIStore((state) => state.setAccountOverviewSheetOpen);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const handleProfileClick = () => {
        setCurrentView('profile');
        setIsProfileEditMode(false);
        // Reset scroll position when switching views
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
        }
    };

    const handleBackToWallet = () => {
        setCurrentView('wallet');
        setIsProfileEditMode(false);
        // Reset scroll position when switching views
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
        }
    };

    const handleWalletClick = () => {
        setCurrentView('wallet');
        setIsProfileEditMode(false);
        // Reset scroll position when switching views
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
        }
    };

    const handleEditProfileClick = () => {
        setIsProfileEditMode((prev) => !prev);
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
        }
    };

    return (
        <Sheet open={isSheetOpen} onOpenChange={setAccountOverviewSheetOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="ghost"
                        className="relative h-9 w-9 sm:h-10 sm:w-10 min-h-9 min-w-9 rounded-full hover:bg-prestix-gold/10 transition-colors p-0 overflow-hidden cursor-pointer z-[60] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-prestix-gold"
                    aria-label="User menu"
                    type="button"
                >
                    <UnifiedProfileAvatar size="sm" />
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[400px] sm:w-[540px] flex flex-col p-0 h-full max-h-screen [&>button]:hidden">
                {/* Sticky Header */}
                <SheetHeader className="sticky top-0 z-10 bg-background space-y-0 flex-shrink-0" style={{ borderBottom: '0.25px solid #666666' }}>
                    <div className="flex items-center justify-between" style={{ padding: '10px 5px' }}>
                        <SheetTitle className="text-left text-base">
                            {currentView === 'wallet' ? 'Account Overview' : 'Profile'}
                        </SheetTitle>
                        <SheetDescription className="sr-only">
                            {currentView === 'wallet'
                                ? 'View your wallet balances, tokens, and account information.'
                                : 'Manage your profile settings and information.'}
                        </SheetDescription>
                        <div className="flex items-center gap-2">
                            {/* Wallet, Profile, Receive Funds, Network Icons */}
                            <WalletHeaderIcons
                                onProfileClick={handleProfileClick}
                                onWalletClick={handleWalletClick}
                                currentView={currentView}
                                isSheetOpen={isSheetOpen}
                            />
                            {/* Close Button */}
                            <SheetClose asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                >
                                    <X className="h-4 w-4" />
                                    <span className="sr-only">Close</span>
                                </Button>
                            </SheetClose>
                        </div>
                    </div>

                    {/* User Info Section - Only show in wallet view */}
                    {currentView === 'wallet' && (
                        <AccountOverviewHeader
                            currentUser={currentUser}
                            address={address}
                            getUserDisplayName={getUserDisplayName}
                        />
                    )}
                </SheetHeader>

                {/* Scrollable Content - Animated view switching */}
                <div
                    ref={scrollContainerRef}
                    className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
                    key={currentView} // Force remount to reset height and scroll position
                >
                    {/* Wallet View */}
                    {currentView === 'wallet' && (
                        <div className="p-4 pt-4 pb-2">
                            {/* <h3 className="text-sm font-semibold mb-3 text-foreground">Wallet Details</h3> */}
                            <Suspense fallback={
                                <div className="flex items-center justify-center py-8">
                                    <TigerSpinner size="sm" />
                                </div>
                            }>
                                <WalletInfo />
                            </Suspense>
                        </div>
                    )}

                    {/* Profile View */}
                    {currentView === 'profile' && (
                        <div className="p-4 pt-4 pb-2">
                            <Suspense fallback={
                                <div className="flex items-center justify-center py-8">
                                    <TigerSpinner size="sm" />
                                </div>
                            }>
                                <UserProfile
                                    onBack={handleBackToWallet}
                                    isEditMode={isProfileEditMode}
                                    onCancelEdit={() => setIsProfileEditMode(false)}
                                />
                            </Suspense>
                        </div>
                    )}
                </div>

                {/* Sticky Footer - Unified Action Buttons (Buy, Send, Swap, Edit, Sign out) */}
                {(currentView === 'wallet' || currentView === 'profile') && (
                    <div className="sticky bottom-0 z-10 bg-background border-t border-border p-2 flex-shrink-0">
                        <UnifiedActionButtons
                            address={address}
                            showWalletActions={currentView === 'wallet'}
                            showEditProfile={currentView === 'profile'}
                            isProfileEditMode={isProfileEditMode}
                            onEditProfileClick={handleEditProfileClick}
                        />
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}

function AccountOverviewHeader({
    currentUser,
    address,
    getUserDisplayName
}: {
    currentUser: any;
    address?: string;
    getUserDisplayName: (user: any) => string;
}) {
    const { data: session, update: updateSession } = useSession();
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const appKitAccount = useAppKitAccount();
    const { open: openAppKit } = useAppKit();
    const accountType = (detectAccountType(appKitAccount as unknown as { allAccounts?: { type?: string; address?: `0x${string}` }[] }) ?? 'eoa') as 'eoa' | 'social' | 'smart';
    const handleOpenAccountSwitch = () => {
        try {
            openAppKit({ view: 'ProfileWallets' });
        } catch (e) {
            console.warn('[AccountOverviewHeader] Failed to open account switch:', e);
        }
    };
    const walletAddress = session?.user?.walletAddress || currentUser?.walletAddress || address || '';
    const authMethod = currentUser?.authMethod || (walletAddress ? 'wallet' : null);
    const displayName = currentUser?.name || (walletAddress ? `Wallet User ${walletAddress.slice(0, 5)}...${walletAddress.slice(-4)}` : 'User');
    const email = authMethod === 'wallet' ? null : (currentUser?.email || null);
    const handleCopyAddress = async () => {
        if (!address) return;
        try {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            toast({
                title: 'Address copied!',
                description: 'Wallet address copied to clipboard',
            });
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy address:', error);
        }
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch('/api/profile/upload-image', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
                throw new Error(errorData.error || 'Upload failed');
            }

            const data = await response.json();

            // Update AppKit session store with new profile image URL so UnifiedProfileAvatar
            // and all other consumers (header, sidebar, wallet panel, profile) re-render
            if (updateSession && session?.user && data.imageUrl) {
                updateSession({
                    ...session.user,
                    profileImageUrl: data.imageUrl,
                });
            }

            toast({
                title: 'Profile image updated!',
                description: 'Your profile picture has been updated successfully.',
            });
        } catch (err) {
            console.error('Profile image upload error:', err);
            toast({
                title: 'Upload failed',
                description: err instanceof Error ? err.message : 'Failed to upload image',
                variant: 'destructive',
            });
        } finally {
            setIsUploading(false);
        }
    };

    const getExplorerUrl = (addr: string) => {
        return `https://sepolia.etherscan.io/address/${addr}`;
    };

    return (
        <div className="flex items-center pt-1" style={{ padding: '0 5px 0 5px', gap: '0.75rem' }}>
            {/* Profile Image with Upload */}
            <div className="flex-shrink-0 relative">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="relative cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Click to change profile picture"
                >
                    <UnifiedProfileAvatar size="md" />
                    {isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                            <TigerSpinner size="sm" />
                        </div>
                    )}
                </button>
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0 space-y-0.5">
                {displayName && (
                    <p
                        className="font-semibold text-sm text-foreground truncate"
                        title={displayName}
                    >
                        {displayName}
                    </p>
                )}
                {/* Only show email if auth method is not wallet */}
                {email && (
                    <p
                        className="text-xs text-muted-foreground truncate"
                        title={email}
                    >
                        {email}
                    </p>
                )}

                {/* Wallet Address with account type indicator, copy, explorer, and switch account */}
                {address && (
                    <div className="mt-1 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                type="button"
                                onClick={handleOpenAccountSwitch}
                                className="flex items-center gap-1.5 rounded-md px-1 py-0.5 hover:bg-muted dark:hover:bg-gray-700 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-prestix-gold/50"
                                aria-label={accountType === 'social' ? 'Social account – Switch account' : accountType === 'smart' ? 'Smart account – Switch account' : 'EOA account – Switch account'}
                                title="Switch account"
                            >
                                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-muted dark:bg-gray-700 shrink-0" aria-hidden>
                                    {accountType === 'social' ? (
                                        <Mail className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                                    ) : accountType === 'smart' ? (
                                        <Wallet className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                                    ) : (
                                        <KeyRound className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                                    )}
                                </span>
                                <span className="text-xs font-mono text-muted-foreground">
                                    {address.slice(0, 5)}...{address.slice(-4)}
                                </span>
                                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            </button>
                            <button
                                onClick={handleCopyAddress}
                                className="p-1 hover:bg-muted dark:hover:bg-gray-700 rounded transition-colors"
                                title="Copy address"
                            >
                                {copied ? (
                                    <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                                ) : (
                                    <Copy className="h-3 w-3 text-muted-foreground" />
                                )}
                            </button>
                            <a
                                href={getExplorerUrl(address)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 hover:bg-muted dark:hover:bg-gray-700 rounded transition-colors"
                                title="View on Explorer"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-prestix-gold" />
                            </a>
                        </div>
                        {/* <button
                            type="button"
                            onClick={handleOpenAccountSwitch}
                            className="text-xs text-muted-foreground hover:text-foreground dark:hover:text-white underline decoration-dotted focus:outline-none focus:ring-2 focus:ring-prestix-gold/50 rounded"
                        >
                            {accountType === 'social' ? 'Social account' : accountType === 'smart' ? 'Smart account' : 'EOA account'}
                            {' · Switch account'}
                        </button> */}
                    </div>
                )}
            </div>
        </div>
    );
}


export function AppHeader({ className, onMenuToggle, sidebarOpen, sidebarCollapsed }: AppHeaderProps) {
    const pathname = usePathname();
    const [searchOpen, setSearchOpen] = useState(false);
    const { theme, resolvedTheme } = useTheme();

    // Use Zustand store for auth state instead of useEffect
    const { address, isConnected } = useAppKitAccount();

    // NextAuth session
    const { session } = useAppKitSession();

    // Use the same mobile state as the app layout
    const { isMobile } = useSidebarStore();

    // AppKit for wallet account modal
    const { open: openAppKit } = useAppKit();

    // Check if WagmiProvider is ready (for conditional logic that doesn't require wagmi hooks)
    // const wagmiReady = useWagmiProviderReady();

    // Note: useAccount() is now called inside HeaderWagmiDependent component
    // which is wrapped in WagmiProviderGuard to prevent errors

    // Handler to open AppKit modal instead of navigating away
    const handleOpenWalletDetails = () => {
        if (typeof openAppKit === 'function') {
            openAppKit();
        }
    };

    // Determine authentication state
    // Show profile/wallet UI when wallet is connected - allows access to Exit button
    // even when session.user is null (e.g. Google social login before addSession completes,
    // or Nonce mismatch). User can still disconnect and complete the flow.
    //
    // CRITICAL: When user explicitly signs out, clearSession() sets session to default.
    // useAppKitAccount().isConnected can stay true for Reown social/embedded wallets
    // (wagmi disconnect doesn't disconnect them). So we MUST require session to have
    // address/isConnected - when session is cleared, show Connect regardless of AppKit.
    const isSessionLoading = false; // Session is managed by AppKit
    const hasSessionConnection = !!(session?.address || session?.isConnected);
    const isAuthenticated = hasSessionConnection && (isConnected || !!session?.isConnected);

    // Resolve address from AppKit or session (session may have it when AppKit lags)
    const resolvedAddress = address || session?.address || '';

    // Get current user from either NextAuth session or Zustand store
    const currentUser = session?.user;

    const mainNavItems = getMainNavigation();

    // Theme detection for dark mode
    const isDarkMode = resolvedTheme === 'dark' || theme === 'dark';

    // handleSignOut is now handled by LogoutMenuItem component

    return (
        <header
            className={cn(
                'sticky top-0 z-[70] w-full border-b border-border',
                className,
            )}
            style={{
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
                    'relative z-10 flex h-16 items-center justify-between',
                    // Mobile: padding for menu button
                    'pl-4 pr-4',
                    // Desktop: padding with fixed left position for logo
                    'md:pl-[10px] md:pr-4'
                )}
                style={{ pointerEvents: 'auto' }}
            >
                {/* Left Section - Logo and Breadcrumbs inline */}
                <div className={cn(
                    "flex items-center min-w-0 flex-1 gap-0",
                    // Mobile: center content
                    isMobile && "justify-center"
                )}>
                    {/* Mobile Menu Toggle - Absolutely positioned on mobile, hidden on desktop */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            'z-[55]',
                            'hover:bg-prestix-gold/10',
                            'transition-colors',
                            // Mobile: absolute positioning to not affect flex layout
                            isMobile ? 'absolute left-0 top-1/2 transform -translate-y-1/2' : 'relative md:hidden',
                            // Desktop: hidden (sidebar toggle is in sidebar)
                            'md:hidden'
                        )}
                        onClick={onMenuToggle}
                        aria-label="Toggle menu"
                    >
                        {sidebarOpen ? (
                            <X className="h-5 w-5 text-foreground dark:text-gray-300 transition-colors hover:text-prestix-gold" />
                        ) : (
                            <Menu className="h-5 w-5 text-foreground dark:text-gray-300 transition-colors hover:text-prestix-gold" />
                        )}
                    </Button>

                    {/* Logo - PRESTIX.VIP wordmark (PRESTIX. white, VIP red). PrestixLogo renders Link when asButton=false. */}
                    {!isMobile && (
                        <PrestixLogo
                            asButton={false}
                            size="2xl"
                            ariaLabel="PRESTIX.VIP Home"
                            className={cn(
                                "flex items-center flex-shrink-0 relative z-[55]",
                                "hover:opacity-90 transition-opacity origin-left"
                            )}
                        />
                    )}

                    {/* Breadcrumbs - Right of logo with gap to prevent logo hover overlap */}
                    <div className="flex-1 min-w-0 hidden md:flex md:items-center md:ml-4">
                        <BreadcrumbNav />
                    </div>
                </div>

                {/* Center Section - Empty for now */}
                <div className="hidden md:flex items-center">{/* Navigation items moved to sidebar */}</div>

                {/* Right Section - Search, Notifications, User Menu - flex-shrink-0 so Connect/Profile stay visible on mobile */}
                <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
                    {/* Search */}
                    {/* <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSearchOpen(!searchOpen)}
                        className="hidden sm:flex hover:bg-prestix-gold/10 transition-colors"
                    >
                        <Search className="h-4 w-4 text-foreground dark:text-gray-300 group-hover:text-orange-700 dark:group-hover:text-orange-300 transition-colors" />
                    </Button> */}
                    <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        className="relative h-9 w-9 rounded-full hover:bg-prestix-gold/10 transition-colors p-0"
                        aria-label="Documentation"
                    >
                        <Link href="/docs">
                            <BookOpen className="h-5 w-5 text-foreground dark:text-gray-300 hover:text-prestix-gold transition-colors" />
                        </Link>
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        className="relative h-9 w-9 rounded-full hover:bg-prestix-gold/10 transition-colors p-0"
                        aria-label="About"
                    >
                        <Link href="/about">
                            <Info className="h-5 w-5 text-foreground dark:text-gray-300 hover:text-prestix-gold transition-colors" />
                        </Link>
                    </Button>
                    {/* Theme Toggle moved to Profile Settings Page */}

                    {/* Test Case Status Widget */}
                    {/* {isAuthenticated && <TestCaseStatusWidget />} */}

                    {/* Network Selector - Switch between blockchain networks */}
                    {/* {isAuthenticated && (
                        <WagmiProviderGuard fallback={null}>
                            <NetworkSwitcherButton />
                        </WagmiProviderGuard>
                    )} */}

                    {/* Tiger Wallet Button - Quick access to wallet - Only show when WagmiProvider is ready */}



                    {/* Login Button - Show when not authenticated, but hide if already on sign-in page */}
                    {/* {!isAuthenticated && pathname !== '/auth/signin' && !isMobile ? (
                        <Button
                            variant="outline"
                            asChild
                            className="h-9 w-9 p-0 gap-0 border-[#F59E0B]/20 bg-[#0A3A2A]/50 text-[#F8F5F0] hover:bg-[#1C3A36] hover:text-[#F59E0B] transition-colors sm:h-auto sm:w-auto sm:px-3 sm:py-2 sm:gap-2"
                            aria-label="Sign In"
                        >
                            <Link href="/auth/signin">
                                <User className="h-4 w-4" />
                                <span className="hidden sm:inline">Sign In</span>
                            </Link>
                        </Button>
                    ) : null} */}
                    {/* Docs Link */}

                    {/* Tiger Wallet Button - Always visible for AppKit connection and SIWE authentication */}
                    <TokenizinWalletButton />

                    {/* Notifications */}
                    {isAuthenticated && <NotificationBell />}



                    {/* User Menu - Only show if Stack Auth user is authenticated */}
                    {/* Only show spinner when actually loading, not when unauthenticated */}
                    {isSessionLoading ? (
                        <div className="flex items-center space-x-2">
                            <TigerSpinner size="sm" />
                        </div>
                    ) : isAuthenticated ? (
                        <AccountOverviewSheet
                            currentUser={currentUser}
                            address={resolvedAddress}
                            getUserDisplayName={getUserDisplayName}
                        />
                    ) : null}
                </div>

                {/* Mobile Search Bar */}
                {/* {searchOpen && (
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
                )} */}
            </div>
        </header>
    );
}
