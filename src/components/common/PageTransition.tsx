import { motion } from 'framer-motion'

interface PageTransitionProps {
  children: React.ReactNode
  className?: string
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -20,
  },
}

const pageTransition = {
  type: 'tween' as const,
  ease: 'anticipate' as const,
  duration: 0.4,
}

export function PageTransition({ children, className }: PageTransitionProps) {
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

// Fade transition
export function FadeTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Slide transition
interface SlideTransitionProps extends PageTransitionProps {
  direction?: 'left' | 'right' | 'up' | 'down'
}

export function SlideTransition({
  children,
  className,
  direction = 'right',
}: SlideTransitionProps) {
  const directions = {
    left: { x: -100, y: 0 },
    right: { x: 100, y: 0 },
    up: { x: 0, y: -100 },
    down: { x: 0, y: 100 },
  }

  return (
    <motion.div
      initial={{ opacity: 0, ...directions[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, ...directions[direction] }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Scale transition
export function ScaleTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 25,
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Stagger children animation
export function StaggerContainer({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.1,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
