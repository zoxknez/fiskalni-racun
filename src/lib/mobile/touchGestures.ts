/**
 * Touch Gestures Utilities
 *
 * Advanced touch gesture detection for mobile
 * Supports swipe, tap, long-press, pinch, etc.
 *
 * @module lib/mobile/touchGestures
 */

export type SwipeDirection = 'left' | 'right' | 'up' | 'down'

export interface SwipeEvent {
  direction: SwipeDirection
  distance: number
  duration: number
  velocity: number
}

export interface TapEvent {
  x: number
  y: number
  duration: number
}

export interface GestureHandlers {
  onSwipe?: (event: SwipeEvent) => void
  onTap?: (event: TapEvent) => void
  onLongPress?: (event: TapEvent) => void
  onDoubleTap?: (event: TapEvent) => void
}

interface TouchPoint {
  x: number
  y: number
  time: number
}

/**
 * Create touch gesture detector
 */
export function createGestureDetector(
  element: HTMLElement,
  handlers: GestureHandlers,
  options: {
    swipeThreshold?: number
    longPressDelay?: number
    doubleTapDelay?: number
  } = {}
) {
  const { swipeThreshold = 50, longPressDelay = 500, doubleTapDelay = 300 } = options

  let touchStart: TouchPoint | null = null
  let touchEnd: TouchPoint | null = null
  let longPressTimer: ReturnType<typeof setTimeout> | null = null
  let lastTap: TouchPoint | null = null

  const getTouchPoint = (touch: Touch): TouchPoint => ({
    x: touch.clientX,
    y: touch.clientY,
    time: Date.now(),
  })

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0]
    if (!touch) return

    touchStart = getTouchPoint(touch)
    touchEnd = null

    // Long press detection
    if (handlers.onLongPress) {
      longPressTimer = setTimeout(() => {
        if (touchStart && !touchEnd) {
          const tapEvent: TapEvent = {
            x: touchStart.x,
            y: touchStart.y,
            duration: Date.now() - touchStart.time,
          }
          handlers.onLongPress?.(tapEvent)
        }
      }, longPressDelay)
    }
  }

  const handleTouchMove = (e: TouchEvent) => {
    const touch = e.touches[0]
    if (!touch || !touchStart) return

    touchEnd = getTouchPoint(touch)

    // Cancel long press if moved
    const distance = Math.hypot(touchEnd.x - touchStart.x, touchEnd.y - touchStart.y)
    if (distance > 10 && longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
  }

  const handleTouchEnd = (e: TouchEvent) => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }

    if (!touchStart) return

    // Use last touch position before release
    const touch = e.changedTouches[0]
    if (touch) {
      touchEnd = getTouchPoint(touch)
    }

    if (!touchEnd) return

    const deltaX = touchEnd.x - touchStart.x
    const deltaY = touchEnd.y - touchStart.y
    const distance = Math.hypot(deltaX, deltaY)
    const duration = touchEnd.time - touchStart.time
    const velocity = distance / duration

    // Detect swipe
    if (distance > swipeThreshold && handlers.onSwipe) {
      const absDeltaX = Math.abs(deltaX)
      const absDeltaY = Math.abs(deltaY)

      let direction: SwipeDirection

      if (absDeltaX > absDeltaY) {
        direction = deltaX > 0 ? 'right' : 'left'
      } else {
        direction = deltaY > 0 ? 'down' : 'up'
      }

      handlers.onSwipe({
        direction,
        distance,
        duration,
        velocity,
      })
    }
    // Detect tap
    else if (distance < 10 && duration < 200) {
      // Double tap detection
      if (lastTap && handlers.onDoubleTap) {
        const timeSinceLastTap = touchEnd.time - lastTap.time
        const distanceFromLastTap = Math.hypot(touchEnd.x - lastTap.x, touchEnd.y - lastTap.y)

        if (timeSinceLastTap < doubleTapDelay && distanceFromLastTap < 20) {
          const doubleTapEvent: TapEvent = {
            x: touchEnd.x,
            y: touchEnd.y,
            duration: touchEnd.time - touchStart.time,
          }
          handlers.onDoubleTap(doubleTapEvent)
          lastTap = null
          return
        }
      }

      // Single tap
      if (handlers.onTap) {
        const tapEvent: TapEvent = {
          x: touchEnd.x,
          y: touchEnd.y,
          duration: touchEnd.time - touchStart.time,
        }
        handlers.onTap(tapEvent)
      }

      lastTap = touchEnd
    }

    touchStart = null
    touchEnd = null
  }

  element.addEventListener('touchstart', handleTouchStart, { passive: true })
  element.addEventListener('touchmove', handleTouchMove, { passive: true })
  element.addEventListener('touchend', handleTouchEnd)

  // Cleanup function
  return () => {
    element.removeEventListener('touchstart', handleTouchStart)
    element.removeEventListener('touchmove', handleTouchMove)
    element.removeEventListener('touchend', handleTouchEnd)

    if (longPressTimer) {
      clearTimeout(longPressTimer)
    }
  }
}
