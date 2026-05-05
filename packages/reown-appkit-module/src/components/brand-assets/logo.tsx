"use client";

import { useBrandPreferences } from '@/hooks/use-brand-preferences';
import { cn } from '@/lib/utils';
import { useThemeStore } from '@/stores/ui-stores';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';

interface LogoProps {
  variant?: 'primary' | 'horizontal' | 'circular';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  className?: string;
  priority?: boolean;
  showText?: boolean;
  responsive?: boolean;
  customLogoUrl?: string | null;
  customTitle?: string | null;
}

const sizeMap = {
  xs: { width: 24, height: 24 },
  sm: { width: 32, height: 32 },
  md: { width: 48, height: 48 },
  lg: { width: 64, height: 64 },
  xl: { width: 96, height: 96 },
  '2xl': { width: 128, height: 128 },
  '3xl': { width: 192, height: 192 },
};

// Horizontal logo size map (1.6:1 aspect ratio - width:height)
const horizontalSizeMap = {
  xs: { width: 24, height: 15 },
  sm: { width: 32, height: 20 },
  md: { width: 48, height: 30 },
  lg: { width: 64, height: 40 },
  xl: { width: 96, height: 60 },
  '2xl': { width: 128, height: 80 },
  '3xl': { width: 192, height: 120 },
};

export function Logo({ 
  variant = 'primary', 
  size = 'md', 
  className,
  priority = false,
  showText = false,
  responsive = true,
  customLogoUrl = null,
  customTitle = "",
}: LogoProps) {
  const { getEffectiveMode } = useThemeStore();
  const { theme, resolvedTheme } = useTheme();
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Determine theme-aware logo path
  const getThemeAwareLogoPath = () => {
    // If custom logo URL is provided, use it
    if (customLogoUrl) {
      return customLogoUrl;
    }
    
    // Use theme-aware logos for Tokenizin brand
    // resolvedTheme is the actual theme value (handles 'system' preference)
    const effectiveTheme = resolvedTheme || theme || 'dark';
    
    // Always use theme-aware Tokenizin logos when no custom logo is provided
    return effectiveTheme === 'dark' 
      ? '/LogoTigerDark.png' 
      : '/LogoTigerLight.png';
  };
  
  const logoPath = getThemeAwareLogoPath();
  const appTitle = customTitle || "";  
  
  const dimensions = variant === 'horizontal' ? horizontalSizeMap[size] : sizeMap[size];
  
  // Generate responsive classes if responsive is enabled (1.6:1 aspect ratio)
  const responsiveClasses = responsive ? {
    xs: variant === 'horizontal' ? "h-4 w-6 sm:h-5 sm:w-8" : "h-6 w-6 sm:h-8 sm:w-8",
    sm: variant === 'horizontal' ? "h-5 w-8 sm:h-6 sm:w-10" : "h-8 w-8 sm:h-10 sm:w-10",
    md: variant === 'horizontal' ? "h-8 w-12 sm:h-10 sm:w-16" : "h-12 w-12 sm:h-14 sm:w-14",
    lg: variant === 'horizontal' ? "h-10 w-16 sm:h-12 sm:w-20" : "h-16 w-16 sm:h-20 sm:w-20",
    xl: variant === 'horizontal' ? "h-12 w-20 sm:h-16 sm:w-24" : "h-20 w-20 sm:h-24 sm:w-24",
    '2xl': variant === 'horizontal' ? "h-16 w-24 sm:h-20 sm:w-32" : "h-24 w-24 sm:h-32 sm:w-32",
    '3xl': variant === 'horizontal' ? "h-20 w-32 sm:h-24 sm:w-40" : "h-32 w-32 sm:h-40 sm:w-40"
  }[size] : "";

  if (variant === 'circular') {
    return (
      <div className={cn("flex items-center space-x-3", className)}>
        <Image
          src={logoPath}
          alt={`${appTitle} Logo`}
          width={dimensions.width}
          height={dimensions.height}
          priority={priority}
          className={cn("rounded-full object-contain", responsiveClasses)}
          style={responsive ? { 
            aspectRatio: variant === 'circular' ? '1.6/1' : '1/1',
          } : { 
            aspectRatio: variant === 'circular' ? '1.6/1' : '1/1',
            width: dimensions.width,
            height: dimensions.height,
          }}
        />
        {/* {showText && ( 
          // <div className="flex flex-col">
          //   <span className="text-lg font-bold luxury-heading text-foreground dark:text-white">
          //     {appTitle}
          //   </span>
          // </div>
         )} */}
      </div>
    );
  }

  if (variant === 'horizontal') {
    return (
      <div className={cn("flex items-center space-x-3 max-w-full", className)}>
        <Image
          src={logoPath}
          alt={`${appTitle} Logo`}
          width={dimensions.width}
          height={dimensions.height}
          priority={priority}
          className={cn("object-contain flex-shrink-0", responsiveClasses)}
          style={responsive ? { 
            aspectRatio: '1.6/1',
          } : { 
            aspectRatio: '1.6/1',
            width: dimensions.width,
            height: dimensions.height.toString(),
          } as React.CSSProperties}
        />
        {/* {showText && (
          // <div className="flex flex-col min-w-0 overflow-hidden">
          //   <span className="text-lg font-bold luxury-heading text-foreground dark:text-white whitespace-nowrap overflow-hidden text-ellipsis">
          //   </span>
          // </div>
         )} */}
      </div>
    );
  }

  // Primary variant (default)
  return (
    <Image
      src={logoPath}
      alt={`${appTitle} Logo`}
      width={dimensions.width}
      height={dimensions.height}
      priority={priority}
      className={cn("object-contain", responsiveClasses, className)}
      style={responsive ? { 
        aspectRatio: '1.6/1',
      } : { 
        aspectRatio: '1.6/1',
        width: dimensions.width,
        height: dimensions.height,
      }}
    />
  );
}

// Specialized logo components for different use cases
const HeaderLogoComponent = ({ className }: { className?: string }) => {
  const { logoUrl, appTitle, loading } = useBrandPreferences();
  
  // Prevent re-render during loading to avoid blinking
  const [stableLogoUrl, setStableLogoUrl] = React.useState<string | null>(null);
  const [stableAppTitle, setStableAppTitle] = React.useState<string>('Tokenizin');
  
  // Only update stable values when loading completes and values actually change
  React.useEffect(() => {
    if (!loading) {
      if (logoUrl !== stableLogoUrl) {
        setStableLogoUrl(logoUrl);
      }
      if (appTitle !== stableAppTitle) {
        setStableAppTitle(appTitle);
      }
    }
  }, [loading, logoUrl, appTitle, stableLogoUrl, stableAppTitle]);

  return (
    <Logo
      variant="horizontal"
      size="3xl"
      showText={true}
      customLogoUrl={stableLogoUrl}
      customTitle={stableAppTitle}
      className={cn("hover:scale-105 transition-transform duration-300", className)}
      priority
    />
  );
};

HeaderLogoComponent.displayName = 'HeaderLogo';
export const HeaderLogo = React.memo(HeaderLogoComponent, (prevProps, nextProps) => {
  // Only re-render if className actually changes
  return prevProps.className === nextProps.className;
});

export function FooterLogo({ className }: { className?: string }) {
  const { logoUrl, appTitle } = useBrandPreferences();

  return (
    <Logo 
      variant="primary" 
      size="lg" 
      customLogoUrl={logoUrl}
      customTitle={appTitle}
      className={cn("opacity-80 hover:opacity-100 transition-opacity !shadow-none", className)}
    />
  );
}

export function FaviconLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/LogoTiger2.png"
      alt="Tokenizin Logo"
      width={64}
      height={64}
      className={cn("flex-shrink-0 object-contain w-14 h-14 sm:w-16 sm:h-16", className)}
      priority
    />
  );
}

export function LoadingLogo({ className }: { className?: string }) {
  const { logoUrl, appTitle } = useBrandPreferences();

  return (
    <div className={cn("flex flex-col items-center space-y-4", className)}>
      <Logo 
        variant="primary" 
        size="xl" 
        customLogoUrl={logoUrl}
        customTitle={appTitle}
        className="animate-luxury-glow"
      />
      {/* <div className="text-center">
        <h2 className="text-2xl font-bold luxury-heading text-foreground">
          {appTitle}
        </h2>
        <p className="text-sm luxury-text text-muted-foreground">
          Loading your premium experience...
        </p>
      </div> */}
    </div>
  );
}

/**
 * AuthLogo - Specialized logo component for authentication pages
 * 
 * Features:
 * - Large, clear sizing (h-32 on mobile, h-40 on tablet, h-48 on desktop)
 * - Maintains aspect ratio with explicit width
 * - Priority loading for better performance
 * - Consistent styling across signin/signup/register pages
 */
export function AuthLogo({ className }: { className?: string }) {
  return (
    <Logo 
      variant="primary" 
      size="3xl" 
      responsive={false}
      className={cn("!h-32 !w-auto sm:!h-40 md:!h-48 lg:!h-56 !max-w-md mx-auto !shadow-none object-contain", className)}
      priority
    />
  );
}
