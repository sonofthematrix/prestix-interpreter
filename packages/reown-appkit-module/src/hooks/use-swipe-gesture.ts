'use client';

import { useCallback, useRef, useState } from 'react';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number; // Minimum distance in pixels to trigger swipe
  velocityThreshold?: number; // Minimum velocity to trigger swipe
}

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  currentX: number;
  currentY: number;
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  velocityThreshold = 0.3,
}: SwipeGestureOptions = {}) {
  const touchState = useRef<TouchState | null>(null);
  const [swipeDistance, setSwipeDistance] = useState(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchState.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      currentX: touch.clientX,
      currentY: touch.clientY,
    };
    setSwipeDistance(0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchState.current) return;

    const touch = e.touches[0];
    touchState.current.currentX = touch.clientX;
    touchState.current.currentY = touch.clientY;

    const deltaX = touch.clientX - touchState.current.startX;
    const deltaY = touch.clientY - touchState.current.startY;

    // Only track horizontal swipes (ignore vertical scrolling)
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      setSwipeDistance(deltaX);
      // Prevent default scrolling while swiping horizontally
      if (Math.abs(deltaX) > 10) {
        e.preventDefault();
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchState.current) return;

    const deltaX = touchState.current.currentX - touchState.current.startX;
    const deltaY = touchState.current.currentY - touchState.current.startY;
    const deltaTime = Date.now() - touchState.current.startTime;
    const distance = Math.abs(deltaX);
    
    // Calculate velocity (pixels per millisecond), with minimum time to avoid division by zero
    const minTime = 10; // Minimum 10ms to avoid infinite velocity
    const velocity = distance / Math.max(deltaTime, minTime);

    // Only trigger if it's primarily a horizontal swipe
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Check if swipe meets threshold and velocity requirements
      // For quick swipes, velocity check is more important; for slow swipes, distance is more important
      const meetsThreshold = distance >= threshold;
      const meetsVelocity = velocity >= velocityThreshold;
      
      // Trigger if either threshold is met (allows both quick flicks and slow deliberate swipes)
      if (meetsThreshold || (distance >= threshold * 0.7 && meetsVelocity)) {
        if (deltaX > 0 && onSwipeRight) {
          // Swipe right (previous page)
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          // Swipe left (next page)
          onSwipeLeft();
        }
      }
    }

    touchState.current = null;
    setSwipeDistance(0);
  }, [threshold, velocityThreshold, onSwipeLeft, onSwipeRight]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    swipeDistance,
  };
}

