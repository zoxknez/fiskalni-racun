/**
 * Badge Component
 *
 * Small labeled UI element
 *
 * @module components/ui/badge
 */

import { cn } from '@lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300',
        success: 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-300',
        error: 'bg-error-100 text-error-800 dark:bg-error-900/30 dark:text-error-300',
        warning: 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-300',
        info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        outline: 'border border-dark-300 dark:border-dark-600 text-dark-700 dark:text-dark-300',
        secondary: 'bg-dark-100 text-dark-800 dark:bg-dark-800 dark:text-dark-200',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
}

export function Badge({ className, variant, size, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            'mr-1.5 h-1.5 w-1.5 rounded-full',
            variant === 'success' && 'bg-success-500',
            variant === 'error' && 'bg-error-500',
            variant === 'warning' && 'bg-warning-500',
            variant === 'info' && 'bg-blue-500',
            (!variant || variant === 'default') && 'bg-primary-500'
          )}
        />
      )}
      {children}
    </span>
  )
}
