/**
 * DeleteDealModal Component
 *
 * Confirmation modal for deleting a deal with enhanced UI
 */

import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Trash2, X } from 'lucide-react'
import { memo, useState } from 'react'
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
  const [isDeleting, setIsDeleting] = useState(false)

  if (!deal) return null

  const handleConfirm = async () => {
    setIsDeleting(true)
    try {
      await onConfirm()
    } finally {
      setIsDeleting(false)
    }
  }

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
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-dark-800"
        >
          {/* Danger Header */}
          <div className="relative overflow-hidden bg-gradient-to-br from-red-500 to-rose-600 p-6 text-center">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtNi42MjcgMC0xMiA1LjM3My0xMiAxMnM1LjM3MyAxMiAxMiAxMiAxMi01LjM3MyAxMi0xMi01LjM3My0xMi0xMi0xMnoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4xIi8+PC9nPjwvc3ZnPg==')] opacity-30" />
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
              className="relative mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm"
            >
              <AlertTriangle className="h-8 w-8 text-white" />
            </motion.div>
            <h3 className="relative font-bold text-white text-xl">
              {t('deals.deleteTitle', 'Obriši ponudu')}
            </h3>
            <button
              type="button"
              onClick={onCancel}
              className="absolute top-4 right-4 rounded-full bg-white/10 p-1.5 text-white/80 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-6">
            {/* Deal info */}
            <div className="mb-5 rounded-xl bg-dark-50 p-4 dark:bg-dark-700/50">
              <p className="font-semibold text-dark-900 dark:text-white">{deal.title}</p>
              <p className="mt-1 text-dark-500 text-sm">{deal.store}</p>
            </div>

            <p className="mb-6 text-center text-dark-600 leading-relaxed dark:text-dark-300">
              {t('deals.deleteConfirm', 'Da li si siguran da želiš da obrišeš ovu ponudu?')}
              <br />
              <span className="text-dark-400 text-sm">
                {t('common.actionCannotBeUndone', 'Ova akcija je nepovratna.')}
              </span>
            </p>

            <div className="flex gap-3">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onCancel}
                disabled={isDeleting}
                className="flex-1 rounded-xl border-2 border-dark-200 py-3.5 font-semibold text-dark-600 transition-all hover:bg-dark-50 disabled:opacity-50 dark:border-dark-600 dark:text-dark-300 dark:hover:bg-dark-700"
              >
                {t('common.cancel', 'Otkaži')}
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleConfirm}
                disabled={isDeleting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 py-3.5 font-semibold text-white shadow-lg shadow-red-500/25 transition-all hover:shadow-red-500/30 hover:shadow-xl disabled:opacity-50"
              >
                {isDeleting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
                    className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white"
                  />
                ) : (
                  <Trash2 className="h-5 w-5" />
                )}
                {t('common.delete', 'Obriši')}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
})

export default DeleteDealModal
