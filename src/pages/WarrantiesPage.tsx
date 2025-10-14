import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Shield } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { sr, enUS } from 'date-fns/locale'
import { useDevices } from '@/hooks/useDatabase'
import type { Device } from '@/types'

export default function WarrantiesPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'sr' ? sr : enUS
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all')

  // Real-time database query - get all devices
  // Using try-catch pattern by checking for undefined
  const allDevices = useDevices()
  
  // Handle loading and error states
  const loading = allDevices === undefined

  // Filter devices on frontend
  const filteredDevices = allDevices ? allDevices.filter((device) => {
    if (filter === 'active') return device.status === 'active'
    if (filter === 'expired') return device.status === 'expired'
    return true
  }) : []

  const getWarrantyBadge = (device: Device) => {
    const daysUntilExpiry = differenceInDays(device.warrantyExpiry, new Date())
    
    if (device.status === 'expired') {
      return <span className="badge badge-danger">{t('warranties.expired')}</span>
    }
    
    if (device.status === 'in-service') {
      return <span className="badge badge-info">{t('warranties.inService')}</span>
    }
    
    if (daysUntilExpiry <= 30) {
      return (
        <span className="badge badge-warning">
          {t('warranties.expiresIn')} {daysUntilExpiry} {t('warranties.days')}
        </span>
      )
    }
    
    return <span className="badge badge-success">{t('warranties.active')}</span>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-dark-900 dark:text-dark-50">
          {t('warranties.title')}
        </h1>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['all', 'active', 'expired'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
              filter === f
                ? 'bg-primary-600 text-white'
                : 'bg-dark-100 dark:bg-dark-800 text-dark-700 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-700'
            }`}
          >
            {t(`warranties.${f}`)}
          </button>
        ))}
      </div>

      {/* Empty State */}
      {filteredDevices.length === 0 && (
        <div className="empty-state">
          <div className="w-20 h-20 rounded-full bg-dark-100 dark:bg-dark-800 flex items-center justify-center mb-4">
            <Shield className="w-10 h-10 text-dark-400" />
          </div>
          <p className="text-dark-600 dark:text-dark-400 max-w-md">
            {t('warranties.emptyState')}
          </p>
        </div>
      )}

      {/* Devices List */}
      {filteredDevices.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDevices.map((device) => (
            <Link
              key={device.id}
              to={`/warranties/${device.id}`}
              className="card-hover"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shrink-0">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  {getWarrantyBadge(device)}
                </div>
                
                <div>
                  <h3 className="font-bold text-dark-900 dark:text-dark-50 text-lg">
                    {device.brand}
                  </h3>
                  <p className="text-dark-600 dark:text-dark-400">
                    {device.model}
                  </p>
                </div>

                <div className="text-sm text-dark-600 dark:text-dark-400">
                  <p>{t('warrantyDetail.purchaseDate')}:</p>
                  <p className="font-medium text-dark-900 dark:text-dark-50">
                    {format(device.purchaseDate, 'dd.MM.yyyy', { locale })}
                  </p>
                </div>

                <div className="text-sm text-dark-600 dark:text-dark-400">
                  <p>{t('warrantyDetail.warrantyExpires')}:</p>
                  <p className="font-medium text-dark-900 dark:text-dark-50">
                    {format(device.warrantyExpiry, 'dd.MM.yyyy', { locale })}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
