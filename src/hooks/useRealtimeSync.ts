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
 * Automatically syncs data between IndexedDB and Supabase
 * - Downloads data on mount
 * - Subscribes to realtime updates
 * - Unsubscribes on unmount
 */
export function useRealtimeSync() {
  const user = useAppStore((s) => s.user)

  useEffect(() => {
    if (!user) return

    syncLogger.log('Initializing realtime sync...')

    // Download initial data from Supabase
    syncFromSupabase().catch((error) => {
      syncLogger.error('Failed to download initial data:', error)
    })

    // Subscribe to realtime updates
    subscribeToRealtimeUpdates().catch((error) => {
      syncLogger.error('Failed to subscribe to realtime:', error)
    })

    // Cleanup on unmount
    return () => {
      unsubscribeFromRealtime()
    }
  }, [user])
}
