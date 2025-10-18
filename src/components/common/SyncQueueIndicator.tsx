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
import { useCallback, useEffect, useState } from 'react'
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

  const handleManualSync = useCallback(async () => {
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
  }, [isOnline])

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
        className="fixed right-4 bottom-20 z-40 max-w-sm"
      >
        <div className="rounded-2xl border border-dark-200 bg-white p-4 shadow-2xl dark:border-dark-700 dark:bg-dark-800">
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {!isOnline ? (
                <WifiOff className="h-5 w-5 text-warning-500" />
              ) : isSyncing ? (
                <RefreshCw className="h-5 w-5 animate-spin text-primary-500" />
              ) : syncError ? (
                <AlertCircle className="h-5 w-5 text-error-500" />
              ) : (
                <Upload className="h-5 w-5 text-primary-500" />
              )}

              <h3 className="font-semibold text-dark-900 text-sm dark:text-dark-50">
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
              <p className="text-dark-600 text-xs dark:text-dark-400">
                {pendingCount} {pendingCount === 1 ? 'stavka čeka' : 'stavki čeka'} sinhronizaciju.
                Sinhronizacija će se pokrenuti kada se povežete na internet.
              </p>
            )}

            {isOnline && pendingCount > 0 && (
              <p className="text-dark-600 text-xs dark:text-dark-400">
                {pendingCount} {pendingCount === 1 ? 'stavka' : 'stavki'} za sinhronizaciju
              </p>
            )}

            {syncError && <p className="text-error-600 text-xs dark:text-error-400">{syncError}</p>}

            {lastSync && (
              <p className="flex items-center gap-1 text-success-600 text-xs dark:text-success-400">
                <CheckCircle2 className="h-3 w-3" />
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
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 font-semibold text-sm text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
            >
              <RefreshCw className={cn('h-4 w-4', isSyncing && 'animate-spin')} />
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
