/**
 * Sync Status Indicator
 *
 * Shows the current sync status and number of pending operations.
 * Displays as a badge or full status bar.
 *
 * @module components/common/SyncStatusIndicator
 */

import { db } from '@lib/db'
import { cn } from '@lib/utils'
import { useLiveQuery } from 'dexie-react-hooks'
import { memo, useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { Check, Cloud, CloudOff, Download, Loader2, RefreshCw, Upload } from '@/lib/icons'
import {
  performFullSync,
  pullSync,
  pushSync,
  type SyncStatus as SyncStatusType,
  subscribeSyncStatus,
} from '@/services/syncService'

type SyncState = 'synced' | 'pending' | 'syncing' | 'offline' | 'error'

interface SyncStatusIndicatorProps {
  /** Display variant */
  variant?: 'badge' | 'bar' | 'minimal'
  /** Additional CSS classes */
  className?: string
  /** Show even when synced */
  showWhenSynced?: boolean
  /** Callback when clicked */
  onClick?: () => void
}

/**
 * Compact badge showing sync status
 */
export const SyncStatusIndicator = memo(function SyncStatusIndicator({
  variant = 'badge',
  className,
  showWhenSynced = false,
  onClick,
}: SyncStatusIndicatorProps) {
  const { t } = useTranslation()
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isSyncing, _setIsSyncing] = useState(false)

  // Get pending sync items count
  const pendingCount = useLiveQuery(async () => {
    return await db.syncQueue.count()
  }, [])

  // Listen to online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Determine current state
  const getState = (): SyncState => {
    if (!isOnline) return 'offline'
    if (isSyncing) return 'syncing'
    if (pendingCount && pendingCount > 0) return 'pending'
    return 'synced'
  }

  const state = getState()

  // Don't show if synced and showWhenSynced is false
  if (state === 'synced' && !showWhenSynced) {
    return null
  }

  const getIcon = () => {
    switch (state) {
      case 'offline':
        return <CloudOff className="h-4 w-4" />
      case 'syncing':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'pending':
        return <RefreshCw className="h-4 w-4" />
      case 'synced':
        return <Check className="h-4 w-4" />
      default:
        return <Cloud className="h-4 w-4" />
    }
  }

  const getLabel = () => {
    switch (state) {
      case 'offline':
        return t('sync.offline', 'Offline')
      case 'syncing':
        return t('sync.syncing', 'Sinhronizacija...')
      case 'pending':
        return t('sync.pending', '{{count}} na čekanju', { count: pendingCount ?? 0 })
      case 'synced':
        return t('sync.synced', 'Sinhronizovano')
      default:
        return ''
    }
  }

  const getColors = () => {
    switch (state) {
      case 'offline':
        return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
      case 'syncing':
        return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
      case 'pending':
        return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
      case 'synced':
        return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  if (variant === 'minimal') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'relative inline-flex items-center justify-center rounded-full p-1.5',
          getColors(),
          onClick && 'cursor-pointer hover:opacity-80',
          className
        )}
        title={getLabel()}
        aria-label={getLabel()}
      >
        {getIcon()}
        {state === 'pending' && pendingCount && pendingCount > 0 && (
          <span className="-right-1 -top-1 absolute flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 font-bold text-[10px] text-white">
            {pendingCount > 9 ? '9+' : pendingCount}
          </span>
        )}
      </button>
    )
  }

  if (variant === 'bar') {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex w-full items-center justify-between rounded-lg px-3 py-2',
          getColors(),
          onClick && 'cursor-pointer hover:opacity-90',
          className
        )}
      >
        <div className="flex items-center gap-2">
          {getIcon()}
          <span className="font-medium text-sm">{getLabel()}</span>
        </div>
        {state === 'pending' && pendingCount && (
          <span className="rounded-full bg-amber-500 px-2 py-0.5 font-bold text-white text-xs">
            {pendingCount}
          </span>
        )}
      </button>
    )
  }

  // Default badge variant
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium text-xs',
        getColors(),
        onClick && 'cursor-pointer hover:opacity-90',
        className
      )}
    >
      {getIcon()}
      <span>{getLabel()}</span>
    </button>
  )
})

/**
 * Sync queue details panel (for debugging/settings)
 */
export const SyncQueueDetails = memo(function SyncQueueDetails() {
  const { t } = useTranslation()

  const queueItems = useLiveQuery(async () => {
    return await db.syncQueue.orderBy('createdAt').reverse().limit(10).toArray()
  }, [])

  if (!queueItems || queueItems.length === 0) {
    return (
      <div className="rounded-lg bg-gray-50 p-4 text-center text-gray-500 text-sm dark:bg-gray-800">
        {t('sync.queueEmpty', 'Red za sinhronizaciju je prazan')}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="font-medium text-gray-700 text-sm dark:text-gray-300">
        {t('sync.queueItems', 'Stavke u redu')} ({queueItems.length})
      </h3>
      <div className="max-h-48 space-y-1 overflow-y-auto">
        {queueItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-xs dark:bg-gray-800"
          >
            <div>
              <span className="font-medium capitalize">{item.entityType}</span>
              <span className="mx-1 text-gray-400">•</span>
              <span className="text-gray-500">{item.operation}</span>
            </div>
            <div className="flex items-center gap-2">
              {item.retryCount > 0 && (
                <span className="text-amber-500">Retry: {item.retryCount}</span>
              )}
              {item.lastError && (
                <span className="max-w-[100px] truncate text-red-500" title={item.lastError}>
                  {item.lastError}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})

/**
 * Full Sync Control Panel
 * Allows users to manually trigger pull/push sync operations
 */
export const SyncControlPanel = memo(function SyncControlPanel() {
  const { t } = useTranslation()
  const [syncStatus, setSyncStatus] = useState<SyncStatusType | null>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  // Get pending sync items count
  const pendingCount = useLiveQuery(async () => {
    return await db.syncQueue.count()
  }, [])

  // Subscribe to sync status
  useEffect(() => {
    return subscribeSyncStatus(setSyncStatus)
  }, [])

  // Listen to online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handlePullSync = useCallback(async () => {
    if (!isOnline) {
      toast.error(t('sync.offlineError', 'Niste povezani na internet'))
      return
    }

    toast.loading(t('sync.pulling', 'Preuzimanje podataka...'), { id: 'pull-sync' })

    const result = await pullSync()

    if (result.success) {
      if (result.merged) {
        const total =
          result.merged.receipts.added +
          result.merged.devices.added +
          result.merged.householdBills.added +
          result.merged.documents.added
        toast.success(t('sync.pullSuccess', 'Preuzeto {{count}} novih stavki', { count: total }), {
          id: 'pull-sync',
        })
      } else {
        toast.success(t('sync.upToDate', 'Podaci su ažurirani'), { id: 'pull-sync' })
      }
    } else {
      toast.error(result.error || t('sync.pullFailed', 'Greška pri preuzimanju'), {
        id: 'pull-sync',
      })
    }
  }, [isOnline, t])

  const handlePushSync = useCallback(async () => {
    if (!isOnline) {
      toast.error(t('sync.offlineError', 'Niste povezani na internet'))
      return
    }

    toast.loading(t('sync.pushing', 'Slanje podataka...'), { id: 'push-sync' })

    const result = await pushSync()

    if (result.success && result.counts) {
      toast.success(
        t('sync.pushSuccess', 'Poslato {{count}} stavki', { count: result.counts.success }),
        { id: 'push-sync' }
      )
    } else {
      toast.error(result.error || t('sync.pushFailed', 'Greška pri slanju'), { id: 'push-sync' })
    }
  }, [isOnline, t])

  const handleFullSync = useCallback(async () => {
    if (!isOnline) {
      toast.error(t('sync.offlineError', 'Niste povezani na internet'))
      return
    }

    toast.loading(t('sync.fullSyncing', 'Potpuna sinhronizacija...'), { id: 'full-sync' })

    const result = await performFullSync()

    if (result.success) {
      toast.success(t('sync.fullSyncSuccess', 'Sinhronizacija uspešna!'), { id: 'full-sync' })
    } else {
      toast.error(result.error || t('sync.fullSyncFailed', 'Greška pri sinhronizaciji'), {
        id: 'full-sync',
      })
    }
  }, [isOnline, t])

  const isPulling = syncStatus?.isPulling ?? false
  const isPushing = syncStatus?.isPushing ?? false
  const isSyncing = isPulling || isPushing

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {t('sync.title', 'Sinhronizacija')}
        </h3>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="flex items-center gap-1 text-green-600 text-sm">
              <Cloud className="h-4 w-4" />
              {t('sync.online', 'Online')}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-gray-500 text-sm">
              <CloudOff className="h-4 w-4" />
              {t('sync.offline', 'Offline')}
            </span>
          )}
        </div>
      </div>

      {/* Pending count */}
      {pendingCount !== undefined && pendingCount > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-900/20">
          <span className="text-amber-700 text-sm dark:text-amber-400">
            {t('sync.pendingItems', '{{count}} stavki čeka na slanje', { count: pendingCount })}
          </span>
          <RefreshCw className="h-4 w-4 text-amber-600" />
        </div>
      )}

      {/* Sync buttons */}
      <div className="grid grid-cols-2 gap-3">
        {/* Pull button */}
        <button
          type="button"
          onClick={handlePullSync}
          disabled={isSyncing || !isOnline}
          className={cn(
            'flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-medium text-sm transition-colors',
            'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50',
            (isSyncing || !isOnline) && 'cursor-not-allowed opacity-50'
          )}
        >
          {isPulling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {t('sync.pull', 'Preuzmi')}
        </button>

        {/* Push button */}
        <button
          type="button"
          onClick={handlePushSync}
          disabled={isSyncing || !isOnline || !pendingCount}
          className={cn(
            'flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-medium text-sm transition-colors',
            'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50',
            (isSyncing || !isOnline || !pendingCount) && 'cursor-not-allowed opacity-50'
          )}
        >
          {isPushing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {t('sync.push', 'Pošalji')}
        </button>
      </div>

      {/* Full sync button */}
      <button
        type="button"
        onClick={handleFullSync}
        disabled={isSyncing || !isOnline}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 font-medium text-sm transition-colors',
          'bg-primary-600 text-white hover:bg-primary-700',
          (isSyncing || !isOnline) && 'cursor-not-allowed opacity-50'
        )}
      >
        {isSyncing ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <RefreshCw className="h-5 w-5" />
        )}
        {t('sync.fullSync', 'Potpuna sinhronizacija')}
      </button>

      {/* Last sync info */}
      {syncStatus && (syncStatus.lastPullAt || syncStatus.lastPushAt) && (
        <div className="border-gray-200 border-t pt-3 text-gray-500 text-xs dark:border-gray-700">
          {syncStatus.lastPullAt && (
            <div className="flex justify-between">
              <span>{t('sync.lastPull', 'Poslednje preuzimanje')}:</span>
              <span>{new Date(syncStatus.lastPullAt).toLocaleString()}</span>
            </div>
          )}
          {syncStatus.lastPushAt && (
            <div className="flex justify-between">
              <span>{t('sync.lastPush', 'Poslednje slanje')}:</span>
              <span>{new Date(syncStatus.lastPushAt).toLocaleString()}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
})
