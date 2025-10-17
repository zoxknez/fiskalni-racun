import { getCategoryLabel, type Locale } from '@lib/categories'
import { formatCurrency } from '@lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  Clock,
  Loader2,
  Receipt as ReceiptIcon,
  Search as SearchIcon,
  Shield,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { PageTransition, StaggerContainer, StaggerItem } from '@/components/common/PageTransition'
import { useDevices, useReceipts } from '@/hooks/useDatabase'
import { useDebounce } from '@/hooks/useDebounce'
import { useDeferredDeviceSearch, useDeferredReceiptSearch } from '@/hooks/useDeferredSearch'

/* ---------- Helpers ---------- */

const RECENT_KEY = 'fr_recent_searches'

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((s) => typeof s === 'string') : []
  } catch {
    return []
  }
}

function saveRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 8)))
  } catch {}
}

function addRecent(term: string) {
  const t = term.trim()
  if (!t) return loadRecent()
  const next = [t, ...loadRecent().filter((x) => x.toLowerCase() !== t.toLowerCase())]
  saveRecent(next)
  return next
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const re = new RegExp(`(${escapeRegExp(query)})`, 'ig')
  const parts = text.split(re)
  return (
    <>
      {parts.map((p, i) =>
        re.test(p) ? (
          <mark key={i} className="bg-yellow-200/60 dark:bg-yellow-600/30 rounded px-0.5">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  )
}

export default function SearchPage() {
  const { t, i18n } = useTranslation()

  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)
  const [activeTab, setActiveTab] = useState<'all' | 'receipts' | 'devices'>('all')
  const [recentSearches, setRecentSearches] = useState<string[]>(() => loadRecent())

  // Prečice tastature: "/" fokusira polje, Esc briše
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const inInput = target && ['INPUT', 'TEXTAREA'].includes(target.tagName)
      if (e.key === '/' && !inInput && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        inputRef.current?.focus()
      } else if (e.key === 'Escape') {
        if (query) setQuery('')
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [query])

  // Real-time search sa debounce-ovanim upitom
  const receiptsSource = useReceipts()
  const devicesSource = useDevices()

  const { filteredItems: filteredReceipts, isStale: receiptsStale } = useDeferredReceiptSearch(
    receiptsSource,
    debouncedQuery
  )
  const { filteredItems: filteredDevices, isStale: devicesStale } = useDeferredDeviceSearch(
    devicesSource,
    debouncedQuery
  )

  const receipts = filteredReceipts
  const devices = filteredDevices

  const hasResults = receipts.length > 0 || devices.length > 0
  const isTyping = debouncedQuery !== query
  const isBaseLoading = receiptsSource === undefined || devicesSource === undefined
  const isSearching = !!query && (isTyping || isBaseLoading || receiptsStale || devicesStale)

  const localeKey: Locale = i18n.language.startsWith('sr') ? 'sr-Latn' : 'en'

  const particles = useMemo(
    () =>
      ['a', 'b', 'c'].map((id, index) => ({
        id: `particle-${id}`,
        delay: index * 0.5,
        durationOffset: index,
        top: 20 + index * 25,
        left: 30 + index * 20,
      })),
    []
  )

  const totalCount = receipts.length + devices.length

  const onSubmitSearch = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!query.trim()) return
    setRecentSearches(addRecent(query))
  }

  const onPickRecent = (term: string) => {
    setQuery(term)
    setRecentSearches(addRecent(term))
    inputRef.current?.focus()
  }

  const clearRecent = () => {
    saveRecent([])
    setRecentSearches([])
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Hero Search Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 to-primary-400 p-8 text-white"
        >
          {/* Animated background */}
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                backgroundSize: '32px 32px',
              }}
            />
          </div>

          {/* Floating particles */}
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              animate={{
                y: [-20, 20, -20],
                x: [-10, 10, -10],
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 4 + particle.durationOffset,
                repeat: Number.POSITIVE_INFINITY,
                delay: particle.delay,
              }}
              className={'absolute w-24 h-24 bg-white rounded-full blur-3xl'}
              style={{
                top: `${particle.top}%`,
                left: `${particle.left}%`,
              }}
            />
          ))}

          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 mb-6"
            >
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl">
                <SearchIcon className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">{t('search.heroTitle')}</h1>
                <p className="text-white/80">{t('search.subtitle')}</p>
              </div>
            </motion.div>

            {/* Search Input */}
            <form onSubmit={onSubmitSearch} className="relative" role="search">
              <SearchIcon className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 text-dark-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSubmitSearch()
                }}
                placeholder={t('search.placeholderShort')}
                aria-label={t('search.placeholderShort')}
                className="w-full pl-12 sm:pl-16 pr-12 sm:pr-16 py-4 sm:py-5 bg-white text-dark-900 rounded-2xl text-base sm:text-lg font-medium focus:ring-4 focus:ring-white/30 transition-all duration-300 shadow-2xl"
              />
              <AnimatePresence>
                {query && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => setQuery('')}
                    className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 hover:bg-dark-100 rounded-lg transition-colors"
                    type="button"
                    aria-label={t('common.clear') as string}
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5 text-dark-400" />
                  </motion.button>
                )}
              </AnimatePresence>

              {/* Typing spinner */}
              <AnimatePresence>
                {isSearching && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute right-12 sm:right-16 top-1/2 -translate-y-1/2"
                    aria-hidden
                  >
                    <Loader2 className="w-4 h-4 animate-spin text-dark-300" />
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>
        </motion.div>

        {/* Empty State - No query */}
        {!query && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
              className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-primary-100 to-primary-50 dark:from-primary-900/20 dark:to-primary-800/20 flex items-center justify-center"
            >
              <Sparkles className="w-12 h-12 text-primary-500" />
            </motion.div>
            <h3 className="text-2xl font-bold text-dark-900 dark:text-dark-50 mb-2">
              {t('search.startSearch')}
            </h3>
            <p className="text-dark-600 dark:text-dark-400 mb-8">{t('search.enterSearchTerm')}</p>

            {/* Recent searches */}
            <div className="max-w-md mx-auto">
              <div className="flex items-center justify-center gap-3 mb-3">
                <h4 className="text-sm font-semibold text-dark-700 dark:text-dark-300 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {t('search.recentSearches')}
                </h4>
                {recentSearches.length > 0 && (
                  <button
                    type="button"
                    onClick={clearRecent}
                    className="text-xs text-dark-500 hover:text-dark-700 dark:text-dark-400 dark:hover:text-dark-200 inline-flex items-center gap-1"
                    aria-label={t('common.clear') as string}
                    title={t('common.clear') as string}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> {t('common.clear')}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {(recentSearches.length ? recentSearches : ['Samsung', 'Račun', 'Aparat']).map(
                  (term, index) => (
                    <motion.button
                      key={`${term}-${index}`}
                      type="button"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.06 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onPickRecent(term)}
                      className="px-4 py-2 bg-white dark:bg-dark-800 rounded-xl text-sm font-medium text-dark-700 dark:text-dark-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors shadow-sm"
                    >
                      {term}
                    </motion.button>
                  )
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* No Results */}
        {query && !hasResults && !isSearching && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-dark-100 dark:bg-dark-800 flex items-center justify-center">
              <SearchIcon className="w-10 h-10 text-dark-400" />
            </div>
            <h3 className="text-xl font-semibold text-dark-900 dark:text-dark-50 mb-2">
              {t('search.noResults')}
            </h3>
            <p className="text-dark-600 dark:text-dark-400">
              {t('search.noResultsFor', { query })}
            </p>
          </motion.div>
        )}

        {/* Results */}
        {query && hasResults && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* Tabs */}
            <div
              className="flex items-center gap-3"
              role="tablist"
              aria-label={t('search.tabs') as string}
            >
              {(
                [
                  { key: 'all' as const, count: totalCount, label: t('search.tabAll') },
                  { key: 'receipts' as const, count: receipts.length, label: t('search.receipts') },
                  { key: 'devices' as const, count: devices.length, label: t('search.devices') },
                ] as const
              ).map((tab) =>
                tab.count > 0 || tab.key === 'all' ? (
                  <motion.button
                    key={tab.key}
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveTab(tab.key)}
                    role="tab"
                    aria-selected={activeTab === tab.key}
                    className={`px-4 py-2 rounded-xl font-semibold transition-all duration-300 ${
                      activeTab === tab.key
                        ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                        : 'bg-white dark:bg-dark-800 text-dark-700 dark:text-dark-300 hover:bg-dark-50 dark:hover:bg-dark-700'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </motion.button>
                ) : null
              )}
            </div>

            {/* Receipts */}
            {receipts.length > 0 && (activeTab === 'all' || activeTab === 'receipts') && (
              <section role="region" aria-label={t('search.receipts') as string}>
                <StaggerContainer className="space-y-3">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-dark-900 dark:text-dark-50 flex items-center gap-2">
                      <ReceiptIcon className="w-6 h-6 text-primary-500" />
                      {t('search.receipts')}
                    </h2>
                    <span
                      className="px-3 py-1 bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-lg text-sm font-semibold"
                      role="status"
                    >
                      {receipts.length}{' '}
                      {receipts.length === 1
                        ? t('search.resultSingular')
                        : t('search.resultPlural')}
                    </span>
                  </div>

                  {receipts.map((receipt) => (
                    <StaggerItem key={receipt.id}>
                      <motion.div whileHover={{ scale: 1.01, x: 5 }}>
                        <Link
                          to={`/receipts/${receipt.id}`}
                          className="block relative group"
                          onClick={() => setRecentSearches(addRecent(query))}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/0 via-primary-500/5 to-primary-400/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <div className="relative flex items-center gap-4 p-4 bg-white dark:bg-dark-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                            <motion.div
                              whileHover={{ rotate: 360 }}
                              transition={{ duration: 0.5 }}
                              className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shrink-0 shadow-lg"
                            >
                              <ReceiptIcon className="w-6 h-6 text-white" />
                            </motion.div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-dark-900 dark:text-dark-50 truncate mb-1">
                                <Highlight text={receipt.merchantName} query={query} />
                              </p>
                              <p className="text-sm text-dark-600 dark:text-dark-400">
                                {formatCurrency(receipt.totalAmount)}
                              </p>
                            </div>
                            <ArrowRight className="w-5 h-5 text-dark-400 group-hover:text-primary-500 transition-colors" />
                          </div>
                        </Link>
                      </motion.div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </section>
            )}

            {/* Devices */}
            {devices.length > 0 && (activeTab === 'all' || activeTab === 'devices') && (
              <section role="region" aria-label={t('search.devices') as string}>
                <StaggerContainer className="space-y-3">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-dark-900 dark:text-dark-50 flex items-center gap-2">
                      <Shield className="w-6 h-6 text-primary-500" />
                      {t('search.devices')}
                    </h2>
                    <span
                      className="px-3 py-1 bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-lg text-sm font-semibold"
                      role="status"
                    >
                      {devices.length}{' '}
                      {devices.length === 1 ? t('search.resultSingular') : t('search.resultPlural')}
                    </span>
                  </div>

                  {devices.map((device) => (
                    <StaggerItem key={device.id}>
                      <motion.div whileHover={{ scale: 1.01, x: 5 }}>
                        <Link
                          to={`/warranties/${device.id}`}
                          className="block relative group"
                          onClick={() => setRecentSearches(addRecent(query))}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/0 via-primary-500/5 to-blue-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <div className="relative flex items-center gap-4 p-4 bg-white dark:bg-dark-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                            <motion.div
                              whileHover={{ rotate: 360 }}
                              transition={{ duration: 0.5 }}
                              className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-blue-500 flex items-center justify-center shrink-0 shadow-lg"
                            >
                              <Shield className="w-6 h-6 text-white" />
                            </motion.div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-dark-900 dark:text-dark-50 truncate mb-1">
                                <Highlight text={`${device.brand} ${device.model}`} query={query} />
                              </p>
                              <p className="text-sm text-dark-600 dark:text-dark-400">
                                {getCategoryLabel(device.category, localeKey)}
                              </p>
                            </div>
                            <ArrowRight className="w-5 h-5 text-dark-400 group-hover:text-primary-500 transition-colors" />
                          </div>
                        </Link>
                      </motion.div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </section>
            )}
          </motion.div>
        )}
      </div>
    </PageTransition>
  )
}
