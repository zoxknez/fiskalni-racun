/**
 * NotificationsPage
 *
 * Central hub for all app notifications:
 * - Warranty expiration reminders
 * - Document expiration reminders
 * - Household bill due dates
 * - System notifications
 */

import { motion, useReducedMotion } from 'framer-motion'
import {
  AlertTriangle,
  Bell,
  BellOff,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Filter,
  Receipt,
  Settings,
  Shield,
  Sparkles,
} from 'lucide-react'
import { memo, useCallback, useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { PageTransition } from '@/components/common/PageTransition'
import { Button } from '@/components/ui/button'
import {
  type AppNotification,
  type NotificationPriority,
  type NotificationType,
  useNotifications,
} from '@/hooks/useNotifications'

// ────────────────────────────────────────────────────────────────────────────
// Types & Constants
// ────────────────────────────────────────────────────────────────────────────

type FilterType = 'all' | 'critical' | 'warranties' | 'documents' | 'bills'

const FILTER_OPTIONS = [
  { value: 'all' as const, labelKey: 'notifications.filterAll' as const, icon: Bell },
  {
    value: 'critical' as const,
    labelKey: 'notifications.filterCritical' as const,
    icon: AlertTriangle,
  },
  {
    value: 'warranties' as const,
    labelKey: 'notifications.filterWarranties' as const,
    icon: Shield,
  },
  {
    value: 'documents' as const,
    labelKey: 'notifications.filterDocuments' as const,
    icon: FileText,
  },
  { value: 'bills' as const, labelKey: 'notifications.filterBills' as const, icon: Receipt },
] as const

const PRIORITY_CONFIG: Record<
  NotificationPriority,
  { bgClass: string; borderClass: string; iconClass: string; badgeClass: string }
> = {
  critical: {
    bgClass: 'bg-red-50 dark:bg-red-950/30',
    borderClass: 'border-red-200 dark:border-red-800',
    iconClass: 'text-red-600 dark:text-red-400',
    badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  },
  high: {
    bgClass: 'bg-orange-50 dark:bg-orange-950/30',
    borderClass: 'border-orange-200 dark:border-orange-800',
    iconClass: 'text-orange-600 dark:text-orange-400',
    badgeClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
  },
  medium: {
    bgClass: 'bg-yellow-50 dark:bg-yellow-950/30',
    borderClass: 'border-yellow-200 dark:border-yellow-800',
    iconClass: 'text-yellow-600 dark:text-yellow-400',
    badgeClass: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
  },
  low: {
    bgClass: 'bg-blue-50 dark:bg-blue-950/30',
    borderClass: 'border-blue-200 dark:border-blue-800',
    iconClass: 'text-blue-600 dark:text-blue-400',
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  },
}

const TYPE_ICONS: Record<NotificationType, typeof Shield> = {
  warranty_expiring: Shield,
  warranty_expired: Shield,
  document_expiring: FileText,
  document_expired: FileText,
  bill_due: Receipt,
  bill_overdue: Receipt,
  system: Bell,
}

// ────────────────────────────────────────────────────────────────────────────
// NotificationCard Component
// ────────────────────────────────────────────────────────────────────────────

interface NotificationCardProps {
  notification: AppNotification
  index: number
}

const NotificationCard = memo(function NotificationCard({
  notification,
  index,
}: NotificationCardProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const prefersReducedMotion = useReducedMotion()
  const config = PRIORITY_CONFIG[notification.priority]
  const Icon = TYPE_ICONS[notification.type]

  const handleClick = useCallback(() => {
    if (notification.link) {
      navigate(notification.link)
    }
  }, [navigate, notification.link])

  const formatDaysRemaining = (days: number | undefined): string => {
    if (days === undefined) return ''
    if (days < 0) {
      const absDays = Math.abs(days)
      return t('notifications.daysAgo', { count: absDays })
    }
    if (days === 0) return t('notifications.today')
    if (days === 1) return t('notifications.tomorrow')
    return t('notifications.inDays', { count: days })
  }

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      className={`w-full cursor-pointer rounded-xl border p-4 text-left transition-all duration-200 hover:scale-[1.01] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${config.bgClass} ${config.borderClass}
      `}
      initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      whileHover={prefersReducedMotion ? {} : { scale: 1.01 }}
      whileTap={prefersReducedMotion ? {} : { scale: 0.99 }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${config.bgClass} border ${config.borderClass}
        `}
        >
          <Icon className={`h-5 w-5 ${config.iconClass}`} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="truncate font-medium text-dark-900 dark:text-dark-100">
              {notification.title}
            </h3>
            {notification.priority === 'critical' && (
              <span className={`rounded-full px-2 py-0.5 font-medium text-xs ${config.badgeClass}`}>
                {t('notifications.urgent')}
              </span>
            )}
          </div>

          <p className="mb-2 text-dark-600 text-sm dark:text-dark-400">{notification.message}</p>

          <div className="flex items-center gap-3 text-dark-500 text-xs dark:text-dark-500">
            {notification.daysRemaining !== undefined && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatDaysRemaining(notification.daysRemaining)}
              </span>
            )}
            {notification.expiresAt && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(notification.expiresAt).toLocaleDateString('sr-RS')}
              </span>
            )}
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight className="h-5 w-5 flex-shrink-0 text-dark-400 dark:text-dark-600" />
      </div>
    </motion.button>
  )
})

// ────────────────────────────────────────────────────────────────────────────
// Empty State Component
// ────────────────────────────────────────────────────────────────────────────

const EmptyState = memo(function EmptyState() {
  const { t } = useTranslation()
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      className="flex flex-col items-center justify-center px-4 py-16 text-center"
      initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30">
        <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
      </div>

      <h3 className="mb-2 font-semibold text-dark-900 text-xl dark:text-dark-100">
        {t('notifications.allCaughtUp')}
      </h3>

      <p className="mb-6 max-w-sm text-dark-600 dark:text-dark-400">
        {t('notifications.noNotificationsDescription')}
      </p>

      <div className="flex items-center gap-2 text-dark-500 text-sm dark:text-dark-500">
        <Sparkles className="h-4 w-4" />
        <span>{t('notifications.checkBackLater')}</span>
      </div>
    </motion.div>
  )
})

// ────────────────────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────────────────────

function NotificationsPage() {
  const { t } = useTranslation()
  const headingId = useId()
  const prefersReducedMotion = useReducedMotion()
  const { notifications, stats, hasNotifications } = useNotifications()
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') return notifications
    if (activeFilter === 'critical') return notifications.filter((n) => n.priority === 'critical')
    if (activeFilter === 'warranties')
      return notifications.filter(
        (n) => n.type === 'warranty_expiring' || n.type === 'warranty_expired'
      )
    if (activeFilter === 'documents')
      return notifications.filter(
        (n) => n.type === 'document_expiring' || n.type === 'document_expired'
      )
    if (activeFilter === 'bills')
      return notifications.filter((n) => n.type === 'bill_due' || n.type === 'bill_overdue')
    return notifications
  }, [notifications, activeFilter])

  return (
    <PageTransition>
      <div className="space-y-6 pb-24">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-600 via-orange-600 to-red-700 p-6 text-white shadow-2xl sm:p-8"
        >
          {/* Animated Background */}
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

          {/* Floating Orbs */}
          {!prefersReducedMotion && (
            <>
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY }}
                className="-top-20 -right-20 absolute h-64 w-64 rounded-full bg-white/20 blur-2xl"
              />
              <motion.div
                animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
                transition={{ duration: 5, repeat: Number.POSITIVE_INFINITY }}
                className="-bottom-20 -left-20 absolute h-48 w-48 rounded-full bg-yellow-300/20 blur-2xl"
              />
            </>
          )}

          <div className="relative z-10">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                  <Bell className="h-6 w-6" />
                </div>
                <div>
                  <h1 id={headingId} className="font-bold text-2xl sm:text-3xl">
                    {t('notifications.title')}
                  </h1>
                  <p className="text-white/80 text-sm">
                    {hasNotifications
                      ? t('notifications.subtitle', { count: stats.total })
                      : t('notifications.noNotifications')}
                  </p>
                </div>
              </div>

              <Link
                to="/profile"
                className="rounded-xl bg-white/10 p-2.5 backdrop-blur-sm transition-colors hover:bg-white/20"
                aria-label={t('notifications.settings')}
              >
                <Settings className="h-5 w-5" />
              </Link>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-white/15 p-3 text-center backdrop-blur-sm">
                <div className="font-bold text-2xl">{stats.critical}</div>
                <div className="text-white/70 text-xs">{t('notifications.statsCritical')}</div>
              </div>
              <div className="rounded-xl bg-white/15 p-3 text-center backdrop-blur-sm">
                <div className="font-bold text-2xl">{stats.high}</div>
                <div className="text-white/70 text-xs">{t('notifications.statsHigh')}</div>
              </div>
              <div className="rounded-xl bg-white/15 p-3 text-center backdrop-blur-sm">
                <div className="font-bold text-2xl">
                  {stats.medium + (stats.total - stats.critical - stats.high - stats.medium)}
                </div>
                <div className="text-white/70 text-xs">
                  {t('notifications.statsOther', 'Ostalo')}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Filter Tabs */}
        {hasNotifications && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-dark-200 bg-white p-2 shadow-sm dark:border-dark-700 dark:bg-dark-800"
          >
            <div className="scrollbar-hide flex gap-2 overflow-x-auto">
              {FILTER_OPTIONS.map((option) => {
                const Icon = option.icon
                const isActive = activeFilter === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setActiveFilter(option.value)}
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2.5 font-medium text-sm transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-orange-500/25'
                        : 'text-dark-600 hover:bg-dark-100 dark:text-dark-400 dark:hover:bg-dark-700'
                    }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{t(option.labelKey)}</span>
                    {option.value === 'critical' && stats.critical > 0 && (
                      <span
                        className={`ml-1 rounded-full px-1.5 py-0.5 text-xs ${isActive ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400'}
                      `}
                      >
                        {stats.critical}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Notifications List */}
        {filteredNotifications.length > 0 ? (
          <ul className="list-none space-y-3" aria-labelledby={headingId}>
            {filteredNotifications.map((notification, index) => (
              <li key={notification.id}>
                <NotificationCard notification={notification} index={index} />
              </li>
            ))}
          </ul>
        ) : hasNotifications ? (
          // No results for current filter
          <div className="py-12 text-center">
            <BellOff className="mx-auto mb-4 h-12 w-12 text-dark-300 dark:text-dark-600" />
            <p className="text-dark-600 dark:text-dark-400">{t('notifications.noFilterResults')}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveFilter('all')}
              className="mt-4"
            >
              <Filter className="mr-2 h-4 w-4" />
              {t('notifications.showAll')}
            </Button>
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    </PageTransition>
  )
}

export default memo(NotificationsPage)
