import { useEffect } from 'react'
import { processSyncQueue } from '@/lib'

/**
 * Background Sync Hook
 * 
 * Automatically syncs pending changes when:
 * - User comes back online
 * - App becomes visible again
 * - On mount (if online)
 * 
 * Works with Dexie syncQueue table from lib/db.ts
 */
export function useBackgroundSync() {
  useEffect(() => {
    const handleSync = async () => {
      if (navigator.onLine) {
        try {
          console.log('🔄 Background sync triggered')
          await processSyncQueue()
          console.log('✅ Background sync completed')
        } catch (error) {
          console.error('❌ Background sync failed:', error)
        }
      }
    }

    // Sync on mount if online
    handleSync()

    // Sync when coming back online
    window.addEventListener('online', handleSync)

    // Sync when app becomes visible (user switches back to tab)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && navigator.onLine) {
        handleSync()
      }
    })

    return () => {
      window.removeEventListener('online', handleSync)
      document.removeEventListener('visibilitychange', handleSync)
    }
  }, [])
}
