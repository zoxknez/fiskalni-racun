/**
 * Storage Warning Component
 *
 * Shows warning when storage quota is running low
 *
 * @module components/common/StorageWarning
 */

import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { useStorageQuota } from '@/hooks/useStorageQuota'

export function StorageWarning() {
  const { storageInfo, cleanupOldData } = useStorageQuota()
  const [isDismissed, setIsDismissed] = useState(false)
  const [isCleaningUp, setIsCleaningUp] = useState(false)

  // Only show if quota > 80% and not dismissed
  if (!storageInfo || storageInfo.percentageUsed < 80 || isDismissed) {
    return null
  }

  const handleCleanup = async () => {
    setIsCleaningUp(true)
    try {
      await cleanupOldData()
      setIsDismissed(true)
    } catch (error) {
      console.error('Cleanup failed:', error)
    } finally {
      setIsCleaningUp(false)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4"
      >
        <div className="bg-warning-50 dark:bg-warning-900/20 border-2 border-warning-500 rounded-2xl p-4 shadow-xl">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-warning-600" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-warning-900 dark:text-warning-100 mb-1">
                Prostor na uređaju skoro pun
              </h3>

              <p className="text-xs text-warning-800 dark:text-warning-200 mb-3">
                Korišćeno {formatBytes(storageInfo.used)} od {formatBytes(storageInfo.quota)}(
                {storageInfo.percentageUsed.toFixed(1)}%)
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCleanup}
                  disabled={isCleaningUp}
                  className="flex items-center gap-1 px-3 py-1.5 bg-warning-600 hover:bg-warning-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3 h-3" />
                  {isCleaningUp ? 'Čistim...' : 'Očisti stare podatke'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsDismissed(true)}
                  className="p-1.5 hover:bg-warning-100 dark:hover:bg-warning-800 rounded-lg transition-colors"
                  aria-label="Zatvori upozorenje"
                >
                  <X className="w-4 h-4 text-warning-700 dark:text-warning-300" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
