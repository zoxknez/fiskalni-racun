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
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

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
