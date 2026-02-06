/**
 * Sync Service
 *
 * Handles bidirectional synchronization between local IndexedDB and server.
 * Provides pull (server → local) and push (local → server) operations.
 *
 * @module services/syncService
 */

import {
  enqueueAllLocalData,
  type MergeResult,
  mergeServerData,
  processSyncQueue,
  type ServerData,
} from '@lib/db'
import { broadcastMessage } from '@/lib/broadcast'
import { logger } from '@/lib/logger'
import { type PullResult, pullFromNeon } from '@/lib/neonSync'

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

export interface SyncStatus {
  lastPullAt: string | null
  lastPushAt: string | null
  isPulling: boolean
  isPushing: boolean
  pullError: string | null
  pushError: string | null
}

export interface PullSyncResult {
  success: boolean
  merged?: MergeResult | undefined
  error?: string | undefined
}

export interface PushSyncResult {
  success: boolean
  counts?: {
    success: number
    failed: number
    deleted: number
  }
  error?: string
}

export interface FullSyncResult {
  success: boolean
  pull?: PullSyncResult | undefined
  push?: PushSyncResult | undefined
  error?: string | undefined
}

// ────────────────────────────────────────────────────────────
// State
// ────────────────────────────────────────────────────────────

let syncStatus: SyncStatus = {
  lastPullAt: localStorage.getItem('lastPullAt'),
  lastPushAt: localStorage.getItem('lastPushAt'),
  isPulling: false,
  isPushing: false,
  pullError: null,
  pushError: null,
}

const listeners: Set<(status: SyncStatus) => void> = new Set()

function updateStatus(updates: Partial<SyncStatus>) {
  syncStatus = { ...syncStatus, ...updates }

  // Persist timestamps
  if (updates.lastPullAt) {
    localStorage.setItem('lastPullAt', updates.lastPullAt)
  }
  if (updates.lastPushAt) {
    localStorage.setItem('lastPushAt', updates.lastPushAt)
  }

  // Notify listeners
  for (const listener of listeners) {
    listener(syncStatus)
  }
}

// ────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────

/**
 * Subscribe to sync status changes
 */
export function subscribeSyncStatus(listener: (status: SyncStatus) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Get current sync status
 */
export function getSyncStatus(): SyncStatus {
  return { ...syncStatus }
}

/**
 * Pull data from server and merge into local database.
 * Called after login to sync data to a new device.
 */
export async function pullSync(): Promise<PullSyncResult> {
  if (syncStatus.isPulling) {
    logger.warn('Pull already in progress')
    return { success: false, error: 'Pull already in progress' }
  }

  updateStatus({ isPulling: true, pullError: null })

  try {
    logger.info('Starting pull sync...')

    const pullResult: PullResult = await pullFromNeon()

    if (pullResult.meta) {
      logger.info('Pull received from server:', pullResult.meta.counts)
    }

    if (!pullResult.success) {
      const error = pullResult.error || 'Pull failed'
      logger.error('Pull failed:', error)
      updateStatus({ isPulling: false, pullError: error })
      return { success: false, error }
    }

    if (!pullResult.data) {
      logger.info('Pull completed - no data to merge')
      updateStatus({ isPulling: false, lastPullAt: new Date().toISOString() })
      return { success: true }
    }

    // Merge server data into local database
    logger.info('Merging server data into local database...')
    const mergeResult = await mergeServerData(pullResult.data as ServerData)

    updateStatus({
      isPulling: false,
      lastPullAt: new Date().toISOString(),
      pullError: null,
    })

    logger.info('Pull sync completed - merge results:', {
      receipts: mergeResult.receipts,
      devices: mergeResult.devices,
      householdBills: mergeResult.householdBills,
      documents: mergeResult.documents,
      subscriptions: mergeResult.subscriptions,
    })

    return { success: true, merged: mergeResult }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Pull sync error:', message)
    updateStatus({ isPulling: false, pullError: message })
    return { success: false, error: message }
  }
}

/**
 * Force push ALL local data to server.
 * This is used when data exists locally but was never synced (e.g., imported or created before sync was implemented).
 * It first enqueues all local data, then processes the sync queue.
 */
export async function forcePushAllData(): Promise<
  PushSyncResult & {
    enqueued?: ReturnType<typeof enqueueAllLocalData> extends Promise<infer T> ? T : never
  }
> {
  if (syncStatus.isPushing) {
    logger.warn('Push already in progress')
    return { success: false, error: 'Push already in progress' }
  }

  updateStatus({ isPushing: true, pushError: null })

  try {
    logger.info('Starting force push of all local data...')

    // First, enqueue all local data
    const enqueued = await enqueueAllLocalData()
    logger.info('Enqueued all local data:', enqueued)

    // Then process the sync queue
    const result = await processSyncQueue()

    updateStatus({
      isPushing: false,
      lastPushAt: new Date().toISOString(),
      pushError: null,
    })

    logger.info('Force push completed:', result)

    return {
      success: true,
      counts: result,
      enqueued,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Force push error:', message)
    updateStatus({ isPushing: false, pushError: message })
    return { success: false, error: message }
  }
}

/**
 * Push pending local changes to server.
 * Called periodically and when app goes online.
 */
export async function pushSync(): Promise<PushSyncResult> {
  if (syncStatus.isPushing) {
    logger.warn('Push already in progress')
    return { success: false, error: 'Push already in progress' }
  }

  updateStatus({ isPushing: true, pushError: null })

  try {
    logger.info('Starting push sync...')

    const result = await processSyncQueue()

    updateStatus({
      isPushing: false,
      lastPushAt: new Date().toISOString(),
      pushError: null,
    })

    logger.info('Push sync completed:', result)

    return {
      success: true,
      counts: result,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Push sync error:', message)
    updateStatus({ isPushing: false, pushError: message })
    return { success: false, error: message }
  }
}

/**
 * Perform full bidirectional sync.
 * Pull from server first, then push pending changes.
 */
export async function performFullSync(): Promise<FullSyncResult> {
  try {
    logger.info('Starting full sync...')

    const pull = await pullSync()

    // Skip push if pull failed (likely auth/network issue — push would also fail)
    if (!pull.success) {
      return {
        success: false,
        error: pull.error || 'Pull sync failed',
        pull: undefined,
        push: undefined,
      }
    }

    const push = await pushSync()

    if (!push.success) {
      const message = push.error || 'Push sync failed'
      return {
        success: false,
        error: message,
        pull,
        push: undefined,
      }
    }

    return {
      success: true,
      pull,
      push,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Full sync error:', message)
    return { success: false, error: message }
  } finally {
    // Notify other tabs that sync completed so they can refresh data
    broadcastMessage({ type: 'sync-completed', timestamp: Date.now() })
  }
}

/**
 * Sync after login - pull data from server, then push pending local changes.
 * This ensures bidirectional sync when a user logs in on a new or existing device.
 */
export async function syncAfterLogin(): Promise<FullSyncResult> {
  logger.info('Syncing data after login (full sync: pull + push)...')
  return await performFullSync()
}

/**
 * Check if this is likely a new device (no local data)
 */
export async function isNewDevice(): Promise<boolean> {
  const { db } = await import('@lib/db')

  const [receiptsCount, devicesCount] = await Promise.all([db.receipts.count(), db.devices.count()])

  return receiptsCount === 0 && devicesCount === 0
}

/**
 * Auto-sync when coming online
 */
export function setupAutoSync(): () => void {
  const handleOnline = async () => {
    logger.info('Device came online, starting push sync...')
    await pushSync()
  }

  window.addEventListener('online', handleOnline)

  return () => {
    window.removeEventListener('online', handleOnline)
  }
}
