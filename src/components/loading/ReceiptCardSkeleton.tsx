/**
 * Receipt Card Skeleton Loader
 *
 * Displays while receipts are loading
 * Improves perceived performance on mobile
 *
 * @module components/loading/ReceiptCardSkeleton
 */

import { cn } from '@lib/utils'

interface ReceiptCardSkeletonProps {
  /** Number of skeleton cards to show */
  count?: number
  /** Custom className */
  className?: string
}

export function ReceiptCardSkeleton({ count = 3, className }: ReceiptCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`receipt-skeleton-${i}`}
          className={cn(
            'animate-pulse rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800',
            className
          )}
        >
          {/* Header */}
          <div className="mb-3 flex items-start justify-between">
            <div className="flex-1">
              {/* Store name */}
              <div className="mb-2 h-5 w-32 rounded bg-gray-200 dark:bg-gray-700" />
              {/* Date */}
              <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
            {/* Amount */}
            <div className="h-6 w-20 rounded bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* Category badge */}
          <div className="mb-3 h-6 w-24 rounded-full bg-gray-200 dark:bg-gray-700" />

          {/* Footer */}
          <div className="flex items-center gap-4">
            <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* Shimmer effect */}
          <div className="-translate-x-full absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
      ))}
    </>
  )
}
