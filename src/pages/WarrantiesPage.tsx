import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Shield, Calendar, Clock, CheckCircle2, AlertTriangle, XCircle, Plus } from 'lucide-react'
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

  const getWarrantyStatus = (device: Device) => {
    const daysUntilExpiry = differenceInDays(device.warrantyExpiry, new Date())
    
    if (device.status === 'expired') {
      return {
        icon: XCircle,
        text: t('warranties.expired'),
        color: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-100 dark:bg-red-900/30',
        badgeClass: 'badge badge-danger'
      }
    }
    
    if (device.status === 'in-service') {
      return {
        icon: Clock,
        text: t('warranties.inService'),
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        badgeClass: 'badge badge-info'
      }
    }
    
    if (daysUntilExpiry <= 30) {
      return {
        icon: AlertTriangle,
        text: `${t('warranties.expiresIn')} ${daysUntilExpiry} ${t('warranties.days')}`,
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-100 dark:bg-amber-900/30',
        badgeClass: 'badge badge-warning'
      }
    }
    
    return {
      icon: CheckCircle2,
      text: t('warranties.active'),
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-100 dark:bg-green-900/30',
      badgeClass: 'badge badge-success'
    }
  }

  // Stats calculation
  const stats = {
    total: allDevices?.length || 0,
    active: allDevices?.filter(d => d.status === 'active').length || 0,
    expired: allDevices?.filter(d => d.status === 'expired').length || 0,
    expiringSoon: allDevices?.filter(d => {
      const days = differenceInDays(d.warrantyExpiry, new Date())
      return d.status === 'active' && days <= 30 && days > 0
    }).length || 0
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
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-dark-900 dark:text-dark-50">
            {t('warranties.title')}
          </h1>
          <p className="text-dark-600 dark:text-dark-400 mt-1">
            {stats.total} {stats.total === 1 ? 'uređaj' : 'uređaja'}
          </p>
        </div>
        <Link
          to="/warranties/add"
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">{t('warranties.addDevice')}</span>
        </Link>
      </div>

      {/* Filters - Modern Pills Design (includes stats) */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setFilter('all')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 ${
            filter === 'all'
              ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/40 scale-105'
              : 'bg-white dark:bg-dark-800 text-dark-700 dark:text-dark-300 border-2 border-dark-200 dark:border-dark-700 hover:border-primary-400 dark:hover:border-primary-600 hover:scale-105'
          }`}
        >
          <Shield className="w-5 h-5" />
          <span>{t('warranties.all')}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            filter === 'all'
              ? 'bg-white/20 text-white'
              : 'bg-dark-100 dark:bg-dark-700 text-dark-600 dark:text-dark-400'
          }`}>
            {stats.total}
          </span>
        </button>

        <button
          onClick={() => setFilter('active')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 ${
            filter === 'active'
              ? 'bg-green-600 text-white shadow-lg shadow-green-600/40 scale-105'
              : 'bg-white dark:bg-dark-800 text-dark-700 dark:text-dark-300 border-2 border-dark-200 dark:border-dark-700 hover:border-green-400 dark:hover:border-green-600 hover:scale-105'
          }`}
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>{t('warranties.active')}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            filter === 'active'
              ? 'bg-white/20 text-white'
              : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
          }`}>
            {stats.active}
          </span>
        </button>

        <button
          onClick={() => setFilter('expired')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 ${
            filter === 'expired'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/40 scale-105'
              : 'bg-white dark:bg-dark-800 text-dark-700 dark:text-dark-300 border-2 border-dark-200 dark:border-dark-700 hover:border-red-400 dark:hover:border-red-600 hover:scale-105'
          }`}
        >
          <XCircle className="w-5 h-5" />
          <span>{t('warranties.expired')}</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            filter === 'expired'
              ? 'bg-white/20 text-white'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
          }`}>
            {stats.expired}
          </span>
        </button>
      </div>

      {/* Empty State - No devices at all */}
      {stats.total === 0 && (
        <div className="empty-state">
          <div className="w-20 h-20 rounded-full bg-dark-100 dark:bg-dark-800 flex items-center justify-center mb-4">
            <Shield className="w-10 h-10 text-dark-400" />
          </div>
          <p className="text-dark-600 dark:text-dark-400 max-w-md mb-4">
            {t('warranties.emptyState')}
          </p>
          <Link to="/receipts" className="btn btn-primary">
            Pregledaj račune
          </Link>
        </div>
      )}

      {/* Empty Filter - Has devices but none match filter */}
      {stats.total > 0 && filteredDevices.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-dark-100 dark:bg-dark-800 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-dark-400" />
          </div>
          <p className="text-dark-600 dark:text-dark-400">
            Nema uređaja sa statusom "{t(`warranties.${filter}`)}"
          </p>
        </div>
      )}

      {/* Devices List */}
      {filteredDevices.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDevices.map((device) => {
            const status = getWarrantyStatus(device)
            const StatusIcon = status.icon
            
            return (
              <Link
                key={device.id}
                to={`/warranties/${device.id}`}
                className="card-hover group"
              >
                <div className="flex flex-col gap-4">
                  {/* Header with Icon and Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className={`w-14 h-14 rounded-xl ${status.bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                      <Shield className={`w-7 h-7 ${status.color}`} />
                    </div>
                    <div className={`px-3 py-1 rounded-full ${status.bg} flex items-center gap-1.5`}>
                      <StatusIcon className={`w-4 h-4 ${status.color}`} />
                      <span className={`text-sm font-medium ${status.color}`}>
                        {status.text.split(' ')[0]}
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
                  </div>

                  {/* Dates */}
                  <div className="flex items-center gap-4 pt-3 border-t border-dark-200 dark:border-dark-700">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-dark-400" />
                      <div>
                        <p className="text-xs text-dark-500 dark:text-dark-500">Kupovina</p>
                        <p className="font-medium text-dark-900 dark:text-dark-50">
                          {format(device.purchaseDate, 'dd.MM.yy', { locale })}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-dark-400" />
                      <div>
                        <p className="text-xs text-dark-500 dark:text-dark-500">Ističe</p>
                        <p className="font-medium text-dark-900 dark:text-dark-50">
                          {format(device.warrantyExpiry, 'dd.MM.yy', { locale })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
