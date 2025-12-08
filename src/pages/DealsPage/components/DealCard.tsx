/**
 * DealCard Component
 *
 * Premium card component for displaying a deal in the deals list
 */

import { cn, formatCurrency } from '@lib/utils'
import { formatDistanceToNow } from 'date-fns'
import type { enUS, sr } from 'date-fns/locale'
import { motion, useReducedMotion } from 'framer-motion'
import {
  AlertTriangle,
  Clock,
  ExternalLink,
  Flame,
  Heart,
  MapPin,
  MoreHorizontal,
  Store,
  Trash2,
  TrendingDown,
  Wifi,
} from 'lucide-react'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import type { DEAL_CATEGORIES, Deal, DealCategory } from '@/hooks/useDeals'
import { CATEGORY_ICONS } from '../types'

export interface DealCardProps {
  deal: Deal
  locale: typeof sr | typeof enUS
  currentUserId: string | undefined
  onLike: () => void
  onDelete: () => void
  onViewDetail: () => void
  getCategoryInfo: (category: DealCategory) => (typeof DEAL_CATEGORIES)[number] | undefined
  index: number
}

export const DealCard = memo(function DealCard({
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

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onLike()
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete()
  }

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

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
              onClick={handleLikeClick}
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
                onClick={handleLinkClick}
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
                onClick={handleDeleteClick}
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

export default DealCard
