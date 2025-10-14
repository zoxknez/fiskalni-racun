import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Shield, CheckCircle2, XCircle, Plus, Search, X, TrendingUp, AlertCircle, Clock, Package } from 'lucide-react'
import { useDevices } from '@/hooks/useDatabase'
import { useDeviceFilters } from '@/hooks/useDeviceFilters'
import { useDeviceStats } from '@/hooks/useDeviceStats'
import DeviceCard from '@/components/devices/DeviceCard'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { Virtuoso } from 'react-virtuoso'
import { PageTransition } from '../components/common/PageTransition'
import { useTranslation } from 'react-i18next'

export default function WarrantiesPage() {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const { scrollY } = useScroll()

  // Real-time database query
  const allDevices = useDevices()
  
  // Custom hooks for filters and stats
  const { filter, setFilter, filteredDevices: hookFilteredDevices, filterCount } = useDeviceFilters(allDevices)
  const stats = useDeviceStats(allDevices)
  
  // Loading state
  const loading = allDevices === undefined

  // Additional search filtering
  const filteredDevices = useMemo(() => {
    if (!hookFilteredDevices) return []
    if (!searchQuery.trim()) return hookFilteredDevices
    
    const query = searchQuery.toLowerCase()
    return hookFilteredDevices.filter(device => 
      device.brand?.toLowerCase().includes(query) ||
      device.category?.toLowerCase().includes(query) ||
      device.model?.toLowerCase().includes(query) ||
      device.serialNumber?.toLowerCase().includes(query)
    )
  }, [hookFilteredDevices, searchQuery])

  // Parallax effects
  const heroOpacity = useTransform(scrollY, [0, 200], [1, 0])
  const heroScale = useTransform(scrollY, [0, 200], [1, 0.95])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full"
        />
      </div>
    )
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Hero Section with Stats */}
        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 to-primary-400 p-8 text-white"
        >
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: '32px 32px'
            }} />
          </div>

          {/* Floating orbs */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute top-10 right-10 w-32 h-32 bg-white rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{ duration: 5, repeat: Infinity }}
            className="absolute bottom-10 left-10 w-40 h-40 bg-primary-300 rounded-full blur-3xl"
          />

          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 mb-2"
                >
                  <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl">
                    <Shield className="w-8 h-8" />
                  </div>
                  <h1 className="text-4xl font-bold">{t('warranties.heroTitle')}</h1>
                </motion.div>
                <motion.p
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-white/80 text-lg"
                >
                  {t('warranties.subtitle')}
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Link
                  to="/warranties/add"
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-primary-600 rounded-2xl font-semibold hover:bg-white/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 w-full sm:w-auto"
                >
                  <Plus className="w-5 h-5 flex-shrink-0" />
                  <span>{t('warranties.addDevice')}</span>
                </Link>
              </motion.div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {[
                { label: t('warranties.statsTotal'), value: stats.total, icon: Package, color: 'from-primary-400 to-primary-300' },
                { label: t('warranties.statsActive'), value: stats.active, icon: CheckCircle2, color: 'from-primary-500 to-primary-400' },
                { label: t('warranties.statsInService'), value: filterCount('in-service'), icon: Clock, color: 'from-primary-400 to-blue-400' },
                { label: t('warranties.statsExpired'), value: stats.expired, icon: XCircle, color: 'from-blue-500 to-primary-500' },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl backdrop-blur-sm" />
                  <div className="relative p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/70 text-xs sm:text-sm font-medium truncate pr-2">{stat.label}</span>
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                        className={`p-1.5 sm:p-2 bg-gradient-to-br ${stat.color} rounded-xl flex-shrink-0`}
                      >
                        <stat.icon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                      </motion.div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold truncate">{stat.value}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Search & Filters */}
        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('warranties.searchPlaceholder')}
              className="w-full pl-12 pr-12 py-4 bg-white dark:bg-dark-800 border-2 border-dark-200 dark:border-dark-700 rounded-2xl focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 transition-all duration-300 text-lg"
            />
            <AnimatePresence>
              {searchQuery && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Filter Pills */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
            {[
              { key: 'all' as const, label: t('warranties.filterAll'), icon: Shield, color: 'primary' },
              { key: 'active' as const, label: t('warranties.filterActive'), icon: CheckCircle2, color: 'success' },
              { key: 'in-service' as const, label: t('warranties.filterInService'), icon: Clock, color: 'warning' },
              { key: 'expired' as const, label: t('warranties.filterExpired'), icon: XCircle, color: 'danger' },
            ].map((filterOption) => (
              <motion.button
                key={filterOption.key}
                onClick={() => setFilter(filterOption.key)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl font-medium transition-all duration-300
                  ${filter === filterOption.key
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                    : 'bg-white dark:bg-dark-800 text-dark-700 dark:text-dark-300 hover:bg-dark-50 dark:hover:bg-dark-700'
                  }
                `}
              >
                <filterOption.icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm sm:text-base">{filterOption.label}</span>
                <span className={`
                  px-2 py-0.5 rounded-lg text-xs font-semibold
                  ${filter === filterOption.key
                    ? 'bg-white/20 text-white'
                    : 'bg-dark-100 dark:bg-dark-700 text-dark-600 dark:text-dark-400'
                  }
                `}>
                  {filterCount(filterOption.key)}
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Empty State - No devices at all */}
        {stats.total === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <motion.div
              animate={{
                rotate: [0, 5, -5, 0],
                scale: [1, 1.05, 1],
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-primary-100 to-purple-100 dark:from-primary-900/20 dark:to-purple-900/20 flex items-center justify-center"
            >
              <Shield className="w-12 h-12 text-primary-500" />
            </motion.div>
            <h3 className="text-2xl font-bold text-dark-900 dark:text-dark-50 mb-2">
              Nema dodanih uređaja
            </h3>
            <p className="text-dark-600 dark:text-dark-400 mb-6 max-w-md mx-auto">
              Dodajte uređaje kako biste pratili njihove garancije i primali podsetn ike
            </p>
            <Link
              to="/warranties/add"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl font-semibold hover:bg-primary-600 transition-all duration-300 hover:scale-105 shadow-lg shadow-primary-500/30"
            >
              <Plus className="w-5 h-5" />
              <span>Dodaj prvi uređaj</span>
            </Link>
          </motion.div>
        )}

        {/* Empty Filter - Has devices but none match filter */}
        {stats.total > 0 && filteredDevices.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-dark-100 dark:bg-dark-800 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-dark-400" />
            </div>
            <h3 className="text-xl font-semibold text-dark-900 dark:text-dark-50 mb-2">
              Nema rezultata
            </h3>
            <p className="text-dark-600 dark:text-dark-400">
              {searchQuery 
                ? `Nije pronađen nijedan uređaj sa pojmom "${searchQuery}"`
                : `Nema uređaja u statusu "${filter}"`
              }
            </p>
          </motion.div>
        )}

        {/* Devices List - Virtual Scrolling */}
        {filteredDevices.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-dark-800 rounded-2xl p-6 shadow-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-dark-900 dark:text-dark-50">
                {filteredDevices.length} {filteredDevices.length === 1 ? 'uređaj' : 'uređaja'}
              </h2>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-xl font-medium hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
              >
                <TrendingUp className="w-4 h-4" />
                <span>Izvezi</span>
              </motion.button>
            </div>

            <Virtuoso
              style={{ height: '600px' }}
              data={filteredDevices}
              itemContent={(index, device) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="mb-4 last:mb-0"
                >
                  <motion.div
                    whileHover={{ scale: 1.01, x: 5 }}
                    className="relative group"
                  >
                    {/* Hover gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-500/0 via-primary-500/5 to-purple-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    <div className="relative">
                      <DeviceCard device={device} />
                    </div>
                  </motion.div>
                </motion.div>
              )}
            />
          </motion.div>
        )}
      </div>
    </PageTransition>
  )
}
