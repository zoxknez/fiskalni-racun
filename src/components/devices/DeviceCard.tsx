import { format } from 'date-fns'
import { Calendar, Clock, Shield } from 'lucide-react'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useWarrantyStatus } from '@/hooks/useWarrantyStatus'
import type { Device } from '@/types'

interface DeviceCardProps {
  device: Device
  compact?: boolean
}

const baseCardClasses =
  'group block rounded-xl border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 p-4 shadow-sm transition-transform duration-200 overflow-hidden hover:-translate-y-1 hover:shadow-md hover:border-primary-200 dark:hover:border-primary-700 focus-visible:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 dark:focus-visible:ring-primary-700'

/**
 * Reusable device card component with warranty status
 * Includes hover effects, status badge, and warranty progress
 *
 * OPTIMIZED: Wrapped in React.memo to prevent unnecessary re-renders
 * Re-renders only when device object changes
 *
 * @param compact - If true, shows a more condensed version (for grid layouts)
 */
function DeviceCard({ device, compact = false }: DeviceCardProps) {
  const { t } = useTranslation()
  const status = useWarrantyStatus(device)

  if (!status) return null // Handle null device

  const StatusIcon = status.icon
  const daysRemainingText = t('common.days', { count: status.daysRemaining })

  // Compact horizontal layout for grid
  if (compact) {
    return (
      <Link to={`/warranties/${device.id}`} className={baseCardClasses}>
        <div className="space-y-3">
          {/* Header Row: Icon + Device Name + Status */}
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-md transition-transform duration-200 group-hover:scale-105">
              <Shield className="h-6 w-6 text-white" />
            </div>

            {/* Device Name & Status */}
            <div className="min-w-0 flex-1 space-y-1">
              <h3 className="line-clamp-2 font-semibold text-base text-dark-900 leading-snug transition-colors group-hover:text-primary-600 dark:text-dark-50 dark:group-hover:text-primary-400">
                {device.brand} {device.model}
              </h3>
              <div className="flex items-center gap-1.5">
                <StatusIcon className={`h-3.5 w-3.5 ${status.textColor} shrink-0`} />
                <span className={`font-medium text-xs ${status.textColor} truncate`}>
                  {status.label}
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar Section - Only for Active Warranties */}
          {status.type !== 'expired' && status.type !== 'in-service' && (
            <div className="space-y-2">
              <div className="h-2 overflow-hidden rounded-full bg-dark-200 dark:bg-dark-700">
                <div
                  className={`h-full transition-all duration-500 ${
                    status.severity === 'success'
                      ? 'bg-gradient-to-r from-green-500 to-green-600'
                      : status.severity === 'warning'
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600'
                        : 'bg-gradient-to-r from-red-500 to-red-600'
                  }`}
                  style={{
                    width: `${Math.min(Math.max((status.daysRemaining / device.warrantyDuration / 30) * 100, 0), 100)}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-dark-600 text-xs dark:text-dark-400">
                <span className="font-medium">
                  {status.daysRemaining} {daysRemainingText}
                </span>
                <span>{format(device.warrantyExpiry, 'dd.MM.yy')}</span>
              </div>
            </div>
          )}

          {/* Date Info - For Expired/In-Service */}
          {(status.type === 'expired' || status.type === 'in-service') && (
            <div className="flex items-center justify-between border-dark-200 border-t pt-2 text-dark-600 text-xs dark:border-dark-700 dark:text-dark-400">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>{format(device.purchaseDate, 'dd.MM.yy')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>{format(device.warrantyExpiry, 'dd.MM.yy')}</span>
              </div>
            </div>
          )}
        </div>
      </Link>
    )
  }

  // Regular detailed layout
  return (
    <Link to={`/warranties/${device.id}`} className={baseCardClasses}>
      <div className="flex flex-col gap-4">
        {/* Header with Icon and Status Badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg transition-transform duration-200 group-hover:scale-110">
            <Shield className="h-7 w-7 text-white" />
          </div>

          <div
            className={`rounded-full px-3 py-1.5 ${status.bgColor} flex items-center gap-1.5 shadow-sm`}
          >
            <StatusIcon className={`h-4 w-4 ${status.textColor}`} />
            <span className={`font-semibold text-sm ${status.textColor}`}>{status.label}</span>
          </div>
        </div>

        {/* Device Info */}
        <div>
          <h3 className="mb-1 font-bold text-dark-900 text-lg transition-colors group-hover:text-primary-600 dark:text-dark-50 dark:group-hover:text-primary-400">
            {device.brand}
          </h3>
          <p className="text-dark-600 text-sm dark:text-dark-400">{device.model}</p>
          {device.category && (
            <p className="mt-1 text-dark-500 text-xs dark:text-dark-500">{device.category}</p>
          )}
        </div>

        {/* Warranty Progress Bar */}
        {status.type !== 'expired' && status.type !== 'in-service' && (
          <div className="space-y-1">
            <div className="flex justify-between text-dark-500 text-xs dark:text-dark-500">
              <span>{t('deviceCard.remaining')}</span>
              <span className="font-medium">
                {status.daysRemaining} {daysRemainingText}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-dark-200 dark:bg-dark-700">
              <div
                className={`h-full transition-all duration-500 ${
                  status.severity === 'success'
                    ? 'bg-green-600'
                    : status.severity === 'warning'
                      ? 'bg-amber-600'
                      : 'bg-red-600'
                }`}
                style={{
                  width: `${Math.min(Math.max((status.daysRemaining / device.warrantyDuration / 30) * 100, 0), 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Dates */}
        <div className="flex items-center gap-4 border-dark-200 border-t pt-3 dark:border-dark-700">
          <div className="flex flex-1 items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 flex-shrink-0 text-dark-400" />
            <div>
              <p className="text-dark-500 text-xs dark:text-dark-500">
                {t('deviceCard.purchaseDate')}
              </p>
              <p className="font-medium text-dark-900 dark:text-dark-50">
                {format(device.purchaseDate, 'dd.MM.yy')}
              </p>
            </div>
          </div>

          <div className="flex flex-1 items-center gap-2 text-sm">
            <Clock className="h-4 w-4 flex-shrink-0 text-dark-400" />
            <div>
              <p className="text-dark-500 text-xs dark:text-dark-500">
                {t('deviceCard.expiryDate')}
              </p>
              <p className="font-medium text-dark-900 dark:text-dark-50">
                {format(device.warrantyExpiry, 'dd.MM.yy')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

// Export memoized version for performance
export default memo(DeviceCard)
