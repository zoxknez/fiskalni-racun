/**
 * Broadcast Sync Hook
 *
 * Automatically syncs data across tabs using Broadcast Channel API
 * Invalidates React Query cache when data changes in other tabs
 */

import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import type { BroadcastMessage } from '@/lib/broadcast'
import { broadcastMessage, subscribeToBroadcast } from '@/lib/broadcast'

/**
 * Hook for cross-tab synchronization
 *
 * Automatically invalidates React Query cache when data changes in other tabs
 *
 * @example
 * ```tsx
 * function App() {
 *   useBroadcastSync()
 *   // ...
 * }
 * ```
 */
export function useBroadcastSync() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const unsubscribe = subscribeToBroadcast((message: BroadcastMessage) => {
      switch (message.type) {
        case 'receipt-updated':
        case 'receipt-created':
        case 'receipt-deleted':
          queryClient.invalidateQueries({ queryKey: ['receipts'] })
          queryClient.invalidateQueries({ queryKey: ['receipt', message.receiptId] })
          break

        case 'device-updated':
        case 'device-created':
        case 'device-deleted':
          queryClient.invalidateQueries({ queryKey: ['devices'] })
          queryClient.invalidateQueries({ queryKey: ['device', message.deviceId] })
          break

        case 'sync-completed':
          // Refresh all queries
          queryClient.invalidateQueries()
          break

        case 'auth-changed':
          // Clear cache on auth change
          queryClient.clear()
          break

        case 'settings-changed':
          // Invalidate settings-related queries
          queryClient.invalidateQueries({ queryKey: ['settings'] })
          break

        default:
          // Unknown message type - ignore
          break
      }
    })

    return unsubscribe
  }, [queryClient])
}

/**
 * Broadcast receipt update
 */
export function useBroadcastReceiptUpdate() {
  return {
    broadcastReceiptCreated: (receiptId: string) => {
      broadcastMessage({ type: 'receipt-created', receiptId })
    },
    broadcastReceiptUpdated: (receiptId: string) => {
      broadcastMessage({ type: 'receipt-updated', receiptId })
    },
    broadcastReceiptDeleted: (receiptId: string) => {
      broadcastMessage({ type: 'receipt-deleted', receiptId })
    },
  }
}

/**
 * Broadcast device update
 */
export function useBroadcastDeviceUpdate() {
  return {
    broadcastDeviceCreated: (deviceId: string) => {
      broadcastMessage({ type: 'device-created', deviceId })
    },
    broadcastDeviceUpdated: (deviceId: string) => {
      broadcastMessage({ type: 'device-updated', deviceId })
    },
    broadcastDeviceDeleted: (deviceId: string) => {
      broadcastMessage({ type: 'device-deleted', deviceId })
    },
  }
}

/**
 * Broadcast sync completed
 */
export function useBroadcastSyncCompleted() {
  return () => {
    broadcastMessage({ type: 'sync-completed', timestamp: Date.now() })
  }
}
