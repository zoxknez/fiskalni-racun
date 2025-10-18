/**
 * Skeleton Component
 *
 * Loading placeholder
 *
 * @module components/ui/skeleton
 */

import { cn } from '@lib/utils'
import { useId, useMemo } from 'react'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

export function Skeleton({
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
  className,
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-dark-200 dark:bg-dark-700',
        animation === 'pulse' && 'animate-pulse',
        animation === 'wave' &&
          'animate-shimmer bg-[length:200%_100%] bg-gradient-to-r from-dark-200 via-dark-300 to-dark-200 dark:from-dark-700 dark:via-dark-600 dark:to-dark-700',
        variant === 'text' && 'h-4 rounded',
        variant === 'circular' && 'rounded-full',
        variant === 'rectangular' && 'rounded-lg',
        className
      )}
      style={{
        width,
        height,
        ...style,
      }}
      {...props}
    />
  )
}

/**
 * Skeleton group helpers
 */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  const id = useId()
  const skeletonLines = useMemo(() => {
    return Array.from({ length: lines }).map((_, i) => ({
      key: `${id}-line-${i}`,
      isLast: i === lines - 1,
    }))
  }, [lines, id])

  return (
    <div className={cn('space-y-2', className)}>
      {skeletonLines.map(({ key, isLast }) => (
        <Skeleton key={key} variant="text" width={isLast ? '60%' : '100%'} />
      ))}
    </div>
  )
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border border-dark-200 p-4 dark:border-dark-700', className)}>
      <div className="flex items-start gap-4">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="text" width="40%" />
        </div>
      </div>
      <Skeleton variant="rectangular" height={100} className="mt-4" />
    </div>
  )
}
