/**
 * SubscriptionCard Component
 *
 * Premium styled subscription card with expand/collapse and action buttons
 */

import { cn, formatCurrency } from '@lib/utils'
import { format } from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Calendar,
  Check,
  ChevronDown,
  ExternalLink,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Trash2,
} from 'lucide-react'
import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CATEGORY_ICONS,
  type Locale,
  type POPULAR_PROVIDERS,
  type SUBSCRIPTION_CATEGORIES,
  type SubscriptionCategory,
  type SubscriptionWithStatus,
} from '../types'

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

export const SubscriptionCard = memo(function SubscriptionCard({
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
