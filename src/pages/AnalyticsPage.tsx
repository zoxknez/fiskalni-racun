import type { HouseholdBill } from '@lib/db'
import { formatCurrency } from '@lib/utils'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Award,
  DollarSign,
  Home,
  Receipt as ReceiptIcon,
  ShoppingCart,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { lazy, memo, Suspense, useCallback, useEffect, useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PeriodComparison } from '@/components/analytics/PeriodComparison'
import { YearOverYearComparison } from '@/components/analytics/YearOverYearComparison'
import { PageTransition } from '@/components/common/PageTransition'
import { SkeletonChart, SkeletonStatsGrid } from '@/components/loading'
import { useDevices, useHouseholdBills, useReceipts } from '@/hooks/useDatabase'
import type { CONSUMPTION_UNIT_LABEL_KEYS } from './AnalyticsPage/constants'
import { useAnalyticsStats } from './AnalyticsPage/hooks/useAnalyticsStats'
import { useDateRange, useFilteredReceipts } from './AnalyticsPage/hooks/useFilteredData'
import { normalizeConsumptionUnit } from './AnalyticsPage/utils/mappers'

const FiscalChartsSection = lazy(() => import('./AnalyticsPage/sections/FiscalChartsSection'))
const HouseholdChartsSection = lazy(() => import('./AnalyticsPage/sections/HouseholdChartsSection'))

const ChartsFallback = () => (
  <div className="card p-4 sm:p-6">
    <div className="mb-4 h-6 w-48 animate-pulse rounded bg-dark-100 dark:bg-dark-800" />
    <SkeletonChart />
  </div>
)

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
function AnalyticsPage() {
  const { t, i18n } = useTranslation()
  const prefersReducedMotion = useReducedMotion()
  const receipts = useReceipts()
  const devices = useDevices()
  const householdBills = useHouseholdBills()
  const [timePeriod, setTimePeriod] = useState<import('./AnalyticsPage/types').TimePeriod>('6m')
  const [activeTab, setActiveTab] = useState<'fiscal' | 'household'>('fiscal')

  // Calculate date range and filter data
  const dateRange = useDateRange(timePeriod, receipts || [])
  const filteredReceipts = useFilteredReceipts(receipts || [], dateRange)
  const filteredHouseholdBills = householdBills || []

  // Get all analytics stats
  const {
    monthlyData,
    categoryData,
    topMerchants,
    householdMonthlyData,
    householdTypeData,
    householdStatusData,
    upcomingBills,
    householdStats,
  } = useAnalyticsStats(filteredReceipts, filteredHouseholdBills, dateRange)

  // Gradient ID (stable & sanitized)
  const rawGradientId = useId()
  const gradientId = `${(rawGradientId || 'g').replace(/[^a-zA-Z0-9_-]/g, '')}-amount` as const

  const formatDate = useCallback(
    (date: Date) =>
      new Intl.DateTimeFormat(i18n.language, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(date),
    [i18n.language]
  )

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(i18n.language, {
        maximumFractionDigits: 2,
        ...options,
      }).format(value),
    [i18n.language]
  )

  // Responsive flag for pie radii (SSR-safe)
  const [isSmall, setIsSmall] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(max-width: 640px)')
    const update = () => setIsSmall(mq.matches)
    update()
    mq.addEventListener?.('change', update)
    return () => mq.removeEventListener?.('change', update)
  }, [])

  // Aggregate stats & period-over-period change
  const stats = useMemo(() => {
    const total = filteredReceipts.reduce((s, r) => s + (r.totalAmount || 0), 0)
    const avg = filteredReceipts.length ? total / filteredReceipts.length : 0

    const periodLen = dateRange.end.getTime() - dateRange.start.getTime()
    const prevStart = new Date(dateRange.start.getTime() - periodLen)
    const prevReceipts = (receipts || []).filter((r) => {
      const d = new Date(r.date)
      return d >= prevStart && d < dateRange.start
    })
    const prevTotal = prevReceipts.reduce((s, r) => s + (r.totalAmount || 0), 0)
    const change = prevTotal ? ((total - prevTotal) / prevTotal) * 100 : 0

    return {
      total,
      avg,
      count: filteredReceipts.length,
      change,
      devices: devices?.length || 0,
    }
  }, [filteredReceipts, receipts, dateRange, devices])

  // Household stats
  const householdTotalStats = useMemo(() => {
    const total = filteredHouseholdBills.reduce((s, b) => s + (b.amount || 0), 0)
    const paid = filteredHouseholdBills
      .filter((b) => b.status === 'paid')
      .reduce((s, b) => s + (b.amount || 0), 0)
    const outstanding = total - paid
    const count = filteredHouseholdBills.length

    return { total, paid, outstanding, count }
  }, [filteredHouseholdBills])

  // Combined total (fiscal + household)
  const combinedTotal = useMemo(
    () => stats.total + householdTotalStats.total,
    [stats.total, householdTotalStats.total]
  )

  const latestConsumption = useMemo(() => {
    type ConsumptionUnitLabelKey = keyof typeof CONSUMPTION_UNIT_LABEL_KEYS

    if (!householdBills?.length)
      return [] as Array<{
        id?: number
        provider: string
        billType: HouseholdBill['billType']
        amount: number
        consumptionValue: number
        consumptionUnit: ConsumptionUnitLabelKey
        periodStart?: Date
        periodEnd?: Date
        dueDate: Date
      }>

    return householdBills
      .filter((bill) => bill.consumption && Number.isFinite(bill.consumption.value))
      .map((bill) => {
        const periodStart =
          bill.billingPeriodStart instanceof Date
            ? bill.billingPeriodStart
            : new Date(bill.billingPeriodStart)
        const periodEnd =
          bill.billingPeriodEnd instanceof Date
            ? bill.billingPeriodEnd
            : new Date(bill.billingPeriodEnd)
        const entry: {
          id?: number
          provider: string
          billType: HouseholdBill['billType']
          amount: number
          consumptionValue: number
          consumptionUnit: ConsumptionUnitLabelKey
          periodStart?: Date
          periodEnd?: Date
          dueDate: Date
        } = {
          provider: bill.provider,
          billType: bill.billType,
          amount: bill.amount,
          consumptionValue: bill.consumption?.value ?? 0,
          consumptionUnit: normalizeConsumptionUnit(bill.consumption?.unit),
          dueDate: bill.dueDate instanceof Date ? bill.dueDate : new Date(bill.dueDate),
        }
        if (bill.id !== undefined) {
          const numericId = typeof bill.id === 'string' ? Number.parseInt(bill.id, 10) : bill.id
          if (!Number.isNaN(numericId)) {
            entry.id = numericId
          }
        }
        if (!Number.isNaN(periodStart.getTime())) {
          entry.periodStart = periodStart
        }
        if (!Number.isNaN(periodEnd.getTime())) {
          entry.periodEnd = periodEnd
        }
        return entry
      })
      .sort((a, b) => {
        const aDate = (a.periodEnd ?? a.dueDate).getTime()
        const bDate = (b.periodEnd ?? b.dueDate).getTime()
        return bDate - aDate
      })
      .slice(0, 4)
  }, [householdBills])

  const hasAnyHouseholdBills = Boolean(householdBills?.length)

  const isLoading = receipts === undefined || devices === undefined

  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-6" aria-live="polite">
          {/* Hero Skeleton */}
          <div className="rounded-3xl bg-gray-50 p-6 sm:p-8 dark:bg-gray-800">
            <div className="mb-4 h-8 w-64 animate-pulse rounded bg-gray-300 dark:bg-gray-600" />
            <div className="h-5 w-96 animate-pulse rounded bg-gray-300 dark:bg-gray-600" />
          </div>

          {/* Stats Grid Skeleton */}
          <SkeletonStatsGrid count={4} />

          {/* Charts Skeleton */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
              <div className="mb-4 h-6 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <SkeletonChart />
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
              <div className="mb-4 h-6 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <SkeletonChart />
            </div>
          </div>

          {/* Additional Chart Skeleton */}
          <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
            <div className="mb-4 h-6 w-56 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <SkeletonChart />
          </div>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-purple-900 p-6 text-white shadow-2xl sm:p-8"
        >
          {/* Decorative bg */}
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 25px 25px, white 2%, transparent 0%), radial-gradient(circle at 75px 75px, white 2%, transparent 0%)',
                backgroundSize: '100px 100px',
              }}
            />
          </div>
          {/* Floating orbs - optimized */}
          <motion.div
            animate={prefersReducedMotion ? {} : { scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={
              prefersReducedMotion
                ? {}
                : { duration: 6, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }
            }
            className="-top-24 -right-24 absolute h-96 w-96 rounded-full bg-white/20 blur-2xl"
          />
          <motion.div
            animate={prefersReducedMotion ? {} : { scale: [1, 1.05, 1], opacity: [0.2, 0.3, 0.2] }}
            transition={
              prefersReducedMotion
                ? {}
                : { duration: 8, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }
            }
            className="-bottom-32 -left-32 absolute h-96 w-96 rounded-full bg-primary-300/30 blur-2xl"
          />

          <div className="relative z-10">
            {/* Title + period selector */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Activity className="h-7 w-7" aria-hidden="true" />
                <h1 className="font-black text-3xl sm:text-4xl">{t('analytics.heroTitle')}</h1>
              </div>

              <div
                className="flex gap-2 rounded-xl border border-white/20 bg-white/10 p-1 backdrop-blur-sm"
                role="tablist"
                aria-label="Period"
              >
                {[
                  { key: '3m' as const, label: '3M' },
                  { key: '6m' as const, label: '6M' },
                  { key: '12m' as const, label: '12M' },
                  { key: 'all' as const, label: t('analytics.timePeriodAll') },
                ].map(({ key, label }) => (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setTimePeriod(key)}
                    className={`rounded-lg px-3 py-1.5 font-semibold text-sm transition-all sm:px-4 sm:py-2 ${
                      timePeriod === key
                        ? 'bg-white text-primary-600 shadow-lg'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                    role="tab"
                    aria-selected={timePeriod === key}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {[
                {
                  label: t('analytics.statsTotal'),
                  value: formatCurrency(stats.total),
                  icon: DollarSign,
                  change: stats.change,
                },
                {
                  label: t('analytics.statsAverage'),
                  value: formatCurrency(stats.avg),
                  icon: TrendingUp,
                },
                { label: t('analytics.statsCount'), value: stats.count, icon: ShoppingCart },
                { label: t('analytics.statsDevices'), value: stats.devices, icon: Award },
              ].map((stat) => (
                <motion.div
                  key={String(stat.label)}
                  whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
                  className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm sm:p-5"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div className="rounded-xl bg-white/20 p-2">
                      <stat.icon className="h-4 w-4 text-white sm:h-5 sm:w-5" aria-hidden="true" />
                    </div>
                    {stat.change !== undefined && (
                      <div
                        className={`flex items-center gap-1 font-semibold text-xs ${stat.change >= 0 ? 'text-white' : 'text-white/70'}`}
                      >
                        {stat.change >= 0 ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )}
                        {Math.abs(stat.change).toFixed(1)}%
                      </div>
                    )}
                  </div>
                  <div className="mb-1 truncate font-bold text-2xl sm:text-3xl">
                    {String(stat.value)}
                  </div>
                  <div className="truncate font-semibold text-white/70 text-xs uppercase tracking-wide sm:text-sm">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Total Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="card overflow-hidden border-2 border-primary-200 bg-gradient-to-br from-primary-50 via-white to-purple-50 p-6 shadow-xl dark:border-primary-800 dark:from-primary-950 dark:via-dark-800 dark:to-purple-950"
        >
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-lg bg-primary-100 p-2 dark:bg-primary-900/50">
              <TrendingUp className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="font-bold text-dark-900 text-xl dark:text-dark-50">
              {t('analytics.totalSummary')}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Fiscal Receipts */}
            <motion.div
              whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
              className="rounded-xl border border-primary-200 bg-white/60 p-4 backdrop-blur-sm dark:border-primary-800 dark:bg-dark-800/60"
            >
              <div className="mb-2 flex items-center gap-2 text-dark-600 text-sm dark:text-dark-400">
                <ReceiptIcon className="h-4 w-4" />
                {t('analytics.fiscalReceipts')}
              </div>
              <div className="font-black text-2xl text-dark-900 dark:text-dark-50">
                {formatCurrency(stats.total)}
              </div>
              <div className="mt-1 text-dark-500 text-xs dark:text-dark-500">
                {stats.count} {t('analytics.receiptsCount')}
              </div>
            </motion.div>

            {/* Household Bills */}
            <motion.div
              whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
              className="rounded-xl border border-purple-200 bg-white/60 p-4 backdrop-blur-sm dark:border-purple-800 dark:bg-dark-800/60"
            >
              <div className="mb-2 flex items-center gap-2 text-dark-600 text-sm dark:text-dark-400">
                <Home className="h-4 w-4" />
                {t('analytics.householdBills')}
              </div>
              <div className="font-black text-2xl text-dark-900 dark:text-dark-50">
                {formatCurrency(householdTotalStats.total)}
              </div>
              <div className="mt-1 text-dark-500 text-xs dark:text-dark-500">
                {householdTotalStats.count} {t('analytics.billsCount')}
              </div>
            </motion.div>

            {/* Combined Total */}
            <motion.div
              whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
              className="rounded-xl border-2 border-primary-300 bg-gradient-to-br from-primary-100 to-purple-100 p-4 shadow-lg dark:border-primary-700 dark:from-primary-900/50 dark:to-purple-900/50"
            >
              <div className="mb-2 flex items-center gap-2 font-semibold text-primary-700 text-sm dark:text-primary-300">
                <DollarSign className="h-4 w-4" />
                {t('analytics.totalCombined')}
              </div>
              <div className="font-black text-3xl text-primary-600 dark:text-primary-400">
                {formatCurrency(combinedTotal)}
              </div>
              <div className="mt-1 flex items-center gap-1 text-primary-600 text-xs dark:text-primary-400">
                <Sparkles className="h-3 w-3" />
                {t('analytics.periodTotal')}
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Period Comparison */}
        <PeriodComparison receipts={receipts || []} dateRange={dateRange} />

        {/* Year-over-Year Comparison */}
        <YearOverYearComparison receipts={receipts} />

        {/* Tab Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card p-2"
        >
          <div className="flex gap-2" role="tablist" aria-label="Analytics Type">
            <button
              type="button"
              onClick={() => setActiveTab('fiscal')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold text-sm transition-all sm:text-base ${
                activeTab === 'fiscal'
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg'
                  : 'bg-dark-50 text-dark-600 hover:bg-dark-100 dark:bg-dark-800 dark:text-dark-400 dark:hover:bg-dark-700'
              }`}
              role="tab"
              aria-selected={activeTab === 'fiscal'}
            >
              <ReceiptIcon className="h-5 w-5" aria-hidden="true" />
              <span className="hidden sm:inline">{t('analytics.fiscalReceiptsSection')}</span>
              <span className="sm:hidden">{t('analytics.fiscalShort')}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('household')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold text-sm transition-all sm:text-base ${
                activeTab === 'household'
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
                  : 'bg-dark-50 text-dark-600 hover:bg-dark-100 dark:bg-dark-800 dark:text-dark-400 dark:hover:bg-dark-700'
              }`}
              role="tab"
              aria-selected={activeTab === 'household'}
            >
              <Home className="h-5 w-5" aria-hidden="true" />
              <span className="hidden sm:inline">{t('analytics.householdSection')}</span>
              <span className="sm:hidden">{t('analytics.householdShort')}</span>
            </button>
          </div>
        </motion.div>

        {/* === FISKALNI RAČUNI CHARTS === */}
        {activeTab === 'fiscal' && (
          <Suspense fallback={<ChartsFallback />}>
            <FiscalChartsSection
              t={t}
              prefersReducedMotion={prefersReducedMotion ?? false}
              monthlyData={monthlyData}
              categoryData={categoryData}
              topMerchants={topMerchants}
              gradientId={gradientId}
              isSmall={isSmall}
              formatCurrency={formatCurrency}
            />
          </Suspense>
        )}

        {/* === DOMAĆINSTVO RAČUNI CHARTS === */}
        {activeTab === 'household' && (
          <Suspense fallback={<ChartsFallback />}>
            <HouseholdChartsSection
              t={t}
              hasAnyHouseholdBills={hasAnyHouseholdBills}
              householdBillsCount={householdBills?.length ?? 0}
              householdStats={householdStats}
              householdMonthlyData={householdMonthlyData}
              householdTypeData={householdTypeData}
              householdStatusData={householdStatusData}
              upcomingBills={upcomingBills}
              latestConsumption={latestConsumption}
              isSmall={isSmall}
              formatCurrency={formatCurrency}
              formatNumber={formatNumber}
              formatDate={formatDate}
            />
          </Suspense>
        )}
      </div>
    </PageTransition>
  )
}

export default memo(AnalyticsPage)
