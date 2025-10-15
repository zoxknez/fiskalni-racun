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

  return (
    <Link to={`/warranties/${device.id}`} className="card-hover group">
      <div className={`flex flex-col ${compact ? 'gap-3' : 'gap-4'}`}>
        {/* Header with Icon and Status Badge */}
        <div className="flex items-start justify-between gap-2">
          <div
            className={`${compact ? 'w-10 h-10' : 'w-14 h-14'} rounded-xl ${status.bgColor} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200`}
          >
            <Shield className={`${compact ? 'w-5 h-5' : 'w-7 h-7'} ${status.textColor}`} />
          </div>

          <div className={`px-2 ${compact ? 'py-1' : 'py-1.5'} rounded-full ${status.bgColor} flex items-center gap-1`}>
            <StatusIcon className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} ${status.textColor}`} />
            <span className={`${compact ? 'text-xs' : 'text-sm'} font-semibold ${status.textColor}`}>{status.label}</span>
          </div>
        </div>

        {/* Device Info */}
        <div>
          <h3 className={`font-bold text-dark-900 dark:text-dark-50 ${compact ? 'text-base' : 'text-lg'} mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate`}>
            {device.brand}
          </h3>
          <p className={`text-dark-600 dark:text-dark-400 ${compact ? 'text-xs' : 'text-sm'} truncate`}>{device.model}</p>
          {device.category && !compact && (
            <p className="text-xs text-dark-500 dark:text-dark-500 mt-1">{device.category}</p>
          )}
        </div>

        {/* Warranty Progress Bar */}
        {status.type !== 'expired' && status.type !== 'in-service' && (
          <div className={compact ? 'space-y-0.5' : 'space-y-1'}>
            {!compact && (
              <div className="flex justify-between text-xs text-dark-500 dark:text-dark-500">
                <span>{t('deviceCard.remaining')}</span>
                <span className="font-medium">
                  {status.daysRemaining} {t('deviceCard.days')}
                </span>
              </div>
            )}
            <div className={`${compact ? 'h-1.5' : 'h-2'} bg-dark-200 dark:bg-dark-700 rounded-full overflow-hidden`}>
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
            {compact && (
              <p className="text-xs text-dark-500 dark:text-dark-500 text-right">
                {status.daysRemaining}d
              </p>
            )}
          </div>
        )}

        {/* Dates */}
        <div className={`flex items-center ${compact ? 'gap-3 pt-2' : 'gap-4 pt-3'} border-t border-dark-200 dark:border-dark-700`}>
          <div className="flex items-center gap-1.5 text-sm flex-1 min-w-0">
            <Calendar className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} text-dark-400 flex-shrink-0`} />
            <div className="min-w-0 flex-1">
              {!compact && (
                <p className="text-xs text-dark-500 dark:text-dark-500">
                  {t('deviceCard.purchaseDate')}
                </p>
              )}
              <p className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-dark-900 dark:text-dark-50`}>
                {format(device.purchaseDate, compact ? 'dd.MM.yy' : 'dd.MM.yy', { locale: srLatn })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-sm flex-1 min-w-0">
            <Clock className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} text-dark-400 flex-shrink-0`} />
            <div className="min-w-0 flex-1">
              {!compact && (
                <p className="text-xs text-dark-500 dark:text-dark-500">
                  {t('deviceCard.expiryDate')}
                </p>
              )}
              <p className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-dark-900 dark:text-dark-50`}>
                {format(device.warrantyExpiry, compact ? 'dd.MM.yy' : 'dd.MM.yy', { locale: srLatn })}
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
