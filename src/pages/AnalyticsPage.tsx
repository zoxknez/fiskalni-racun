import type { HouseholdBill } from '@lib/db'
import { formatCurrency } from '@lib/utils'
import { differenceInCalendarDays } from 'date-fns'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Award,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  DollarSign,
  Home,
  PieChart as PieChartIcon,
  Receipt as ReceiptIcon,
  ShoppingCart,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { memo, useCallback, useEffect, useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from '@/components/charts/LazyCharts'
import { PageTransition } from '@/components/common/PageTransition'
import { SkeletonChart, SkeletonStatsGrid } from '@/components/loading'
import { useDevices, useHouseholdBills, useReceipts } from '@/hooks/useDatabase'
import {
  CHART_COLORS,
  CONSUMPTION_UNIT_LABEL_KEYS,
  HOUSEHOLD_STATUS_LABEL_KEYS,
} from './AnalyticsPage/constants'
import { useAnalyticsStats } from './AnalyticsPage/hooks/useAnalyticsStats'
import { useDateRange, useFilteredReceipts } from './AnalyticsPage/hooks/useFilteredData'
import { normalizeConsumptionUnit } from './AnalyticsPage/utils/mappers'

// ─────────────────────────────────────────────────────────────
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
        return {
          id: bill.id,
          provider: bill.provider,
          billType: bill.billType,
          amount: bill.amount,
          consumptionValue: bill.consumption?.value ?? 0,
          consumptionUnit: normalizeConsumptionUnit(bill.consumption?.unit),
          periodStart: Number.isNaN(periodStart.getTime()) ? undefined : periodStart,
          periodEnd: Number.isNaN(periodEnd.getTime()) ? undefined : periodEnd,
          dueDate: bill.dueDate instanceof Date ? bill.dueDate : new Date(bill.dueDate),
        }
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
          <>
            {/* Monthly Spending */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="card p-4 sm:p-6"
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-bold text-dark-900 text-lg sm:text-xl dark:text-dark-50">
                  <BarChart3
                    className="h-5 w-5 text-primary-500 sm:h-6 sm:w-6"
                    aria-hidden="true"
                  />
                  {t('analytics.monthlySpending')}
                </h2>
              </div>

              <div className="h-64 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={monthlyData}
                    role="img"
                    aria-label={t('analytics.monthlySpending') || 'Monthly spending'}
                  >
                    <defs>
                      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickMargin={10} />
                    <YAxis
                      stroke="#64748b"
                      fontSize={12}
                      tickMargin={10}
                      tickFormatter={(v) => `${((v as number) / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                      }}
                      formatter={(value: number) => [
                        formatCurrency(value),
                        t('receipts.total') || 'Total',
                      ]}
                      labelFormatter={(label) => String(label)}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke={CHART_COLORS.primary}
                      strokeWidth={3}
                      fillOpacity={1}
                      fill={`url(#${gradientId})`}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Category & Top Merchants */}
            <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
              {/* Category Distribution */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="card p-4 sm:p-6"
              >
                <h2 className="mb-6 flex items-center gap-2 font-bold text-dark-900 text-lg sm:text-xl dark:text-dark-50">
                  <PieChartIcon
                    className="h-5 w-5 text-primary-500 sm:h-6 sm:w-6"
                    aria-hidden="true"
                  />
                  {t('analytics.categories')}
                </h2>

                {categoryData.length > 0 ? (
                  <>
                    <div className="mb-4 h-48 sm:h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={isSmall ? 40 : 60}
                            outerRadius={isSmall ? 70 : 90}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {categoryData.map((entry) => (
                              <Cell key={entry.key} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              border: 'none',
                              borderRadius: '12px',
                              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            }}
                            formatter={(value: number) => formatCurrency(value)}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-2">
                      {categoryData.map((cat) => (
                        <div key={cat.key} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 flex-shrink-0 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span className="truncate text-dark-700 dark:text-dark-300">
                              {cat.name}
                            </span>
                          </div>
                          <span className="ml-2 font-semibold text-dark-900 dark:text-dark-50">
                            {formatCurrency(cat.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center text-dark-500">{t('analytics.noData')}</div>
                )}
              </motion.div>

              {/* Top Merchants */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="card p-4 sm:p-6"
              >
                <h2 className="mb-6 flex items-center gap-2 font-bold text-dark-900 text-lg sm:text-xl dark:text-dark-50">
                  <Award className="h-5 w-5 text-primary-500 sm:h-6 sm:w-6" aria-hidden="true" />
                  {t('analytics.topMerchants')}
                </h2>

                {topMerchants.length > 0 ? (
                  <div className="space-y-4">
                    {topMerchants.map((merchant, index) => {
                      const maxTotal = topMerchants[0]?.total ?? merchant.total
                      const percentage = maxTotal ? (merchant.total / maxTotal) * 100 : 0
                      return (
                        <div key={merchant.name} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 font-bold text-white text-xs sm:h-8 sm:w-8 sm:text-sm">
                                {index + 1}
                              </div>
                              <span className="truncate font-medium text-dark-900 dark:text-dark-50">
                                {merchant.name}
                              </span>
                            </div>
                            <div className="ml-2 flex-shrink-0 text-right">
                              <div className="font-bold text-dark-900 dark:text-dark-50">
                                {formatCurrency(merchant.total)}
                              </div>
                              <div className="text-dark-500 text-xs">
                                {merchant.count} {t('analytics.receiptsCount')}
                              </div>
                            </div>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-dark-100 dark:bg-dark-800">
                            <motion.div
                              initial={
                                prefersReducedMotion ? { width: `${percentage}%` } : { width: 0 }
                              }
                              animate={{ width: `${percentage}%` }}
                              transition={
                                prefersReducedMotion ? {} : { duration: 0.5, delay: index * 0.1 }
                              }
                              className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-600"
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-dark-500">{t('analytics.noData')}</div>
                )}
              </motion.div>
            </div>
          </>
        )}

        {/* === DOMAĆINSTVO RAČUNI CHARTS === */}
        {activeTab === 'household' && (
          <>
            {/* Household Analytics */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="card p-4 sm:p-6"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="flex items-center gap-2 font-bold text-dark-900 text-lg sm:text-xl dark:text-dark-50">
                    <Home className="h-5 w-5 text-purple-500 sm:h-6 sm:w-6" aria-hidden="true" />
                    {t('analytics.household.title')}
                  </h3>
                  <p className="max-w-2xl text-dark-500 text-sm sm:text-base dark:text-dark-300">
                    {t('analytics.household.subtitle')}
                  </p>
                </div>
                {hasAnyHouseholdBills && (
                  <div className="rounded-xl border border-dark-100 bg-dark-50/80 px-4 py-2 text-dark-600 text-sm shadow-sm dark:border-dark-700 dark:bg-dark-900/40 dark:text-dark-300">
                    {t('analytics.household.totalBills', { count: householdBills?.length ?? 0 })}
                  </div>
                )}
              </div>

              {hasAnyHouseholdBills ? (
                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {[
                    {
                      key: 'totalPaid' as const,
                      label: t('analytics.household.stats.totalPaid'),
                      value: formatCurrency(householdStats.totalPaid),
                      icon: CheckCircle2,
                      accent: 'from-emerald-500 to-emerald-600',
                    },
                    {
                      key: 'outstanding' as const,
                      label: t('analytics.household.stats.outstanding'),
                      value: formatCurrency(householdStats.outstanding),
                      icon: DollarSign,
                      accent: 'from-amber-500 to-orange-500',
                    },
                    {
                      key: 'averageBill' as const,
                      label: t('analytics.household.stats.averageBill'),
                      value: formatCurrency(householdStats.averageBill),
                      icon: TrendingUp,
                      accent: 'from-indigo-500 to-indigo-600',
                    },
                    {
                      key: 'onTimeRate' as const,
                      label: t('analytics.household.stats.onTimeRate'),
                      value:
                        householdStats.onTimeRate === null
                          ? t('analytics.household.onTimeRateEmpty')
                          : `${formatNumber(householdStats.onTimeRate, { maximumFractionDigits: 0 })}%`,
                      icon: Activity,
                      accent: 'from-sky-500 to-sky-600',
                    },
                    {
                      key: 'upcoming' as const,
                      label: t('analytics.household.stats.upcoming'),
                      value: formatNumber(householdStats.upcomingCount, {
                        maximumFractionDigits: 0,
                      }),
                      icon: CalendarClock,
                      accent: 'from-purple-500 to-purple-600',
                    },
                  ].map((item) => (
                    <div
                      key={item.key}
                      className="hover:-translate-y-1 rounded-2xl border border-dark-100 bg-white p-4 shadow-sm transition hover:shadow-lg dark:border-dark-700 dark:bg-dark-900/30"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div
                          className={`rounded-xl bg-gradient-to-br ${item.accent} p-2 text-white shadow-inner`}
                        >
                          <item.icon className="h-5 w-5" aria-hidden="true" />
                        </div>
                      </div>
                      <div className="font-semibold text-2xl text-dark-900 dark:text-dark-50">
                        {item.value}
                      </div>
                      <div className="mt-1 text-dark-500 text-sm dark:text-dark-300">
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-8 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dark-200 border-dashed bg-dark-50/60 p-8 text-center text-dark-500 dark:border-dark-700 dark:bg-dark-900/30 dark:text-dark-300">
                  <CalendarClock className="h-12 w-12 text-primary-400" aria-hidden="true" />
                  <p className="max-w-md text-sm sm:text-base">{t('analytics.household.empty')}</p>
                </div>
              )}
            </motion.div>

            {hasAnyHouseholdBills && (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="card p-4 sm:p-6"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 font-semibold text-dark-900 text-lg sm:text-xl dark:text-dark-50">
                      <BarChart3
                        className="h-5 w-5 text-primary-500 sm:h-6 sm:w-6"
                        aria-hidden="true"
                      />
                      {t('analytics.household.monthlyTrend')}
                    </h3>
                  </div>

                  <div className="h-64 sm:h-80">
                    {householdMonthlyData.some((item) => item.total > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={householdMonthlyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.4} />
                          <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickMargin={10} />
                          <YAxis
                            stroke="#64748b"
                            fontSize={12}
                            tickMargin={10}
                            tickFormatter={(v) =>
                              `${formatNumber(v, { maximumFractionDigits: 0 })}`
                            }
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              border: 'none',
                              borderRadius: '12px',
                              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            }}
                            formatter={(value: number, key: string) => {
                              const label =
                                key === 'paid'
                                  ? t('analytics.household.chartPaid')
                                  : t('analytics.household.chartOutstanding')
                              return [formatCurrency(value), label]
                            }}
                          />
                          <Bar dataKey="paid" stackId="a" fill="#34d399" radius={[6, 6, 0, 0]} />
                          <Bar
                            dataKey="outstanding"
                            stackId="a"
                            fill="#fb923c"
                            radius={[6, 6, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-dark-500 dark:text-dark-300">
                        {t('analytics.household.noDataInRange')}
                      </div>
                    )}
                  </div>
                </motion.div>

                <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    className="card p-4 sm:p-6"
                  >
                    <h3 className="mb-4 flex items-center gap-2 font-semibold text-dark-900 text-lg sm:text-xl dark:text-dark-50">
                      <PieChartIcon
                        className="h-5 w-5 text-primary-500 sm:h-6 sm:w-6"
                        aria-hidden="true"
                      />
                      {t('analytics.household.typeDistribution')}
                    </h3>

                    {householdTypeData.length > 0 ? (
                      <div className="h-60 sm:h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={householdTypeData}
                            layout="vertical"
                            margin={{ left: 16, right: 16, top: 8, bottom: 8 }}
                          >
                            <CartesianGrid
                              horizontal={false}
                              strokeDasharray="3 3"
                              stroke="#e2e8f0"
                            />
                            <XAxis type="number" hide domain={[0, 'dataMax']} />
                            <YAxis
                              dataKey="label"
                              type="category"
                              width={120}
                              tick={{ fill: '#475569', fontSize: 12 }}
                            />
                            <Tooltip
                              cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }}
                              contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                border: 'none',
                                borderRadius: '12px',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                              }}
                              formatter={(value: number) => formatCurrency(value)}
                            />
                            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                              {householdTypeData.map((entry) => (
                                <Cell key={entry.key} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex h-48 items-center justify-center text-dark-500 dark:text-dark-300">
                        {t('analytics.household.noTypeData')}
                      </div>
                    )}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                    className="card p-4 sm:p-6"
                  >
                    <h3 className="mb-4 flex items-center gap-2 font-semibold text-dark-900 text-lg sm:text-xl dark:text-dark-50">
                      <Activity
                        className="h-5 w-5 text-primary-500 sm:h-6 sm:w-6"
                        aria-hidden="true"
                      />
                      {t('analytics.household.statusBreakdown')}
                    </h3>

                    {householdStatusData.length > 0 ? (
                      <div className="h-60 sm:h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={householdStatusData}
                              dataKey="value"
                              nameKey="label"
                              cx="50%"
                              cy="50%"
                              innerRadius={isSmall ? 40 : 60}
                              outerRadius={isSmall ? 70 : 90}
                              paddingAngle={3}
                            >
                              {householdStatusData.map((entry) => (
                                <Cell key={entry.key} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: number, name: string) => [value, name]}
                              contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                border: 'none',
                                borderRadius: '12px',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex h-48 items-center justify-center text-dark-500 dark:text-dark-300">
                        {t('analytics.household.noStatusData')}
                      </div>
                    )}
                  </motion.div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.1 }}
                    className="card p-4 sm:p-6"
                  >
                    <h3 className="mb-4 flex items-center gap-2 font-semibold text-dark-900 text-lg sm:text-xl dark:text-dark-50">
                      <CalendarClock
                        className="h-5 w-5 text-primary-500 sm:h-6 sm:w-6"
                        aria-hidden="true"
                      />
                      {t('analytics.household.upcomingBills')}
                    </h3>

                    {upcomingBills.length > 0 ? (
                      <div className="space-y-4">
                        {upcomingBills.map((bill) => {
                          const dueDate =
                            bill.dueDate instanceof Date ? bill.dueDate : new Date(bill.dueDate)
                          const daysDiff = differenceInCalendarDays(dueDate, new Date())
                          const dueLabel =
                            daysDiff === 0
                              ? t('analytics.household.dueToday')
                              : daysDiff === 1
                                ? t('analytics.household.dueTomorrow')
                                : t('analytics.household.dueInDays', { count: daysDiff })

                          return (
                            <div
                              key={`${bill.provider}-${dueDate.toISOString()}`}
                              className="hover:-translate-y-1 flex flex-col gap-2 rounded-2xl border border-dark-100 p-4 shadow-sm transition hover:shadow-lg dark:border-dark-700 dark:bg-dark-900/40"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <div className="flex items-center gap-2 font-semibold text-dark-900 dark:text-dark-50">
                                    {bill.provider || t('analytics.household.unknownProvider')}
                                  </div>
                                  <div className="text-dark-500 text-sm dark:text-dark-300">
                                    {t(`household.${bill.billType}` as const)}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-dark-900 dark:text-dark-50">
                                    {formatCurrency(bill.amount)}
                                  </div>
                                  <div className="text-dark-500 text-xs dark:text-dark-400">
                                    {dueLabel}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-dark-500 text-xs uppercase tracking-wide dark:text-dark-400">
                                <span>
                                  {t('analytics.household.payBy', { date: formatDate(dueDate) })}
                                </span>
                                <span>{t(HOUSEHOLD_STATUS_LABEL_KEYS[bill.status])}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="flex h-48 items-center justify-center text-dark-500 dark:text-dark-300">
                        {t('analytics.household.noUpcoming')}
                      </div>
                    )}
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2 }}
                    className="card p-4 sm:p-6"
                  >
                    <h3 className="mb-4 flex items-center gap-2 font-semibold text-dark-900 text-lg sm:text-xl dark:text-dark-50">
                      <TrendingUp
                        className="h-5 w-5 text-primary-500 sm:h-6 sm:w-6"
                        aria-hidden="true"
                      />
                      {t('analytics.household.consumptionTitle')}
                    </h3>

                    {latestConsumption.length > 0 ? (
                      <div className="space-y-3">
                        {latestConsumption.map((entry) => {
                          const periodLabel =
                            entry.periodStart && entry.periodEnd
                              ? t('analytics.household.consumptionPeriod', {
                                  start: formatDate(entry.periodStart),
                                  end: formatDate(entry.periodEnd),
                                })
                              : entry.periodEnd
                                ? formatDate(entry.periodEnd)
                                : entry.periodStart
                                  ? formatDate(entry.periodStart)
                                  : null

                          return (
                            <div
                              key={`${entry.provider}-${entry.dueDate.toISOString()}-${entry.billType}`}
                              className="hover:-translate-y-1 rounded-2xl border border-dark-100 p-4 shadow-sm transition hover:shadow-lg dark:border-dark-700 dark:bg-dark-900/40"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <div className="font-semibold text-dark-900 dark:text-dark-50">
                                    {entry.provider || t('analytics.household.unknownProvider')}
                                  </div>
                                  <div className="text-dark-500 text-xs uppercase tracking-wide dark:text-dark-400">
                                    {t(`household.${entry.billType}` as const)}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-dark-900 dark:text-dark-50">
                                    {formatCurrency(entry.amount)}
                                  </div>
                                  <div className="text-dark-500 text-xs dark:text-dark-400">
                                    {formatNumber(entry.consumptionValue, {
                                      maximumFractionDigits: 2,
                                    })}{' '}
                                    {t(CONSUMPTION_UNIT_LABEL_KEYS[entry.consumptionUnit])}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-dark-500 text-xs uppercase tracking-wide dark:text-dark-400">
                                {periodLabel ? (
                                  <span>{periodLabel}</span>
                                ) : (
                                  <span>{t('analytics.household.periodUnknown')}</span>
                                )}
                                <span>
                                  {t('analytics.household.payBy', {
                                    date: formatDate(entry.dueDate),
                                  })}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="flex h-48 items-center justify-center text-dark-500 dark:text-dark-300">
                        {t('analytics.household.noConsumptionData')}
                      </div>
                    )}
                  </motion.div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </PageTransition>
  )
}

export default memo(AnalyticsPage)
