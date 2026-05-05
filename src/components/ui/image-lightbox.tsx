/**
 * PRESTIX.VIP Image Lightbox Component
 *
 * Full-screen image viewer using Radix Dialog. Enlarged view for detail.
 * Navigation, zoom, keyboard controls. No backdrop-blur to prevent flickering.
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface ImageLightboxProps {
  images: string[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  alt?: string;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
  alt = 'Event image',
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    setZoom(1);
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    setZoom(1);
  }, [images.length]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleDownload = useCallback(async () => {
    const image = images[currentIndex];
    try {
      const response = await fetch(image);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prestix-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  }, [images, currentIndex]);

  const handlersRef = useRef({
    goToPrevious,
    goToNext,
    handleZoomIn,
    handleZoomOut,
    onClose,
  });
  handlersRef.current = {
    goToPrevious,
    goToNext,
    handleZoomIn,
    handleZoomOut,
    onClose,
  };

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setZoom(1);
    }
  }, [isOpen, initialIndex]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const { goToPrevious, goToNext, handleZoomIn, handleZoomOut, onClose } =
        handlersRef.current;
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case '0':
          setZoom(1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          'max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] p-0 gap-0 overflow-hidden',
          'border-0 bg-black/98',
          '[&>button]:hidden',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
        )}
        onPointerDownOutside={onClose}
        onEscapeKeyDown={onClose}
      >
        <DialogTitle className="sr-only">
          Image {currentIndex + 1} of {images.length}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {alt} - Use arrow keys to navigate, Escape to close
        </DialogDescription>

        <div className="relative flex flex-col h-full w-full">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between px-6 py-4 bg-black/60">
            <div className="text-white text-sm font-medium">
              {currentIndex + 1} / {images.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="p-2 text-white hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Zoom out"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <span className="text-white text-sm font-medium min-w-[3rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="p-2 text-white hover:bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Zoom in"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                onClick={handleDownload}
                className="p-2 text-white hover:bg-white/10 rounded-lg"
                aria-label="Download image"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-white hover:bg-white/10 rounded-lg"
                aria-label="Close lightbox"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Image area - enlarged for detail */}
          <div className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden">
            {images.length > 1 && (
              <>
                <button
                  onClick={goToPrevious}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={goToNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            <div
              className="relative w-full h-full flex items-center justify-center"
              style={{ transform: `scale(${zoom})` }}
            >
              {images.map((image, index) => (
                <div
                  key={`${image}-${index}`}
                  className={cn(
                    'absolute inset-0 flex items-center justify-center',
                    index === currentIndex
                      ? 'opacity-100 z-10'
                      : 'opacity-0 z-0 pointer-events-none'
                  )}
                >
                  <Image
                    src={image}
                    alt={`${alt} - Image ${index + 1}`}
                    width={1200}
                    height={900}
                    sizes="95vw"
                    className="max-w-full max-h-full w-auto h-auto object-contain"
                    priority={index === currentIndex}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="shrink-0 flex items-center justify-center gap-2 p-4 bg-black/60 overflow-x-auto">
              {images.map((image, index) => (
                <button
                  key={`thumb-${index}`}
                  onClick={() => {
                    setCurrentIndex(index);
                    setZoom(1);
                  }}
                  className={cn(
                    'relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2',
                    index === currentIndex
                      ? 'border-orange-500 ring-2 ring-orange-500/50'
                      : 'border-white/30 hover:border-white/50'
                  )}
                  aria-label={`Go to image ${index + 1}`}
                  aria-current={index === currentIndex ? 'true' : 'false'}
                >
                  <Image
                    src={image}
                    alt={`Thumbnail ${index + 1}`}
                    width={64}
                    height={64}
                    sizes="64px"
                    className="object-cover w-full h-full"
                  />
                </button>
              ))}
            </div>
          )}

          <div className="absolute bottom-4 left-4 text-white/50 text-xs">
            ← → Navigate | + - Zoom | Esc Close
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

ImageLightbox.displayName = 'ImageLightbox';
