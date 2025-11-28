/**
 * Swipeable Card Component
 *
 * Enables swipe gestures for mobile UX:
 * - Swipe left: Delete action (red background)
 * - Swipe right: Edit action (blue background)
 * - Haptic feedback on actions
 *
 * @module components/common/SwipeableCard
 */

import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { cn } from '@lib/utils'
import { motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { Edit, Trash2 } from 'lucide-react'
import { memo, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface SwipeableCardProps {
  /** Card content */
  children: ReactNode
  /** Called when swipe left (delete) is triggered */
  onDelete?: () => void | Promise<void>
  /** Called when swipe right (edit) is triggered */
  onEdit?: () => void | Promise<void>
  /** Disable swipe functionality */
  disabled?: boolean
  /** Custom className */
  className?: string
  /** Threshold distance for action (px) */
  swipeThreshold?: number
}

export function SwipeableCard({
  children,
  onDelete,
  onEdit,
  disabled = false,
  className,
  swipeThreshold = 100,
}: SwipeableCardProps) {
  const prefersReducedMotion = useReducedMotion()
  const x = useMotionValue(0)
  const [isDragging, setIsDragging] = useState(false)
  const actionTriggeredRef = useRef(false)

  // Transform x position to opacity for action indicators
  const deleteOpacity = useTransform(x, [-swipeThreshold, 0], [1, 0])
  const editOpacity = useTransform(x, [0, swipeThreshold], [0, 1])

  // Transform for scale animation - respect reduced motion
  const scale = useTransform(
    x,
    [-swipeThreshold, 0, swipeThreshold],
    prefersReducedMotion ? [1, 1, 1] : [0.95, 1, 0.95]
  )

  // Haptic feedback helper
  const triggerHaptic = useCallback(async (style: ImpactStyle = ImpactStyle.Medium) => {
    try {
      await Haptics.impact({ style })
    } catch {
      // Haptics not available (web)
    }
  }, [])

  // Drag start handler
  const handleDragStart = useCallback(() => {
    setIsDragging(true)
    triggerHaptic(ImpactStyle.Light)
  }, [triggerHaptic])

  // Handle drag end
  const handleDragEnd = useCallback(async () => {
    setIsDragging(false)
    const currentX = x.get()

    // Swipe left - Delete
    if (currentX < -swipeThreshold && onDelete && !actionTriggeredRef.current) {
      actionTriggeredRef.current = true
      await triggerHaptic(ImpactStyle.Heavy)
      await onDelete()
      x.set(0)
      setTimeout(() => {
        actionTriggeredRef.current = false
      }, 300)
      return
    }

    // Swipe right - Edit
    if (currentX > swipeThreshold && onEdit && !actionTriggeredRef.current) {
      actionTriggeredRef.current = true
      await triggerHaptic(ImpactStyle.Medium)
      await onEdit()
      x.set(0)
      setTimeout(() => {
        actionTriggeredRef.current = false
      }, 300)
      return
    }

    // Reset position if threshold not met
    x.set(0)
  }, [x, swipeThreshold, onDelete, onEdit, triggerHaptic])

  // Reset when disabled
  useEffect(() => {
    if (disabled) {
      x.set(0)
    }
  }, [disabled, x])

  // Memoized drag constraints
  const dragConstraints = useMemo(
    () => ({
      left: onDelete ? -swipeThreshold * 1.2 : 0,
      right: onEdit ? swipeThreshold * 1.2 : 0,
    }),
    [onDelete, onEdit, swipeThreshold]
  )

  if (disabled || prefersReducedMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Delete Action Background (Left) */}
      {onDelete && (
        <motion.div
          style={{ opacity: deleteOpacity }}
          className="absolute inset-y-0 left-0 flex items-center justify-start bg-red-500 px-6"
        >
          <Trash2 className="h-6 w-6 text-white" />
        </motion.div>
      )}

      {/* Edit Action Background (Right) */}
      {onEdit && (
        <motion.div
          style={{ opacity: editOpacity }}
          className="absolute inset-y-0 right-0 flex items-center justify-end bg-blue-500 px-6"
        >
          <Edit className="h-6 w-6 text-white" />
        </motion.div>
      )}

      {/* Swipeable Content */}
      <motion.div
        drag="x"
        dragConstraints={dragConstraints}
        dragElastic={0.2}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        style={{ x, scale }}
        className={cn(
          'relative bg-white transition-shadow dark:bg-dark-800',
          isDragging && 'shadow-lg'
        )}
      >
        {children}
      </motion.div>
    </div>
  )
}

export default memo(SwipeableCard)
