import { eachMonthOfInterval, endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { motion } from 'framer-motion'
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Award,
  BarChart3,
  DollarSign,
  Loader2,
  PieChart as PieChartIcon,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Area,
  AreaChart,
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
import { useDevices, useReceipts } from '@/hooks/useDatabase'
import { formatCurrency } from '@/lib'

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
    'hrana': 'groceries',
    'hrana i piće': 'groceries',
    'elektronika': 'electronics',
    'tehnologija': 'electronics',
    'odeca': 'clothing',
    'odeća': 'clothing',
    'zdravlje': 'health',
    'dom': 'home',
    'kucni-aparati': 'home',
    'kućni aparati': 'home',
    'automobil': 'automotive',
    'auto': 'automotive',
    'zabava': 'entertainment',
    'edukacija': 'education',
    'sport': 'sports',
    'transport': 'other',
    'ostalo': 'other',
  }
  return dict[k] ?? 'other'
}

// ─────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { t } = useTranslation()
  const receipts = useReceipts()
  const devices = useDevices()
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('6m')

  // Gradient ID (stable & sanitized)
  const rawGradientId = useId()
  const gradientId = `${(rawGradientId || 'g').replace(/[^a-zA-Z0-9_-]/g, '')}-amount` as const

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
    const months = eachMonthOfInterval({ start: startOfMonth(dateRange.start), end: endOfMonth(dateRange.end) })
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

  const categoryData = useMemo(() => {
    if (!filteredReceipts.length) return [] as CategoryDatum[]
    const acc: Partial<Record<CategoryKey, number>> = {}
    filteredReceipts.forEach((r) => {
      const key = mapCategoryKey(r.category)
      acc[key] = (acc[key] || 0) + (r.totalAmount || 0)
    })
    return (Object.entries(acc) as Array<[CategoryKey, number]>)
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
        <div className="flex flex-col items-center justify-center min-h-[60vh]" role="status" aria-live="polite">
          <Loader2 className="h-10 w-10 animate-spin text-primary-500" aria-hidden="true" />
          <p className="mt-4 text-sm text-dark-500 dark:text-dark-400">{t('analytics.loading')}</p>
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
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-purple-900 p-6 sm:p-8 text-white shadow-2xl"
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
            className="absolute -top-24 -right-24 w-96 h-96 bg-white/20 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY }}
            className="absolute -bottom-32 -left-32 w-96 h-96 bg-primary-300/30 rounded-full blur-3xl"
          />

          <div className="relative z-10">
            {/* Title + period selector */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <Activity className="w-7 h-7" aria-hidden="true" />
                <h1 className="text-3xl sm:text-4xl font-black">{t('analytics.heroTitle')}</h1>
              </div>

              <div className="flex gap-2 p-1 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20" role="tablist" aria-label="Period">
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
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm font-semibold transition-all ${
                      timePeriod === key ? 'bg-white text-primary-600 shadow-lg' : 'text-white/70 hover:text-white hover:bg-white/10'
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[
                { label: t('analytics.statsTotal'), value: formatCurrency(stats.total), icon: DollarSign, change: stats.change },
                { label: t('analytics.statsAverage'), value: formatCurrency(stats.avg), icon: TrendingUp },
                { label: t('analytics.statsCount'), value: stats.count, icon: ShoppingCart },
                { label: t('analytics.statsDevices'), value: stats.devices, icon: Award },
              ].map((stat) => (
                <motion.div key={String(stat.label)} whileHover={{ scale: 1.05 }} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-white/20">
                  <div className="flex items-start justify-between mb-2">
                    <div className="p-2 rounded-xl bg-white/20">
                      <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" aria-hidden="true" />
                    </div>
                    {stat.change !== undefined && (
                      <div className={`flex items-center gap-1 text-xs font-semibold ${stat.change >= 0 ? 'text-white' : 'text-white/70'}`}>
                        {stat.change >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        {Math.abs(stat.change).toFixed(1)}%
                      </div>
                    )}
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold mb-1 truncate">{String(stat.value)}</div>
                  <div className="text-xs sm:text-sm text-white/70 truncate uppercase tracking-wide font-semibold">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Monthly Spending */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-dark-900 dark:text-dark-50 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-primary-500" aria-hidden="true" />
              {t('analytics.monthlySpending')}
            </h2>
          </div>

          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} role="img" aria-label={t('analytics.monthlySpending') || 'Monthly spending'}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickMargin={10} />
                <YAxis stroke="#64748b" fontSize={12} tickMargin={10} tickFormatter={(v) => `${(v as number / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: 'none', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                  formatter={(value: number) => [formatCurrency(value), t('receipts.total') || 'Total']}
                  labelFormatter={(label) => String(label)}
                />
                <Area type="monotone" dataKey="amount" stroke={CHART_COLORS.primary} strokeWidth={3} fillOpacity={1} fill={`url(#${gradientId})`} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Category & Top Merchants */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Category Distribution */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="card p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-dark-900 dark:text-dark-50 mb-6 flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary-500" aria-hidden="true" />
              {t('analytics.categories')}
            </h2>

            {categoryData.length > 0 ? (
              <>
                <div className="h-48 sm:h-64 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={isSmall ? 40 : 60} outerRadius={isSmall ? 70 : 90} paddingAngle={2} dataKey="value">
                        {categoryData.map((entry) => (
                          <Cell key={entry.key} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: 'none', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2">
                  {categoryData.map((cat) => (
                    <div key={cat.key} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="text-dark-700 dark:text-dark-300 truncate">{cat.name}</span>
                      </div>
                      <span className="font-semibold text-dark-900 dark:text-dark-50 ml-2">{formatCurrency(cat.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-dark-500">{t('analytics.noData')}</div>
            )}
          </motion.div>

          {/* Top Merchants */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }} className="card p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-dark-900 dark:text-dark-50 mb-6 flex items-center gap-2">
              <Award className="w-5 h-5 sm:w-6 sm:h-6 text-primary-500" aria-hidden="true" />
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
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">
                            {index + 1}
                          </div>
                          <span className="font-medium text-dark-900 dark:text-dark-50 truncate">{merchant.name}</span>
                        </div>
                        <div className="text-right ml-2 flex-shrink-0">
                          <div className="font-bold text-dark-900 dark:text-dark-50">{formatCurrency(merchant.total)}</div>
                          <div className="text-xs text-dark-500">{merchant.count} {t('analytics.receiptsCount')}</div>
                        </div>
                      </div>
                      <div className="h-2 bg-dark-100 dark:bg-dark-800 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 0.5, delay: index * 0.1 }} className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full" />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-dark-500">{t('analytics.noData')}</div>
            )}
          </motion.div>
        </div>
      </div>
    </PageTransition>
  )
}
