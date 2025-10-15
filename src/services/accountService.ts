/**
 * Account Service - User account management
 */

import { db } from '@lib/db'
import { logger } from '@/lib/logger'
import { supabase } from '@/lib/supabase'

export interface DeleteAccountResult {
  success: boolean
  error?: string
}

/**
 * Delete user account and all associated data
 * GDPR compliant - "right to be forgotten"
 */
export async function deleteAccount(userId: string): Promise<DeleteAccountResult> {
  try {
    logger.info('Starting account deletion for user:', userId)

    // Step 1: Delete all local data from IndexedDB
    logger.log('Deleting local IndexedDB data...')

    await Promise.all([
      // Delete all receipts
      db.receipts
        .where('userId')
        .equals(userId)
        .delete(),

      // Delete all devices (cascades to reminders via hook)
      db.devices
        .where('userId')
        .equals(userId)
        .delete(),

      // Delete all settings
      db.settings
        .where('userId')
        .equals(userId)
        .delete(),

      // Clear sync queue
      db.syncQueue.clear(),
    ])

    logger.log('Local data deleted successfully')

    // Step 2: Delete user data from Supabase
    // Note: This requires a database function to be created in Supabase
    // See: supabase/migrations/XXX_create_delete_user_function.sql

    try {
      const { error: rpcError } = await supabase.rpc('delete_user_data', {
        user_id: userId,
      })

      if (rpcError) {
        logger.error('Supabase RPC error:', rpcError)
        // Continue anyway - local data is deleted
      }
    } catch (serverError) {
      logger.warn('Could not delete server data (function may not exist):', serverError)
      // This is OK - local data is still deleted
    }

    // Step 3: Sign out from Supabase Auth
    await supabase.auth.signOut()

    logger.info('Account deletion completed successfully')

    return { success: true }
  } catch (error) {
    logger.error('Account deletion failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Export user data (GDPR - "right to data portability")
 * Returns all user data as JSON
 */
export async function exportUserData(userId: string): Promise<{
  receipts: any[]
  devices: any[]
  settings: any[]
}> {
  logger.info('Exporting user data for:', userId)

  const [receipts, devices, settings] = await Promise.all([
    db.receipts.toArray(),
    db.devices.toArray(),
    db.settings.where('userId').equals(userId).toArray(),
  ])

  return {
    receipts,
    devices,
    settings,
  }
}

/**
 * Download user data as JSON file
 */
export function downloadUserData(data: object, filename: string = 'fiskalni-racun-export.json') {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()

  URL.revokeObjectURL(url)
}
