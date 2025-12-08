/**
 * PeriodComparison Component
 *
 * Shows comparison between current and previous period
 */

import { formatCurrency } from '@lib/utils'
import { motion } from 'framer-motion'
import { ArrowDown, ArrowRight, ArrowUp, Calendar, TrendingDown, TrendingUp } from 'lucide-react'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { Receipt } from '@/types'

interface PeriodComparisonProps {
  receipts: Receipt[] | undefined
  dateRange: { start: Date; end: Date }
  className?: string
  isLoading?: boolean
}

interface PeriodStats {
  total: number
  count: number
  avgPerReceipt: number
  topCategory: string
  topCategoryAmount: number
}

function calculatePeriodStats(receipts: Receipt[]): PeriodStats {
  const total = receipts.reduce((sum, r) => sum + (r.totalAmount || 0), 0)
  const count = receipts.length
  const avgPerReceipt = count > 0 ? total / count : 0

  // Find top category
  const categoryTotals = receipts.reduce(
    (acc, r) => {
      const cat = r.category || 'other'
      acc[cat] = (acc[cat] || 0) + (r.totalAmount || 0)
      return acc
    },
    {} as Record<string, number>
  )

  const topEntry = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]
  const topCategory = topEntry?.[0] || 'other'
  const topCategoryAmount = topEntry?.[1] || 0

  return { total, count, avgPerReceipt, topCategory, topCategoryAmount }
}

// Skeleton component for loading state
const PeriodComparisonSkeleton = memo(({ className = '' }: { className?: string }) => (
  <div className={`card animate-pulse overflow-hidden ${className}`}>
    {/* Header skeleton */}
    <div className="border-dark-100 border-b bg-gradient-to-r from-primary-500/10 to-purple-500/10 p-4 dark:border-dark-700">
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 rounded bg-dark-200 dark:bg-dark-600" />
        <div className="h-5 w-32 rounded bg-dark-200 dark:bg-dark-600" />
      </div>
      <div className="mt-2 h-4 w-48 rounded bg-dark-200 dark:bg-dark-600" />
    </div>

    {/* Stats grid skeleton */}
    <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-xl bg-dark-50 p-4 dark:bg-dark-800">
          <div className="mb-2 h-3 w-20 rounded bg-dark-200 dark:bg-dark-600" />
          <div className="flex items-end justify-between">
            <div>
              <div className="h-8 w-24 rounded bg-dark-200 dark:bg-dark-600" />
              <div className="mt-2 h-4 w-20 rounded bg-dark-200 dark:bg-dark-600" />
            </div>
            <div className="h-6 w-12 rounded bg-dark-200 dark:bg-dark-600" />
          </div>
        </div>
      ))}
    </div>

    {/* Summary skeleton */}
    <div className="border-dark-100 border-t px-4 py-3 dark:border-dark-700">
      <div className="h-4 w-64 rounded bg-dark-200 dark:bg-dark-600" />
    </div>
  </div>
))
PeriodComparisonSkeleton.displayName = 'PeriodComparisonSkeleton'

// Extracted ChangeIndicator component to avoid nested component definition
const ChangeIndicator = memo(({ value, inverse = false }: { value: number; inverse?: boolean }) => {
  // For spending, negative is good (saved money)
  const isPositive = inverse ? value < 0 : value > 0
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : ArrowRight
  const colorClass = isPositive ? 'text-green-500' : value === 0 ? 'text-dark-400' : 'text-red-500'

  return (
    <span className={`inline-flex items-center gap-1 font-medium text-sm ${colorClass}`}>
      <Icon className="h-4 w-4" />
      {Math.abs(value).toFixed(1)}%
    </span>
  )
})
ChangeIndicator.displayName = 'ChangeIndicator'

function PeriodComparisonComponent({
  receipts,
  dateRange,
  className = '',
  isLoading,
}: PeriodComparisonProps) {
  const { t, i18n } = useTranslation()

  // Calculate previous period range - must be called before any early returns
  const { prevStart, prevEnd, currentStats, prevStats, comparisons } = useMemo(() => {
    // Return empty data if receipts not available
    if (!receipts) {
      return {
        prevStart: new Date(),
        prevEnd: new Date(),
        currentStats: {
          total: 0,
          count: 0,
          avgPerReceipt: 0,
          topCategory: 'other',
          topCategoryAmount: 0,
        },
        prevStats: {
          total: 0,
          count: 0,
          avgPerReceipt: 0,
          topCategory: 'other',
          topCategoryAmount: 0,
        },
        comparisons: { totalChange: 0, countChange: 0, avgChange: 0 },
      }
    }

    const periodLength = dateRange.end.getTime() - dateRange.start.getTime()
    const prevStart = new Date(dateRange.start.getTime() - periodLength)
    const prevEnd = new Date(dateRange.start.getTime())

    // Filter receipts for each period
    const currentReceipts = receipts.filter((r) => {
      const d = new Date(r.date)
      return d >= dateRange.start && d <= dateRange.end
    })

    const prevReceipts = receipts.filter((r) => {
      const d = new Date(r.date)
      return d >= prevStart && d < prevEnd
    })

    const currentStats = calculatePeriodStats(currentReceipts)
    const prevStats = calculatePeriodStats(prevReceipts)

    // Calculate comparisons
    const totalChange = prevStats.total
      ? ((currentStats.total - prevStats.total) / prevStats.total) * 100
      : currentStats.total > 0
        ? 100
        : 0

    const countChange = prevStats.count
      ? ((currentStats.count - prevStats.count) / prevStats.count) * 100
      : currentStats.count > 0
        ? 100
        : 0

    const avgChange = prevStats.avgPerReceipt
      ? ((currentStats.avgPerReceipt - prevStats.avgPerReceipt) / prevStats.avgPerReceipt) * 100
      : currentStats.avgPerReceipt > 0
        ? 100
        : 0

    return {
      prevStart,
      prevEnd,
      currentStats,
      prevStats,
      comparisons: { totalChange, countChange, avgChange },
    }
  }, [receipts, dateRange])

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat(i18n.language, {
      day: '2-digit',
      month: 'short',
    }).format(date)

  // Show skeleton while loading - after all hooks
  if (isLoading || receipts === undefined) {
    return <PeriodComparisonSkeleton className={className} />
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="border-dark-100 border-b bg-gradient-to-r from-primary-500/10 to-purple-500/10 p-4 dark:border-dark-700">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary-500" />
          <h3 className="font-semibold text-dark-900 dark:text-dark-50">
            {t('analytics.periodComparison', 'Poređenje perioda')}
          </h3>
        </div>
        <p className="mt-1 text-dark-500 text-sm">
          {formatDate(dateRange.start)} - {formatDate(dateRange.end)} vs {formatDate(prevStart)} -{' '}
          {formatDate(prevEnd)}
        </p>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-3">
        {/* Total Spending */}
        <div className="rounded-xl bg-dark-50 p-4 dark:bg-dark-800">
          <p className="mb-1 font-medium text-dark-500 text-xs uppercase tracking-wide">
            {t('analytics.totalSpending', 'Ukupna potrošnja')}
          </p>
          <div className="flex items-end justify-between">
            <div>
              <p className="font-bold text-2xl text-dark-900 dark:text-dark-50">
                {formatCurrency(currentStats.total)}
              </p>
              <p className="text-dark-400 text-sm">
                {t('analytics.previousPeriod', 'Prethodno')}: {formatCurrency(prevStats.total)}
              </p>
            </div>
            <ChangeIndicator value={comparisons.totalChange} inverse />
          </div>
        </div>

        {/* Receipt Count */}
        <div className="rounded-xl bg-dark-50 p-4 dark:bg-dark-800">
          <p className="mb-1 font-medium text-dark-500 text-xs uppercase tracking-wide">
            {t('analytics.receiptCount', 'Broj računa')}
          </p>
          <div className="flex items-end justify-between">
            <div>
              <p className="font-bold text-2xl text-dark-900 dark:text-dark-50">
                {currentStats.count}
              </p>
              <p className="text-dark-400 text-sm">
                {t('analytics.previousPeriod', 'Prethodno')}: {prevStats.count}
              </p>
            </div>
            <ChangeIndicator value={comparisons.countChange} />
          </div>
        </div>

        {/* Average per Receipt */}
        <div className="rounded-xl bg-dark-50 p-4 dark:bg-dark-800">
          <p className="mb-1 font-medium text-dark-500 text-xs uppercase tracking-wide">
            {t('analytics.avgPerReceipt', 'Prosek po računu')}
          </p>
          <div className="flex items-end justify-between">
            <div>
              <p className="font-bold text-2xl text-dark-900 dark:text-dark-50">
                {formatCurrency(currentStats.avgPerReceipt)}
              </p>
              <p className="text-dark-400 text-sm">
                {t('analytics.previousPeriod', 'Prethodno')}:{' '}
                {formatCurrency(prevStats.avgPerReceipt)}
              </p>
            </div>
            <ChangeIndicator value={comparisons.avgChange} inverse />
          </div>
        </div>
      </div>

      {/* Summary Message */}
      <div className="border-dark-100 border-t px-4 py-3 dark:border-dark-700">
        {comparisons.totalChange < 0 ? (
          <p className="flex items-center gap-2 text-green-600 text-sm dark:text-green-400">
            <ArrowDown className="h-4 w-4" />
            {t(
              'analytics.savedMoney',
              'Uštedeli ste {{amount}} ({{percent}}%) u odnosu na prethodni period',
              {
                amount: formatCurrency(Math.abs(currentStats.total - prevStats.total)),
                percent: Math.abs(comparisons.totalChange).toFixed(1),
              }
            )}
          </p>
        ) : comparisons.totalChange > 0 ? (
          <p className="flex items-center gap-2 text-orange-600 text-sm dark:text-orange-400">
            <ArrowUp className="h-4 w-4" />
            {t(
              'analytics.spentMore',
              'Potrošili ste {{amount}} ({{percent}}%) više nego prethodni period',
              {
                amount: formatCurrency(Math.abs(currentStats.total - prevStats.total)),
                percent: Math.abs(comparisons.totalChange).toFixed(1),
              }
            )}
          </p>
        ) : (
          <p className="flex items-center gap-2 text-dark-500 text-sm">
            <ArrowRight className="h-4 w-4" />
            {t('analytics.sameSpending', 'Potrošnja je približno ista kao prethodni period')}
          </p>
        )}
      </div>
    </motion.div>
  )
}

export const PeriodComparison = memo(PeriodComparisonComponent)
