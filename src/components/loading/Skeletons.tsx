/**
 * Skeleton Loaders
 *
 * Content placeholder components that show during loading states.
 * Improves perceived performance by showing structure before data loads.
 *
 * @module components/loading/Skeletons
 */

import { cn } from '@lib/utils'
import { memo } from 'react'

// ────────────────────────────────────────────────────────────────────────────
// Base Skeleton
// ────────────────────────────────────────────────────────────────────────────

interface SkeletonProps {
  className?: string
  style?: React.CSSProperties
}

/**
 * Base skeleton component with shimmer animation
 */
export const Skeleton = memo(function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-gray-200 dark:bg-gray-700', className)}
      style={style}
      aria-hidden="true"
    />
  )
})

// ────────────────────────────────────────────────────────────────────────────
// Receipt Card Skeleton
// ────────────────────────────────────────────────────────────────────────────

interface ReceiptCardSkeletonProps {
  compact?: boolean
}

/**
 * Skeleton for receipt list items
 */
export const ReceiptCardSkeleton = memo(function ReceiptCardSkeleton({
  compact = false,
}: ReceiptCardSkeletonProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="mb-1 h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-5 w-16" />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Skeleton className="mb-2 h-5 w-3/4" />
          <Skeleton className="mb-1 h-3 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  )
})

/**
 * Skeleton for receipt list (multiple items)
 */
export const ReceiptListSkeleton = memo(function ReceiptListSkeleton({
  count = 5,
  compact = false,
}: {
  count?: number
  compact?: boolean
}) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <ReceiptCardSkeleton key={i} compact={compact} />
      ))}
    </div>
  )
})

// ────────────────────────────────────────────────────────────────────────────
// Device Card Skeleton
// ────────────────────────────────────────────────────────────────────────────

interface DeviceCardSkeletonProps {
  showImage?: boolean
}

/**
 * Skeleton for device/warranty cards
 */
export const DeviceCardSkeleton = memo(function DeviceCardSkeleton({
  showImage = true,
}: DeviceCardSkeletonProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {showImage && <Skeleton className="h-40 w-full rounded-none" />}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Skeleton className="mb-1 h-5 w-1/2" />
            <Skeleton className="mb-2 h-4 w-3/4" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Skeleton className="mt-3 h-2 w-full rounded-full" />
      </div>
    </div>
  )
})

/**
 * Skeleton for device grid (multiple items)
 */
export const DeviceGridSkeleton = memo(function DeviceGridSkeleton({
  count = 4,
}: {
  count?: number
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <DeviceCardSkeleton key={i} />
      ))}
    </div>
  )
})

// ────────────────────────────────────────────────────────────────────────────
// Dashboard Widget Skeletons
// ────────────────────────────────────────────────────────────────────────────

/**
 * Skeleton for stat cards on dashboard
 */
export const StatCardSkeleton = memo(function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="mt-3 h-8 w-24" />
      <Skeleton className="mt-1 h-3 w-32" />
    </div>
  )
})

/**
 * Skeleton for chart widgets
 */
export const ChartSkeleton = memo(function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <Skeleton className="mb-4 h-5 w-32" />
      <div className="flex items-end gap-2" style={{ height }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="flex-1" style={{ height: `${Math.random() * 60 + 40}%` }} />
        ))}
      </div>
      <div className="mt-2 flex justify-between">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-8" />
        ))}
      </div>
    </div>
  )
})

// ────────────────────────────────────────────────────────────────────────────
// Page-Level Skeletons
// ────────────────────────────────────────────────────────────────────────────

/**
 * Skeleton for receipt detail page
 */
export const ReceiptDetailSkeleton = memo(function ReceiptDetailSkeleton() {
  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="mb-1 h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      {/* Image */}
      <Skeleton className="h-48 w-full rounded-xl" />

      {/* Details */}
      <div className="space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 flex-1 rounded-lg" />
      </div>
    </div>
  )
})

/**
 * Skeleton for analytics page
 */
export const AnalyticsSkeleton = memo(function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 p-4">
      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartSkeleton height={250} />
        <ChartSkeleton height={250} />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <Skeleton className="mb-4 h-5 w-40" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})

// ────────────────────────────────────────────────────────────────────────────
// Form Skeletons
// ────────────────────────────────────────────────────────────────────────────

/**
 * Skeleton for form fields
 */
export const FormFieldSkeleton = memo(function FormFieldSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>
  )
})

/**
 * Skeleton for full form
 */
export const FormSkeleton = memo(function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <FormFieldSkeleton key={i} />
      ))}
      <Skeleton className="mt-6 h-12 w-full rounded-lg" />
    </div>
  )
})

// ────────────────────────────────────────────────────────────────────────────
// Export all
// ────────────────────────────────────────────────────────────────────────────

export const Skeletons = {
  Base: Skeleton,
  ReceiptCard: ReceiptCardSkeleton,
  ReceiptList: ReceiptListSkeleton,
  DeviceCard: DeviceCardSkeleton,
  DeviceGrid: DeviceGridSkeleton,
  StatCard: StatCardSkeleton,
  Chart: ChartSkeleton,
  ReceiptDetail: ReceiptDetailSkeleton,
  Analytics: AnalyticsSkeleton,
  FormField: FormFieldSkeleton,
  Form: FormSkeleton,
}
