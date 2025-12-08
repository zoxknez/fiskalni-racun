/**
 * DealDetailModal Component
 *
 * Full-screen modal for viewing deal details
 */

import { formatCurrency } from '@lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import type { enUS, sr } from 'date-fns/locale'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Calendar,
  Clock,
  Copy,
  ExternalLink,
  Heart,
  MapPin,
  MoreHorizontal,
  Share2,
  Store,
  TrendingDown,
  X,
} from 'lucide-react'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { DEAL_CATEGORIES, Deal, DealCategory } from '@/hooks/useDeals'
import { CATEGORY_ICONS } from '../types'

export interface DealDetailModalProps {
  deal: Deal | null
  locale: typeof sr | typeof enUS
  getCategoryInfo: (category: DealCategory) => (typeof DEAL_CATEGORIES)[number] | undefined
  onClose: () => void
}

export const DealDetailModal = memo(function DealDetailModal({
  deal,
  locale,
  getCategoryInfo,
  onClose,
}: DealDetailModalProps) {
  const { t } = useTranslation()

  const handleCopy = useCallback(() => {
    if (!deal) return
    navigator.clipboard.writeText(
      `${deal.title}${deal.discountedPrice ? ` - ${formatCurrency(deal.discountedPrice)}` : ''}${deal.url ? `\n${deal.url}` : ''}`
    )
  }, [deal])

  const handleShare = useCallback(() => {
    if (!deal) return
    if (navigator.share) {
      navigator.share({
        title: deal.title,
        text: deal.description || deal.title,
        url: deal.url || window.location.href,
      })
    }
  }, [deal])

  if (!deal) return null

  const CategoryIcon = CATEGORY_ICONS[deal.category] || MoreHorizontal
  const categoryInfo = getCategoryInfo(deal.category as DealCategory)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
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
              background: `linear-gradient(135deg, ${categoryInfo?.color || '#6366f1'}, ${categoryInfo?.color || '#6366f1'}99)`,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 rounded-full bg-white/20 p-2 transition-colors hover:bg-white/30"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/20 p-3">
                <CategoryIcon className="h-6 w-6" />
              </div>
              <div>
                <span className="rounded-full bg-white/20 px-3 py-1 font-medium text-sm">
                  {t(`deals.categories.${deal.category}`, deal.category)}
                </span>
              </div>
            </div>

            <h2 className="mt-4 font-bold text-2xl">{deal.title}</h2>

            {deal.store && (
              <div className="mt-2 flex items-center gap-2 text-white/90">
                <Store className="h-4 w-4" />
                <span>{deal.store}</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="space-y-6 p-6">
            {/* Price Section */}
            {(deal.originalPrice || deal.discountedPrice) && (
              <div className="rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 p-6 dark:from-green-900/20 dark:to-emerald-900/20">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="mb-1 text-dark-500 text-sm dark:text-dark-400">
                      {t('deals.price', 'Cena')}
                    </p>
                    {deal.discountedPrice && (
                      <div className="flex items-baseline gap-3">
                        <span className="font-black text-4xl text-green-600 dark:text-green-400">
                          {formatCurrency(deal.discountedPrice)}
                        </span>
                        {deal.originalPrice && (
                          <span className="text-dark-400 text-xl line-through">
                            {formatCurrency(deal.originalPrice)}
                          </span>
                        )}
                      </div>
                    )}
                    {!deal.discountedPrice && deal.originalPrice && (
                      <span className="font-bold text-3xl text-dark-700 dark:text-dark-200">
                        {formatCurrency(deal.originalPrice)}
                      </span>
                    )}
                  </div>
                  {deal.discountPercent && (
                    <div className="rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 px-4 py-2 text-center text-white shadow-lg">
                      <span className="font-black text-3xl">-{deal.discountPercent}%</span>
                    </div>
                  )}
                </div>
                {deal.originalPrice && deal.discountedPrice && (
                  <div className="mt-3 flex items-center gap-2 text-green-600 dark:text-green-400">
                    <TrendingDown className="h-5 w-5" />
                    <span className="font-semibold">
                      {t('deals.youSave', 'Ušteda')}:{' '}
                      {formatCurrency(deal.originalPrice - deal.discountedPrice)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            {deal.description && (
              <div>
                <h3 className="mb-2 font-semibold text-dark-600 dark:text-dark-300">
                  {t('deals.description', 'Opis')}
                </h3>
                <p className="whitespace-pre-wrap text-dark-700 dark:text-dark-200">
                  {deal.description}
                </p>
              </div>
            )}

            {/* Details Grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              {deal.location && (
                <div className="flex items-center gap-3 rounded-xl bg-dark-50 p-4 dark:bg-dark-700">
                  <MapPin className="h-5 w-5 text-primary-500" />
                  <div>
                    <p className="text-dark-500 text-sm dark:text-dark-400">
                      {t('deals.location', 'Lokacija')}
                    </p>
                    <p className="font-medium text-dark-700 dark:text-dark-200">{deal.location}</p>
                  </div>
                </div>
              )}

              {deal.expiresAt && (
                <div className="flex items-center gap-3 rounded-xl bg-dark-50 p-4 dark:bg-dark-700">
                  <Calendar className="h-5 w-5 text-primary-500" />
                  <div>
                    <p className="text-dark-500 text-sm dark:text-dark-400">
                      {t('deals.validUntil', 'Važi do')}
                    </p>
                    <p className="font-medium text-dark-700 dark:text-dark-200">
                      {format(new Date(deal.expiresAt), 'PPP', { locale })}
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
                    {formatDistanceToNow(new Date(deal.createdAt), {
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
                  <p className="font-medium text-dark-700 dark:text-dark-200">{deal.likesCount}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              {deal.url && (
                <a
                  href={deal.url}
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
                onClick={handleCopy}
                className="rounded-xl bg-dark-100 px-4 py-4 text-dark-600 transition-colors hover:bg-dark-200 dark:bg-dark-700 dark:text-dark-300"
                title={t('deals.copy', 'Kopiraj')}
              >
                <Copy className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="rounded-xl bg-dark-100 px-4 py-4 text-dark-600 transition-colors hover:bg-dark-200 dark:bg-dark-700 dark:text-dark-300"
                title={t('deals.share', 'Podeli')}
              >
                <Share2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
})

export default DealDetailModal
