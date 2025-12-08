/**
 * WarrantyTimeline Component
 *
 * Displays warranties in a visual timeline grouped by expiry month.
 */

import { deviceCategoryLabel } from '@lib/categories'
import type { Device } from '@lib/db'
import { addMonths, differenceInDays, format, isBefore, isWithinInterval } from 'date-fns'
import { sr } from 'date-fns/locale'
import { motion, useReducedMotion } from 'framer-motion'
import { AlertCircle, Calendar, CheckCircle2, ChevronRight, XCircle } from 'lucide-react'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

interface WarrantyTimelineProps {
  devices: Device[]
}

interface TimelineMonth {
  key: string
  label: string
  devices: Device[]
  isCurrentMonth: boolean
  isPast: boolean
}

function getWarrantyStatus(device: Device): 'active' | 'expiring' | 'expired' {
  if (!device.warrantyExpiry) return 'expired'
  const now = new Date()
  const expiry = new Date(device.warrantyExpiry)

  if (isBefore(expiry, now)) return 'expired'

  const daysUntilExpiry = differenceInDays(expiry, now)
  if (daysUntilExpiry <= 30) return 'expiring'

  return 'active'
}

function getStatusColor(status: 'active' | 'expiring' | 'expired') {
  switch (status) {
    case 'active':
      return {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-700 dark:text-green-400',
        border: 'border-green-500',
        dot: 'bg-green-500',
      }
    case 'expiring':
      return {
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        text: 'text-amber-700 dark:text-amber-400',
        border: 'border-amber-500',
        dot: 'bg-amber-500',
      }
    case 'expired':
      return {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-700 dark:text-red-400',
        border: 'border-red-500',
        dot: 'bg-red-500',
      }
  }
}

function WarrantyTimelineComponent({ devices }: WarrantyTimelineProps) {
  const { t, i18n } = useTranslation()
  const prefersReducedMotion = useReducedMotion()
  const locale = i18n.language === 'sr' ? sr : undefined

  // Group devices by warranty expiry month
  const timelineData = useMemo(() => {
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Sort devices by warranty expiry
    const sortedDevices = [...devices].sort((a, b) => {
      const aExpiry = a.warrantyExpiry ? new Date(a.warrantyExpiry) : new Date(0)
      const bExpiry = b.warrantyExpiry ? new Date(b.warrantyExpiry) : new Date(0)
      return aExpiry.getTime() - bExpiry.getTime()
    })

    // Create month groups
    const monthGroups = new Map<string, TimelineMonth>()

    // Add past month for expired warranties
    const pastKey = 'expired'
    const expiredDevices = sortedDevices.filter(
      (d) => d.warrantyExpiry && isBefore(new Date(d.warrantyExpiry), currentMonthStart)
    )
    if (expiredDevices.length > 0) {
      monthGroups.set(pastKey, {
        key: pastKey,
        label: t('warranties.timeline.expired'),
        devices: expiredDevices,
        isCurrentMonth: false,
        isPast: true,
      })
    }

    // Group future warranties by month (next 12 months)
    for (let i = 0; i < 12; i++) {
      const monthStart = addMonths(currentMonthStart, i)
      const monthEnd = addMonths(monthStart, 1)
      const monthKey = format(monthStart, 'yyyy-MM')

      const monthDevices = sortedDevices.filter((d) => {
        if (!d.warrantyExpiry) return false
        const expiry = new Date(d.warrantyExpiry)
        return isWithinInterval(expiry, { start: monthStart, end: monthEnd })
      })

      if (monthDevices.length > 0) {
        const formatOptions = locale ? { locale } : undefined
        monthGroups.set(monthKey, {
          key: monthKey,
          label: format(monthStart, 'LLLL yyyy', formatOptions),
          devices: monthDevices,
          isCurrentMonth: i === 0,
          isPast: false,
        })
      }
    }

    // Add "beyond" group for warranties expiring after 12 months
    const beyondDate = addMonths(currentMonthStart, 12)
    const beyondDevices = sortedDevices.filter((d) => {
      if (!d.warrantyExpiry) return false
      const expiry = new Date(d.warrantyExpiry)
      return expiry >= beyondDate
    })
    if (beyondDevices.length > 0) {
      monthGroups.set('beyond', {
        key: 'beyond',
        label: t('warranties.timeline.beyond'),
        devices: beyondDevices,
        isCurrentMonth: false,
        isPast: false,
      })
    }

    return Array.from(monthGroups.values())
  }, [devices, t, locale])

  if (devices.length === 0) {
    return null
  }

  return (
    <div className="relative space-y-0">
      {/* Timeline line */}
      <div className="absolute top-0 bottom-0 left-6 w-0.5 bg-gradient-to-b from-primary-500 via-primary-300 to-transparent" />

      {timelineData.map((month, monthIndex) => (
        <motion.div
          key={month.key}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: monthIndex * 0.1 }}
          className="relative pb-8"
        >
          {/* Month header with dot */}
          <div className="mb-4 flex items-center gap-4">
            <div
              className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full ${
                month.isPast
                  ? 'bg-red-100 dark:bg-red-900/30'
                  : month.isCurrentMonth
                    ? 'bg-primary-500'
                    : 'bg-primary-100 dark:bg-primary-900/30'
              }`}
            >
              {month.isPast ? (
                <XCircle
                  className={`h-6 w-6 ${month.isPast ? 'text-red-600 dark:text-red-400' : 'text-primary-600 dark:text-primary-400'}`}
                />
              ) : (
                <Calendar
                  className={`h-6 w-6 ${month.isCurrentMonth ? 'text-white' : 'text-primary-600 dark:text-primary-400'}`}
                />
              )}
            </div>
            <div>
              <h3
                className={`font-bold text-lg ${
                  month.isPast
                    ? 'text-red-700 dark:text-red-400'
                    : month.isCurrentMonth
                      ? 'text-primary-700 dark:text-primary-400'
                      : 'text-dark-900 dark:text-dark-100'
                }`}
              >
                {month.label}
              </h3>
              <p className="text-dark-500 text-sm dark:text-dark-400">
                {month.devices.length}{' '}
                {month.devices.length === 1
                  ? t('warranties.deviceOne')
                  : t('warranties.deviceMany')}
              </p>
            </div>
          </div>

          {/* Devices in this month */}
          <div className="ml-16 space-y-3">
            {month.devices.map((device, deviceIndex) => {
              const status = getWarrantyStatus(device)
              const colors = getStatusColor(status)
              const daysUntilExpiry = device.warrantyExpiry
                ? differenceInDays(new Date(device.warrantyExpiry), new Date())
                : 0

              return (
                <motion.div
                  key={device.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: monthIndex * 0.1 + deviceIndex * 0.05 }}
                >
                  <Link to={`/warranties/${device.id}`}>
                    <motion.div
                      whileHover={prefersReducedMotion ? {} : { scale: 1.02, x: 5 }}
                      className={`group relative overflow-hidden rounded-xl border-l-4 ${colors.border} bg-white p-4 shadow-sm transition-all hover:shadow-md dark:bg-dark-800`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {/* Status dot */}
                          <div className={`h-3 w-3 rounded-full ${colors.dot}`} />

                          {/* Device info */}
                          <div>
                            <p className="font-semibold text-dark-900 dark:text-dark-100">
                              {device.brand} {device.model}
                            </p>
                            <div className="flex items-center gap-2 text-dark-500 text-sm dark:text-dark-400">
                              <span>
                                {deviceCategoryLabel(device.category || 'other', i18n.language)}
                              </span>
                              {device.warrantyExpiry && (
                                <>
                                  <span>•</span>
                                  <span>
                                    {format(new Date(device.warrantyExpiry), 'dd.MM.yyyy')}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Status badge */}
                          <div
                            className={`flex items-center gap-1.5 rounded-full px-3 py-1 ${colors.bg}`}
                          >
                            {status === 'active' && (
                              <CheckCircle2 className={`h-4 w-4 ${colors.text}`} />
                            )}
                            {status === 'expiring' && (
                              <AlertCircle className={`h-4 w-4 ${colors.text}`} />
                            )}
                            {status === 'expired' && (
                              <XCircle className={`h-4 w-4 ${colors.text}`} />
                            )}
                            <span className={`font-medium text-xs ${colors.text}`}>
                              {status === 'expired'
                                ? t('warranties.statusExpired')
                                : status === 'expiring'
                                  ? t('warranties.timeline.daysLeft', { count: daysUntilExpiry })
                                  : t('warranties.statusActive')}
                            </span>
                          </div>

                          {/* Arrow */}
                          <ChevronRight className="h-5 w-5 text-dark-400 transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      ))}

      {/* Summary at bottom */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="ml-6 flex items-center gap-6 rounded-xl border border-dark-200 bg-dark-50 p-4 dark:border-dark-700 dark:bg-dark-800/50"
      >
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-green-500" />
          <span className="text-dark-600 text-sm dark:text-dark-400">
            {t('warranties.timeline.active')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-amber-500" />
          <span className="text-dark-600 text-sm dark:text-dark-400">
            {t('warranties.timeline.expiringSoon')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <span className="text-dark-600 text-sm dark:text-dark-400">
            {t('warranties.timeline.expired')}
          </span>
        </div>
      </motion.div>
    </div>
  )
}

export const WarrantyTimeline = memo(WarrantyTimelineComponent)
