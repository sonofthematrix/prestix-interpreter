'use client';

import { CachedAvatar } from '@/components/common/CachedImage';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';

interface UnifiedProfileAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showFallback?: boolean;
  fallbackText?: string;
  onClick?: () => void;
}

/**
 * Unified Profile Avatar Component
 * 
 * This component ensures consistent avatar display across:
 * - Header profile dropdown
 * - Sidebar footer profile
 * - Profile page header
 * - Any other location that needs user avatar
 * 
 * It automatically:
 * - Uses session data for avatar URL
 * - Handles CORS issues with proxy API
 * - Generates consistent initials
 * - Provides consistent sizing
 * - Updates automatically when session changes
 */
export function UnifiedProfileAvatar({
  size = 'sm',
  className,
  showFallback = true,
  fallbackText,
  onClick,
}: UnifiedProfileAvatarProps) {
  const { data: session } = useSession();

  // Generate consistent initials from user data
  const generateInitials = (): string => {
    if (fallbackText) return fallbackText;
    
    const user = session?.user;
    if (!user) return 'U';

    // Try name first
    if (user.name) {
      const names = user.name.split(' ').filter(n => n.length > 0);
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase();
      }
      return user.name.substring(0, 2).toUpperCase();
    }

    // Fallback to email
    if (user.email) {
      return user.email.substring(0, 2).toUpperCase();
    }

    return 'U';
  };

  // Get avatar URL with priority order
  const getAvatarUrl = (): string | undefined => {
    const user = session?.user as any;
    if (!user) return '/playlogo.png'; // Default Tokenizin logo

    // Priority order:
    // 1. profileImageUrl (from database - custom avatar)
    // 2. image (NextAuth standard field - custom avatar)
    // 3. Default Tokenizin playlogo.png (if no custom avatar)
    return user.profileImageUrl || user.image || '/playlogo.png';
  };

  const avatarUrl = getAvatarUrl();
  const initials = generateInitials();
  const userName = session?.user?.name || session?.user?.email || 'User';

  // If onClick is provided, wrap in div, otherwise render directly
  const avatarElement = (
    <CachedAvatar
      src={avatarUrl}
      alt={`${userName} profile`}
      size={size}
      fallbackText={showFallback ? initials : undefined}
      className={cn("transition-all duration-200 hover:opacity-80", className)}
    />
  );

  if (onClick) {
    return (
      <div 
        className={cn('cursor-pointer', className)}
        onClick={onClick}
      >
        {avatarElement}
      </div>
    );
  }

  return avatarElement;
}

/**
 * Hook to get current user avatar data
 * Useful for components that need avatar info but don't render the avatar directly
 */
export function useUserAvatar() {
  const { data: session } = useSession();

  const generateInitials = (): string => {
    const user = session?.user;
    if (!user) return 'U';

    if (user.name) {
      const names = user.name.split(' ').filter(n => n.length > 0);
      if (names.length >= 2) {
        return `${names[0][0]}${names[1][0]}`.toUpperCase();
      }
      return user.name.substring(0, 2).toUpperCase();
    }

    if (user.email) {
      return user.email.substring(0, 2).toUpperCase();
    }

    return 'U';
  };

  const getAvatarUrl = (): string | undefined => {
    const user = session?.user as any;
    if (!user) return '/playlogo.png';
    return user.profileImageUrl || user.image || '/playlogo.png';
  };

  return {
    avatarUrl: getAvatarUrl(),
    initials: generateInitials(),
    userName: session?.user?.name || session?.user?.email || 'User',
    user: session?.user,
    isLoading: !session,
  };
}

/**
 * Simplified avatar for auto-generated components
 * This should be used by the auto-generation plugin
 */
export function AutoGenProfileAvatar({
  userId,
  profileImageUrl,
  size = 'sm',
  className,
}: {
  userId?: string;
  profileImageUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const { data: session } = useSession();
  
  // If this is for the current user, use session data
  const isCurrentUser = userId === session?.user?.id;
  
  if (isCurrentUser) {
    return <UnifiedProfileAvatar size={size} className={className} />;
  }

  // For other users, use provided data
  const generateInitials = (id?: string): string => {
    if (!id) return 'U';
    return id.substring(0, 2).toUpperCase();
  };
  
  // Default avatar: Tokenizin playlogo.png
  const DEFAULT_AVATAR = '/playlogo.png';
  
  // Use default avatar if no custom avatar is provided
  const avatarSrc = profileImageUrl || DEFAULT_AVATAR;

  return (
    <CachedAvatar
      src={avatarSrc}
      alt={`User ${userId} profile`}
      size={size}
      fallbackText={generateInitials(userId)}
      className={className}
    />
  );
}
