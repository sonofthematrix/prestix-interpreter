"use client";

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface CasinoChipAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'gold' | 'silver' | 'bronze' | 'platinum';
  className?: string;
  showInitials?: boolean;
  initials?: string;
  userId?: string;
}

const sizeMap = {
  sm: { container: 'h-8 w-8', chip: 'h-6 w-6', text: 'text-xs' },
  md: { container: 'h-12 w-12', chip: 'h-10 w-10', text: 'text-sm' },
  lg: { container: 'h-16 w-16', chip: 'h-14 w-14', text: 'text-base' },
  xl: { container: 'h-20 w-20', chip: 'h-18 w-18', text: 'text-lg' },
};

const variantMap = {
  gold: {
    outer: 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600',
    inner: 'bg-gradient-to-br from-yellow-300 to-yellow-500',
    text: 'text-yellow-900',
    shadow: 'shadow-yellow-200',
  },
  silver: {
    outer: 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500',
    inner: 'bg-gradient-to-br from-gray-200 to-gray-400',
    text: 'text-gray-800',
    shadow: 'shadow-gray-200',
  },
  bronze: {
    outer: 'bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600',
    inner: 'bg-gradient-to-br from-orange-300 to-orange-500',
    text: 'text-orange-900',
    shadow: 'shadow-orange-200',
  },
  platinum: {
    outer: 'bg-gradient-to-br from-blue-300 via-blue-400 to-blue-500',
    inner: 'bg-gradient-to-br from-blue-200 to-blue-400',
    text: 'text-blue-900',
    shadow: 'shadow-blue-200',
  },
};

export function CasinoChipAvatar({ 
  size = 'md', 
  variant = 'gold',
  className,
  showInitials = true,
  initials,
  userId
}: CasinoChipAvatarProps) {
  const sizes = sizeMap[size];
  const colors = variantMap[variant];
  
  // Generate initials from userId if not provided
  const displayInitials = initials || (userId ? userId.charAt(0).toUpperCase() : 'T');
  
  // Generate variant based on userId for consistency
  const userVariant = userId ? 
    (['gold', 'silver', 'bronze', 'platinum'][userId.length % 4] as keyof typeof variantMap) : 
    variant;

  const userColors = variantMap[userVariant];

  return (
    <div className={cn(
      "relative flex items-center justify-center",
      sizes.container,
      className
    )}>
      {/* Outer ring with casino chip pattern */}
      <div className={cn(
        "absolute inset-0 rounded-full border-2 border-white/20",
        userColors.outer,
        userColors.shadow,
        "shadow-luxury"
      )}>
        {/* Inner pattern dots */}
        <div className="absolute inset-1 rounded-full border border-white/30">
          <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white/40 rounded-full"></div>
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white/40 rounded-full"></div>
          <div className="absolute left-1 top-1/2 transform -translate-y-1/2 w-1 h-1 bg-white/40 rounded-full"></div>
          <div className="absolute right-1 top-1/2 transform -translate-y-1/2 w-1 h-1 bg-white/40 rounded-full"></div>
        </div>
      </div>
      
      {/* Inner chip with initials */}
      <div className={cn(
        "relative rounded-full flex items-center justify-center",
        userColors.inner,
        sizes.chip,
        "border border-white/20"
      )}>
        {showInitials && (
          <span className={cn(
            "font-bold luxury-heading",
            userColors.text,
            sizes.text
          )}>
            {displayInitials}
          </span>
        )}
      </div>
      
      {/* Shine effect */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/20 via-transparent to-transparent pointer-events-none"></div>
    </div>
  );
}

// Specialized components for different use cases
export function ProfileAvatar({ userId, className }: { userId?: string; className?: string }) {
  return (
    <CasinoChipAvatar 
      size="md" 
      userId={userId}
      className={cn("hover:scale-105 transition-transform duration-200", className)}
    />
  );
}

export function HeaderAvatar({ userId, className }: { userId?: string; className?: string }) {
  return (
    <CasinoChipAvatar 
      size="sm" 
      userId={userId}
      className={cn("hover:scale-110 transition-transform duration-200", className)}
    />
  );
}

export function LargeAvatar({ userId, className }: { userId?: string; className?: string }) {
  return (
    <CasinoChipAvatar 
      size="lg" 
      userId={userId}
      className={cn("hover:scale-105 transition-transform duration-200", className)}
    />
  );
}

export function PremiumAvatar({ userId, className }: { userId?: string; className?: string }) {
  return (
    <CasinoChipAvatar 
      size="xl" 
      variant="platinum"
      userId={userId}
      className={cn("animate-luxury-glow", className)}
    />
  );
}
