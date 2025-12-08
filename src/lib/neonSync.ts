import { logger } from '@/lib/logger'
import type { SyncQueue } from '../../lib/db'

const API_URL = import.meta.env['VITE_API_URL'] || '/api'

export async function syncToNeon(item: SyncQueue): Promise<void> {
  const token = localStorage.getItem('neon_auth_token')
  if (!token) {
    throw new Error('No auth token found - user must be logged in to sync')
  }

  logger.info(`Syncing ${item.entityType} ${item.entityId} to Neon...`)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 60000) // 60s timeout

  try {
    const response = await fetch(`${API_URL}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(item),
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
