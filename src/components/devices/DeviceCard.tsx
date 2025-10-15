import { format } from 'date-fns'
import { srLatn } from 'date-fns/locale'
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

  // Compact horizontal layout for grid
  if (compact) {
    return (
      <Link to={`/warranties/${device.id}`} className="card-hover group">
        <div className="flex flex-col gap-2.5">
          {/* Header Row: Icon, Title & Badge */}
          <div className="flex items-start gap-3">
            <div
              className={`w-12 h-12 rounded-xl ${status.bgColor} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200`}
            >
              <Shield className={`w-6 h-6 ${status.textColor}`} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-bold text-dark-900 dark:text-dark-50 text-base group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
                  {device.brand}
                </h3>
                <div className={`px-2 py-0.5 rounded-full ${status.bgColor} flex items-center gap-1 shrink-0`}>
                  <StatusIcon className={`w-3 h-3 ${status.textColor}`} />
                  <span className={`text-xs font-semibold ${status.textColor}`}>
                    {status.label}
                  </span>
                </div>
              </div>
              <p className="text-dark-600 dark:text-dark-400 text-sm truncate">
                {device.model}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          {status.type !== 'expired' && status.type !== 'in-service' && (
            <div className="space-y-1">
              <div className="h-1.5 bg-dark-200 dark:bg-dark-700 rounded-full overflow-hidden">
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
              <div className="flex justify-between text-xs text-dark-500 dark:text-dark-500">
                <span>{status.daysRemaining} dana</span>
                <span>{format(device.warrantyExpiry, 'dd.MM.yy', { locale: srLatn })}</span>
              </div>
            </div>
          )}

          {/* Dates for expired/in-service */}
          {(status.type === 'expired' || status.type === 'in-service') && (
            <div className="flex items-center justify-between text-xs text-dark-500 dark:text-dark-500 pt-1 border-t border-dark-200 dark:border-dark-700">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{format(device.purchaseDate, 'dd.MM.yy', { locale: srLatn })}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{format(device.warrantyExpiry, 'dd.MM.yy', { locale: srLatn })}</span>
              </div>
            </div>
          )}
        </div>
      </Link>
    )
  }

  // Regular detailed layout
  return (
    <Link to={`/warranties/${device.id}`} className="card-hover group">
      <div className="flex flex-col gap-4">
        {/* Header with Icon and Status Badge */}
        <div className="flex items-start justify-between gap-2">
          <div
            className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200 shadow-lg"
          >
            <Shield className="w-7 h-7 text-white" />
          </div>

          <div
            className={`px-3 py-1.5 rounded-full ${status.bgColor} flex items-center gap-1.5 shadow-sm`}
          >
            <StatusIcon className={`w-4 h-4 ${status.textColor}`} />
            <span className={`text-sm font-semibold ${status.textColor}`}>
              {status.label}
            </span>
          </div>
        </div>

        {/* Device Info */}
        <div>
          <h3
            className="font-bold text-dark-900 dark:text-dark-50 text-lg mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors"
          >
            {device.brand}
          </h3>
          <p className="text-dark-600 dark:text-dark-400 text-sm">
            {device.model}
          </p>
          {device.category && (
            <p className="text-xs text-dark-500 dark:text-dark-500 mt-1">{device.category}</p>
          )}
        </div>

        {/* Warranty Progress Bar */}
        {status.type !== 'expired' && status.type !== 'in-service' && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-dark-500 dark:text-dark-500">
              <span>{t('deviceCard.remaining')}</span>
              <span className="font-medium">
                {status.daysRemaining} {t('deviceCard.days')}
              </span>
            </div>
            <div className="h-2 bg-dark-200 dark:bg-dark-700 rounded-full overflow-hidden">
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
        <div className="flex items-center gap-4 pt-3 border-t border-dark-200 dark:border-dark-700">
          <div className="flex items-center gap-2 text-sm flex-1">
            <Calendar className="w-4 h-4 text-dark-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-dark-500 dark:text-dark-500">
                {t('deviceCard.purchaseDate')}
              </p>
              <p className="font-medium text-dark-900 dark:text-dark-50">
                {format(device.purchaseDate, 'dd.MM.yy', { locale: srLatn })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm flex-1">
            <Clock className="w-4 h-4 text-dark-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-dark-500 dark:text-dark-500">
                {t('deviceCard.expiryDate')}
              </p>
              <p className="font-medium text-dark-900 dark:text-dark-50">
                {format(device.warrantyExpiry, 'dd.MM.yy', { locale: srLatn })}
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
