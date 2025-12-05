/**
 * DashboardSkeleton Component
 *
 * Loading skeleton for the dashboard page
 */

import { memo } from 'react'
import { PageTransition } from '@/components/common/PageTransition'

/**
 * Skeleton block component
 */
function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-white/20 ${className}`} />
}

/**
 * Hero Section Skeleton
 */
function HeroSkeleton() {
  return (
    <div
      className="animate-pulse rounded-3xl bg-gradient-to-br from-primary-600/50 via-primary-700/50 to-primary-900/50 p-8 md:p-12"
      aria-hidden="true"
    >
      {/* Date and toggles */}
      <div className="mb-4 flex items-center justify-between">
        <SkeletonBlock className="h-6 w-48" />
        <div className="flex gap-2">
          <SkeletonBlock className="h-10 w-20" />
          <SkeletonBlock className="h-10 w-20" />
        </div>
      </div>

      {/* Title */}
      <SkeletonBlock className="mb-4 h-12 w-3/4" />

      {/* Subtitle */}
      <SkeletonBlock className="mb-6 h-6 w-1/2" />

      {/* CTA Button */}
      <SkeletonBlock className="mb-8 h-12 w-40" />

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl bg-white/10 p-4">
            <SkeletonBlock className="mb-2 h-8 w-16" />
            <SkeletonBlock className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Quick Actions Skeleton
 */
function QuickActionsSkeleton() {
  return (
    <div aria-hidden="true">
      {/* Section title */}
      <SkeletonBlock className="!bg-dark-300 dark:!bg-dark-600 mb-6 h-8 w-48" />

      {/* Cards grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-2xl bg-dark-200 p-6 dark:bg-dark-700">
            <SkeletonBlock className="!bg-dark-300 dark:!bg-dark-600 mb-4 h-16 w-16" />
            <SkeletonBlock className="!bg-dark-300 dark:!bg-dark-600 mb-2 h-6 w-3/4" />
            <SkeletonBlock className="!bg-dark-300 dark:!bg-dark-600 h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Stats Cards Skeleton
 */
function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3" aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse rounded-2xl bg-dark-200 p-6 dark:bg-dark-700">
          <div className="mb-4 flex items-start justify-between">
            <SkeletonBlock className="!rounded-2xl !bg-dark-300 dark:!bg-dark-600 h-14 w-14" />
            <SkeletonBlock className="!bg-dark-300 dark:!bg-dark-600 h-5 w-5" />
          </div>
          <SkeletonBlock className="!bg-dark-300 dark:!bg-dark-600 mb-2 h-10 w-32" />
          <SkeletonBlock className="!bg-dark-300 dark:!bg-dark-600 mb-2 h-4 w-24" />
          <SkeletonBlock className="!bg-dark-300 dark:!bg-dark-600 h-3 w-20" />
        </div>
      ))}
    </div>
  )
}

/**
 * Recent Receipts Skeleton
 */
function RecentReceiptsSkeleton() {
  return (
    <div aria-hidden="true">
      {/* Section header */}
      <div className="mb-6 flex items-center justify-between">
        <SkeletonBlock className="!bg-dark-300 dark:!bg-dark-600 h-8 w-48" />
        <SkeletonBlock className="!bg-dark-300 dark:!bg-dark-600 h-5 w-24" />
      </div>

      {/* Receipt items */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse rounded-2xl bg-white p-4 dark:bg-dark-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SkeletonBlock className="!rounded-xl !bg-dark-300 dark:!bg-dark-600 h-12 w-12" />
                <div>
                  <SkeletonBlock className="!bg-dark-300 dark:!bg-dark-600 mb-2 h-5 w-32" />
                  <SkeletonBlock className="!bg-dark-300 dark:!bg-dark-600 h-4 w-24" />
                </div>
              </div>
              <div className="text-right">
                <SkeletonBlock className="!bg-dark-300 dark:!bg-dark-600 mb-2 h-6 w-20" />
                <SkeletonBlock className="!rounded-full !bg-dark-300 dark:!bg-dark-600 h-5 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Main Dashboard Skeleton Component
 */
function DashboardSkeletonComponent() {
  return (
    <PageTransition className="space-y-8 pb-8">
      {/* Screen reader announcement */}
      <output className="sr-only" aria-live="polite">
        Loading dashboard...
      </output>

      <HeroSkeleton />
      <QuickActionsSkeleton />
      <StatsCardsSkeleton />
      <RecentReceiptsSkeleton />
    </PageTransition>
  )
}

export const DashboardSkeleton = memo(DashboardSkeletonComponent)
