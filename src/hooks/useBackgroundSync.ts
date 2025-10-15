import { useCallback, useEffect } from 'react'
import { processSyncQueue } from '@/lib'
import { syncLogger } from '@/lib/logger'
import { useAppStore } from '@/store/useAppStore'

/**
 * Modern Background Sync Hook
 *
 * Automatically syncs pending changes when:
 * - User comes back online
 * - App becomes visible again
 * - On mount (if online)
 *
 * Works with Dexie syncQueue table from lib/db.ts
 *
 * OPTIMIZED:
 * - Uses useCallback for stable event handlers
 * - Better cleanup
 * - Logger integration (no console.log in production)
 */
export function useBackgroundSync() {
  const user = useAppStore((state) => state.user)

  // Memoized sync handler
  const handleSync = useCallback(async () => {
    if (!navigator.onLine) {
      syncLogger.debug('Skipping sync - offline')
      return
    }

    if (!useAppStore.getState().user) {
      syncLogger.debug('Skipping sync - user not authenticated')
      return
    }

    try {
      syncLogger.log('Background sync triggered')
      const result = await processSyncQueue()
      syncLogger.log('Background sync completed', {
        success: result.success,
        failed: result.failed,
        deleted: result.deleted,
      })
    } catch (error) {
      syncLogger.error('Background sync failed:', error)
    }
  }, [])

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
    }
  }, [handleSync, handleVisibilityChange, user])
}
