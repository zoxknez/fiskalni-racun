import { ALL_CATEGORY_VALUE, categoryOptions, type Locale } from '@lib/categories'
import { formatCurrency } from '@lib/utils'
import { format } from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Calendar,
  Clock,
  Download,
  Filter,
  Receipt as ReceiptIcon,
  Search as SearchIcon,
  SlidersHorizontal,
  Sparkles,
  Tag,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Virtuoso } from 'react-virtuoso'
import { PageTransition } from '@/components/common/PageTransition'
import { useReceiptSearch, useReceipts } from '@/hooks/useDatabase'

type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'
type FilterPeriod = 'all' | 'today' | 'week' | 'month' | 'year'
type ReceiptTab = 'fiscal' | 'household'

export default function ReceiptsPage() {
  const { t, i18n } = useTranslation()
  const [activeTab, setActiveTab] = useState<ReceiptTab>('fiscal')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  const categoryLocale: Locale = i18n.language === 'sr' ? 'sr-Latn' : 'en'
  const categoryFilterOptions = useMemo(
    () => categoryOptions(categoryLocale, { includeAll: true }),
    [categoryLocale]
  )

  // Real-time database queries
  const allReceipts = useReceipts()
  const searchResults = useReceiptSearch(searchQuery)

  // Use search results if query exists, otherwise all receipts
  const rawReceipts = searchQuery ? searchResults : allReceipts
  const loading = !rawReceipts

  // Advanced filtering and sorting
  const receipts = useMemo(() => {
    if (!rawReceipts) return []

    let filtered = [...rawReceipts]

    // Filter by period
    if (filterPeriod !== 'all') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      filtered = filtered.filter((receipt) => {
        const receiptDate = new Date(receipt.date)

        switch (filterPeriod) {
          case 'today':
            return receiptDate >= today
          case 'week': {
            const weekAgo = new Date(today)
            weekAgo.setDate(weekAgo.getDate() - 7)
            return receiptDate >= weekAgo
          }
          case 'month': {
            const monthAgo = new Date(today)
            monthAgo.setMonth(monthAgo.getMonth() - 1)
            return receiptDate >= monthAgo
          }
          case 'year': {
            const yearAgo = new Date(today)
            yearAgo.setFullYear(yearAgo.getFullYear() - 1)
            return receiptDate >= yearAgo
          }
          default:
            return true
        }
      })
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter((r) => r.category === selectedCategory)
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.date).getTime() - new Date(a.date).getTime()
        case 'date-asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime()
        case 'amount-desc':
          return b.totalAmount - a.totalAmount
        case 'amount-asc':
          return a.totalAmount - b.totalAmount
        default:
          return 0
      }
    })

    return filtered
  }, [rawReceipts, sortBy, filterPeriod, selectedCategory])

  // Calculate stats
  const stats = useMemo(() => {
    if (!receipts) return { count: 0, total: 0, avg: 0 }

    const total = receipts.reduce((sum, r) => sum + r.totalAmount, 0)
    return {
      count: receipts.length,
      total,
      avg: receipts.length > 0 ? total / receipts.length : 0,
    }
  }, [receipts])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
          className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  return (
    <PageTransition className="space-y-6 pb-8">
      {/* Hero Header with Stats */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-purple-900 p-8 text-white shadow-2xl"
      >
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(circle at 25px 25px, white 2%, transparent 0%), radial-gradient(circle at 75px 75px, white 2%, transparent 0%)',
              backgroundSize: '100px 100px',
            }}
          />
        </div>

        {/* Floating Orbs */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY }}
          className="absolute -top-24 -right-24 w-96 h-96 bg-white/20 rounded-full blur-3xl"
        />

        <div className="relative z-10">
          {/* Title - Full Width */}
          <div className="flex flex-col gap-2 mb-6">
            <div className="flex items-center gap-2">
              <Zap className="w-7 h-7" />
              <h1 className="text-3xl sm:text-4xl font-black">{t('receipts.heroTitle')}</h1>
            </div>
          </div>

          {/* Stats Row - Larger cards on mobile */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-white/20"
            >
              <div className="text-3xl sm:text-4xl font-black mb-1">{stats.count}</div>
              <div className="text-xs sm:text-sm text-primary-100 uppercase tracking-wide font-semibold">
                {t('receipts.count')}
              </div>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-white/20"
            >
              <div className="text-2xl sm:text-3xl md:text-4xl font-black mb-1 truncate">
                {formatCurrency(stats.total)}
              </div>
              <div className="text-xs sm:text-sm text-primary-100 uppercase tracking-wide font-semibold">
                {t('receipts.total')}
              </div>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-white/20"
            >
              <div className="text-2xl sm:text-3xl md:text-4xl font-black mb-1 truncate">
                {formatCurrency(stats.avg)}
              </div>
              <div className="text-xs sm:text-sm text-primary-100 uppercase tracking-wide font-semibold">
                {t('receipts.average')}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Tabs for Fiscal vs Household */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2 bg-dark-100 dark:bg-dark-700/50 p-1 rounded-xl border border-transparent dark:border-dark-600"
      >
        <button
          onClick={() => setActiveTab('fiscal')}
          type="button"
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'fiscal'
              ? 'bg-white dark:bg-dark-600 text-primary-600 dark:text-primary-400 shadow-md border border-primary-200 dark:border-primary-700'
              : 'text-dark-600 dark:text-dark-300 hover:text-dark-900 dark:hover:text-dark-100 hover:bg-dark-50 dark:hover:bg-dark-600/50'
          }`}
        >
          <ReceiptIcon className="w-5 h-5" />
          <span>{t('receipts.tabFiscal')}</span>
        </button>
        <button
          onClick={() => setActiveTab('household')}
          type="button"
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'household'
              ? 'bg-white dark:bg-dark-600 text-primary-600 dark:text-primary-400 shadow-md border border-primary-200 dark:border-primary-700'
              : 'text-dark-600 dark:text-dark-300 hover:text-dark-900 dark:hover:text-dark-100 hover:bg-dark-50 dark:hover:bg-dark-600/50'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span>{t('receipts.tabHousehold')}</span>
        </button>
      </motion.div>

      {/* Search & Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative group">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400 group-focus-within:text-primary-600 transition-colors" />
            <input
              type="text"
              placeholder={t('receipts.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-12 pr-10 ring-2 ring-transparent focus:ring-primary-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-full transition-colors"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Toggle */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowFilters(!showFilters)}
            type="button"
            className={`btn-secondary flex items-center gap-2 ${showFilters ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : ''}`}
          >
            <SlidersHorizontal className="w-5 h-5" />
            <span>{t('receipts.filters')}</span>
            {(filterPeriod !== 'all' || selectedCategory) && (
              <span className="w-2 h-2 rounded-full bg-primary-600 animate-pulse" />
            )}
          </motion.button>
        </div>

        {/* Advanced Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="card p-6 space-y-4">
                {/* Period Filter */}
                <div>
                  <p className="text-sm font-semibold text-dark-700 dark:text-dark-300 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {t('receipts.filterByPeriod')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(['all', 'today', 'week', 'month', 'year'] as FilterPeriod[]).map((period) => (
                      <motion.button
                        key={period}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setFilterPeriod(period)}
                        type="button"
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                          filterPeriod === period
                            ? 'bg-primary-600 text-white shadow-lg'
                            : 'bg-dark-100 dark:bg-dark-800 text-dark-700 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-700'
                        }`}
                      >
                        {period === 'all' && t('receipts.periodAll')}
                        {period === 'today' && t('receipts.periodToday')}
                        {period === 'week' && t('receipts.periodWeek')}
                        {period === 'month' && t('receipts.periodMonth')}
                        {period === 'year' && t('receipts.periodYear')}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <p className="text-sm font-semibold text-dark-700 dark:text-dark-300 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    {t('receipts.sorting')}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { value: 'date-desc', label: t('receipts.sortNewest') },
                      { value: 'date-asc', label: t('receipts.sortOldest') },
                      { value: 'amount-desc', label: t('receipts.sortHighest') },
                      { value: 'amount-asc', label: t('receipts.sortLowest') },
                    ].map((option) => (
                      <motion.button
                        key={option.value}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSortBy(option.value as SortOption)}
                        type="button"
                        className={`px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                          sortBy === option.value
                            ? 'bg-primary-600 text-white shadow-lg'
                            : 'bg-dark-100 dark:bg-dark-800 text-dark-700 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-700'
                        }`}
                      >
                        {option.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Category Filter */}
                <div>
                  <p className="text-sm font-semibold text-dark-700 dark:text-dark-300 mb-3 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    {t('receipts.filterByCategory')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {categoryFilterOptions.map((option) => {
                      const isAll = option.value === ALL_CATEGORY_VALUE
                      const isActive = isAll
                        ? selectedCategory === ''
                        : selectedCategory === option.value
                      return (
                        <motion.button
                          key={option.value}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedCategory(isAll ? '' : option.value)}
                          type="button"
                          className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
                            isActive
                              ? 'bg-primary-600 text-white shadow-lg border-primary-600'
                              : 'bg-dark-100 dark:bg-dark-800 text-dark-700 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-700 border-dark-200 dark:border-dark-700'
                          }`}
                        >
                          <span
                            aria-hidden
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: option.color }}
                          />
                          <span className="whitespace-nowrap">{option.label}</span>
                        </motion.button>
                      )
                    })}
                  </div>
                </div>

                {/* Clear Filters */}
                {(filterPeriod !== 'all' || selectedCategory || sortBy !== 'date-desc') && (
                  <motion.button
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => {
                      setFilterPeriod('all')
                      setSelectedCategory('')
                      setSortBy('date-desc')
                    }}
                    type="button"
                    className="w-full px-4 py-2 bg-dark-100 dark:bg-dark-800 text-dark-700 dark:text-dark-300 rounded-lg hover:bg-dark-200 dark:hover:bg-dark-700 font-medium text-sm transition-colors"
                  >
                    {t('receipts.clearFilters')}
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Empty State */}
      {receipts.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20 px-6"
        >
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
            className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center mb-6 mx-auto shadow-2xl"
          >
            <ReceiptIcon className="w-12 h-12 text-white" />
          </motion.div>
          <h3 className="text-2xl font-bold text-dark-900 dark:text-dark-50 mb-3">
            {searchQuery ? 'Nema rezultata' : t('receipts.emptyState')}
          </h3>
          <p className="text-dark-600 dark:text-dark-400 mb-6 max-w-md mx-auto">
            {searchQuery
              ? 'Pokušaj sa drugim pojmom pretrage'
              : 'Dodaj prvi račun da počneš sa praćenjem troškova'}
          </p>
          {!searchQuery && (
            <Link to="/add">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Dodaj prvi račun
              </motion.button>
            </Link>
          )}
        </motion.div>
      )}

      {/* Receipts List - Virtual Scrolling for Performance */}
      {receipts.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-dark-900 dark:text-dark-50 flex items-center gap-2">
              <Filter className="w-5 h-5 text-primary-600" />
              {searchQuery ? `${receipts.length} rezultata` : `${receipts.length} računa`}
            </h2>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-ghost flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              Izvezi
            </motion.button>
          </div>

          {/* Virtual Scrolling List */}
          <div className="h-[600px] card p-2">
            <Virtuoso
              data={receipts}
              itemContent={(index, receipt) => (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="mb-2"
                >
                  <Link to={`/receipts/${receipt.id}`}>
                    <motion.div
                      whileHover={{ scale: 1.01, x: 5 }}
                      whileTap={{ scale: 0.99 }}
                      className="relative group overflow-hidden rounded-xl bg-white dark:bg-dark-800 p-4 border border-dark-200 dark:border-dark-700 hover:border-primary-300 dark:hover:border-primary-700 transition-all shadow-sm hover:shadow-lg"
                    >
                      {/* Hover Gradient */}
                      <div className="absolute inset-0 bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-900/10 dark:to-purple-900/10 opacity-0 group-hover:opacity-100 transition-opacity" />

                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          {/* Icon */}
                          <motion.div
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.5 }}
                            className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 shadow-lg flex items-center justify-center shrink-0"
                          >
                            <span className="text-white text-xl font-bold">
                              {receipt.merchantName?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </motion.div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-lg text-dark-900 dark:text-dark-50 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                              {receipt.merchantName}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <div className="flex items-center gap-1 text-sm text-dark-600 dark:text-dark-400">
                                <Clock className="w-3 h-3" />
                                {format(receipt.date, 'dd.MM.yyyy')} • {receipt.time}
                              </div>
                              {receipt.category && (
                                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                                  {receipt.category}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="text-right shrink-0 ml-4">
                          <p className="text-2xl font-black text-dark-900 dark:text-dark-50 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                            {formatCurrency(receipt.totalAmount)}
                          </p>
                          {receipt.vatAmount && (
                            <p className="text-xs text-dark-500 dark:text-dark-500 mt-1">
                              PDV: {formatCurrency(receipt.vatAmount)}
                            </p>
                          )}
                          {receipt.syncStatus === 'pending' && (
                            <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                              Sync...
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>
              )}
            />
          </div>
        </motion.div>
      )}
    </PageTransition>
  )
}
