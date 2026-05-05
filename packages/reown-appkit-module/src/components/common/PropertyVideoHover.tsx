'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PropertyVideoHoverProps {
  property: {
    id: string;
    videoUrl?: string | null;
    imageUrl?: string;
    images?: Array<{ id: string; url: string }>;
    title?: string;
    name?: string;
  };
  propertyIndex?: number;
  className?: string;
  autoPlay?: boolean;
  showControls?: boolean;
  fallbackVideo?: string;
}

// Helper function to get video URL with multiple strategies
function getVideoUrl(property: any, propertyIndex?: number, fallbackVideo?: string): string | null {
  // Strategy 1: Use property's videoUrl if available
  if (property.videoUrl) {
    return property.videoUrl;
  }

  // Strategy 2: Extract from imageUrl pattern (e.g., /images/v1p1.png -> 1)
  const imageMatch = property.imageUrl?.match(/v(\d+)p/);
  if (imageMatch) {
    const index = parseInt(imageMatch[1]);
    if (index >= 1 && index <= 5) {
      return `/videos/marketplace/prop${index}.mp4`;
    }
  }

  // Strategy 3: Use provided propertyIndex
  if (propertyIndex && propertyIndex >= 1 && propertyIndex <= 5) {
    return `/videos/marketplace/prop${propertyIndex}.mp4`;
  }

  // Strategy 4: Extract from property ID patterns
  const propertyMappings: Record<string, number> = {
    'beachfront-villa-paradise': 1,
    'luxury-beachfront-villa': 1,
    'mountain-resort-estate': 2,
    'urban-penthouse-suite': 3,
    'rainforest-eco-retreat': 4,
    'mediterranean-coastal-villa': 5,
    'mediterranean-sea-yacht': 5,
  };

  for (const [key, index] of Object.entries(propertyMappings)) {
    if (property.id?.toLowerCase().includes(key) || property.title?.toLowerCase().includes(key.replace(/-/g, ' '))) {
      return `/videos/marketplace/prop${index}.mp4`;
    }
  }

  // Strategy 5: Try to extract numeric suffix from property ID
  const numericMatch = property.id?.match(/(\d+)$/);
  if (numericMatch) {
    const index = parseInt(numericMatch[1]);
    if (index >= 1 && index <= 5) {
      return `/videos/marketplace/prop${index}.mp4`;
    }
  }

  // Strategy 6: Use fallback video if provided
  if (fallbackVideo) {
    return fallbackVideo;
  }

  return null;
}

// Helper function to check if URL is a YouTube video
function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

// Helper function to get YouTube embed URL
function getYouTubeEmbedUrl(url: string): string {
  const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
  return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}` : url;
}

export function PropertyVideoHover({
  property,
  propertyIndex,
  className,
  autoPlay = true,
  showControls = false,
  fallbackVideo = '/videos/key-property.mp4'
}: PropertyVideoHoverProps) {
  const [isHovering, setIsHovering] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageSlideshow, setShowImageSlideshow] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const slideshowInterval = useRef<NodeJS.Timeout | null>(null);

  // Get video URL using multiple strategies
  const videoUrl = getVideoUrl(property, propertyIndex, fallbackVideo);
  const isYouTube = videoUrl ? isYouTubeUrl(videoUrl) : false;
  const embedUrl = isYouTube && videoUrl ? getYouTubeEmbedUrl(videoUrl) : videoUrl;

  // Get images for slideshow fallback
  const images = property.images || [];
  const hasImages = images.length > 0;
  const hasVideo = !!videoUrl;

  // Handle video playback on hover
  useEffect(() => {
    if (!autoPlay || !isHovering) return;

    if (hasVideo && !isYouTube && videoRef.current) {
      const video = videoRef.current;
      
      if (isHovering && isVideoLoaded) {
        video.currentTime = 0;
        video.play()
          .then(() => setIsVideoPlaying(true))
          .catch(err => {
            console.log('Video autoplay prevented:', err);
            // Fallback to image slideshow if video fails
            if (hasImages) {
              setShowImageSlideshow(true);
            }
          });
      } else {
        video.pause();
        video.currentTime = 0;
        setIsVideoPlaying(false);
      }
    }

    // Handle image slideshow when no video or video fails
    if (isHovering && ((!hasVideo && hasImages) || showImageSlideshow)) {
      startImageSlideshow();
    } else {
      stopImageSlideshow();
    }

    return () => {
      stopImageSlideshow();
    };
  }, [isHovering, isVideoLoaded, hasVideo, hasImages, showImageSlideshow, autoPlay, isYouTube]);

  // Start image slideshow
  const startImageSlideshow = useCallback(() => {
    if (!hasImages || images.length <= 1) return;

    stopImageSlideshow(); // Clear any existing interval
    
    slideshowInterval.current = setInterval(() => {
      setCurrentImageIndex(prev => (prev + 1) % images.length);
    }, 1500); // Change image every 1.5 seconds
  }, [hasImages, images.length]);

  // Stop image slideshow
  const stopImageSlideshow = useCallback(() => {
    if (slideshowInterval.current) {
      clearInterval(slideshowInterval.current);
      slideshowInterval.current = null;
    }
    setCurrentImageIndex(0); // Reset to first image
  }, []);

  // Handle video load
  const handleVideoLoad = () => {
    setIsVideoLoaded(true);
  };

  // Handle video error
  const handleVideoError = () => {
    console.log('Video failed to load, falling back to image slideshow');
    setIsVideoLoaded(false);
    if (hasImages) {
      setShowImageSlideshow(true);
    }
  };

  // Get current display image
  const currentImage = hasImages ? images[currentImageIndex] : null;
  const displayImageUrl = currentImage?.url || property.imageUrl;

  return (
    <div
      className={cn("relative w-full h-full overflow-hidden", className)}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Main Image Display */}
      {displayImageUrl && (
        <Image
          src={displayImageUrl}
          alt={property.title || property.name || 'Property'}
          fill
          className={cn(
            "object-cover transition-opacity duration-300",
            isHovering && (hasVideo || showImageSlideshow) ? "opacity-80" : "opacity-100"
          )}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      )}

      {/* Video Overlay - Local MP4 */}
      {hasVideo && !isYouTube && (
        <video
          ref={videoRef}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
            isHovering && isVideoLoaded && !showImageSlideshow ? "opacity-100" : "opacity-0"
          )}
          muted
          loop
          playsInline
          preload="metadata"
          onLoadedData={handleVideoLoad}
          onError={handleVideoError}
          controls={showControls}
        >
          <source src={videoUrl} type="video/mp4" />
        </video>
      )}

      {/* YouTube Video Overlay */}
      {hasVideo && isYouTube && embedUrl && (
        <iframe
          ref={iframeRef}
          className={cn(
            "absolute inset-0 w-full h-full transition-opacity duration-300",
            isHovering ? "opacity-100" : "opacity-0"
          )}
          src={isHovering ? embedUrl : ''}
          title="Property Video"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      )}

      {/* Slideshow Indicators */}
      {hasImages && images.length > 1 && (isHovering || showImageSlideshow) && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
          {images.map((_, index) => (
            <div
              key={index}
              className={cn(
                "w-2 h-2 rounded-full transition-colors duration-200",
                index === currentImageIndex
                  ? "bg-white"
                  : "bg-white/50"
              )}
            />
          ))}
        </div>
      )}

      {/* Video Play Indicator */}
      {hasVideo && !isYouTube && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity duration-300",
          isHovering && !isVideoPlaying ? "opacity-100" : "opacity-0"
        )}>
          <div className="bg-black/50 rounded-full p-3">
            <Play className="h-6 w-6 text-white" fill="white" />
          </div>
        </div>
      )}

      {/* Hover Overlay */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-t from-black/20 to-transparent transition-opacity duration-300",
        isHovering ? "opacity-100" : "opacity-0"
      )} />
    </div>
  );
}
