/**
 * StatCard - Reusable Statistics Card Component
 *
 * A flexible card for displaying statistics and metrics.
 * Supports various styles, sizes, and optional icons/trends.
 */

import { cn } from '@lib/utils'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowDown, ArrowUp, type LucideIcon, Minus } from 'lucide-react'
import { memo, type ReactNode } from 'react'

// Color presets for different stat types
const COLOR_PRESETS = {
  default: {
    bg: 'bg-dark-100 dark:bg-dark-800',
    iconBg: 'bg-dark-200 dark:bg-dark-700',
    iconColor: 'text-dark-500',
    valueColor: 'text-dark-900 dark:text-dark-100',
    labelColor: 'text-dark-500 dark:text-dark-400',
  },
  primary: {
    bg: 'bg-primary-50 dark:bg-primary-900/20',
    iconBg: 'bg-primary-100 dark:bg-primary-800/30',
    iconColor: 'text-primary-600 dark:text-primary-400',
    valueColor: 'text-primary-900 dark:text-primary-100',
    labelColor: 'text-primary-600 dark:text-primary-400',
  },
  success: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    iconBg: 'bg-green-100 dark:bg-green-800/30',
    iconColor: 'text-green-600 dark:text-green-400',
    valueColor: 'text-green-900 dark:text-green-100',
    labelColor: 'text-green-600 dark:text-green-400',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    iconBg: 'bg-amber-100 dark:bg-amber-800/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    valueColor: 'text-amber-900 dark:text-amber-100',
    labelColor: 'text-amber-600 dark:text-amber-400',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    iconBg: 'bg-red-100 dark:bg-red-800/30',
    iconColor: 'text-red-600 dark:text-red-400',
    valueColor: 'text-red-900 dark:text-red-100',
    labelColor: 'text-red-600 dark:text-red-400',
  },
  glass: {
    bg: 'bg-white/15 backdrop-blur-sm',
    iconBg: 'bg-white/20',
    iconColor: 'text-white',
    valueColor: 'text-white',
    labelColor: 'text-white/70',
  },
} as const

export type StatCardColor = keyof typeof COLOR_PRESETS

export interface StatCardProps {
  /** The main value to display */
  value: string | number
  /** Label describing the stat */
  label: string
  /** Optional icon */
  icon?: LucideIcon
  /** Color preset */
  color?: StatCardColor
  /** Trend indicator */
  trend?: {
    value: number
    isPositive?: boolean
  }
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Additional content */
  children?: ReactNode
  /** Additional className */
  className?: string
  /** Animation delay for staggered animations */
  animationDelay?: number
  /** Click handler */
  onClick?: () => void
}

const SIZE_CONFIG = {
  sm: {
    container: 'p-3 rounded-xl',
    iconWrapper: 'h-8 w-8 rounded-lg',
    icon: 'h-4 w-4',
    value: 'text-lg font-bold',
    label: 'text-xs',
    trend: 'text-xs',
  },
  md: {
    container: 'p-4 rounded-2xl',
    iconWrapper: 'h-10 w-10 rounded-xl',
    icon: 'h-5 w-5',
    value: 'text-2xl font-bold',
    label: 'text-sm',
    trend: 'text-sm',
  },
  lg: {
    container: 'p-6 rounded-2xl',
    iconWrapper: 'h-12 w-12 rounded-xl',
    icon: 'h-6 w-6',
    value: 'text-3xl font-bold',
    label: 'text-base',
    trend: 'text-base',
  },
} as const

/**
 * TrendIndicator - Shows positive/negative/neutral trend
 */
const TrendIndicator = memo(function TrendIndicator({
  value,
  isPositive,
  size,
}: {
  value: number
  isPositive?: boolean | undefined
  size: 'sm' | 'md' | 'lg'
}) {
  const sizeConfig = SIZE_CONFIG[size]
  const isUp = isPositive ?? value > 0
  const isNeutral = value === 0

  const TrendIcon = isNeutral ? Minus : isUp ? ArrowUp : ArrowDown
  const trendColor = isNeutral
    ? 'text-dark-500'
    : isUp
      ? 'text-green-600 dark:text-green-400'
      : 'text-red-600 dark:text-red-400'

  return (
    <span className={cn('flex items-center gap-0.5', trendColor, sizeConfig.trend)}>
      <TrendIcon className="h-3 w-3" />
      {Math.abs(value)}%
    </span>
  )
})

/**
 * StatCard Component
 */
export const StatCard = memo(function StatCard({
  value,
  label,
  icon: Icon,
  color = 'default',
  trend,
  size = 'md',
  children,
  className,
  animationDelay = 0,
  onClick,
}: StatCardProps) {
  const prefersReducedMotion = useReducedMotion()
  const colorConfig = COLOR_PRESETS[color]
  const sizeConfig = SIZE_CONFIG[size]

  const content = (
    <>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className={cn(sizeConfig.value, colorConfig.valueColor)}>{value}</div>
          <div className={cn('mt-1', sizeConfig.label, colorConfig.labelColor)}>{label}</div>
        </div>

        {Icon && (
          <div
            className={cn(
              'flex items-center justify-center',
              sizeConfig.iconWrapper,
              colorConfig.iconBg
            )}
          >
            <Icon className={cn(sizeConfig.icon, colorConfig.iconColor)} />
          </div>
        )}
      </div>

      {/* Trend */}
      {trend && (
        <div className="mt-2">
          <TrendIndicator value={trend.value} isPositive={trend.isPositive} size={size} />
        </div>
      )}

      {/* Additional content */}
      {children}
    </>
  )

  const containerClasses = cn(
    sizeConfig.container,
    colorConfig.bg,
    onClick && 'cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md',
    className
  )

  if (onClick) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        className={cn(containerClasses, 'w-full text-left')}
        initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: animationDelay, duration: 0.2 }}
        whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
        whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
      >
        {content}
      </motion.button>
    )
  }

  return (
    <motion.div
      className={containerClasses}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: animationDelay, duration: 0.2 }}
    >
      {content}
    </motion.div>
  )
})

/**
 * StatCardGrid - Grid layout for multiple stat cards
 */
export const StatCardGrid = memo(function StatCardGrid({
  children,
  columns = 3,
  className,
}: {
  children: ReactNode
  columns?: 2 | 3 | 4
  className?: string
}) {
  const colClasses = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
  }

  return <div className={cn('grid gap-3', colClasses[columns], className)}>{children}</div>
})

export default StatCard
