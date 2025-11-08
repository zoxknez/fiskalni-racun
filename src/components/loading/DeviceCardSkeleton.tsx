/**
 * Device Card Skeleton Loader
 *
 * Displays while devices are loading
 * Improves perceived performance on mobile
 *
 * @module components/loading/DeviceCardSkeleton
 */

import { cn } from '@lib/utils'

interface DeviceCardSkeletonProps {
  /** Number of skeleton cards to show */
  count?: number
  /** Custom className */
  className?: string
}

export function DeviceCardSkeleton({ count = 3, className }: DeviceCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`device-skeleton-${i}`}
          className={cn(
            'relative animate-pulse overflow-hidden rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800',
            className
          )}
        >
          {/* Header */}
          <div className="mb-3 flex items-start justify-between">
            <div className="flex-1">
              {/* Brand & Model */}
              <div className="mb-2 h-5 w-40 rounded bg-gray-200 dark:bg-gray-700" />
              {/* Category */}
              <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
            {/* Status badge */}
            <div className="h-6 w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* Warranty info */}
          <div className="mb-3 space-y-2">
            <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* Progress bar */}
          <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700" />

          {/* Shimmer effect */}
          <div className="-translate-x-full absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
      ))}
    </>
  )
}
