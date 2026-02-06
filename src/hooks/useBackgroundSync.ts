import { useCallback, useEffect, useRef } from 'react'
import { syncLogger } from '@/lib/logger'
import { performFullSync } from '@/services/syncService'
import { appStore, useAppStore } from '@/store/useAppStore'

/**
 * Modern Background Sync Hook
 *
 * Automatically syncs pending changes when:
 * - User comes back online (FULL SYNC: pull + push)
 * - App becomes visible again (FULL SYNC: pull + push)
 * - On mount (if online) (FULL SYNC: pull + push)
 * - Periodic retry with exponential backoff on failure
 *
 * Works with Dexie syncQueue table from lib/db.ts
 *
 * OPTIMIZED:
 * - Uses useCallback for stable event handlers
 * - Better cleanup
 * - Logger integration (no console.log in production)
 * - Prevents multiple simultaneous syncs using ref
 * - Exponential backoff retry on failure (5s, 10s, 20s, 40s, max 5 min)
 * - BIDIRECTIONAL: Pull + Push for automatic sync between devices
 */

// Retry configuration
const INITIAL_RETRY_DELAY = 5000 // 5 seconds
const MAX_RETRY_DELAY = 5 * 60 * 1000 // 5 minutes
const MAX_RETRY_ATTEMPTS = 5
const PERIODIC_SYNC_INTERVAL = 5 * 60 * 1000 // 5 minutes

export function useBackgroundSync() {
  const user = useAppStore((state) => state.user)

  // Track if sync is in progress to prevent multiple simultaneous syncs
  const isSyncingRef = useRef(false)
  // Track retry state
  const retryCountRef = useRef(0)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Ref to store handleSync for use in scheduleRetry (avoids circular dependency)
  const handleSyncRef = useRef<() => Promise<void>>(() => Promise.resolve())

  // Calculate next retry delay with exponential backoff
  const getNextRetryDelay = useCallback(() => {
    const delay = Math.min(INITIAL_RETRY_DELAY * 2 ** retryCountRef.current, MAX_RETRY_DELAY)
    return delay
  }, [])

  // Schedule a retry (uses ref to avoid circular dependency with handleSync)
  const scheduleRetry = useCallback(() => {
    if (retryCountRef.current >= MAX_RETRY_ATTEMPTS) {
      syncLogger.warn('Max retry attempts reached, stopping automatic retries')
      return
    }

    const delay = getNextRetryDelay()
    syncLogger.log(
      `Scheduling retry in ${delay / 1000}s (attempt ${retryCountRef.current + 1}/${MAX_RETRY_ATTEMPTS})`
    )

    retryTimeoutRef.current = setTimeout(() => {
      retryCountRef.current++
      handleSyncRef.current()
    }, delay)
  }, [getNextRetryDelay])

  // Memoized sync handler - FULL SYNC (pull + push)
  const handleSync = useCallback(async () => {
    if (!navigator.onLine) {
      syncLogger.debug('Skipping sync - offline')
      return
    }

    if (!appStore.getState().user) {
      syncLogger.debug('Skipping sync - user not authenticated')
      return
    }

    // Prevent multiple simultaneous syncs
    if (isSyncingRef.current) {
      syncLogger.debug('Sync already in progress, skipping')
      return
    }

    // Clear any pending retry
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }

    isSyncingRef.current = true
    try {
      syncLogger.log('Background full sync triggered (pull + push)')

      // FULL SYNC: Pull from server + Push local changes
      const fullSyncResult = await performFullSync()

      if (fullSyncResult.success) {
        syncLogger.log('Background full sync completed successfully')
        retryCountRef.current = 0
      } else {
        syncLogger.warn('Background full sync had errors', {
          error: fullSyncResult.error,
          pullSuccess: fullSyncResult.pull?.success,
          pushSuccess: fullSyncResult.push?.success,
        })
        scheduleRetry()
      }
    } catch (error) {
      syncLogger.error('Background sync failed:', error)
      // Schedule retry on error
      scheduleRetry()
    } finally {
      isSyncingRef.current = false
    }
  }, [scheduleRetry])

  // Keep ref updated with latest handleSync
  handleSyncRef.current = handleSync

  // Visibility change handler
  const handleVisibilityChange = useCallback(() => {
    if (!document.hidden && navigator.onLine) {
      syncLogger.debug('App became visible, triggering full sync')
      handleSync()
    }
  }, [handleSync])

  useEffect(() => {
    // Sync on mount if online
    if (user) {
      handleSync()
    }

    // Sync when coming back online
    window.addEventListener('online', handleSync)

    // Sync when app becomes visible
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Periodic sync every 5 minutes to keep data fresh across devices
    const intervalId = setInterval(() => {
      if (!document.hidden && navigator.onLine) {
        syncLogger.debug('Periodic sync triggered')
        handleSync()
      }
    }, PERIODIC_SYNC_INTERVAL)

    return () => {
      window.removeEventListener('online', handleSync)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(intervalId)
      // Clear any pending retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
    }
  }, [handleSync, handleVisibilityChange, user])
}
