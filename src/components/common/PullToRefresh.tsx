/**
 * Pull to Refresh Component
 *
 * Native-like pull-to-refresh for mobile devices
 * Works on touch devices with smooth animations
 *
 * @module components/common/PullToRefresh
 */

import { Haptics, ImpactStyle } from '@capacitor/haptics'
import clsx from 'clsx'
import { motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { Loader2, RefreshCw } from 'lucide-react'
import { memo, type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { logger } from '@/lib/logger'

interface PullToRefreshProps {
  /** Content to wrap */
  children: ReactNode
  /** Refresh callback */
  onRefresh: () => Promise<void>
  /** Threshold distance to trigger refresh (px) */
  threshold?: number
  /** Disabled state */
  disabled?: boolean
}

export function PullToRefresh({
  children,
  onRefresh,
  threshold = 80,
  disabled = false,
}: PullToRefreshProps) {
  const prefersReducedMotion = useReducedMotion()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isPulling, setIsPulling] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef(0)
  const pullDistance = useMotionValue(0)

  // Transform pull distance to rotation for spinner - respect reduced motion
  const rotation = useTransform(
    pullDistance,
    [0, threshold],
    prefersReducedMotion ? [0, 0] : [0, 360]
  )
  const opacity = useTransform(pullDistance, [0, threshold], [0, 1])
  const scale = useTransform(pullDistance, [0, threshold], prefersReducedMotion ? [1, 1] : [0.5, 1])

  const triggerHaptic = useCallback(async (style: ImpactStyle = ImpactStyle.Light) => {
    try {
      await Haptics.impact({ style })
    } catch {
      // Haptics not available
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container || disabled) return

    let touchStartY = 0
    let canPull = false

    const handleTouchStart = (e: TouchEvent) => {
      // Only allow pull if scrolled to top
      if (container.scrollTop === 0) {
        touchStartY = e.touches[0]?.clientY ?? 0
        startYRef.current = touchStartY
        canPull = true
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!canPull || isRefreshing) return

      const currentY = e.touches[0]?.clientY ?? 0
      const diff = currentY - touchStartY

      // Only track downward pulls when at top
      if (diff > 0 && container.scrollTop === 0) {
        e.preventDefault()

        // Apply resistance (slower pull at higher distances)
        const resistance = 0.5
        const adjustedDiff = diff * resistance

        pullDistance.set(Math.min(adjustedDiff, threshold * 1.5))
        setIsPulling(true)

        // Haptic feedback at threshold
        if (adjustedDiff >= threshold && !isPulling) {
          triggerHaptic(ImpactStyle.Medium)
        }
      }
    }

    const handleTouchEnd = async () => {
      if (!canPull) return

      const distance = pullDistance.get()

      if (distance >= threshold && !isRefreshing) {
        // Trigger refresh
        setIsRefreshing(true)
        triggerHaptic(ImpactStyle.Heavy)

        try {
          await onRefresh()
        } catch (error) {
          logger.error('Refresh failed:', error)
        } finally {
          setIsRefreshing(false)
          pullDistance.set(0)
          setIsPulling(false)
        }
      } else {
        // Reset
        pullDistance.set(0)
        setIsPulling(false)
      }

      canPull = false
    }

    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)
    container.addEventListener('touchcancel', handleTouchEnd)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
      container.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [disabled, isRefreshing, onRefresh, pullDistance, threshold, isPulling, triggerHaptic])

  return (
    <div ref={containerRef} className="relative h-full overflow-y-auto">
      {/* Pull Indicator */}
      <motion.div
        style={{
          opacity,
          scale,
          translateY: pullDistance,
        }}
        className="pointer-events-none absolute top-0 right-0 left-0 z-10 flex justify-center pt-4"
      >
        {isRefreshing ? (
          <Loader2
            className={clsx('h-6 w-6 text-primary-600', !prefersReducedMotion && 'animate-spin')}
          />
        ) : (
          <motion.div style={{ rotate: rotation }}>
            <RefreshCw className="h-6 w-6 text-primary-600" />
          </motion.div>
        )}
      </motion.div>

      {/* Content */}
      <motion.div style={{ paddingTop: isRefreshing ? threshold : pullDistance }}>
        {children}
      </motion.div>
    </div>
  )
}

export default memo(PullToRefresh)
