/**
 * Saved E-Receipts Service
 *
 * Simple service to save and manage scanned e-receipt links.
 * Uses IndexedDB (Dexie) for offline-first storage.
 */

import { db } from '@lib/db'
import { logger } from '@/lib/logger'

export interface SavedEReceipt {
  id?: string
  url: string
  merchantName?: string
  scannedAt: Date
  notes?: string
}

/**
 * Save a new e-receipt link
 */
export async function saveEReceiptLink(receipt: Omit<SavedEReceipt, 'id'>): Promise<SavedEReceipt> {
  const newReceipt: SavedEReceipt = {
    ...receipt,
    id: crypto.randomUUID(),
  }

  // Check for duplicates
  const existing = await db.savedEReceipts.where('url').equals(newReceipt.url).first()
  if (existing) {
    throw new Error('Link already saved')
  }

  await db.savedEReceipts.add(newReceipt)
  logger.info('Saved e-receipt link:', newReceipt.id)

  return newReceipt
}

/**
 * Get all saved e-receipt links
 */
export async function getSavedEReceipts(): Promise<SavedEReceipt[]> {
  return db.savedEReceipts.orderBy('scannedAt').reverse().toArray()
}

/**
 * Delete a saved e-receipt link
 */
export async function deleteEReceiptLink(id: string): Promise<void> {
  await db.savedEReceipts.delete(id)
  logger.info('Deleted e-receipt link:', id)
}

/**
 * Update notes for a saved e-receipt
 */
export async function updateEReceiptNotes(id: string, notes: string): Promise<void> {
  await db.savedEReceipts.update(id, { notes })
}

/**
 * Update merchant name for a saved e-receipt
 */
export async function updateEReceiptMerchant(id: string, merchantName: string): Promise<void> {
  await db.savedEReceipts.update(id, { merchantName })
}

/**
 * Get count of saved e-receipts
 */
export async function getSavedEReceiptsCount(): Promise<number> {
  return db.savedEReceipts.count()
}
