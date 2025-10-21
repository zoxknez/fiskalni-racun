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
import { logger } from '@/lib/logger'

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
      logger.error('Cleanup failed:', error)
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
        className="-translate-x-1/2 fixed top-4 left-1/2 z-50 mx-4 w-full max-w-md"
      >
        <div className="rounded-2xl border-2 border-warning-500 bg-warning-50 p-4 shadow-xl dark:bg-warning-900/20">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-warning-600" />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="mb-1 font-bold text-sm text-warning-900 dark:text-warning-100">
                Prostor na uređaju skoro pun
              </h3>

              <p className="mb-3 text-warning-800 text-xs dark:text-warning-200">
                Korišćeno {formatBytes(storageInfo.used)} od {formatBytes(storageInfo.quota)}(
                {storageInfo.percentageUsed.toFixed(1)}%)
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCleanup}
                  disabled={isCleaningUp}
                  className="flex items-center gap-1 rounded-lg bg-warning-600 px-3 py-1.5 font-semibold text-white text-xs transition-colors hover:bg-warning-700 disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" />
                  {isCleaningUp ? 'Čistim...' : 'Očisti stare podatke'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsDismissed(true)}
                  className="rounded-lg p-1.5 transition-colors hover:bg-warning-100 dark:hover:bg-warning-800"
                  aria-label="Zatvori upozorenje"
                >
                  <X className="h-4 w-4 text-warning-700 dark:text-warning-300" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
