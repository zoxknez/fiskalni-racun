import { motion, useReducedMotion } from 'framer-motion'
import { memo, useMemo } from 'react'

interface PageTransitionProps {
  children: React.ReactNode
  className?: string
}

function PageTransitionComponent({ children, className }: PageTransitionProps) {
  const prefersReducedMotion = useReducedMotion()

  const pageVariants = useMemo(
    () =>
      prefersReducedMotion
        ? {
            initial: { opacity: 1 },
            animate: { opacity: 1 },
            exit: { opacity: 0 },
          }
        : {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 0, y: -20 },
          },
    [prefersReducedMotion]
  )

  const pageTransition = useMemo(
    () =>
      prefersReducedMotion
        ? { duration: 0 }
        : { type: 'tween' as const, ease: 'anticipate' as const, duration: 0.4 },
    [prefersReducedMotion]
  )

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export const PageTransition = memo(PageTransitionComponent)

// Fade transition
function FadeTransitionComponent({ children, className }: PageTransitionProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export const FadeTransition = memo(FadeTransitionComponent)

// Slide transition
interface SlideTransitionProps extends PageTransitionProps {
  direction?: 'left' | 'right' | 'up' | 'down'
}

function SlideTransitionComponent({
  children,
  className,
  direction = 'right',
}: SlideTransitionProps) {
  const prefersReducedMotion = useReducedMotion()

  const directions = useMemo(
    () => ({
      left: { x: -100, y: 0 },
      right: { x: 100, y: 0 },
      up: { x: 0, y: -100 },
      down: { x: 0, y: 100 },
    }),
    []
  )

  const initialAnimation = useMemo(
    () => (prefersReducedMotion ? { opacity: 1 } : { opacity: 0, ...directions[direction] }),
    [prefersReducedMotion, directions, direction]
  )

  const exitAnimation = useMemo(
    () => (prefersReducedMotion ? { opacity: 0 } : { opacity: 0, ...directions[direction] }),
    [prefersReducedMotion, directions, direction]
  )

  const transition = useMemo(
    () =>
      prefersReducedMotion
        ? { duration: 0 }
        : { type: 'spring' as const, stiffness: 300, damping: 30 },
    [prefersReducedMotion]
  )

  return (
    <motion.div
      initial={initialAnimation}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={exitAnimation}
      transition={transition}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export const SlideTransition = memo(SlideTransitionComponent)

// Scale transition
function ScaleTransitionComponent({ children, className }: PageTransitionProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.9 }}
      animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
      transition={
        prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 25 }
      }
      className={className}
    >
      {children}
    </motion.div>
  )
}

export const ScaleTransition = memo(ScaleTransitionComponent)

// Stagger children animation
function StaggerContainerComponent({ children, className }: PageTransitionProps) {
  const prefersReducedMotion = useReducedMotion()

  const variants = useMemo(
    () =>
      prefersReducedMotion
        ? {
            hidden: { opacity: 1 },
            visible: { opacity: 1 },
          }
        : {
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.1 },
            },
          },
    [prefersReducedMotion]
  )

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export const StaggerContainer = memo(StaggerContainerComponent)

function StaggerItemComponent({ children, className }: PageTransitionProps) {
  const prefersReducedMotion = useReducedMotion()

  const variants = useMemo(
    () =>
      prefersReducedMotion
        ? {
            hidden: { opacity: 1 },
            visible: { opacity: 1 },
          }
        : {
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 },
          },
    [prefersReducedMotion]
  )

  return (
    <motion.div variants={variants} className={className}>
      {children}
    </motion.div>
  )
}

export const StaggerItem = memo(StaggerItemComponent)
