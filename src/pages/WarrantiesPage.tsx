import { deviceCategoryLabel } from '@lib/categories'
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Package,
  Plus,
  Search,
  Shield,
  TrendingUp,
  X,
  XCircle,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { PageTransition } from '@/components/common/PageTransition'
import DeviceCard from '@/components/devices/DeviceCard'
import { useDevices } from '@/hooks/useDatabase'
import { useDeviceFilters } from '@/hooks/useDeviceFilters'
import { useDeviceStats } from '@/hooks/useDeviceStats'

export default function WarrantiesPage() {
  const { t, i18n } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const { scrollY } = useScroll()

  const allDevices = useDevices()
  const {
    filter,
    setFilter,
    filteredDevices: hookFilteredDevices,
    filterCount,
  } = useDeviceFilters(allDevices)
  const stats = useDeviceStats(allDevices)

  const loading = allDevices === undefined

  const filteredDevices = useMemo(() => {
    if (!hookFilteredDevices) return []
    const q = searchQuery.trim().toLowerCase()
    if (!q) return hookFilteredDevices
    const contains = (s?: string) => (s ?? '').toLowerCase().includes(q)
    return hookFilteredDevices.filter(
      (d) =>
        contains(d.brand) || contains(d.model) || contains(d.category) || contains(d.serialNumber)
    )
  }, [hookFilteredDevices, searchQuery])

  const heroOpacity = useTransform(scrollY, [0, 200], [1, 0])
  const heroScale = useTransform(scrollY, [0, 200], [1, 0.95])

  // CSV export (sa lokalizovanim nazivom kategorije)
  const exportCsv = useCallback(() => {
    const safeISO = (d: Date | string | undefined) => {
      const date = d instanceof Date ? d : d ? new Date(d) : undefined
      return date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : ''
    }

    type CsvRow = {
      id: number | string
      brand: string
      model: string
      category: string
      serialNumber: string
      purchaseDate: string
      warrantyDurationMonths: number | string
      warrantyExpiry: string
      status: string
    }

    const rows: CsvRow[] = filteredDevices.map((d) => ({
      id: d.id ?? '',
      brand: d.brand ?? '',
      model: d.model ?? '',
      category: deviceCategoryLabel(d.category ?? 'other', i18n.language),
      serialNumber: d.serialNumber ?? '',
      purchaseDate: safeISO(d.purchaseDate),
      warrantyDurationMonths: d.warrantyDuration ?? '',
      warrantyExpiry: safeISO(d.warrantyExpiry),
      status: d.status ?? '',
    }))

    if (!rows.length) return

    const firstRow = rows[0]
    if (!firstRow) return

    const headers = Object.keys(firstRow) as Array<keyof CsvRow>
    const esc = (val: CsvRow[keyof CsvRow]) => {
      const s = String(val ?? '')
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }

    const csvRows = rows.map((row) => headers.map((key) => esc(row[key])).join(','))
    const csv = [headers.join(','), ...csvRows].join('\r\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const today = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `warranties-${today}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }, [filteredDevices, i18n.language])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
          className="h-12 w-12 rounded-full border-4 border-primary-500/30 border-t-primary-500"
        />
      </div>
    )
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Hero sa statistikama */}
        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 to-primary-400 p-8 text-white"
        >
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                backgroundSize: '32px 32px',
              }}
            />
          </div>
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY }}
            className="absolute top-10 right-10 h-32 w-32 rounded-full bg-white blur-3xl"
          />
          <motion.div
            animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 5, repeat: Number.POSITIVE_INFINITY }}
            className="absolute bottom-10 left-10 h-40 w-40 rounded-full bg-primary-300 blur-3xl"
          />

          <div className="relative z-10">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="mb-2 flex items-center gap-3"
                >
                  <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
                    <Shield className="h-8 w-8" />
                  </div>
                  <h1 className="font-bold text-4xl">{t('warranties.heroTitle')}</h1>
                </motion.div>
                <motion.p
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-lg text-white/80"
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
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 font-semibold text-primary-600 shadow-lg transition-all duration-300 hover:scale-105 hover:bg-white/90 hover:shadow-xl sm:w-auto"
                >
                  <Plus className="h-5 w-5 flex-shrink-0" />
                  <span>{t('warranties.addDevice')}</span>
                </Link>
              </motion.div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
              {[
                {
                  label: t('warranties.statsTotal'),
                  value: stats.total,
                  icon: Package,
                  color: 'from-primary-400 to-primary-300',
                },
                {
                  label: t('warranties.statsActive'),
                  value: stats.active,
                  icon: CheckCircle2,
                  color: 'from-primary-500 to-primary-400',
                },
                {
                  label: t('warranties.statsInService'),
                  value: filterCount('in-service'),
                  icon: Clock,
                  color: 'from-primary-400 to-blue-400',
                },
                {
                  label: t('warranties.statsExpired'),
                  value: stats.expired,
                  icon: XCircle,
                  color: 'from-blue-500 to-primary-500',
                },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="group relative"
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm" />
                  <div className="relative p-3 sm:p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="truncate pr-2 font-medium text-white/70 text-xs sm:text-sm">
                        {stat.label}
                      </span>
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{
                          duration: 20,
                          repeat: Number.POSITIVE_INFINITY,
                          ease: 'linear',
                        }}
                        className={`bg-gradient-to-br p-1.5 sm:p-2 ${stat.color} flex-shrink-0 rounded-xl`}
                      >
                        <stat.icon className="h-3 w-3 text-white sm:h-4 sm:w-4" />
                      </motion.div>
                    </div>
                    <div className="truncate font-bold text-2xl sm:text-3xl">{stat.value}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Search & Filters */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="-translate-y-1/2 absolute top-1/2 left-4 h-5 w-5 text-dark-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('warranties.searchPlaceholder')}
              className="w-full rounded-2xl border-2 border-dark-200 bg-white py-4 pr-12 pl-12 text-lg transition-all duration-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20 dark:border-dark-700 dark:bg-dark-800"
              aria-label={t('warranties.searchPlaceholder')}
            />
            <AnimatePresence>
              {searchQuery && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => setSearchQuery('')}
                  className="-translate-y-1/2 absolute top-1/2 right-4 rounded-lg p-2 transition-colors hover:bg-dark-100 dark:hover:bg-dark-700"
                  aria-label={t('common.clear') || 'Clear'}
                >
                  <X className="h-4 w-4" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
            {[
              { key: 'all' as const, label: t('warranties.filterAll'), icon: Shield },
              { key: 'active' as const, label: t('warranties.filterActive'), icon: CheckCircle2 },
              { key: 'in-service' as const, label: t('warranties.filterInService'), icon: Clock },
              { key: 'expired' as const, label: t('warranties.filterExpired'), icon: XCircle },
            ].map((opt) => (
              <motion.button
                key={opt.key}
                onClick={() => setFilter(opt.key)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 font-medium transition-all duration-300 sm:px-4 ${
                  filter === opt.key
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                    : 'bg-white text-dark-700 hover:bg-dark-50 dark:bg-dark-800 dark:text-dark-300 dark:hover:bg-dark-700'
                }`}
              >
                <opt.icon className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm sm:text-base">{opt.label}</span>
                <span
                  className={`rounded-lg px-2 py-0.5 font-semibold text-xs ${
                    filter === opt.key
                      ? 'bg-white/20 text-white'
                      : 'bg-dark-100 text-dark-600 dark:bg-dark-700 dark:text-dark-400'
                  }`}
                >
                  {filterCount(opt.key)}
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Empty states */}
        {stats.total === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-16 text-center"
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary-100 to-purple-100 dark:from-primary-900/20 dark:to-purple-900/20"
            >
              <Shield className="h-12 w-12 text-primary-500" />
            </motion.div>
            <h3 className="mb-2 font-bold text-2xl text-dark-900 dark:text-dark-50">
              {t('warranties.emptyTitle') || 'Nema dodanih uređaja'}
            </h3>
            <p className="mx-auto mb-6 max-w-md text-dark-600 dark:text-dark-400">
              {t('warranties.emptySubtitle') || 'Dodajte uređaje kako biste pratili garancije'}
            </p>
            <Link
              to="/warranties/add"
              className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-6 py-3 font-semibold text-white shadow-lg shadow-primary-500/30 transition-all duration-300 hover:scale-105 hover:bg-primary-600"
            >
              <Plus className="h-5 w-5" />
              <span>{t('warranties.addFirst') || 'Dodaj prvi uređaj'}</span>
            </Link>
          </motion.div>
        )}

        {stats.total > 0 && filteredDevices.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-16 text-center"
          >
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-dark-100 dark:bg-dark-800">
              <AlertCircle className="h-10 w-10 text-dark-400" />
            </div>
            <h3 className="mb-2 font-semibold text-dark-900 text-xl dark:text-dark-50">
              {t('warranties.noResultsTitle') || 'Nema rezultata'}
            </h3>
            <p className="text-dark-600 dark:text-dark-400">
              {searchQuery
                ? (t('warranties.noResultsSearch', { q: searchQuery }) as string) ||
                  `Nije pronađen nijedan uređaj sa pojmom "${searchQuery}"`
                : (t('warranties.noResultsFilter', { filter }) as string) ||
                  `Nema uređaja u statusu "${filter}"`}
            </p>
          </motion.div>
        )}

        {/* Lista uređaja */}
        {filteredDevices.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-dark-900 text-xl dark:text-dark-50">
                {filteredDevices.length}{' '}
                {filteredDevices.length === 1
                  ? t('warranties.deviceOne') || 'uređaj'
                  : t('warranties.deviceMany') || 'uređaja'}
              </h2>
              <motion.button
                type="button"
                onClick={exportCsv}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 rounded-xl bg-primary-50 px-4 py-2 font-medium text-primary-600 transition-colors hover:bg-primary-100 dark:bg-primary-900/20 dark:text-primary-400 dark:hover:bg-primary-900/30"
              >
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">{t('warranties.export') || 'Izvezi'}</span>
              </motion.button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredDevices.map((device, index) => (
                <motion.div
                  key={device.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.3) }}
                >
                  <DeviceCard device={device} compact />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </PageTransition>
  )
}
