/**
 * useAnimationProps - Hook for consistent Framer Motion animations
 *
 * Provides standardized animation props with automatic reduced motion support.
 * Use this hook to ensure consistent animations across the application while
 * respecting user's motion preferences.
 */

import { useReducedMotion } from 'framer-motion'
import { useMemo } from 'react'

// Animation variant definitions
const ANIMATION_VARIANTS = {
  fadeUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  fadeDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  fadeLeft: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },
  fadeRight: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },
  scale: {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.95, opacity: 0 },
  },
  scaleUp: {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.8, opacity: 0 },
  },
  slideUp: {
    initial: { y: '100%', opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: '100%', opacity: 0 },
  },
  slideDown: {
    initial: { y: '-100%', opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: '-100%', opacity: 0 },
  },
} as const

export type AnimationVariant = keyof typeof ANIMATION_VARIANTS

export interface AnimationProps {
  initial?: object
  animate?: object
  exit?: object
  transition?: object
}

export interface UseAnimationPropsOptions {
  /** Animation delay in seconds */
  delay?: number
  /** Animation duration in seconds */
  duration?: number
  /** Custom transition config */
  transition?: object
}

/**
 * Returns animation props for a given variant
 * Automatically returns empty object when user prefers reduced motion
 *
 * @param variant - The animation variant to use
 * @param options - Optional configuration for the animation
 * @returns Animation props object compatible with Framer Motion
 *
 * @example
 * ```tsx
 * const animationProps = useAnimationProps('fadeUp')
 * return <motion.div {...animationProps}>Content</motion.div>
 * ```
 *
 * @example With options
 * ```tsx
 * const animationProps = useAnimationProps('scale', { delay: 0.2, duration: 0.5 })
 * return <motion.div {...animationProps}>Content</motion.div>
 * ```
 */
export function useAnimationProps(
  variant: AnimationVariant = 'fadeUp',
  options: UseAnimationPropsOptions = {}
): AnimationProps {
  const shouldReduceMotion = useReducedMotion()
  const { delay, duration, transition: customTransition } = options

  return useMemo(() => {
    if (shouldReduceMotion) {
      return {}
    }

    const baseVariant = ANIMATION_VARIANTS[variant]
    const transitionConfig = {
      duration: duration ?? 0.3,
      ...(delay !== undefined && { delay }),
      ...customTransition,
    }

    return {
      ...baseVariant,
      transition: transitionConfig,
    }
  }, [shouldReduceMotion, variant, delay, duration, customTransition])
}

/**
 * Returns a stagger container configuration for animating children
 *
 * @param staggerDelay - Delay between each child animation
 * @returns Container animation props
 *
 * @example
 * ```tsx
 * const containerProps = useStaggerContainer(0.1)
 * return (
 *   <motion.div {...containerProps}>
 *     {items.map((item, i) => (
 *       <motion.div key={i} variants={itemVariants}>{item}</motion.div>
 *     ))}
 *   </motion.div>
 * )
 * ```
 */
export function useStaggerContainer(staggerDelay = 0.1) {
  const shouldReduceMotion = useReducedMotion()

  return useMemo(() => {
    if (shouldReduceMotion) {
      return {}
    }

    return {
      initial: 'hidden',
      animate: 'visible',
      variants: {
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      },
    }
  }, [shouldReduceMotion, staggerDelay])
}

/**
 * Returns standard item variants for use within a stagger container
 */
export function useStaggerItemVariants(variant: AnimationVariant = 'fadeUp') {
  const shouldReduceMotion = useReducedMotion()

  return useMemo(() => {
    if (shouldReduceMotion) {
      return {}
    }

    const baseVariant = ANIMATION_VARIANTS[variant]

    return {
      variants: {
        hidden: baseVariant.initial,
        visible: baseVariant.animate,
      },
    }
  }, [shouldReduceMotion, variant])
}

export default useAnimationProps
