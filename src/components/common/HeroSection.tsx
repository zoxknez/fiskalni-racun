/**
 * HeroSection - Reusable Hero Section Component
 *
 * A flexible hero section with gradient backgrounds, animated decorative elements,
 * and optional stats display. Used across multiple pages for consistent styling.
 */

import { cn } from '@lib/utils'
import { motion, useReducedMotion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { memo, type ReactNode } from 'react'

// Gradient presets for different page themes
const GRADIENT_PRESETS = {
  primary: 'from-primary-700 via-primary-600 to-primary-800',
  purple: 'from-violet-600 via-purple-600 to-fuchsia-700',
  amber: 'from-amber-500 via-orange-500 to-red-500',
  indigo: 'from-indigo-600 via-purple-600 to-violet-700',
  emerald: 'from-emerald-600 via-teal-600 to-cyan-700',
  rose: 'from-rose-600 via-pink-600 to-fuchsia-700',
  blue: 'from-blue-600 via-indigo-600 to-violet-700',
} as const

type GradientPreset = keyof typeof GRADIENT_PRESETS

// Orb style presets
const ORB_STYLES = {
  primary: {
    orb1: 'bg-white/10',
    orb2: 'bg-primary-300/20',
  },
  purple: {
    orb1: 'bg-white/10',
    orb2: 'bg-purple-300/20',
  },
  amber: {
    orb1: 'bg-yellow-200/20',
    orb2: 'bg-orange-300/20',
  },
  indigo: {
    orb1: 'bg-blue-200/20',
    orb2: 'bg-purple-300/20',
  },
  emerald: {
    orb1: 'bg-teal-200/20',
    orb2: 'bg-cyan-300/20',
  },
  rose: {
    orb1: 'bg-pink-200/20',
    orb2: 'bg-rose-300/20',
  },
  blue: {
    orb1: 'bg-blue-200/20',
    orb2: 'bg-indigo-300/20',
  },
} as const

export interface HeroStat {
  label: string
  value: string | number
  icon?: LucideIcon
  iconFilled?: boolean
}

export interface HeroSectionProps {
  /** Main title */
  title: string
  /** Optional subtitle/description */
  subtitle?: string
  /** Optional badge text above title */
  badge?: string
  /** Badge icon */
  badgeIcon?: LucideIcon
  /** Large decorative icon that rotates */
  decorativeIcon?: LucideIcon
  /** Gradient color preset */
  gradient?: GradientPreset
  /** Custom gradient class (overrides preset) */
  customGradient?: string
  /** Stats to display in cards */
  stats?: HeroStat[]
  /** Number of stat columns (2, 3, or 4) */
  statsColumns?: 2 | 3 | 4
  /** Additional content to render below title */
  children?: ReactNode
  /** Additional className for the container */
  className?: string
  /** Padding bottom size */
  paddingBottom?: 'sm' | 'md' | 'lg' | 'xl'
}

/**
 * AnimatedOrbs - Decorative animated background elements
 */
const AnimatedOrbs = memo(function AnimatedOrbs({
  gradient,
  shouldReduceMotion,
}: {
  gradient: GradientPreset
  shouldReduceMotion: boolean | null
}) {
  const orbStyles = ORB_STYLES[gradient]

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Top-right orb */}
      <motion.div
        animate={
          shouldReduceMotion
            ? {}
            : {
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }
        }
        transition={{
          duration: 8,
          repeat: Number.POSITIVE_INFINITY,
          ease: 'easeInOut',
        }}
        className={cn('-top-20 -right-20 absolute h-64 w-64 rounded-full blur-3xl', orbStyles.orb1)}
      />
      {/* Bottom-left orb */}
      <motion.div
        animate={
          shouldReduceMotion
            ? {}
            : {
                scale: [1, 1.3, 1],
                opacity: [0.2, 0.4, 0.2],
              }
        }
        transition={{
          duration: 10,
          repeat: Number.POSITIVE_INFINITY,
          ease: 'easeInOut',
          delay: 1,
        }}
        className={cn(
          '-bottom-32 -left-20 absolute h-80 w-80 rounded-full blur-3xl',
          orbStyles.orb2
        )}
      />
    </div>
  )
})

/**
 * RotatingIcon - Decorative rotating icon
 */
const RotatingIcon = memo(function RotatingIcon({
  icon: Icon,
  shouldReduceMotion,
}: {
  icon: LucideIcon
  shouldReduceMotion: boolean | null
}) {
  return (
    <motion.div
      animate={shouldReduceMotion ? {} : { rotate: 360 }}
      transition={{
        duration: 50,
        repeat: Number.POSITIVE_INFINITY,
        ease: 'linear',
      }}
      className="absolute top-10 right-10 opacity-10"
    >
      <Icon className="h-32 w-32 text-white" />
    </motion.div>
  )
})

/**
 * StatCard - Individual stat display
 */
const StatCard = memo(function StatCard({ stat }: { stat: HeroStat }) {
  const Icon = stat.icon

  return (
    <div className="rounded-2xl bg-white/15 p-3 text-center backdrop-blur-sm sm:p-4">
      <div className="mb-1 flex items-center justify-center gap-1 font-bold text-white text-xl sm:text-2xl">
        {Icon && (
          <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5', stat.iconFilled && 'fill-current')} />
        )}
        {stat.value}
      </div>
      <div className="text-white/70 text-xs">{stat.label}</div>
    </div>
  )
})

/**
 * StatsGrid - Grid of stat cards
 */
const StatsGrid = memo(function StatsGrid({
  stats,
  columns,
}: {
  stats: HeroStat[]
  columns: 2 | 3 | 4
}) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={cn('grid gap-3', gridCols[columns])}
    >
      {stats.map((stat, index) => (
        <StatCard key={index} stat={stat} />
      ))}
    </motion.div>
  )
})

/**
 * HeroSection Component
 */
export const HeroSection = memo(function HeroSection({
  title,
  subtitle,
  badge,
  badgeIcon: BadgeIcon,
  decorativeIcon,
  gradient = 'primary',
  customGradient,
  stats,
  statsColumns = 3,
  children,
  className,
  paddingBottom = 'lg',
}: HeroSectionProps) {
  const shouldReduceMotion = useReducedMotion()

  const gradientClass = customGradient || GRADIENT_PRESETS[gradient]

  const paddingBottomClass = {
    sm: 'pb-6',
    md: 'pb-8',
    lg: 'pb-12',
    xl: 'pb-16',
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-gradient-to-br px-4 pt-8',
        gradientClass,
        paddingBottomClass[paddingBottom],
        className
      )}
    >
      {/* Animated Background Orbs */}
      <AnimatedOrbs gradient={gradient} shouldReduceMotion={shouldReduceMotion} />

      {/* Rotating Decorative Icon */}
      {decorativeIcon && (
        <RotatingIcon icon={decorativeIcon} shouldReduceMotion={shouldReduceMotion} />
      )}

      <div className="container relative mx-auto max-w-5xl">
        {/* Title Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 text-center"
        >
          {/* Badge */}
          {badge && (
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm text-white backdrop-blur-sm">
              {BadgeIcon && <BadgeIcon className="h-4 w-4" />}
              {badge}
            </div>
          )}

          {/* Main Title */}
          <h1 className="mb-2 font-bold text-3xl text-white md:text-4xl">{title}</h1>

          {/* Subtitle */}
          {subtitle && <p className="mx-auto max-w-md text-white/80">{subtitle}</p>}
        </motion.div>

        {/* Stats Grid */}
        {stats && stats.length > 0 && <StatsGrid stats={stats} columns={statsColumns} />}

        {/* Additional Content */}
        {children}
      </div>
    </div>
  )
})

export default HeroSection
