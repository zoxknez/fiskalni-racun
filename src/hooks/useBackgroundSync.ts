import { processSyncQueue } from '@lib/db'
import { useCallback, useEffect, useRef } from 'react'
import { syncLogger } from '@/lib/logger'
import { appStore, useAppStore } from '@/store/useAppStore'

/**
 * Modern Background Sync Hook
 *
 * Automatically syncs pending changes when:
 * - User comes back online
 * - App becomes visible again
 * - On mount (if online)
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
 */

// Retry configuration
const INITIAL_RETRY_DELAY = 5000 // 5 seconds
const MAX_RETRY_DELAY = 5 * 60 * 1000 // 5 minutes
const MAX_RETRY_ATTEMPTS = 5

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

  // Memoized sync handler
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
      syncLogger.log('Background sync triggered')
      const result = await processSyncQueue()
      syncLogger.log('Background sync completed', {
        success: result.success,
        failed: result.failed,
        deleted: result.deleted,
      })

      // Reset retry count on success
      if (result.failed === 0) {
        retryCountRef.current = 0
      } else if (result.failed > 0) {
        // Schedule retry for failed items
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

    return () => {
      window.removeEventListener('online', handleSync)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      // Clear any pending retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
    }
  }, [handleSync, handleVisibilityChange, user])
}
