import type { SyncQueue } from '../../lib/db'

const API_URL = import.meta.env['VITE_API_URL'] || '/api'

export async function syncToNeon(item: SyncQueue) {
  const token = localStorage.getItem('neon_auth_token')
  if (!token) {
    console.warn('No auth token found, skipping sync')
    return
  }

  const response = await fetch(`${API_URL}/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(item),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Sync failed: ${response.status} ${errorText}`)
  }
}
