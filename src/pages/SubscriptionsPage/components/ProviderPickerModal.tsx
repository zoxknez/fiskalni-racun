/**
 * ProviderPickerModal Component
 *
 * Modal for selecting popular subscription providers or custom option
 */

import { motion } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { POPULAR_PROVIDERS } from '../types'

interface ProviderPickerModalProps {
  onSelectProvider: (provider: (typeof POPULAR_PROVIDERS)[number] | null) => void
  onClose: () => void
}

export function ProviderPickerModal({ onSelectProvider, onClose }: ProviderPickerModalProps) {
  const { t } = useTranslation()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[80vh] w-full max-w-lg overflow-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-dark-800"
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-dark-900 text-xl dark:text-white">
              {t('subscriptions.selectProvider', 'Izaberi provajdera')}
            </h3>
            <p className="text-dark-500 text-sm">
              {t(
                'subscriptions.selectProviderHint',
                'Izaberi popularni servis ili dodaj prilagođeni'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-dark-400 transition-colors hover:bg-dark-100 hover:text-dark-600 dark:hover:bg-dark-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {POPULAR_PROVIDERS.map((provider) => (
            <motion.button
              key={provider.name}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => onSelectProvider(provider)}
              className="flex flex-col items-center gap-2 rounded-2xl bg-dark-50 p-4 transition-all hover:bg-purple-50 hover:shadow-lg dark:bg-dark-700 dark:hover:bg-purple-900/20"
            >
              <span className="text-3xl">{provider.logoEmoji}</span>
              <span className="text-center font-medium text-xs">{provider.name}</span>
            </motion.button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onSelectProvider(null)}
          className="w-full rounded-xl border-2 border-dark-200 border-dashed py-4 font-semibold text-dark-600 transition-colors hover:border-purple-500 hover:bg-purple-50 hover:text-purple-600 dark:border-dark-600 dark:text-dark-300 dark:hover:border-purple-400 dark:hover:bg-purple-900/20"
        >
          <Plus className="mr-2 inline h-5 w-5" />
          {t('subscriptions.customProvider', 'Druga pretplata...')}
        </button>
      </motion.div>
    </motion.div>
  )
}
