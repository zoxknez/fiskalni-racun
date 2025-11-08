import { useEffect } from 'react'
import { syncLogger } from '@/lib/logger'
import {
  subscribeToRealtimeUpdates,
  syncFromSupabase,
  unsubscribeFromRealtime,
} from '@/lib/realtimeSync'
import { useAppStore } from '@/store/useAppStore'

/**
 * Supabase Realtime Sync Hook
 *
 * ⭐ FIXED: Prevents multiple subscriptions and race conditions
 *
 * Automatically syncs data between IndexedDB and Supabase
 * - Downloads data on mount
 * - Subscribes to realtime updates
 * - Unsubscribes on unmount
 */
export function useRealtimeSync() {
  const userId = useAppStore((s) => s.user?.id)

  useEffect(() => {
    // ⭐ FIXED: Use userId instead of entire user object
    if (!userId || userId === 'guest-user') return

    // ⭐ FIXED: Cancellation flag to prevent race conditions
    let cancelled = false

    syncLogger.log('Initializing realtime sync...')

    // ⭐ FIXED: Sequential async setup with cancellation checks
    const setup = async () => {
      try {
        // Download initial data from Supabase
        if (cancelled) return
        await syncFromSupabase()

        // Subscribe to realtime updates
        if (cancelled) return
        await subscribeToRealtimeUpdates()

        syncLogger.log('Realtime sync setup completed')
      } catch (error) {
        if (!cancelled) {
          syncLogger.error('Realtime sync setup failed:', error)
        }
      }
    }

    setup()

    // Cleanup on unmount
    return () => {
      cancelled = true
      unsubscribeFromRealtime().catch((error) => {
        syncLogger.error('Failed to unsubscribe from realtime', error)
      })
    }
  }, [userId])
}
