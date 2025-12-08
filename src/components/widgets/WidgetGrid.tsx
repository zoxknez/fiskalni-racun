/**
 * Widget Grid Component
 *
 * Customizable dashboard widgets for home screen
 */

import { formatCurrency } from '@lib/utils'
import { differenceInCalendarDays, endOfMonth, startOfMonth, subMonths } from 'date-fns'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Calendar,
  CreditCard,
  Package,
  Receipt,
  Shield,
  TrendingUp,
} from 'lucide-react'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useDevices, useReceipts } from '@/hooks/useDatabase'

export type WidgetType =
  | 'monthly-spending'
  | 'receipts-count'
  | 'active-warranties'
  | 'expiring-soon'
  | 'spending-trend'
  | 'category-top'

// Skeleton component for loading states
const WidgetSkeleton = memo<{ className?: string }>(({ className = '' }) => (
  <div className={`animate-pulse rounded-2xl bg-dark-200 p-4 dark:bg-dark-700 ${className}`}>
    <div className="flex items-start justify-between">
      <div>
        <div className="h-4 w-24 rounded bg-dark-300 dark:bg-dark-600" />
        <div className="mt-2 h-8 w-20 rounded bg-dark-300 dark:bg-dark-600" />
      </div>
      <div className="h-10 w-10 rounded-xl bg-dark-300 dark:bg-dark-600" />
    </div>
    <div className="mt-3 h-4 w-32 rounded bg-dark-300 dark:bg-dark-600" />
  </div>
))
WidgetSkeleton.displayName = 'WidgetSkeleton'

// Monthly Spending Widget
const MonthlySpendingWidget = memo(() => {
  const { t } = useTranslation()
  const receipts = useReceipts()

  const { currentMonth, trend, isLoading } = useMemo(() => {
    if (receipts === undefined) return { currentMonth: 0, trend: 0, isLoading: true }
    if (!receipts) return { currentMonth: 0, trend: 0, isLoading: false }

    const now = new Date()
    const startCurrent = startOfMonth(now)
    const endCurrent = endOfMonth(now)
    const startPrevious = startOfMonth(subMonths(now, 1))
    const endPrevious = endOfMonth(subMonths(now, 1))

    const currentMonthReceipts = receipts.filter((r) => {
      const date = new Date(r.date)
      return date >= startCurrent && date <= endCurrent
    })

    const previousMonthReceipts = receipts.filter((r) => {
      const date = new Date(r.date)
      return date >= startPrevious && date <= endPrevious
    })

    const currentTotal = currentMonthReceipts.reduce((sum, r) => sum + r.totalAmount, 0)
    const previousTotal = previousMonthReceipts.reduce((sum, r) => sum + r.totalAmount, 0)

    const trendValue =
      previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0

    return {
      currentMonth: currentTotal,
      trend: trendValue,
      isLoading: false,
    }
  }, [receipts])

  if (isLoading) {
    return <WidgetSkeleton className="bg-primary-200 dark:bg-primary-900" />
  }

  return (
    <Link to="/analytics">
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 p-4 text-white shadow-lg"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-primary-100 text-sm">{t('widgets.monthlySpending')}</p>
            <p className="mt-1 font-bold text-2xl">{formatCurrency(currentMonth)}</p>
          </div>
          <div className="rounded-xl bg-white/20 p-2">
            <CreditCard className="h-6 w-6" />
          </div>
        </div>

        {trend !== 0 && (
          <div
            className={`mt-3 flex items-center gap-1 text-sm ${trend > 0 ? 'text-red-200' : 'text-green-200'}`}
          >
            {trend > 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            <span>
              {Math.abs(trend).toFixed(1)}% {t('widgets.vsLastMonth')}
            </span>
          </div>
        )}

        {/* Decorative element */}
        <div className="absolute -right-4 -bottom-4 h-20 w-20 rounded-full bg-white/10" />
      </motion.div>
    </Link>
  )
})
MonthlySpendingWidget.displayName = 'MonthlySpendingWidget'

// Receipts Count Widget
const ReceiptsCountWidget = memo(() => {
  const { t } = useTranslation()
  const receipts = useReceipts()

  const { thisMonth, total, isLoading } = useMemo(() => {
    if (receipts === undefined) return { thisMonth: 0, total: 0, isLoading: true }
    if (!receipts) return { thisMonth: 0, total: 0, isLoading: false }

    const now = new Date()
    const startCurrent = startOfMonth(now)

    const thisMonthCount = receipts.filter((r) => new Date(r.date) >= startCurrent).length

    return {
      thisMonth: thisMonthCount,
      total: receipts.length,
      isLoading: false,
    }
  }, [receipts])

  if (isLoading) {
    return <WidgetSkeleton className="bg-emerald-200 dark:bg-emerald-900" />
  }

  return (
    <Link to="/receipts">
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 text-white shadow-lg"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-emerald-100 text-sm">{t('widgets.receiptsThisMonth')}</p>
            <p className="mt-1 font-bold text-2xl">{thisMonth}</p>
          </div>
          <div className="rounded-xl bg-white/20 p-2">
            <Receipt className="h-6 w-6" />
          </div>
        </div>

        <p className="mt-2 text-emerald-200 text-sm">
          {t('widgets.totalReceipts', { count: total })}
        </p>

        <div className="absolute -right-4 -bottom-4 h-20 w-20 rounded-full bg-white/10" />
      </motion.div>
    </Link>
  )
})
ReceiptsCountWidget.displayName = 'ReceiptsCountWidget'

// Active Warranties Widget
const ActiveWarrantiesWidget = memo(() => {
  const { t } = useTranslation()
  const devices = useDevices()

  const { active, total, isLoading } = useMemo(() => {
    if (devices === undefined) return { active: 0, total: 0, isLoading: true }
    if (!devices) return { active: 0, total: 0, isLoading: false }

    const now = new Date()
    const activeCount = devices.filter((d) => new Date(d.warrantyExpiry) > now).length

    return {
      active: activeCount,
      total: devices.length,
      isLoading: false,
    }
  }, [devices])

  if (isLoading) {
    return <WidgetSkeleton className="bg-violet-200 dark:bg-violet-900" />
  }

  return (
    <Link to="/warranties">
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 p-4 text-white shadow-lg"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-violet-100 text-sm">{t('widgets.activeWarranties')}</p>
            <p className="mt-1 font-bold text-2xl">{active}</p>
          </div>
          <div className="rounded-xl bg-white/20 p-2">
            <Shield className="h-6 w-6" />
          </div>
        </div>

        <p className="mt-2 text-violet-200 text-sm">
          {t('widgets.totalDevices', { count: total })}
        </p>

        <div className="absolute -right-4 -bottom-4 h-20 w-20 rounded-full bg-white/10" />
      </motion.div>
    </Link>
  )
})
ActiveWarrantiesWidget.displayName = 'ActiveWarrantiesWidget'

// Expiring Soon Widget
const ExpiringSoonWidget = memo(() => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const devices = useDevices()

  const expiring = useMemo(() => {
    if (!devices) return []

    const now = new Date()
    return devices
      .filter((d) => {
        const expiry = new Date(d.warrantyExpiry)
        const daysLeft = differenceInCalendarDays(expiry, now)
        return daysLeft > 0 && daysLeft <= 30
      })
      .sort(
        (a, b) =>
          differenceInCalendarDays(new Date(a.warrantyExpiry), now) -
          differenceInCalendarDays(new Date(b.warrantyExpiry), now)
      )
      .slice(0, 3)
  }, [devices])

  if (expiring.length === 0) return null

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-4 text-white shadow-lg"
    >
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5" />
        <span className="font-semibold">{t('widgets.expiringSoon')}</span>
      </div>

      <div className="space-y-2">
        {expiring.map((device) => {
          const daysLeft = differenceInCalendarDays(new Date(device.warrantyExpiry), new Date())
          return (
            <motion.button
              key={device.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(`/warranties/${device.id}`)}
              className="flex w-full items-center justify-between rounded-xl bg-white/20 p-2 text-left transition-colors hover:bg-white/30"
            >
              <span className="text-sm">
                {device.brand} {device.model}
              </span>
              <span className="rounded-full bg-white/30 px-2 py-0.5 text-xs">{daysLeft}d</span>
            </motion.button>
          )
        })}
      </div>
    </motion.div>
  )
})
ExpiringSoonWidget.displayName = 'ExpiringSoonWidget'

// Spending Trend Widget (mini chart)
const SpendingTrendWidget = memo(() => {
  const { t } = useTranslation()
  const receipts = useReceipts()

  const { trend, isUp, isLoading } = useMemo(() => {
    if (receipts === undefined) return { trend: [], isUp: false, isLoading: true }
    if (!receipts) return { trend: [], isUp: false, isLoading: false }

    const now = new Date()
    const months: number[] = []

    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i))
      const monthEnd = endOfMonth(subMonths(now, i))

      const total = receipts
        .filter((r) => {
          const date = new Date(r.date)
          return date >= monthStart && date <= monthEnd
        })
        .reduce((sum, r) => sum + r.totalAmount, 0)

      months.push(total)
    }

    const lastTwoMonths = months.slice(-2)
    const isUpTrend = (lastTwoMonths[1] ?? 0) > (lastTwoMonths[0] ?? 0)

    return { trend: months, isUp: isUpTrend, isLoading: false }
  }, [receipts])

  const maxValue = Math.max(...trend, 1)
  const heights = trend.map((v) => (v / maxValue) * 100)

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-2xl bg-white p-4 shadow-lg dark:bg-dark-800">
        <div className="mb-3 flex items-center justify-between">
          <div className="h-4 w-24 rounded bg-dark-200 dark:bg-dark-600" />
          <div className="h-5 w-5 rounded bg-dark-200 dark:bg-dark-600" />
        </div>
        <div className="flex h-16 items-end gap-1">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-dark-200 dark:bg-dark-600"
              style={{ height: `${30 + Math.random() * 50}%` }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <Link to="/analytics">
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="rounded-2xl bg-white p-4 shadow-lg dark:bg-dark-800"
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-dark-600 text-sm dark:text-dark-400">
            {t('widgets.spendingTrend')}
          </span>
          <TrendingUp className={`h-5 w-5 ${isUp ? 'text-red-500' : 'text-green-500'}`} />
        </div>

        <div className="flex h-16 items-end gap-1">
          {heights.map((height, idx) => (
            <motion.div
              key={idx}
              initial={{ height: 0 }}
              animate={{ height: `${height}%` }}
              transition={{ delay: idx * 0.1 }}
              className={`flex-1 rounded-t ${
                idx === heights.length - 1 ? 'bg-primary-500' : 'bg-dark-200 dark:bg-dark-600'
              }`}
            />
          ))}
        </div>

        <p className="mt-2 text-center text-dark-500 text-xs dark:text-dark-400">
          {t('widgets.last6Months')}
        </p>
      </motion.div>
    </Link>
  )
})
SpendingTrendWidget.displayName = 'SpendingTrendWidget'

// Quick Actions Widget
const QuickActionsWidget = memo(() => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const actions = [
    {
      icon: Receipt,
      label: t('widgets.addReceipt'),
      path: '/receipts/add',
      color: 'bg-primary-500',
    },
    {
      icon: Package,
      label: t('widgets.addDevice'),
      path: '/warranties/add',
      color: 'bg-violet-500',
    },
    {
      icon: Calendar,
      label: t('widgets.viewCalendar'),
      path: '/analytics',
      color: 'bg-emerald-500',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-2">
      {actions.map((action) => (
        <motion.button
          key={action.path}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate(action.path)}
          className={`${action.color} flex flex-col items-center justify-center rounded-xl p-3 text-white shadow-lg`}
        >
          <action.icon className="h-6 w-6" />
          <span className="mt-1 text-xs">{action.label}</span>
        </motion.button>
      ))}
    </div>
  )
})
QuickActionsWidget.displayName = 'QuickActionsWidget'

// Main Widget Grid Component
export const WidgetGrid = memo(() => {
  return (
    <div className="space-y-4">
      {/* Primary stats row */}
      <div className="grid grid-cols-2 gap-4">
        <MonthlySpendingWidget />
        <ReceiptsCountWidget />
      </div>

      {/* Secondary stats row */}
      <div className="grid grid-cols-2 gap-4">
        <ActiveWarrantiesWidget />
        <SpendingTrendWidget />
      </div>

      {/* Expiring warranties alert */}
      <ExpiringSoonWidget />

      {/* Quick actions */}
      <QuickActionsWidget />
    </div>
  )
})
WidgetGrid.displayName = 'WidgetGrid'

export default WidgetGrid
