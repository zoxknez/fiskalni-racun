import { Link } from 'react-router-dom'
import { Shield, Calendar, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { sr } from 'date-fns/locale'
import { useWarrantyStatus } from '@/hooks/useWarrantyStatus'
import type { Device } from '@/types'

interface DeviceCardProps {
  device: Device
}

/**
 * Reusable device card component with warranty status
 * Includes hover effects, status badge, and warranty progress
 */
export default function DeviceCard({ device }: DeviceCardProps) {
  const status = useWarrantyStatus(device)
  const StatusIcon = status.icon

  return (
    <Link
      to={`/warranties/${device.id}`}
      className="card-hover group"
    >
      <div className="flex flex-col gap-4">
        {/* Header with Icon and Status Badge */}
        <div className="flex items-start justify-between gap-3">
          <div 
            className={`w-14 h-14 rounded-xl ${status.bgColor} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200`}
          >
            <Shield className={`w-7 h-7 ${status.textColor}`} />
          </div>
          
          <div className={`px-3 py-1.5 rounded-full ${status.bgColor} flex items-center gap-1.5`}>
            <StatusIcon className={`w-4 h-4 ${status.textColor}`} />
            <span className={`text-sm font-semibold ${status.textColor}`}>
              {status.label}
            </span>
          </div>
        </div>
        
        {/* Device Info */}
        <div>
          <h3 className="font-bold text-dark-900 dark:text-dark-50 text-lg mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {device.brand}
          </h3>
          <p className="text-dark-600 dark:text-dark-400 text-sm">
            {device.model}
          </p>
          {device.category && (
            <p className="text-xs text-dark-500 dark:text-dark-500 mt-1">
              {device.category}
            </p>
          )}
        </div>

        {/* Warranty Progress Bar */}
        {status.type !== 'expired' && status.type !== 'in-service' && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-dark-500 dark:text-dark-500">
              <span>Preostalo</span>
              <span className="font-medium">{status.daysRemaining} dana</span>
            </div>
            <div className="h-2 bg-dark-200 dark:bg-dark-700 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  status.severity === 'success' ? 'bg-green-600' :
                  status.severity === 'warning' ? 'bg-amber-600' :
                  'bg-red-600'
                }`}
                style={{ 
                  width: `${Math.min(Math.max((status.daysRemaining / device.warrantyDuration / 30) * 100, 0), 100)}%` 
                }}
              />
            </div>
          </div>
        )}

        {/* Dates */}
        <div className="flex items-center gap-4 pt-3 border-t border-dark-200 dark:border-dark-700">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-dark-400" />
            <div>
              <p className="text-xs text-dark-500 dark:text-dark-500">Kupovina</p>
              <p className="font-medium text-dark-900 dark:text-dark-50">
                {format(device.purchaseDate, 'dd.MM.yy', { locale: sr })}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-dark-400" />
            <div>
              <p className="text-xs text-dark-500 dark:text-dark-500">Ističe</p>
              <p className="font-medium text-dark-900 dark:text-dark-50">
                {format(device.warrantyExpiry, 'dd.MM.yy', { locale: sr })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
