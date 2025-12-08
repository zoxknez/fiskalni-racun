/**
 * DataStatsWidget Component
 *
 * Displays detailed statistics about user's data including
 * receipts, devices, storage usage, and activity metrics.
 */

import type { Device, Receipt } from '@lib/db'
import { differenceInDays, format, subDays } from 'date-fns'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Activity,
  Calendar,
  Database,
  HardDrive,
  Package,
  PieChart,
  Receipt as ReceiptIcon,
  Shield,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { memo, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface DataStatsWidgetProps {
  receipts: Receipt[] | undefined
  devices: Device[] | undefined
}

interface StorageStats {
  used: number
  quota: number
  percentage: number
}

function DataStatsWidgetComponent({ receipts, devices }: DataStatsWidgetProps) {
  const { t, i18n } = useTranslation()
  const prefersReducedMotion = useReducedMotion()
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null)

  // Get storage usage
  useEffect(() => {
    async function getStorage() {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
          const estimate = await navigator.storage.estimate()
          if (estimate.usage !== undefined && estimate.quota !== undefined) {
            setStorageStats({
              used: estimate.usage,
              quota: estimate.quota,
              percentage: (estimate.usage / estimate.quota) * 100,
            })
          }
        } catch {
          // Storage estimate not available
        }
      }
    }
    getStorage()
  }, [])

  // Calculate detailed stats
  const stats = useMemo(() => {
    if (!receipts) return null

    const now = new Date()
    const thirtyDaysAgo = subDays(now, 30)
    const sevenDaysAgo = subDays(now, 7)

    // Receipts stats
    const totalReceipts = receipts.length
    const recentReceipts = receipts.filter((r) => new Date(r.date) >= thirtyDaysAgo).length
    const lastWeekReceipts = receipts.filter((r) => new Date(r.date) >= sevenDaysAgo).length

    // Amount stats
    const totalAmount = receipts.reduce((sum, r) => sum + (r.totalAmount || 0), 0)
    const avgAmount = totalReceipts > 0 ? totalAmount / totalReceipts : 0
    const lastMonthTotal = receipts
      .filter((r) => new Date(r.date) >= thirtyDaysAgo)
      .reduce((sum, r) => sum + (r.totalAmount || 0), 0)

    // Previous month for comparison
    const sixtyDaysAgo = subDays(now, 60)
    const previousMonthTotal = receipts
      .filter((r) => {
        const date = new Date(r.date)
        return date >= sixtyDaysAgo && date < thirtyDaysAgo
      })
      .reduce((sum, r) => sum + (r.totalAmount || 0), 0)

    const monthlyChange =
      previousMonthTotal > 0
        ? ((lastMonthTotal - previousMonthTotal) / previousMonthTotal) * 100
        : 0

    // Category distribution
    const categories = receipts.reduce(
      (acc, r) => {
        const cat = r.category || 'uncategorized'
        acc[cat] = (acc[cat] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )
    const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0]

    // First and last receipt
    const sortedByDate = [...receipts].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    const firstReceipt = sortedByDate[0]
    const lastReceipt = sortedByDate[sortedByDate.length - 1]
    const daysSinceFirst = firstReceipt ? differenceInDays(now, new Date(firstReceipt.date)) : 0
    const daysSinceLast = lastReceipt ? differenceInDays(now, new Date(lastReceipt.date)) : 0

    // Devices stats
    const totalDevices = devices?.length || 0
    const activeWarranties =
      devices?.filter((d) => d.warrantyExpiry && new Date(d.warrantyExpiry) > now).length || 0
    const expiringWarranties =
      devices?.filter((d) => {
        if (!d.warrantyExpiry) return false
        const expiry = new Date(d.warrantyExpiry)
        return expiry > now && differenceInDays(expiry, now) <= 30
      }).length || 0

    return {
      receipts: {
        total: totalReceipts,
        recent: recentReceipts,
        lastWeek: lastWeekReceipts,
        daysSinceFirst,
        daysSinceLast,
        firstDate: firstReceipt ? format(new Date(firstReceipt.date), 'dd.MM.yyyy') : null,
      },
      amounts: {
        total: totalAmount,
        average: avgAmount,
        lastMonth: lastMonthTotal,
        monthlyChange,
      },
      categories: {
        total: Object.keys(categories).length,
        top: topCategory?.[0] || null,
        topCount: topCategory?.[1] || 0,
      },
      devices: {
        total: totalDevices,
        activeWarranties,
        expiringWarranties,
      },
    }
  }, [receipts, devices])

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: 'RSD',
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Format storage size
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
  }

  if (!stats) {
    return (
      <div className="card animate-pulse p-6">
        <div className="h-6 w-32 rounded bg-dark-200 dark:bg-dark-700" />
        <div className="mt-4 grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`stat-skeleton-${i}`}
              className="h-20 rounded-xl bg-dark-100 dark:bg-dark-800"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card space-y-6 p-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary-100 p-2 dark:bg-primary-900/30">
          <Database className="h-5 w-5 text-primary-600 dark:text-primary-400" />
        </div>
        <h2 className="font-bold text-dark-900 text-lg dark:text-white">
          {t('profile.dataStats.title')}
        </h2>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {/* Total Receipts */}
        <motion.div
          whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
          className="rounded-xl bg-gradient-to-br from-primary-50 to-primary-100/50 p-4 dark:from-primary-900/20 dark:to-primary-900/10"
        >
          <div className="mb-2 flex items-center justify-between">
            <ReceiptIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </div>
          <p className="font-bold text-2xl text-dark-900 dark:text-white">{stats.receipts.total}</p>
          <p className="text-dark-600 text-xs dark:text-dark-400">
            {t('profile.dataStats.totalReceipts')}
          </p>
        </motion.div>

        {/* Total Devices */}
        <motion.div
          whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
          className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 p-4 dark:from-blue-900/20 dark:to-blue-900/10"
        >
          <div className="mb-2 flex items-center justify-between">
            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="font-bold text-2xl text-dark-900 dark:text-white">{stats.devices.total}</p>
          <p className="text-dark-600 text-xs dark:text-dark-400">
            {t('profile.dataStats.totalDevices')}
          </p>
        </motion.div>

        {/* Total Amount */}
        <motion.div
          whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
          className="rounded-xl bg-gradient-to-br from-green-50 to-green-100/50 p-4 dark:from-green-900/20 dark:to-green-900/10"
        >
          <div className="mb-2 flex items-center justify-between">
            <PieChart className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <p className="truncate font-bold text-xl text-dark-900 dark:text-white">
            {formatCurrency(stats.amounts.total)}
          </p>
          <p className="text-dark-600 text-xs dark:text-dark-400">
            {t('profile.dataStats.totalSpent')}
          </p>
        </motion.div>

        {/* Categories */}
        <motion.div
          whileHover={prefersReducedMotion ? {} : { scale: 1.02 }}
          className="rounded-xl bg-gradient-to-br from-purple-50 to-purple-100/50 p-4 dark:from-purple-900/20 dark:to-purple-900/10"
        >
          <div className="mb-2 flex items-center justify-between">
            <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="font-bold text-2xl text-dark-900 dark:text-white">
            {stats.categories.total}
          </p>
          <p className="text-dark-600 text-xs dark:text-dark-400">
            {t('profile.dataStats.categories')}
          </p>
        </motion.div>
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Activity Stats */}
        <div className="space-y-3 rounded-xl border border-dark-200 bg-dark-50 p-4 dark:border-dark-700 dark:bg-dark-800/50">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary-600 dark:text-primary-400" />
            <span className="font-semibold text-dark-900 text-sm dark:text-white">
              {t('profile.dataStats.activity')}
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-dark-600 dark:text-dark-400">
                {t('profile.dataStats.last7Days')}
              </span>
              <span className="font-medium text-dark-900 dark:text-white">
                {stats.receipts.lastWeek} {t('profile.dataStats.receiptsCount')}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-dark-600 dark:text-dark-400">
                {t('profile.dataStats.last30Days')}
              </span>
              <span className="font-medium text-dark-900 dark:text-white">
                {stats.receipts.recent} {t('profile.dataStats.receiptsCount')}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-dark-600 dark:text-dark-400">
                {t('profile.dataStats.averageReceipt')}
              </span>
              <span className="font-medium text-dark-900 dark:text-white">
                {formatCurrency(stats.amounts.average)}
              </span>
            </div>
          </div>
        </div>

        {/* Monthly Change */}
        <div className="space-y-3 rounded-xl border border-dark-200 bg-dark-50 p-4 dark:border-dark-700 dark:bg-dark-800/50">
          <div className="flex items-center gap-2">
            {stats.amounts.monthlyChange >= 0 ? (
              <TrendingUp className="h-4 w-4 text-red-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-green-500" />
            )}
            <span className="font-semibold text-dark-900 text-sm dark:text-white">
              {t('profile.dataStats.monthlySpending')}
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-dark-600 dark:text-dark-400">
                {t('profile.dataStats.thisMonth')}
              </span>
              <span className="font-medium text-dark-900 dark:text-white">
                {formatCurrency(stats.amounts.lastMonth)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-dark-600 dark:text-dark-400">
                {t('profile.dataStats.vsLastMonth')}
              </span>
              <span
                className={`font-medium ${
                  stats.amounts.monthlyChange >= 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-green-600 dark:text-green-400'
                }`}
              >
                {stats.amounts.monthlyChange >= 0 ? '+' : ''}
                {stats.amounts.monthlyChange.toFixed(1)}%
              </span>
            </div>
            {stats.devices.activeWarranties > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-dark-600 dark:text-dark-400">
                  {t('profile.dataStats.activeWarranties')}
                </span>
                <span className="font-medium text-dark-900 dark:text-white">
                  {stats.devices.activeWarranties}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timeline Stats */}
      {stats.receipts.firstDate && (
        <div className="rounded-xl border border-dark-200 bg-dark-50 p-4 dark:border-dark-700 dark:bg-dark-800/50">
          <div className="mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary-600 dark:text-primary-400" />
            <span className="font-semibold text-dark-900 text-sm dark:text-white">
              {t('profile.dataStats.timeline')}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div>
              <span className="text-dark-600 dark:text-dark-400">
                {t('profile.dataStats.firstReceipt')}:{' '}
              </span>
              <span className="font-medium text-dark-900 dark:text-white">
                {stats.receipts.firstDate}
              </span>
            </div>
            <div>
              <span className="text-dark-600 dark:text-dark-400">
                {t('profile.dataStats.trackingDays')}:{' '}
              </span>
              <span className="font-medium text-dark-900 dark:text-white">
                {stats.receipts.daysSinceFirst}
              </span>
            </div>
            {stats.receipts.daysSinceLast > 0 && (
              <div>
                <span className="text-dark-600 dark:text-dark-400">
                  {t('profile.dataStats.lastActivity')}:{' '}
                </span>
                <span className="font-medium text-dark-900 dark:text-white">
                  {t('profile.dataStats.daysAgo', { count: stats.receipts.daysSinceLast })}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Storage Stats */}
      {storageStats && (
        <div className="rounded-xl border border-dark-200 bg-dark-50 p-4 dark:border-dark-700 dark:bg-dark-800/50">
          <div className="mb-3 flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-primary-600 dark:text-primary-400" />
            <span className="font-semibold text-dark-900 text-sm dark:text-white">
              {t('profile.dataStats.storage')}
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-dark-600 dark:text-dark-400">
                {t('profile.dataStats.used')}
              </span>
              <span className="font-medium text-dark-900 dark:text-white">
                {formatBytes(storageStats.used)} / {formatBytes(storageStats.quota)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-dark-200 dark:bg-dark-700">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(storageStats.percentage, 100)}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`h-full rounded-full ${
                  storageStats.percentage > 80
                    ? 'bg-red-500'
                    : storageStats.percentage > 50
                      ? 'bg-amber-500'
                      : 'bg-green-500'
                }`}
              />
            </div>
            <p className="text-dark-500 text-xs dark:text-dark-500">
              {storageStats.percentage.toFixed(1)}% {t('profile.dataStats.ofQuota')}
            </p>
          </div>
        </div>
      )}
    </motion.div>
  )
}

export const DataStatsWidget = memo(DataStatsWidgetComponent)
