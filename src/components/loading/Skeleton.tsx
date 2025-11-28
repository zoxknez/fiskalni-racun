import { type ClassValue, clsx } from 'clsx'
import { useReducedMotion } from 'framer-motion'
import { memo } from 'react'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface SkeletonProps {
  className?: string
  style?: React.CSSProperties
}

/**
 * Base Skeleton Component
 *
 * Displays animated loading placeholder.
 */
function SkeletonComponent({ className, style }: SkeletonProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div
      className={cn(
        'rounded-md bg-dark-200 dark:bg-dark-700',
        !prefersReducedMotion && 'animate-pulse',
        className
      )}
      style={style}
    />
  )
}

export const Skeleton = memo(SkeletonComponent)

/**
 * Card Skeleton
 *
 * Loading placeholder for card layouts.
 */
function SkeletonCardComponent() {
  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-24" />
      <div className="flex gap-2">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 flex-1" />
      </div>
    </div>
  )
}

export const SkeletonCard = memo(SkeletonCardComponent)

/**
 * Receipt Card Skeleton
 *
 * Loading placeholder for receipt cards.
 */
function SkeletonReceiptCardComponent() {
  return (
    <div className="card space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-6 w-16" />
      </div>

      {/* Amount */}
      <Skeleton className="h-8 w-24" />

      {/* Metadata */}
      <div className="flex gap-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-24" />
      </div>
    </div>
  )
}

export const SkeletonReceiptCard = memo(SkeletonReceiptCardComponent)

/**
 * Table Skeleton
 *
 * Loading placeholder for table layouts.
 */
function SkeletonTableComponent({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card overflow-hidden p-0">
      {/* Table Header */}
      <div className="border-dark-200 border-b bg-dark-50 p-4 dark:border-dark-700 dark:bg-dark-800">
        <div className="flex gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 flex-1" />
        </div>
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-dark-200 dark:divide-dark-700">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 p-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 flex-1" />
          </div>
        ))}
      </div>
    </div>
  )
}

export const SkeletonTable = memo(SkeletonTableComponent)

/**
 * List Skeleton
 *
 * Loading placeholder for list layouts.
 */
function SkeletonListComponent({ items = 3 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="card flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  )
}

export const SkeletonList = memo(SkeletonListComponent)

/**
 * Chart Skeleton
 *
 * Loading placeholder for charts and graphs.
 */
function SkeletonChartComponent() {
  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="flex h-64 items-end gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="flex-1" style={{ height: `${Math.random() * 100 + 20}%` }} />
        ))}
      </div>
      <div className="flex justify-between">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  )
}

export const SkeletonChart = memo(SkeletonChartComponent)

/**
 * Stats Grid Skeleton
 *
 * Loading placeholder for statistics cards.
 */
function SkeletonStatsGridComponent({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  )
}

export const SkeletonStatsGrid = memo(SkeletonStatsGridComponent)
