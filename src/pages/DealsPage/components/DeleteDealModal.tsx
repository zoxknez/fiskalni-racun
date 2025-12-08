/**
 * DeleteDealModal Component
 *
 * Confirmation modal for deleting a deal
 */

import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import type { Deal } from '@/hooks/useDeals'

export interface DeleteDealModalProps {
  deal: Deal | null
  onConfirm: () => void
  onCancel: () => void
}

export const DeleteDealModal = memo(function DeleteDealModal({
  deal,
  onConfirm,
  onCancel,
}: DeleteDealModalProps) {
  const { t } = useTranslation()

  if (!deal) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-dark-800"
        >
          <div className="mb-4 flex items-center gap-3 text-red-600">
            <AlertTriangle className="h-6 w-6" />
            <h3 className="font-semibold text-lg">{t('deals.deleteTitle', 'Obriši ponudu')}</h3>
          </div>
          <p className="mb-6 text-dark-600 dark:text-dark-300">
            {t('deals.deleteConfirm', 'Da li si siguran da želiš da obrišeš ovu ponudu?')}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-xl border border-dark-200 py-3 font-medium transition-colors hover:bg-dark-50 dark:border-dark-600 dark:hover:bg-dark-700"
            >
              {t('common.cancel', 'Otkaži')}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-3 font-medium text-white transition-colors hover:bg-red-600"
            >
              <Trash2 className="h-5 w-5" />
              {t('common.delete', 'Obriši')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
})

export default DeleteDealModal
