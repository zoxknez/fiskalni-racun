// lib/db.ts

import type {
  HouseholdBillStatus,
  HouseholdBillType,
  HouseholdConsumptionUnit,
} from '@lib/household'
import Dexie, { type Table } from 'dexie'
import { syncLogger } from '@/lib/logger'
import { syncToNeon, warmUpDatabase } from '@/lib/neonSync'
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

export interface SyncQueue {
  id?: number // Local queue ID can remain number (auto-increment)
  entityType: 'receipt' | 'device' | 'reminder' | 'document' | 'householdBill'
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

    // Hooks: timestamp, default syncStatus, calculation
    this.receipts.hook('creating', (pk, obj) => {
      obj.id = pk || obj.id || generateId()
      const now = new Date()
      obj.createdAt = obj.createdAt ?? now
      obj.updatedAt = now
      obj.syncStatus = obj.syncStatus ?? 'pending'
      obj.totalAmount = coerceAmount(obj.totalAmount)
    })
    this.receipts.hook('updating', (mods) => {
      ;(mods as Partial<Receipt>).updatedAt = new Date()
      ;(mods as Partial<Receipt>).syncStatus = 'pending'
      if ('totalAmount' in mods && typeof mods.totalAmount === 'number') {
        ;(mods as Partial<Receipt>).totalAmount = coerceAmount(mods.totalAmount)
      }
      return mods
    })

    this.devices.hook('creating', (pk, obj) => {
      obj.id = pk || obj.id || generateId()
      const now = new Date()
      obj.createdAt = obj.createdAt ?? now
      obj.updatedAt = now
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
      const next = { ...current, ...mods } as Device
      const changedExpiryRelevant =
        'purchaseDate' in mods || 'warrantyDuration' in mods || 'warrantyExpiry' in mods
      if (changedExpiryRelevant) {
        const expiry =
          next.warrantyExpiry || computeWarrantyExpiry(next.purchaseDate, next.warrantyDuration)
        ;(mods as Partial<Device>).warrantyExpiry = expiry
        if (next.status !== 'in-service' && (mods as Partial<Device>).status !== 'in-service') {
          ;(mods as Partial<Device>).status = computeWarrantyStatus(expiry)
        }
      }
      ;(mods as Partial<Device>).updatedAt = new Date()
      ;(mods as Partial<Device>).syncStatus = 'pending'
      return mods
    })

    this.documents.hook('creating', (pk, obj) => {
      obj.id = pk || obj.id || generateId()
      const now = new Date()
      obj.createdAt = obj.createdAt ?? now
      obj.updatedAt = now
      obj.syncStatus = obj.syncStatus ?? 'pending'
      obj.expiryReminderDays = obj.expiryReminderDays ?? 30
    })
    this.documents.hook('updating', (mods) => {
      ;(mods as Partial<Document>).updatedAt = new Date()
      ;(mods as Partial<Document>).syncStatus = 'pending'
      return mods
    })

    this.householdBills.hook('creating', (pk, obj) => {
      obj.id = pk || obj.id || generateId()
      const now = new Date()
      obj.createdAt = obj.createdAt ?? now
      obj.updatedAt = now
      obj.syncStatus = obj.syncStatus ?? 'pending'
      obj.amount = coerceAmount(obj.amount)
    })
    this.householdBills.hook('updating', (mods) => {
      ;(mods as Partial<HouseholdBill>).updatedAt = new Date()
      ;(mods as Partial<HouseholdBill>).syncStatus = 'pending'
      if ('amount' in mods && typeof mods.amount === 'number') {
        ;(mods as Partial<HouseholdBill>).amount = coerceAmount(mods.amount)
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
    await enqueueSync('receipt', id, 'update', updates)
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
    await enqueueSync('householdBill', id, 'update', updates)
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
    await enqueueSync('device', id, 'update', updates)
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
  return await db.reminders.add({ ...reminder, id, createdAt: new Date() })
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
  await db.documents.add(payload)
  await enqueueSync('document', id, 'create', payload)
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

export async function markSynced(entity: 'receipt' | 'device' | 'householdBill', id: string) {
  const table =
    entity === 'receipt' ? db.receipts : entity === 'device' ? db.devices : db.householdBills
  await table.update(id, { syncStatus: 'synced', updatedAt: new Date() })
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

  await db.transaction('rw', db.receipts, db.devices, db.householdBills, db.syncQueue, async () => {
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
  })

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

      // Process items ONE AT A TIME with longer delays to avoid Neon cold start timeouts
      // Neon serverless can take 5-10s on cold start, so we process sequentially
      const BATCH_SIZE = 1
      const DELAY_MS = 2000 // 2 seconds between each item

      for (let i = 0; i < validItems.length; i += BATCH_SIZE) {
        const batch = validItems.slice(i, i + BATCH_SIZE)

        // Process batch items in parallel
        const results = await Promise.allSettled(
          batch.map(async (item) => {
            await syncToNeon(item)
            return item
          })
        )

        // Handle results
        for (let j = 0; j < results.length; j++) {
          const result = results[j]
          const item = batch[j]

          if (result && result.status === 'fulfilled' && item) {
            success++
            if (item.id) await db.syncQueue.delete(item.id)

            // Mark local entity as synced
            if (
              item.entityType === 'receipt' ||
              item.entityType === 'device' ||
              item.entityType === 'householdBill'
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
          } else if (result && result.status === 'rejected' && item) {
            failed++
            if (item.id) {
              await db.syncQueue.update(item.id, {
                retryCount: item.retryCount + 1,
                lastError: result.reason instanceof Error ? result.reason.message : 'Unknown error',
              })
            }
          }
        }

        // Add delay between batches to avoid overwhelming the API
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
      // Re-throw to be handled by outer try-catch
      throw error
    }
  })()

  try {
    return await syncPromise
  } catch (error) {
    syncLogger.error('processSyncQueue failed:', error)
    // Return partial results if available, otherwise throw
    throw error
  } finally {
    // Always clear the promise, even on error
    syncPromise = null
  }
}

export async function clearSyncQueue(): Promise<void> {
  await db.syncQueue.clear()
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
  await db.subscriptions.add({
    ...subscription,
    id,
    createdAt: now,
    updatedAt: now,
  })
  return id
}

export async function updateSubscription(
  id: string,
  updates: Partial<Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  await db.subscriptions.update(id, {
    ...updates,
    updatedAt: new Date(),
  })
}

export async function deleteSubscription(id: string): Promise<void> {
  await db.subscriptions.delete(id)
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

  await db.subscriptions.update(id, {
    nextBillingDate: nextBilling,
    updatedAt: new Date(),
  })
}

export async function toggleSubscriptionActive(id: string, isActive: boolean): Promise<void> {
  await db.subscriptions.update(id, {
    isActive,
    updatedAt: new Date(),
  })
}
