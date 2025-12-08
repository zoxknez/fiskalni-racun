/**
 * Saved E-Receipts Service
 *
 * Simple service to save and manage scanned e-receipt links.
 * Uses localStorage for offline-first storage.
 */

import { logger } from '@/lib/logger'

export interface SavedEReceipt {
  id?: string
  url: string
  merchantName?: string
  scannedAt: Date
  notes?: string
}

const STORAGE_KEY = 'saved_e_receipts'

/**
 * Get all saved e-receipts from localStorage
 */
const getFromStorage = (): SavedEReceipt[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored)
    return parsed.map((item: SavedEReceipt) => ({
      ...item,
      scannedAt: new Date(item.scannedAt),
    }))
  } catch {
    return []
  }
}

/**
 * Save to localStorage
 */
const saveToStorage = (receipts: SavedEReceipt[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(receipts))
}

/**
 * Save a new e-receipt link
 */
export async function saveEReceiptLink(receipt: Omit<SavedEReceipt, 'id'>): Promise<SavedEReceipt> {
  const newReceipt: SavedEReceipt = {
    ...receipt,
    id: crypto.randomUUID(),
  }

  const existing = getFromStorage()

  // Check for duplicates
  if (existing.some((r) => r.url === newReceipt.url)) {
    throw new Error('Link already saved')
  }

  saveToStorage([newReceipt, ...existing])
  logger.info('Saved e-receipt link:', newReceipt.id)

  return newReceipt
}

/**
 * Get all saved e-receipt links
 */
export async function getSavedEReceipts(): Promise<SavedEReceipt[]> {
  return getFromStorage().sort(
    (a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()
  )
}

/**
 * Delete a saved e-receipt link
 */
export async function deleteEReceiptLink(id: string): Promise<void> {
  const existing = getFromStorage()
  const filtered = existing.filter((r) => r.id !== id)
  saveToStorage(filtered)
  logger.info('Deleted e-receipt link:', id)
}

/**
 * Update notes for a saved e-receipt
 */
export async function updateEReceiptNotes(id: string, notes: string): Promise<void> {
  const existing = getFromStorage()
  const updated = existing.map((r) => (r.id === id ? { ...r, notes } : r))
  saveToStorage(updated)
}

/**
 * Update merchant name for a saved e-receipt
 */
export async function updateEReceiptMerchant(id: string, merchantName: string): Promise<void> {
  const existing = getFromStorage()
  const updated = existing.map((r) => (r.id === id ? { ...r, merchantName } : r))
  saveToStorage(updated)
}

/**
 * Get count of saved e-receipts
 */
export async function getSavedEReceiptsCount(): Promise<number> {
  return getFromStorage().length
}
