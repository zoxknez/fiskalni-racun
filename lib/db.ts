// lib/db.ts

import type {
  HouseholdBillStatus,
  HouseholdBillType,
  HouseholdConsumptionUnit,
} from '@lib/household'
import Dexie, { type Table } from 'dexie'
import { z } from 'zod'
import { syncLogger } from '@/lib/logger'
import { syncBatchToNeon, syncToNeon, warmUpDatabase } from '@/lib/neonSync'
import { generateId } from '@/lib/uuid'
import { cancelDeviceReminders, scheduleWarrantyReminders } from './notifications'

// ────────────────────────────────
// Tipovi
// ────────────────────────────────
export interface ReceiptItem {
  name: string
  quantity: number
  price: number
  total: number
}

export interface Receipt {
  id?: string
  merchantName: string
  pib: string
  date: Date
  time: string
  totalAmount: number
  vatAmount?: number
  items?: ReceiptItem[]
  category: string
  tags?: string[] // Custom tags: 'posao', 'putovanje', etc.
  notes?: string
  qrLink?: string
  imageUrl?: string
  pdfUrl?: string
  createdAt: Date
  updatedAt: Date
  syncStatus: 'synced' | 'pending' | 'error'
}

export interface HouseholdConsumption {
  value: number
  unit: HouseholdConsumptionUnit
}

export interface HouseholdBill {
  id?: string
  billType: HouseholdBillType
  provider: string
  accountNumber?: string
  amount: number
  billingPeriodStart: Date
  billingPeriodEnd: Date
  dueDate: Date
  paymentDate?: Date
  status: HouseholdBillStatus
  consumption?: HouseholdConsumption
  notes?: string
  createdAt: Date
  updatedAt: Date
  syncStatus: 'synced' | 'pending' | 'error'
}

export interface Device {
  id?: string
  receiptId?: string
  brand: string
  model: string
  category: string
  serialNumber?: string
  imageUrl?: string
  purchaseDate: Date
  warrantyDuration: number // months
  warrantyExpiry: Date
  warrantyTerms?: string
  status: 'active' | 'expired' | 'in-service'
  serviceCenterName?: string
  serviceCenterAddress?: string
  serviceCenterPhone?: string
  serviceCenterHours?: string
  attachments?: string[]
  tags?: string[] // User-defined tags
  // NOTE: kept for backward-compat; authoritative reminders live in reminders table
  reminders: Reminder[]
  createdAt: Date
  updatedAt: Date
  syncStatus: 'synced' | 'pending' | 'error'
}

export interface Reminder {
  id?: string
  deviceId: string
  type: 'warranty' // extensible: 'service' | 'maintenance'
  daysBeforeExpiry: number
  status: 'pending' | 'sent' | 'dismissed'
  sentAt?: Date
  createdAt: Date
}

export interface Tag {
  id?: string
  name: string
  color: string // hex color e.g. '#3B82F6'
  createdAt: Date
  updatedAt: Date
}

export type BudgetPeriod = 'weekly' | 'monthly' | 'yearly'

export interface Budget {
  id?: string
  name: string
  amount: number // Target budget amount
  period: BudgetPeriod
  category?: string // Optional: limit to specific category
  startDate: Date // When budget tracking started
  isActive: boolean
  color: string // For visual display
  createdAt: Date
  updatedAt: Date
}

// Recurring bill frequency options
export type RecurringFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export interface RecurringBill {
  id?: string
  name: string
  amount: number
  category: string // 'electricity' | 'water' | 'internet' | 'phone' | 'subscription' | 'rent' | 'insurance' | 'other'
  frequency: RecurringFrequency
  nextDueDate: Date
  lastPaidDate?: Date
  reminderDays: number // days before due to remind (default: 3)
  isPaused: boolean
  notes?: string
  createdAt: Date
  updatedAt: Date
}

// ────────────────────────────────
// Subscriptions (Pretplate)
// ────────────────────────────────
export type SubscriptionBillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export type SubscriptionCategory =
  | 'streaming'
  | 'music'
  | 'gaming'
  | 'fitness'
  | 'software'
  | 'news'
  | 'cloud'
  | 'education'
  | 'other'

export interface Subscription {
  id?: string
  name: string
  provider: string // Netflix, Spotify, etc.
  category: SubscriptionCategory
  amount: number
  billingCycle: SubscriptionBillingCycle
  nextBillingDate: Date
  startDate: Date
  cancelUrl?: string // URL to cancel subscription
  loginUrl?: string // URL to login/manage
  notes?: string
  isActive: boolean
  reminderDays: number // days before billing to remind (default: 3)
  logoUrl?: string // Optional logo URL
  createdAt: Date
  updatedAt: Date
}

export interface UserSettings {
  id?: string
  userId: string
  theme: 'light' | 'dark' | 'system'
  language: 'sr' | 'en' | 'hr' | 'sl'
  notificationsEnabled: boolean
  emailNotifications: boolean
  pushNotifications: boolean
  biometricLock: boolean
  warrantyExpiryThreshold: number // days before expiry to show warnings (default: 30)
  warrantyCriticalThreshold: number // days before expiry to show critical alerts (default: 7)
  quietHoursStart: string // HH:mm
  quietHoursEnd: string // HH:mm
  updatedAt: Date
}

export type DocumentType =
  | 'id_card'
  | 'passport'
  | 'driver_license'
  | 'vehicle_registration'
  | 'registration_date'
  | 'health_insurance'
  | 'other'

export interface Document {
  id?: string
  type: DocumentType
  name: string
  fileUrl: string
  thumbnailUrl?: string
  expiryDate?: Date
  expiryReminderDays?: number // days before expiry to show reminder (default: 30)
  notes?: string
  tags?: string[] // User-defined tags
  createdAt: Date
  updatedAt: Date
  syncStatus: 'synced' | 'pending' | 'error'
}

export interface SavedEReceipt {
  id?: string
  url: string
  merchantName?: string
  scannedAt: Date
  notes?: string
}

export interface SyncQueue {
  id?: number // Local queue ID can remain number (auto-increment)
  entityType: 'receipt' | 'device' | 'reminder' | 'document' | 'householdBill' | 'subscription'
  entityId: string
  operation: 'create' | 'update' | 'delete'
  data: unknown
  retryCount: number
  lastError?: string
  createdAt: Date
}

// ────────────────────────────────
export class FiskalniRacunDB extends Dexie {
  receipts!: Table<Receipt, string>
  devices!: Table<Device, string>
  reminders!: Table<Reminder, string>
  householdBills!: Table<HouseholdBill, string>
  documents!: Table<Document, string>
  savedEReceipts!: Table<SavedEReceipt, string>
  tags!: Table<Tag, string>
  budgets!: Table<Budget, string>
  recurringBills!: Table<RecurringBill, string>
  subscriptions!: Table<Subscription, string>
  settings!: Table<UserSettings, string>
  syncQueue!: Table<SyncQueue, number>
  _migrations!: Table<
    { version: number; name: string; description: string; appliedAt: Date },
    number
  >

  constructor() {
    super('FiskalniRacunDB')

    // v1 — New Schema with UUIDs
    this.version(1).stores({
      receipts:
        'id, merchantName, pib, date, createdAt, category, totalAmount, syncStatus, qrLink, *tags',
      devices:
        'id, receiptId, [status+warrantyExpiry], warrantyExpiry, brand, model, category, createdAt, syncStatus',
      reminders: 'id, deviceId, [deviceId+type], status, createdAt',
      documents: 'id, type, expiryDate, createdAt, syncStatus',
      householdBills: 'id, billType, provider, dueDate, status, syncStatus, createdAt',
      settings: 'id, &userId, updatedAt',
      syncQueue: '++id, entityType, entityId, operation, createdAt',
      _migrations: '++id, version, name, appliedAt',
    })

    // v2 — Add tags table and tags field to devices/documents
    this.version(2).stores({
      tags: 'id, &name, createdAt',
      devices:
        'id, receiptId, [status+warrantyExpiry], warrantyExpiry, brand, model, category, createdAt, syncStatus, *tags',
      documents: 'id, type, expiryDate, createdAt, syncStatus, *tags',
    })

    // v3 — Add budgets table
    this.version(3).stores({
      budgets: 'id, name, period, category, isActive, createdAt',
    })

    // v4 — Add recurringBills table
    this.version(4).stores({
      recurringBills: 'id, name, category, frequency, nextDueDate, isPaused, createdAt',
    })

    // v5 — Add subscriptions table
    this.version(5).stores({
      subscriptions:
        'id, name, provider, category, billingCycle, nextBillingDate, isActive, createdAt',
    })

    // v6 — Add saved e-receipts table
    this.version(6).stores({
      savedEReceipts: 'id, url, scannedAt, merchantName',
    })

    // Hooks: timestamp, default syncStatus, calculation
    this.receipts.hook('creating', (pk, obj) => {
      obj.id = pk || obj.id || generateId()
      const now = new Date()
      obj.createdAt = obj.createdAt ?? now
      obj.updatedAt = obj.updatedAt ?? now
      obj.syncStatus = obj.syncStatus ?? 'pending'
      obj.totalAmount = coerceAmount(obj.totalAmount)
    })
    this.receipts.hook('updating', (mods) => {
      const m = mods as Partial<Receipt>
      if (m.syncStatus === 'synced' || m.syncStatus === 'error') {
        return mods
      }
      m.updatedAt = new Date()
      m.syncStatus = 'pending'
      if ('totalAmount' in mods && typeof mods.totalAmount === 'number') {
        m.totalAmount = coerceAmount(mods.totalAmount)
      }
      return mods
    })

    this.devices.hook('creating', (pk, obj) => {
      obj.id = pk || obj.id || generateId()
      const now = new Date()
      obj.createdAt = obj.createdAt ?? now
      obj.updatedAt = obj.updatedAt ?? now
      obj.syncStatus = obj.syncStatus ?? 'pending'
      obj.warrantyDuration = Math.max(0, Math.floor(obj.warrantyDuration))
      if (!obj.warrantyExpiry && obj.purchaseDate && obj.warrantyDuration >= 0) {
        obj.warrantyExpiry = computeWarrantyExpiry(obj.purchaseDate, obj.warrantyDuration)
      }
      if (obj.status !== 'in-service') {
        obj.status = computeWarrantyStatus(obj.warrantyExpiry)
      }
      obj.reminders = obj.reminders ?? []
    })
    this.devices.hook('updating', (mods, _pk, current) => {
      const m = mods as Partial<Device>
      if (m.syncStatus === 'synced' || m.syncStatus === 'error') {
        return mods
      }
      const next = { ...current, ...mods } as Device
      const changedExpiryRelevant =
        'purchaseDate' in mods || 'warrantyDuration' in mods || 'warrantyExpiry' in mods
      if (changedExpiryRelevant) {
        const expiry =
          next.warrantyExpiry || computeWarrantyExpiry(next.purchaseDate, next.warrantyDuration)
        m.warrantyExpiry = expiry
        if (next.status !== 'in-service' && m.status !== 'in-service') {
          m.status = computeWarrantyStatus(expiry)
        }
      }
      m.updatedAt = new Date()
      m.syncStatus = 'pending'
      return mods
    })

    this.documents.hook('creating', (pk, obj) => {
      obj.id = pk || obj.id || generateId()
      const now = new Date()
      obj.createdAt = obj.createdAt ?? now
      obj.updatedAt = obj.updatedAt ?? now
      obj.syncStatus = obj.syncStatus ?? 'pending'
      obj.expiryReminderDays = obj.expiryReminderDays ?? 30
    })
    this.documents.hook('updating', (mods) => {
      const m = mods as Partial<Document>
      if (m.syncStatus === 'synced' || m.syncStatus === 'error') {
        return mods
      }
      m.updatedAt = new Date()
      m.syncStatus = 'pending'
      return mods
    })

    this.householdBills.hook('creating', (pk, obj) => {
      obj.id = pk || obj.id || generateId()
      const now = new Date()
      obj.createdAt = obj.createdAt ?? now
      obj.updatedAt = obj.updatedAt ?? now
      obj.syncStatus = obj.syncStatus ?? 'pending'
      obj.amount = coerceAmount(obj.amount)
    })
    this.householdBills.hook('updating', (mods) => {
      const m = mods as Partial<HouseholdBill>
      if (m.syncStatus === 'synced' || m.syncStatus === 'error') {
        return mods
      }
      m.updatedAt = new Date()
      m.syncStatus = 'pending'
      if ('amount' in mods && typeof mods.amount === 'number') {
        m.amount = coerceAmount(mods.amount)
      }
      return mods
    })

    this.reminders.hook('creating', (pk, obj) => {
      obj.id = pk || obj.id || generateId()
      obj.createdAt = obj.createdAt ?? new Date()
    })

    this.settings.hook('creating', (pk, obj) => {
      obj.id = pk || obj.id || generateId()
    })

    this.tags.hook('creating', (pk, obj) => {
      obj.id = pk || obj.id || generateId()
      const now = new Date()
      obj.createdAt = obj.createdAt ?? now
      obj.updatedAt = now
    })
    this.tags.hook('updating', (mods) => {
      ;(mods as Partial<Tag>).updatedAt = new Date()
      return mods
    })

    this.budgets.hook('creating', (pk, obj) => {
      obj.id = pk || obj.id || generateId()
      const now = new Date()
      obj.createdAt = obj.createdAt ?? now
      obj.updatedAt = now
      obj.amount = coerceAmount(obj.amount)
      obj.isActive = obj.isActive ?? true
    })
    this.budgets.hook('updating', (mods) => {
      ;(mods as Partial<Budget>).updatedAt = new Date()
      if ('amount' in mods && typeof mods.amount === 'number') {
        ;(mods as Partial<Budget>).amount = coerceAmount(mods.amount)
      }
      return mods
    })
  }
}

export const db = new FiskalniRacunDB()

// ────────────────────────────────
// Util funkcije (lokalne)
// ────────────────────────────────
function computeWarrantyExpiry(purchaseDate: Date, months: number): Date {
  const d = new Date(purchaseDate)
  d.setMonth(d.getMonth() + months)
  return d
}

function computeWarrantyStatus(expiry: Date): Device['status'] {
  return expiry && expiry.getTime() >= Date.now() ? 'active' : 'expired'
}

function coerceAmount(value: number): number {
  const n = Number.isFinite(value) ? value : 0
  return Math.round(n * 100) / 100
}

function normalizeLanguage(lng: string | undefined): 'sr' | 'en' | 'hr' | 'sl' {
  if (!lng) return 'sr'
  const low = lng.toLowerCase()
  if (low.startsWith('sr')) return 'sr'
  if (low.startsWith('hr')) return 'hr'
  if (low.startsWith('sl')) return 'sl'
  if (low.startsWith('en')) return 'en'
  return 'sr'
}

async function enqueueSync(
  entityType: SyncQueue['entityType'],
  entityId: string,
  operation: SyncQueue['operation'],
  data: unknown
) {
  await db.syncQueue.add({
    entityType,
    entityId,
    operation,
    data,
    retryCount: 0,
    createdAt: new Date(),
  })
}

// ────────────────────────────────
// Receipt helpers
// ────────────────────────────────
export async function addReceipt(
  receipt: Omit<Receipt, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>
): Promise<string> {
  const id = generateId()
  const payload: Receipt = {
    ...receipt,
    id,
    totalAmount: coerceAmount(receipt.totalAmount),
    createdAt: new Date(),
    updatedAt: new Date(),
    syncStatus: 'pending',
  }

  await db.transaction('rw', db.receipts, db.syncQueue, async () => {
    await db.receipts.add(payload)
    await enqueueSync('receipt', id, 'create', { ...receipt })
  })
  return id
}

export async function updateReceipt(id: string, updates: Partial<Receipt>): Promise<void> {
  await db.transaction('rw', db.receipts, db.syncQueue, async () => {
    const patch: Partial<Receipt> = {
      ...updates,
      ...(typeof updates.totalAmount === 'number'
        ? { totalAmount: coerceAmount(updates.totalAmount) }
        : {}),
      updatedAt: new Date(),
      syncStatus: 'pending',
    }
    await db.receipts.update(id, patch)
    const full = await db.receipts.get(id)
    if (full) await enqueueSync('receipt', id, 'update', full)
  })
}

export async function deleteReceipt(id: string): Promise<void> {
  await db.transaction('rw', db.receipts, db.devices, db.reminders, db.syncQueue, async () => {
    const deviceIds = await db.devices.where('receiptId').equals(id).primaryKeys()
    await db.devices.where('receiptId').equals(id).delete()
    await db.receipts.delete(id)
    await enqueueSync('receipt', id, 'delete', { id })
    for (const did of deviceIds) {
      await enqueueSync('device', String(did), 'delete', { id: did })
    }
  })
}

// ────────────────────────────────
// Household bill helpers
// ────────────────────────────────
export async function addHouseholdBill(
  bill: Omit<HouseholdBill, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>
): Promise<string> {
  const id = generateId()
  const payload: HouseholdBill = {
    ...bill,
    id,
    amount: coerceAmount(bill.amount),
    createdAt: new Date(),
    updatedAt: new Date(),
    syncStatus: 'pending',
  }

  await db.transaction('rw', db.householdBills, db.syncQueue, async () => {
    await db.householdBills.add(payload)
    await enqueueSync('householdBill', id, 'create', payload)
  })

  return id
}

export async function updateHouseholdBill(
  id: string,
  updates: Partial<HouseholdBill>
): Promise<void> {
  await db.transaction('rw', db.householdBills, db.syncQueue, async () => {
    const patch: Partial<HouseholdBill> = {
      ...updates,
      ...(typeof updates.amount === 'number' ? { amount: coerceAmount(updates.amount) } : {}),
      updatedAt: new Date(),
      syncStatus: 'pending',
    }

    await db.householdBills.update(id, patch)
    const full = await db.householdBills.get(id)
    if (full) await enqueueSync('householdBill', id, 'update', full)
  })
}

export async function deleteHouseholdBill(id: string): Promise<void> {
  await db.transaction('rw', db.householdBills, db.syncQueue, async () => {
    await db.householdBills.delete(id)
    await enqueueSync('householdBill', id, 'delete', { id })
  })
}

// ────────────────────────────────
// Device helpers
// ────────────────────────────────
export async function addDevice(
  device: Omit<
    Device,
    'id' | 'createdAt' | 'updatedAt' | 'syncStatus' | 'warrantyExpiry' | 'status'
  > & {
    warrantyExpiry?: Date
    status?: Device['status']
  }
): Promise<string> {
  const now = new Date()
  const expiry =
    device.warrantyExpiry ??
    computeWarrantyExpiry(device.purchaseDate, Math.max(0, Math.floor(device.warrantyDuration)))
  const status = device.status ?? computeWarrantyStatus(expiry)
  const id = generateId()

  let createdSnapshot: Device | null = null
  await db.transaction('rw', db.devices, db.syncQueue, async () => {
    const payload = {
      ...device,
      id,
      warrantyExpiry: expiry,
      status,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
      reminders: device.reminders ?? [],
    } as Device
    await db.devices.add(payload)
    createdSnapshot = payload
    await enqueueSync('device', id, 'create', { ...device, warrantyExpiry: expiry, status })
  })

  if (createdSnapshot) scheduleWarrantyReminders(createdSnapshot)
  return id
}

export async function updateDevice(
  id: string,
  updates: Partial<Device>,
  reminderDays?: number[]
): Promise<void> {
  let nextSnapshot: Device | null = null
  await db.transaction('rw', db.devices, db.syncQueue, async () => {
    const existing = await db.devices.get(id)
    if (!existing) return

    let warrantyExpiry = updates.warrantyExpiry ?? existing.warrantyExpiry
    if ('purchaseDate' in updates || 'warrantyDuration' in updates) {
      warrantyExpiry = computeWarrantyExpiry(
        updates.purchaseDate ?? existing.purchaseDate,
        Math.max(0, Math.floor(updates.warrantyDuration ?? existing.warrantyDuration))
      )
      updates.warrantyExpiry = warrantyExpiry
    }

    if (existing.status !== 'in-service' && updates.status !== 'in-service') {
      updates.status = computeWarrantyStatus(warrantyExpiry)
    }

    const payload: Partial<Device> = {
      ...updates,
      updatedAt: new Date(),
      syncStatus: 'pending',
    }

    await db.devices.update(id, payload)
    nextSnapshot = { ...existing, ...payload } as Device
    await enqueueSync('device', id, 'update', nextSnapshot)
  })

  if (nextSnapshot) {
    cancelDeviceReminders(id)
    scheduleWarrantyReminders(nextSnapshot, reminderDays)
  }
}

export async function deleteDevice(id: string): Promise<void> {
  await db.transaction('rw', db.devices, db.reminders, db.syncQueue, async () => {
    cancelDeviceReminders(id)
    await db.reminders.where('deviceId').equals(id).delete()
    await db.devices.delete(id)
    await enqueueSync('device', id, 'delete', { id })
  })
}

// ────────────────────────────────
// Reminder helpers
// ────────────────────────────────
export async function addReminder(reminder: Omit<Reminder, 'id' | 'createdAt'>) {
  const id = generateId()
  const payload = { ...reminder, id, createdAt: new Date() }
  await db.transaction('rw', db.reminders, db.syncQueue, async () => {
    await db.reminders.add(payload)
    await enqueueSync('reminder', id, 'create', payload)
  })
  return id
}

// ────────────────────────────────
// Document helpers
// ────────────────────────────────
export async function addDocument(
  doc: Omit<Document, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>
): Promise<string> {
  const id = generateId()
  const payload: Document = {
    ...doc,
    id,
    createdAt: new Date(),
    updatedAt: new Date(),
    syncStatus: 'pending',
  }
  await db.transaction('rw', db.documents, db.syncQueue, async () => {
    await db.documents.add(payload)
    await enqueueSync('document', id, 'create', payload)
  })
  return id
}

export async function updateDocument(
  id: string,
  updates: Partial<Omit<Document, 'id' | 'createdAt'>>
): Promise<void> {
  await db.transaction('rw', db.documents, db.syncQueue, async () => {
    await db.documents.update(id, updates)
    const doc = await db.documents.get(id)
    if (doc) {
      await enqueueSync('document', id, 'update', doc)
    }
  })
}

export async function deleteDocument(id: string): Promise<void> {
  await db.transaction('rw', db.documents, db.syncQueue, async () => {
    await db.documents.delete(id)
    await enqueueSync('document', id, 'delete', { id })
  })
}

// ────────────────────────────────
// Settings helpers
// ────────────────────────────────
export async function upsertSettings(userId: string, partial: Partial<UserSettings>) {
  const existing = await db.settings.where('userId').equals(userId).first()
  const updated: UserSettings = {
    userId,
    theme: partial.theme ?? existing?.theme ?? 'system',
    language: normalizeLanguage(partial.language ?? existing?.language ?? 'sr'),
    notificationsEnabled: partial.notificationsEnabled ?? existing?.notificationsEnabled ?? true,
    emailNotifications: partial.emailNotifications ?? existing?.emailNotifications ?? true,
    pushNotifications: partial.pushNotifications ?? existing?.pushNotifications ?? true,
    biometricLock: partial.biometricLock ?? existing?.biometricLock ?? false,
    warrantyExpiryThreshold:
      partial.warrantyExpiryThreshold ?? existing?.warrantyExpiryThreshold ?? 30,
    warrantyCriticalThreshold:
      partial.warrantyCriticalThreshold ?? existing?.warrantyCriticalThreshold ?? 7,
    quietHoursStart: partial.quietHoursStart ?? existing?.quietHoursStart ?? '22:00',
    quietHoursEnd: partial.quietHoursEnd ?? existing?.quietHoursEnd ?? '07:30',
    updatedAt: new Date(),
  }

  if (existing?.id) {
    updated.id = existing.id
    await db.settings.update(existing.id, updated)
  } else {
    updated.id = generateId()
    await db.settings.add(updated)
  }
  return updated
}

export async function getSettings(userId: string) {
  return await db.settings.where('userId').equals(userId).first()
}

// ────────────────────────────────
// Query helpers (za UI)
// ────────────────────────────────
export async function getDevicesByWarrantyStatus(daysThreshold = 30): Promise<Device[]> {
  const now = new Date()
  const threshold = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000)
  return await db.devices
    .where('[status+warrantyExpiry]')
    .between(['active', now], ['active', threshold], true, true)
    .toArray()
}

export async function getRecentReceipts(limit = 5): Promise<Receipt[]> {
  return await db.receipts.orderBy('createdAt').reverse().limit(limit).toArray()
}

export async function getMonthlySpending(year: number, monthIndex0: number) {
  const from = new Date(year, monthIndex0, 1)
  const to = new Date(year, monthIndex0 + 1, 1)
  const rows = await db.receipts.where('date').between(from, to, true, false).toArray()
  const total = rows.reduce((s, r) => s + (r.totalAmount || 0), 0)
  return { total, count: rows.length }
}

export async function markSynced(
  entity: 'receipt' | 'device' | 'householdBill' | 'document' | 'subscription',
  id: string
) {
  const tableMap = {
    receipt: db.receipts,
    device: db.devices,
    householdBill: db.householdBills,
    document: db.documents,
    subscription: db.subscriptions,
  } as const
  const table = tableMap[entity]
  if (table) {
    await table.update(id, { syncStatus: 'synced' } as never)
  }
}

// ────────────────────────────────
// Advanced search & filter
// ────────────────────────────────
export async function searchReceipts(query: string): Promise<Receipt[]> {
  const lowerQuery = query.toLowerCase()
  return await db.receipts
    .filter((receipt) => {
      const matchesMerchant = receipt.merchantName.toLowerCase().includes(lowerQuery)
      const matchesPib = receipt.pib?.toLowerCase().includes(lowerQuery) ?? false
      const matchesCategory = receipt.category?.toLowerCase().includes(lowerQuery) ?? false
      const matchesNotes = receipt.notes?.toLowerCase().includes(lowerQuery) ?? false
      return matchesMerchant || matchesPib || matchesCategory || matchesNotes
    })
    .toArray()
}

export async function searchHouseholdBills(query: string): Promise<HouseholdBill[]> {
  const lowerQuery = query.toLowerCase()
  return await db.householdBills
    .filter((bill) => {
      const matchesProvider = bill.provider.toLowerCase().includes(lowerQuery)
      const matchesAccount = bill.accountNumber?.toLowerCase().includes(lowerQuery) ?? false
      const matchesType = bill.billType.toLowerCase().includes(lowerQuery)
      const matchesNotes = bill.notes?.toLowerCase().includes(lowerQuery) ?? false
      return matchesProvider || matchesAccount || matchesType || matchesNotes
    })
    .toArray()
}

export async function searchDevices(query: string): Promise<Device[]> {
  const lowerQuery = query.toLowerCase()
  return await db.devices
    .filter((device) => {
      const matchesBrand = device.brand.toLowerCase().includes(lowerQuery)
      const matchesModel = device.model.toLowerCase().includes(lowerQuery)
      const matchesSerial = device.serialNumber
        ? device.serialNumber.toLowerCase().includes(lowerQuery)
        : false
      const matchesCategory = device.category.toLowerCase().includes(lowerQuery)
      return matchesBrand || matchesModel || matchesSerial || matchesCategory
    })
    .toArray()
}

export async function getReceiptsByCategory(category: string): Promise<Receipt[]> {
  return await db.receipts.where('category').equals(category).toArray()
}

export async function getReceiptsByDateRange(start: Date, end: Date): Promise<Receipt[]> {
  return await db.receipts.where('date').between(start, end, true, true).toArray()
}

export async function getTotalByCategory(): Promise<Record<string, number>> {
  const receipts = await db.receipts.toArray()
  const totals: Record<string, number> = {}
  receipts.forEach((receipt) => {
    totals[receipt.category] = (totals[receipt.category] || 0) + receipt.totalAmount
  })
  return totals
}

// ────────────────────────────────
// Dashboard Statistics
// ────────────────────────────────
export async function getDashboardStats() {
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [monthReceipts, expiringDevices, allDevices, recentReceipts] = await Promise.all([
    getReceiptsByDateRange(firstDayOfMonth, now),
    getDevicesByWarrantyStatus(30),
    db.devices.toArray(),
    getRecentReceipts(5),
  ])

  const monthSpending = monthReceipts.reduce((sum, r) => sum + r.totalAmount, 0)
  const categoryTotals = await getTotalByCategory()

  return {
    monthSpending,
    monthReceiptsCount: monthReceipts.length,
    expiringDevicesCount: expiringDevices.length,
    totalDevicesCount: allDevices.length,
    activeWarranties: allDevices.filter((d) => d.status === 'active').length,
    expiredWarranties: allDevices.filter((d) => d.status === 'expired').length,
    recentReceipts,
    categoryTotals,
    expiringDevices,
  }
}

// ────────────────────────────────
// Sync Queue Management
// ────────────────────────────────
const MAX_RETRY_COUNT = 5
const MAX_AGE_HOURS = 24

let syncPromise: Promise<{ success: number; failed: number; deleted: number }> | null = null

/**
 * Enqueue all items with syncStatus='pending' that are not already in syncQueue.
 * Used after bulk import to prepare items for sync.
 */
export async function enqueuePendingForSync(): Promise<number> {
  let enqueued = 0

  await db.transaction(
    'rw',
    [
      db.receipts,
      db.devices,
      db.householdBills,
      db.documents,
      db.subscriptions,
      db.reminders,
      db.syncQueue,
    ],
    async () => {
      // Get existing syncQueue entityIds to avoid duplicates
      const existingQueue = await db.syncQueue.toArray()
      const existingIds = new Set(existingQueue.map((q) => q.entityId))

      // Enqueue pending receipts
      const pendingReceipts = await db.receipts.where('syncStatus').equals('pending').toArray()
      for (const receipt of pendingReceipts) {
        if (receipt.id && !existingIds.has(receipt.id)) {
          await db.syncQueue.add({
            entityType: 'receipt',
            entityId: receipt.id,
            operation: 'create',
            data: receipt,
            retryCount: 0,
            createdAt: new Date(),
          })
          enqueued++
        }
      }

      // Enqueue pending devices
      const pendingDevices = await db.devices.where('syncStatus').equals('pending').toArray()
      for (const device of pendingDevices) {
        if (device.id && !existingIds.has(device.id)) {
          await db.syncQueue.add({
            entityType: 'device',
            entityId: device.id,
            operation: 'create',
            data: device,
            retryCount: 0,
            createdAt: new Date(),
          })
          enqueued++
        }
      }

      // Enqueue pending household bills
      const pendingBills = await db.householdBills.where('syncStatus').equals('pending').toArray()
      for (const bill of pendingBills) {
        if (bill.id && !existingIds.has(bill.id)) {
          await db.syncQueue.add({
            entityType: 'householdBill',
            entityId: bill.id,
            operation: 'create',
            data: bill,
            retryCount: 0,
            createdAt: new Date(),
          })
          enqueued++
        }
      }

      // Enqueue pending documents
      const pendingDocs = await db.documents.where('syncStatus').equals('pending').toArray()
      for (const doc of pendingDocs) {
        if (doc.id && !existingIds.has(doc.id)) {
          await db.syncQueue.add({
            entityType: 'document',
            entityId: doc.id,
            operation: 'create',
            data: doc,
            retryCount: 0,
            createdAt: new Date(),
          })
          enqueued++
        }
      }

      // Enqueue pending subscriptions (no syncStatus field — only enqueue those not already queued)
      const allSubs = await db.subscriptions.toArray()
      for (const sub of allSubs) {
        if (sub.id && !existingIds.has(sub.id)) {
          await db.syncQueue.add({
            entityType: 'subscription',
            entityId: sub.id,
            operation: 'create',
            data: sub,
            retryCount: 0,
            createdAt: new Date(),
          })
          enqueued++
        }
      }

      // Enqueue reminders (no syncStatus field — only enqueue those not already queued)
      const allReminders = await db.reminders.toArray()
      for (const rem of allReminders) {
        if (rem.id && !existingIds.has(rem.id)) {
          await db.syncQueue.add({
            entityType: 'reminder',
            entityId: rem.id,
            operation: 'create',
            data: rem,
            retryCount: 0,
            createdAt: new Date(),
          })
          enqueued++
        }
      }
    }
  )

  return enqueued
}

export async function getPendingSyncItems(): Promise<SyncQueue[]> {
  const now = Date.now()
  const maxAgeMs = MAX_AGE_HOURS * 60 * 60 * 1000
  const all = await db.syncQueue.orderBy('createdAt').toArray()
  return all.filter(
    (item) =>
      item.retryCount < MAX_RETRY_COUNT && now - new Date(item.createdAt).getTime() <= maxAgeMs
  )
}

export async function processSyncQueue(): Promise<{
  success: number
  failed: number
  deleted: number
}> {
  if (syncPromise) {
    syncLogger.debug('Sync queue already in progress, returning existing promise')
    return syncPromise
  }

  syncPromise = (async () => {
    try {
      const items = await db.syncQueue.toArray()
      let success = 0
      let failed = 0
      let deleted = 0

      if (items.length === 0) {
        return { success: 0, failed: 0, deleted: 0 }
      }

      // Warm up the database before syncing to avoid cold start timeouts
      syncLogger.info('Warming up database connection...')
      const warmupSuccess = await warmUpDatabase()
      if (!warmupSuccess) {
        syncLogger.warn('Database warm-up failed, proceeding with sync anyway')
      }

      const now = Date.now()
      const maxAgeMs = MAX_AGE_HOURS * 60 * 60 * 1000

      // Filter out old items first
      const validItems: SyncQueue[] = []
      for (const item of items) {
        const itemAge = now - new Date(item.createdAt).getTime()
        const shouldDelete = item.retryCount >= MAX_RETRY_COUNT || itemAge > maxAgeMs

        if (shouldDelete) {
          syncLogger.warn('Deleting sync queue item - exceeded retry limit or too old', {
            id: item.id,
            retryCount: item.retryCount,
            age: `${Math.round(itemAge / (60 * 60 * 1000))}h`,
            lastError: item.lastError,
          })
          if (item.id) await db.syncQueue.delete(item.id)
          deleted++
        } else {
          validItems.push(item)
        }
      }

      if (validItems.length === 0) {
        return { success: 0, failed: 0, deleted }
      }

      // Use batch sync for efficiency — send up to 10 items at a time
      const BATCH_SIZE = 10
      const DELAY_MS = 500 // 500ms between batches

      for (let i = 0; i < validItems.length; i += BATCH_SIZE) {
        const batch = validItems.slice(i, i + BATCH_SIZE)

        // Separate delete operations (must use individual endpoint) from create/update (batch)
        const deleteItems = batch.filter((item) => item.operation === 'delete')
        const batchItems = batch.filter((item) => item.operation !== 'delete')

        // Process deletes individually (they don't have data payload for batch)
        for (const item of deleteItems) {
          try {
            await syncToNeon(item)
            success++
            if (item.id) await db.syncQueue.delete(item.id)
          } catch (error) {
            failed++
            if (item.id) {
              await db.syncQueue.update(item.id, {
                retryCount: item.retryCount + 1,
                lastError: error instanceof Error ? error.message : 'Unknown error',
              })
            }
          }
        }

        // Process create/update items in batch
        if (batchItems.length > 0) {
          try {
            const batchResult = await syncBatchToNeon(batchItems)

            if (batchResult.failed === 0) {
              // All items succeeded — mark them all as synced
              for (const item of batchItems) {
                success++
                if (item.id) await db.syncQueue.delete(item.id)

                // Mark local entity as synced
                if (
                  item.entityType === 'receipt' ||
                  item.entityType === 'device' ||
                  item.entityType === 'householdBill' ||
                  item.entityType === 'document' ||
                  item.entityType === 'subscription'
                ) {
                  try {
                    await markSynced(item.entityType, item.entityId)
                  } catch (markError) {
                    syncLogger.warn('Unable to mark entity as synced', {
                      entityType: item.entityType,
                      entityId: item.entityId,
                      error: markError,
                    })
                  }
                }
              }
            } else {
              // Some items failed — we don't know which ones, so fall back to individual sync
              syncLogger.warn(
                `Batch had ${batchResult.failed} failures, falling back to individual sync for this batch`
              )
              for (const item of batchItems) {
                try {
                  await syncToNeon(item)
                  success++
                  if (item.id) await db.syncQueue.delete(item.id)

                  if (
                    item.entityType === 'receipt' ||
                    item.entityType === 'device' ||
                    item.entityType === 'householdBill' ||
                    item.entityType === 'document' ||
                    item.entityType === 'subscription'
                  ) {
                    try {
                      await markSynced(item.entityType, item.entityId)
                    } catch (_) {
                      // Ignore mark error
                    }
                  }
                } catch (error) {
                  failed++
                  if (item.id) {
                    await db.syncQueue.update(item.id, {
                      retryCount: item.retryCount + 1,
                      lastError: error instanceof Error ? error.message : 'Unknown error',
                    })
                  }
                }
              }
            }
          } catch (batchError) {
            // If batch endpoint fails, fall back to individual sync
            syncLogger.warn('Batch sync failed, falling back to individual sync:', batchError)
            for (const item of batchItems) {
              try {
                await syncToNeon(item)
                success++
                if (item.id) await db.syncQueue.delete(item.id)

                if (
                  item.entityType === 'receipt' ||
                  item.entityType === 'device' ||
                  item.entityType === 'householdBill' ||
                  item.entityType === 'document' ||
                  item.entityType === 'subscription'
                ) {
                  try {
                    await markSynced(item.entityType, item.entityId)
                  } catch (_) {
                    // Ignore mark error
                  }
                }
              } catch (error) {
                failed++
                if (item.id) {
                  await db.syncQueue.update(item.id, {
                    retryCount: item.retryCount + 1,
                    lastError: error instanceof Error ? error.message : 'Unknown error',
                  })
                }
              }
            }
          }
        }

        // Short delay between batches
        if (i + BATCH_SIZE < validItems.length) {
          await new Promise((resolve) => setTimeout(resolve, DELAY_MS))
        }

        syncLogger.info(
          `Synced batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(validItems.length / BATCH_SIZE)}: ${success} success, ${failed} failed`
        )
      }

      return { success, failed, deleted }
    } catch (error) {
      syncLogger.error('Critical error in processSyncQueue:', error)
      throw error
    }
  })()

  try {
    return await syncPromise
  } catch (error) {
    syncLogger.error('processSyncQueue failed:', error)
    throw error
  } finally {
    syncPromise = null
  }
}

export async function clearSyncQueue(): Promise<void> {
  await db.syncQueue.clear()
}

/**
 * Enqueue ALL local data for sync.
 * This is used when data exists locally but was never synced to server.
 * It adds all receipts, devices, householdBills, documents, and subscriptions to the syncQueue.
 */
export async function enqueueAllLocalData(): Promise<{
  receipts: number
  devices: number
  householdBills: number
  documents: number
  subscriptions: number
  reminders: number
}> {
  syncLogger.info('Enqueuing all local data for sync...')

  // Get all local data
  const [receipts, devices, householdBills, documents, subscriptions, reminders] =
    await Promise.all([
      db.receipts.toArray(),
      db.devices.toArray(),
      db.householdBills.toArray(),
      db.documents.toArray(),
      db.subscriptions.toArray(),
      db.reminders.toArray(),
    ])

  syncLogger.info('Local data counts:', {
    receipts: receipts.length,
    devices: devices.length,
    householdBills: householdBills.length,
    documents: documents.length,
    subscriptions: subscriptions.length,
    reminders: reminders.length,
  })

  // Clear existing queue first to avoid duplicates
  await db.syncQueue.clear()

  const now = new Date()

  // Add all items to sync queue
  await db.transaction('rw', db.syncQueue, async () => {
    // Receipts
    for (const receipt of receipts) {
      if (receipt.id) {
        await db.syncQueue.add({
          entityType: 'receipt',
          entityId: receipt.id,
          operation: 'create',
          data: {
            merchantName: receipt.merchantName,
            pib: receipt.pib,
            date: receipt.date,
            time: receipt.time,
            totalAmount: receipt.totalAmount,
            vatAmount: receipt.vatAmount,
            items: receipt.items,
            category: receipt.category,
            tags: receipt.tags,
            notes: receipt.notes,
            qrLink: receipt.qrLink,
            imageUrl: receipt.imageUrl,
            pdfUrl: receipt.pdfUrl,
            createdAt: receipt.createdAt,
            updatedAt: receipt.updatedAt,
          },
          retryCount: 0,
          createdAt: now,
        })
      }
    }

    // Devices
    for (const device of devices) {
      if (device.id) {
        await db.syncQueue.add({
          entityType: 'device',
          entityId: device.id,
          operation: 'create',
          data: {
            receiptId: device.receiptId,
            brand: device.brand,
            model: device.model,
            category: device.category,
            serialNumber: device.serialNumber,
            imageUrl: device.imageUrl,
            purchaseDate: device.purchaseDate,
            warrantyDuration: device.warrantyDuration,
            warrantyExpiry: device.warrantyExpiry,
            warrantyTerms: device.warrantyTerms,
            status: device.status,
            serviceCenterName: device.serviceCenterName,
            serviceCenterAddress: device.serviceCenterAddress,
            serviceCenterPhone: device.serviceCenterPhone,
            serviceCenterHours: device.serviceCenterHours,
            attachments: device.attachments,
            tags: device.tags,
            createdAt: device.createdAt,
            updatedAt: device.updatedAt,
          },
          retryCount: 0,
          createdAt: now,
        })
      }
    }

    // Household Bills
    for (const bill of householdBills) {
      if (bill.id) {
        await db.syncQueue.add({
          entityType: 'householdBill',
          entityId: bill.id,
          operation: 'create',
          data: {
            billType: bill.billType,
            provider: bill.provider,
            accountNumber: bill.accountNumber,
            amount: bill.amount,
            billingPeriodStart: bill.billingPeriodStart,
            billingPeriodEnd: bill.billingPeriodEnd,
            dueDate: bill.dueDate,
            paymentDate: bill.paymentDate,
            status: bill.status,
            consumption: bill.consumption,
            notes: bill.notes,
            createdAt: bill.createdAt,
            updatedAt: bill.updatedAt,
          },
          retryCount: 0,
          createdAt: now,
        })
      }
    }

    // Documents
    for (const doc of documents) {
      if (doc.id) {
        await db.syncQueue.add({
          entityType: 'document',
          entityId: doc.id,
          operation: 'create',
          data: {
            name: doc.name,
            type: doc.type,
            fileUrl: doc.fileUrl,
            thumbnailUrl: doc.thumbnailUrl,
            tags: doc.tags,
            notes: doc.notes,
            expiryDate: doc.expiryDate,
            expiryReminderDays: doc.expiryReminderDays,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
          },
          retryCount: 0,
          createdAt: now,
        })
      }
    }

    // Subscriptions
    for (const sub of subscriptions) {
      if (sub.id) {
        await db.syncQueue.add({
          entityType: 'subscription',
          entityId: sub.id,
          operation: 'create',
          data: {
            name: sub.name,
            provider: sub.provider,
            amount: sub.amount,
            billingCycle: sub.billingCycle,
            category: sub.category,
            startDate: sub.startDate,
            nextBillingDate: sub.nextBillingDate,
            isActive: sub.isActive,
            notes: sub.notes,
            reminderDays: sub.reminderDays,
            cancelUrl: sub.cancelUrl,
            loginUrl: sub.loginUrl,
            logoUrl: sub.logoUrl,
            createdAt: sub.createdAt,
            updatedAt: sub.updatedAt,
          },
          retryCount: 0,
          createdAt: now,
        })
      }
    }

    // Reminders
    for (const rem of reminders) {
      if (rem.id) {
        await db.syncQueue.add({
          entityType: 'reminder',
          entityId: rem.id,
          operation: 'create',
          data: {
            deviceId: rem.deviceId,
            type: rem.type,
            daysBeforeExpiry: rem.daysBeforeExpiry,
            status: rem.status,
            sentAt: rem.sentAt,
            createdAt: rem.createdAt,
          },
          retryCount: 0,
          createdAt: now,
        })
      }
    }
  })

  const result = {
    receipts: receipts.length,
    devices: devices.length,
    householdBills: householdBills.length,
    documents: documents.length,
    subscriptions: subscriptions.length,
    reminders: reminders.length,
  }

  syncLogger.info('Enqueued all local data:', result)

  return result
}

// ────────────────────────────────
// Tag helpers
// ────────────────────────────────
export async function getAllTags(): Promise<Tag[]> {
  return db.tags.orderBy('name').toArray()
}

export async function addTag(tag: Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const id = generateId()
  const now = new Date()
  await db.tags.add({
    ...tag,
    id,
    createdAt: now,
    updatedAt: now,
  })
  return id
}

export async function updateTag(
  id: string,
  updates: Partial<Pick<Tag, 'name' | 'color'>>
): Promise<void> {
  await db.tags.update(id, {
    ...updates,
    updatedAt: new Date(),
  })
}

export async function deleteTag(id: string): Promise<void> {
  const tag = await db.tags.get(id)
  if (!tag) return

  // Remove tag from all entities that use it
  await db.transaction('rw', [db.tags, db.receipts, db.devices, db.documents], async () => {
    // Remove from receipts
    const receiptsWithTag = await db.receipts.where('tags').equals(tag.name).toArray()
    for (const receipt of receiptsWithTag) {
      if (receipt.id && receipt.tags) {
        await db.receipts.update(receipt.id, {
          tags: receipt.tags.filter((t) => t !== tag.name),
        })
      }
    }

    // Remove from devices
    const devicesWithTag = await db.devices.where('tags').equals(tag.name).toArray()
    for (const device of devicesWithTag) {
      if (device.id && device.tags) {
        await db.devices.update(device.id, {
          tags: device.tags.filter((t) => t !== tag.name),
        })
      }
    }

    // Remove from documents
    const documentsWithTag = await db.documents.where('tags').equals(tag.name).toArray()
    for (const doc of documentsWithTag) {
      if (doc.id && doc.tags) {
        await db.documents.update(doc.id, {
          tags: doc.tags.filter((t) => t !== tag.name),
        })
      }
    }

    await db.tags.delete(id)
  })
}

export async function getTagByName(name: string): Promise<Tag | undefined> {
  return db.tags.where('name').equals(name).first()
}

// ────────────────────────────────
// Budget helpers
// ────────────────────────────────
export async function getAllBudgets(): Promise<Budget[]> {
  return db.budgets.orderBy('createdAt').reverse().toArray()
}

export async function getActiveBudgets(): Promise<Budget[]> {
  return db.budgets.where('isActive').equals(1).toArray()
}

export async function addBudget(
  budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = generateId()
  const now = new Date()
  await db.budgets.add({
    ...budget,
    id,
    createdAt: now,
    updatedAt: now,
  })
  return id
}

export async function updateBudget(
  id: string,
  updates: Partial<Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  await db.budgets.update(id, {
    ...updates,
    updatedAt: new Date(),
  })
}

export async function deleteBudget(id: string): Promise<void> {
  await db.budgets.delete(id)
}

export async function getBudgetById(id: string): Promise<Budget | undefined> {
  return db.budgets.get(id)
}

// ────────────────────────────────
// RecurringBill helpers
// ────────────────────────────────
export async function getAllRecurringBills(): Promise<RecurringBill[]> {
  return db.recurringBills.orderBy('nextDueDate').toArray()
}

export async function getActiveRecurringBills(): Promise<RecurringBill[]> {
  return db.recurringBills.where('isPaused').equals(0).toArray()
}

export async function getUpcomingBills(days: number = 7): Promise<RecurringBill[]> {
  const now = new Date()
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
  return db.recurringBills
    .where('nextDueDate')
    .between(now, futureDate, true, true)
    .and((bill) => !bill.isPaused)
    .toArray()
}

export async function addRecurringBill(
  bill: Omit<RecurringBill, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = generateId()
  const now = new Date()
  await db.recurringBills.add({
    ...bill,
    id,
    createdAt: now,
    updatedAt: now,
  })
  return id
}

export async function updateRecurringBill(
  id: string,
  updates: Partial<Omit<RecurringBill, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  await db.recurringBills.update(id, {
    ...updates,
    updatedAt: new Date(),
  })
}

export async function deleteRecurringBill(id: string): Promise<void> {
  await db.recurringBills.delete(id)
}

export async function markBillAsPaid(id: string): Promise<void> {
  const bill = await db.recurringBills.get(id)
  if (!bill) return

  const now = new Date()
  const nextDue = new Date(bill.nextDueDate)

  // Calculate next due date based on frequency
  switch (bill.frequency) {
    case 'weekly':
      nextDue.setDate(nextDue.getDate() + 7)
      break
    case 'monthly':
      nextDue.setMonth(nextDue.getMonth() + 1)
      break
    case 'quarterly':
      nextDue.setMonth(nextDue.getMonth() + 3)
      break
    case 'yearly':
      nextDue.setFullYear(nextDue.getFullYear() + 1)
      break
  }

  await db.recurringBills.update(id, {
    lastPaidDate: now,
    nextDueDate: nextDue,
    updatedAt: now,
  })
}

// ────────────────────────────────
// Subscriptions CRUD
// ────────────────────────────────
export async function getAllSubscriptions(): Promise<Subscription[]> {
  return db.subscriptions.orderBy('nextBillingDate').toArray()
}

export async function getActiveSubscriptions(): Promise<Subscription[]> {
  return db.subscriptions.where('isActive').equals(1).toArray()
}

export async function getSubscription(id: string): Promise<Subscription | undefined> {
  return db.subscriptions.get(id)
}

export async function addSubscription(
  subscription: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const id = generateId()
  const now = new Date()
  const payload: Subscription = {
    ...subscription,
    id,
    createdAt: now,
    updatedAt: now,
  }

  await db.transaction('rw', db.subscriptions, db.syncQueue, async () => {
    await db.subscriptions.add(payload)
    await enqueueSync('subscription', id, 'create', payload)
  })

  return id
}

export async function updateSubscription(
  id: string,
  updates: Partial<Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  await db.transaction('rw', db.subscriptions, db.syncQueue, async () => {
    await db.subscriptions.update(id, {
      ...updates,
      updatedAt: new Date(),
    })
    const full = await db.subscriptions.get(id)
    if (full) await enqueueSync('subscription', id, 'update', full)
  })
}

export async function deleteSubscription(id: string): Promise<void> {
  await db.transaction('rw', db.subscriptions, db.syncQueue, async () => {
    await db.subscriptions.delete(id)
    await enqueueSync('subscription', id, 'delete', { id })
  })
}

export async function markSubscriptionPaid(id: string): Promise<void> {
  const subscription = await db.subscriptions.get(id)
  if (!subscription) return

  const nextBilling = new Date(subscription.nextBillingDate)

  // Calculate next billing date based on cycle
  switch (subscription.billingCycle) {
    case 'weekly':
      nextBilling.setDate(nextBilling.getDate() + 7)
      break
    case 'monthly':
      nextBilling.setMonth(nextBilling.getMonth() + 1)
      break
    case 'quarterly':
      nextBilling.setMonth(nextBilling.getMonth() + 3)
      break
    case 'yearly':
      nextBilling.setFullYear(nextBilling.getFullYear() + 1)
      break
  }

  await db.transaction('rw', db.subscriptions, db.syncQueue, async () => {
    await db.subscriptions.update(id, {
      nextBillingDate: nextBilling,
      updatedAt: new Date(),
    })
    const full = await db.subscriptions.get(id)
    if (full) await enqueueSync('subscription', id, 'update', full)
  })
}

export async function toggleSubscriptionActive(id: string, isActive: boolean): Promise<void> {
  await db.transaction('rw', db.subscriptions, db.syncQueue, async () => {
    await db.subscriptions.update(id, {
      isActive,
      updatedAt: new Date(),
    })
    const full = await db.subscriptions.get(id)
    if (full) await enqueueSync('subscription', id, 'update', full)
  })
}

// ────────────────────────────────
// Server Data Merge (Pull Sync)
// ────────────────────────────────

export interface MergeResult {
  receipts: { added: number; updated: number; skipped: number }
  devices: { added: number; updated: number; skipped: number }
  householdBills: { added: number; updated: number; skipped: number }
  reminders: { added: number; updated: number; skipped: number }
  documents: { added: number; updated: number; skipped: number }
  subscriptions: { added: number; updated: number; skipped: number }
  settings: boolean
}

export interface ServerData {
  receipts: Record<string, unknown>[]
  devices: Record<string, unknown>[]
  householdBills: Record<string, unknown>[]
  reminders: Record<string, unknown>[]
  documents: Record<string, unknown>[]
  subscriptions: Record<string, unknown>[]
  settings: Record<string, unknown> | null
}

const serverReceiptSchema = z
  .object({
    id: z.string(),
    merchantName: z.string(),
    pib: z.string(),
    date: z.coerce.date(),
    time: z.string(),
    totalAmount: z.coerce.number(),
    category: z.string(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
  })
  .passthrough()

const serverDeviceSchema = z
  .object({
    id: z.string(),
    brand: z.string(),
    model: z.string(),
    category: z.string(),
    purchaseDate: z.coerce.date(),
    warrantyDuration: z.coerce.number(),
    warrantyExpiry: z.coerce.date(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
  })
  .passthrough()

const serverHouseholdBillSchema = z
  .object({
    id: z.string(),
    billType: z.string(),
    provider: z.string(),
    amount: z.coerce.number(),
    billingPeriodStart: z.coerce.date(),
    billingPeriodEnd: z.coerce.date(),
    dueDate: z.coerce.date(),
    status: z.string(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
  })
  .passthrough()

const serverReminderSchema = z
  .object({
    id: z.string(),
    deviceId: z.string(),
    daysBeforeExpiry: z.coerce.number(),
    status: z.string().optional(),
    type: z.string().optional(),
    createdAt: z.coerce.date(),
  })
  .passthrough()

const serverDocumentSchema = z
  .object({
    id: z.string(),
    type: z.string(),
    name: z.string(),
    fileUrl: z.string(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
  })
  .passthrough()

const serverSubscriptionSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    provider: z.string(),
    amount: z.coerce.number(),
    nextBillingDate: z.coerce.date(),
    startDate: z.coerce.date(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
  })
  .passthrough()

const serverSettingsSchema = z
  .object({
    userId: z.string(),
    updatedAt: z.coerce.date(),
  })
  .passthrough()

/**
 * Merge server data into local database.
 * Used when pulling data from server on a new device.
 *
 * Strategy:
 * - If item doesn't exist locally: add it
 * - If item exists locally with syncStatus='synced': skip (already synced)
 * - If item exists locally with syncStatus='pending': keep local (has unsent changes)
 */
export async function mergeServerData(serverData: ServerData): Promise<MergeResult> {
  syncLogger.info('Starting merge with server data:', {
    receipts: serverData.receipts?.length || 0,
    devices: serverData.devices?.length || 0,
    householdBills: serverData.householdBills?.length || 0,
    reminders: serverData.reminders?.length || 0,
    documents: serverData.documents?.length || 0,
    subscriptions: serverData.subscriptions?.length || 0,
  })

  const result: MergeResult = {
    receipts: { added: 0, updated: 0, skipped: 0 },
    devices: { added: 0, updated: 0, skipped: 0 },
    householdBills: { added: 0, updated: 0, skipped: 0 },
    reminders: { added: 0, updated: 0, skipped: 0 },
    documents: { added: 0, updated: 0, skipped: 0 },
    subscriptions: { added: 0, updated: 0, skipped: 0 },
    settings: false,
  }

  await db.transaction(
    'rw',
    [
      db.receipts,
      db.devices,
      db.householdBills,
      db.reminders,
      db.documents,
      db.subscriptions,
      db.syncQueue,
      db.settings,
    ],
    async () => {
      // Merge receipts
      for (const serverReceipt of serverData.receipts || []) {
        const parsed = serverReceiptSchema.safeParse(serverReceipt)
        if (!parsed.success) {
          result.receipts.skipped++
          continue
        }

        const receiptData = parsed.data
        const id = receiptData.id

        const existing = await db.receipts.get(id)
        if (existing) {
          if (existing.syncStatus === 'pending') {
            result.receipts.skipped++
            continue
          }

          const serverUpdatedAt = receiptData.updatedAt.getTime()
          const localUpdatedAt = existing.updatedAt?.getTime?.() ?? 0

          if (serverUpdatedAt > localUpdatedAt) {
            const patch: Partial<Receipt> = {
              merchantName: receiptData.merchantName,
              pib: receiptData.pib,
              date: receiptData.date,
              time: receiptData.time,
              totalAmount: receiptData.totalAmount,
              category: receiptData.category,
              createdAt: receiptData.createdAt,
              updatedAt: receiptData.updatedAt,
              syncStatus: 'synced',
            }
            if (serverReceipt['vatAmount'] !== undefined)
              patch.vatAmount = Number(serverReceipt['vatAmount'])
            if (serverReceipt['items'] !== undefined)
              patch.items = serverReceipt['items'] as ReceiptItem[]
            if (serverReceipt['tags'] !== undefined) patch.tags = serverReceipt['tags'] as string[]
            if (serverReceipt['notes'] !== undefined) patch.notes = serverReceipt['notes'] as string
            if (serverReceipt['qrLink'] !== undefined)
              patch.qrLink = serverReceipt['qrLink'] as string
            if (serverReceipt['imageUrl'] !== undefined)
              patch.imageUrl = serverReceipt['imageUrl'] as string
            if (serverReceipt['pdfUrl'] !== undefined)
              patch.pdfUrl = serverReceipt['pdfUrl'] as string

            await db.receipts.update(id, patch)
            result.receipts.updated++
          } else {
            result.receipts.skipped++
          }
        } else {
          // Build receipt object conditionally to avoid undefined values
          const receipt: Receipt = {
            id,
            merchantName: receiptData.merchantName,
            pib: receiptData.pib,
            date: receiptData.date,
            time: receiptData.time,
            totalAmount: receiptData.totalAmount,
            category: receiptData.category,
            createdAt: receiptData.createdAt,
            updatedAt: receiptData.updatedAt,
            syncStatus: 'synced',
          }
          if (serverReceipt['vatAmount']) receipt.vatAmount = Number(serverReceipt['vatAmount'])
          if (serverReceipt['items']) receipt.items = serverReceipt['items'] as ReceiptItem[]
          if (serverReceipt['tags']) receipt.tags = serverReceipt['tags'] as string[]
          if (serverReceipt['notes']) receipt.notes = serverReceipt['notes'] as string
          if (serverReceipt['qrLink']) receipt.qrLink = serverReceipt['qrLink'] as string
          if (serverReceipt['imageUrl']) receipt.imageUrl = serverReceipt['imageUrl'] as string
          if (serverReceipt['pdfUrl']) receipt.pdfUrl = serverReceipt['pdfUrl'] as string

          await db.receipts.add(receipt)
          result.receipts.added++
        }
      }

      // Merge devices
      for (const serverDevice of serverData.devices || []) {
        const parsed = serverDeviceSchema.safeParse(serverDevice)
        if (!parsed.success) {
          result.devices.skipped++
          continue
        }

        const deviceData = parsed.data
        const id = deviceData.id

        const existing = await db.devices.get(id)
        if (existing) {
          if (existing.syncStatus === 'pending') {
            result.devices.skipped++
            continue
          }

          const serverUpdatedAt = deviceData.updatedAt.getTime()
          const localUpdatedAt = existing.updatedAt?.getTime?.() ?? 0

          if (serverUpdatedAt > localUpdatedAt) {
            const patch: Partial<Device> = {
              brand: deviceData.brand,
              model: deviceData.model,
              category: deviceData.category,
              purchaseDate: deviceData.purchaseDate,
              warrantyDuration: deviceData.warrantyDuration || 0,
              warrantyExpiry: deviceData.warrantyExpiry,
              status: (serverDevice['status'] as Device['status']) || 'active',
              createdAt: deviceData.createdAt,
              updatedAt: deviceData.updatedAt,
              syncStatus: 'synced',
            }
            if (serverDevice['receiptId'] !== undefined)
              patch.receiptId = serverDevice['receiptId'] as string
            if (serverDevice['serialNumber'] !== undefined)
              patch.serialNumber = serverDevice['serialNumber'] as string
            if (serverDevice['imageUrl'] !== undefined)
              patch.imageUrl = serverDevice['imageUrl'] as string
            if (serverDevice['warrantyTerms'] !== undefined)
              patch.warrantyTerms = serverDevice['warrantyTerms'] as string
            if (serverDevice['serviceCenterName'] !== undefined)
              patch.serviceCenterName = serverDevice['serviceCenterName'] as string
            if (serverDevice['serviceCenterAddress'] !== undefined)
              patch.serviceCenterAddress = serverDevice['serviceCenterAddress'] as string
            if (serverDevice['serviceCenterPhone'] !== undefined)
              patch.serviceCenterPhone = serverDevice['serviceCenterPhone'] as string
            if (serverDevice['serviceCenterHours'] !== undefined)
              patch.serviceCenterHours = serverDevice['serviceCenterHours'] as string
            if (serverDevice['attachments'] !== undefined)
              patch.attachments = serverDevice['attachments'] as string[]
            if (serverDevice['tags'] !== undefined) patch.tags = serverDevice['tags'] as string[]

            await db.devices.update(id, patch)
            result.devices.updated++
          } else {
            result.devices.skipped++
          }
        } else {
          const device: Device = {
            id,
            brand: deviceData.brand,
            model: deviceData.model,
            category: deviceData.category,
            purchaseDate: deviceData.purchaseDate,
            warrantyDuration: deviceData.warrantyDuration || 0,
            warrantyExpiry: deviceData.warrantyExpiry,
            status: (serverDevice['status'] as Device['status']) || 'active',
            reminders: [],
            createdAt: deviceData.createdAt,
            updatedAt: deviceData.updatedAt,
            syncStatus: 'synced',
          }
          if (serverDevice['receiptId']) device.receiptId = serverDevice['receiptId'] as string
          if (serverDevice['serialNumber'])
            device.serialNumber = serverDevice['serialNumber'] as string
          if (serverDevice['imageUrl']) device.imageUrl = serverDevice['imageUrl'] as string
          if (serverDevice['warrantyTerms'])
            device.warrantyTerms = serverDevice['warrantyTerms'] as string
          if (serverDevice['serviceCenterName'])
            device.serviceCenterName = serverDevice['serviceCenterName'] as string
          if (serverDevice['serviceCenterAddress'])
            device.serviceCenterAddress = serverDevice['serviceCenterAddress'] as string
          if (serverDevice['serviceCenterPhone'])
            device.serviceCenterPhone = serverDevice['serviceCenterPhone'] as string
          if (serverDevice['serviceCenterHours'])
            device.serviceCenterHours = serverDevice['serviceCenterHours'] as string
          if (serverDevice['attachments'])
            device.attachments = serverDevice['attachments'] as string[]
          if (serverDevice['tags']) device.tags = serverDevice['tags'] as string[]

          await db.devices.add(device)
          result.devices.added++
        }
      }

      // Merge household bills
      for (const serverBill of serverData.householdBills || []) {
        const parsed = serverHouseholdBillSchema.safeParse(serverBill)
        if (!parsed.success) {
          result.householdBills.skipped++
          continue
        }

        const billData = parsed.data
        const id = billData.id

        const existing = await db.householdBills.get(id)
        if (existing) {
          if (existing.syncStatus === 'pending') {
            result.householdBills.skipped++
            continue
          }

          const serverUpdatedAt = billData.updatedAt.getTime()
          const localUpdatedAt = existing.updatedAt?.getTime?.() ?? 0

          if (serverUpdatedAt > localUpdatedAt) {
            const patch: Partial<HouseholdBill> = {
              billType: billData.billType as HouseholdBillType,
              provider: billData.provider,
              amount: billData.amount,
              billingPeriodStart: billData.billingPeriodStart,
              billingPeriodEnd: billData.billingPeriodEnd,
              dueDate: billData.dueDate,
              status: billData.status as HouseholdBillStatus,
              createdAt: billData.createdAt,
              updatedAt: billData.updatedAt,
              syncStatus: 'synced',
            }
            if (serverBill['accountNumber'] !== undefined)
              patch.accountNumber = serverBill['accountNumber'] as string
            if (serverBill['paymentDate'] !== undefined)
              patch.paymentDate = new Date(serverBill['paymentDate'] as string)
            if (serverBill['consumption'] !== undefined)
              patch.consumption = serverBill['consumption'] as HouseholdConsumption
            if (serverBill['notes'] !== undefined) patch.notes = serverBill['notes'] as string

            await db.householdBills.update(id, patch)
            result.householdBills.updated++
          } else {
            result.householdBills.skipped++
          }
        } else {
          const bill: HouseholdBill = {
            id,
            billType: billData.billType as HouseholdBillType,
            provider: billData.provider,
            amount: billData.amount,
            billingPeriodStart: billData.billingPeriodStart,
            billingPeriodEnd: billData.billingPeriodEnd,
            dueDate: billData.dueDate,
            status: billData.status as HouseholdBillStatus,
            createdAt: billData.createdAt,
            updatedAt: billData.updatedAt,
            syncStatus: 'synced',
          }
          if (serverBill['accountNumber'])
            bill.accountNumber = serverBill['accountNumber'] as string
          if (serverBill['paymentDate'])
            bill.paymentDate = new Date(serverBill['paymentDate'] as string)
          if (serverBill['consumption'])
            bill.consumption = serverBill['consumption'] as HouseholdConsumption
          if (serverBill['notes']) bill.notes = serverBill['notes'] as string

          await db.householdBills.add(bill)
          result.householdBills.added++
        }
      }

      // Merge reminders
      for (const serverReminder of serverData.reminders || []) {
        const parsed = serverReminderSchema.safeParse(serverReminder)
        if (!parsed.success) {
          result.reminders.skipped++
          continue
        }

        const reminderData = parsed.data
        const id = reminderData.id

        const existing = await db.reminders.get(id)
        if (!existing) {
          const reminder: Reminder = {
            id,
            deviceId: reminderData.deviceId,
            type: (serverReminder['type'] as Reminder['type']) || 'warranty',
            daysBeforeExpiry: reminderData.daysBeforeExpiry || 30,
            status: (serverReminder['status'] as Reminder['status']) || 'pending',
            createdAt: reminderData.createdAt,
          }
          if (serverReminder['sentAt'])
            reminder.sentAt = new Date(serverReminder['sentAt'] as string)

          await db.reminders.add(reminder)
          result.reminders.added++
        } else {
          // Update if server has newer data (compare by status change or sentAt)
          const serverStatus = (serverReminder['status'] as string) || 'pending'
          const serverSentAt = serverReminder['sentAt'] as string | undefined
          const localSentAt = existing.sentAt?.toISOString() ?? undefined

          if (existing.status !== serverStatus || localSentAt !== serverSentAt) {
            const patch: Partial<Reminder> = {
              type: (serverReminder['type'] as Reminder['type']) || 'warranty',
              daysBeforeExpiry: reminderData.daysBeforeExpiry || 30,
              status: (serverReminder['status'] as Reminder['status']) || 'pending',
            }
            if (serverReminder['sentAt']) {
              patch.sentAt = new Date(serverReminder['sentAt'] as string)
            }
            await db.reminders.update(id, patch)
            result.reminders.updated++
          } else {
            result.reminders.skipped++
          }
        }
      }

      // Merge documents
      for (const serverDoc of serverData.documents || []) {
        const parsed = serverDocumentSchema.safeParse(serverDoc)
        if (!parsed.success) {
          result.documents.skipped++
          continue
        }

        const docData = parsed.data
        const id = docData.id

        const existing = await db.documents.get(id)
        if (existing) {
          if (existing.syncStatus === 'pending') {
            result.documents.skipped++
            continue
          }

          const serverUpdatedAt = docData.updatedAt.getTime()
          const localUpdatedAt = existing.updatedAt?.getTime?.() ?? 0

          if (serverUpdatedAt > localUpdatedAt) {
            const patch: Partial<Document> = {
              type: docData.type as Document['type'],
              name: docData.name,
              fileUrl: docData.fileUrl,
              expiryReminderDays: Number(serverDoc['expiryReminderDays']) || 30,
              createdAt: docData.createdAt,
              updatedAt: docData.updatedAt,
              syncStatus: 'synced',
            }
            if (serverDoc['thumbnailUrl'] !== undefined)
              patch.thumbnailUrl = serverDoc['thumbnailUrl'] as string
            if (serverDoc['expiryDate'] !== undefined)
              patch.expiryDate = new Date(serverDoc['expiryDate'] as string)
            if (serverDoc['notes'] !== undefined) patch.notes = serverDoc['notes'] as string
            if (serverDoc['tags'] !== undefined) patch.tags = serverDoc['tags'] as string[]

            await db.documents.update(id, patch)
            result.documents.updated++
          } else {
            result.documents.skipped++
          }
        } else {
          const document: Document = {
            id,
            type: docData.type as Document['type'],
            name: docData.name,
            fileUrl: docData.fileUrl,
            expiryReminderDays: Number(serverDoc['expiryReminderDays']) || 30,
            createdAt: docData.createdAt,
            updatedAt: docData.updatedAt,
            syncStatus: 'synced',
          }
          if (serverDoc['thumbnailUrl']) document.thumbnailUrl = serverDoc['thumbnailUrl'] as string
          if (serverDoc['expiryDate'])
            document.expiryDate = new Date(serverDoc['expiryDate'] as string)
          if (serverDoc['notes']) document.notes = serverDoc['notes'] as string
          if (serverDoc['tags']) document.tags = serverDoc['tags'] as string[]

          await db.documents.add(document)
          result.documents.added++
        }
      }

      // Merge subscriptions
      for (const serverSub of serverData.subscriptions || []) {
        const parsed = serverSubscriptionSchema.safeParse(serverSub)
        if (!parsed.success) {
          result.subscriptions.skipped++
          continue
        }

        const subData = parsed.data
        const id = subData.id

        const existing = await db.subscriptions.get(id)
        if (existing) {
          const pendingCount = await db.syncQueue.where('entityId').equals(id).count()
          if (pendingCount > 0) {
            result.subscriptions.skipped++
            continue
          }

          const serverUpdatedAt = subData.updatedAt.getTime()
          const localUpdatedAt = existing.updatedAt?.getTime?.() ?? 0

          if (serverUpdatedAt > localUpdatedAt) {
            const patch: Partial<Subscription> = {
              name: subData.name,
              provider: subData.provider,
              category: (serverSub['category'] as Subscription['category']) || 'other',
              amount: subData.amount,
              billingCycle:
                (serverSub['billingCycle'] as Subscription['billingCycle']) || 'monthly',
              nextBillingDate: subData.nextBillingDate,
              startDate: subData.startDate,
              isActive: serverSub['isActive'] !== false,
              reminderDays: Number(serverSub['reminderDays']) || 3,
              createdAt: subData.createdAt,
              updatedAt: subData.updatedAt,
            }
            if (serverSub['cancelUrl'] !== undefined)
              patch.cancelUrl = serverSub['cancelUrl'] as string
            if (serverSub['loginUrl'] !== undefined)
              patch.loginUrl = serverSub['loginUrl'] as string
            if (serverSub['notes'] !== undefined) patch.notes = serverSub['notes'] as string
            if (serverSub['logoUrl'] !== undefined) patch.logoUrl = serverSub['logoUrl'] as string

            await db.subscriptions.update(id, patch)
            result.subscriptions.updated++
          } else {
            result.subscriptions.skipped++
          }
        } else {
          const subscription: Subscription = {
            id,
            name: subData.name,
            provider: subData.provider,
            category: (serverSub['category'] as Subscription['category']) || 'other',
            amount: subData.amount,
            billingCycle: (serverSub['billingCycle'] as Subscription['billingCycle']) || 'monthly',
            nextBillingDate: subData.nextBillingDate,
            startDate: subData.startDate,
            isActive: serverSub['isActive'] !== false,
            reminderDays: Number(serverSub['reminderDays']) || 3,
            createdAt: subData.createdAt,
            updatedAt: subData.updatedAt,
          }
          if (serverSub['cancelUrl']) subscription.cancelUrl = serverSub['cancelUrl'] as string
          if (serverSub['loginUrl']) subscription.loginUrl = serverSub['loginUrl'] as string
          if (serverSub['notes']) subscription.notes = serverSub['notes'] as string
          if (serverSub['logoUrl']) subscription.logoUrl = serverSub['logoUrl'] as string

          await db.subscriptions.add(subscription)
          result.subscriptions.added++
        }
      }

      // Merge settings (LWW)
      if (serverData.settings) {
        const parsed = serverSettingsSchema.safeParse(serverData.settings)
        if (!parsed.success) {
          result.settings = false
          return
        }

        const settingsData = parsed.data
        const localSettings = await db.settings.toArray()
        const existing = localSettings[0]
        const serverUpdatedAt = settingsData.updatedAt.getTime()
        const localUpdatedAt = existing?.updatedAt?.getTime?.() ?? 0

        if (!existing) {
          await db.settings.add({
            id: (serverData.settings['id'] as string) || generateId(),
            userId: settingsData.userId,
            theme: (serverData.settings['theme'] as UserSettings['theme']) || 'system',
            language: (serverData.settings['language'] as UserSettings['language']) || 'sr',
            notificationsEnabled: serverData.settings['notificationsEnabled'] !== false,
            emailNotifications: serverData.settings['emailNotifications'] === true,
            pushNotifications: serverData.settings['pushNotifications'] !== false,
            biometricLock: serverData.settings['biometricLock'] === true,
            warrantyExpiryThreshold: Number(serverData.settings['warrantyExpiryThreshold']) || 30,
            warrantyCriticalThreshold:
              Number(serverData.settings['warrantyCriticalThreshold']) || 7,
            quietHoursStart: (serverData.settings['quietHoursStart'] as string) || '22:00',
            quietHoursEnd: (serverData.settings['quietHoursEnd'] as string) || '08:00',
            updatedAt: settingsData.updatedAt,
          })
          result.settings = true
        } else if (serverUpdatedAt > localUpdatedAt) {
          await db.settings.update(existing.id as string, {
            userId: settingsData.userId,
            theme: (serverData.settings['theme'] as UserSettings['theme']) || 'system',
            language: (serverData.settings['language'] as UserSettings['language']) || 'sr',
            notificationsEnabled: serverData.settings['notificationsEnabled'] !== false,
            emailNotifications: serverData.settings['emailNotifications'] === true,
            pushNotifications: serverData.settings['pushNotifications'] !== false,
            biometricLock: serverData.settings['biometricLock'] === true,
            warrantyExpiryThreshold: Number(serverData.settings['warrantyExpiryThreshold']) || 30,
            warrantyCriticalThreshold:
              Number(serverData.settings['warrantyCriticalThreshold']) || 7,
            quietHoursStart: (serverData.settings['quietHoursStart'] as string) || '22:00',
            quietHoursEnd: (serverData.settings['quietHoursEnd'] as string) || '08:00',
            updatedAt: settingsData.updatedAt,
          })
          result.settings = true
        }
      }
    }
  )

  syncLogger.info('Server data merge completed:', result)
  return result
}

/**
 * Full sync: pull from server and merge, then push pending changes
 */
export async function fullSync(): Promise<{
  pull: MergeResult | null
  push: { success: number; failed: number; deleted: number }
}> {
  // Lazy import to avoid circular dependency
  const { pullFromNeon } = await import('@/lib/neonSync')

  // First, pull from server
  const pullResult = await pullFromNeon()
  let mergeResult: MergeResult | null = null

  if (pullResult.success && pullResult.data) {
    mergeResult = await mergeServerData(pullResult.data as ServerData)
  }

  // Then, push pending changes
  const pushResult = await processSyncQueue()

  return {
    pull: mergeResult,
    push: pushResult,
  }
}
