/**
 * DealsPage
 *
 * Community page for sharing and discovering deals
 * Refactored into smaller components for better maintainability
 */

import { cn } from '@lib/utils'
import { enUS, sr } from 'date-fns/locale'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowDownWideNarrow,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Flame,
  Heart,
  Percent,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  TrendingDown,
} from 'lucide-react'
import { useCallback, useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageTransition } from '@/components/common/PageTransition'
import { DEAL_CATEGORIES, type Deal, type DealCategory, useDeals } from '@/hooks/useDeals'
import { useAppStore } from '@/store/useAppStore'
import { DealCard, DealDetailModal, DealFormModal, DeleteDealModal } from './components'
import { CATEGORY_ICONS, type DealFormData, INITIAL_FORM_DATA } from './types'

type SortOption = 'newest' | 'popular' | 'discount'

export default function DealsPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAppStore()
  const {
    deals,
    isLoading,
    error,
    categoryCounts,
    fetchDeals,
    createDeal,
    deleteDeal,
    likeDeal,
    unlikeDeal,
    refreshDeals,
    getCategoryInfo,
  } = useDeals()

  const [isCreating, setIsCreating] = useState(false)
  const [deletingDeal, setDeletingDeal] = useState<Deal | null>(null)
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<DealCategory | 'all'>('all')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [formError, setFormError] = useState<string | null>(null)
  const categoryScrollRef = useRef<HTMLDivElement>(null)
  const storesListId = useId()

  const [formData, setFormData] = useState<DealFormData>(INITIAL_FORM_DATA)

  const locale = i18n.language === 'sr' ? sr : enUS

  // Sort deals based on selected option
  const sortedDeals = useMemo(() => {
    const sorted = [...deals]
    switch (sortBy) {
      case 'popular':
        return sorted.sort((a, b) => b.likesCount - a.likesCount)
      case 'discount':
        return sorted.sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0))
      default:
        return sorted.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
    }
  }, [deals, sortBy])

  // Scroll categories
  const scrollCategories = useCallback((direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const scrollAmount = 200
      categoryScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
    }
  }, [])

  const handleSearch = useCallback(() => {
    fetchDeals({
      search: searchQuery || undefined,
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
    })
  }, [fetchDeals, searchQuery, selectedCategory])

  const handleCategoryChange = useCallback(
    (category: DealCategory | 'all') => {
      setSelectedCategory(category)
      fetchDeals({
        search: searchQuery || undefined,
        category: category !== 'all' ? category : undefined,
      })
    },
    [fetchDeals, searchQuery]
  )

  const handleStartCreate = useCallback(() => {
    if (!user) {
      setFormError(t('deals.loginRequired', 'Morate biti prijavljeni da biste dodali ponudu'))
      return
    }
    setIsCreating(true)
    setFormData(INITIAL_FORM_DATA)
    setFormError(null)
  }, [user, t])

  const handleFormChange = useCallback((changes: Partial<DealFormData>) => {
    setFormData((prev) => ({ ...prev, ...changes }))
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!formData.title.trim()) {
      setFormError(t('validation.required', 'Naslov je obavezan'))
      return
    }
    if (!formData.store.trim()) {
      setFormError(t('deals.storeRequired', 'Prodavnica je obavezna'))
      return
    }

    const result = await createDeal({
      title: formData.title.trim(),
      description: formData.description.trim(),
      store: formData.store.trim(),
      category: formData.category,
      isOnline: formData.isOnline,
      originalPrice: formData.originalPrice ? Number(formData.originalPrice) : undefined,
      discountedPrice: formData.discountedPrice ? Number(formData.discountedPrice) : undefined,
      discountPercent: formData.discountPercent ? Number(formData.discountPercent) : undefined,
      url: formData.url.trim() || undefined,
      location: formData.location.trim() || undefined,
      expiresAt: formData.expiresAt || undefined,
    })

    if (result) {
      setIsCreating(false)
      setFormError(null)
    }
  }, [formData, createDeal, t])

  const handleDelete = useCallback(async () => {
    if (!deletingDeal?.id) return
    const success = await deleteDeal(deletingDeal.id)
    if (success) {
      setDeletingDeal(null)
    }
  }, [deletingDeal, deleteDeal])

  const handleCancel = useCallback(() => {
    setIsCreating(false)
    setFormError(null)
  }, [])

  const handleLike = useCallback(
    async (deal: Deal) => {
      if (!user) {
        setFormError(t('deals.loginRequired', 'Morate biti prijavljeni'))
        return
      }
      if (deal.isLikedByUser) {
        await unlikeDeal(deal.id)
      } else {
        await likeDeal(deal.id)
      }
    },
    [user, likeDeal, unlikeDeal, t]
  )

  // Calculate stats
  const totalDeals = deals.length
  const hotDeals = deals.filter((d) => d.likesCount >= 3).length
  const avgDiscount =
    deals.length > 0
      ? Math.round(deals.reduce((acc, d) => acc + (d.discountPercent || 0), 0) / deals.length)
      : 0

  return (
    <PageTransition>
      <div className="-mt-6 min-h-screen bg-gradient-to-b from-dark-50 via-white to-white dark:from-dark-900 dark:via-dark-900 dark:to-dark-800">
        {/* Hero Header with Gradient */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 px-4 pt-8 pb-12">
          {/* Decorative Elements */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="-right-20 -top-20 absolute h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="-bottom-32 -left-20 absolute h-80 w-80 rounded-full bg-primary-300/20 blur-3xl" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 50, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
              className="absolute top-10 right-10 opacity-10"
            >
              <Tag className="h-32 w-32 text-white" />
            </motion.div>
          </div>

          <div className="container relative mx-auto max-w-5xl">
            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 text-center"
            >
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm text-white backdrop-blur-sm">
                <Sparkles className="h-4 w-4" />
                {t('deals.community', 'Zajednica deli')}
              </div>
              <h1 className="mb-2 font-bold text-3xl text-white md:text-4xl">
                {t('deals.heroTitle', 'Otkrij Najbolje Ponude')}
              </h1>
              <p className="mx-auto max-w-md text-white/80">
                {t(
                  'deals.heroSubtitle',
                  'Pronađi neverovatne popuste koje su članovi zajednice podelili'
                )}
              </p>
            </motion.div>

            {/* Stats Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-3 gap-3"
            >
              <div className="rounded-2xl bg-white/15 p-4 text-center backdrop-blur-sm">
                <div className="mb-1 font-bold text-2xl text-white">{totalDeals}</div>
                <div className="text-white/70 text-xs">
                  {t('deals.totalDeals', 'Aktivnih ponuda')}
                </div>
              </div>
              <div className="rounded-2xl bg-white/15 p-4 text-center backdrop-blur-sm">
                <div className="mb-1 flex items-center justify-center gap-1 font-bold text-2xl text-white">
                  <TrendingDown className="h-5 w-5" />
                  {avgDiscount}%
                </div>
                <div className="text-white/70 text-xs">
                  {t('deals.avgDiscount', 'Prosečan popust')}
                </div>
              </div>
              <div className="rounded-2xl bg-white/15 p-4 text-center backdrop-blur-sm">
                <div className="mb-1 flex items-center justify-center gap-1 font-bold text-2xl text-white">
                  <Heart className="h-5 w-5 fill-current" />
                  {hotDeals}
                </div>
                <div className="text-white/70 text-xs">{t('deals.hotDeals', 'Hot ponuda')}</div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto max-w-5xl px-4">
          <div className="mt-6 space-y-4">
            {/* Category Tabs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="relative rounded-2xl bg-white p-2 shadow-dark-200/50 shadow-xl dark:bg-dark-800 dark:shadow-none"
            >
              <button
                type="button"
                onClick={() => scrollCategories('left')}
                className="-translate-y-1/2 absolute top-1/2 left-1 z-10 rounded-full bg-white p-1.5 shadow-lg transition-all hover:bg-dark-50 dark:bg-dark-700 dark:hover:bg-dark-600"
              >
                <ChevronLeft className="h-4 w-4 text-dark-600 dark:text-dark-300" />
              </button>

              <div
                ref={categoryScrollRef}
                className="scrollbar-hide flex gap-2 overflow-x-auto px-8"
              >
                <button
                  type="button"
                  onClick={() => handleCategoryChange('all')}
                  className={cn(
                    'flex flex-shrink-0 items-center gap-2 rounded-xl px-4 py-2 font-medium transition-all',
                    selectedCategory === 'all'
                      ? 'bg-primary-500 text-white'
                      : 'bg-dark-100 text-dark-600 hover:bg-dark-200 dark:bg-dark-700 dark:text-dark-300'
                  )}
                >
                  {t('deals.all', 'Sve')}
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 font-semibold text-xs',
                      selectedCategory === 'all'
                        ? 'bg-white/20 text-white'
                        : 'bg-dark-200 text-dark-500 dark:bg-dark-600 dark:text-dark-400'
                    )}
                  >
                    {Object.values(categoryCounts).reduce((a, b) => a + b, 0)}
                  </span>
                </button>
                {DEAL_CATEGORIES.map((category) => {
                  const Icon = CATEGORY_ICONS[category.key] || Tag
                  const count = categoryCounts[category.key] || 0
                  return (
                    <button
                      key={category.key}
                      type="button"
                      onClick={() => handleCategoryChange(category.key)}
                      className={cn(
                        'flex flex-shrink-0 items-center gap-2 rounded-xl px-4 py-2 font-medium transition-all',
                        selectedCategory === category.key
                          ? 'text-white'
                          : 'bg-dark-100 text-dark-600 hover:bg-dark-200 dark:bg-dark-700 dark:text-dark-300'
                      )}
                      style={
                        selectedCategory === category.key ? { backgroundColor: category.color } : {}
                      }
                    >
                      <Icon className="h-4 w-4" />
                      {t(`deals.categories.${category.key}`, category.label)}
                      {count > 0 && (
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 font-semibold text-xs',
                            selectedCategory === category.key
                              ? 'bg-white/20 text-white'
                              : 'bg-dark-200 text-dark-500 dark:bg-dark-600 dark:text-dark-400'
                          )}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                onClick={() => scrollCategories('right')}
                className="-translate-y-1/2 absolute top-1/2 right-1 z-10 rounded-full bg-white p-1.5 shadow-lg transition-all hover:bg-dark-50 dark:bg-dark-700 dark:hover:bg-dark-600"
              >
                <ChevronRight className="h-4 w-4 text-dark-600 dark:text-dark-300" />
              </button>
            </motion.div>

            {/* Search and Sort */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl bg-white p-4 shadow-dark-200/50 shadow-xl dark:bg-dark-800 dark:shadow-none"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="-translate-y-1/2 absolute top-1/2 left-4 h-5 w-5 text-dark-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder={t('deals.searchPlaceholder', 'Pretraži ponude, prodavnice...')}
                    className="w-full rounded-xl border-0 bg-dark-100 py-3.5 pr-4 pl-12 font-medium transition-all placeholder:text-dark-400 focus:bg-dark-50 focus:ring-2 focus:ring-primary-500 dark:bg-dark-700 dark:focus:bg-dark-600"
                  />
                </div>

                {/* Sort Options */}
                <div className="flex items-center gap-2">
                  <ArrowDownWideNarrow className="h-4 w-4 text-dark-400" />
                  <div className="flex gap-1.5 rounded-xl bg-dark-100 p-1 dark:bg-dark-700">
                    <button
                      type="button"
                      onClick={() => setSortBy('newest')}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium text-sm transition-all',
                        sortBy === 'newest'
                          ? 'bg-white text-primary-600 shadow-sm dark:bg-dark-600 dark:text-primary-400'
                          : 'text-dark-500 hover:text-dark-700 dark:text-dark-400 dark:hover:text-dark-200'
                      )}
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      {t('deals.sort.newest', 'Najnovije')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortBy('popular')}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium text-sm transition-all',
                        sortBy === 'popular'
                          ? 'bg-white text-primary-600 shadow-sm dark:bg-dark-600 dark:text-primary-400'
                          : 'text-dark-500 hover:text-dark-700 dark:text-dark-400 dark:hover:text-dark-200'
                      )}
                    >
                      <Flame className="h-3.5 w-3.5" />
                      {t('deals.sort.popular', 'Popularno')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortBy('discount')}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium text-sm transition-all',
                        sortBy === 'discount'
                          ? 'bg-white text-primary-600 shadow-sm dark:bg-dark-600 dark:text-primary-400'
                          : 'text-dark-500 hover:text-dark-700 dark:text-dark-400 dark:hover:text-dark-200'
                      )}
                    >
                      <Percent className="h-3.5 w-3.5" />
                      {t('deals.sort.discount', 'Popust')}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={refreshDeals}
                    disabled={isLoading}
                    className="rounded-xl bg-dark-100 p-3 text-dark-600 transition-all hover:bg-dark-200 disabled:opacity-50 dark:bg-dark-700 dark:text-dark-300"
                  >
                    <RefreshCw className={cn('h-5 w-5', isLoading && 'animate-spin')} />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Add Button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="button"
              onClick={handleStartCreate}
              className="group flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-primary-300 border-dashed bg-gradient-to-r from-primary-50 to-primary-50 py-5 font-semibold text-primary-600 transition-all hover:border-primary-500 hover:from-primary-100 hover:to-primary-100 hover:shadow-lg hover:shadow-primary-500/10 dark:border-primary-700 dark:from-primary-900/20 dark:to-primary-900/20 dark:text-primary-400 dark:hover:border-primary-500"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500 text-white shadow-lg shadow-primary-500/30 transition-transform group-hover:scale-110">
                <Plus className="h-5 w-5" />
              </div>
              <span>{t('deals.shareYourDeal', 'Podeli svoju ponudu sa zajednicom')}</span>
            </motion.button>

            {/* Error */}
            {(error || formError) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-red-50 p-4 text-red-700 shadow-lg dark:bg-red-900/20 dark:text-red-300"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5" />
                  {error || formError}
                </div>
              </motion.div>
            )}

            {/* Deals Grid */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {isLoading && deals.length === 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="animate-pulse rounded-2xl bg-white p-5 shadow-lg dark:bg-dark-800"
                    >
                      <div className="mb-4 flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-xl bg-dark-200 dark:bg-dark-700" />
                          <div>
                            <div className="mb-2 h-5 w-32 rounded bg-dark-200 dark:bg-dark-700" />
                            <div className="h-4 w-24 rounded bg-dark-100 dark:bg-dark-700" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : deals.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl bg-white p-12 text-center shadow-lg dark:bg-dark-800"
                >
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30">
                    <Tag className="h-10 w-10 text-primary-600" />
                  </div>
                  <h3 className="mb-2 font-semibold text-dark-900 text-lg dark:text-white">
                    {t('deals.emptyTitle', 'Još nema ponuda')}
                  </h3>
                  <p className="mb-6 text-dark-500 dark:text-dark-400">
                    {t('deals.emptyHint', 'Budi prvi koji će podeliti sjajnu ponudu!')}
                  </p>
                  <button
                    type="button"
                    onClick={handleStartCreate}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-3 font-semibold text-white shadow-lg"
                  >
                    <Plus className="h-5 w-5" />
                    {t('deals.addFirst', 'Dodaj prvu ponudu')}
                  </button>
                </motion.div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <AnimatePresence mode="popLayout">
                    {sortedDeals.map((deal, index) => (
                      <DealCard
                        key={deal.id}
                        deal={deal}
                        locale={locale}
                        currentUserId={user?.id}
                        onLike={() => handleLike(deal)}
                        onDelete={() => setDeletingDeal(deal)}
                        onViewDetail={() => setSelectedDeal(deal)}
                        getCategoryInfo={getCategoryInfo}
                        index={index}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Modals */}
        <DealFormModal
          isOpen={isCreating}
          formData={formData}
          formError={formError}
          storesListId={storesListId}
          onFormChange={handleFormChange}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />

        <DeleteDealModal
          deal={deletingDeal}
          onConfirm={handleDelete}
          onCancel={() => setDeletingDeal(null)}
        />

        <DealDetailModal
          deal={selectedDeal}
          locale={locale}
          getCategoryInfo={getCategoryInfo}
          onClose={() => setSelectedDeal(null)}
        />
      </div>
    </PageTransition>
  )
}
