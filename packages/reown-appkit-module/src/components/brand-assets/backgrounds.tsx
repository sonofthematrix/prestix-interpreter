"use client";

import { AppConfig } from '@/config/app';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';

interface BackgroundProps {
  variant?: 'tokenizin-light' | 'tokenizin-dark' | 'tokenizin-hero' | 'foliage-banner' | 'foliage-overlay';
  className?: string;
  priority?: boolean;
  overlay?: boolean;
  children?: React.ReactNode;
  responsive?: boolean;
  parallax?: boolean;
}

export function BrandBackground({ 
  variant = 'tokenizin-light',
  className,
  priority = false,
  overlay = true,
  children,
  responsive = true,
  parallax = false
}: BackgroundProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // Handle window resize for responsive behavior
  useEffect(() => {
    if (!responsive) return;

    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    // Set initial size
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [responsive]);
  const backgroundPath = (() => {
    switch (variant) {
      case 'tokenizin-light':
        return AppConfig.assets.backgrounds.tiger.light;
      case 'tokenizin-dark':
        return AppConfig.assets.backgrounds.tiger.dark;
      case 'tokenizin-hero':
        return AppConfig.assets.backgrounds.tiger.hero;
      case 'foliage-banner':
        return AppConfig.assets.backgrounds.foliage.banner;
      case 'foliage-overlay':
        return AppConfig.assets.backgrounds.foliage.overlay;
      default:
        return AppConfig.assets.backgrounds.tiger.light;
    }
  })();

  // Determine responsive object fit based on screen size
  const getObjectFit = () => {
    if (!responsive) return "object-cover object-center";
    
    const { width, height } = windowSize;
    const aspectRatio = width / height;
    
    // For very wide screens, use object-cover to maintain aspect ratio
    if (aspectRatio > 2) return "object-cover object-center";
    // For tall screens, use object-cover with top positioning
    if (aspectRatio < 0.8) return "object-cover object-top";
    // For normal screens, use object-cover with center positioning
    return "object-cover object-center";
  };

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src={backgroundPath}
          alt="Tokenizin Background"
          fill
          priority={priority}
          className={cn(
            "transition-all duration-500 ease-in-out",
            getObjectFit(),
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          style={{ 
            zIndex: -1,
            transform: parallax ? "scale(1.1)" : "scale(1)",
            transition: "transform 0.3s ease-out, opacity 0.5s ease-in-out"
          }}
          onLoad={() => setIsLoaded(true)}
          sizes="100vw"
        />
        
        {/* Loading placeholder */}
        {!isLoaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 animate-pulse" />
        )}
      </div>

      {/* Responsive overlay with gradient */}
      {overlay && (
        <div className={cn(
          "absolute inset-0 transition-all duration-300 pointer-events-none",
          "bg-gradient-to-b from-background/90 via-background/80 to-background/90",
          "backdrop-blur-sm"
        )} />
      )}

      {/* Content */}
      {children && (
        <div className="relative z-20">
          {children}
        </div>
      )}
    </div>
  );
}

// Specialized background components
export function HeroBackground({ 
  children, 
  className,
  responsive = true,
  parallax = true 
}: { 
  children?: React.ReactNode; 
  className?: string;
  responsive?: boolean;
  parallax?: boolean;
}) {
  return (
    <BrandBackground 
      variant="tokenizin-hero" 
      className={cn("min-h-screen", className)}
      priority
      responsive={responsive}
      parallax={parallax}
      overlay={true}
    >
      {children}
    </BrandBackground>
  );
}

export function PageBackground({ 
  children, 
  className,
  responsive = true 
}: { 
  children?: React.ReactNode; 
  className?: string;
  responsive?: boolean;
}) {
  return (
    <BrandBackground 
      variant="tokenizin-light" 
      className={cn("min-h-screen", className)}
      responsive={responsive}
      overlay={true}
    >
      {children}
    </BrandBackground>
  );
}

export function DarkBackground({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <BrandBackground 
      variant="tokenizin-dark" 
      className={cn("min-h-screen", className)}
    >
      {children}
    </BrandBackground>
  );
}

export function FoliageBanner({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <BrandBackground 
      variant="foliage-banner" 
      className={cn("h-32 md:h-48", className)}
      overlay={false}
    >
      {children}
    </BrandBackground>
  );
}

export function FoliageOverlay({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <BrandBackground 
      variant="foliage-overlay" 
      className={cn("min-h-screen", className)}
    >
      {children}
    </BrandBackground>
  );
}

// Background patterns and textures
export function TigerPattern({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <div className="absolute inset-0 opacity-5">
        <div className="h-full w-full bg-gradient-to-br from-primary/20 via-transparent to-secondary/20" />
      </div>
      <div className="absolute inset-0 opacity-10">
        <div className="h-full w-full bg-[radial-gradient(circle_at_50%_50%,rgba(230,184,0,0.1),transparent_50%)]" />
      </div>
    </div>
  );
}

export function LuxuryPattern({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <div className="absolute inset-0 opacity-5">
        <div className="h-full w-full bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10" />
      </div>
      <div className="absolute inset-0 opacity-10">
        <div className="h-full w-full bg-[conic-gradient(from_0deg_at_50%_50%,rgba(230,184,0,0.1),transparent_90deg,rgba(210,105,30,0.1),transparent_180deg,rgba(230,184,0,0.1),transparent_270deg)]" />
      </div>
    </div>
  );
}

// Enhanced responsive background for landing page
export function ResponsiveLandingBackground({ 
  children, 
  className,
  variant = 'tokenizin-hero'
}: { 
  children?: React.ReactNode; 
  className?: string;
  variant?: 'tokenizin-light' | 'tokenizin-dark' | 'tokenizin-hero' | 'foliage-banner' | 'foliage-overlay';
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // Enhanced responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const backgroundPath = (() => {
    // Safety check for AppConfig
    if (!AppConfig || !AppConfig.assets || !AppConfig.assets.backgrounds) {
      console.warn('AppConfig not available, using fallback background');
      return '/images/backgrounds/bg-tokenizin-dark.png';
    }

    switch (variant) {
      case 'tokenizin-light':
        return AppConfig.assets.backgrounds.tiger?.light || '/images/backgrounds/bg-tokenizin-light.png';
      case 'tokenizin-dark':
        return AppConfig.assets.backgrounds.tiger?.dark || '/images/backgrounds/bg-tokenizin-dark.png';
      case 'tokenizin-hero':
        return AppConfig.assets.backgrounds.tiger?.hero || '/images/backgrounds/bg-tokenizin-dark.png';
      case 'foliage-banner':
        return AppConfig.assets.backgrounds.foliage?.banner || '/images/backgrounds/bg-tokenizin-light.png';
      case 'foliage-overlay':
        return AppConfig.assets.backgrounds.foliage?.overlay || '/images/backgrounds/bg-tokenizin-dark.png';
      default:
        return AppConfig.assets.backgrounds.tiger?.hero || '/images/backgrounds/bg-tokenizin-dark.png';
    }
  })();

  // Advanced responsive positioning
  const getResponsiveStyles = () => {
    const { width, height } = windowSize;
    const aspectRatio = width / height;
    
    let objectPosition: string = "center";
    let scale = 1;
    
    // Ultra-wide screens (21:9 and wider)
    if (aspectRatio > 2.3) {
      objectPosition = "center top";
      scale = 1.1;
    }
    // Wide screens (16:9 to 21:9)
    else if (aspectRatio > 1.7) {
      objectPosition = "center";
      scale = 1.05;
    }
    // Standard screens (4:3 to 16:9)
    else if (aspectRatio > 1.2) {
      objectPosition = "center";
      scale = 1;
    }
    // Tall screens (3:4 and taller)
    else if (aspectRatio < 0.8) {
      objectPosition = "center top";
      scale = 1.2;
    }
    // Square-ish screens
    else {
      objectPosition = "center";
      scale = 1.1;
    }
    
    return {
      objectPosition,
      objectFit: "cover" as const,
      transform: `scale(${scale})`,
      transition: "transform 0.3s ease-out, opacity 0.5s ease-in-out"
    };
  };

  return (
    <div className={cn("relative overflow-hidden min-h-screen", className)}>
      {/* Background Image Container */}
      <div className="absolute inset-0">
        <Image
          src={backgroundPath}
          alt="Tokenizin Background"
          fill
          priority
          className={cn(
            "transition-all duration-500 ease-in-out",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          style={{
            ...getResponsiveStyles()
          }} 
          onLoad={() => setIsLoaded(true)}
          sizes="100vw"
        />
        
        {/* Enhanced loading placeholder with gradient */}
        {!isLoaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-secondary/20 to-accent/30 animate-pulse">
            <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent" />
          </div>
        )}
      </div>

      {/* Enhanced responsive overlay - reduced opacity to show tiger background */}
      <div className={cn(
        "absolute inset-0 transition-all duration-300 pointer-events-none",
        "bg-gradient-to-b from-background/70 via-background/60 to-background/70",
        "backdrop-blur-sm"
      )} />

      {/* Content with enhanced z-index */}
      {children && (
        <div className="relative z-20 min-h-screen">
          {children}
        </div>
      )}
    </div>
  );
}
