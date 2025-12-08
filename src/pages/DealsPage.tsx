/**
 * DealsPage
 *
 * Community page for sharing and discovering deals
 */

import { cn, formatCurrency } from '@lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import { enUS, sr } from 'date-fns/locale'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Dumbbell,
  ExternalLink,
  Flame,
  Heart,
  Home,
  MapPin,
  MoreHorizontal,
  Plane,
  Plus,
  RefreshCw,
  Search,
  Share2,
  Shirt,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Store,
  Tag,
  Trash2,
  TrendingDown,
  UtensilsCrossed,
  Wifi,
  Wrench,
  X,
} from 'lucide-react'
import { memo, useCallback, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageTransition } from '@/components/common/PageTransition'
import {
  DEAL_CATEGORIES,
  type Deal,
  type DealCategory,
  POPULAR_STORES,
  useDeals,
} from '@/hooks/useDeals'
import { useAppStore } from '@/store/useAppStore'

// Local form state interface
interface DealFormData {
  title: string
  description: string
  originalPrice: string
  discountedPrice: string
  discountPercent: string
  store: string
  category: string
  url: string
  expiresAt: string
  location: string
  isOnline: boolean
}

const INITIAL_FORM_DATA: DealFormData = {
  title: '',
  description: '',
  originalPrice: '',
  discountedPrice: '',
  discountPercent: '',
  store: '',
  category: 'other',
  url: '',
  expiresAt: '',
  location: '',
  isOnline: true,
}

// Icon mapping
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  electronics: Smartphone,
  fashion: Shirt,
  food: UtensilsCrossed,
  home: Home,
  beauty: Sparkles,
  sports: Dumbbell,
  travel: Plane,
  services: Wrench,
  other: MoreHorizontal,
}

export default function DealsPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAppStore()
  const {
    deals,
    isLoading,
    error,
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
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null) // For detail modal
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<DealCategory | 'all'>('all')
  const [formError, setFormError] = useState<string | null>(null)
  const categoryScrollRef = useRef<HTMLDivElement>(null)
  const storesListId = useId()

  // Form state
  const [formData, setFormData] = useState<DealFormData>(INITIAL_FORM_DATA)

  const locale = i18n.language === 'sr' ? sr : enUS

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

        {/* Main Content - Overlapping Cards */}
        <div className="container mx-auto max-w-5xl px-4">
          <div className="mt-6 space-y-4">
            {/* Category Tabs - Horizontal Scroll */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="relative rounded-2xl bg-white p-2 shadow-dark-200/50 shadow-xl dark:bg-dark-800 dark:shadow-none"
            >
              {/* Scroll Buttons */}
              <button
                type="button"
                onClick={() => scrollCategories('left')}
                className="-translate-y-1/2 absolute top-1/2 left-1 z-10 rounded-full bg-white p-1.5 shadow-lg transition-all hover:bg-dark-50 dark:bg-dark-700 dark:hover:bg-dark-600"
              >
                <ChevronLeft className="h-5 w-5 text-dark-600 dark:text-dark-300" />
              </button>
              <button
                type="button"
                onClick={() => scrollCategories('right')}
                className="-translate-y-1/2 absolute top-1/2 right-1 z-10 rounded-full bg-white p-1.5 shadow-lg transition-all hover:bg-dark-50 dark:bg-dark-700 dark:hover:bg-dark-600"
              >
                <ChevronRight className="h-5 w-5 text-dark-600 dark:text-dark-300" />
              </button>

              {/* Scrollable Categories */}
              <div
                ref={categoryScrollRef}
                className="scrollbar-hide flex gap-2 overflow-x-auto px-8 py-1"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {/* All Categories */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => handleCategoryChange('all')}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 font-semibold text-sm transition-all',
                    selectedCategory === 'all'
                      ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-500/25'
                      : 'bg-dark-100 text-dark-600 hover:bg-dark-200 dark:bg-dark-700 dark:text-dark-300'
                  )}
                >
                  <ShoppingBag className="h-4 w-4" />
                  {t('deals.allCategories', 'Sve')}
                  <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
                    {deals.length}
                  </span>
                </motion.button>

                {/* Category Buttons */}
                {DEAL_CATEGORIES.map((cat) => {
                  const CatIcon = CATEGORY_ICONS[cat.key] || MoreHorizontal
                  const count = deals.filter((d) => d.category === cat.key).length
                  return (
                    <motion.button
                      key={cat.key}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => handleCategoryChange(cat.key)}
                      className={cn(
                        'flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 font-semibold text-sm transition-all',
                        selectedCategory === cat.key
                          ? 'text-white shadow-lg'
                          : 'bg-dark-100 text-dark-600 hover:bg-dark-200 dark:bg-dark-700 dark:text-dark-300'
                      )}
                      style={
                        selectedCategory === cat.key
                          ? {
                              background: `linear-gradient(135deg, ${cat.color}, ${cat.color}dd)`,
                              boxShadow: `0 4px 14px ${cat.color}40`,
                            }
                          : {}
                      }
                    >
                      <CatIcon className="h-4 w-4" />
                      {t(`deals.categories.${cat.key}`, cat.label)}
                      {count > 0 && (
                        <span
                          className={cn(
                            'ml-1 rounded-full px-1.5 py-0.5 text-xs',
                            selectedCategory === cat.key
                              ? 'bg-white/20'
                              : 'bg-dark-200 dark:bg-dark-600'
                          )}
                        >
                          {count}
                        </span>
                      )}
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>

            {/* Search Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl bg-white p-4 shadow-dark-200/50 shadow-xl dark:bg-dark-800 dark:shadow-none"
            >
              <div className="flex gap-3">
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
                <button
                  type="button"
                  onClick={refreshDeals}
                  disabled={isLoading}
                  className="rounded-xl bg-dark-100 px-4 py-3.5 text-dark-600 transition-all hover:bg-dark-200 disabled:opacity-50 dark:bg-dark-700 dark:text-dark-300"
                >
                  <RefreshCw className={cn('h-5 w-5', isLoading && 'animate-spin')} />
                </button>
              </div>
            </motion.div>

            {/* Add Deal Button - Premium Style */}
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

            {/* Error Message */}
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
                /* Loading Skeletons */
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
                        <div className="h-8 w-16 rounded-full bg-dark-200 dark:bg-dark-700" />
                      </div>
                      <div className="mb-4 space-y-2">
                        <div className="h-4 w-full rounded bg-dark-100 dark:bg-dark-700" />
                        <div className="h-4 w-2/3 rounded bg-dark-100 dark:bg-dark-700" />
                      </div>
                      <div className="flex gap-2">
                        <div className="h-6 w-20 rounded bg-dark-200 dark:bg-dark-700" />
                        <div className="h-6 w-16 rounded bg-dark-100 dark:bg-dark-700" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : deals.length === 0 ? (
                /* Empty State */
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
                    {t(
                      'deals.emptyHint',
                      'Budi prvi koji će podeliti sjajnu ponudu sa zajednicom!'
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={handleStartCreate}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-3 font-semibold text-white shadow-lg shadow-primary-500/25 transition-all hover:shadow-primary-500/30 hover:shadow-xl"
                  >
                    <Plus className="h-5 w-5" />
                    {t('deals.addFirst', 'Dodaj prvu ponudu')}
                  </button>
                </motion.div>
              ) : (
                /* Deals Grid */
                <div className="grid gap-4 md:grid-cols-2">
                  <AnimatePresence mode="popLayout">
                    {deals.map((deal, index) => (
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

        {/* Create Deal Modal */}
        <AnimatePresence>
          {isCreating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
              onClick={handleCancel}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                onClick={(e) => e.stopPropagation()}
                className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-dark-800"
              >
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-dark-900 text-xl dark:text-white">
                      {t('deals.addNew', 'Nova ponuda')}
                    </h3>
                    <p className="text-dark-500 text-sm">
                      {t('deals.addNewSubtitle', 'Podeli sjajnu ponudu sa zajednicom')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="rounded-xl p-2 text-dark-400 transition-colors hover:bg-dark-100 hover:text-dark-600 dark:hover:bg-dark-700"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {formError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                  >
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    {formError}
                  </motion.div>
                )}

                <div className="space-y-5">
                  {/* Title */}
                  <div>
                    <label className="mb-2 block font-semibold text-dark-700 text-sm dark:text-dark-300">
                      {t('deals.dealTitle', 'Naslov ponude')} *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                      className="w-full rounded-xl border-2 border-dark-200 bg-dark-50 px-4 py-3 font-medium transition-all placeholder:text-dark-400 focus:border-primary-500 focus:bg-white focus:outline-none dark:border-dark-600 dark:bg-dark-700 dark:focus:border-primary-400 dark:focus:bg-dark-700"
                      placeholder="npr. TV Samsung 55'' - 50% popusta"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="mb-2 block font-semibold text-dark-700 text-sm dark:text-dark-300">
                      {t('deals.description', 'Opis')}
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, description: e.target.value }))
                      }
                      className="w-full rounded-xl border-2 border-dark-200 bg-dark-50 px-4 py-3 transition-all placeholder:text-dark-400 focus:border-primary-500 focus:bg-white focus:outline-none dark:border-dark-600 dark:bg-dark-700 dark:focus:border-primary-400"
                      rows={3}
                      placeholder={t(
                        'deals.descriptionPlaceholder',
                        'Opišite ponudu detaljnije...'
                      )}
                    />
                  </div>

                  {/* Store & Category */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-2 block font-semibold text-dark-700 text-sm dark:text-dark-300">
                        {t('deals.store', 'Prodavnica')} *
                      </label>
                      <input
                        type="text"
                        list={storesListId}
                        value={formData.store}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, store: e.target.value }))
                        }
                        className="w-full rounded-lg border border-dark-200 px-3 py-2 dark:border-dark-600 dark:bg-dark-700"
                        placeholder="Gigatron, Lidl..."
                      />
                      <datalist id={storesListId}>
                        {POPULAR_STORES.map((store) => (
                          <option key={store} value={store} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="mb-1 block font-medium text-sm">
                        {t('deals.category', 'Kategorija')}
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            category: e.target.value as DealCategory,
                          }))
                        }
                        className="w-full rounded-lg border border-dark-200 px-3 py-2 dark:border-dark-600 dark:bg-dark-700"
                      >
                        {DEAL_CATEGORIES.map((cat) => (
                          <option key={cat.key} value={cat.key}>
                            {t(`deals.categories.${cat.key}`, cat.label)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Prices */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="mb-1 block font-medium text-sm">
                        {t('deals.originalPrice', 'Stara cena')}
                      </label>
                      <input
                        type="number"
                        value={formData.originalPrice}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            originalPrice: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-dark-200 px-3 py-2 dark:border-dark-600 dark:bg-dark-700"
                        placeholder="9999"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-medium text-sm">
                        {t('deals.discountedPrice', 'Nova cena')}
                      </label>
                      <input
                        type="number"
                        value={formData.discountedPrice}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            discountedPrice: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-dark-200 px-3 py-2 dark:border-dark-600 dark:bg-dark-700"
                        placeholder="4999"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-medium text-sm">
                        {t('deals.discountPercent', 'Popust %')}
                      </label>
                      <input
                        type="number"
                        value={formData.discountPercent}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            discountPercent: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-dark-200 px-3 py-2 dark:border-dark-600 dark:bg-dark-700"
                        placeholder="50"
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>

                  {/* Online/Location */}
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.isOnline}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, isOnline: e.target.checked }))
                        }
                        className="h-4 w-4 rounded border-dark-300"
                      />
                      <span className="text-sm">{t('deals.isOnline', 'Online ponuda')}</span>
                    </label>
                  </div>

                  {!formData.isOnline && (
                    <div>
                      <label className="mb-1 block font-medium text-sm">
                        {t('deals.location', 'Lokacija')}
                      </label>
                      <input
                        type="text"
                        value={formData.location || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, location: e.target.value }))
                        }
                        className="w-full rounded-lg border border-dark-200 px-3 py-2 dark:border-dark-600 dark:bg-dark-700"
                        placeholder="Beograd, TC Usce..."
                      />
                    </div>
                  )}

                  {/* URL */}
                  <div>
                    <label className="mb-1 block font-medium text-sm">
                      {t('deals.url', 'Link do ponude')}
                    </label>
                    <input
                      type="url"
                      value={formData.url || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
                      className="w-full rounded-lg border border-dark-200 px-3 py-2 dark:border-dark-600 dark:bg-dark-700"
                      placeholder="https://..."
                    />
                  </div>

                  {/* Expires At */}
                  <div>
                    <label className="mb-1 block font-medium text-sm">
                      {t('deals.expiresAt', 'Važi do')}
                    </label>
                    <input
                      type="date"
                      value={formData.expiresAt || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, expiresAt: e.target.value }))
                      }
                      className="w-full rounded-lg border border-dark-200 px-3 py-2 dark:border-dark-600 dark:bg-dark-700"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 rounded-xl border border-dark-200 py-3 font-medium transition-colors hover:bg-dark-50 dark:border-dark-600 dark:hover:bg-dark-700"
                  >
                    {t('common.cancel', 'Otkaži')}
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-500 py-3 font-medium text-white transition-colors hover:bg-primary-600"
                  >
                    <Check className="h-5 w-5" />
                    {t('deals.share', 'Podeli')}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deletingDeal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              onClick={() => setDeletingDeal(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-dark-800"
              >
                <div className="mb-4 flex items-center gap-3 text-red-600">
                  <AlertTriangle className="h-6 w-6" />
                  <h3 className="font-semibold text-lg">
                    {t('deals.deleteTitle', 'Obriši ponudu')}
                  </h3>
                </div>
                <p className="mb-6 text-dark-600 dark:text-dark-300">
                  {t('deals.deleteConfirm', 'Da li si siguran da želiš da obrišeš ovu ponudu?')}
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setDeletingDeal(null)}
                    className="flex-1 rounded-xl border border-dark-200 py-3 font-medium transition-colors hover:bg-dark-50 dark:border-dark-600 dark:hover:bg-dark-700"
                  >
                    {t('common.cancel', 'Otkaži')}
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-3 font-medium text-white transition-colors hover:bg-red-600"
                  >
                    <Trash2 className="h-5 w-5" />
                    {t('common.delete', 'Obriši')}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Deal Detail Modal */}
        <AnimatePresence>
          {selectedDeal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDeal(null)}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl dark:bg-dark-800"
              >
                {/* Header with category color */}
                <div
                  className="relative p-6 text-white"
                  style={{
                    background: `linear-gradient(135deg, ${getCategoryInfo(selectedDeal.category as DealCategory)?.color || '#6366f1'}, ${getCategoryInfo(selectedDeal.category as DealCategory)?.color || '#6366f1'}99)`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedDeal(null)}
                    className="absolute top-4 right-4 rounded-full bg-white/20 p-2 transition-colors hover:bg-white/30"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  <div className="flex items-center gap-3">
                    {(() => {
                      const CategoryIcon = CATEGORY_ICONS[selectedDeal.category] || MoreHorizontal
                      return (
                        <div className="rounded-xl bg-white/20 p-3">
                          <CategoryIcon className="h-6 w-6" />
                        </div>
                      )
                    })()}
                    <div>
                      <span className="rounded-full bg-white/20 px-3 py-1 font-medium text-sm">
                        {t(`deals.categories.${selectedDeal.category}`, selectedDeal.category)}
                      </span>
                    </div>
                  </div>

                  <h2 className="mt-4 font-bold text-2xl">{selectedDeal.title}</h2>

                  {selectedDeal.store && (
                    <div className="mt-2 flex items-center gap-2 text-white/90">
                      <Store className="h-4 w-4" />
                      <span>{selectedDeal.store}</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="space-y-6 p-6">
                  {/* Price Section */}
                  {(selectedDeal.originalPrice || selectedDeal.discountedPrice) && (
                    <div className="rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 p-6 dark:from-green-900/20 dark:to-emerald-900/20">
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="mb-1 text-dark-500 text-sm dark:text-dark-400">
                            {t('deals.price', 'Cena')}
                          </p>
                          {selectedDeal.discountedPrice && (
                            <div className="flex items-baseline gap-3">
                              <span className="font-black text-4xl text-green-600 dark:text-green-400">
                                {formatCurrency(selectedDeal.discountedPrice)}
                              </span>
                              {selectedDeal.originalPrice && (
                                <span className="text-dark-400 text-xl line-through">
                                  {formatCurrency(selectedDeal.originalPrice)}
                                </span>
                              )}
                            </div>
                          )}
                          {!selectedDeal.discountedPrice && selectedDeal.originalPrice && (
                            <span className="font-bold text-3xl text-dark-700 dark:text-dark-200">
                              {formatCurrency(selectedDeal.originalPrice)}
                            </span>
                          )}
                        </div>
                        {selectedDeal.discountPercent && (
                          <div className="rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 px-4 py-2 text-center text-white shadow-lg">
                            <span className="font-black text-3xl">
                              -{selectedDeal.discountPercent}%
                            </span>
                          </div>
                        )}
                      </div>
                      {selectedDeal.originalPrice && selectedDeal.discountedPrice && (
                        <div className="mt-3 flex items-center gap-2 text-green-600 dark:text-green-400">
                          <TrendingDown className="h-5 w-5" />
                          <span className="font-semibold">
                            {t('deals.youSave', 'Ušteda')}:{' '}
                            {formatCurrency(
                              selectedDeal.originalPrice - selectedDeal.discountedPrice
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Description */}
                  {selectedDeal.description && (
                    <div>
                      <h3 className="mb-2 font-semibold text-dark-600 dark:text-dark-300">
                        {t('deals.description', 'Opis')}
                      </h3>
                      <p className="whitespace-pre-wrap text-dark-700 dark:text-dark-200">
                        {selectedDeal.description}
                      </p>
                    </div>
                  )}

                  {/* Details Grid */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    {selectedDeal.location && (
                      <div className="flex items-center gap-3 rounded-xl bg-dark-50 p-4 dark:bg-dark-700">
                        <MapPin className="h-5 w-5 text-primary-500" />
                        <div>
                          <p className="text-dark-500 text-sm dark:text-dark-400">
                            {t('deals.location', 'Lokacija')}
                          </p>
                          <p className="font-medium text-dark-700 dark:text-dark-200">
                            {selectedDeal.location}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedDeal.expiresAt && (
                      <div className="flex items-center gap-3 rounded-xl bg-dark-50 p-4 dark:bg-dark-700">
                        <Calendar className="h-5 w-5 text-primary-500" />
                        <div>
                          <p className="text-dark-500 text-sm dark:text-dark-400">
                            {t('deals.validUntil', 'Važi do')}
                          </p>
                          <p className="font-medium text-dark-700 dark:text-dark-200">
                            {format(new Date(selectedDeal.expiresAt), 'PPP', { locale })}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3 rounded-xl bg-dark-50 p-4 dark:bg-dark-700">
                      <Clock className="h-5 w-5 text-primary-500" />
                      <div>
                        <p className="text-dark-500 text-sm dark:text-dark-400">
                          {t('deals.shared', 'Podeljeno')}
                        </p>
                        <p className="font-medium text-dark-700 dark:text-dark-200">
                          {formatDistanceToNow(new Date(selectedDeal.createdAt), {
                            addSuffix: true,
                            locale,
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl bg-dark-50 p-4 dark:bg-dark-700">
                      <Heart className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="text-dark-500 text-sm dark:text-dark-400">
                          {t('deals.likes', 'Sviđanja')}
                        </p>
                        <p className="font-medium text-dark-700 dark:text-dark-200">
                          {selectedDeal.likesCount}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    {selectedDeal.url && (
                      <a
                        href={selectedDeal.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 py-4 font-semibold text-white shadow-lg shadow-primary-500/25 transition-all hover:shadow-xl"
                      >
                        <ExternalLink className="h-5 w-5" />
                        {t('deals.goToDeal', 'Pogledaj ponudu')}
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${selectedDeal.title}${selectedDeal.discountedPrice ? ` - ${formatCurrency(selectedDeal.discountedPrice)}` : ''}${selectedDeal.url ? `\n${selectedDeal.url}` : ''}`
                        )
                      }}
                      className="rounded-xl bg-dark-100 px-4 py-4 text-dark-600 transition-colors hover:bg-dark-200 dark:bg-dark-700 dark:text-dark-300"
                      title={t('deals.copy', 'Kopiraj')}
                    >
                      <Copy className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: selectedDeal.title,
                            text: selectedDeal.description || selectedDeal.title,
                            url: selectedDeal.url || window.location.href,
                          })
                        }
                      }}
                      className="rounded-xl bg-dark-100 px-4 py-4 text-dark-600 transition-colors hover:bg-dark-200 dark:bg-dark-700 dark:text-dark-300"
                      title={t('deals.share', 'Podeli')}
                    >
                      <Share2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  )
}

// Deal Card Component - Premium Version
interface DealCardProps {
  deal: Deal
  locale: typeof sr | typeof enUS
  currentUserId: string | undefined
  onLike: () => void
  onDelete: () => void
  onViewDetail: () => void
  getCategoryInfo: (category: DealCategory) => (typeof DEAL_CATEGORIES)[number] | undefined
  index: number
}

const DealCard = memo(function DealCard({
  deal,
  locale,
  currentUserId,
  onLike,
  onDelete,
  onViewDetail,
  getCategoryInfo,
  index,
}: DealCardProps) {
  const { t } = useTranslation()
  const shouldReduceMotion = useReducedMotion()
  const categoryInfo = getCategoryInfo(deal.category as DealCategory)
  const Icon = CATEGORY_ICONS[deal.category] || MoreHorizontal
  const isOwner = currentUserId === deal.userId
  const isHot = deal.likesCount >= 3

  const discount =
    deal.discountPercent ||
    (deal.originalPrice && deal.discountedPrice
      ? Math.round(((deal.originalPrice - deal.discountedPrice) / deal.originalPrice) * 100)
      : null)

  const savings =
    deal.originalPrice && deal.discountedPrice ? deal.originalPrice - deal.discountedPrice : null

  return (
    <motion.div
      initial={shouldReduceMotion ? {} : { opacity: 0, y: 20, scale: 0.95 }}
      animate={shouldReduceMotion ? {} : { opacity: 1, y: 0, scale: 1 }}
      exit={shouldReduceMotion ? {} : { opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      layout
      whileHover={{ y: -4 }}
      onClick={onViewDetail}
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-2xl bg-white shadow-lg transition-shadow hover:shadow-xl dark:bg-dark-800',
        isHot && 'ring-2 ring-orange-400 ring-offset-2 dark:ring-offset-dark-900'
      )}
    >
      {/* Hot Badge */}
      {isHot && (
        <div className="-right-8 absolute top-4 z-10 rotate-45 bg-gradient-to-r from-orange-500 to-red-500 px-10 py-1 font-bold text-white text-xs shadow-lg">
          <Flame className="mr-1 inline h-3 w-3" />
          HOT
        </div>
      )}

      {/* Category Color Bar */}
      <div
        className="h-1.5 w-full"
        style={{
          background: `linear-gradient(90deg, ${categoryInfo?.color || '#6B7280'}, ${categoryInfo?.color || '#6B7280'}80)`,
        }}
      />

      <div className="p-5">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            {/* Category Icon */}
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${categoryInfo?.color || '#6B7280'}, ${categoryInfo?.color || '#6B7280'}cc)`,
                boxShadow: `0 8px 24px ${categoryInfo?.color || '#6B7280'}40`,
              }}
            >
              <Icon className="h-7 w-7" />
            </motion.div>

            <div className="flex-1">
              <h3 className="mb-1 font-bold text-dark-900 text-lg leading-tight dark:text-white">
                {deal.title}
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-dark-500 text-sm">
                <span className="flex items-center gap-1 rounded-full bg-dark-100 px-2.5 py-0.5 font-medium dark:bg-dark-700">
                  <Store className="h-3.5 w-3.5" />
                  {deal.store}
                </span>
                {deal.isOnline ? (
                  <span className="flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <Wifi className="h-3.5 w-3.5" />
                    Online
                  </span>
                ) : (
                  deal.location && (
                    <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      <MapPin className="h-3.5 w-3.5" />
                      {deal.location}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Discount Badge */}
          {discount && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, delay: 0.2 }}
              className="flex flex-col items-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 px-4 py-2 text-white shadow-lg"
            >
              <span className="font-black text-2xl leading-none">-{discount}%</span>
              <span className="text-[10px] uppercase tracking-wider opacity-80">popust</span>
            </motion.div>
          )}
        </div>

        {/* Description */}
        {deal.description && (
          <p className="mb-4 line-clamp-2 text-dark-600 dark:text-dark-300">{deal.description}</p>
        )}

        {/* Prices Section */}
        {(deal.originalPrice || deal.discountedPrice) && (
          <div className="mb-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 p-4 dark:from-green-900/20 dark:to-emerald-900/20">
            <div className="flex items-end justify-between">
              <div>
                {deal.discountedPrice && (
                  <div className="flex items-baseline gap-2">
                    <span className="font-black text-3xl text-green-600 dark:text-green-400">
                      {formatCurrency(deal.discountedPrice)}
                    </span>
                    {deal.originalPrice && (
                      <span className="text-dark-400 text-lg line-through">
                        {formatCurrency(deal.originalPrice)}
                      </span>
                    )}
                  </div>
                )}
                {!deal.discountedPrice && deal.originalPrice && (
                  <span className="font-bold text-2xl text-dark-700 dark:text-dark-200">
                    {formatCurrency(deal.originalPrice)}
                  </span>
                )}
              </div>
              {savings && savings > 0 && (
                <div className="flex items-center gap-1.5 rounded-full bg-green-500 px-3 py-1.5 text-white shadow-md">
                  <TrendingDown className="h-4 w-4" />
                  <span className="font-bold text-sm">
                    {t('deals.save', 'Uštedi')} {formatCurrency(savings)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-dark-100 border-t pt-4 dark:border-dark-700">
          {/* Meta Info */}
          <div className="flex items-center gap-3 text-dark-500 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-700 text-xs dark:bg-primary-900/30 dark:text-primary-300">
                {deal.userName?.charAt(0).toUpperCase()}
              </div>
              <span className="font-medium">{deal.userName}</span>
            </div>
            <span className="text-dark-300 dark:text-dark-600">•</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDistanceToNow(new Date(deal.createdAt), { addSuffix: true, locale })}
            </span>
            {deal.expiresAt && (
              <>
                <span className="text-dark-300 dark:text-dark-600">•</span>
                <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {t('deals.until', 'Do')} {new Date(deal.expiresAt).toLocaleDateString()}
                </span>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Like Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={onLike}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-3 py-2 font-semibold text-sm transition-all',
                deal.isLikedByUser
                  ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/25'
                  : 'bg-dark-100 text-dark-600 hover:bg-red-50 hover:text-red-500 dark:bg-dark-700 dark:text-dark-300 dark:hover:bg-red-900/20 dark:hover:text-red-400'
              )}
            >
              <Heart className={cn('h-4 w-4', deal.isLikedByUser && 'fill-current')} />
              <span>{deal.likesCount}</span>
            </motion.button>

            {/* View Link */}
            {deal.url && (
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href={deal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 px-4 py-2 font-semibold text-sm text-white shadow-lg shadow-primary-500/25 transition-all hover:shadow-primary-500/30 hover:shadow-xl"
              >
                <ExternalLink className="h-4 w-4" />
                {t('deals.goToDeal', 'Idi')}
              </motion.a>
            )}

            {/* Delete (only for owner) */}
            {isOwner && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={onDelete}
                className="rounded-xl p-2 text-dark-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
})
