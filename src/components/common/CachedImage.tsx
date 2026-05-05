/**
 * Cached Image Component
 * Optimized image loading with caching and lazy loading
 */

'use client';

import { useCachedImage } from '../../lib/image-cache'; 
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';

interface CachedImageProps {
  src: string | null | undefined;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fallback?: React.ReactNode;
  priority?: boolean;
  quality?: number;
  fill?: boolean;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: (error: string) => void;
}

export function CachedImage({
  src,
  alt,
  width,
  height,
  className,
  fallback,
  priority = false,
  quality = 75,
  fill = false,
  objectFit = 'cover',
  loading = 'lazy',
  onLoad,
  onError,
}: CachedImageProps) {
  const { imageUrl, loading: imageLoading, error } = useCachedImage(src);
  const [imageError, setImageError] = useState(false);
  
  useEffect(() => {
    if (error) {
      setImageError(true);
      onError?.(error);
    }
  }, [error, onError]);
  
  useEffect(() => {
    if (imageUrl && !imageLoading) {
      onLoad?.();
    }
  }, [imageUrl, imageLoading, onLoad]);
  
  // Show loading state
  if (imageLoading) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted dark:bg-gray-900',
          className
        )}
        style={
          !fill && width && height
            ? { width: `${width}px`, height: `${height}px` }
            : undefined
        }
      >
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground dark:text-gray-600" />
      </div>
    );
  }
  
  // Show fallback if error or no image URL
  if (imageError || !imageUrl) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted dark:bg-gray-900 text-muted-foreground dark:text-gray-600',
          className
        )}
        style={
          !fill && width && height
            ? { width: `${width}px`, height: `${height}px` }
            : undefined
        }
      >
        <span className="text-sm">No image</span>
      </div>
    );
  }
  
  // Render cached image
  if (fill) {
    return (
      <div className={cn('relative', className)}>
        <Image
          src={imageUrl}
          alt={alt}
          fill
          className={`object-${objectFit}`}
          quality={quality}
          priority={priority}
          loading={loading}
        />
      </div>
    );
  }
  
  return (
    <Image
      src={imageUrl}
      alt={alt}
      width={width}
      height={height}
      className={cn(`object-${objectFit}`, className)}
      quality={quality}
      priority={priority}
      loading={loading}
    />
  );
}

/**
 * Avatar component with caching
 */
interface CachedAvatarProps {
  src: string | null | undefined;
  alt: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallbackText?: string;
}

export function CachedAvatar({
  src,
  alt,
  size = 'md',
  className,
  fallbackText,
}: CachedAvatarProps) {
  // Updated sizes for better header/sidebar compatibility
  const sizes = {
    sm: 32,  // w-8 h-8 - for header
    md: 96,  // w-24 h-24 - for profile pages
    lg: 128, // w-32 h-32 - for large displays
    xl: 160, // w-40 h-40 - for extra large displays
  };
  
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-40 h-40',
  };
  
  const dimension = sizes[size];
  
  // Default avatar: Tokenizin playlogo.png
  const DEFAULT_AVATAR = '/playlogo.png';
  
  // Use default avatar if no custom avatar is provided
  const avatarSrc = src || DEFAULT_AVATAR;
  
  return (
    <CachedImage
      src={avatarSrc}
      alt={alt}
      width={dimension}
      height={dimension}
      className={cn(
        'rounded-full',
        sizeClasses[size],
        className
      )}
      objectFit="cover"
      fallback={
        <div
          className={cn(
            'rounded-full bg-primary/10 dark:bg-blue-500/20 flex items-center justify-center overflow-hidden',
            sizeClasses[size],
            className
          )}
        >
          {/* Fallback to default logo if custom avatar fails to load */}
          <img
            src={DEFAULT_AVATAR}
            alt="Tokenizin logo"
            className={cn('object-cover', sizeClasses[size])}
            onError={(e) => {
              // If default logo also fails, show initials
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const fallbackDiv = target.parentElement;
              if (fallbackDiv) {
                fallbackDiv.innerHTML = `<span class="text-primary dark:text-blue-400 font-semibold">${fallbackText || alt.charAt(0).toUpperCase()}</span>`;
              }
            }}
          />
        </div>
      }
    />
  );
}

