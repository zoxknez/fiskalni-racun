// lib/db.ts

import type {
  HouseholdBillStatus,
  HouseholdBillType,
  HouseholdConsumptionUnit,
} from '@lib/household'
import Dexie, { type Table, type Transaction } from 'dexie'
import { syncLogger } from '@/lib/logger'
import { syncToSupabase } from '@/lib/realtimeSync'
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
  id?: number
  merchantName: string
  pib: string
  date: Date
  time: string
  totalAmount: number
  vatAmount?: number
  items?: ReceiptItem[]
  category: string
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
  id?: number
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
  id?: number
  receiptId?: number
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
  // NOTE: kept for backward-compat; authoritative reminders live in reminders table
  reminders: Reminder[]
  createdAt: Date
  updatedAt: Date
  syncStatus: 'synced' | 'pending' | 'error'
}

export interface Reminder {
  id?: number
  deviceId: number
  type: 'warranty' // extensible: 'service' | 'maintenance'
  daysBeforeExpiry: number
  status: 'pending' | 'sent' | 'dismissed'
  sentAt?: Date
  createdAt: Date
}

export interface UserSettings {
  id?: number
  userId: string
  theme: 'light' | 'dark' | 'system'
  language: 'sr' | 'en'
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
  id?: number
  type: DocumentType
  name: string
  fileUrl: string
  thumbnailUrl?: string
  expiryDate?: Date
  expiryReminderDays?: number // days before expiry to show reminder (default: 30)
  notes?: string
  createdAt: Date
  updatedAt: Date
  syncStatus: 'synced' | 'pending' | 'error'
}

export interface SyncQueue {
  id?: number
  entityType: 'receipt' | 'device' | 'reminder' | 'document' | 'householdBill'
  entityId: number
  operation: 'create' | 'update' | 'delete'
  data: unknown
  retryCount: number
  lastError?: string
  createdAt: Date
}

// ────────────────────────────────
export class FiskalniRacunDB extends Dexie {
  receipts!: Table<Receipt, number>
  devices!: Table<Device, number>
  reminders!: Table<Reminder, number>
  householdBills!: Table<HouseholdBill, number>
  documents!: Table<Document, number>
  settings!: Table<UserSettings, number>
  syncQueue!: Table<SyncQueue, number>
  _migrations!: Table<
    { version: number; name: string; description: string; appliedAt: Date },
    number
  >

  constructor() {
    super('FiskalniRacunDB')

    // v1 — originalna šema
    this.version(1).stores({
      receipts: '++id, merchantName, pib, date, category, totalAmount, syncStatus, createdAt',
      devices:
        '++id, receiptId, brand, model, category, serialNumber, status, warrantyExpiry, syncStatus, createdAt',
      reminders: '++id, deviceId, type, daysBeforeExpiry, status, createdAt',
      settings: '++id, userId',
      syncQueue: '++id, entityType, entityId, operation, createdAt',
    })

    // v2 — indeksi (sort/filtriranje) + compound
    this.version(2)
      .stores({
        receipts:
          '++id, merchantName, pib, date, createdAt, category, totalAmount, syncStatus, qrLink',
        // status+warrantyExpiry za brz upit "aktivno i ističe uskoro"
        devices:
          '++id, receiptId, [status+warrantyExpiry], warrantyExpiry, brand, model, category, createdAt, syncStatus',
        reminders: '++id, deviceId, [deviceId+type], status, createdAt',
        settings: '++id, userId, updatedAt',
        syncQueue: '++id, entityType, entityId, operation, createdAt',
        _migrations: '++id, version, name, appliedAt',
      })
      .upgrade(() => {
        /* Dexie reindeksira */
      })

    // v3 — settings: unique userId + normalizacija jezika (sr-Latn → sr)
    this.version(3)
      .stores({
        receipts:
          '++id, merchantName, pib, date, createdAt, category, totalAmount, syncStatus, qrLink',
        devices:
          '++id, receiptId, [status+warrantyExpiry], warrantyExpiry, brand, model, category, createdAt, syncStatus',
        reminders: '++id, deviceId, [deviceId+type], status, createdAt',
        // `&userId` → unique index; ako ima duplikata, upgrade handler ispravlja
        settings: '++id,&userId, updatedAt',
        syncQueue: '++id, entityType, entityId, operation, createdAt',
        _migrations: '++id, version, name, appliedAt',
      })
      .upgrade(async (tx) => {
        const settings = await (tx.table('settings') as Table<UserSettings, number>).toArray()
        // Merge duplikata po userId (zadrži najnoviji)
        const byUser = new Map<string, UserSettings>()
        for (const s of settings) {
          const key = s.userId
          const prev = byUser.get(key)
          if (
            !prev ||
            (s.updatedAt &&
              prev.updatedAt &&
              new Date(s.updatedAt).getTime() > new Date(prev.updatedAt).getTime())
          ) {
            byUser.set(key, s)
          }
        }
        // Očisti sve pa vrati jedinstvene
        await (tx.table('settings') as Table<UserSettings, number>).clear()
        for (const s of byUser.values()) {
          const normalized: UserSettings = {
            ...s,
            language: normalizeLanguage(s.language),
            updatedAt: new Date(),
          }
          await (tx.table('settings') as Table<UserSettings, number>).add(normalized)
        }
        await logMigration(
          tx,
          3,
          'settings-uniq-lang',
          'Unique userId + normalize language to sr/en'
        )
      })

    // v4 — documents table za čuvanje dokumenata
    this.version(4)
      .stores({
        receipts:
          '++id, merchantName, pib, date, createdAt, category, totalAmount, syncStatus, qrLink',
        devices:
          '++id, receiptId, [status+warrantyExpiry], warrantyExpiry, brand, model, category, createdAt, syncStatus',
        reminders: '++id, deviceId, [deviceId+type], status, createdAt',
        documents: '++id, type, expiryDate, createdAt, syncStatus',
        settings: '++id,&userId, updatedAt',
        syncQueue: '++id, entityType, entityId, operation, createdAt',
        _migrations: '++id, version, name, appliedAt',
      })
      .upgrade(() => {
        /* Dexie reindeksira */
      })

    // v5 — household bills table
    this.version(5)
      .stores({
        receipts:
          '++id, merchantName, pib, date, createdAt, category, totalAmount, syncStatus, qrLink',
        devices:
          '++id, receiptId, [status+warrantyExpiry], warrantyExpiry, brand, model, category, createdAt, syncStatus',
        reminders: '++id, deviceId, [deviceId+type], status, createdAt',
        documents: '++id, type, expiryDate, createdAt, syncStatus',
        householdBills: '++id, billType, provider, dueDate, status, syncStatus, createdAt',
        settings: '++id,&userId, updatedAt',
        syncQueue: '++id, entityType, entityId, operation, createdAt',
        _migrations: '++id, version, name, appliedAt',
      })
      .upgrade(() => {
        /* Dexie reindeksira */
      })

    // Hooks: timestamp, default syncStatus, računanje expiry i statusa
    this.receipts.hook('creating', (_pk, obj) => {
      const now = new Date()
      obj.createdAt = obj.createdAt ?? now
      obj.updatedAt = now
      obj.syncStatus = obj.syncStatus ?? 'pending'
      // Sanitizacija sume
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

    this.devices.hook('creating', (_pk, obj) => {
      const now = new Date()
      obj.createdAt = obj.createdAt ?? now
      obj.updatedAt = now
      obj.syncStatus = obj.syncStatus ?? 'pending'
      obj.warrantyDuration = Math.max(0, Math.floor(obj.warrantyDuration))
      // Ako nije prosleđen expiry, izračunaj iz purchaseDate+warrantyDuration
      if (!obj.warrantyExpiry && obj.purchaseDate && obj.warrantyDuration >= 0) {
        obj.warrantyExpiry = computeWarrantyExpiry(obj.purchaseDate, obj.warrantyDuration)
      }
      // Ako nije "in-service", postavi status prema isteku
      if (obj.status !== 'in-service') {
        obj.status = computeWarrantyStatus(obj.warrantyExpiry)
      }
      obj.reminders = obj.reminders ?? []
    })
    this.devices.hook('updating', (mods, _pk, current) => {
      const next = { ...current, ...mods } as Device
      // Re-izračun ako se menja purchaseDate/duration/expiry
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

    // Kaskadno brisanje podsjetnika kad se briše uređaj
    this.devices.hook('deleting', async (pk) => {
      cancelDeviceReminders(Number(pk))
      await this.reminders.where('deviceId').equals(Number(pk)).delete()
    })

    // Documents hooks: timestamp, default syncStatus, expiryReminderDays
    this.documents.hook('creating', (_pk, obj) => {
      const now = new Date()
      obj.createdAt = obj.createdAt ?? now
      obj.updatedAt = now
      obj.syncStatus = obj.syncStatus ?? 'pending'
      obj.expiryReminderDays = obj.expiryReminderDays ?? 30 // default: obavesti 30 dana pre isteka
    })
    this.documents.hook('updating', (mods) => {
      ;(mods as Partial<Document>).updatedAt = new Date()
      ;(mods as Partial<Document>).syncStatus = 'pending'
      return mods
    })

    this.householdBills.hook('creating', (_pk, obj) => {
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
  }
}

export const db = new FiskalniRacunDB()

// ────────────────────────────────
// Util funkcije (lokalne)
// ────────────────────────────────
function computeWarrantyExpiry(purchaseDate: Date, months: number): Date {
  const d = new Date(purchaseDate)
  d.setMonth(d.getMonth() + months) // rešava prelaze meseci/godina
  return d
}

function computeWarrantyStatus(expiry: Date): Device['status'] {
  return expiry && expiry.getTime() >= Date.now() ? 'active' : 'expired'
}

function coerceAmount(value: number): number {
  const n = Number.isFinite(value) ? value : 0
  return Math.round(n * 100) / 100
}

function normalizeLanguage(lng: string | undefined): 'sr' | 'en' {
  if (!lng) return 'sr'
  const low = lng.toLowerCase()
  if (low.startsWith('sr')) return 'sr'
  return 'en'
}

async function enqueueSync(
  entityType: SyncQueue['entityType'],
  entityId: number,
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

async function logMigration(tx: Transaction, version: number, name: string, description: string) {
  const tbl = tx.table('_migrations') as Table<
    { version: number; name: string; description: string; appliedAt: Date },
    number
  >
  await tbl.add({ version, name, description, appliedAt: new Date() })
}

// ────────────────────────────────
// Receipt helpers
// ────────────────────────────────
export async function addReceipt(
  receipt: Omit<Receipt, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>
): Promise<number> {
  const payload: Receipt = {
    ...receipt,
    totalAmount: coerceAmount(receipt.totalAmount),
    createdAt: new Date(),
    updatedAt: new Date(),
    syncStatus: 'pending',
  }

  const id = await db.transaction('rw', db.receipts, db.syncQueue, async () => {
    const newId = await db.receipts.add(payload)
    await enqueueSync('receipt', newId, 'create', { ...receipt })
    return newId
  })
  return id
}

export async function updateReceipt(id: number, updates: Partial<Receipt>): Promise<void> {
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

export async function deleteReceipt(id: number): Promise<void> {
  await db.transaction('rw', db.receipts, db.devices, db.reminders, db.syncQueue, async () => {
    // kaskadno: obriši uređaje povezane sa ovim računom (i njihove podsjetnike — hook odradi)
    const deviceIds = await db.devices.where('receiptId').equals(id).primaryKeys()
    await db.devices.where('receiptId').equals(id).delete()
    await db.receipts.delete(id)
    await enqueueSync('receipt', id, 'delete', { id })
    for (const did of deviceIds) {
      await enqueueSync('device', Number(did), 'delete', { id: did })
    }
  })
}

// ────────────────────────────────
// Household bill helpers
// ────────────────────────────────
export async function addHouseholdBill(
  bill: Omit<HouseholdBill, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>
): Promise<number> {
  const payload: HouseholdBill = {
    ...bill,
    amount: coerceAmount(bill.amount),
    createdAt: new Date(),
    updatedAt: new Date(),
    syncStatus: 'pending',
  }

  const id = await db.transaction('rw', db.householdBills, db.syncQueue, async () => {
    const newId = await db.householdBills.add(payload)
    await enqueueSync('householdBill', newId, 'create', payload)
    return newId
  })

  return id
}

export async function updateHouseholdBill(
  id: number,
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

export async function deleteHouseholdBill(id: number): Promise<void> {
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
): Promise<number> {
  const now = new Date()
  const expiry =
    device.warrantyExpiry ??
    computeWarrantyExpiry(device.purchaseDate, Math.max(0, Math.floor(device.warrantyDuration)))
  const status = device.status ?? computeWarrantyStatus(expiry)

  let createdSnapshot: Device | null = null
  const id = await db.transaction('rw', db.devices, db.syncQueue, async () => {
    const newId = await db.devices.add({
      ...device,
      warrantyExpiry: expiry,
      status,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
      reminders: device.reminders ?? [],
    } as Device)
    const stored = await db.devices.get(newId)
    if (stored) createdSnapshot = stored
    await enqueueSync('device', newId, 'create', { ...device, warrantyExpiry: expiry, status })
    return newId
  })

  if (!createdSnapshot) createdSnapshot = (await db.devices.get(id)) ?? null
  if (createdSnapshot) scheduleWarrantyReminders(createdSnapshot)
  return id
}

export async function updateDevice(
  id: number,
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

  if (!nextSnapshot) nextSnapshot = (await db.devices.get(id)) ?? null
  if (nextSnapshot) {
    cancelDeviceReminders(id)
    scheduleWarrantyReminders(nextSnapshot, reminderDays)
  }
}

export async function deleteDevice(id: number): Promise<void> {
  await db.transaction('rw', db.devices, db.reminders, db.syncQueue, async () => {
    cancelDeviceReminders(id)
    await db.devices.delete(id) // reminders idu kaskadno kroz hook
    await enqueueSync('device', id, 'delete', { id })
  })
}

// ────────────────────────────────
// Reminder helpers
// ────────────────────────────────
export async function addReminder(reminder: Omit<Reminder, 'id' | 'createdAt'>) {
  return await db.reminders.add({ ...reminder, createdAt: new Date() })
}

// ────────────────────────────────
// Document helpers
// ────────────────────────────────
export async function addDocument(
  doc: Omit<Document, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>
): Promise<number> {
  const payload: Document = {
    ...doc,
    createdAt: new Date(),
    updatedAt: new Date(),
    syncStatus: 'pending',
  }
  const id = await db.documents.add(payload)
  await enqueueSync('document', id, 'create', payload)
  return id
}

export async function updateDocument(
  id: number,
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

export async function deleteDocument(id: number): Promise<void> {
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

// Markiraj entitet kao sinhronizovan (posle uspešnog slanja na server)
export async function markSynced(entity: 'receipt' | 'device' | 'householdBill', id: number) {
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
const MAX_RETRY_COUNT = 5 // Maximum number of retry attempts
const MAX_AGE_HOURS = 24 // Maximum age of sync items (in hours)

// ⭐ FIXED: Race condition prevention with locking mechanism
let syncInProgress = false
let syncQueued = false

export async function getPendingSyncItems(): Promise<SyncQueue[]> {
  // Return only items still within age/retry limits (useful for UI)
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
  // ⭐ FIXED: Debounce mechanism - prevent concurrent sync operations
  if (syncInProgress) {
    syncLogger.debug('Sync queue already in progress, queuing next sync')
    syncQueued = true
    return { success: 0, failed: 0, deleted: 0 }
  }

  syncInProgress = true

  try {
    const items = await db.syncQueue.toArray()
    let success = 0
    let failed = 0
    let deleted = 0

    const now = Date.now()
    const maxAgeMs = MAX_AGE_HOURS * 60 * 60 * 1000

    for (const item of items) {
      // Delete items that exceeded retry limit or are too old
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
        continue
      }

      try {
        // Sync to Supabase (static import - already loaded by useRealtimeSync hook)
        await syncToSupabase(item)

        // Mark local entity as synced if it still exists
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

        // Delete from queue on success
        if (item.id) await db.syncQueue.delete(item.id)
        success++
      } catch (error) {
        failed++
        if (item.id)
          await db.syncQueue.update(item.id, {
            retryCount: item.retryCount + 1,
            lastError: error instanceof Error ? error.message : 'Unknown error',
          })
      }
    }

    return { success, failed, deleted }
  } finally {
    syncInProgress = false

    // ⭐ FIXED: Process queued sync if one was requested during execution
    if (syncQueued) {
      syncQueued = false
      // Use setTimeout to avoid stack overflow and allow other operations
      setTimeout(() => {
        processSyncQueue().catch((error) => {
          syncLogger.error('Queued sync failed', error)
        })
      }, 100)
    }
  }
}

export async function clearSyncQueue(): Promise<void> {
  await db.syncQueue.clear()
}
