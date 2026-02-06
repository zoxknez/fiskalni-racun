/**
 * Cloud Backup Service
 *
 * Handles backup and restore of data to Google Drive / Dropbox / Local file
 */

import type {
  Budget,
  Device,
  Document,
  HouseholdBill,
  Receipt,
  RecurringBill,
  Reminder,
  SavedEReceipt,
  Subscription,
  Tag,
  UserSettings,
} from '@lib/db'
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
    documents: Document[]
    reminders: Reminder[]
    tags: Tag[]
    budgets: Budget[]
    recurringBills: RecurringBill[]
    subscriptions: Subscription[]
    settings: UserSettings[]
    savedEReceipts: SavedEReceipt[]
  }
  stats: {
    receiptsCount: number
    devicesCount: number
    householdBillsCount: number
    documentsCount: number
    remindersCount: number
    tagsCount: number
    budgetsCount: number
    recurringBillsCount: number
    subscriptionsCount: number
    settingsCount: number
    savedEReceiptsCount: number
    totalAmount: number
  }
}

export type BackupProvider = 'local' | 'google-drive' | 'dropbox'

const BACKUP_VERSION = '1.1'

/**
 * Create backup data from database
 */
export async function createBackupData(): Promise<BackupData> {
  try {
    const receipts = await db.receipts.toArray()
    const devices = await db.devices.toArray()
    const householdBills = await db.householdBills.toArray()
    const documents = await db.documents.toArray()
    const reminders = await db.reminders.toArray()
    const tags = await db.tags.toArray()
    const budgets = await db.budgets.toArray()
    const recurringBills = await db.recurringBills.toArray()
    const subscriptions = await db.subscriptions.toArray()
    const settings = await db.settings.toArray()
    const savedEReceipts = await db.savedEReceipts.toArray()

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
        documents,
        reminders,
        tags,
        budgets,
        recurringBills,
        subscriptions,
        settings,
        savedEReceipts,
      },
      stats: {
        receiptsCount: receipts.length,
        devicesCount: devices.length,
        householdBillsCount: householdBills.length,
        documentsCount: documents.length,
        remindersCount: reminders.length,
        tagsCount: tags.length,
        budgetsCount: budgets.length,
        recurringBillsCount: recurringBills.length,
        subscriptionsCount: subscriptions.length,
        settingsCount: settings.length,
        savedEReceiptsCount: savedEReceipts.length,
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
): Promise<{
  receiptsRestored: number
  devicesRestored: number
  householdBillsRestored: number
  documentsRestored: number
  remindersRestored: number
  tagsRestored: number
  budgetsRestored: number
  recurringBillsRestored: number
  subscriptionsRestored: number
  settingsRestored: number
  savedEReceiptsRestored: number
}> {
  const { merge = false, skipDuplicates = true } = options

  try {
    // Validate backup version
    if (!backupData.version || !backupData.data) {
      throw new Error('Invalid backup format')
    }

    let receiptsRestored = 0
    let devicesRestored = 0
    let householdBillsRestored = 0
    let documentsRestored = 0
    let remindersRestored = 0
    let tagsRestored = 0
    let budgetsRestored = 0
    let recurringBillsRestored = 0
    let subscriptionsRestored = 0
    let settingsRestored = 0
    let savedEReceiptsRestored = 0

    const {
      documents = [],
      reminders = [],
      tags = [],
      budgets = [],
      recurringBills = [],
      subscriptions = [],
      settings = [],
      savedEReceipts = [],
    } = backupData.data as Partial<BackupData['data']>

    await db.transaction(
      'rw',
      [
        db.receipts,
        db.devices,
        db.householdBills,
        db.documents,
        db.reminders,
        db.tags,
        db.budgets,
        db.recurringBills,
        db.subscriptions,
        db.settings,
        db.savedEReceipts,
      ],
      async () => {
        // Clear existing data if not merging
        if (!merge) {
          await db.receipts.clear()
          await db.devices.clear()
          await db.householdBills.clear()
          await db.documents.clear()
          await db.reminders.clear()
          await db.tags.clear()
          await db.budgets.clear()
          await db.recurringBills.clear()
          await db.subscriptions.clear()
          await db.settings.clear()
          await db.savedEReceipts.clear()
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

        // Restore documents
        for (const doc of documents) {
          if (skipDuplicates && doc.id) {
            const existing = await db.documents.get(doc.id)
            if (existing) continue
          }

          await db.documents.add({
            ...doc,
            ...(doc.expiryDate ? { expiryDate: new Date(doc.expiryDate) } : {}),
            createdAt: new Date(doc.createdAt),
            updatedAt: new Date(doc.updatedAt),
            syncStatus: 'pending',
          } as Document)
          documentsRestored++
        }

        // Restore reminders
        for (const reminder of reminders) {
          if (skipDuplicates && reminder.id) {
            const existing = await db.reminders.get(reminder.id)
            if (existing) continue
          }

          await db.reminders.add({
            ...reminder,
            createdAt: new Date(reminder.createdAt),
            ...(reminder.sentAt ? { sentAt: new Date(reminder.sentAt) } : {}),
          })
          remindersRestored++
        }

        // Restore tags
        for (const tag of tags) {
          if (skipDuplicates && tag.id) {
            const existing = await db.tags.get(tag.id)
            if (existing) continue
          }

          await db.tags.add({
            ...tag,
            createdAt: new Date(tag.createdAt),
            updatedAt: new Date(tag.updatedAt),
          })
          tagsRestored++
        }

        // Restore budgets
        for (const budget of budgets) {
          if (skipDuplicates && budget.id) {
            const existing = await db.budgets.get(budget.id)
            if (existing) continue
          }

          await db.budgets.add({
            ...budget,
            startDate: new Date(budget.startDate),
            createdAt: new Date(budget.createdAt),
            updatedAt: new Date(budget.updatedAt),
          })
          budgetsRestored++
        }

        // Restore recurring bills
        for (const bill of recurringBills) {
          if (skipDuplicates && bill.id) {
            const existing = await db.recurringBills.get(bill.id)
            if (existing) continue
          }

          await db.recurringBills.add({
            ...bill,
            nextDueDate: new Date(bill.nextDueDate),
            ...(bill.lastPaidDate ? { lastPaidDate: new Date(bill.lastPaidDate) } : {}),
            createdAt: new Date(bill.createdAt),
            updatedAt: new Date(bill.updatedAt),
          })
          recurringBillsRestored++
        }

        // Restore subscriptions
        for (const subscription of subscriptions) {
          if (skipDuplicates && subscription.id) {
            const existing = await db.subscriptions.get(subscription.id)
            if (existing) continue
          }

          await db.subscriptions.add({
            ...subscription,
            nextBillingDate: new Date(subscription.nextBillingDate),
            startDate: new Date(subscription.startDate),
            createdAt: new Date(subscription.createdAt),
            updatedAt: new Date(subscription.updatedAt),
          })
          subscriptionsRestored++
        }

        // Restore settings
        for (const setting of settings) {
          if (skipDuplicates && setting.id) {
            const existing = await db.settings.get(setting.id)
            if (existing) continue
          }

          await db.settings.add({
            ...setting,
            updatedAt: new Date(setting.updatedAt),
          })
          settingsRestored++
        }

        // Restore saved e-receipts
        for (const receipt of savedEReceipts) {
          if (skipDuplicates && receipt.id) {
            const existing = await db.savedEReceipts.get(receipt.id)
            if (existing) continue
          }

          await db.savedEReceipts.add({
            ...receipt,
            scannedAt: new Date(receipt.scannedAt),
          })
          savedEReceiptsRestored++
        }
      }
    )

    logger.info('Backup restored successfully', {
      receiptsRestored,
      devicesRestored,
      householdBillsRestored,
      documentsRestored,
      remindersRestored,
      tagsRestored,
      budgetsRestored,
      recurringBillsRestored,
      subscriptionsRestored,
      settingsRestored,
      savedEReceiptsRestored,
    })

    return {
      receiptsRestored,
      devicesRestored,
      householdBillsRestored,
      documentsRestored,
      remindersRestored,
      tagsRestored,
      budgetsRestored,
      recurringBillsRestored,
      subscriptionsRestored,
      settingsRestored,
      savedEReceiptsRestored,
    }
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
      } catch (_error) {
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

  if (backupData.data?.documents && !Array.isArray(backupData.data.documents)) {
    errors.push('Invalid documents data')
  }

  if (backupData.data?.reminders && !Array.isArray(backupData.data.reminders)) {
    errors.push('Invalid reminders data')
  }

  if (backupData.data?.tags && !Array.isArray(backupData.data.tags)) {
    errors.push('Invalid tags data')
  }

  if (backupData.data?.budgets && !Array.isArray(backupData.data.budgets)) {
    errors.push('Invalid budgets data')
  }

  if (backupData.data?.recurringBills && !Array.isArray(backupData.data.recurringBills)) {
    errors.push('Invalid recurring bills data')
  }

  if (backupData.data?.subscriptions && !Array.isArray(backupData.data.subscriptions)) {
    errors.push('Invalid subscriptions data')
  }

  if (backupData.data?.settings && !Array.isArray(backupData.data.settings)) {
    errors.push('Invalid settings data')
  }

  if (backupData.data?.savedEReceipts && !Array.isArray(backupData.data.savedEReceipts)) {
    errors.push('Invalid saved e-receipts data')
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
    // Google Drive OAuth integration is not yet available
    // This is a placeholder for future implementation
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
    // Dropbox OAuth integration is not yet available
    // This is a placeholder for future implementation
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
