/**
 * SubscriptionsPage
 *
 * Page for managing subscriptions (Netflix, Spotify, gym, etc.)
 */

import type { Subscription, SubscriptionBillingCycle, SubscriptionCategory } from '@lib/db'
import { cn, formatCurrency } from '@lib/utils'
import { format, type Locale } from 'date-fns'
import { enUS, sr } from 'date-fns/locale'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  AppWindow,
  Calendar,
  Check,
  ChevronDown,
  Cloud,
  CreditCard,
  Dumbbell,
  ExternalLink,
  Gamepad2,
  GraduationCap,
  MoreHorizontal,
  Music,
  Newspaper,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
  TrendingUp,
  Tv,
  X,
} from 'lucide-react'
import { memo, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageTransition } from '@/components/common/PageTransition'
import {
  BILLING_CYCLES,
  POPULAR_PROVIDERS,
  SUBSCRIPTION_CATEGORIES,
  type SubscriptionWithStatus,
  useSubscriptions,
} from '@/hooks/useSubscriptions'

// Icon mapping
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  streaming: Tv,
  music: Music,
  gaming: Gamepad2,
  fitness: Dumbbell,
  software: AppWindow,
  news: Newspaper,
  cloud: Cloud,
  education: GraduationCap,
  other: MoreHorizontal,
}

export default function SubscriptionsPage() {
  const { t, i18n } = useTranslation()
  const {
    subscriptionsWithStatus,
    activeSubscriptions,
    upcomingBilling,
    isLoading,
    createSubscription,
    updateSubscription,
    deleteSubscription,
    markAsPaid,
    toggleActive,
    getMonthlyTotal,
    getYearlyTotal,
    getCategoryInfo,
    getProviderInfo,
  } = useSubscriptions()

  const [isCreating, setIsCreating] = useState(false)
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null)
  const [deletingSubscription, setDeletingSubscription] = useState<Subscription | null>(null)
  const [showProviderPicker, setShowProviderPicker] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    provider: '',
    amount: '',
    category: 'streaming' as SubscriptionCategory,
    billingCycle: 'monthly' as SubscriptionBillingCycle,
    nextBillingDate: format(new Date(), 'yyyy-MM-dd'),
    startDate: format(new Date(), 'yyyy-MM-dd'),
    reminderDays: '3',
    cancelUrl: '',
    loginUrl: '',
    notes: '',
  })

  const locale = i18n.language === 'sr' ? sr : enUS
  const headingId = 'subscriptions-heading'
  const monthlyTotal = getMonthlyTotal()
  const yearlyTotal = getYearlyTotal()

  const handleStartCreate = useCallback(() => {
    setIsCreating(true)
    setShowProviderPicker(true)
    setFormData({
      name: '',
      provider: '',
      amount: '',
      category: 'streaming',
      billingCycle: 'monthly',
      nextBillingDate: format(new Date(), 'yyyy-MM-dd'),
      startDate: format(new Date(), 'yyyy-MM-dd'),
      reminderDays: '3',
      cancelUrl: '',
      loginUrl: '',
      notes: '',
    })
    setError(null)
  }, [])

  const handleSelectProvider = useCallback(
    (provider: (typeof POPULAR_PROVIDERS)[number] | null) => {
      if (provider) {
        setFormData((prev) => ({
          ...prev,
          name: provider.name,
          provider: provider.name,
          category: provider.category,
        }))
      }
      setShowProviderPicker(false)
    },
    []
  )

  const handleStartEdit = useCallback((subscription: Subscription) => {
    setEditingSubscription(subscription)
    setFormData({
      name: subscription.name,
      provider: subscription.provider,
      amount: String(subscription.amount),
      category: subscription.category,
      billingCycle: subscription.billingCycle,
      nextBillingDate: format(new Date(subscription.nextBillingDate), 'yyyy-MM-dd'),
      startDate: format(new Date(subscription.startDate), 'yyyy-MM-dd'),
      reminderDays: String(subscription.reminderDays),
      cancelUrl: subscription.cancelUrl ?? '',
      loginUrl: subscription.loginUrl ?? '',
      notes: subscription.notes ?? '',
    })
    setError(null)
  }, [])

  const handleSubmit = useCallback(async () => {
    try {
      const amount = Number.parseFloat(formData.amount)
      if (!formData.name.trim()) {
        setError(t('validation.required', 'This field is required'))
        return
      }
      if (Number.isNaN(amount) || amount <= 0) {
        setError(t('validation.amountPositive', 'Amount must be greater than 0'))
        return
      }

      const subscriptionData: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'> = {
        name: formData.name.trim(),
        provider: formData.provider.trim() || formData.name.trim(),
        amount,
        category: formData.category,
        billingCycle: formData.billingCycle,
        nextBillingDate: new Date(formData.nextBillingDate),
        startDate: new Date(formData.startDate),
        reminderDays: Number.parseInt(formData.reminderDays, 10) || 3,
        isActive: true,
      }

      if (formData.cancelUrl.trim()) {
        subscriptionData.cancelUrl = formData.cancelUrl.trim()
      }
      if (formData.loginUrl.trim()) {
        subscriptionData.loginUrl = formData.loginUrl.trim()
      }
      if (formData.notes.trim()) {
        subscriptionData.notes = formData.notes.trim()
      }

      if (editingSubscription?.id) {
        await updateSubscription(editingSubscription.id, subscriptionData)
        setEditingSubscription(null)
      } else {
        await createSubscription(subscriptionData)
        setIsCreating(false)
      }
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving subscription')
    }
  }, [formData, editingSubscription, createSubscription, updateSubscription, t])

  const handleDelete = useCallback(async () => {
    if (!deletingSubscription?.id) return
    try {
      await deleteSubscription(deletingSubscription.id)
      setDeletingSubscription(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting subscription')
    }
  }, [deletingSubscription, deleteSubscription])

  const handleCancel = useCallback(() => {
    setIsCreating(false)
    setEditingSubscription(null)
    setShowProviderPicker(false)
    setError(null)
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-dark-50 to-white dark:from-dark-900 dark:to-dark-800">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-primary-200 border-t-primary-500" />
          <p className="font-medium text-dark-500">{t('common.loading', 'Učitavanje...')}</p>
        </motion.div>
      </div>
    )
  }

  return (
    <PageTransition>
      <div className="-mt-6 min-h-screen bg-gradient-to-b from-dark-50 via-white to-white dark:from-dark-900 dark:via-dark-900 dark:to-dark-800">
        {/* Hero Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 px-4 pb-12 pt-8">
          {/* Decorative Elements */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-fuchsia-400/20 blur-3xl" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 50, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
              className="absolute right-10 top-10 opacity-10"
            >
              <CreditCard className="h-40 w-40 text-white" />
            </motion.div>
          </div>

          <div className="container relative mx-auto max-w-5xl">
            {/* Title Section */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 text-center"
            >
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
                <CreditCard className="h-4 w-4" />
                {t('subscriptions.manageSmart', 'Pametno upravljanje')}
              </div>
              <h1 id={headingId} className="mb-2 font-bold text-3xl text-white md:text-4xl">
                {t('subscriptions.heroTitle', 'Tvoje Pretplate')}
              </h1>
              <p className="mx-auto max-w-md text-white/80">
                {t(
                  'subscriptions.heroSubtitle',
                  'Sve pretplate na jednom mestu. Kontroliši troškove.'
                )}
              </p>
            </motion.div>

            {/* Stats Cards - Glassmorphism */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            >
              {/* Monthly Total */}
              <div className="group rounded-2xl bg-white/15 p-4 backdrop-blur-md transition-all hover:bg-white/25">
                <div className="mb-1 flex items-center gap-2">
                  <div className="rounded-lg bg-white/20 p-1.5">
                    <CreditCard className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-white/70 text-xs font-medium uppercase tracking-wider">
                    {t('subscriptions.monthly', 'Mesečno')}
                  </span>
                </div>
                <p className="font-black text-2xl text-white">{formatCurrency(monthlyTotal)}</p>
              </div>

              {/* Yearly Total */}
              <div className="group rounded-2xl bg-white/15 p-4 backdrop-blur-md transition-all hover:bg-white/25">
                <div className="mb-1 flex items-center gap-2">
                  <div className="rounded-lg bg-white/20 p-1.5">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-white/70 text-xs font-medium uppercase tracking-wider">
                    {t('subscriptions.yearly', 'Godišnje')}
                  </span>
                </div>
                <p className="font-black text-2xl text-white">{formatCurrency(yearlyTotal)}</p>
              </div>

              {/* Active Count */}
              <div className="group rounded-2xl bg-white/15 p-4 backdrop-blur-md transition-all hover:bg-white/25">
                <div className="mb-1 flex items-center gap-2">
                  <div className="rounded-lg bg-white/20 p-1.5">
                    <Play className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-white/70 text-xs font-medium uppercase tracking-wider">
                    {t('subscriptions.active', 'Aktivne')}
                  </span>
                </div>
                <p className="font-black text-2xl text-white">{activeSubscriptions.length}</p>
              </div>

              {/* Upcoming */}
              <div className="group rounded-2xl bg-white/15 p-4 backdrop-blur-md transition-all hover:bg-white/25">
                <div className="mb-1 flex items-center gap-2">
                  <div className="rounded-lg bg-white/20 p-1.5">
                    <AlertTriangle className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-white/70 text-xs font-medium uppercase tracking-wider">
                    {t('subscriptions.upcoming', 'Uskoro')}
                  </span>
                </div>
                <p className="font-black text-2xl text-white">{upcomingBilling.length}</p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto max-w-5xl px-4">
          <div className="mt-6 space-y-4">
            {/* Add Button - Premium Style */}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="button"
              onClick={handleStartCreate}
              className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-white py-5 font-semibold text-purple-600 shadow-xl shadow-purple-500/10 transition-all hover:shadow-2xl hover:shadow-purple-500/20 dark:bg-dark-800 dark:text-purple-400"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-purple-500/30 transition-transform group-hover:scale-110">
                <Plus className="h-5 w-5" />
              </div>
              <span>{t('subscriptions.addNew', 'Dodaj novu pretplatu')}</span>
            </motion.button>

            {/* Upcoming Alert */}
            <AnimatePresence>
              {upcomingBilling.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-lg dark:from-amber-900/20 dark:to-orange-900/20"
                >
                  <div className="mb-3 flex items-center gap-2 font-bold text-amber-800 dark:text-amber-200">
                    <div className="rounded-lg bg-amber-500/20 p-2">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    {t('subscriptions.upcomingAlert', 'Pretplate koje se uskoro naplaćuju')}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {upcomingBilling.slice(0, 3).map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between rounded-xl bg-white/60 p-3 dark:bg-dark-800/60"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-amber-800 dark:text-amber-200">
                            {sub.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-amber-700 dark:text-amber-300">
                            {formatCurrency(sub.amount)}
                          </p>
                          <p className="text-amber-600 text-xs dark:text-amber-400">
                            {sub.daysUntilBilling <= 0
                              ? t('subscriptions.today', 'Danas')
                              : t('subscriptions.inDays', 'Za {{days}} dana', {
                                  days: sub.daysUntilBilling,
                                })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Subscriptions List */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="space-y-3"
            >
              {subscriptionsWithStatus.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl bg-white p-12 text-center shadow-lg dark:bg-dark-800"
                >
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30">
                    <CreditCard className="h-10 w-10 text-purple-500" />
                  </div>
                  <h3 className="mb-2 font-semibold text-lg text-dark-900 dark:text-white">
                    {t('subscriptions.emptyTitle', 'Još nemaš pretplate')}
                  </h3>
                  <p className="mb-6 text-dark-500 dark:text-dark-400">
                    {t('subscriptions.emptyHint', 'Dodaj prvu pretplatu da pratiš svoje troškove')}
                  </p>
                  <button
                    type="button"
                    onClick={handleStartCreate}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 px-6 py-3 font-semibold text-white shadow-lg shadow-purple-500/25 transition-all hover:shadow-xl hover:shadow-purple-500/30"
                  >
                    <Plus className="h-5 w-5" />
                    {t('subscriptions.addFirst', 'Dodaj prvu pretplatu')}
                  </button>
                </motion.div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {subscriptionsWithStatus.map((subscription, index) => (
                    <SubscriptionCard
                      key={subscription.id}
                      subscription={subscription}
                      locale={locale}
                      onEdit={() => handleStartEdit(subscription)}
                      onDelete={() => setDeletingSubscription(subscription)}
                      onToggleActive={() => toggleActive(subscription.id!, !subscription.isActive)}
                      onMarkPaid={() => markAsPaid(subscription.id!)}
                      getCategoryInfo={getCategoryInfo}
                      getProviderInfo={getProviderInfo}
                      index={index}
                    />
                  ))}
                </AnimatePresence>
              )}
            </motion.div>
          </div>
        </div>

        {/* Provider Picker Modal */}
        <AnimatePresence>
          {showProviderPicker && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
              onClick={() => setShowProviderPicker(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                onClick={(e) => e.stopPropagation()}
                className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-dark-800"
              >
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-xl text-dark-900 dark:text-white">
                      {t('subscriptions.selectProvider', 'Izaberi provajdera')}
                    </h3>
                    <p className="text-dark-500 text-sm">
                      {t(
                        'subscriptions.selectProviderHint',
                        'Izaberi popularni servis ili dodaj prilagođeni'
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowProviderPicker(false)}
                    className="rounded-xl p-2 text-dark-400 transition-colors hover:bg-dark-100 hover:text-dark-600 dark:hover:bg-dark-700"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {POPULAR_PROVIDERS.map((provider) => (
                    <motion.button
                      key={provider.name}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => handleSelectProvider(provider)}
                      className="flex flex-col items-center gap-2 rounded-2xl bg-dark-50 p-4 transition-all hover:bg-purple-50 hover:shadow-lg dark:bg-dark-700 dark:hover:bg-purple-900/20"
                    >
                      <span className="text-3xl">{provider.logoEmoji}</span>
                      <span className="text-center font-medium text-xs">{provider.name}</span>
                    </motion.button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectProvider(null)}
                  className="w-full rounded-xl border-2 border-dashed border-dark-200 py-4 font-semibold text-dark-600 transition-colors hover:border-purple-500 hover:bg-purple-50 hover:text-purple-600 dark:border-dark-600 dark:text-dark-300 dark:hover:border-purple-400 dark:hover:bg-purple-900/20"
                >
                  <Plus className="mr-2 inline h-5 w-5" />
                  {t('subscriptions.customProvider', 'Druga pretplata...')}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create/Edit Modal - Premium Version */}
        <AnimatePresence>
          {(isCreating || editingSubscription) && !showProviderPicker && (
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
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-3xl bg-white shadow-2xl dark:bg-dark-800"
              >
                {/* Modal Header */}
                <div className="sticky top-0 z-10 border-b border-dark-100 bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 p-6 dark:border-dark-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-white text-xl">
                        {editingSubscription
                          ? t('subscriptions.edit', 'Izmeni pretplatu')
                          : t('subscriptions.addNew', 'Nova pretplata')}
                      </h3>
                      <p className="mt-1 text-sm text-white/70">
                        {editingSubscription
                          ? t('subscriptions.editHint', 'Izmeni detalje pretplate')
                          : t('subscriptions.addHint', 'Dodaj novu pretplatu za praćenje')}
                      </p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      type="button"
                      onClick={handleCancel}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                    >
                      <X className="h-5 w-5" />
                    </motion.button>
                  </div>
                </div>

                <div className="p-6">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-6 flex items-center gap-3 rounded-xl bg-red-50 p-4 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                    >
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      {error}
                    </motion.div>
                  )}

                  <div className="space-y-5">
                    {/* Name & Provider Row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-2 block font-semibold text-dark-700 text-sm dark:text-dark-200">
                          {t('subscriptions.name', 'Naziv')} <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, name: e.target.value }))
                          }
                          className="w-full rounded-xl border-2 border-dark-200 bg-dark-50/50 px-4 py-3 transition-all focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/10 dark:border-dark-600 dark:bg-dark-700"
                          placeholder="Netflix, Spotify..."
                        />
                      </div>
                      <div>
                        <label className="mb-2 block font-semibold text-dark-700 text-sm dark:text-dark-200">
                          {t('subscriptions.provider', 'Provajder')}
                        </label>
                        <input
                          type="text"
                          value={formData.provider}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, provider: e.target.value }))
                          }
                          className="w-full rounded-xl border-2 border-dark-200 bg-dark-50/50 px-4 py-3 transition-all focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/10 dark:border-dark-600 dark:bg-dark-700"
                          placeholder={formData.name || 'Kompanija'}
                        />
                      </div>
                    </div>

                    {/* Amount & Billing Cycle - Premium styled */}
                    <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 p-4 dark:from-dark-700/50 dark:to-dark-700/30">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
                          <CreditCard className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                        </div>
                        <span className="font-semibold text-dark-700 text-sm dark:text-dark-200">
                          {t('subscriptions.billing', 'Naplata')}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="mb-1.5 block text-dark-600 text-xs dark:text-dark-400">
                            {t('subscriptions.amount', 'Iznos')}{' '}
                            <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              value={formData.amount}
                              onChange={(e) =>
                                setFormData((prev) => ({ ...prev, amount: e.target.value }))
                              }
                              className="w-full rounded-xl border-2 border-violet-200 bg-white px-4 py-2.5 pr-12 font-semibold transition-all focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/10 dark:border-dark-600 dark:bg-dark-700"
                              placeholder="999"
                              min="0"
                              step="0.01"
                            />
                            <span className="absolute top-1/2 right-4 -translate-y-1/2 font-medium text-dark-400 text-sm">
                              RSD
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-dark-600 text-xs dark:text-dark-400">
                            {t('subscriptions.billingCycle', 'Period')}
                          </label>
                          <select
                            value={formData.billingCycle}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                billingCycle: e.target.value as SubscriptionBillingCycle,
                              }))
                            }
                            className="w-full appearance-none rounded-xl border-2 border-violet-200 bg-white px-4 py-2.5 transition-all focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/10 dark:border-dark-600 dark:bg-dark-700"
                          >
                            {BILLING_CYCLES.map((cycle) => (
                              <option key={cycle} value={cycle}>
                                {t(`subscriptions.cycle.${cycle}`, cycle)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Category - Visual picker */}
                    <div>
                      <label className="mb-3 block font-semibold text-dark-700 text-sm dark:text-dark-200">
                        {t('subscriptions.category', 'Kategorija')}
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {SUBSCRIPTION_CATEGORIES.map((cat) => {
                          const CategoryIcon = CATEGORY_ICONS[cat.key] || MoreHorizontal
                          const isSelected = formData.category === cat.key
                          return (
                            <motion.button
                              key={cat.key}
                              type="button"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  category: cat.key as SubscriptionCategory,
                                }))
                              }
                              className={cn(
                                'flex flex-col items-center gap-2 rounded-xl p-3 transition-all',
                                isSelected
                                  ? 'ring-2 ring-violet-500 ring-offset-2'
                                  : 'bg-dark-50 hover:bg-dark-100 dark:bg-dark-700 dark:hover:bg-dark-600'
                              )}
                              style={isSelected ? { backgroundColor: `${cat.color}15` } : {}}
                            >
                              <div
                                className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
                                style={{ backgroundColor: cat.color }}
                              >
                                <CategoryIcon className="h-5 w-5" />
                              </div>
                              <span
                                className={cn(
                                  'text-xs font-medium',
                                  isSelected
                                    ? 'text-dark-900 dark:text-white'
                                    : 'text-dark-600 dark:text-dark-300'
                                )}
                              >
                                {t(`subscriptions.categories.${cat.key}`, cat.key)}
                              </span>
                            </motion.button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Dates Row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-2 block font-semibold text-dark-700 text-sm dark:text-dark-200">
                          {t('subscriptions.nextBillingDate', 'Sledeća naplata')}{' '}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={formData.nextBillingDate}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, nextBillingDate: e.target.value }))
                          }
                          className="w-full rounded-xl border-2 border-dark-200 bg-dark-50/50 px-4 py-3 transition-all focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/10 dark:border-dark-600 dark:bg-dark-700"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block font-semibold text-dark-700 text-sm dark:text-dark-200">
                          {t('subscriptions.startDate', 'Datum početka')}
                        </label>
                        <input
                          type="date"
                          value={formData.startDate}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, startDate: e.target.value }))
                          }
                          className="w-full rounded-xl border-2 border-dark-200 bg-dark-50/50 px-4 py-3 transition-all focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/10 dark:border-dark-600 dark:bg-dark-700"
                        />
                      </div>
                    </div>

                    {/* Reminder Days - Compact */}
                    <div>
                      <label className="mb-2 block font-semibold text-dark-700 text-sm dark:text-dark-200">
                        {t('subscriptions.reminderDays', 'Podsetnik (dana pre naplate)')}
                      </label>
                      <div className="flex items-center gap-3">
                        {[0, 1, 3, 7].map((days) => (
                          <motion.button
                            key={days}
                            type="button"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() =>
                              setFormData((prev) => ({ ...prev, reminderDays: String(days) }))
                            }
                            className={cn(
                              'flex-1 rounded-xl py-2.5 font-medium text-sm transition-all',
                              formData.reminderDays === String(days)
                                ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/25'
                                : 'bg-dark-100 text-dark-600 hover:bg-dark-200 dark:bg-dark-700 dark:text-dark-300'
                            )}
                          >
                            {days === 0
                              ? t('subscriptions.noReminder', 'Ne')
                              : `${days} ${days === 1 ? 'dan' : 'dana'}`}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* URLs - Collapsible Advanced */}
                    <details className="group rounded-xl bg-dark-50 dark:bg-dark-700/50">
                      <summary className="flex cursor-pointer items-center justify-between p-4 font-semibold text-dark-700 text-sm dark:text-dark-200">
                        <span className="flex items-center gap-2">
                          <ExternalLink className="h-4 w-4" />
                          {t('subscriptions.links', 'Linkovi')}{' '}
                          <span className="font-normal text-dark-400">(opciono)</span>
                        </span>
                        <motion.div
                          animate={{ rotate: 0 }}
                          className="text-dark-400 transition-transform group-open:rotate-180"
                        >
                          <ChevronDown className="h-5 w-5" />
                        </motion.div>
                      </summary>
                      <div className="space-y-4 border-t border-dark-200 p-4 dark:border-dark-600">
                        <div>
                          <label className="mb-1.5 block text-dark-600 text-xs dark:text-dark-400">
                            {t('subscriptions.cancelUrl', 'Link za otkazivanje')}
                          </label>
                          <input
                            type="url"
                            value={formData.cancelUrl}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, cancelUrl: e.target.value }))
                            }
                            className="w-full rounded-xl border-2 border-dark-200 bg-white px-4 py-2.5 transition-all focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/10 dark:border-dark-600 dark:bg-dark-700"
                            placeholder="https://..."
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-dark-600 text-xs dark:text-dark-400">
                            {t('subscriptions.loginUrl', 'Link za prijavu')}
                          </label>
                          <input
                            type="url"
                            value={formData.loginUrl}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, loginUrl: e.target.value }))
                            }
                            className="w-full rounded-xl border-2 border-dark-200 bg-white px-4 py-2.5 transition-all focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/10 dark:border-dark-600 dark:bg-dark-700"
                            placeholder="https://..."
                          />
                        </div>
                      </div>
                    </details>

                    {/* Notes */}
                    <div>
                      <label className="mb-2 block font-semibold text-dark-700 text-sm dark:text-dark-200">
                        {t('subscriptions.notes', 'Napomena')}
                      </label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, notes: e.target.value }))
                        }
                        className="w-full resize-none rounded-xl border-2 border-dark-200 bg-dark-50/50 px-4 py-3 transition-all focus:border-violet-500 focus:outline-none focus:ring-4 focus:ring-violet-500/10 dark:border-dark-600 dark:bg-dark-700"
                        rows={2}
                        placeholder={t('subscriptions.notesPlaceholder', 'Dodatne informacije...')}
                      />
                    </div>
                  </div>

                  {/* Actions - Premium styled */}
                  <div className="mt-8 flex gap-3">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCancel}
                      className="flex-1 rounded-xl border-2 border-dark-200 py-3.5 font-semibold text-dark-600 transition-all hover:bg-dark-50 dark:border-dark-600 dark:text-dark-300 dark:hover:bg-dark-700"
                    >
                      {t('common.cancel', 'Otkaži')}
                    </motion.button>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSubmit}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 py-3.5 font-semibold text-white shadow-lg shadow-purple-500/25 transition-all hover:shadow-xl hover:shadow-purple-500/30"
                    >
                      <Check className="h-5 w-5" />
                      {t('common.save', 'Sačuvaj')}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal - Premium */}
        <AnimatePresence>
          {deletingSubscription && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
              onClick={() => setDeletingSubscription(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-dark-800"
              >
                {/* Danger Header */}
                <div className="bg-gradient-to-br from-red-500 to-rose-600 p-6 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                    className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm"
                  >
                    <AlertTriangle className="h-8 w-8 text-white" />
                  </motion.div>
                  <h3 className="font-bold text-white text-xl">
                    {t('subscriptions.deleteTitle', 'Obriši pretplatu')}
                  </h3>
                </div>

                <div className="p-6">
                  <p className="mb-6 text-center text-dark-600 leading-relaxed dark:text-dark-300">
                    {t(
                      'subscriptions.deleteConfirm',
                      'Da li si siguran da želiš da obrišeš "{{name}}"?',
                      {
                        name: deletingSubscription.name,
                      }
                    )}
                    <br />
                    <span className="text-dark-400 text-sm">
                      {t('subscriptions.deleteWarning', 'Ova akcija je nepovratna.')}
                    </span>
                  </p>
                  <div className="flex gap-3">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setDeletingSubscription(null)}
                      className="flex-1 rounded-xl border-2 border-dark-200 py-3.5 font-semibold text-dark-600 transition-all hover:bg-dark-50 dark:border-dark-600 dark:text-dark-300 dark:hover:bg-dark-700"
                    >
                      {t('common.cancel', 'Otkaži')}
                    </motion.button>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleDelete}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 py-3.5 font-semibold text-white shadow-lg shadow-red-500/25 transition-all hover:shadow-xl hover:shadow-red-500/30"
                    >
                      <Trash2 className="h-5 w-5" />
                      {t('common.delete', 'Obriši')}
                    </motion.button>
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

// Subscription Card Component - Premium Version
interface SubscriptionCardProps {
  subscription: SubscriptionWithStatus
  locale: Locale
  index: number
  onEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
  onMarkPaid: () => void
  getCategoryInfo: (
    category: SubscriptionCategory
  ) => (typeof SUBSCRIPTION_CATEGORIES)[number] | undefined
  getProviderInfo: (name: string) => (typeof POPULAR_PROVIDERS)[number] | undefined
}

const SubscriptionCard = memo(function SubscriptionCard({
  subscription,
  locale,
  index,
  onEdit,
  onDelete,
  onToggleActive,
  onMarkPaid,
  getCategoryInfo,
  getProviderInfo,
}: SubscriptionCardProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  const categoryInfo = getCategoryInfo(subscription.category)
  const providerInfo = getProviderInfo(subscription.name)
  const Icon = CATEGORY_ICONS[subscription.category] || MoreHorizontal

  // Determine status badge
  const getStatusBadge = () => {
    if (!subscription.isActive) {
      return {
        text: t('subscriptions.paused', 'Pauzirano'),
        className: 'bg-dark-200 text-dark-600 dark:bg-dark-600 dark:text-dark-300',
      }
    }
    if (subscription.isOverdue) {
      return {
        text: t('subscriptions.overdue', 'Zakasnelo'),
        className: 'bg-gradient-to-r from-red-500 to-rose-500 text-white',
      }
    }
    if (subscription.isDueToday) {
      return {
        text: t('subscriptions.today', 'Danas'),
        className: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
      }
    }
    if (subscription.isDueSoon) {
      return {
        text: t('subscriptions.inDays', 'Za {{days}} dana', {
          days: subscription.daysUntilBilling,
        }),
        className: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white',
      }
    }
    return null
  }

  const statusBadge = getStatusBadge()

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
        type: 'spring',
        stiffness: 100,
      }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={() => setExpanded(!expanded)}
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-black/5 transition-all duration-300 hover:shadow-2xl dark:bg-dark-800 dark:ring-white/10',
        !subscription.isActive && 'opacity-60'
      )}
    >
      {/* Category Color Bar - Premium gradient accent */}
      <div
        className="absolute top-0 right-0 left-0 h-1"
        style={{
          background: `linear-gradient(90deg, ${providerInfo?.color || categoryInfo?.color || '#8B5CF6'}, ${categoryInfo?.color || '#A855F7'})`,
        }}
      />

      {/* Decorative background glow */}
      <div
        className="pointer-events-none absolute -top-20 -right-20 h-40 w-40 rounded-full opacity-10 blur-3xl transition-opacity duration-500 group-hover:opacity-20"
        style={{ backgroundColor: providerInfo?.color || categoryInfo?.color || '#8B5CF6' }}
      />

      {/* Main Content */}
      <div className="relative p-4 pt-5">
        <div className="flex items-start gap-4">
          {/* Provider Logo / Category Icon - Premium styling */}
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl text-white shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${providerInfo?.color || categoryInfo?.color || '#8B5CF6'}, ${categoryInfo?.color || '#A855F7'})`,
              boxShadow: `0 8px 24px -4px ${providerInfo?.color || categoryInfo?.color || '#8B5CF6'}40`,
            }}
          >
            {providerInfo?.logoEmoji || <Icon className="h-7 w-7" />}

            {/* Active indicator ring */}
            {subscription.isActive && (
              <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 ring-2 ring-white dark:ring-dark-800">
                <div className="h-1.5 w-1.5 rounded-full bg-white" />
              </div>
            )}
          </motion.div>

          {/* Info Section */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-bold text-dark-900 text-lg dark:text-white">
                {subscription.name}
              </h3>
              {statusBadge && (
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-0.5 font-medium text-xs',
                    statusBadge.className
                  )}
                >
                  {statusBadge.text}
                </span>
              )}
            </div>

            {/* Category label */}
            <p className="mt-0.5 flex items-center gap-1.5 text-dark-500 text-sm dark:text-dark-400">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: categoryInfo?.color || '#6B7280' }}
              />
              {t(`subscriptions.category.${subscription.category}`, subscription.category)}
            </p>

            {/* Billing info */}
            <div className="mt-2 flex items-center gap-3">
              <span className="inline-flex items-center gap-1 rounded-lg bg-dark-100/80 px-2 py-1 text-dark-600 text-xs dark:bg-dark-700/80 dark:text-dark-300">
                <Calendar className="h-3 w-3" />
                {t(`subscriptions.cycle.${subscription.billingCycle}`, subscription.billingCycle)}
              </span>
              <span className="text-dark-400 text-xs">
                {t('subscriptions.nextBilling', 'Sledeće')}:{' '}
                {format(new Date(subscription.nextBillingDate), 'dd MMM', { locale })}
              </span>
            </div>
          </div>

          {/* Price Section - Premium styling */}
          <div className="shrink-0 text-right">
            <div className="rounded-xl bg-gradient-to-br from-dark-100 to-dark-50 p-3 dark:from-dark-700 dark:to-dark-600">
              <p className="font-bold text-dark-900 text-xl dark:text-white">
                {formatCurrency(subscription.amount)}
              </p>
              <p className="mt-0.5 text-dark-500 text-xs dark:text-dark-400">
                ≈ {formatCurrency(subscription.monthlyEquivalent)}/mes
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Actions - Premium version */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            {/* Action Buttons */}
            <div className="border-t border-dark-100 p-3 dark:border-dark-700">
              <div className="grid grid-cols-4 gap-2">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit()
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-xl bg-dark-50 p-3 text-dark-600 transition-all hover:bg-dark-100 hover:shadow-md dark:bg-dark-700 dark:text-dark-300 dark:hover:bg-dark-600"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-dark-600">
                    <Pencil className="h-5 w-5" />
                  </div>
                  <span className="font-medium text-xs">{t('common.edit', 'Izmeni')}</span>
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleActive()
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-xl bg-dark-50 p-3 text-dark-600 transition-all hover:bg-dark-100 hover:shadow-md dark:bg-dark-700 dark:text-dark-300 dark:hover:bg-dark-600"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-dark-600">
                    {subscription.isActive ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </div>
                  <span className="font-medium text-xs">
                    {subscription.isActive
                      ? t('subscriptions.pause', 'Pauziraj')
                      : t('subscriptions.resume', 'Nastavi')}
                  </span>
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onMarkPaid()
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-xl bg-green-50 p-3 text-green-600 transition-all hover:bg-green-100 hover:shadow-md dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-green-900/40">
                    <Check className="h-5 w-5" />
                  </div>
                  <span className="font-medium text-xs">{t('subscriptions.paid', 'Plaćeno')}</span>
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete()
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-xl bg-red-50 p-3 text-red-600 transition-all hover:bg-red-100 hover:shadow-md dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-red-900/40">
                    <Trash2 className="h-5 w-5" />
                  </div>
                  <span className="font-medium text-xs">{t('common.delete', 'Obriši')}</span>
                </motion.button>
              </div>
            </div>

            {/* Quick Links - Premium styling */}
            {(subscription.cancelUrl || subscription.loginUrl) && (
              <div className="flex gap-2 border-t border-dark-100 p-3 dark:border-dark-700">
                {subscription.loginUrl && (
                  <motion.a
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    href={subscription.loginUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-dark-100 to-dark-50 py-2.5 font-medium text-dark-700 text-sm shadow-sm transition-all hover:shadow-md dark:from-dark-700 dark:to-dark-600 dark:text-dark-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-4 w-4" />
                    {t('subscriptions.login', 'Prijava')}
                  </motion.a>
                )}
                {subscription.cancelUrl && (
                  <motion.a
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    href={subscription.cancelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-100 to-red-50 py-2.5 font-medium text-red-700 text-sm shadow-sm transition-all hover:shadow-md dark:from-red-900/30 dark:to-red-800/20 dark:text-red-300"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-4 w-4" />
                    {t('subscriptions.cancelLink', 'Otkaži')}
                  </motion.a>
                )}
              </div>
            )}

            {/* Notes Section - Premium styling */}
            {subscription.notes && (
              <div className="border-t border-dark-100 p-3 dark:border-dark-700">
                <div className="rounded-xl bg-dark-50 p-3 dark:bg-dark-700/50">
                  <p className="text-dark-600 text-sm leading-relaxed dark:text-dark-300">
                    {subscription.notes}
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expand indicator */}
      <div className="flex items-center justify-center border-t border-dark-100 py-2 dark:border-dark-700">
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="text-dark-400"
        >
          <ChevronDown className="h-5 w-5" />
        </motion.div>
      </div>
    </motion.div>
  )
})
