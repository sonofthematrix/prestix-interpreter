/**
 * Mobile Gesture Support Utilities
 * 
 * Provides scroll, swipe, and flip gesture support for mobile devices
 */

export interface GestureHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onFlip?: () => void
}

/**
 * Enable touch gestures for mobile devices
 */
export function enableMobileGestures(
  element: HTMLElement,
  handlers: GestureHandlers
): () => void {
  let touchStartX = 0
  let touchStartY = 0
  let touchEndX = 0
  let touchEndY = 0

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX = e.changedTouches[0].screenX
    touchStartY = e.changedTouches[0].screenY
  }

  const handleTouchEnd = (e: TouchEvent) => {
    touchEndX = e.changedTouches[0].screenX
    touchEndY = e.changedTouches[0].screenY
    handleSwipe()
  }

  const handleSwipe = () => {
    const deltaX = touchEndX - touchStartX
    const deltaY = touchEndY - touchStartY
    const minSwipeDistance = 50 // Minimum distance for a swipe

    // Determine swipe direction
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0) {
          handlers.onSwipeRight?.()
        } else {
          handlers.onSwipeLeft?.()
        }
      }
    } else {
      // Vertical swipe
      if (Math.abs(deltaY) > minSwipeDistance) {
        if (deltaY > 0) {
          handlers.onSwipeDown?.()
        } else {
          handlers.onSwipeUp?.()
        }
      }
    }
  }

  // Enable smooth scrolling
  element.style.overflowY = 'auto';
  (element.style as any).webkitOverflowScrolling = 'touch';
  element.style.scrollBehavior = 'smooth';

  // Add touch event listeners
  element.addEventListener('touchstart', handleTouchStart, { passive: true })
  element.addEventListener('touchend', handleTouchEnd, { passive: true })

  // Handle device orientation change (flip)
  const handleOrientationChange = () => {
    handlers.onFlip?.()
  }
  window.addEventListener('orientationchange', handleOrientationChange)

  // Cleanup function
  return () => {
    element.removeEventListener('touchstart', handleTouchStart)
    element.removeEventListener('touchend', handleTouchEnd)
    window.removeEventListener('orientationchange', handleOrientationChange)
  }
}

/**
 * Enable pull-to-refresh gesture
 */
export function enablePullToRefresh(
  element: HTMLElement,
  onRefresh: () => void | Promise<void>
): () => void {
  let startY = 0
  let isPulling = false
  let pullDistance = 0
  const threshold = 80 // Distance to trigger refresh

  const handleTouchStart = (e: TouchEvent) => {
    if (element.scrollTop === 0) {
      startY = e.touches[0].clientY
      isPulling = true
    }
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (!isPulling) return

    const currentY = e.touches[0].clientY
    pullDistance = currentY - startY

    if (pullDistance > 0 && pullDistance < threshold * 2) {
      // Visual feedback could be added here
      e.preventDefault()
    }
  }

  const handleTouchEnd = async () => {
    if (!isPulling) return

    if (pullDistance > threshold) {
      await onRefresh()
    }

    isPulling = false
    pullDistance = 0
  }

  element.addEventListener('touchstart', handleTouchStart, { passive: false })
  element.addEventListener('touchmove', handleTouchMove, { passive: false })
  element.addEventListener('touchend', handleTouchEnd, { passive: true })

  return () => {
    element.removeEventListener('touchstart', handleTouchStart)
    element.removeEventListener('touchmove', handleTouchMove)
    element.removeEventListener('touchend', handleTouchEnd)
  }
}

/**
 * Check if device supports gestures
 */
export function isGestureSupported(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

