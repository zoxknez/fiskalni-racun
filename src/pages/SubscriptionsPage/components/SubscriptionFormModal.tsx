/**
 * SubscriptionFormModal Component
 *
 * Modal for creating or editing a subscription
 */

import { cn } from '@lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  CreditCard,
  ExternalLink,
  MoreHorizontal,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { BILLING_CYCLES } from '@/hooks/useSubscriptions'
import {
  CATEGORY_ICONS,
  SUBSCRIPTION_CATEGORIES,
  type Subscription,
  type SubscriptionBillingCycle,
  type SubscriptionCategory,
  type SubscriptionFormData,
} from '../types'

interface SubscriptionFormModalProps {
  formData: SubscriptionFormData
  editingSubscription: Subscription | null
  error: string | null
  onFormChange: (data: SubscriptionFormData) => void
  onSubmit: () => void
  onCancel: () => void
}

export function SubscriptionFormModal({
  formData,
  editingSubscription,
  error,
  onFormChange,
  onSubmit,
  onCancel,
}: SubscriptionFormModalProps) {
  const { t } = useTranslation()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onCancel}
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
              onClick={onCancel}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
            >
              <X className="h-5 w-5" />
            </motion.button>
          </div>
        </div>

        <div className="p-6">
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 flex items-center gap-3 rounded-xl bg-red-50 p-4 text-red-700 dark:bg-red-900/30 dark:text-red-300"
              >
                <AlertTriangle className="h-5 w-5 shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

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
                  onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
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
                  onChange={(e) => onFormChange({ ...formData, provider: e.target.value })}
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
                    {t('subscriptions.amount', 'Iznos')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => onFormChange({ ...formData, amount: e.target.value })}
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
                      onFormChange({
                        ...formData,
                        billingCycle: e.target.value as SubscriptionBillingCycle,
                      })
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
                        onFormChange({ ...formData, category: cat.key as SubscriptionCategory })
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
                  onChange={(e) => onFormChange({ ...formData, nextBillingDate: e.target.value })}
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
                  onChange={(e) => onFormChange({ ...formData, startDate: e.target.value })}
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
                    onClick={() => onFormChange({ ...formData, reminderDays: String(days) })}
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
                <motion.div className="text-dark-400 transition-transform group-open:rotate-180">
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
                    onChange={(e) => onFormChange({ ...formData, cancelUrl: e.target.value })}
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
                    onChange={(e) => onFormChange({ ...formData, loginUrl: e.target.value })}
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
                onChange={(e) => onFormChange({ ...formData, notes: e.target.value })}
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
              onClick={onCancel}
              className="flex-1 rounded-xl border-2 border-dark-200 py-3.5 font-semibold text-dark-600 transition-all hover:bg-dark-50 dark:border-dark-600 dark:text-dark-300 dark:hover:bg-dark-700"
            >
              {t('common.cancel', 'Otkaži')}
            </motion.button>
            <motion.button
              type="button"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={onSubmit}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 py-3.5 font-semibold text-white shadow-lg shadow-purple-500/25 transition-all hover:shadow-xl hover:shadow-purple-500/30"
            >
              <Check className="h-5 w-5" />
              {t('common.save', 'Sačuvaj')}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
