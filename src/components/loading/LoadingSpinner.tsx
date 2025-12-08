/**
 * LoadingSpinner - Standardized loading indicator component
 *
 * A flexible, accessible loading spinner that works in both light and dark modes.
 * Supports multiple sizes and can be centered or inline.
 */

import { cn } from '@lib/utils'
import { Loader2 } from 'lucide-react'
import { memo } from 'react'

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type SpinnerVariant = 'default' | 'primary' | 'white' | 'muted'

const SIZE_CLASSES: Record<SpinnerSize, string> = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
}

const VARIANT_CLASSES: Record<SpinnerVariant, string> = {
  default: 'text-primary-500',
  primary: 'text-primary-600 dark:text-primary-400',
  white: 'text-white',
  muted: 'text-dark-400 dark:text-dark-500',
}

export interface LoadingSpinnerProps {
  /** Size of the spinner */
  size?: SpinnerSize
  /** Color variant */
  variant?: SpinnerVariant
  /** Additional CSS classes */
  className?: string
  /** Accessible label for screen readers */
  label?: string
}

/**
 * Basic spinning loader icon
 */
export const LoadingSpinner = memo(function LoadingSpinner({
  size = 'md',
  variant = 'default',
  className,
  label = 'Loading...',
}: LoadingSpinnerProps) {
  return (
    <Loader2
      className={cn('animate-spin', SIZE_CLASSES[size], VARIANT_CLASSES[variant], className)}
      aria-label={label}
      role="status"
    />
  )
})

export interface LoadingOverlayProps {
  /** Size of the spinner */
  size?: SpinnerSize
  /** Loading message to display */
  message?: string
  /** Whether to show a backdrop blur */
  blur?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * Full-screen or container loading overlay
 */
export const LoadingOverlay = memo(function LoadingOverlay({
  size = 'lg',
  message,
  blur = false,
  className,
}: LoadingOverlayProps) {
  return (
    <output
      className={cn(
        'flex flex-col items-center justify-center gap-3',
        blur && 'backdrop-blur-sm',
        className
      )}
      aria-live="polite"
    >
      <LoadingSpinner size={size} />
      {message && <p className="text-dark-500 text-sm dark:text-dark-400">{message}</p>}
    </output>
  )
})

export interface FullPageLoaderProps {
  /** Loading message */
  message?: string
  /** Size of the spinner */
  size?: SpinnerSize
}

/**
 * Full page loading state (used for initial app load or page transitions)
 */
export const FullPageLoader = memo(function FullPageLoader({
  message = 'Loading...',
  size = 'lg',
}: FullPageLoaderProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-dark-900">
      <LoadingOverlay size={size} message={message} />
    </div>
  )
})

export interface InlineLoaderProps {
  /** Size of the spinner */
  size?: SpinnerSize
  /** Text to display next to the spinner */
  text?: string | undefined
  /** Additional CSS classes */
  className?: string
}

/**
 * Inline loader for buttons or inline content
 */
export const InlineLoader = memo(function InlineLoader({
  size = 'sm',
  text,
  className,
}: InlineLoaderProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LoadingSpinner size={size} />
      {text && <span>{text}</span>}
    </span>
  )
})

export interface ButtonLoaderProps {
  /** Whether the button is in loading state */
  isLoading: boolean
  /** Content to show when not loading */
  children: React.ReactNode
  /** Loading text (optional, shows spinner only if not provided) */
  loadingText?: string
  /** Size of the spinner */
  spinnerSize?: SpinnerSize
}

/**
 * Helper component for button loading states
 * Renders either children or a loading spinner based on isLoading prop
 */
export const ButtonLoader = memo(function ButtonLoader({
  isLoading,
  children,
  loadingText,
  spinnerSize = 'sm',
}: ButtonLoaderProps) {
  if (!isLoading) {
    return <>{children}</>
  }

  return <InlineLoader size={spinnerSize} text={loadingText} className="justify-center" />
})

/**
 * Legacy spinner using div/border approach
 * For consistency with existing code that uses this pattern
 */
export const LegacySpinner = memo(function LegacySpinner({
  size = 'md',
  className,
}: Pick<LoadingSpinnerProps, 'size' | 'className'>) {
  const borderSizes: Record<SpinnerSize, string> = {
    xs: 'border-2',
    sm: 'border-2',
    md: 'border-4',
    lg: 'border-4',
    xl: 'border-[6px]',
  }

  return (
    <output
      className={cn(
        'block animate-spin rounded-full border-primary-500 border-t-transparent',
        SIZE_CLASSES[size],
        borderSizes[size],
        className
      )}
      aria-label="Loading..."
    />
  )
})

export default LoadingSpinner
