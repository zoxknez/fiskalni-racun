import { ALL_CATEGORY_VALUE, categoryOptions, type Locale } from '@lib/categories'
import { formatCurrency } from '@lib/utils'
import clsx from 'clsx'
import { format } from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Calendar,
  Clock,
  Download,
  Filter,
  Plus,
  Receipt as ReceiptIcon,
  Search as SearchIcon,
  SlidersHorizontal,
  Sparkles,
  Tag,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Virtuoso } from 'react-virtuoso'
import { PageTransition } from '@/components/common/PageTransition'
import { SkeletonReceiptCard, SkeletonStatsGrid } from '@/components/loading'
import { useHouseholdBills, useReceiptSearch, useReceipts } from '@/hooks/useDatabase'
import { useToast } from '@/hooks/useToast'
import { sleep } from '@/lib/async'
import { downloadCSV, exportHouseholdBillsToCSV, exportReceiptsToCSV } from '@/lib/exportUtils'
import { logger } from '@/lib/logger'

type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'
type FilterPeriod = 'all' | 'today' | 'week' | 'month' | 'year'
type ReceiptTab = 'fiscal' | 'household'

export default function ReceiptsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<ReceiptTab>('fiscal')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [apiBanner, setApiBanner] = useState<{ type: 'error' | 'success'; message: string } | null>(
    null
  )
  const [remoteVendors, setRemoteVendors] = useState<string[]>([])

  const categoryLocale: Locale = i18n.language === 'sr' ? 'sr-Latn' : 'en'
  const categoryFilterOptions = useMemo(
    () => categoryOptions(categoryLocale, { includeAll: true }),
    [categoryLocale]
  )

  // Real-time database queries
  const allReceipts = useReceipts()
  const householdBills = useHouseholdBills()
  const searchResults = useReceiptSearch(searchQuery)
  const toast = useToast()

  // Use search results if query exists, otherwise all receipts
  const rawReceipts = searchQuery ? searchResults : allReceipts
  const loading = !rawReceipts

  // Export functionality
  const handleExportFiscal = () => {
    if (!allReceipts || allReceipts.length === 0) {
      toast.warning('Nema fiskalnih računa za izvoz')
      return
    }

    try {
      const csv = exportReceiptsToCSV(allReceipts)
      const filename = `fiskalni-racuni-${format(new Date(), 'yyyy-MM-dd')}`
      downloadCSV(csv, filename)
      toast.success('Fiskalni računi uspešno izvezeni')
    } catch (error) {
      logger.error('Export fiscal receipts failed', error)
      toast.error('Greška pri izvozu fiskalnih računa')
    }
  }

  const handleExportHousehold = () => {
    if (!householdBills || householdBills.length === 0) {
      toast.warning('Nema računa domaćinstva za izvoz')
      return
    }

    try {
      const csv = exportHouseholdBillsToCSV(householdBills)
      const filename = `domacinstvo-racuni-${format(new Date(), 'yyyy-MM-dd')}`
      downloadCSV(csv, filename)
      toast.success('Računi domaćinstva uspešno izvezeni')
    } catch (error) {
      logger.error('Export household bills failed', error)
      toast.error('Greška pri izvozu računa domaćinstva')
    }
  }

  const handleExportAll = () => {
    const hasReceipts = allReceipts && allReceipts.length > 0
    const hasBills = householdBills && householdBills.length > 0

    if (!hasReceipts && !hasBills) {
      toast.warning('Nema podataka za izvoz')
      return
    }

    try {
      if (hasReceipts) {
        const csv = exportReceiptsToCSV(allReceipts)
        const filename = `fiskalni-racuni-${format(new Date(), 'yyyy-MM-dd')}`
        downloadCSV(csv, filename)
      }

      if (hasBills) {
        const csv = exportHouseholdBillsToCSV(householdBills)
        const filename = `domacinstvo-racuni-${format(new Date(), 'yyyy-MM-dd')}`
        downloadCSV(csv, filename)
      }

      toast.success('Svi podaci uspešno izvezeni')
    } catch (error) {
      logger.error('Export all data failed', error)
      toast.error('Greška pri izvozu podataka')
    }
  }

  useEffect(() => {
    const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = import.meta.env as {
      VITE_SUPABASE_URL?: string
      VITE_SUPABASE_ANON_KEY?: string
    }

    const supabaseUrl =
      typeof VITE_SUPABASE_URL === 'string' && VITE_SUPABASE_URL.trim().length > 0
        ? VITE_SUPABASE_URL.trim()
        : 'https://placeholder.supabase.co'

    if (!VITE_SUPABASE_URL || VITE_SUPABASE_URL.trim().length === 0) {
      logger.warn('Supabase URL nije konfigurisan - koristi se placeholder domen za dijagnostiku')
    }

    let isCancelled = false
    let activeController: AbortController | null = null

    const endpoint = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/receipts`
    const anonKey =
      typeof VITE_SUPABASE_ANON_KEY === 'string' && VITE_SUPABASE_ANON_KEY.trim().length > 0
        ? VITE_SUPABASE_ANON_KEY.trim()
        : 'public-anon-key'
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(anonKey ? { apikey: anonKey } : {}),
    }

    const run = async () => {
      setApiBanner(null)
      setRemoteVendors([])

      const maxAttempts = 3

      for (let attempt = 1; attempt <= maxAttempts && !isCancelled; attempt++) {
        const controller = new AbortController()
        activeController = controller
        const timeoutId = window.setTimeout(
          () => controller.abort(),
          Math.min(15000, 5000 * attempt)
        )

        try {
          const response = await fetch(`${endpoint}?select=vendor,total_amount`, {
            headers,
            signal: controller.signal,
          })

          window.clearTimeout(timeoutId)

          if (isCancelled) {
            break
          }

          if (response.ok) {
            const text = await response.text()

            if (!text) {
              setRemoteVendors([])
              setApiBanner({
                type: 'success',
                message:
                  attempt > 1
                    ? `Podaci sinhronizovani nakon ${attempt} pokušaja`
                    : 'Podaci uspešno sinhronizovani',
              })
              break
            }

            try {
              const payload = JSON.parse(text) as Array<{ vendor?: string | null }>
              const vendors = Array.isArray(payload)
                ? Array.from(
                    new Set(
                      payload
                        .map((item) => item?.vendor)
                        .filter((vendor): vendor is string => typeof vendor === 'string')
                        .map((vendor) => vendor.trim())
                        .filter((vendor) => vendor.length > 0)
                    )
                  )
                : []

              setRemoteVendors(vendors)
              setApiBanner({
                type: 'success',
                message:
                  attempt > 1
                    ? `Podaci sinhronizovani nakon ${attempt} pokušaja`
                    : 'Podaci uspešno sinhronizovani',
              })
            } catch {
              setRemoteVendors([])
              setApiBanner({
                type: 'error',
                message: 'Nevažeći (invalid) odgovor sa servera',
              })
            }

            break
          }

          if (response.status === 401) {
            setApiBanner({
              type: 'error',
              message: 'Sesija je istekla - prijavi se ponovo',
            })
            navigate('/auth', { replace: true })
            break
          }

          if (response.status === 403) {
            setApiBanner({
              type: 'error',
              message: 'Zabranjen pristup - nema dozvolu',
            })
            break
          }

          if (response.status === 429) {
            setApiBanner({
              type: 'error',
              message: 'Previše zahteva (rate limit) - pokušaj ponovo kasnije',
            })
            break
          }

          if (response.status === 404) {
            setApiBanner({
              type: 'error',
              message: 'Traženi podaci nisu pronađeni',
            })
            break
          }

          if (response.status >= 500) {
            if (attempt < maxAttempts) {
              await sleep(500 * attempt)
              continue
            }

            setApiBanner({
              type: 'error',
              message: 'Greška na serveru - pokušajte ponovo',
            })
            break
          }

          setApiBanner({
            type: 'error',
            message: 'Došlo je do greške prilikom komunikacije sa serverom',
          })
          break
        } catch {
          window.clearTimeout(timeoutId)

          if (isCancelled) {
            break
          }

          if (controller.signal.aborted) {
            if (attempt >= maxAttempts || !navigator.onLine) {
              setApiBanner({
                type: 'error',
                message: 'Greška: timeout mreže (connection timeout) - proveri konekciju',
              })
              break
            }

            await sleep(400 * attempt)
            continue
          }

          if (attempt >= maxAttempts) {
            setApiBanner({
              type: 'error',
              message: 'Greška konekcije (connection error) - proveri mrežu',
            })
            break
          }

          await sleep(400 * attempt)
        }

        activeController = null
      }
    }

    run().catch((error) => {
      if (!isCancelled) {
        logger.error('Unexpected error while fetching receipts diagnostics:', error)
        setApiBanner({
          type: 'error',
          message: 'Dogodila se nepoznata greška prilikom komunikacije sa serverom',
        })
      }
    })

    return () => {
      isCancelled = true
      if (activeController) {
        activeController.abort()
      }
    }
  }, [navigate])

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
      <PageTransition className="space-y-6 pb-8">
        {/* Header Skeleton */}
        <div className="rounded-3xl bg-gray-50 dark:bg-gray-800 p-8">
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
          {[...Array(5)].map((_, i) => (
            <SkeletonReceiptCard key={i} />
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
          className="-top-24 -right-24 absolute h-96 w-96 rounded-full bg-white/20 blur-3xl"
        />

        <div className="relative z-10">
          {/* Title - Full Width */}
          <div className="mb-6 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Zap className="h-7 w-7" />
              <h1 className="font-black text-3xl sm:text-4xl">{t('receipts.heroTitle')}</h1>
            </div>
          </div>

          {/* Stats Row - Larger cards on mobile */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm sm:p-5"
            >
              <div className="mb-1 font-black text-3xl sm:text-4xl">{stats.count}</div>
              <div className="font-semibold text-primary-100 text-xs uppercase tracking-wide sm:text-sm">
                {t('receipts.count')}
              </div>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm sm:p-5"
            >
              <div className="mb-1 truncate font-black text-2xl sm:text-3xl md:text-4xl">
                {formatCurrency(stats.total)}
              </div>
              <div className="font-semibold text-primary-100 text-xs uppercase tracking-wide sm:text-sm">
                {t('receipts.total')}
              </div>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm sm:p-5"
            >
              <div className="mb-1 truncate font-black text-2xl sm:text-3xl md:text-4xl">
                {formatCurrency(stats.avg)}
              </div>
              <div className="font-semibold text-primary-100 text-xs uppercase tracking-wide sm:text-sm">
                {t('receipts.average')}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {apiBanner && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl border px-4 py-3 text-sm shadow-sm ${apiBanner.type === 'error' ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200'}`}
          role="alert"
        >
          <p className="font-semibold">{apiBanner.message}</p>
        </motion.div>
      )}

      {remoteVendors.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card border border-emerald-200/70 bg-white/80 p-5 shadow-sm dark:border-emerald-800/50 dark:bg-dark-800/80"
        >
          <h3 className="mb-2 font-semibold text-emerald-700 dark:text-emerald-300">
            {t('receipts.title')} · Remote preview
          </h3>
          <p className="mb-3 text-dark-600 text-sm dark:text-dark-300">Sinhronizovani prodavci:</p>
          <ul className="flex flex-wrap gap-2">
            {remoteVendors.map((vendor) => (
              <li
                key={vendor}
                className={clsx(
                  'rounded-full',
                  'bg-emerald-100',
                  'px-3',
                  'py-1',
                  'text-sm',
                  'font-medium',
                  'text-emerald-700',
                  'dark:bg-emerald-900/40',
                  'dark:text-emerald-200'
                )}
              >
                {vendor}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

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
            onClick={() => setShowFilters(!showFilters)}
            type="button"
            className={`btn-secondary flex items-center gap-2 ${showFilters ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : ''}`}
          >
            <SlidersHorizontal className="h-5 w-5" />
            <span>{t('receipts.filters')}</span>
            {(filterPeriod !== 'all' || selectedCategory) && (
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary-600" />
            )}
          </motion.button>

          {/* Export Menu */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                // For now, export based on active tab
                if (activeTab === 'fiscal') {
                  handleExportFiscal()
                } else {
                  handleExportHousehold()
                }
              }}
              type="button"
              className="btn-primary flex items-center gap-2"
            >
              <Download className="h-5 w-5" />
              <span className="hidden sm:inline">Izvezi CSV</span>
            </motion.button>
          </div>
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
              <div className="card space-y-4 p-6">
                {/* Period Filter */}
                <div>
                  <p className="mb-3 flex items-center gap-2 font-semibold text-dark-700 text-sm dark:text-dark-300">
                    <Calendar className="h-4 w-4" />
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
                        className={`rounded-lg px-4 py-2 font-medium text-sm transition-all ${
                          filterPeriod === period
                            ? 'bg-primary-600 text-white shadow-lg'
                            : 'bg-dark-100 text-dark-700 hover:bg-dark-200 dark:bg-dark-800 dark:text-dark-300 dark:hover:bg-dark-700'
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
                  <p className="mb-3 flex items-center gap-2 font-semibold text-dark-700 text-sm dark:text-dark-300">
                    <TrendingUp className="h-4 w-4" />
                    {t('receipts.sorting')}
                  </p>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
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
                        className={`rounded-lg px-3 py-2 font-medium text-sm transition-all ${
                          sortBy === option.value
                            ? 'bg-primary-600 text-white shadow-lg'
                            : 'bg-dark-100 text-dark-700 hover:bg-dark-200 dark:bg-dark-800 dark:text-dark-300 dark:hover:bg-dark-700'
                        }`}
                      >
                        {option.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Category Filter */}
                <div>
                  <p className="mb-3 flex items-center gap-2 font-semibold text-dark-700 text-sm dark:text-dark-300">
                    <Tag className="h-4 w-4" />
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
                          className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 font-medium text-sm transition-all ${
                            isActive
                              ? 'border-primary-600 bg-primary-600 text-white shadow-lg'
                              : 'border-dark-200 bg-dark-100 text-dark-700 hover:bg-dark-200 dark:border-dark-700 dark:bg-dark-800 dark:text-dark-300 dark:hover:bg-dark-700'
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
                    className="w-full rounded-lg bg-dark-100 px-4 py-2 font-medium text-dark-700 text-sm transition-colors hover:bg-dark-200 dark:bg-dark-800 dark:text-dark-300 dark:hover:bg-dark-700"
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
            {searchQuery ? 'Nema rezultata' : t('receipts.emptyState')}
          </h3>
          <p className="mx-auto mb-6 max-w-md text-dark-600 dark:text-dark-400">
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
                <Sparkles className="h-5 w-5" />
                Dodaj prvi račun
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
              {searchQuery ? `${receipts.length} rezultata` : `${receipts.length} računa`}
            </h2>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-ghost flex items-center gap-2 text-sm"
            >
              <Download className="h-4 w-4" />
              Izvezi
            </motion.button>
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
                  <Link to={`/receipts/${receipt.id}`}>
                    <motion.div
                      whileHover={{ scale: 1.01, x: 5 }}
                      whileTap={{ scale: 0.99 }}
                      className="group relative overflow-hidden rounded-xl border border-dark-200 bg-white p-4 shadow-sm transition-all hover:border-primary-300 hover:shadow-lg dark:border-dark-700 dark:bg-dark-800 dark:hover:border-primary-700"
                    >
                      {/* Hover Gradient */}
                      <div className="absolute inset-0 bg-gradient-to-r from-primary-50 to-purple-50 opacity-0 transition-opacity group-hover:opacity-100 dark:from-primary-900/10 dark:to-purple-900/10" />

                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex min-w-0 flex-1 items-center gap-4">
                          {/* Icon */}
                          <motion.div
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.5 }}
                            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 shadow-lg"
                          >
                            <span className="font-bold text-white text-xl">
                              {receipt.merchantName?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </motion.div>

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
                    </motion.div>
                  </Link>
                </motion.div>
              )}
            />
          </div>
        </motion.div>
      )}

      {/* Floating Action Button */}
      <Link to="/add-receipt">
        <motion.button
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="group fixed right-6 bottom-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-purple-600 shadow-2xl transition-shadow hover:shadow-primary-500/50 sm:right-8 sm:bottom-8 dark:shadow-primary-500/30"
          aria-label={t('addReceipt.title', { defaultValue: 'Dodaj račun' })}
        >
          <Plus className="h-8 w-8 text-white transition-transform group-hover:rotate-90" />

          {/* Pulse ring */}
          <span className="-inset-1 absolute animate-ping rounded-full bg-primary-400 opacity-30" />

          {/* Glow effect */}
          <span className="-inset-2 absolute rounded-full bg-gradient-to-br from-primary-400 to-purple-500 opacity-40 blur-md transition-opacity group-hover:opacity-60" />
        </motion.button>
      </Link>
    </PageTransition>
  )
}
