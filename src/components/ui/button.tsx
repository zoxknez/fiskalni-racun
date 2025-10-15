/**
 * Button Component
 *
 * Modern, accessible button with variants using CVA
 *
 * @module components/ui/button
 */

import { cn } from '@lib/utils'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import * as React from 'react'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg hover:shadow-xl',
        destructive: 'bg-error-600 text-white hover:bg-error-700 shadow-lg hover:shadow-xl',
        outline:
          'border-2 border-primary-600 text-primary-600 bg-transparent hover:bg-primary-50 dark:hover:bg-primary-950',
        secondary:
          'bg-dark-100 dark:bg-dark-700 text-dark-900 dark:text-dark-50 hover:bg-dark-200 dark:hover:bg-dark-600',
        ghost:
          'hover:bg-dark-100 dark:hover:bg-dark-800 hover:text-dark-900 dark:hover:text-dark-50',
        link: 'text-primary-600 underline-offset-4 hover:underline',
        success: 'bg-success-600 text-white hover:bg-success-700 shadow-lg hover:shadow-xl',
        warning: 'bg-warning-600 text-white hover:bg-warning-700 shadow-lg hover:shadow-xl',
      },
      size: {
        default: 'h-12 px-6 py-3',
        sm: 'h-9 px-4 py-2 text-xs',
        lg: 'h-14 px-8 py-4 text-base',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            <span>{children}</span>
          </>
        ) : (
          children
        )}
      </Comp>
    )
  }
)

Button.displayName = 'Button'

export { Button, buttonVariants }
