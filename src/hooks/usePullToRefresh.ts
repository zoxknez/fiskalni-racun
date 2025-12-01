/**
 * Pull to Refresh Hook
 *
 * Provides pull-to-refresh functionality for mobile
 * Integrates with haptic feedback
 *
 * @module hooks/usePullToRefresh
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { haptics } from '@/lib/haptics'
import { logger } from '@/lib/logger'

interface UsePullToRefreshOptions {
  /** Callback when refresh is triggered */
  onRefresh: () => Promise<void>
  /** Threshold distance to trigger refresh (px) */
  threshold?: number
  /** Disabled state */
  disabled?: boolean
  /** Element ref to attach to (defaults to window) */
  elementRef?: React.RefObject<HTMLElement>
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  disabled = false,
  elementRef,
}: UsePullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startYRef = useRef(0)
  const canPullRef = useRef(false)
  const hapticTriggeredRef = useRef(false)

  const handleRefresh = useCallback(async () => {
    if (isRefreshing || disabled) return

    setIsRefreshing(true)
    haptics.heavy()

    try {
      await onRefresh()
      haptics.success()
    } catch (error) {
      logger.error('Refresh failed:', error)
      haptics.error()
    } finally {
      setIsRefreshing(false)
      setPullDistance(0)
      hapticTriggeredRef.current = false
    }
  }, [onRefresh, isRefreshing, disabled])

  useEffect(() => {
    if (disabled) return

    const element = elementRef?.current || window

    const handleTouchStart = (e: TouchEvent) => {
      const target = elementRef?.current || document.documentElement
      if (target.scrollTop === 0) {
        startYRef.current = e.touches[0]?.clientY ?? 0
        canPullRef.current = true
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!canPullRef.current || isRefreshing) return

      const currentY = e.touches[0]?.clientY ?? 0
      const diff = currentY - startYRef.current

      if (diff > 0) {
        const target = elementRef?.current || document.documentElement
        if (target.scrollTop === 0) {
          e.preventDefault()

          // Apply resistance
          const resistance = 0.5
          const adjustedDiff = diff * resistance

          setPullDistance(Math.min(adjustedDiff, threshold * 1.5))

          // Haptic feedback at threshold
          if (adjustedDiff >= threshold && !hapticTriggeredRef.current) {
            haptics.medium()
            hapticTriggeredRef.current = true
          }
        }
      }
    }

    const handleTouchEnd = () => {
      if (!canPullRef.current) return

      if (pullDistance >= threshold && !isRefreshing) {
        handleRefresh()
      } else {
        setPullDistance(0)
        hapticTriggeredRef.current = false
      }

      canPullRef.current = false
    }

    if (element instanceof Window) {
      element.addEventListener('touchstart', handleTouchStart, { passive: true })
      element.addEventListener('touchmove', handleTouchMove, { passive: false })
      element.addEventListener('touchend', handleTouchEnd)
    } else {
      element.addEventListener('touchstart', handleTouchStart as EventListener, { passive: true })
      element.addEventListener('touchmove', handleTouchMove as EventListener, { passive: false })
      element.addEventListener('touchend', handleTouchEnd as EventListener)
    }

    return () => {
      if (element instanceof Window) {
        element.removeEventListener('touchstart', handleTouchStart)
        element.removeEventListener('touchmove', handleTouchMove)
        element.removeEventListener('touchend', handleTouchEnd)
      } else {
        element.removeEventListener('touchstart', handleTouchStart as EventListener)
        element.removeEventListener('touchmove', handleTouchMove as EventListener)
        element.removeEventListener('touchend', handleTouchEnd as EventListener)
      }
    }
  }, [elementRef, disabled, isRefreshing, pullDistance, threshold, handleRefresh])

  return {
    isRefreshing,
    pullDistance,
    isPulling: pullDistance > 0,
  }
}
