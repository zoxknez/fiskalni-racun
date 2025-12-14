import type { PanInfo } from 'framer-motion'
import { motion, useAnimation, useMotionValue, useTransform } from 'framer-motion'
import { Trash2 } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { useHaptic } from '@/hooks/useHaptic'

interface SwipeableItemProps {
  children: ReactNode
  onSwipeLeft?: () => void
  swipeLeftColor?: string
  swipeLeftIcon?: ReactNode
  threshold?: number
  disabled?: boolean
  className?: string
}

export function SwipeableItem({
  children,
  onSwipeLeft,
  swipeLeftColor = 'bg-red-500',
  swipeLeftIcon = <Trash2 className="h-6 w-6 text-white" />,
  threshold = 100, // px to trigger action
  disabled = false,
  className = '',
}: SwipeableItemProps) {
  const x = useMotionValue(0)
  const controls = useAnimation()
  const { impactLight, impactHeavy } = useHaptic()
  const [isPastThreshold, setIsPastThreshold] = useState(false)

  // Transform background opacity/scale based on drag distance
  const bgOpacity = useTransform(x, [-threshold, 0], [1, 0])
  const iconScale = useTransform(x, [-threshold, -threshold / 2, 0], [1.2, 0.8, 0.5])

  // Monitor threshold crossing for haptics
  useEffect(() => {
    const unsubscribe = x.on('change', (currentX) => {
      const past = currentX <= -threshold
      if (past !== isPastThreshold) {
        setIsPastThreshold(past)
        if (past) impactLight()
      }
    })
    return () => unsubscribe()
  }, [x, threshold, isPastThreshold, impactLight])

  const handleDragEnd = async (_: unknown, info: PanInfo) => {
    const offset = info.offset.x
    const velocity = info.velocity.x

    if (offset < -threshold || (offset < -50 && velocity < -500)) {
      // Swiped Left
      impactHeavy()
      if (onSwipeLeft) {
        // Animate off screen
        await controls.start({ x: -500, opacity: 0, transition: { duration: 0.2 } })
        onSwipeLeft()
        // Reset after action (optional, depends on if component unmounts)
        // controls.set({ x: 0, opacity: 1 })
      } else {
        controls.start({ x: 0 })
      }
    } else {
      // Return to start
      controls.start({ x: 0 })
    }
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Background Action Layer */}
      <div
        className={`absolute inset-0 flex items-center justify-end rounded-xl ${swipeLeftColor} px-6`}
      >
        <motion.div style={{ opacity: bgOpacity, scale: iconScale }}>{swipeLeftIcon}</motion.div>
      </div>

      {/* Foreground Content Layer */}
      <motion.div
        drag={disabled ? false : 'x'}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.5, right: 0.05 }} // Resistance on swipe right
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x, touchAction: 'pan-y' }} // Important for vertical scrolling
        className="relative z-10 bg-white dark:bg-dark-800"
      >
        {children}
      </motion.div>
    </div>
  )
}
