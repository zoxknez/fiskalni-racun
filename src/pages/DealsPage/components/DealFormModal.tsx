/**
 * DealFormModal Component
 *
 * Modal for creating/editing deals with enhanced UI
 */

import { cn } from '@lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Calendar,
  Check,
  ExternalLink,
  Loader2,
  MapPin,
  Package,
  Percent,
  Share2,
  ShoppingBag,
  Store,
  Tag,
  X,
} from 'lucide-react'
import { memo, useState } from 'react'
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
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      await onSubmit()
    } finally {
      setIsSubmitting(false)
    }
  }

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
          className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-3xl bg-white shadow-2xl dark:bg-dark-800"
        >
          {/* Header with gradient */}
          <div className="relative overflow-hidden bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-5">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtNi42MjcgMC0xMiA1LjM3My0xMiAxMnM1LjM3MyAxMiAxMiAxMiAxMi01LjM3MyAxMi0xMi01LjM3My0xMi0xMi0xMnoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4xIi8+PC9nPjwvc3ZnPg==')] opacity-30" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                  <Share2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-xl">
                    {t('deals.addNew', 'Nova ponuda')}
                  </h3>
                  <p className="text-sm text-white/80">
                    {t('deals.addNewSubtitle', 'Podeli sjajnu ponudu sa zajednicom')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="p-6">
            {formError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 flex items-center gap-3 rounded-xl bg-red-50 p-4 dark:bg-red-900/20"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <p className="font-medium text-red-700 text-sm dark:text-red-300">{formError}</p>
              </motion.div>
            )}

            <div className="space-y-5">
              {/* Title */}
              <div>
                <label className="mb-2 flex items-center gap-2 font-medium text-dark-700 text-sm dark:text-dark-300">
                  <Package className="h-4 w-4 text-primary-500" />
                  {t('deals.dealTitle', 'Naslov ponude')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => onFormChange({ title: e.target.value })}
                  placeholder={t('deals.titlePlaceholder', 'npr. iPhone 15 Pro - 20% popust')}
                  className="w-full rounded-xl border border-dark-200 bg-white px-4 py-3.5 font-medium transition-all placeholder:text-dark-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-700 dark:focus:border-primary-500"
                />
              </div>

              {/* Store with Autocomplete */}
              <div>
                <label className="mb-2 flex items-center gap-2 font-medium text-dark-700 text-sm dark:text-dark-300">
                  <Store className="h-4 w-4 text-primary-500" />
                  {t('deals.store', 'Prodavnica')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  list={storesListId}
                  value={formData.store}
                  onChange={(e) => onFormChange({ store: e.target.value })}
                  placeholder={t('deals.storePlaceholder', 'npr. Gigatron, Tehnomanija...')}
                  className="w-full rounded-xl border border-dark-200 bg-white px-4 py-3.5 font-medium transition-all placeholder:text-dark-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-700 dark:focus:border-primary-500"
                />
                <datalist id={storesListId}>
                  {POPULAR_STORES.map((store) => (
                    <option key={store} value={store} />
                  ))}
                </datalist>
              </div>

              {/* Category */}
              <div>
                <label className="mb-2 flex items-center gap-2 font-medium text-dark-700 text-sm dark:text-dark-300">
                  <Tag className="h-4 w-4 text-primary-500" />
                  {t('deals.category', 'Kategorija')}
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => onFormChange({ category: e.target.value })}
                  className="w-full rounded-xl border border-dark-200 bg-white px-4 py-3.5 font-medium transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-700 dark:focus:border-primary-500"
                >
                  {DEAL_CATEGORIES.map((cat) => (
                    <option key={cat.key} value={cat.key}>
                      {t(`deals.categories.${cat.key}`, cat.label)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Prices Row */}
              <div>
                <label className="mb-2 flex items-center gap-2 font-medium text-dark-700 text-sm dark:text-dark-300">
                  <Percent className="h-4 w-4 text-primary-500" />
                  {t('deals.priceInfo', 'Informacije o ceni')}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <span className="mb-1 block text-dark-500 text-xs">
                      {t('deals.originalPrice', 'Stara cena')}
                    </span>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.originalPrice}
                        onChange={(e) => onFormChange({ originalPrice: e.target.value })}
                        placeholder="0"
                        className="w-full rounded-xl border border-dark-200 bg-white px-3 py-3 pr-10 font-medium transition-all placeholder:text-dark-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-700"
                      />
                      <span className="-translate-y-1/2 absolute top-1/2 right-3 text-dark-400 text-sm">
                        RSD
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="mb-1 block text-dark-500 text-xs">
                      {t('deals.discountedPrice', 'Nova cena')}
                    </span>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.discountedPrice}
                        onChange={(e) => onFormChange({ discountedPrice: e.target.value })}
                        placeholder="0"
                        className="w-full rounded-xl border border-dark-200 bg-white px-3 py-3 pr-10 font-medium transition-all placeholder:text-dark-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-700"
                      />
                      <span className="-translate-y-1/2 absolute top-1/2 right-3 text-dark-400 text-sm">
                        RSD
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="mb-1 block text-dark-500 text-xs">
                      {t('deals.discountPercent', 'Popust')}
                    </span>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.discountPercent}
                        onChange={(e) => onFormChange({ discountPercent: e.target.value })}
                        placeholder="0"
                        max="100"
                        className="w-full rounded-xl border border-dark-200 bg-white px-3 py-3 pr-8 font-medium transition-all placeholder:text-dark-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-700"
                      />
                      <span className="-translate-y-1/2 absolute top-1/2 right-3 text-dark-400 text-sm">
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-2 flex items-center gap-2 font-medium text-dark-700 text-sm dark:text-dark-300">
                  <ShoppingBag className="h-4 w-4 text-primary-500" />
                  {t('deals.description', 'Opis')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => onFormChange({ description: e.target.value })}
                  placeholder={t('deals.descriptionPlaceholder', 'Opišite ponudu detaljnije...')}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-dark-200 bg-white px-4 py-3 transition-all placeholder:text-dark-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-700"
                />
              </div>

              {/* URL */}
              <div>
                <label className="mb-2 flex items-center gap-2 font-medium text-dark-700 text-sm dark:text-dark-300">
                  <ExternalLink className="h-4 w-4 text-primary-500" />
                  {t('deals.url', 'Link do ponude')}
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => onFormChange({ url: e.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-dark-200 bg-white px-4 py-3.5 font-medium transition-all placeholder:text-dark-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-700"
                />
              </div>

              {/* Location/Online Toggle */}
              <div>
                <label className="mb-3 flex items-center gap-2 font-medium text-dark-700 text-sm dark:text-dark-300">
                  <MapPin className="h-4 w-4 text-primary-500" />
                  {t('deals.type', 'Tip ponude')}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => onFormChange({ isOnline: true })}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-xl border-2 py-3.5 font-semibold transition-all',
                      formData.isOnline
                        ? 'border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                        : 'border-dark-200 bg-white text-dark-600 hover:border-dark-300 dark:border-dark-600 dark:bg-dark-700 dark:text-dark-300'
                    )}
                  >
                    <ExternalLink className="h-4 w-4" />
                    {t('deals.online', 'Online')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onFormChange({ isOnline: false })}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-xl border-2 py-3.5 font-semibold transition-all',
                      !formData.isOnline
                        ? 'border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                        : 'border-dark-200 bg-white text-dark-600 hover:border-dark-300 dark:border-dark-600 dark:bg-dark-700 dark:text-dark-300'
                    )}
                  >
                    <Store className="h-4 w-4" />
                    {t('deals.inStore', 'U prodavnici')}
                  </button>
                </div>
              </div>

              {/* Location (if in-store) */}
              <AnimatePresence>
                {!formData.isOnline && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <label className="mb-2 flex items-center gap-2 font-medium text-dark-700 text-sm dark:text-dark-300">
                      <MapPin className="h-4 w-4 text-primary-500" />
                      {t('deals.location', 'Lokacija')}
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => onFormChange({ location: e.target.value })}
                      placeholder={t('deals.locationPlaceholder', 'npr. Beograd, TC Ušće')}
                      className="w-full rounded-xl border border-dark-200 bg-white px-4 py-3.5 font-medium transition-all placeholder:text-dark-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-700"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Expires */}
              <div>
                <label className="mb-2 flex items-center gap-2 font-medium text-dark-700 text-sm dark:text-dark-300">
                  <Calendar className="h-4 w-4 text-primary-500" />
                  {t('deals.expiresAt', 'Važi do')}
                </label>
                <input
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) => onFormChange({ expiresAt: e.target.value })}
                  className="w-full rounded-xl border border-dark-200 bg-white px-4 py-3.5 font-medium transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-700"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="flex-1 rounded-xl border-2 border-dark-200 py-3.5 font-semibold text-dark-600 transition-all hover:bg-dark-50 disabled:opacity-50 dark:border-dark-600 dark:text-dark-300 dark:hover:bg-dark-700"
              >
                {t('common.cancel', 'Otkaži')}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.title.trim() || !formData.store.trim()}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 py-3.5 font-semibold text-white shadow-lg shadow-primary-500/30 transition-all hover:from-primary-700 hover:to-primary-600 disabled:opacity-50 disabled:shadow-none"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {t('common.saving', 'Čuvanje...')}
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5" />
                    {t('deals.share', 'Podeli')}
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
})

export default DealFormModal
