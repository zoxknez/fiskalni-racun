import { useTranslation } from 'react-i18next'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Shield, CheckCircle2, XCircle, Plus } from 'lucide-react'
import { useDevices } from '@/hooks/useDatabase'
import { useDeviceFilters } from '@/hooks/useDeviceFilters'
import { useDeviceStats } from '@/hooks/useDeviceStats'
import DeviceCard from '@/components/devices/DeviceCard'
import FilterPill from '@/components/common/FilterPill'

export default function WarrantiesPage() {
  const { t } = useTranslation()

  // Real-time database query
  const allDevices = useDevices()
  
  // Custom hooks for filters and stats
  const { filter, setFilter, filteredDevices, filterCount } = useDeviceFilters(allDevices)
  const stats = useDeviceStats(allDevices)
  
  // Loading state
  const loading = allDevices === undefined

  // Track filter changes
  useEffect(() => {
    if (filter !== 'all') {
      // Analytics tracking can be added here if needed
      console.log('Filter changed:', filter)
    }
  }, [filter])

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

      {/* Filters - Reusable FilterPill Components */}
      <div className="flex flex-wrap gap-3">
        <FilterPill
          label={t('warranties.all')}
          count={filterCount('all')}
          icon={Shield}
          active={filter === 'all'}
          onClick={() => setFilter('all')}
          variant="primary"
        />
        
        <FilterPill
          label={t('warranties.active')}
          count={filterCount('active')}
          icon={CheckCircle2}
          active={filter === 'active'}
          onClick={() => setFilter('active')}
          variant="success"
        />
        
        <FilterPill
          label={t('warranties.expired')}
          count={filterCount('expired')}
          icon={XCircle}
          active={filter === 'expired'}
          onClick={() => setFilter('expired')}
          variant="danger"
        />
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

      {/* Devices List - Reusable DeviceCard Components */}
      {filteredDevices.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDevices.map((device) => (
            <DeviceCard key={device.id} device={device} />
          ))}
        </div>
      )}
    </div>
  )
}
