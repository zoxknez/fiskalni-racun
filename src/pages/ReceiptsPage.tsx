import { ALL_CATEGORY_VALUE, categoryOptions, type Locale } from '@lib/categories'
import { deleteReceipt } from '@lib/db'
import { formatCurrency } from '@lib/utils'
// import clsx from 'clsx'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import {
  Calendar,
  Check,
  CheckSquare,
  Clock,
  Filter,
  Plus,
  Receipt as ReceiptIcon,
  Search as SearchIcon,
  SlidersHorizontal,
  Sparkles,
  Square,
  Trash2,
  X,
  Zap,
} from 'lucide-react'
import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Virtuoso } from 'react-virtuoso'
import { BulkActionsToolbar } from '@/components/common/BulkActionsToolbar'
import { PageTransition } from '@/components/common/PageTransition'
import { SwipeableItem } from '@/components/common/SwipeableItem'
import { SkeletonReceiptCard, SkeletonStatsGrid } from '@/components/loading'
import { useBulkSelection } from '@/hooks/useBulkSelection'
import { useHouseholdBills, useReceiptSearch, useReceipts } from '@/hooks/useDatabase'
import { useDebounce } from '@/hooks/useDebounce'
import { useHaptic } from '@/hooks/useHaptic'
import { useToast } from '@/hooks/useToast'
// import { sleep } from '@/lib/async'
import { downloadCSV, exportHouseholdBillsToCSV, exportReceiptsToCSV } from '@/lib/exportUtils'
import { logger } from '@/lib/logger'
import { ReceiptExportMenu } from './ReceiptsPage/components/ReceiptExportMenu'
import { ReceiptFiltersPanel } from './ReceiptsPage/components/ReceiptFiltersPanel'
import type { FilterPeriod, ReceiptTab, SortOption } from './ReceiptsPage/types'

function ReceiptsPage() {
  const { t, i18n } = useTranslation()
  // const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<ReceiptTab>('fiscal')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [isDeleting, setIsDeleting] = useState(false)
  // const [apiBanner, setApiBanner] = useState<{ type: 'error' | 'success'; message: string } | null>(
  //   null
  // )
  // const [remoteVendors, setRemoteVendors] = useState<string[]>([])

  const categoryLocale: Locale = i18n.language === 'sr' ? 'sr-Latn' : 'en'
  const categoryFilterOptions = useMemo(
    () => categoryOptions(categoryLocale, { includeAll: true }),
    [categoryLocale]
  )

  // Real-time database queries
  const allReceipts = useReceipts()
  const householdBills = useHouseholdBills()
  const debouncedQuery = useDebounce(searchQuery, 300)
  const searchResults = useReceiptSearch(debouncedQuery)
  const toast = useToast()
  const { impactLight, impactMedium } = useHaptic()

  // Use search results if query exists, otherwise all receipts
  const rawReceipts = debouncedQuery ? searchResults : allReceipts
  const loading = !rawReceipts

  // Export functionality - CSV
  const handleExportFiscalCSV = useCallback(() => {
    if (!allReceipts || allReceipts.length === 0) {
      toast.warning(t('receipts.export.noFiscalData'))
      return
    }

    try {
      const csv = exportReceiptsToCSV(allReceipts)
      const filename = `fiskalni-racuni-${format(new Date(), 'yyyy-MM-dd')}`
      downloadCSV(csv, filename)
      toast.success(t('receipts.export.fiscalCsvSuccess'))
    } catch (error) {
      logger.error('Export fiscal receipts CSV failed', error)
      toast.error(t('receipts.export.fiscalError'))
    }
  }, [allReceipts, t, toast])

  const handleExportHouseholdCSV = useCallback(() => {
    if (!householdBills || householdBills.length === 0) {
      toast.warning(t('receipts.export.noHouseholdData'))
      return
    }

    try {
      const csv = exportHouseholdBillsToCSV(householdBills)
      const filename = `domacinstvo-racuni-${format(new Date(), 'yyyy-MM-dd')}`
      downloadCSV(csv, filename)
      toast.success(t('receipts.export.householdCsvSuccess'))
    } catch (error) {
      logger.error('Export household bills CSV failed', error)
      toast.error(t('receipts.export.householdError'))
    }
  }, [householdBills, t, toast])

  // Export functionality - Excel
  const handleExportFiscalExcel = useCallback(() => {
    if (!allReceipts || allReceipts.length === 0) {
      toast.warning(t('receipts.export.noFiscalData'))
      return
    }

    import('@/lib/excelUtils')
      .then(({ exportReceiptsToExcel }) => {
        exportReceiptsToExcel(allReceipts)
        toast.success(t('receipts.export.fiscalExcelSuccess'))
      })
      .catch((error) => {
        logger.error('Export fiscal receipts Excel failed', error)
        toast.error(t('receipts.export.fiscalError'))
      })
  }, [allReceipts, t, toast])

  const handleExportHouseholdExcel = useCallback(() => {
    if (!householdBills || householdBills.length === 0) {
      toast.warning(t('receipts.export.noHouseholdData'))
      return
    }

    import('@/lib/excelUtils')
      .then(({ exportHouseholdBillsToExcel }) => {
        exportHouseholdBillsToExcel(householdBills)
        toast.success(t('receipts.export.householdExcelSuccess'))
      })
      .catch((error) => {
        logger.error('Export household bills Excel failed', error)
        toast.error(t('receipts.export.householdError'))
      })
  }, [householdBills, t, toast])

  const handleExportAllExcel = useCallback(() => {
    const hasReceipts = allReceipts && allReceipts.length > 0
    const hasBills = householdBills && householdBills.length > 0

    if (!hasReceipts && !hasBills) {
      toast.warning(t('receipts.export.noData'))
      return
    }

    import('@/lib/excelUtils')
      .then(({ exportAllToExcel }) => {
        exportAllToExcel(allReceipts || [], householdBills || [])
        toast.success(t('receipts.export.allSuccess'))
      })
      .catch((error) => {
        logger.error('Export all data Excel failed', error)
        toast.error(t('receipts.export.allError'))
      })
  }, [allReceipts, householdBills, t, toast])

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

  // Bulk selection - pass receipts to hook
  const bulkSelection = useBulkSelection(receipts)

  // Bulk delete
  const handleBulkDelete = useCallback(async () => {
    const count = bulkSelection.selectionCount
    if (count === 0) return

    const confirmed = window.confirm(t('bulk.deleteConfirm', { count }))
    if (!confirmed) return

    setIsDeleting(true)
    try {
      const selectedIds = Array.from(bulkSelection.selectedIds)
      for (const id of selectedIds) {
        await deleteReceipt(id)
      }
      toast.success(t('bulk.deleteSuccess', { count }))
      bulkSelection.exitSelectionMode()
    } catch (error) {
      logger.error('Bulk delete failed', error)
      toast.error(t('common.error'))
    } finally {
      setIsDeleting(false)
    }
  }, [bulkSelection, t, toast])

  // Single delete handler
  const handleDeleteOne = useCallback(
    async (id: string) => {
      try {
        impactMedium()
        await deleteReceipt(id)
        toast.success(t('receiptDetail.deleteSuccess'))
      } catch (error) {
        logger.error('Delete failed', error)
        toast.error(t('common.error'))
      }
    },
    [t, toast, impactMedium]
  )

  // Bulk export selected
  const handleBulkExport = useCallback(() => {
    if (bulkSelection.selectionCount === 0) return

    try {
      const csv = exportReceiptsToCSV(bulkSelection.selectedItems)
      const filename = `fiskalni-racuni-izabrani-${format(new Date(), 'yyyy-MM-dd')}`
      downloadCSV(csv, filename)
      toast.success(t('bulk.exportSuccess', { count: bulkSelection.selectionCount }))
      bulkSelection.exitSelectionMode()
    } catch (error) {
      logger.error('Bulk export failed', error)
      toast.error(t('common.error'))
    }
  }, [bulkSelection, t, toast])

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
      <PageTransition className="space-y-6 pb-8">
        {/* Header Skeleton */}
        <div className="rounded-3xl bg-gray-50 p-8 dark:bg-gray-800">
          <SkeletonStatsGrid count={3} />
        </div>

        {/* Filters Skeleton */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-10 w-64 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="flex gap-2">
            <div className="h-10 w-24 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
            <div className="h-10 w-24 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>

        {/* Receipt Cards Skeleton */}
        <div className="space-y-4">
          {['skel-1', 'skel-2', 'skel-3', 'skel-4', 'skel-5'].map((key) => (
            <SkeletonReceiptCard key={key} />
          ))}
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition className="space-y-6 pb-8">
      {/* Hero Header with Stats */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-purple-900 p-6 text-white shadow-2xl sm:p-8"
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
          className="-top-24 -right-24 absolute h-96 w-96 rounded-full bg-white/20 blur-2xl"
        />

        <div className="relative z-10">
          {/* Title - Full Width */}
          <div className="mb-6 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 sm:h-7 sm:w-7" />
              <h1 className="font-black text-2xl sm:text-3xl md:text-4xl">
                {t('receipts.heroTitle')}
              </h1>
            </div>
          </div>

          {/* Stats Row - Larger cards on mobile */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="rounded-lg border border-white/20 bg-white/10 p-3 backdrop-blur-sm sm:rounded-xl sm:p-4 md:p-5"
            >
              <div className="mb-1 font-black text-2xl sm:text-3xl md:text-4xl">{stats.count}</div>
              <div className="font-semibold text-[9px] text-primary-100 uppercase leading-tight tracking-wide sm:text-xs md:text-sm">
                {t('receipts.count')}
              </div>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="rounded-lg border border-white/20 bg-white/10 p-3 backdrop-blur-sm sm:rounded-xl sm:p-4 md:p-5"
            >
              <div className="mb-1 truncate font-black text-xl sm:text-2xl md:text-3xl lg:text-4xl">
                {formatCurrency(stats.total)}
              </div>
              <div className="font-semibold text-[9px] text-primary-100 uppercase leading-tight tracking-wide sm:text-xs md:text-sm">
                {t('receipts.total')}
              </div>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="rounded-lg border border-white/20 bg-white/10 p-3 backdrop-blur-sm sm:rounded-xl sm:p-4 md:p-5"
            >
              <div className="mb-1 truncate font-black text-xl sm:text-2xl md:text-3xl lg:text-4xl">
                {formatCurrency(stats.avg)}
              </div>
              <div className="font-semibold text-[9px] text-primary-100 uppercase leading-tight tracking-wide sm:text-xs md:text-sm">
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
        className="flex gap-2 rounded-xl border border-transparent bg-dark-100 p-1 dark:border-dark-600 dark:bg-dark-700/50"
      >
        <button
          onClick={() => setActiveTab('fiscal')}
          type="button"
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-6 py-3 font-semibold transition-all ${
            activeTab === 'fiscal'
              ? 'border border-primary-200 bg-white text-primary-600 shadow-md dark:border-primary-700 dark:bg-dark-600 dark:text-primary-400'
              : 'text-dark-600 hover:bg-dark-50 hover:text-dark-900 dark:text-dark-300 dark:hover:bg-dark-600/50 dark:hover:text-dark-100'
          }`}
        >
          <ReceiptIcon className="h-5 w-5" />
          <span>{t('receipts.tabFiscal')}</span>
        </button>
        <button
          onClick={() => setActiveTab('household')}
          type="button"
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-6 py-3 font-semibold transition-all ${
            activeTab === 'household'
              ? 'border border-primary-200 bg-white text-primary-600 shadow-md dark:border-primary-700 dark:bg-dark-600 dark:text-primary-400'
              : 'text-dark-600 hover:bg-dark-50 hover:text-dark-900 dark:text-dark-300 dark:hover:bg-dark-600/50 dark:hover:text-dark-100'
          }`}
        >
          <Calendar className="h-5 w-5" />
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
        <div className="flex flex-col gap-3 sm:flex-row">
          {/* Search */}
          <div className="group relative flex-1">
            <SearchIcon className="-translate-y-1/2 absolute top-1/2 left-4 h-5 w-5 text-dark-400 transition-colors group-focus-within:text-primary-600" />
            <input
              type="text"
              placeholder={t('receipts.searchPlaceholder')}
              aria-label={t('receipts.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pr-10 pl-12 ring-2 ring-transparent transition-all focus:ring-primary-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="-translate-y-1/2 absolute top-1/2 right-3 rounded-full p-1 transition-colors hover:bg-dark-100 dark:hover:bg-dark-700"
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter Toggle */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setShowFilters(!showFilters)
              impactLight()
            }}
            type="button"
            className={`btn-secondary flex items-center gap-2 ${showFilters ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : ''}`}
          >
            <SlidersHorizontal className="h-5 w-5" />
            <span>{t('receipts.filters')}</span>
            {(filterPeriod !== 'all' || selectedCategory) && (
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary-600" />
            )}
          </motion.button>

          <ReceiptExportMenu
            activeTab={activeTab}
            isOpen={showExportMenu}
            onToggle={() => setShowExportMenu(!showExportMenu)}
            onClose={() => setShowExportMenu(false)}
            onExportFiscalCSV={handleExportFiscalCSV}
            onExportFiscalExcel={handleExportFiscalExcel}
            onExportHouseholdCSV={handleExportHouseholdCSV}
            onExportHouseholdExcel={handleExportHouseholdExcel}
            onExportAllExcel={handleExportAllExcel}
          />
        </div>

        <ReceiptFiltersPanel
          isOpen={showFilters}
          filterPeriod={filterPeriod}
          sortBy={sortBy}
          selectedCategory={selectedCategory}
          categoryFilterOptions={categoryFilterOptions}
          allCategoryValue={ALL_CATEGORY_VALUE}
          onFilterPeriodChange={setFilterPeriod}
          onSortChange={setSortBy}
          onCategoryChange={setSelectedCategory}
          onClear={() => {
            setFilterPeriod('all')
            setSelectedCategory('')
            setSortBy('date-desc')
          }}
        />
      </motion.div>

      {/* Empty State */}
      {receipts.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="px-6 py-20 text-center"
        >
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
            className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 shadow-2xl"
          >
            <ReceiptIcon className="h-12 w-12 text-white" />
          </motion.div>
          <h3 className="mb-3 font-bold text-2xl text-dark-900 dark:text-dark-50">
            {searchQuery ? t('receipts.noResults') : t('receipts.emptyState')}
          </h3>
          <p className="mx-auto mb-6 max-w-md text-dark-600 dark:text-dark-400">
            {searchQuery ? t('receipts.tryDifferentSearch') : t('receipts.addFirstHint')}
          </p>
          {!searchQuery && (
            <Link to="/add">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Sparkles className="h-5 w-5" />
                {t('receipts.addFirst')}
              </motion.button>
            </Link>
          )}
        </motion.div>
      )}

      {/* Receipts List - Virtual Scrolling for Performance */}
      {receipts.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-dark-900 text-lg dark:text-dark-50">
              <Filter className="h-5 w-5 text-primary-600" />
              {searchQuery
                ? t('receipts.resultsCount', { count: receipts.length })
                : t('receipts.receiptsCount', { count: receipts.length })}
            </h2>

            <div className="flex items-center gap-2">
              {/* Selection Mode Toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  bulkSelection.isSelectionMode
                    ? bulkSelection.exitSelectionMode()
                    : bulkSelection.enterSelectionMode()
                  impactLight()
                }}
                type="button"
                className={`btn-ghost flex items-center gap-2 text-sm ${
                  bulkSelection.isSelectionMode
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                    : ''
                }`}
              >
                {bulkSelection.isSelectionMode ? (
                  <>
                    <X className="h-4 w-4" />
                    {t('common.cancel')}
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-4 w-4" />
                    {t('bulk.selectAll')}
                  </>
                )}
              </motion.button>

              {/* Select All (when in selection mode) */}
              {bulkSelection.isSelectionMode && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={bulkSelection.toggleAll}
                  type="button"
                  className="btn-ghost flex items-center gap-2 text-sm"
                >
                  {bulkSelection.isAllSelected ? (
                    <>
                      <Check className="h-4 w-4" />
                      {t('bulk.deselectAll')}
                    </>
                  ) : (
                    <>
                      <Square className="h-4 w-4" />
                      {t('bulk.selectAll')}
                    </>
                  )}
                </motion.button>
              )}
            </div>
          </div>

          {/* Virtual Scrolling List */}
          <div className="card h-[600px] p-2">
            <Virtuoso
              data={receipts}
              itemContent={(index, receipt) => (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="mb-2"
                >
                  {bulkSelection.isSelectionMode ? (
                    // Selection mode - clickable card with checkbox
                    <motion.div
                      whileHover={{ scale: 1.01, x: 5 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => receipt.id && bulkSelection.toggle(receipt.id)}
                      className={`group relative cursor-pointer overflow-hidden rounded-xl border p-4 shadow-sm transition-all ${
                        receipt.id && bulkSelection.isSelected(receipt.id)
                          ? 'border-primary-500 bg-primary-50 dark:border-primary-600 dark:bg-primary-900/20'
                          : 'border-dark-200 bg-white hover:border-primary-300 hover:shadow-lg dark:border-dark-700 dark:bg-dark-800 dark:hover:border-primary-700'
                      }`}
                    >
                      {/* Selection indicator */}
                      <div className="absolute inset-0 bg-gradient-to-r from-primary-50 to-purple-50 opacity-0 transition-opacity group-hover:opacity-100 dark:from-primary-900/10 dark:to-purple-900/10" />

                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex min-w-0 flex-1 items-center gap-4">
                          {/* Checkbox */}
                          <div
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                              receipt.id && bulkSelection.isSelected(receipt.id)
                                ? 'border-primary-600 bg-primary-600 text-white'
                                : 'border-dark-300 bg-white dark:border-dark-600 dark:bg-dark-700'
                            }`}
                          >
                            {receipt.id && bulkSelection.isSelected(receipt.id) && (
                              <Check className="h-4 w-4" />
                            )}
                          </div>

                          {/* Icon */}
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 shadow-lg">
                            <span className="font-bold text-white text-xl">
                              {receipt.merchantName?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-bold text-dark-900 text-lg dark:text-dark-50">
                              {receipt.merchantName}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <div className="flex items-center gap-1 text-dark-600 text-sm dark:text-dark-400">
                                <Clock className="h-3 w-3" />
                                {format(receipt.date, 'dd.MM.yyyy')} • {receipt.time}
                              </div>
                              {receipt.category && (
                                <span className="inline-block rounded-full bg-primary-100 px-2 py-0.5 font-medium text-primary-700 text-xs dark:bg-primary-900/30 dark:text-primary-300">
                                  {receipt.category}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="ml-4 shrink-0 text-right">
                          <p className="font-black text-2xl text-dark-900 dark:text-dark-50">
                            {formatCurrency(receipt.totalAmount)}
                          </p>
                          {receipt.vatAmount && (
                            <p className="mt-1 text-dark-500 text-xs dark:text-dark-500">
                              PDV: {formatCurrency(receipt.vatAmount)}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    // Normal mode - Swipeable Item
                    <SwipeableItem
                      onSwipeLeft={() => receipt.id && handleDeleteOne(receipt.id)}
                      swipeLeftColor="bg-red-500"
                      swipeLeftIcon={<Trash2 className="h-6 w-6 text-white" />}
                      className="rounded-xl"
                    >
                      <Link to={`/receipts/${receipt.id}`}>
                        <div className="group relative overflow-hidden rounded-xl border border-dark-200 bg-white p-4 shadow-sm transition-all hover:border-primary-300 hover:shadow-lg dark:border-dark-700 dark:bg-dark-800 dark:hover:border-primary-700">
                          {/* Hover Gradient */}
                          <div className="absolute inset-0 bg-gradient-to-r from-primary-50 to-purple-50 opacity-0 transition-opacity group-hover:opacity-100 dark:from-primary-900/10 dark:to-purple-900/10" />

                          <div className="relative z-10 flex items-center justify-between">
                            <div className="flex min-w-0 flex-1 items-center gap-4">
                              {/* Icon */}
                              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 shadow-lg">
                                <span className="font-bold text-white text-xl">
                                  {receipt.merchantName?.charAt(0).toUpperCase() || '?'}
                                </span>
                              </div>

                              {/* Info */}
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-bold text-dark-900 text-lg transition-colors group-hover:text-primary-600 dark:text-dark-50 dark:group-hover:text-primary-400">
                                  {receipt.merchantName}
                                </p>
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                  <div className="flex items-center gap-1 text-dark-600 text-sm dark:text-dark-400">
                                    <Clock className="h-3 w-3" />
                                    {format(receipt.date, 'dd.MM.yyyy')} • {receipt.time}
                                  </div>
                                  {receipt.category && (
                                    <span className="inline-block rounded-full bg-primary-100 px-2 py-0.5 font-medium text-primary-700 text-xs dark:bg-primary-900/30 dark:text-primary-300">
                                      {receipt.category}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Amount */}
                            <div className="ml-4 shrink-0 text-right">
                              <p className="font-black text-2xl text-dark-900 transition-colors group-hover:text-primary-600 dark:text-dark-50 dark:group-hover:text-primary-400">
                                {formatCurrency(receipt.totalAmount)}
                              </p>
                              {receipt.vatAmount && (
                                <p className="mt-1 text-dark-500 text-xs dark:text-dark-500">
                                  PDV: {formatCurrency(receipt.vatAmount)}
                                </p>
                              )}
                              {receipt.syncStatus === 'pending' && (
                                <span className="mt-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700 text-xs dark:bg-amber-900/30 dark:text-amber-300">
                                  Sync...
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </SwipeableItem>
                  )}
                </motion.div>
              )}
            />
          </div>
        </motion.div>
      )}

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectionCount={bulkSelection.selectionCount}
        isAllSelected={bulkSelection.isAllSelected}
        onSelectAll={bulkSelection.selectAll}
        onDeselectAll={bulkSelection.deselectAll}
        onDelete={handleBulkDelete}
        onExport={handleBulkExport}
        onClose={bulkSelection.exitSelectionMode}
        isDeleting={isDeleting}
        showTagAction={false}
      />

      {/* Floating Action Button - Mobile Optimized */}
      <Link to="/add-receipt">
        <motion.button
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="group fixed right-4 bottom-20 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 shadow-2xl transition-shadow hover:shadow-primary-500/50 lg:right-6 lg:bottom-6 lg:h-16 lg:w-16 lg:rounded-full dark:shadow-primary-500/30"
          aria-label={t('addReceipt.title', { defaultValue: 'Dodaj račun' })}
        >
          <Plus className="h-7 w-7 text-white transition-transform group-hover:rotate-90 lg:h-8 lg:w-8" />

          {/* Pulse ring - hidden on mobile */}
          <span className="-inset-1 hidden animate-ping rounded-full bg-primary-400 opacity-30 lg:absolute" />

          {/* Glow effect - hidden on mobile */}
          <span className="-inset-2 hidden rounded-full bg-gradient-to-br from-primary-400 to-purple-500 opacity-40 blur-md transition-opacity group-hover:opacity-60 lg:absolute" />
        </motion.button>
      </Link>
    </PageTransition>
  )
}

// ⭐ OPTIMIZED: Memoize component to prevent unnecessary re-renders
export default memo(ReceiptsPage)
