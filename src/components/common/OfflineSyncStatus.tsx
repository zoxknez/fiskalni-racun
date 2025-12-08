/**
 * Offline Sync Status Component
 *
 * Shows current sync status and allows manual sync
 */

import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Check, Cloud, RefreshCw, WifiOff } from 'lucide-react'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { logger } from '@/lib/logger'

export type SyncStatus = 'synced' | 'syncing' | 'pending' | 'offline' | 'error'

// Auto-retry configuration
const RETRY_DELAYS = [5000, 15000, 30000, 60000] // 5s, 15s, 30s, 1min
const MAX_RETRIES = RETRY_DELAYS.length

interface OfflineSyncStatusProps {
  pendingChanges?: number
  lastSynced?: Date | null
  onSync?: () => Promise<void>
  className?: string
  autoRetry?: boolean // Enable auto-retry on error
}

export const OfflineSyncStatus = memo(
  ({
    pendingChanges = 0,
    lastSynced,
    onSync,
    className = '',
    autoRetry = true,
  }: OfflineSyncStatusProps) => {
    const { t } = useTranslation()
    const [isOnline, setIsOnline] = useState(navigator.onLine)
    const [isSyncing, setIsSyncing] = useState(false)
    const [syncError, setSyncError] = useState<string | null>(null)
    const [retryCount, setRetryCount] = useState(0)
    const [nextRetryIn, setNextRetryIn] = useState<number | null>(null)
    const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // Clear retry timers
    const clearRetryTimers = useCallback(() => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
        countdownRef.current = null
      }
      setNextRetryIn(null)
    }, [])

    // Schedule auto-retry
    const scheduleRetry = useCallback(
      (attempt: number) => {
        if (!autoRetry || attempt >= MAX_RETRIES) {
          logger.warn('Max sync retries reached')
          return
        }

        const delay = RETRY_DELAYS[attempt] ?? RETRY_DELAYS[RETRY_DELAYS.length - 1] ?? 60000
        setNextRetryIn(Math.ceil(delay / 1000))

        // Countdown timer
        countdownRef.current = setInterval(() => {
          setNextRetryIn((prev) => {
            if (prev === null || prev <= 1) {
              if (countdownRef.current) clearInterval(countdownRef.current)
              return null
            }
            return prev - 1
          })
        }, 1000)

        // Actual retry
        retryTimeoutRef.current = setTimeout(() => {
          if (navigator.onLine) {
            handleSync(attempt + 1)
          }
        }, delay)

        logger.info(
          `Sync retry scheduled in ${delay / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})`
        )
      },
      [autoRetry]
    )

    // Monitor online status
    useEffect(() => {
      const handleOnline = () => {
        setIsOnline(true)
        clearRetryTimers()
        setRetryCount(0)
        setSyncError(null)
        // Auto-sync when coming back online
        if (pendingChanges > 0 && onSync) {
          handleSync(0)
        }
      }
      const handleOffline = () => {
        setIsOnline(false)
        clearRetryTimers()
      }

      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)

      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
        clearRetryTimers()
      }
    }, [pendingChanges, onSync, clearRetryTimers])

    const handleSync = async (attempt = 0) => {
      if (!onSync || !isOnline || isSyncing) return

      setIsSyncing(true)
      setSyncError(null)
      clearRetryTimers()

      try {
        await onSync()
        setRetryCount(0)
        toast.success(t('sync.success'))
      } catch (error) {
        logger.error('Sync failed:', error)
        setSyncError(t('sync.error'))
        setRetryCount(attempt + 1)

        if (attempt === 0) {
          // Only show toast on first attempt
          toast.error(t('sync.error'))
        }

        // Schedule auto-retry
        scheduleRetry(attempt)
      } finally {
        setIsSyncing(false)
      }
    }

    const getStatus = (): SyncStatus => {
      if (!isOnline) return 'offline'
      if (syncError) return 'error'
      if (isSyncing) return 'syncing'
      if (pendingChanges > 0) return 'pending'
      return 'synced'
    }

    const status = getStatus()

    const statusConfig = {
      synced: {
        icon: Check,
        color: 'text-green-500',
        bgColor: 'bg-green-100 dark:bg-green-900/20',
        label: t('sync.synced'),
      },
      syncing: {
        icon: RefreshCw,
        color: 'text-blue-500',
        bgColor: 'bg-blue-100 dark:bg-blue-900/20',
        label: t('sync.syncing'),
      },
      pending: {
        icon: Cloud,
        color: 'text-amber-500',
        bgColor: 'bg-amber-100 dark:bg-amber-900/20',
        label: t('sync.pending', { count: pendingChanges }),
      },
      offline: {
        icon: WifiOff,
        color: 'text-dark-500',
        bgColor: 'bg-dark-100 dark:bg-dark-700',
        label: t('sync.offline'),
      },
      error: {
        icon: AlertCircle,
        color: 'text-red-500',
        bgColor: 'bg-red-100 dark:bg-red-900/20',
        label: t('sync.error'),
      },
    }

    const config = statusConfig[status]
    const StatusIcon = config.icon

    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`flex items-center gap-2 rounded-xl px-3 py-2 ${config.bgColor}`}
        >
          <motion.div
            animate={status === 'syncing' ? { rotate: 360 } : {}}
            transition={
              status === 'syncing'
                ? { duration: 1, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }
                : {}
            }
          >
            <StatusIcon className={`h-4 w-4 ${config.color}`} />
          </motion.div>
          <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
        </motion.div>

        <AnimatePresence>
          {(status === 'pending' || status === 'error') && isOnline && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSync(0)}
              disabled={isSyncing}
              className="flex items-center gap-2 rounded-xl bg-primary-500 px-3 py-2 text-sm font-medium text-white shadow-lg shadow-primary-500/30 transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{t('sync.syncNow')}</span>
            </motion.button>
          )}
        </AnimatePresence>

        {lastSynced && status === 'synced' && (
          <span className="text-xs text-dark-400 dark:text-dark-500">
            {t('sync.lastSynced', { time: formatLastSynced(lastSynced) })}
          </span>
        )}

        {/* Auto-retry countdown */}
        <AnimatePresence>
          {nextRetryIn !== null && status === 'error' && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="text-xs text-dark-500"
            >
              {t('sync.retryIn', { seconds: nextRetryIn })}
              {retryCount > 0 && (
                <span className="ml-1 text-dark-400">
                  ({retryCount}/{MAX_RETRIES})
                </span>
              )}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    )
  }
)

OfflineSyncStatus.displayName = 'OfflineSyncStatus'

// Helper to format last synced time
function formatLastSynced(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)

  if (diffMins < 1) return 'upravo'
  if (diffMins < 60) return `pre ${diffMins} min`
  if (diffHours < 24) return `pre ${diffHours}h`
  return date.toLocaleDateString()
}

// Compact version for header/footer
export const OfflineSyncIndicator = memo(({ pendingChanges = 0 }: { pendingChanges?: number }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

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

  if (isOnline && pendingChanges === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`fixed left-1/2 top-2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 shadow-lg ${
        isOnline ? 'bg-amber-500 text-white' : 'bg-dark-700 text-dark-200'
      }`}
    >
      {isOnline ? (
        <>
          <Cloud className="h-4 w-4" />
          <span className="text-sm font-medium">{pendingChanges} pending</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">Offline</span>
        </>
      )}
    </motion.div>
  )
})

OfflineSyncIndicator.displayName = 'OfflineSyncIndicator'

export default OfflineSyncStatus
