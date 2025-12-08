/**
 * Cloud Backup Service
 *
 * Handles backup and restore of data to Google Drive / Dropbox / Local file
 */

import type { Device, HouseholdBill, Receipt } from '@lib/db'
import { db } from '@lib/db'
import { format } from 'date-fns'
import { logger } from '@/lib/logger'

// Types
export interface BackupData {
  version: string
  createdAt: string
  deviceInfo: {
    userAgent: string
    language: string
  }
  data: {
    receipts: Receipt[]
    devices: Device[]
    householdBills: HouseholdBill[]
  }
  stats: {
    receiptsCount: number
    devicesCount: number
    householdBillsCount: number
    totalAmount: number
  }
}

export type BackupProvider = 'local' | 'google-drive' | 'dropbox'

const BACKUP_VERSION = '1.0'

/**
 * Create backup data from database
 */
export async function createBackupData(): Promise<BackupData> {
  try {
    const receipts = await db.receipts.toArray()
    const devices = await db.devices.toArray()
    const householdBills = await db.householdBills.toArray()

    const totalAmount = receipts.reduce((sum, r) => sum + r.totalAmount, 0)

    return {
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      deviceInfo: {
        userAgent: navigator.userAgent,
        language: navigator.language,
      },
      data: {
        receipts,
        devices,
        householdBills,
      },
      stats: {
        receiptsCount: receipts.length,
        devicesCount: devices.length,
        householdBillsCount: householdBills.length,
        totalAmount,
      },
    }
  } catch (error) {
    logger.error('Failed to create backup data:', error)
    throw error
  }
}

/**
 * Download backup as JSON file
 */
export async function downloadBackup(): Promise<void> {
  try {
    const backupData = await createBackupData()
    const json = JSON.stringify(backupData, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const filename = `fiskalni-backup-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`

    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    logger.info('Backup downloaded successfully', { filename })
  } catch (error) {
    logger.error('Failed to download backup:', error)
    throw error
  }
}

/**
 * Restore data from backup
 */
export async function restoreFromBackup(
  backupData: BackupData,
  options: {
    merge?: boolean // Merge with existing data or replace
    skipDuplicates?: boolean
  } = {}
): Promise<{ receiptsRestored: number; devicesRestored: number; householdBillsRestored: number }> {
  const { merge = false, skipDuplicates = true } = options

  try {
    // Validate backup version
    if (!backupData.version || !backupData.data) {
      throw new Error('Invalid backup format')
    }

    let receiptsRestored = 0
    let devicesRestored = 0
    let householdBillsRestored = 0

    await db.transaction('rw', db.receipts, db.devices, db.householdBills, async () => {
      // Clear existing data if not merging
      if (!merge) {
        await db.receipts.clear()
        await db.devices.clear()
        await db.householdBills.clear()
      }

      // Restore receipts
      for (const receipt of backupData.data.receipts) {
        if (skipDuplicates && receipt.id) {
          const existing = await db.receipts.get(receipt.id)
          if (existing) continue
        }

        await db.receipts.add({
          ...receipt,
          date: new Date(receipt.date),
          createdAt: new Date(receipt.createdAt),
          updatedAt: new Date(receipt.updatedAt),
          syncStatus: 'pending',
        })
        receiptsRestored++
      }

      // Restore devices
      for (const device of backupData.data.devices) {
        if (skipDuplicates && device.id) {
          const existing = await db.devices.get(device.id)
          if (existing) continue
        }

        await db.devices.add({
          ...device,
          purchaseDate: new Date(device.purchaseDate),
          warrantyExpiry: new Date(device.warrantyExpiry),
          createdAt: new Date(device.createdAt),
          updatedAt: new Date(device.updatedAt),
          syncStatus: 'pending',
        })
        devicesRestored++
      }

      // Restore household bills
      for (const bill of backupData.data.householdBills) {
        if (skipDuplicates && bill.id) {
          const existing = await db.householdBills.get(bill.id)
          if (existing) continue
        }

        const restoredBill: HouseholdBill = {
          ...bill,
          billingPeriodStart: new Date(bill.billingPeriodStart),
          billingPeriodEnd: new Date(bill.billingPeriodEnd),
          dueDate: new Date(bill.dueDate),
          createdAt: new Date(bill.createdAt),
          updatedAt: new Date(bill.updatedAt),
          syncStatus: 'pending',
        }

        if (bill.paymentDate) {
          restoredBill.paymentDate = new Date(bill.paymentDate)
        }

        await db.householdBills.add(restoredBill)
        householdBillsRestored++
      }
    })

    logger.info('Backup restored successfully', {
      receiptsRestored,
      devicesRestored,
      householdBillsRestored,
    })

    return { receiptsRestored, devicesRestored, householdBillsRestored }
  } catch (error) {
    logger.error('Failed to restore backup:', error)
    throw error
  }
}

/**
 * Read backup file from user input
 */
export function readBackupFile(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      try {
        const json = event.target?.result as string
        const data = JSON.parse(json) as BackupData
        resolve(data)
      } catch (error) {
        reject(new Error('Invalid backup file format'))
      }
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

/**
 * Validate backup file before restore
 */
export function validateBackup(backupData: BackupData): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!backupData.version) {
    errors.push('Missing version')
  }

  if (!backupData.data) {
    errors.push('Missing data section')
  }

  if (!Array.isArray(backupData.data?.receipts)) {
    errors.push('Invalid receipts data')
  }

  if (!Array.isArray(backupData.data?.devices)) {
    errors.push('Invalid devices data')
  }

  if (!Array.isArray(backupData.data?.householdBills)) {
    errors.push('Invalid household bills data')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Get backup info without full data
 */
export function getBackupInfo(backupData: BackupData): {
  version: string
  createdAt: Date
  stats: BackupData['stats']
} {
  return {
    version: backupData.version,
    createdAt: new Date(backupData.createdAt),
    stats: backupData.stats,
  }
}

// Google Drive Integration (OAuth required - placeholder)
export const googleDriveBackup = {
  isAvailable: () => false, // Requires OAuth setup

  async authorize(): Promise<boolean> {
    // TODO: Implement Google Drive OAuth
    logger.warn('Google Drive backup not yet implemented')
    return false
  },

  async upload(): Promise<void> {
    throw new Error('Google Drive backup requires OAuth setup')
  },

  async download(): Promise<BackupData | null> {
    throw new Error('Google Drive backup requires OAuth setup')
  },

  async list(): Promise<Array<{ id: string; name: string; createdAt: Date }>> {
    throw new Error('Google Drive backup requires OAuth setup')
  },
}

// Dropbox Integration (OAuth required - placeholder)
export const dropboxBackup = {
  isAvailable: () => false, // Requires OAuth setup

  async authorize(): Promise<boolean> {
    // TODO: Implement Dropbox OAuth
    logger.warn('Dropbox backup not yet implemented')
    return false
  },

  async upload(): Promise<void> {
    throw new Error('Dropbox backup requires OAuth setup')
  },

  async download(): Promise<BackupData | null> {
    throw new Error('Dropbox backup requires OAuth setup')
  },

  async list(): Promise<Array<{ id: string; name: string; createdAt: Date }>> {
    throw new Error('Dropbox backup requires OAuth setup')
  },
}

/**
 * Auto-backup settings
 */
export interface AutoBackupSettings {
  enabled: boolean
  provider: BackupProvider
  frequency: 'daily' | 'weekly' | 'monthly'
  lastBackup: string | null
}

const AUTO_BACKUP_KEY = 'fiskalni_auto_backup_settings'

export function getAutoBackupSettings(): AutoBackupSettings {
  try {
    const stored = localStorage.getItem(AUTO_BACKUP_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // Ignore parse errors
  }

  return {
    enabled: false,
    provider: 'local',
    frequency: 'weekly',
    lastBackup: null,
  }
}

export function setAutoBackupSettings(settings: AutoBackupSettings): void {
  localStorage.setItem(AUTO_BACKUP_KEY, JSON.stringify(settings))
}

/**
 * Check if auto-backup is due
 */
export function isBackupDue(): boolean {
  const settings = getAutoBackupSettings()
  if (!settings.enabled || !settings.lastBackup) return true

  const lastBackup = new Date(settings.lastBackup)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - lastBackup.getTime()) / (1000 * 60 * 60 * 24))

  switch (settings.frequency) {
    case 'daily':
      return diffDays >= 1
    case 'weekly':
      return diffDays >= 7
    case 'monthly':
      return diffDays >= 30
    default:
      return false
  }
}
