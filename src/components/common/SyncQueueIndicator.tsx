/**
 * Sync Queue Indicator
 *
 * Shows pending sync items and allows manual retry
 *
 * @module components/common/SyncQueueIndicator
 */

import { db, processSyncQueue } from '@lib/db'
import { useLiveQuery } from 'dexie-react-hooks'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, RefreshCw, Upload, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { logger } from '@/lib/logger'

export function SyncQueueIndicator() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const isOnline = useOnlineStatus()

  // Live query for pending items
  const pendingItems = useLiveQuery(() => db.syncQueue.toArray(), [])

  const pendingCount = pendingItems?.length || 0

  const handleManualSync = async () => {
    if (!isOnline) {
      logger.warn('Cannot sync - offline')
      return
    }

    setIsSyncing(true)
    setSyncError(null)

    try {
      const result = await processSyncQueue()
      setLastSync(new Date())

      logger.info('Manual sync completed:', result)

      if (result.failed > 0) {
        setSyncError(`${result.failed} stavki nije uspelo`)
      }
    } catch (error) {
      logger.error('Manual sync failed:', error)
      setSyncError(error instanceof Error ? error.message : 'Sync failed')
    } finally {
      setIsSyncing(false)
    }
  }

  // Auto-sync when coming online
  useEffect(() => {
    if (!isOnline || pendingCount === 0 || isSyncing) {
      return undefined
    }

    const timer = setTimeout(() => {
      handleManualSync()
    }, 2000) // Wait 2s before auto-sync

    return () => clearTimeout(timer)
  }, [isOnline, pendingCount, isSyncing, handleManualSync])

  // Don't show if nothing pending and online
  if (pendingCount === 0 && isOnline) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-20 right-4 z-40 max-w-sm"
      >
        <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl border border-dark-200 dark:border-dark-700 p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {!isOnline ? (
                <WifiOff className="w-5 h-5 text-warning-500" />
              ) : isSyncing ? (
                <RefreshCw className="w-5 h-5 text-primary-500 animate-spin" />
              ) : syncError ? (
                <AlertCircle className="w-5 h-5 text-error-500" />
              ) : (
                <Upload className="w-5 h-5 text-primary-500" />
              )}

              <h3 className="font-semibold text-sm text-dark-900 dark:text-dark-50">
                {!isOnline
                  ? 'Offline režim'
                  : isSyncing
                    ? 'Sinhronizujem...'
                    : syncError
                      ? 'Greška'
                      : 'Čeka sinhronizaciju'}
              </h3>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-2">
            {!isOnline && (
              <p className="text-xs text-dark-600 dark:text-dark-400">
                {pendingCount} {pendingCount === 1 ? 'stavka čeka' : 'stavki čeka'} sinhronizaciju.
                Sinhronizacija će se pokrenuti kada se povežete na internet.
              </p>
            )}

            {isOnline && pendingCount > 0 && (
              <p className="text-xs text-dark-600 dark:text-dark-400">
                {pendingCount} {pendingCount === 1 ? 'stavka' : 'stavki'} za sinhronizaciju
              </p>
            )}

            {syncError && <p className="text-xs text-error-600 dark:text-error-400">{syncError}</p>}

            {lastSync && (
              <p className="text-xs text-success-600 dark:text-success-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Poslednja sinhronizacija: {lastSync.toLocaleTimeString()}
              </p>
            )}
          </div>

          {/* Actions */}
          {isOnline && pendingCount > 0 && (
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              <RefreshCw className={cn('w-4 h-4', isSyncing && 'animate-spin')} />
              {isSyncing ? 'Sinhronizujem...' : 'Pokušaj ponovo'}
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
