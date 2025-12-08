/**
 * DealFormModal Component
 *
 * Modal for creating/editing deals
 */

import { cn } from '@lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Check, X } from 'lucide-react'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { DEAL_CATEGORIES, POPULAR_STORES } from '@/hooks/useDeals'
import type { DealFormData } from '../types'

export interface DealFormModalProps {
  isOpen: boolean
  formData: DealFormData
  formError: string | null
  storesListId: string
  onFormChange: (data: Partial<DealFormData>) => void
  onSubmit: () => void
  onCancel: () => void
}

export const DealFormModal = memo(function DealFormModal({
  isOpen,
  formData,
  formError,
  storesListId,
  onFormChange,
  onSubmit,
  onCancel,
}: DealFormModalProps) {
  const { t } = useTranslation()

  if (!isOpen) return null

  return (
    <AnimatePresence>
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
              onClick={onCancel}
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
              <label className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300">
                {t('deals.title', 'Naslov ponude')} *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => onFormChange({ title: e.target.value })}
                placeholder={t('deals.titlePlaceholder', 'npr. iPhone 15 Pro - 20% popust')}
                className="w-full rounded-xl border-0 bg-dark-100 px-4 py-3 transition-all placeholder:text-dark-400 focus:bg-dark-50 focus:ring-2 focus:ring-primary-500 dark:bg-dark-700 dark:focus:bg-dark-600"
              />
            </div>

            {/* Store with Autocomplete */}
            <div>
              <label className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300">
                {t('deals.store', 'Prodavnica')} *
              </label>
              <input
                type="text"
                list={storesListId}
                value={formData.store}
                onChange={(e) => onFormChange({ store: e.target.value })}
                placeholder={t('deals.storePlaceholder', 'npr. Gigatron, Tehnomanija...')}
                className="w-full rounded-xl border-0 bg-dark-100 px-4 py-3 transition-all placeholder:text-dark-400 focus:bg-dark-50 focus:ring-2 focus:ring-primary-500 dark:bg-dark-700 dark:focus:bg-dark-600"
              />
              <datalist id={storesListId}>
                {POPULAR_STORES.map((store) => (
                  <option key={store} value={store} />
                ))}
              </datalist>
            </div>

            {/* Category */}
            <div>
              <label className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300">
                {t('deals.category', 'Kategorija')}
              </label>
              <select
                value={formData.category}
                onChange={(e) => onFormChange({ category: e.target.value })}
                className="w-full rounded-xl border-0 bg-dark-100 px-4 py-3 transition-all focus:bg-dark-50 focus:ring-2 focus:ring-primary-500 dark:bg-dark-700 dark:focus:bg-dark-600"
              >
                {DEAL_CATEGORIES.map((cat) => (
                  <option key={cat.key} value={cat.key}>
                    {t(`deals.categories.${cat.key}`, cat.label)}
                  </option>
                ))}
              </select>
            </div>

            {/* Prices Row */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300">
                  {t('deals.originalPrice', 'Stara cena')}
                </label>
                <input
                  type="number"
                  value={formData.originalPrice}
                  onChange={(e) => onFormChange({ originalPrice: e.target.value })}
                  placeholder="0"
                  className="w-full rounded-xl border-0 bg-dark-100 px-4 py-3 transition-all placeholder:text-dark-400 focus:bg-dark-50 focus:ring-2 focus:ring-primary-500 dark:bg-dark-700 dark:focus:bg-dark-600"
                />
              </div>
              <div>
                <label className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300">
                  {t('deals.discountedPrice', 'Nova cena')}
                </label>
                <input
                  type="number"
                  value={formData.discountedPrice}
                  onChange={(e) => onFormChange({ discountedPrice: e.target.value })}
                  placeholder="0"
                  className="w-full rounded-xl border-0 bg-dark-100 px-4 py-3 transition-all placeholder:text-dark-400 focus:bg-dark-50 focus:ring-2 focus:ring-primary-500 dark:bg-dark-700 dark:focus:bg-dark-600"
                />
              </div>
              <div>
                <label className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300">
                  {t('deals.discountPercent', 'Popust %')}
                </label>
                <input
                  type="number"
                  value={formData.discountPercent}
                  onChange={(e) => onFormChange({ discountPercent: e.target.value })}
                  placeholder="0"
                  className="w-full rounded-xl border-0 bg-dark-100 px-4 py-3 transition-all placeholder:text-dark-400 focus:bg-dark-50 focus:ring-2 focus:ring-primary-500 dark:bg-dark-700 dark:focus:bg-dark-600"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300">
                {t('deals.description', 'Opis')}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => onFormChange({ description: e.target.value })}
                placeholder={t(
                  'deals.descriptionPlaceholder',
                  'Opiši ponudu, uslove, gde si je našao...'
                )}
                rows={3}
                className="w-full resize-none rounded-xl border-0 bg-dark-100 px-4 py-3 transition-all placeholder:text-dark-400 focus:bg-dark-50 focus:ring-2 focus:ring-primary-500 dark:bg-dark-700 dark:focus:bg-dark-600"
              />
            </div>

            {/* URL */}
            <div>
              <label className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300">
                {t('deals.url', 'Link do ponude')}
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => onFormChange({ url: e.target.value })}
                placeholder="https://..."
                className="w-full rounded-xl border-0 bg-dark-100 px-4 py-3 transition-all placeholder:text-dark-400 focus:bg-dark-50 focus:ring-2 focus:ring-primary-500 dark:bg-dark-700 dark:focus:bg-dark-600"
              />
            </div>

            {/* Location/Online Toggle */}
            <div>
              <label className="mb-3 block font-medium text-dark-700 text-sm dark:text-dark-300">
                {t('deals.type', 'Tip ponude')}
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => onFormChange({ isOnline: true })}
                  className={cn(
                    'flex-1 rounded-xl py-3 font-medium transition-all',
                    formData.isOnline
                      ? 'bg-primary-500 text-white'
                      : 'bg-dark-100 text-dark-600 hover:bg-dark-200 dark:bg-dark-700 dark:text-dark-300'
                  )}
                >
                  {t('deals.online', 'Online')}
                </button>
                <button
                  type="button"
                  onClick={() => onFormChange({ isOnline: false })}
                  className={cn(
                    'flex-1 rounded-xl py-3 font-medium transition-all',
                    !formData.isOnline
                      ? 'bg-primary-500 text-white'
                      : 'bg-dark-100 text-dark-600 hover:bg-dark-200 dark:bg-dark-700 dark:text-dark-300'
                  )}
                >
                  {t('deals.inStore', 'U prodavnici')}
                </button>
              </div>
            </div>

            {/* Location (if in-store) */}
            {!formData.isOnline && (
              <div>
                <label className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300">
                  {t('deals.location', 'Lokacija')}
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => onFormChange({ location: e.target.value })}
                  placeholder={t('deals.locationPlaceholder', 'npr. Beograd, TC Ušće')}
                  className="w-full rounded-xl border-0 bg-dark-100 px-4 py-3 transition-all placeholder:text-dark-400 focus:bg-dark-50 focus:ring-2 focus:ring-primary-500 dark:bg-dark-700 dark:focus:bg-dark-600"
                />
              </div>
            )}

            {/* Expires */}
            <div>
              <label className="mb-2 block font-medium text-dark-700 text-sm dark:text-dark-300">
                {t('deals.expiresAt', 'Važi do')}
              </label>
              <input
                type="date"
                value={formData.expiresAt}
                onChange={(e) => onFormChange({ expiresAt: e.target.value })}
                className="w-full rounded-xl border-0 bg-dark-100 px-4 py-3 transition-all focus:bg-dark-50 focus:ring-2 focus:ring-primary-500 dark:bg-dark-700 dark:focus:bg-dark-600"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-xl border border-dark-200 py-3 font-medium transition-colors hover:bg-dark-50 dark:border-dark-600 dark:hover:bg-dark-700"
            >
              {t('common.cancel', 'Otkaži')}
            </button>
            <button
              type="button"
              onClick={onSubmit}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-500 py-3 font-medium text-white transition-colors hover:bg-primary-600"
            >
              <Check className="h-5 w-5" />
              {t('deals.share', 'Podeli')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
})

export default DealFormModal
