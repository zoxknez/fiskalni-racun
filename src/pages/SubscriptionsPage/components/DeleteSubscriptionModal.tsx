/**
 * DeleteSubscriptionModal Component
 *
 * Confirmation modal for deleting a subscription
 */

import { motion } from 'framer-motion'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Subscription } from '../types'

interface DeleteSubscriptionModalProps {
  subscription: Subscription
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteSubscriptionModal({
  subscription,
  onConfirm,
  onCancel,
}: DeleteSubscriptionModalProps) {
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
            {t('subscriptions.deleteConfirm', 'Da li si siguran da želiš da obrišeš "{{name}}"?', {
              name: subscription.name,
            })}
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
              onClick={onCancel}
              className="flex-1 rounded-xl border-2 border-dark-200 py-3.5 font-semibold text-dark-600 transition-all hover:bg-dark-50 dark:border-dark-600 dark:text-dark-300 dark:hover:bg-dark-700"
            >
              {t('common.cancel', 'Otkaži')}
            </motion.button>
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onConfirm}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 py-3.5 font-semibold text-white shadow-lg shadow-red-500/25 transition-all hover:shadow-xl hover:shadow-red-500/30"
            >
              <Trash2 className="h-5 w-5" />
              {t('common.delete', 'Obriši')}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
