/**
 * YearOverYearComparison Component
 *
 * Shows year-over-year spending comparison with monthly breakdown
 */

import { formatCurrency } from '@lib/utils'
import { eachMonthOfInterval, format, isSameMonth, startOfYear, subYears } from 'date-fns'
import { sr } from 'date-fns/locale'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Calendar, TrendingDown, TrendingUp } from 'lucide-react'
import { memo, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Receipt } from '@/types'

interface YearOverYearComparisonProps {
  receipts: Receipt[] | undefined
  className?: string
  isLoading?: boolean
}

interface MonthlyYoYData {
  month: string
  monthIndex: number
  currentYear: number
  previousYear: number
  change: number
  changePercent: number
}

interface YearlyStats {
  total: number
  count: number
  avgPerReceipt: number
  avgPerMonth: number
  maxMonth: string
  maxMonthAmount: number
  minMonth: string
  minMonthAmount: number
}

// Skeleton component for loading state
const YoYComparisonSkeleton = memo(({ className = '' }: { className?: string }) => (
  <div className={`card animate-pulse overflow-hidden ${className}`}>
    <div className="border-dark-100 border-b bg-gradient-to-r from-blue-500/10 to-indigo-500/10 p-4 dark:border-dark-700">
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 rounded bg-dark-200 dark:bg-dark-600" />
        <div className="h-5 w-48 rounded bg-dark-200 dark:bg-dark-600" />
      </div>
    </div>
    <div className="p-4">
      <div className="h-64 rounded bg-dark-100 dark:bg-dark-800" />
    </div>
  </div>
))
YoYComparisonSkeleton.displayName = 'YoYComparisonSkeleton'

// Change indicator component
const ChangeIndicator = memo(({ value }: { value: number }) => {
  const isPositive = value > 0
  const isZero = Math.abs(value) < 0.1
  const Icon = isZero ? ArrowRight : isPositive ? TrendingUp : TrendingDown

  // For spending: negative change (less spending) is good (green)
  const colorClass = isZero ? 'text-dark-400' : isPositive ? 'text-red-500' : 'text-green-500'

  return (
    <span className={`inline-flex items-center gap-1 font-medium text-sm ${colorClass}`}>
      <Icon className="h-4 w-4" />
      {isPositive ? '+' : ''}
      {value.toFixed(1)}%
    </span>
  )
})
ChangeIndicator.displayName = 'ChangeIndicator'

// Custom tooltip for chart
interface TooltipPayloadEntry {
  value: number
  name: string
  color: string
}

const CustomTooltip = memo(
  ({
    active,
    payload,
    label,
  }: {
    active?: boolean
    payload?: TooltipPayloadEntry[]
    label?: string
  }) => {
    if (!active || !payload?.length) return null

    return (
      <div className="rounded-lg border border-dark-200 bg-white p-3 shadow-lg dark:border-dark-700 dark:bg-dark-800">
        <p className="mb-2 font-medium">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-dark-600 dark:text-dark-400">{entry.name}:</span>
            <span className="font-medium">{formatCurrency(entry.value)}</span>
          </div>
        ))}
      </div>
    )
  }
)
CustomTooltip.displayName = 'CustomTooltip'

function YearOverYearComparisonComponent({
  receipts,
  className = '',
  isLoading,
}: YearOverYearComparisonProps) {
  const { t, i18n } = useTranslation()
  const prefersReducedMotion = useReducedMotion()
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')

  const locale = useMemo(() => (i18n.language === 'sr' ? sr : undefined), [i18n.language])

  // Calculate YoY data
  const { monthlyData, currentYearStats, previousYearStats, overallChange } = useMemo(() => {
    if (!receipts?.length) {
      return {
        monthlyData: [] as MonthlyYoYData[],
        currentYearStats: null,
        previousYearStats: null,
        overallChange: 0,
      }
    }

    const now = new Date()

    // Get months up to current month
    const currentYearStart = startOfYear(now)
    const currentYearEnd = now
    const previousYearStart = subYears(currentYearStart, 1)
    const previousYearEnd = subYears(now, 1)

    // Generate months for comparison
    const months = eachMonthOfInterval({ start: currentYearStart, end: currentYearEnd })

    // Filter receipts by year
    const currentYearReceipts = receipts.filter((r) => {
      const d = new Date(r.date)
      return d >= currentYearStart && d <= currentYearEnd
    })

    const previousYearReceipts = receipts.filter((r) => {
      const d = new Date(r.date)
      return d >= previousYearStart && d <= previousYearEnd
    })

    // Calculate monthly totals
    const monthlyData: MonthlyYoYData[] = months.map((month, index) => {
      const previousYearMonth = subYears(month, 1)

      const currentMonthTotal = currentYearReceipts
        .filter((r) => isSameMonth(new Date(r.date), month))
        .reduce((sum, r) => sum + (r.totalAmount || 0), 0)

      const previousMonthTotal = previousYearReceipts
        .filter((r) => isSameMonth(new Date(r.date), previousYearMonth))
        .reduce((sum, r) => sum + (r.totalAmount || 0), 0)

      const change = currentMonthTotal - previousMonthTotal
      const changePercent = previousMonthTotal
        ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100
        : currentMonthTotal > 0
          ? 100
          : 0

      return {
        month: format(month, 'MMM', locale ? { locale } : undefined),
        monthIndex: index,
        currentYear: currentMonthTotal,
        previousYear: previousMonthTotal,
        change,
        changePercent,
      }
    })

    // Calculate yearly stats
    const calculateYearlyStats = (yearReceipts: Receipt[]): YearlyStats | null => {
      if (!yearReceipts.length) return null

      const total = yearReceipts.reduce((sum, r) => sum + (r.totalAmount || 0), 0)
      const count = yearReceipts.length
      const avgPerReceipt = total / count
      const activeMonths = new Set(yearReceipts.map((r) => format(new Date(r.date), 'yyyy-MM')))
        .size
      const avgPerMonth = activeMonths > 0 ? total / activeMonths : 0

      // Find max and min months
      const monthlyTotals = new Map<string, number>()
      for (const r of yearReceipts) {
        const monthKey = format(new Date(r.date), 'MMM', locale ? { locale } : undefined)
        monthlyTotals.set(monthKey, (monthlyTotals.get(monthKey) || 0) + (r.totalAmount || 0))
      }

      let maxMonth = ''
      let maxMonthAmount = 0
      let minMonth = ''
      let minMonthAmount = Number.POSITIVE_INFINITY

      for (const [month, amount] of monthlyTotals) {
        if (amount > maxMonthAmount) {
          maxMonth = month
          maxMonthAmount = amount
        }
        if (amount < minMonthAmount) {
          minMonth = month
          minMonthAmount = amount
        }
      }

      if (minMonthAmount === Number.POSITIVE_INFINITY) {
        minMonthAmount = 0
      }

      return {
        total,
        count,
        avgPerReceipt,
        avgPerMonth,
        maxMonth,
        maxMonthAmount,
        minMonth,
        minMonthAmount,
      }
    }

    const currentYearStats = calculateYearlyStats(currentYearReceipts)
    const previousYearStats = calculateYearlyStats(previousYearReceipts)

    // Overall change
    const overallChange =
      previousYearStats?.total && currentYearStats?.total
        ? ((currentYearStats.total - previousYearStats.total) / previousYearStats.total) * 100
        : 0

    return { monthlyData, currentYearStats, previousYearStats, overallChange }
  }, [receipts, locale])

  const currentYear = new Date().getFullYear()
  const previousYear = currentYear - 1

  // Show skeleton while loading
  if (isLoading || receipts === undefined) {
    return <YoYComparisonSkeleton className={className} />
  }

  // No data state
  if (!monthlyData.length || (!currentYearStats && !previousYearStats)) {
    return (
      <motion.div
        initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`card overflow-hidden ${className}`}
      >
        <div className="border-dark-100 border-b bg-gradient-to-r from-blue-500/10 to-indigo-500/10 p-4 dark:border-dark-700">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold">
              {t('analytics.yoy.title', 'Year-over-Year Comparison')}
            </h3>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center p-8 text-center text-dark-500">
          <Calendar className="mb-2 h-12 w-12 opacity-30" />
          <p>{t('analytics.yoy.noData', 'Not enough data for year-over-year comparison')}</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-dark-100 border-b bg-gradient-to-r from-blue-500/10 to-indigo-500/10 p-4 dark:border-dark-700">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-500" />
          <h3 className="font-semibold">{t('analytics.yoy.title', 'Year-over-Year Comparison')}</h3>
        </div>

        {/* View toggle */}
        <div className="flex rounded-lg bg-dark-100 p-1 dark:bg-dark-700">
          <button
            type="button"
            onClick={() => setViewMode('chart')}
            className={`rounded-md px-3 py-1 text-sm transition-colors ${
              viewMode === 'chart'
                ? 'bg-white text-dark-900 shadow dark:bg-dark-600 dark:text-white'
                : 'text-dark-600 dark:text-dark-400'
            }`}
          >
            {t('analytics.yoy.chart', 'Chart')}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`rounded-md px-3 py-1 text-sm transition-colors ${
              viewMode === 'table'
                ? 'bg-white text-dark-900 shadow dark:bg-dark-600 dark:text-white'
                : 'text-dark-600 dark:text-dark-400'
            }`}
          >
            {t('analytics.yoy.table', 'Table')}
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 border-dark-100 border-b p-4 sm:grid-cols-4 dark:border-dark-700">
        <div className="rounded-lg bg-dark-50 p-3 dark:bg-dark-800">
          <p className="mb-1 text-dark-500 text-xs">{currentYear}</p>
          <p className="font-bold text-lg">{formatCurrency(currentYearStats?.total || 0)}</p>
        </div>
        <div className="rounded-lg bg-dark-50 p-3 dark:bg-dark-800">
          <p className="mb-1 text-dark-500 text-xs">{previousYear}</p>
          <p className="font-bold text-lg">{formatCurrency(previousYearStats?.total || 0)}</p>
        </div>
        <div className="rounded-lg bg-dark-50 p-3 dark:bg-dark-800">
          <p className="mb-1 text-dark-500 text-xs">{t('analytics.yoy.change', 'Change')}</p>
          <ChangeIndicator value={overallChange} />
        </div>
        <div className="rounded-lg bg-dark-50 p-3 dark:bg-dark-800">
          <p className="mb-1 text-dark-500 text-xs">
            {t('analytics.yoy.difference', 'Difference')}
          </p>
          <p
            className={`font-bold text-lg ${
              (currentYearStats?.total || 0) - (previousYearStats?.total || 0) > 0
                ? 'text-red-500'
                : 'text-green-500'
            }`}
          >
            {(currentYearStats?.total || 0) - (previousYearStats?.total || 0) > 0 ? '+' : ''}
            {formatCurrency((currentYearStats?.total || 0) - (previousYearStats?.total || 0))}
          </p>
        </div>
      </div>

      {/* Chart or Table view */}
      <div className="p-4">
        {viewMode === 'chart' ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                <YAxis
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 12 }}
                  stroke="#9ca3af"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  dataKey="currentYear"
                  name={String(currentYear)}
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="previousYear"
                  name={String(previousYear)}
                  fill="#94a3b8"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-dark-100 border-b dark:border-dark-700">
                  <th className="px-3 py-2 text-left font-medium text-dark-500">
                    {t('analytics.yoy.month', 'Month')}
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-dark-500">{currentYear}</th>
                  <th className="px-3 py-2 text-right font-medium text-dark-500">{previousYear}</th>
                  <th className="px-3 py-2 text-right font-medium text-dark-500">
                    {t('analytics.yoy.change', 'Change')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((row) => (
                  <tr
                    key={row.month}
                    className="border-dark-100 border-b last:border-0 dark:border-dark-700"
                  >
                    <td className="px-3 py-2 font-medium">{row.month}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(row.currentYear)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(row.previousYear)}</td>
                    <td className="px-3 py-2 text-right">
                      <ChangeIndicator value={row.changePercent} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-dark-50 font-medium dark:bg-dark-800">
                  <td className="px-3 py-2">{t('common.total', 'Total')}</td>
                  <td className="px-3 py-2 text-right">
                    {formatCurrency(currentYearStats?.total || 0)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatCurrency(previousYearStats?.total || 0)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <ChangeIndicator value={overallChange} />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Insights */}
      {currentYearStats && previousYearStats && (
        <div className="border-dark-100 border-t p-4 dark:border-dark-700">
          <h4 className="mb-2 font-medium text-sm">{t('analytics.yoy.insights', 'Insights')}</h4>
          <div className="space-y-2 text-dark-600 text-sm dark:text-dark-400">
            {currentYearStats.maxMonth && (
              <p>
                📈 {t('analytics.yoy.highestMonth', 'Highest spending month this year')}:{' '}
                <span className="font-medium text-dark-900 dark:text-white">
                  {currentYearStats.maxMonth}
                </span>{' '}
                ({formatCurrency(currentYearStats.maxMonthAmount)})
              </p>
            )}
            {currentYearStats.minMonth && (
              <p>
                📉 {t('analytics.yoy.lowestMonth', 'Lowest spending month')}:{' '}
                <span className="font-medium text-dark-900 dark:text-white">
                  {currentYearStats.minMonth}
                </span>{' '}
                ({formatCurrency(currentYearStats.minMonthAmount)})
              </p>
            )}
            <p>
              📊 {t('analytics.yoy.avgPerMonth', 'Average per month')}:{' '}
              <span className="font-medium text-dark-900 dark:text-white">
                {formatCurrency(currentYearStats.avgPerMonth)}
              </span>
              {previousYearStats.avgPerMonth > 0 && (
                <span className="ml-1 text-dark-400">
                  (vs {formatCurrency(previousYearStats.avgPerMonth)}{' '}
                  {t('analytics.yoy.lastYear', 'last year')})
                </span>
              )}
            </p>
          </div>
        </div>
      )}
    </motion.div>
  )
}

export const YearOverYearComparison = memo(YearOverYearComparisonComponent)
YearOverYearComparison.displayName = 'YearOverYearComparison'
