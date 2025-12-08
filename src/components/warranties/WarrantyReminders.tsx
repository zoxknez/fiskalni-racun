/**
 * WarrantyReminders Component
 *
 * Shows warranty expiration warnings on homepage/dashboard
 */

import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Bell, BellOff, Calendar, ChevronRight, Shield, X } from 'lucide-react'
import { memo, useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { logger } from '@/lib/logger'
import {
  getExpiringWarranties,
  getNotificationPermission,
  isPushSupported,
  requestNotificationPermission,
  type WarrantyReminder,
} from '@/services/warrantyReminderService'

interface WarrantyRemindersProps {
  maxItems?: number
  showNotificationPrompt?: boolean
  className?: string
}

function WarrantyRemindersComponent({
  maxItems = 3,
  showNotificationPrompt = true,
  className = '',
}: WarrantyRemindersProps) {
  const { t, i18n } = useTranslation()
  const [reminders, setReminders] = useState<WarrantyReminder[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>('default')

  useEffect(() => {
    const loadReminders = async () => {
      try {
        const data = await getExpiringWarranties(30)
        setReminders(data.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry))
      } catch (error) {
        logger.error('Failed to load warranty reminders:', error)
      } finally {
        setLoading(false)
      }
    }

    loadReminders()
    setNotificationPermission(getNotificationPermission())
  }, [])

  const handleDismiss = useCallback((id: string) => {
    setDismissed((prev) => new Set([...prev, id]))
  }, [])

  const handleEnableNotifications = useCallback(async () => {
    const permission = await requestNotificationPermission()
    setNotificationPermission(permission)
  }, [])

  const formatDate = useCallback(
    (date: Date) =>
      new Intl.DateTimeFormat(i18n.language, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(date),
    [i18n.language]
  )

  const visibleReminders = reminders.filter((r) => !dismissed.has(r.id)).slice(0, maxItems)

  if (loading) {
    return (
      <div className={`card animate-pulse p-4 ${className}`}>
        <div className="mb-3 h-5 w-40 rounded bg-dark-200 dark:bg-dark-700" />
        <div className="space-y-2">
          <div className="h-16 rounded bg-dark-100 dark:bg-dark-800" />
          <div className="h-16 rounded bg-dark-100 dark:bg-dark-800" />
        </div>
      </div>
    )
  }

  if (visibleReminders.length === 0) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-dark-100 bg-gradient-to-r from-orange-500/10 to-red-500/10 p-4 dark:border-dark-700">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-orange-100 p-2 dark:bg-orange-900/30">
            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h3 className="font-semibold text-dark-900 dark:text-dark-50">
              {t('warranties.expiringReminders', 'Garancije ističu uskoro')}
            </h3>
            <p className="text-sm text-dark-500">
              {t('warranties.expiringCount', '{{count}} uređaj(a) sa garancijom', {
                count: visibleReminders.length,
              })}
            </p>
          </div>
        </div>
        <Link
          to="/warranties"
          className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
        >
          {t('common.viewAll', 'Prikaži sve')}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Notification Permission Prompt */}
      {showNotificationPrompt && isPushSupported() && notificationPermission === 'default' && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="border-b border-dark-100 bg-primary-50 p-3 dark:border-dark-700 dark:bg-primary-900/20"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-primary-700 dark:text-primary-300">
              <Bell className="h-4 w-4" />
              {t('warranties.enableNotifications', 'Omogući obaveštenja za garancije')}
            </div>
            <button
              type="button"
              onClick={handleEnableNotifications}
              className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
            >
              {t('common.enable', 'Omogući')}
            </button>
          </div>
        </motion.div>
      )}

      {notificationPermission === 'denied' && showNotificationPrompt && (
        <div className="border-b border-dark-100 bg-dark-50 p-3 dark:border-dark-700 dark:bg-dark-800">
          <div className="flex items-center gap-2 text-sm text-dark-500">
            <BellOff className="h-4 w-4" />
            {t(
              'warranties.notificationsBlocked',
              'Obaveštenja su blokirana u podešavanjima pregledača'
            )}
          </div>
        </div>
      )}

      {/* Reminders List */}
      <div className="divide-y divide-dark-100 dark:divide-dark-700">
        <AnimatePresence>
          {visibleReminders.map((reminder) => (
            <motion.div
              key={reminder.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="relative"
            >
              <Link
                to={`/warranties/${reminder.deviceId}`}
                className="flex items-center gap-4 p-4 transition-colors hover:bg-dark-50 dark:hover:bg-dark-800"
              >
                {/* Urgency Indicator */}
                <div
                  className={`rounded-full p-2 ${
                    reminder.type === 'expired' || reminder.type === '1day'
                      ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      : reminder.type === '7days'
                        ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                        : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                  }`}
                >
                  <Shield className="h-5 w-5" />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-dark-900 dark:text-dark-50">
                    {reminder.device.brand} {reminder.device.model}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-dark-500">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {reminder.type === 'expired'
                        ? t('warranties.expired', 'Istekla')
                        : reminder.type === '1day'
                          ? t('warranties.expiresTomorrow', 'Ističe sutra')
                          : t('warranties.expiresIn', 'Ističe za {{days}} dana', {
                              days: reminder.daysUntilExpiry,
                            })}
                    </span>
                    <span className="text-dark-400">•</span>
                    <span>{formatDate(new Date(reminder.device.warrantyExpiry))}</span>
                  </div>
                </div>

                <ChevronRight className="h-5 w-5 flex-shrink-0 text-dark-400" />
              </Link>

              {/* Dismiss Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleDismiss(reminder.id)
                }}
                className="absolute right-12 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-dark-400 transition-colors hover:bg-dark-100 hover:text-dark-600 dark:hover:bg-dark-700 dark:hover:text-dark-300"
                aria-label={t('common.dismiss', 'Odbaci')}
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* More items indicator */}
      {reminders.length > maxItems && (
        <div className="border-t border-dark-100 p-3 text-center dark:border-dark-700">
          <Link
            to="/warranties"
            className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            {t('warranties.andMore', 'I još {{count}} uređaj(a)...', {
              count: reminders.length - maxItems,
            })}
          </Link>
        </div>
      )}
    </motion.div>
  )
}

export const WarrantyReminders = memo(WarrantyRemindersComponent)
