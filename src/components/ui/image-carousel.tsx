/**
 * PRESTIX.VIP Image Carousel Component
 * 
 * Multi-image carousel with navigation, pagination, and lightbox support.
 * Uses Swiper for smooth touch/mouse interactions.
 * 
 * @see ui-ux-standards.mdc
 */

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import Image from 'next/image';

/** Minimum width per image when showing all in a row (responsive mode) */
const MIN_IMAGE_WIDTH = 140;

// =============================================================================
// IMAGE CAROUSEL COMPONENT
// =============================================================================

export interface ImageCarouselProps {
  images: string[];
  alt: string;
  className?: string;
  aspectRatio?: 'video' | 'square' | 'portrait';
  showIndicators?: boolean;
  showNavigation?: boolean;
  showLightboxButton?: boolean;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  /** When true: show all images in a row when they fit; use carousel with arrows when they don't */
  responsiveMode?: boolean;
  onLightboxOpen?: (index: number) => void;
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  alt,
  className = '',
  aspectRatio = 'video',
  showIndicators = true,
  showNavigation = true,
  showLightboxButton = true,
  autoPlay = false,
  autoPlayInterval = 5000,
  responsiveMode = false,
  onLightboxOpen,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState<Record<number, boolean>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const imagesLengthRef = useRef(images.length);
  imagesLengthRef.current = images.length;
  const [allImagesFit, setAllImagesFit] = useState(true);

  // Responsive mode: mount-time ResizeObserver setup/cleanup only (Redux SSoT compliant)
  useEffect(() => {
    if (!responsiveMode || !containerRef.current || images.length <= 1) return;
    const el = containerRef.current;
    const check = () => {
      const w = el.offsetWidth;
      const len = imagesLengthRef.current;
      if (len <= 1) return;
      setAllImagesFit(w >= len * MIN_IMAGE_WIDTH);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // No images fallback
  if (!images || images.length === 0) {
    return (
      <div className={`relative bg-gray-100 dark:bg-gray-900 flex items-center justify-center ${className}`}>
        <div className="text-center text-muted-foreground dark:text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm">No images available</p>
        </div>
      </div>
    );
  }

  // Single image - no carousel needed
  if (images.length === 1) {
    return (
      <div className={`relative ${className}`}>
        <Image
          src={images[0]}
          alt={alt}
          width={100}
          height={100}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
          priority={true}
        />
        {showLightboxButton && onLightboxOpen && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLightboxOpen(0);
            }}
            className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white dark:text-white rounded-lg transition-all duration-200 opacity-0 hover:opacity-100 focus:opacity-100"
            aria-label="View full screen"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
        )}
      </div>
    );
  }

  // Navigation handlers
  const goToPrevious = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const goToNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  const goToIndex = useCallback((index: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex(index);
  }, []);

  // Responsive mode: show all images when they fit; else carousel
  const showAllImages = responsiveMode && allImagesFit;
  const hasCustomLayout = className.includes('absolute') || className.includes('inset-0');
  const carouselAspectClass = hasCustomLayout ? '' : {
    video: 'aspect-video',
    square: 'aspect-square',
    portrait: 'aspect-[3/4]',
  }[aspectRatio ?? 'video'];

  // Carousel inner content (reused in unified return)
  const carouselContent = (
    <>
      <div className="relative w-full h-full">
        {images.map((image, index) => (
          <div
            key={`${image}-${index}`}
            className={`absolute inset-0 transition-opacity duration-500 ${
              index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <Image
              src={image}
              alt={`${alt} - Image ${index + 1}`}
              width={100}
              height={100}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className={`object-cover transition-opacity duration-300 ${
                imageLoaded[index] ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded((prev) => ({ ...prev, [index]: true }))}
              priority={index === 0}
            />
          </div>
        ))}
      </div>
      {showNavigation && images.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className={`absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white dark:text-white rounded-full transition-all duration-200 ${
              isHovered ? 'opacity-100' : 'opacity-80'
            }`}
            aria-label="Previous image"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToNext}
            className={`absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white dark:text-white rounded-full transition-all duration-200 ${
              isHovered ? 'opacity-100' : 'opacity-80'
            }`}
            aria-label="Next image"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}
      {showLightboxButton && onLightboxOpen && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLightboxOpen(currentIndex);
          }}
          className={`absolute top-4 right-4 z-20 p-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white dark:text-white rounded-lg transition-all duration-200 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
          aria-label="View full screen"
        >
          <Maximize2 className="w-5 h-5" />
        </button>
      )}
      {showIndicators && images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={(e) => goToIndex(index, e)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                index === currentIndex
                  ? 'bg-white dark:bg-white w-8'
                  : 'bg-white/50 dark:bg-white/50 hover:bg-white/75 dark:hover:bg-white/75'
              }`}
              aria-label={`Go to image ${index + 1}`}
              aria-current={index === currentIndex ? 'true' : 'false'}
            />
          ))}
        </div>
      )}
      {images.length > 1 && (
        <div className="absolute top-4 left-4 z-20 px-3 py-1.5 bg-black/50 backdrop-blur-sm text-white dark:text-white text-xs font-medium rounded-full">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </>
  );

  // Auto-play effect
  React.useEffect(() => {
    if (!autoPlay || isHovered) return;

    const interval = setInterval(() => {
      goToNext();
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, isHovered, goToNext]);

  const handleImageAreaClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button')) return;
      onLightboxOpen?.(currentIndex);
    },
    [currentIndex, onLightboxOpen]
  );

  // Single return with stable wrapper (ref) for ResizeObserver; grid or carousel inside
  return (
    <div
      ref={responsiveMode ? containerRef : undefined}
      className={`relative w-full min-w-0 ${className}`}
    >
      {showAllImages ? (
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${images.length}, 1fr)` }}
        >
          {images.map((image, index) => (
            <div
              key={`${image}-${index}`}
              className={`relative ${carouselAspectClass} overflow-hidden rounded-lg ${onLightboxOpen ? 'cursor-pointer' : ''}`}
              onClick={
                onLightboxOpen
                  ? (e) => {
                      e.stopPropagation();
                      onLightboxOpen(index);
                    }
                  : undefined
              }
              role={onLightboxOpen ? 'button' : undefined}
              tabIndex={onLightboxOpen ? 0 : undefined}
              onKeyDown={
                onLightboxOpen
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onLightboxOpen(index);
                      }
                    }
                  : undefined
              }
              aria-label={onLightboxOpen ? `View image ${index + 1} in lightbox` : undefined}
            >
              <Image
                src={image}
                alt={`${alt} - Image ${index + 1}`}
                width={100}
                height={100}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover w-full h-full"
                priority={index === 0}
              />
            </div>
          ))}
        </div>
      ) : (
        <div
          className={`relative ${carouselAspectClass} overflow-hidden ${onLightboxOpen ? 'cursor-pointer' : ''}`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={onLightboxOpen ? handleImageAreaClick : undefined}
          role={onLightboxOpen ? 'button' : undefined}
          tabIndex={onLightboxOpen ? 0 : undefined}
          onKeyDown={
            onLightboxOpen
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onLightboxOpen(currentIndex);
                  }
                }
              : undefined
          }
          aria-label={onLightboxOpen ? 'View images in lightbox' : undefined}
        >
          {carouselContent}
        </div>
      )}
    </div>
  );
};

ImageCarousel.displayName = 'ImageCarousel';
