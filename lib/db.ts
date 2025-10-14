// lib/db.ts
import Dexie, { Table } from 'dexie'
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
  language: 'sr-Latn' | 'en'
  notificationsEnabled: boolean
  emailNotifications: boolean
  pushNotifications: boolean
  biometricLock: boolean
  quietHoursStart: string // HH:mm
  quietHoursEnd: string // HH:mm
  updatedAt: Date
}

export interface SyncQueue {
  id?: number
  entityType: 'receipt' | 'device' | 'reminder'
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
  settings!: Table<UserSettings, number>
  syncQueue!: Table<SyncQueue, number>

  constructor() {
    super('FiskalniRacunDB')

    // v1 — originalna šema
    this.version(1).stores({
      receipts:
        '++id, merchantName, pib, date, category, totalAmount, syncStatus, createdAt',
      devices:
        '++id, receiptId, brand, model, category, serialNumber, status, warrantyExpiry, syncStatus, createdAt',
      reminders: '++id, deviceId, type, daysBeforeExpiry, status, createdAt',
      settings: '++id, userId',
      syncQueue: '++id, entityType, entityId, operation, createdAt',
    })

    // v2 — bolji indeksi (sort, filtriranje) + compound indexi
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
      })
      .upgrade(() => {
        /* istu strukturu polja zadržavamo; Dexie će reindeksirati */
      })

    // Hooks: timestamp, default syncStatus, računanje expiry i statusa
    this.receipts.hook('creating', (_pk, obj) => {
      const now = new Date()
      obj.createdAt = obj.createdAt ?? now
      obj.updatedAt = now
      obj.syncStatus = obj.syncStatus ?? 'pending'
    })
    this.receipts.hook('updating', (mods) => {
      ;(mods as Partial<Receipt>).updatedAt = new Date()
      ;(mods as Partial<Receipt>).syncStatus = 'pending'
      return mods
    })

    this.devices.hook('creating', (_pk, obj) => {
      const now = new Date()
      obj.createdAt = obj.createdAt ?? now
      obj.updatedAt = now
      obj.syncStatus = obj.syncStatus ?? 'pending'
      // Ako nije prosleđen expiry, izračunaj iz purchaseDate+warrantyDuration
      if (!obj.warrantyExpiry && obj.purchaseDate && obj.warrantyDuration >= 0) {
        obj.warrantyExpiry = computeWarrantyExpiry(obj.purchaseDate, obj.warrantyDuration)
      }
      // Ako nije "in-service", postavi status prema isteku
      if (obj.status !== 'in-service') {
        obj.status = computeWarrantyStatus(obj.warrantyExpiry)
      }
    })
    this.devices.hook('updating', (mods, _pk, current) => {
      const next = { ...current, ...mods } as Device
      // Re-izračun ako se menja purchaseDate/duration/expiry
      const changedExpiryRelevant =
        'purchaseDate' in mods || 'warrantyDuration' in mods || 'warrantyExpiry' in mods
      if (changedExpiryRelevant) {
        const expiry =
          next.warrantyExpiry ||
          computeWarrantyExpiry(next.purchaseDate, next.warrantyDuration)
        ;(mods as Partial<Device>).warrantyExpiry = expiry
        if (next.status !== 'in-service') {
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
  }
}

export const db = new FiskalniRacunDB()

// ────────────────────────────────
// Util funkcije (lokalne)
// ────────────────────────────────
function computeWarrantyExpiry(purchaseDate: Date, months: number): Date {
  const d = new Date(purchaseDate)
  // Siguran "add months" (setMonth rešava prelazak godine/dužine meseca)
  d.setMonth(d.getMonth() + months)
  return d
}

function computeWarrantyStatus(expiry: Date): Device['status'] {
  return expiry && expiry.getTime() >= Date.now() ? 'active' : 'expired'
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

// ────────────────────────────────
// Receipt helpers
// ────────────────────────────────
export async function addReceipt(
  receipt: Omit<Receipt, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>
): Promise<number> {
  const id = await db.transaction('rw', db.receipts, db.syncQueue, async () => {
    const newId = await db.receipts.add({
      ...receipt,
      createdAt: new Date(),
      updatedAt: new Date(),
      syncStatus: 'pending',
    })
    await enqueueSync('receipt', newId, 'create', { ...receipt })
    return newId
  })
  return id
}

export async function updateReceipt(
  id: number,
  updates: Partial<Receipt>
): Promise<void> {
  await db.transaction('rw', db.receipts, db.syncQueue, async () => {
    await db.receipts.update(id, {
      ...updates,
      updatedAt: new Date(),
      syncStatus: 'pending',
    })
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
// Device helpers
// ────────────────────────────────
export async function addDevice(
  device: Omit<Device, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus' | 'warrantyExpiry' | 'status'> & {
    warrantyExpiry?: Date
    status?: Device['status']
  }
): Promise<number> {
  const now = new Date()
  const expiry =
    device.warrantyExpiry ??
    computeWarrantyExpiry(device.purchaseDate, device.warrantyDuration)
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
    if (stored) {
      createdSnapshot = stored
    }
    await enqueueSync('device', newId, 'create', { ...device, warrantyExpiry: expiry, status })
    return newId
  })
  if (!createdSnapshot) {
    createdSnapshot = (await db.devices.get(id)) ?? null
  }
  if (createdSnapshot) {
    scheduleWarrantyReminders(createdSnapshot)
  }
  return id
}

export async function updateDevice(
  id: number,
  updates: Partial<Device>
): Promise<void> {
  let nextSnapshot: Device | null = null
  await db.transaction('rw', db.devices, db.syncQueue, async () => {
    // Ako se menjaju purchaseDate/warrantyDuration/warrantyExpiry, izračunaj finalne vrednosti
    const existing = await db.devices.get(id)
    if (!existing) return

    let warrantyExpiry = updates.warrantyExpiry ?? existing.warrantyExpiry
    if ('purchaseDate' in updates || 'warrantyDuration' in updates) {
      warrantyExpiry = computeWarrantyExpiry(
        updates.purchaseDate ?? existing.purchaseDate,
        updates.warrantyDuration ?? existing.warrantyDuration
      )
      updates.warrantyExpiry = warrantyExpiry
    }
    if (existing.status !== 'in-service' && updates.status !== 'in-service') {
      updates.status = computeWarrantyStatus(warrantyExpiry)
    }

    const payload = {
      ...updates,
      updatedAt: new Date(),
      syncStatus: 'pending' as const,
    }
    await db.devices.update(id, payload)
    nextSnapshot = { ...existing, ...payload } as Device
    await enqueueSync('device', id, 'update', updates)
  })
  if (!nextSnapshot) {
    nextSnapshot = (await db.devices.get(id)) ?? null
  }
  if (nextSnapshot) {
    cancelDeviceReminders(id)
    scheduleWarrantyReminders(nextSnapshot)
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
  return db.reminders.add({ ...reminder, createdAt: new Date() })
}

// ────────────────────────────────
// Settings helpers
// ────────────────────────────────
export async function upsertSettings(userId: string, partial: Partial<UserSettings>) {
  const existing = await db.settings.where('userId').equals(userId).first()
  const updated: UserSettings = {
    id: existing?.id,
    userId,
    theme: partial.theme ?? existing?.theme ?? 'system',
    language: partial.language ?? existing?.language ?? 'sr-Latn',
    notificationsEnabled:
      partial.notificationsEnabled ?? existing?.notificationsEnabled ?? true,
    emailNotifications: partial.emailNotifications ?? existing?.emailNotifications ?? true,
    pushNotifications: partial.pushNotifications ?? existing?.pushNotifications ?? true,
    biometricLock: partial.biometricLock ?? existing?.biometricLock ?? false,
    quietHoursStart: partial.quietHoursStart ?? existing?.quietHoursStart ?? '22:00',
    quietHoursEnd: partial.quietHoursEnd ?? existing?.quietHoursEnd ?? '07:30',
    updatedAt: new Date(),
  }
  if (existing?.id) {
    await db.settings.update(existing.id, updated)
  } else {
    await db.settings.add(updated)
  }
  return updated
}

export async function getSettings(userId: string) {
  return db.settings.where('userId').equals(userId).first()
}

// ────────────────────────────────
// Query helpers (za UI)
// ────────────────────────────────
export async function getDevicesByWarrantyStatus(daysThreshold = 30): Promise<Device[]> {
  const now = new Date()
  const threshold = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000)
  // koristi indeks [status+warrantyExpiry] → brzo pretraživanje aktivnih u intervalu
  return db.devices
    .where('[status+warrantyExpiry]')
    .between(['active', now], ['active', threshold], true, true)
    .toArray()
}

export async function getRecentReceipts(limit = 5): Promise<Receipt[]> {
  const all = await db.receipts.orderBy('createdAt').reverse().limit(limit).toArray()
  return all
}

export async function getMonthlySpending(year: number, monthIndex0: number) {
  const from = new Date(year, monthIndex0, 1)
  const to = new Date(year, monthIndex0 + 1, 1)
  const rows = await db.receipts.where('date').between(from, to, true, false).toArray()
  const total = rows.reduce((s, r) => s + (r.totalAmount || 0), 0)
  return { total, count: rows.length }
}

// Markiraj entitet kao sinhronizovan (posle uspešnog slanja na server)
export async function markSynced(entity: 'receipt' | 'device', id: number) {
  const table = entity === 'receipt' ? db.receipts : db.devices
  await table.update(id, { syncStatus: 'synced', updatedAt: new Date() })
}

// ────────────────────────────────
// Advanced search & filter
// ────────────────────────────────
export async function searchReceipts(query: string): Promise<Receipt[]> {
  const lowerQuery = query.toLowerCase()
  return db.receipts
    .filter((receipt) => {
      const matchesMerchant = receipt.merchantName.toLowerCase().includes(lowerQuery)
      const matchesPib = receipt.pib.toLowerCase().includes(lowerQuery)
      const matchesNotes = receipt.notes ? receipt.notes.toLowerCase().includes(lowerQuery) : false
      const matchesCategory = receipt.category ? receipt.category.toLowerCase().includes(lowerQuery) : false
      
      return matchesMerchant || matchesPib || matchesNotes || matchesCategory
    })
    .toArray()
}

export async function searchDevices(query: string): Promise<Device[]> {
  const lowerQuery = query.toLowerCase()
  return db.devices
    .filter((device) => {
      const matchesBrand = device.brand.toLowerCase().includes(lowerQuery)
      const matchesModel = device.model.toLowerCase().includes(lowerQuery)
      const matchesSerial = device.serialNumber ? device.serialNumber.toLowerCase().includes(lowerQuery) : false
      const matchesCategory = device.category.toLowerCase().includes(lowerQuery)
      
      return matchesBrand || matchesModel || matchesSerial || matchesCategory
    })
    .toArray()
}

export async function getReceiptsByCategory(category: string): Promise<Receipt[]> {
  return db.receipts.where('category').equals(category).toArray()
}

export async function getReceiptsByDateRange(start: Date, end: Date): Promise<Receipt[]> {
  return db.receipts.where('date').between(start, end, true, true).toArray()
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
  
  const [
    monthReceipts,
    expiringDevices,
    allDevices,
    recentReceipts,
  ] = await Promise.all([
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
    activeWarranties: allDevices.filter(d => d.status === 'active').length,
    expiredWarranties: allDevices.filter(d => d.status === 'expired').length,
    recentReceipts,
    categoryTotals,
    expiringDevices,
  }
}

// ────────────────────────────────
// Sync Queue Management
// ────────────────────────────────
export async function getPendingSyncItems(): Promise<SyncQueue[]> {
  return db.syncQueue.orderBy('createdAt').toArray()
}

export async function processSyncQueue(): Promise<{ success: number; failed: number }> {
  const items = await db.syncQueue.toArray()
  let success = 0
  let failed = 0
  
  for (const item of items) {
    try {
      // TODO: implement actual server sync
      // await syncToServer(item)
      
      // Simulate success
      await db.syncQueue.delete(item.id!)
      success++
    } catch (error) {
      failed++
      await db.syncQueue.update(item.id!, {
        retryCount: item.retryCount + 1,
        lastError: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
  
  return { success, failed }
}

export async function clearSyncQueue(): Promise<void> {
  await db.syncQueue.clear()
}
