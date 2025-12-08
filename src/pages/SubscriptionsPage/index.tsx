/**
 * SubscriptionsPage
 *
 * Page for managing subscriptions (Netflix, Spotify, gym, etc.)
 * Refactored to use modular components
 */

import { formatCurrency } from '@lib/utils'
import { format } from 'date-fns'
import { enUS, sr } from 'date-fns/locale'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CreditCard, Play, Plus, TrendingUp } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageTransition } from '@/components/common/PageTransition'
import { type POPULAR_PROVIDERS, useSubscriptions } from '@/hooks/useSubscriptions'
import {
  DeleteSubscriptionModal,
  ProviderPickerModal,
  SubscriptionCard,
  SubscriptionFormModal,
} from './components'
import { INITIAL_FORM_DATA, type Subscription, type SubscriptionFormData } from './types'

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
  const [formData, setFormData] = useState<SubscriptionFormData>({
    ...INITIAL_FORM_DATA,
    nextBillingDate: format(new Date(), 'yyyy-MM-dd'),
    startDate: format(new Date(), 'yyyy-MM-dd'),
  })

  const locale = i18n.language === 'sr' ? sr : enUS
  const headingId = 'subscriptions-heading'
  const monthlyTotal = getMonthlyTotal()
  const yearlyTotal = getYearlyTotal()

  const handleStartCreate = useCallback(() => {
    setIsCreating(true)
    setShowProviderPicker(true)
    setFormData({
      ...INITIAL_FORM_DATA,
      nextBillingDate: format(new Date(), 'yyyy-MM-dd'),
      startDate: format(new Date(), 'yyyy-MM-dd'),
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
            <ProviderPickerModal
              onSelectProvider={handleSelectProvider}
              onClose={() => setShowProviderPicker(false)}
            />
          )}
        </AnimatePresence>

        {/* Create/Edit Modal */}
        <AnimatePresence>
          {(isCreating || editingSubscription) && !showProviderPicker && (
            <SubscriptionFormModal
              formData={formData}
              editingSubscription={editingSubscription}
              error={error}
              onFormChange={setFormData}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
            />
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deletingSubscription && (
            <DeleteSubscriptionModal
              subscription={deletingSubscription}
              onConfirm={handleDelete}
              onCancel={() => setDeletingSubscription(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  )
}
