/**
 * RecentReceiptsList Component
 *
 * List of recently added receipts with micro-interactions
 */

import type { Receipt } from '@lib/db'
import { formatCurrency } from '@lib/utils'
import { motion } from 'framer-motion'
import { memo, useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowRight, Clock, Scan } from '@/lib/icons'
import { formatDate } from '@/lib/utils/dateUtils'
import {
  BASE_ANIMATION_DELAY,
  LIST_ITEM_HOVER,
  STAGGER_DELAY,
  WIGGLE_ANIMATION,
} from '../constants'

interface RecentReceiptsListProps {
  receipts: Receipt[] | undefined
  language: string
}

/**
 * Empty State Component
 */
function EmptyState() {
  const { t } = useTranslation()

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl border border-dark-300 border-dashed bg-gradient-to-br from-dark-50 to-dark-100 px-6 py-16 text-center dark:border-dark-600 dark:from-dark-800 dark:to-dark-900"
      role="status"
    >
      <motion.div
        {...WIGGLE_ANIMATION}
        className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600"
        aria-hidden="true"
      >
        <Scan className="h-10 w-10 text-white" />
      </motion.div>
      <p className="mb-2 font-semibold text-dark-900 text-lg dark:text-dark-50">
        {t('home.emptyState')}
      </p>
      <p className="text-dark-600 text-sm dark:text-dark-400">{t('home.emptyStateHint')}</p>
    </motion.div>
  )
}

/**
 * Receipt Item Component
 */
interface ReceiptItemProps {
  receipt: Receipt
  index: number
  language: string
}

const ReceiptItem = memo(function ReceiptItem({ receipt, index, language }: ReceiptItemProps) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: BASE_ANIMATION_DELAY + 1.0 + index * STAGGER_DELAY }}
      {...LIST_ITEM_HOVER}
    >
      <Link
        to={`/receipts/${receipt.id}`}
        className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        aria-label={`${receipt.merchantName}, ${formatCurrency(receipt.totalAmount)}, ${formatDate(receipt.date, 'dd.MM.yyyy', language)}`}
      >
        <article className="group relative overflow-hidden rounded-2xl border border-dark-200 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-lg dark:border-dark-700 dark:bg-dark-800">
          {/* Hover gradient effect */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-primary-50 to-purple-50 opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:from-primary-900/10 dark:to-purple-900/10"
            aria-hidden="true"
          />

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 shadow-md"
                aria-hidden="true"
              >
                <span className="font-bold text-lg text-white">
                  {receipt.merchantName?.charAt(0).toUpperCase() || '?'}
                </span>
              </motion.div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-dark-900 transition-colors group-hover:text-primary-600 dark:text-dark-50 dark:group-hover:text-primary-400">
                  {receipt.merchantName}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <Clock className="h-3 w-3 text-dark-400" aria-hidden="true" />
                  <time
                    dateTime={
                      receipt.date instanceof Date ? receipt.date.toISOString() : receipt.date
                    }
                    className="text-dark-600 text-sm dark:text-dark-400"
                  >
                    {formatDate(receipt.date, 'dd.MM.yyyy', language)} • {receipt.time}
                  </time>
                </div>
              </div>
            </div>

            <div className="ml-4 shrink-0 text-right">
              <p className="font-bold text-dark-900 text-xl transition-colors group-hover:text-primary-600 dark:text-dark-50 dark:group-hover:text-primary-400">
                {formatCurrency(receipt.totalAmount)}
              </p>
              <span className="mt-1 inline-block rounded-full bg-primary-100 px-2 py-0.5 font-medium text-primary-700 text-xs dark:bg-primary-900/30 dark:text-primary-300">
                {receipt.category}
              </span>
            </div>
          </div>
        </article>
      </Link>
    </motion.li>
  )
})

/**
 * Main Component
 */
function RecentReceiptsListComponent({ receipts, language }: RecentReceiptsListProps) {
  const { t } = useTranslation()
  const sectionTitleId = useId()

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: BASE_ANIMATION_DELAY + 0.9 }}
      aria-labelledby={sectionTitleId}
    >
      <div className="mb-6 flex items-center justify-between">
        <h2
          id={sectionTitleId}
          className="flex items-center gap-2 font-bold text-2xl text-dark-900 dark:text-dark-50"
        >
          <Clock className="h-6 w-6 text-primary-600" aria-hidden="true" />
          {t('home.recentlyAdded')}
        </h2>
        <Link
          to="/receipts"
          className="group flex items-center gap-1 font-semibold text-primary-600 text-sm hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
        >
          {t('home.viewAll')}
          <motion.span whileHover={{ x: 4 }} transition={{ duration: 0.2 }} aria-hidden="true">
            <ArrowRight className="h-4 w-4" />
          </motion.span>
        </Link>
      </div>

      {!receipts || receipts.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-3" aria-label={t('home.recentlyAdded')}>
          {receipts.map((receipt, index) => (
            <ReceiptItem key={receipt.id} receipt={receipt} index={index} language={language} />
          ))}
        </ul>
      )}
    </motion.section>
  )
}

export const RecentReceiptsList = memo(RecentReceiptsListComponent)
