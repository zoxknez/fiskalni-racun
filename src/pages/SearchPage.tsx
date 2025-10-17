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
          <mark key={i} className="rounded bg-yellow-200/60 px-0.5 dark:bg-yellow-600/30">
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
              className={'absolute h-24 w-24 rounded-full bg-white blur-3xl'}
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
              className="mb-6 flex items-center gap-3"
            >
              <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
                <SearchIcon className="h-8 w-8" />
              </div>
              <div>
                <h1 className="font-bold text-4xl">{t('search.heroTitle')}</h1>
                <p className="text-white/80">{t('search.subtitle')}</p>
              </div>
            </motion.div>

            {/* Search Input */}
            <form onSubmit={onSubmitSearch} className="relative" role="search">
              <SearchIcon className="-translate-y-1/2 absolute top-1/2 left-4 h-5 w-5 text-dark-400 sm:left-6 sm:h-6 sm:w-6" />
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
                className="w-full rounded-2xl bg-white py-4 pr-12 pl-12 font-medium text-base text-dark-900 shadow-2xl transition-all duration-300 focus:ring-4 focus:ring-white/30 sm:py-5 sm:pr-16 sm:pl-16 sm:text-lg"
              />
              <AnimatePresence>
                {query && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => setQuery('')}
                    className="-translate-y-1/2 absolute top-1/2 right-3 rounded-lg p-1.5 transition-colors hover:bg-dark-100 sm:right-6 sm:p-2"
                    type="button"
                    aria-label={t('common.clear') as string}
                  >
                    <X className="h-4 w-4 text-dark-400 sm:h-5 sm:w-5" />
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
                    className="-translate-y-1/2 absolute top-1/2 right-12 sm:right-16"
                    aria-hidden
                  >
                    <Loader2 className="h-4 w-4 animate-spin text-dark-300" />
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
            className="py-16 text-center"
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
              className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary-100 to-primary-50 dark:from-primary-900/20 dark:to-primary-800/20"
            >
              <Sparkles className="h-12 w-12 text-primary-500" />
            </motion.div>
            <h3 className="mb-2 font-bold text-2xl text-dark-900 dark:text-dark-50">
              {t('search.startSearch')}
            </h3>
            <p className="mb-8 text-dark-600 dark:text-dark-400">{t('search.enterSearchTerm')}</p>

            {/* Recent searches */}
            <div className="mx-auto max-w-md">
              <div className="mb-3 flex items-center justify-center gap-3">
                <h4 className="flex items-center gap-2 font-semibold text-dark-700 text-sm dark:text-dark-300">
                  <Clock className="h-4 w-4" />
                  {t('search.recentSearches')}
                </h4>
                {recentSearches.length > 0 && (
                  <button
                    type="button"
                    onClick={clearRecent}
                    className="inline-flex items-center gap-1 text-dark-500 text-xs hover:text-dark-700 dark:text-dark-400 dark:hover:text-dark-200"
                    aria-label={t('common.clear') as string}
                    title={t('common.clear') as string}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> {t('common.clear')}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap justify-center gap-2">
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
                      className="rounded-xl bg-white px-4 py-2 font-medium text-dark-700 text-sm shadow-sm transition-colors hover:bg-primary-50 dark:bg-dark-800 dark:text-dark-300 dark:hover:bg-primary-900/20"
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
            className="py-16 text-center"
          >
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-dark-100 dark:bg-dark-800">
              <SearchIcon className="h-10 w-10 text-dark-400" />
            </div>
            <h3 className="mb-2 font-semibold text-dark-900 text-xl dark:text-dark-50">
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
                    className={`rounded-xl px-4 py-2 font-semibold transition-all duration-300 ${
                      activeTab === tab.key
                        ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                        : 'bg-white text-dark-700 hover:bg-dark-50 dark:bg-dark-800 dark:text-dark-300 dark:hover:bg-dark-700'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </motion.button>
                ) : null
              )}
            </div>

            {/* Receipts */}
            {receipts.length > 0 && (activeTab === 'all' || activeTab === 'receipts') && (
              <section aria-label={t('search.receipts') as string}>
                <StaggerContainer className="space-y-3">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 font-bold text-2xl text-dark-900 dark:text-dark-50">
                      <ReceiptIcon className="h-6 w-6 text-primary-500" />
                      {t('search.receipts')}
                    </h2>
                    <span
                      className="rounded-lg bg-primary-100 px-3 py-1 font-semibold text-primary-600 text-sm dark:bg-primary-900/20 dark:text-primary-400"
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
                          className="group relative block"
                          onClick={() => setRecentSearches(addRecent(query))}
                        >
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary-500/0 via-primary-500/5 to-primary-400/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                          <div className="relative flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:bg-dark-800">
                            <motion.div
                              whileHover={{ rotate: 360 }}
                              transition={{ duration: 0.5 }}
                              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg"
                            >
                              <ReceiptIcon className="h-6 w-6 text-white" />
                            </motion.div>
                            <div className="min-w-0 flex-1">
                              <p className="mb-1 truncate font-semibold text-dark-900 dark:text-dark-50">
                                <Highlight text={receipt.merchantName} query={query} />
                              </p>
                              <p className="text-dark-600 text-sm dark:text-dark-400">
                                {formatCurrency(receipt.totalAmount)}
                              </p>
                            </div>
                            <ArrowRight className="h-5 w-5 text-dark-400 transition-colors group-hover:text-primary-500" />
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
              <section aria-label={t('search.devices') as string}>
                <StaggerContainer className="space-y-3">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 font-bold text-2xl text-dark-900 dark:text-dark-50">
                      <Shield className="h-6 w-6 text-primary-500" />
                      {t('search.devices')}
                    </h2>
                    <span
                      className="rounded-lg bg-primary-100 px-3 py-1 font-semibold text-primary-600 text-sm dark:bg-primary-900/20 dark:text-primary-400"
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
                          className="group relative block"
                          onClick={() => setRecentSearches(addRecent(query))}
                        >
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary-500/0 via-primary-500/5 to-blue-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                          <div className="relative flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:bg-dark-800">
                            <motion.div
                              whileHover={{ rotate: 360 }}
                              transition={{ duration: 0.5 }}
                              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-blue-500 shadow-lg"
                            >
                              <Shield className="h-6 w-6 text-white" />
                            </motion.div>
                            <div className="min-w-0 flex-1">
                              <p className="mb-1 truncate font-semibold text-dark-900 dark:text-dark-50">
                                <Highlight text={`${device.brand} ${device.model}`} query={query} />
                              </p>
                              <p className="text-dark-600 text-sm dark:text-dark-400">
                                {getCategoryLabel(device.category, localeKey)}
                              </p>
                            </div>
                            <ArrowRight className="h-5 w-5 text-dark-400 transition-colors group-hover:text-primary-500" />
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
