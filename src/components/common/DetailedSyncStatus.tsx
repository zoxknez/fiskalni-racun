/**
 * Detailed Sync Status Component
 *
 * Shows comprehensive sync status with breakdown by entity type
 * Useful for debugging and power users
 *
 * @module components/common/DetailedSyncStatus
 */

import { clearSyncQueue, db, processSyncQueue } from '@lib/db'
import { useLiveQuery } from 'dexie-react-hooks'
import { CheckCircle, Clock, RefreshCw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { logger } from '@/lib/logger'
import { cn } from '@/lib/utils'

export function DetailedSyncStatus() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [isClearing, setIsClearing] = useState(false)

  const syncItems = useLiveQuery(() => db.syncQueue.toArray(), [])

  const stats = useLiveQuery(async () => {
    const items = await db.syncQueue.toArray()

    const byType: Record<string, number> = {}
    const byOperation: Record<string, number> = {}
    let totalRetries = 0
    let oldestTimestamp = Date.now()

    for (const item of items) {
      byType[item.entityType] = (byType[item.entityType] || 0) + 1
      byOperation[item.operation] = (byOperation[item.operation] || 0) + 1
      totalRetries += item.retryCount

      const itemTime = new Date(item.createdAt).getTime()
      if (itemTime < oldestTimestamp) {
        oldestTimestamp = itemTime
      }
    }

    return {
      total: items.length,
      byType,
      byOperation,
      totalRetries,
      oldestAge: items.length > 0 ? Date.now() - oldestTimestamp : 0,
    }
  }, [])

  const handleProcessQueue = async () => {
    setIsProcessing(true)
    try {
      const result = await processSyncQueue()
      logger.info('Manual sync completed', result)
    } catch (error) {
      logger.error('Manual sync failed', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClearQueue = async () => {
    if (!confirm('Obrisati sve pending sync items? Ovo ne može biti vraćeno.')) {
      return
    }

    setIsClearing(true)
    try {
      await clearSyncQueue()
      logger.info('Sync queue cleared')
    } catch (error) {
      logger.error('Failed to clear sync queue', error)
    } finally {
      setIsClearing(false)
    }
  }

  if (!stats || stats.total === 0) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          <span className="font-medium text-green-900 dark:text-green-100">Sve sinhronizovano</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-blue-900 dark:text-blue-100">
              Čeka sinhronizaciju: {stats.total}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleProcessQueue}
              disabled={isProcessing}
              className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-sm text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={cn('h-3 w-3', isProcessing && 'animate-spin')} />
              Sinhronizuj sada
            </button>

            <button
              onClick={handleClearQueue}
              disabled={isClearing}
              className="flex items-center gap-1 rounded bg-red-600 px-3 py-1 text-sm text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" />
              Obriši queue
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div>
            <div className="text-blue-600 dark:text-blue-400">Po tipu:</div>
            {Object.entries(stats.byType).map(([type, count]) => (
              <div key={type} className="text-blue-800 dark:text-blue-200">
                {type}: {count}
              </div>
            ))}
          </div>

          <div>
            <div className="text-blue-600 dark:text-blue-400">Operacije:</div>
            {Object.entries(stats.byOperation).map(([op, count]) => (
              <div key={op} className="text-blue-800 dark:text-blue-200">
                {op}: {count}
              </div>
            ))}
          </div>

          <div>
            <div className="text-blue-600 dark:text-blue-400">Retry-ji:</div>
            <div className="text-blue-800 dark:text-blue-200">{stats.totalRetries}</div>
          </div>

          <div>
            <div className="text-blue-600 dark:text-blue-400">Najstariji:</div>
            <div className="text-blue-800 dark:text-blue-200">
              {Math.floor(stats.oldestAge / 1000 / 60)}m
            </div>
          </div>
        </div>
      </div>

      {/* Individual Items */}
      {import.meta.env.DEV && syncItems && syncItems.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <h4 className="mb-2 font-medium text-gray-900 dark:text-gray-100">
            Queue Items (Dev Only)
          </h4>
          <div className="space-y-2 text-xs">
            {syncItems.slice(0, 10).map((item) => (
              <div
                key={item.id}
                className="rounded border border-gray-200 p-2 dark:border-gray-600"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono">
                    {item.operation} {item.entityType} #{item.entityId}
                  </span>
                  {item.retryCount > 0 && (
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                      Retry: {item.retryCount}
                    </span>
                  )}
                </div>
                {item.lastError && (
                  <div className="mt-1 text-red-600 dark:text-red-400">Error: {item.lastError}</div>
                )}
              </div>
            ))}
            {syncItems.length > 10 && (
              <div className="text-center text-gray-500">... i još {syncItems.length - 10}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
