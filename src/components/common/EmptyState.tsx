/**
 * EmptyState - Reusable Empty State Component
 *
 * A consistent empty state display for lists and collections.
 * Used when there are no items to display.
 */

import { cn } from '@lib/utils'
import { motion, useReducedMotion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { CheckCircle2, FolderOpen, Inbox, Search } from 'lucide-react'
import { memo, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

// Preset configurations for common empty states
const PRESET_CONFIG = {
  default: {
    icon: Inbox,
    gradient: 'from-dark-100 to-dark-200 dark:from-dark-700 dark:to-dark-800',
    iconColor: 'text-dark-400 dark:text-dark-500',
  },
  success: {
    icon: CheckCircle2,
    gradient: 'from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30',
    iconColor: 'text-green-600 dark:text-green-400',
  },
  search: {
    icon: Search,
    gradient: 'from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  folder: {
    icon: FolderOpen,
    gradient: 'from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
} as const

export type EmptyStatePreset = keyof typeof PRESET_CONFIG

export interface EmptyStateProps {
  /** Preset style configuration */
  preset?: EmptyStatePreset
  /** Custom icon (overrides preset) */
  icon?: LucideIcon
  /** Main title */
  title: string
  /** Description text */
  description?: string
  /** Optional hint text (smaller, below description) */
  hint?: string
  /** Action button configuration */
  action?:
    | {
        label: string
        onClick: () => void
        variant?: 'default' | 'outline' | 'ghost'
      }
    | undefined
  /** Secondary action button */
  secondaryAction?:
    | {
        label: string
        onClick: () => void
      }
    | undefined
  /** Additional content below the main content */
  children?: ReactNode
  /** Additional className */
  className?: string | undefined
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_CONFIG = {
  sm: {
    container: 'py-8 px-4',
    iconWrapper: 'h-12 w-12 mb-3',
    icon: 'h-6 w-6',
    title: 'text-base',
    description: 'text-sm',
    hint: 'text-xs',
  },
  md: {
    container: 'py-12 px-4',
    iconWrapper: 'h-16 w-16 mb-4',
    icon: 'h-8 w-8',
    title: 'text-lg',
    description: 'text-sm',
    hint: 'text-xs',
  },
  lg: {
    container: 'py-16 px-4',
    iconWrapper: 'h-20 w-20 mb-6',
    icon: 'h-10 w-10',
    title: 'text-xl',
    description: 'text-base',
    hint: 'text-sm',
  },
} as const

export const EmptyState = memo(function EmptyState({
  preset = 'default',
  icon: CustomIcon,
  title,
  description,
  hint,
  action,
  secondaryAction,
  children,
  className,
  size = 'md',
}: EmptyStateProps) {
  const prefersReducedMotion = useReducedMotion()
  const presetConfig = PRESET_CONFIG[preset]
  const sizeConfig = SIZE_CONFIG[size]
  const Icon = CustomIcon || presetConfig.icon

  return (
    <motion.div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizeConfig.container,
        className
      )}
      initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-gradient-to-br',
          presetConfig.gradient,
          sizeConfig.iconWrapper
        )}
      >
        <Icon className={cn(sizeConfig.icon, presetConfig.iconColor)} />
      </div>

      {/* Title */}
      <h3 className={cn('mb-2 font-semibold text-dark-900 dark:text-dark-100', sizeConfig.title)}>
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className={cn('mb-4 max-w-sm text-dark-600 dark:text-dark-400', sizeConfig.description)}>
          {description}
        </p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || 'default'}
              size={size === 'sm' ? 'sm' : 'default'}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="ghost"
              size={size === 'sm' ? 'sm' : 'default'}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}

      {/* Hint */}
      {hint && (
        <p
          className={cn(
            'mt-4 flex items-center gap-2 text-dark-500 dark:text-dark-500',
            sizeConfig.hint
          )}
        >
          {hint}
        </p>
      )}

      {/* Additional content */}
      {children}
    </motion.div>
  )
})

/**
 * NoSearchResults - Specialized empty state for search
 */
export const NoSearchResults = memo(function NoSearchResults({
  query,
  onClear,
  className,
}: {
  query: string
  onClear?: () => void
  className?: string
}) {
  return (
    <EmptyState
      preset="search"
      title="Nema rezultata"
      description={`Nismo pronašli ništa za "${query}"`}
      action={
        onClear
          ? {
              label: 'Obriši pretragu',
              onClick: onClear,
              variant: 'outline',
            }
          : undefined
      }
      className={className}
    />
  )
})

/**
 * AllCaughtUp - Success empty state for notifications
 */
export const AllCaughtUp = memo(function AllCaughtUp({
  title,
  description,
  className,
}: {
  title?: string
  description?: string
  className?: string
}) {
  return (
    <EmptyState
      preset="success"
      title={title || 'Sve je ažurirano!'}
      description={description || 'Nemate novih obaveštenja'}
      className={className}
    />
  )
})

export default EmptyState
