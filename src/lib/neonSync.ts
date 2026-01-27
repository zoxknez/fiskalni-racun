import { logger } from '@/lib/logger'
import type { SyncQueue } from '../../lib/db'

const API_URL = import.meta.env['VITE_API_URL'] || '/api'

/**
 * Warm up the database connection before sync operations.
 * Neon serverless has cold start latency, so this helps avoid timeouts.
 */
export async function warmUpDatabase(): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s timeout for warmup

    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      const data = await response.json()
      logger.info(`Database warm-up successful, latency: ${data.latency}`)
      return true
    }
    return false
  } catch (error) {
    logger.warn('Database warm-up failed:', error)
    return false
  }
}

export async function syncToNeon(item: SyncQueue): Promise<void> {
  const token = localStorage.getItem('neon_auth_token')
  if (!token) {
    throw new Error('No auth token found - user must be logged in to sync')
  }

  logger.info(`Syncing ${item.entityType} ${item.entityId} to Neon...`)

  // Trim large base64 blobs to avoid oversized payloads/timeouts
  const payload: SyncQueue = JSON.parse(JSON.stringify(item))
  if (
    payload.data &&
    typeof payload.data === 'object' &&
    'imageUrl' in payload.data &&
    typeof payload.data['imageUrl'] === 'string' &&
    (payload.data['imageUrl'] as string).startsWith('data:image/')
  ) {
    payload.data['imageUrl'] = undefined
  }
  if (
    payload.data &&
    typeof payload.data === 'object' &&
    'pdfUrl' in payload.data &&
    typeof payload.data['pdfUrl'] === 'string' &&
    (payload.data['pdfUrl'] as string).startsWith('data:')
  ) {
    payload.data['pdfUrl'] = undefined
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 20000) // 20s timeout

  try {
    const response = await fetch(`${API_URL}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error(`Sync failed for ${item.entityType} ${item.entityId}:`, errorText)
      throw new Error(`Sync failed: ${response.status} ${errorText}`)
    }

    logger.info(`Successfully synced ${item.entityType} ${item.entityId}`)
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Batch sync multiple items at once
 */
export async function syncBatchToNeon(
  items: SyncQueue[]
): Promise<{ success: number; failed: number }> {
  const token = localStorage.getItem('neon_auth_token')
  if (!token) {
    throw new Error('No auth token found - user must be logged in to sync')
  }

  if (items.length === 0) {
    return { success: 0, failed: 0 }
  }

  logger.info(`Batch syncing ${items.length} items to Neon...`)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 120000) // 2min timeout for batch

  try {
    const response = await fetch(`${API_URL}/sync/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ items }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('Batch sync failed:', errorText)
      throw new Error(`Batch sync failed: ${response.status} ${errorText}`)
    }

    const result = await response.json()
    logger.info(`Batch sync completed: ${result.success} success, ${result.failed} failed`)
    return result
  } finally {
    clearTimeout(timeoutId)
  }
}

// ────────────────────────────────────────────────────────────
// Pull Data from Server
// ────────────────────────────────────────────────────────────

export interface PullResult {
  success: boolean
  data?: {
    receipts: unknown[]
    devices: unknown[]
    householdBills: unknown[]
    reminders: unknown[]
    documents: unknown[]
    subscriptions: unknown[]
    settings: unknown | null
  }
  meta?: {
    pulledAt: string
    counts: {
      receipts: number
      devices: number
      householdBills: number
      reminders: number
      documents: number
      subscriptions: number
    }
  }
  error?: string
}

/**
 * Pull all user data from the server.
 * Used when logging in on a new device to sync data.
 */
export async function pullFromNeon(): Promise<PullResult> {
  const token = localStorage.getItem('neon_auth_token')
  if (!token) {
    return { success: false, error: 'No auth token found - user must be logged in to pull' }
  }

  logger.info('Pulling data from Neon...')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout for pull

  try {
    const response = await fetch(`${API_URL}/sync/pull`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('Pull failed:', errorText)
      return { success: false, error: `Pull failed: ${response.status} ${errorText}` }
    }

    const result: PullResult = await response.json()

    if (result.success && result.meta) {
      logger.info('Pull completed:', result.meta.counts)
    }

    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Pull error:', message)
    return { success: false, error: message }
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Check if user has any data on the server
 * Useful to determine if we should prompt for sync on new device
 */
export async function hasServerData(): Promise<boolean> {
  try {
    const result = await pullFromNeon()
    if (!result.success || !result.meta) return false

    const { counts } = result.meta
    return (
      counts.receipts > 0 || counts.devices > 0 || counts.householdBills > 0 || counts.documents > 0
    )
  } catch {
    return false
  }
}
