import type { HouseholdBill } from '@lib/db'
import { formatCurrency } from '@lib/utils'
import {
  differenceInCalendarDays,
  eachMonthOfInterval,
  endOfMonth,
  format,
  startOfMonth,
  subMonths,
} from 'date-fns'
import { motion } from 'framer-motion'
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
  Loader2,
  PieChart as PieChartIcon,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useState } from 'react'
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
} from 'recharts'
import { PageTransition } from '@/components/common/PageTransition'
import { useDevices, useHouseholdBills, useReceipts } from '@/hooks/useDatabase'

// ─────────────────────────────────────────────────────────────
// Types & constants
// ─────────────────────────────────────────────────────────────
type TimePeriod = '3m' | '6m' | '12m' | 'all'

const CHART_COLORS = {
  primary: '#0ea5e9',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#a855f7',
  pink: '#ec4899',
  slate: '#94a3b8',
}

// Normalized category keys → colors
const CATEGORY_COLORS = {
  groceries: CHART_COLORS.success,
  electronics: CHART_COLORS.warning,
  clothing: CHART_COLORS.pink,
  health: CHART_COLORS.danger,
  home: CHART_COLORS.purple,
  automotive: CHART_COLORS.primary,
  entertainment: '#22c55e',
  education: '#06b6d4',
  sports: '#e11d48',
  other: CHART_COLORS.slate,
} as const

type CategoryKey = keyof typeof CATEGORY_COLORS

const CATEGORY_LABEL_KEYS: Record<CategoryKey, `categories.${CategoryKey}`> = {
  groceries: 'categories.groceries',
  electronics: 'categories.electronics',
  clothing: 'categories.clothing',
  health: 'categories.health',
  home: 'categories.home',
  automotive: 'categories.automotive',
  entertainment: 'categories.entertainment',
  education: 'categories.education',
  sports: 'categories.sports',
  other: 'categories.other',
}

// Map *stored* category strings (sr/slug) → normalized i18n keys
const mapCategoryKey = (raw: string | undefined): CategoryKey => {
  const k = (raw || '').toLowerCase().trim()
  const dict: Record<string, keyof typeof CATEGORY_COLORS> = {
    // sr values
    hrana: 'groceries',
    'hrana i piće': 'groceries',
    elektronika: 'electronics',
    tehnologija: 'electronics',
    odeca: 'clothing',
    odeća: 'clothing',
    zdravlje: 'health',
    dom: 'home',
    'kucni-aparati': 'home',
    'kućni aparati': 'home',
    automobil: 'automotive',
    auto: 'automotive',
    zabava: 'entertainment',
    edukacija: 'education',
    sport: 'sports',
    transport: 'other',
    ostalo: 'other',
  }
  return dict[k] ?? 'other'
}

const HOUSEHOLD_TYPE_COLORS: Record<HouseholdBill['billType'], string> = {
  electricity: '#f97316',
  water: '#0ea5e9',
  gas: '#facc15',
  heating: '#ef4444',
  internet: '#6366f1',
  phone: '#06b6d4',
  tv: '#ec4899',
  rent: '#8b5cf6',
  maintenance: '#22c55e',
  garbage: '#94a3b8',
  other: '#64748b',
}

const HOUSEHOLD_STATUS_COLORS = {
  pending: '#fbbf24',
  paid: '#10b981',
  overdue: '#ef4444',
} as const

const HOUSEHOLD_STATUS_LABEL_KEYS: Record<
  HouseholdBill['status'],
  | 'analytics.household.statusLabels.pending'
  | 'analytics.household.statusLabels.paid'
  | 'analytics.household.statusLabels.overdue'
> = {
  pending: 'analytics.household.statusLabels.pending',
  paid: 'analytics.household.statusLabels.paid',
  overdue: 'analytics.household.statusLabels.overdue',
}

const UPCOMING_WINDOW_DAYS = 30

const CONSUMPTION_UNIT_LABEL_KEYS = {
  kWh: 'analytics.household.consumptionUnits.kwh',
  'm³': 'analytics.household.consumptionUnits.m3',
  L: 'analytics.household.consumptionUnits.l',
  GB: 'analytics.household.consumptionUnits.gb',
  other: 'analytics.household.consumptionUnits.other',
} as const

type ConsumptionUnitLabelKey = keyof typeof CONSUMPTION_UNIT_LABEL_KEYS

const normalizeConsumptionUnit = (unit?: string): ConsumptionUnitLabelKey => {
  if (!unit) return 'other'
  const trimmed = unit.trim()
  if (trimmed === 'kWh' || trimmed.toLowerCase() === 'kwh') return 'kWh'
  if (trimmed === 'm³' || trimmed.toLowerCase() === 'm3') return 'm³'
  if (trimmed === 'L' || trimmed.toLowerCase() === 'l' || trimmed.toLowerCase() === 'litre')
    return 'L'
  if (trimmed.toUpperCase() === 'GB') return 'GB'
  return 'other'
}

// ─────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { t, i18n } = useTranslation()
  const receipts = useReceipts()
  const devices = useDevices()
  const householdBills = useHouseholdBills()
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('6m')

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

  // Calculate date range (for "all" use earliest receipt date if available)
  const dateRange = useMemo(() => {
    const now = new Date()
    if (timePeriod === '3m') return { start: subMonths(now, 3), end: now }
    if (timePeriod === '6m') return { start: subMonths(now, 6), end: now }
    if (timePeriod === '12m') return { start: subMonths(now, 12), end: now }

    const earliest = receipts?.length
      ? new Date(Math.min(...receipts.map((r) => new Date(r.date).getTime())))
      : new Date(2020, 0, 1)
    return { start: earliest, end: now }
  }, [timePeriod, receipts])

  // Filter receipts by date range
  const filteredReceipts = useMemo(() => {
    if (!receipts?.length) return [] as NonNullable<typeof receipts>
    return receipts.filter((r) => {
      const d = new Date(r.date)
      return d >= dateRange.start && d <= dateRange.end
    })
  }, [receipts, dateRange])

  // Monthly spending data (include all months in range even if 0)
  const monthlyData = useMemo(() => {
    const months = eachMonthOfInterval({
      start: startOfMonth(dateRange.start),
      end: endOfMonth(dateRange.end),
    })
    return months.map((month) => {
      const mStart = startOfMonth(month)
      const mEnd = endOfMonth(month)
      const monthReceipts = filteredReceipts.filter((r) => {
        const d = new Date(r.date)
        return d >= mStart && d <= mEnd
      })
      const total = monthReceipts.reduce((sum, r) => sum + (r.totalAmount || 0), 0)
      return {
        month: format(month, 'MMM'),
        amount: total,
        count: monthReceipts.length,
      }
    })
  }, [filteredReceipts, dateRange])

  // Category spending data (normalized → i18n labels)
  type CategoryDatum = { key: CategoryKey; name: string; value: number; color: string }

  type HouseholdMonthlyDatum = {
    month: string
    total: number
    paid: number
    outstanding: number
  }

  type HouseholdTypeDatum = {
    key: HouseholdBill['billType']
    label: string
    value: number
    color: string
  }

  type HouseholdStatusDatum = {
    key: HouseholdBill['status']
    label: string
    value: number
    color: string
  }

  const categoryData = useMemo(() => {
    if (!filteredReceipts.length) return [] as CategoryDatum[]
    const acc: Partial<Record<CategoryKey, number>> = {}
    filteredReceipts.forEach((r) => {
      const key = mapCategoryKey(r.category)
      acc[key] = (acc[key] || 0) + (r.totalAmount || 0)
    })
    return (Object.entries(acc) as [CategoryKey, number][])
      .map(([key, value]) => ({
        key,
        name: t(CATEGORY_LABEL_KEYS[key]),
        value,
        color: CATEGORY_COLORS[key],
      }))
      .sort((a, b) => b.value - a.value)
  }, [filteredReceipts, t])

  // Top merchants (total & count)
  const topMerchants = useMemo(() => {
    if (!filteredReceipts.length) return [] as Array<{ name: string; total: number; count: number }>
    const map: Record<string, { total: number; count: number }> = {}
    filteredReceipts.forEach((r) => {
      const name = r.merchantName?.trim() || '—'
      if (!map[name]) map[name] = { total: 0, count: 0 }
      map[name].total += r.totalAmount || 0
      map[name].count += 1
    })
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }, [filteredReceipts])

  const householdFiltered = useMemo<HouseholdBill[]>(() => {
    if (!householdBills?.length) return []
    return householdBills.filter((bill) => {
      const dueDate = bill.dueDate instanceof Date ? bill.dueDate : new Date(bill.dueDate)
      return dueDate >= dateRange.start && dueDate <= dateRange.end
    })
  }, [householdBills, dateRange])

  const householdMonthlyData = useMemo<HouseholdMonthlyDatum[]>(() => {
    const months = eachMonthOfInterval({
      start: startOfMonth(dateRange.start),
      end: endOfMonth(dateRange.end),
    })

    return months.map((month) => {
      const mStart = startOfMonth(month)
      const mEnd = endOfMonth(month)
      const monthBills = householdFiltered.filter((bill) => {
        const dueDate = bill.dueDate instanceof Date ? bill.dueDate : new Date(bill.dueDate)
        return dueDate >= mStart && dueDate <= mEnd
      })

      const total = monthBills.reduce((sum, bill) => sum + (bill.amount || 0), 0)
      const paid = monthBills
        .filter((bill) => bill.status === 'paid')
        .reduce((sum, bill) => sum + (bill.amount || 0), 0)
      const outstanding = Math.max(total - paid, 0)

      return {
        month: format(month, 'MMM'),
        total,
        paid,
        outstanding,
      }
    })
  }, [householdFiltered, dateRange])

  const householdTypeData = useMemo<HouseholdTypeDatum[]>(() => {
    if (!householdFiltered.length) return []
    const totals = new Map<HouseholdBill['billType'], number>()
    householdFiltered.forEach((bill) => {
      const key = bill.billType
      totals.set(key, (totals.get(key) || 0) + (bill.amount || 0))
    })

    return Array.from(totals.entries())
      .map(([key, value]) => ({
        key,
        label: t(`household.${key}` as const),
        value,
        color: HOUSEHOLD_TYPE_COLORS[key] ?? HOUSEHOLD_TYPE_COLORS.other,
      }))
      .sort((a, b) => b.value - a.value)
  }, [householdFiltered, t])

  const householdStatusData = useMemo<HouseholdStatusDatum[]>(() => {
    if (!householdFiltered.length) return []

    const counts: Record<HouseholdBill['status'], number> = {
      pending: 0,
      paid: 0,
      overdue: 0,
    }

    householdFiltered.forEach((bill) => {
      counts[bill.status] += 1
    })

    return (Object.keys(counts) as HouseholdBill['status'][])
      .map((key) => ({
        key,
        label: t(HOUSEHOLD_STATUS_LABEL_KEYS[key]),
        value: counts[key],
        color: HOUSEHOLD_STATUS_COLORS[key],
      }))
      .filter((item) => item.value > 0)
  }, [householdFiltered, t])

  const upcomingBills = useMemo(() => {
    if (!householdBills?.length) return []
    const now = new Date()
    return householdBills
      .filter((bill) => {
        if (bill.status === 'paid') return false
        const dueDate = bill.dueDate instanceof Date ? bill.dueDate : new Date(bill.dueDate)
        const diff = differenceInCalendarDays(dueDate, now)
        return diff >= 0 && diff <= UPCOMING_WINDOW_DAYS
      })
      .sort((a, b) => {
        const dueA = a.dueDate instanceof Date ? a.dueDate : new Date(a.dueDate)
        const dueB = b.dueDate instanceof Date ? b.dueDate : new Date(b.dueDate)
        return dueA.getTime() - dueB.getTime()
      })
      .slice(0, 4)
  }, [householdBills])

  const householdStats = useMemo(() => {
    if (!householdFiltered.length)
      return {
        totalPaid: 0,
        outstanding: 0,
        averageBill: 0,
        onTimeRate: null as number | null,
        upcomingCount: upcomingBills.length,
      }

    const paidBills = householdFiltered.filter((bill) => bill.status === 'paid')
    const totalPaid = paidBills.reduce((sum, bill) => sum + (bill.amount || 0), 0)
    const outstanding = householdFiltered
      .filter((bill) => bill.status !== 'paid')
      .reduce((sum, bill) => sum + (bill.amount || 0), 0)
    const averageBill = paidBills.length ? totalPaid / paidBills.length : 0
    const onTimePayments = paidBills.filter((bill) => {
      if (!bill.paymentDate) return false
      const paymentDate =
        bill.paymentDate instanceof Date ? bill.paymentDate : new Date(bill.paymentDate)
      const dueDate = bill.dueDate instanceof Date ? bill.dueDate : new Date(bill.dueDate)
      return paymentDate.getTime() <= dueDate.getTime()
    }).length

    const onTimeRate = paidBills.length ? (onTimePayments / paidBills.length) * 100 : null

    return {
      totalPaid,
      outstanding,
      averageBill,
      onTimeRate,
      upcomingCount: upcomingBills.length,
    }
  }, [householdFiltered, upcomingBills])

  const latestConsumption = useMemo(() => {
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

  const isLoading = receipts === undefined || devices === undefined

  if (isLoading) {
    return (
      <PageTransition>
        <div className="flex min-h-[60vh] flex-col items-center justify-center" aria-live="polite">
          <Loader2 className="h-10 w-10 animate-spin text-primary-500" aria-hidden="true" />
          <p className="mt-4 text-dark-500 text-sm dark:text-dark-400">{t('analytics.loading')}</p>
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
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY }}
            className="-top-24 -right-24 absolute h-96 w-96 rounded-full bg-white/20 blur-3xl"
          />
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY }}
            className="-bottom-32 -left-32 absolute h-96 w-96 rounded-full bg-primary-300/30 blur-3xl"
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
                  whileHover={{ scale: 1.05 }}
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

        {/* Monthly Spending */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card p-4 sm:p-6"
        >
          <div className="mb-6 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold text-dark-900 text-lg sm:text-xl dark:text-dark-50">
              <BarChart3 className="h-5 w-5 text-primary-500 sm:h-6 sm:w-6" aria-hidden="true" />
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
              <PieChartIcon className="h-5 w-5 text-primary-500 sm:h-6 sm:w-6" aria-hidden="true" />
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
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
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
      </div>

      {/* Household Analytics */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="card p-4 sm:p-6"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-bold text-dark-900 text-lg sm:text-xl dark:text-dark-50">
              <Home className="h-5 w-5 text-primary-500 sm:h-6 sm:w-6" aria-hidden="true" />
              {t('analytics.household.title')}
            </h2>
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
                value: formatNumber(householdStats.upcomingCount, { maximumFractionDigits: 0 }),
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
                <div className="mt-1 text-dark-500 text-sm dark:text-dark-300">{item.label}</div>
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
                <BarChart3 className="h-5 w-5 text-primary-500 sm:h-6 sm:w-6" aria-hidden="true" />
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
                      tickFormatter={(v) => `${formatNumber(v, { maximumFractionDigits: 0 })}`}
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
                    <Bar dataKey="outstanding" stackId="a" fill="#fb923c" radius={[6, 6, 0, 0]} />
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
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e2e8f0" />
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
                <Activity className="h-5 w-5 text-primary-500 sm:h-6 sm:w-6" aria-hidden="true" />
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
                <TrendingUp className="h-5 w-5 text-primary-500 sm:h-6 sm:w-6" aria-hidden="true" />
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
                              {formatNumber(entry.consumptionValue, { maximumFractionDigits: 2 })}{' '}
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
                            {t('analytics.household.payBy', { date: formatDate(entry.dueDate) })}
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
    </PageTransition>
  )
}
