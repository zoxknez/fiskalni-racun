/**
 * ⚠️ MEMORY-OPTIMIZED SCROLL HOOK ⚠️
 *
 * Replaces direct usage of Framer Motion's useScroll + useTransform
 * to prevent memory leaks in E2E tests and improve performance.
 *
 * Problem:
 * - useScroll() creates scroll event listeners that accumulate during rapid navigation
 * - Each useTransform() creates a MotionValue subscription
 * - 20+ pages use these hooks = 40+ listeners per navigation cycle
 * - In E2E tests with animation loops, this caused 10GB+ RAM usage
 *
 * Solution:
 * - Disable animations in test mode (VITE_TEST_MODE)
 * - Use single scroll listener with throttling
 * - Return static values in test mode
 * - Properly cleanup on unmount
 *
 * Usage:
 * ```tsx
 * // Before:
 * const { scrollY } = useScroll()
 * const opacity = useTransform(scrollY, [0, 200], [1, 0])
 *
 * // After:
 * const opacity = useOptimizedScroll([0, 200], [1, 0])
 * ```
 */

import type { MotionValue } from 'framer-motion'
import { useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useEffect } from 'react'

const isTestMode = import.meta.env['VITE_TEST_MODE'] === 'true'

interface UseOptimizedScrollOptions {
  /**
   * Enable spring physics for smooth animations
   * @default false
   */
  enableSpring?: boolean
  /**
   * Throttle scroll events (ms)
   * @default 16 (~60fps)
   */
  throttle?: number
}

/**
 * Optimized scroll animation hook that prevents memory leaks
 *
 * @param inputRange - Scroll position range [start, end]
 * @param outputRange - Animation value range [start, end]
 * @param options - Configuration options
 * @returns Animated motion value (static in test mode)
 */
export function useOptimizedScroll(
  inputRange: [number, number],
  outputRange: [number, number],
  options: UseOptimizedScrollOptions = {}
): MotionValue<number> {
  const { enableSpring = false, throttle = 16 } = options

  const scrollY = useMotionValue(0)
  const transformed = useTransform(scrollY, inputRange, outputRange)
  // Always call useSpring to maintain hook order, but only use result if enableSpring is true
  const springTransformed = useSpring(transformed)
  const animated = enableSpring ? springTransformed : transformed

  // ⚠️ TEST MODE: Return static MotionValue to prevent memory leaks
  const staticValue = useMotionValue(outputRange[0])

  useEffect(() => {
    // In test mode, don't set up scroll listeners at all
    if (isTestMode) {
      return
    }

    let ticking = false
    const rafRef: { current: number | null } = { current: null }
    let lastUpdate = 0

    const updateScrollPosition = () => {
      const now = Date.now()
      if (now - lastUpdate < throttle) {
        ticking = false
        return
      }

      scrollY.set(window.scrollY)
      lastUpdate = now
      ticking = false
    }

    const handleScroll = () => {
      if (!ticking) {
        ticking = true
        rafRef.current = requestAnimationFrame(updateScrollPosition)
      }
    }

    // ⚠️ CRITICAL: Passive listener for better performance
    window.addEventListener('scroll', handleScroll, { passive: true })

    // Set initial value
    scrollY.set(window.scrollY)

    // ⚠️ CLEANUP: Remove listener and cancel RAF on unmount
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
    // Note: isTestMode is a constant from import.meta.env, not a reactive dependency
  }, [scrollY, throttle])

  // Return static value in test mode, animated value in production
  return isTestMode ? staticValue : animated
}

/**
 * Hook for pages that need multiple scroll animations
 * Returns all common scroll-based animations at once
 *
 * @example
 * ```tsx
 * const { heroOpacity, heroScale, heroY } = useScrollAnimations()
 * ```
 */
export function useScrollAnimations() {
  const heroOpacity = useOptimizedScroll([0, 200], [1, 0])
  const heroScale = useOptimizedScroll([0, 200], [1, 0.95])
  const heroY = useOptimizedScroll([0, 200], [0, -50])

  return { heroOpacity, heroScale, heroY }
}
