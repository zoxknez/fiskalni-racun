/**
 * Supabase Realtime Sync (refined)
 *
 * - Bi–directional sync Web ↔ Supabase
 * - Queue-friendly (no import of processSyncQueue to avoid cycles)
 * - Conflict resolution: last‑write‑wins based on updated_at vs local updatedAt
 * - Safe JSON/array parsing
 * - Realtime subscriptions with newer-check and silent cascades
 * - Online auto-resubscribe + optional external callbacks
 */

import { type Device, db, type Receipt, type ReceiptItem, type SyncQueue } from '@lib/db'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { syncLogger } from './logger'
import { supabase, type Database, type Json } from './supabase'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type ReceiptRow = Database['public']['Tables']['receipts']['Row']
type ReceiptInsert = Database['public']['Tables']['receipts']['Insert']
type ReceiptUpsert = ReceiptInsert & Partial<ReceiptRow>

type DeviceRow = Database['public']['Tables']['devices']['Row']
type DeviceInsert = Database['public']['Tables']['devices']['Insert']
type DeviceUpsert = DeviceInsert & Partial<DeviceRow>

// ─────────────────────────────────────────────────────────────
// Channels
// ─────────────────────────────────────────────────────────────

let receiptsChannel: RealtimeChannel | null = null
let devicesChannel: RealtimeChannel | null = null

const BACKOFF_BASE_DELAY_MS = 1_000
const BACKOFF_MAX_DELAY_MS = 30_000

let receiptsReconnectTimer: ReturnType<typeof setTimeout> | null = null
let devicesReconnectTimer: ReturnType<typeof setTimeout> | null = null
let receiptsReconnectAttempts = 0
let devicesReconnectAttempts = 0
let allowReceiptsReconnect = false
let allowDevicesReconnect = false

const RECOVERABLE_STATUSES = new Set(['CHANNEL_ERROR', 'CLOSED', 'TIMED_OUT'])

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function normalizeReceiptItems(items: ReceiptRow['items']): Receipt['items'] {
  if (!Array.isArray(items)) return undefined

  const parsed: ReceiptItem[] = []
  for (const entry of items) {
    if (!entry || typeof entry !== 'object') continue
    const tentative = entry as Partial<ReceiptItem>
    if (typeof tentative.name !== 'string') continue

    const qRaw = 'quantity' in tentative ? (tentative.quantity as unknown) : 1
    const pRaw = 'price' in tentative ? (tentative.price as unknown) : 0
    const tRaw = 'total' in tentative ? (tentative.total as unknown) : undefined

    const quantity = Number.isFinite(Number(qRaw)) ? Number(qRaw) : 1
    const price = Number.isFinite(Number(pRaw)) ? Number(pRaw) : 0
    const total = Number.isFinite(Number(tRaw)) ? Number(tRaw) : Number(price * quantity)

    parsed.push({
      name: tentative.name.trim(),
      quantity,
      price,
      total: Number.isFinite(total) ? total : 0,
    })
  }

  return parsed.length ? parsed : undefined
}

function coerceDate(input: unknown, fallback?: Date): Date {
  const d = new Date(String(input))
  return Number.isNaN(d.getTime()) ? fallback ?? new Date() : d
}

function isRemoteNewer(remoteUpdatedAt: unknown, localUpdated?: Date): boolean {
  const r = coerceDate(remoteUpdatedAt)
  if (!localUpdated) return true
  return r.getTime() > localUpdated.getTime()
}

function parseReceiptRow(row: ReceiptRow): Receipt | null {
  const parsedId = Number(row.id)
  if (!Number.isFinite(parsedId)) {
    syncLogger.warn('Skipping receipt with invalid ID from Supabase', row)
    return null
  }

  const parsedDate = coerceDate(row.date)
  const createdAt = coerceDate(row.created_at, parsedDate)
  const updatedAt = coerceDate(row.updated_at, parsedDate)

  const receipt: Receipt = {
    id: parsedId,
    merchantName: row.vendor ?? 'Nepoznato',
    pib: row.pib ?? '',
    date: parsedDate,
    time: parsedDate.toISOString().slice(11, 16), // HH:mm
    totalAmount: row.total_amount ?? 0,
    category: row.category ?? '',
    createdAt,
    updatedAt,
    syncStatus: 'synced',
  }

  if (typeof row.vat_amount === 'number') receipt.vatAmount = row.vat_amount
  const items = normalizeReceiptItems(row.items)
  if (items) receipt.items = items
  if (row.notes) receipt.notes = row.notes
  if (row.qr_data) receipt.qrLink = row.qr_data
  if (row.image_url) receipt.imageUrl = row.image_url
  if (row.pdf_url) receipt.pdfUrl = row.pdf_url

  return receipt
}

function parseDeviceRow(row: DeviceRow): Device | null {
  const parsedId = Number(row.id)
  if (!Number.isFinite(parsedId)) {
    syncLogger.warn('Skipping device with invalid ID from Supabase', row)
    return null
  }

  const purchaseDate = coerceDate(row.purchase_date)
  const warrantyExpiry = coerceDate(row.warranty_expiry, purchaseDate)
  const createdAt = coerceDate(row.created_at, purchaseDate)
  const updatedAt = coerceDate(row.updated_at, purchaseDate)

  const attachments = Array.isArray(row.attachments)
    ? row.attachments.filter((v): v is string => typeof v === 'string')
    : undefined

  const device: Device = {
    id: parsedId,
    brand: row.brand ?? 'Unknown',
    model: row.model ?? 'Unknown',
    category: row.category ?? 'other',
    purchaseDate,
    warrantyDuration: row.warranty_duration ?? 0,
    warrantyExpiry,
    status: row.status ?? 'active',
    reminders: [],
    createdAt,
    updatedAt,
    syncStatus: 'synced',
  }

  if (row.serial_number) device.serialNumber = row.serial_number
  if (row.image_url) device.imageUrl = row.image_url
  if (row.warranty_terms) device.warrantyTerms = row.warranty_terms
  if (row.service_center_name) device.serviceCenterName = row.service_center_name
  if (row.service_center_address) device.serviceCenterAddress = row.service_center_address
  if (row.service_center_phone) device.serviceCenterPhone = row.service_center_phone
  if (row.service_center_hours) device.serviceCenterHours = row.service_center_hours
  if (attachments && attachments.length) device.attachments = attachments

  if (row.receipt_id && Number.isFinite(Number(row.receipt_id))) {
    device.receiptId = Number(row.receipt_id)
  }

  return device
}

async function upsertLocalReceiptIfNewer(row: ReceiptRow) {
  const parsed = parseReceiptRow(row)
  if (!parsed || parsed.id === undefined) return
  const existing = await db.receipts.get(parsed.id)
  if (!existing || isRemoteNewer(row.updated_at, existing.updatedAt)) {
    await db.receipts.put(parsed)
    syncLogger.log(`✓ Local receipt #${parsed.id} upserted (newer)`)
  } else {
    syncLogger.log(`↷ Ignored older remote receipt #${parsed.id}`)
  }
}

async function upsertLocalDeviceIfNewer(row: DeviceRow) {
  const parsed = parseDeviceRow(row)
  if (!parsed || parsed.id === undefined) return
  const existing = await db.devices.get(parsed.id)
  if (!existing || isRemoteNewer(row.updated_at, existing.updatedAt)) {
    await db.devices.put(parsed)
    syncLogger.log(`✓ Local device #${parsed.id} upserted (newer)`)
  } else {
    syncLogger.log(`↷ Ignored older remote device #${parsed.id}`)
  }
}

async function cascadeDeleteLocalReceipt(id: number) {
  // Delete devices linked to this receipt (hooks handle reminders)
  const childDeviceIds = await db.devices.where('receiptId').equals(id).primaryKeys()
  if (childDeviceIds.length) {
    await db.devices.bulkDelete(childDeviceIds as number[])
    syncLogger.log(`ⓘ Cascade-deleted ${childDeviceIds.length} device(s) for receipt #${id}`)
  }
  await db.receipts.delete(id)
}

// ─────────────────────────────────────────────────────────────
// Upload local → Supabase
// ─────────────────────────────────────────────────────────────

export async function syncToSupabase(item: SyncQueue): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  const { entityType, entityId, operation } = item
  syncLogger.log(`Syncing ${operation} ${entityType} #${entityId} → Supabase`)

  try {
    if (entityType === 'receipt') {
      const receipt = await db.receipts.get(entityId)
      if (!receipt && operation !== 'delete') {
        syncLogger.warn(`Receipt #${entityId} not found in IndexedDB`)
        return
      }

      const itemsPayload: Json | null = receipt?.items?.length
        ? (receipt.items.map((i) => ({ ...i })) as Json)
        : null

      const supabaseData: ReceiptInsert = {
        user_id: user.id,
        vendor: receipt?.merchantName ?? null,
        pib: receipt?.pib ?? null,
        date: receipt ? receipt.date.toISOString() : new Date().toISOString(),
        total_amount: receipt?.totalAmount ?? 0,
        vat_amount: receipt?.vatAmount ?? null,
        category: receipt?.category ?? null,
        items: itemsPayload,
        image_url: receipt?.imageUrl ?? null,
        pdf_url: receipt?.pdfUrl ?? null,
        qr_data: receipt?.qrLink ?? null,
        notes: receipt?.notes ?? null,
        updated_at: receipt?.updatedAt?.toISOString() ?? new Date().toISOString(),
        created_at: receipt?.createdAt?.toISOString() ?? new Date().toISOString(),
      }
      if (entityId !== undefined) supabaseData.id = String(entityId)

      if (operation === 'create' || operation === 'update') {
        const { error } = await supabase.from('receipts').upsert<ReceiptUpsert>(supabaseData, {
          onConflict: 'id',
        })
        if (error) throw error
      } else if (operation === 'delete') {
        const { error } = await supabase.from('receipts').delete().eq('id', String(entityId))
        if (error) throw error
      }
    } else if (entityType === 'device') {
      const device = await db.devices.get(entityId)
      if (!device && operation !== 'delete') {
        syncLogger.warn(`Device #${entityId} not found in IndexedDB`)
        return
      }

      const supabaseData: DeviceInsert = {
        user_id: user.id,
        receipt_id: device?.receiptId !== undefined ? String(device.receiptId) : null,
        brand: device?.brand ?? 'Unknown',
        model: device?.model ?? 'Unknown',
        category: device?.category ?? 'other',
        serial_number: device?.serialNumber ?? null,
        image_url: device?.imageUrl ?? null,
        purchase_date: device?.purchaseDate?.toISOString() ?? new Date().toISOString(),
        warranty_duration: device?.warrantyDuration ?? 0,
        warranty_expiry: device?.warrantyExpiry?.toISOString() ?? new Date().toISOString(),
        warranty_terms: device?.warrantyTerms ?? null,
        status: device?.status ?? 'active',
        service_center_name: device?.serviceCenterName ?? null,
        service_center_address: device?.serviceCenterAddress ?? null,
        service_center_phone: device?.serviceCenterPhone ?? null,
        service_center_hours: device?.serviceCenterHours ?? null,
        attachments: device?.attachments && device.attachments.length ? device.attachments : null,
        updated_at: device?.updatedAt?.toISOString() ?? new Date().toISOString(),
        created_at: device?.createdAt?.toISOString() ?? new Date().toISOString(),
      }
      if (entityId !== undefined) supabaseData.id = String(entityId)

      if (operation === 'create' || operation === 'update') {
        const { error } = await supabase.from('devices').upsert<DeviceUpsert>(supabaseData, {
          onConflict: 'id',
        })
        if (error) throw error
      } else if (operation === 'delete') {
        const { error } = await supabase.from('devices').delete().eq('id', String(entityId))
        if (error) throw error
      }
    }

    syncLogger.log(`✓ Synced ${entityType} #${entityId} → Supabase`)
  } catch (error) {
    syncLogger.error(`✗ Failed to sync ${entityType} #${entityId}:`, error)
    throw error
  }
}

// ─────────────────────────────────────────────────────────────
// Download remote → IndexedDB
// ─────────────────────────────────────────────────────────────

export async function syncFromSupabase(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    syncLogger.warn('Cannot sync from Supabase – user not authenticated')
    return
  }

  syncLogger.log('Downloading data from Supabase…')

  try {
    // Receipts
    const { data: receipts, error: rErr } = await supabase
      .from('receipts')
      .select('*')
      .eq('user_id', user.id)

    if (rErr) throw rErr

    const remoteReceipts = (receipts ?? []) as ReceiptRow[]
    const remoteIds = new Set<number>()

    await db.transaction('rw', db.receipts, async () => {
      for (const row of remoteReceipts) {
        const parsed = parseReceiptRow(row)
        if (!parsed || parsed.id === undefined) continue
        remoteIds.add(parsed.id)
        const existing = await db.receipts.get(parsed.id)
        if (!existing || isRemoteNewer(row.updated_at, existing.updatedAt)) {
          await db.receipts.put(parsed)
        }
      }

      // Remove stale *synced* locals that no longer exist remotely
      const staleIds = await db.receipts
        .where('syncStatus')
        .equals('synced')
        .and((r) => r.id !== undefined && !remoteIds.has(Number(r.id)))
        .primaryKeys()
      if (staleIds.length) await db.receipts.bulkDelete(staleIds as number[])
    })

    syncLogger.log(`✓ Synced ${remoteIds.size} receipts from Supabase`)

    // Devices
    const { data: devices, error: dErr } = await supabase
      .from('devices')
      .select('*')
      .eq('user_id', user.id)

    if (dErr) throw dErr

    const remoteDevices = (devices ?? []) as DeviceRow[]
    const deviceIds = new Set<number>()

    await db.transaction('rw', db.devices, async () => {
      for (const row of remoteDevices) {
        const parsed = parseDeviceRow(row)
        if (!parsed || parsed.id === undefined) continue
        deviceIds.add(parsed.id)
        const existing = await db.devices.get(parsed.id)
        if (!existing || isRemoteNewer(row.updated_at, existing.updatedAt)) {
          await db.devices.put(parsed)
        }
      }

      const staleDeviceIds = await db.devices
        .where('syncStatus')
        .equals('synced')
        .and((d) => d.id !== undefined && !deviceIds.has(Number(d.id)))
        .primaryKeys()
      if (staleDeviceIds.length) await db.devices.bulkDelete(staleDeviceIds as number[])
    })

    syncLogger.log(`✓ Synced ${deviceIds.size} devices from Supabase`)
  } catch (error) {
    syncLogger.error('Failed to sync from Supabase:', error)
    throw error
  }
}

// ─────────────────────────────────────────────────────────────
// Realtime subscriptions (INSERT/UPDATE/DELETE)
// ─────────────────────────────────────────────────────────────

export async function subscribeToRealtimeUpdates(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    syncLogger.warn('Cannot subscribe to realtime – user not authenticated')
    return
  }

  await unsubscribeFromRealtime()
  allowReceiptsReconnect = true
  allowDevicesReconnect = true
  receiptsReconnectAttempts = 0
  devicesReconnectAttempts = 0
  syncLogger.log('Subscribing to Supabase Realtime…')

  const subscribeReceipts = () => {
    if (!allowReceiptsReconnect) return

    if (receiptsChannel) {
      void supabase.removeChannel(receiptsChannel)
      receiptsChannel = null
    }

    receiptsChannel = supabase
      .channel('receipts_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'receipts', filter: `user_id=eq.${user.id}` },
        async (payload) => {
          try {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const row = payload.new as ReceiptRow
              await upsertLocalReceiptIfNewer(row)
            } else if (payload.eventType === 'DELETE') {
              const oldRow = payload.old as ReceiptRow
              const id = Number(oldRow?.id)
              if (Number.isFinite(id)) {
                await cascadeDeleteLocalReceipt(id)
                syncLogger.log(`✓ Local receipt #${id} deleted (realtime)`) 
              }
            }
          } catch (e) {
            syncLogger.error('Realtime receipt handler failed:', e)
          }
        }
      )
      .subscribe((status) => {
        syncLogger.log('Receipts channel status:', status)
        if (status === 'SUBSCRIBED') {
          receiptsReconnectAttempts = 0
          if (receiptsReconnectTimer) {
            clearTimeout(receiptsReconnectTimer)
            receiptsReconnectTimer = null
          }
          return
        }

        if (!allowReceiptsReconnect || !RECOVERABLE_STATUSES.has(status)) return

        const attempt = (receiptsReconnectAttempts += 1)
        const delay = Math.min(
          BACKOFF_BASE_DELAY_MS * 2 ** (attempt - 1),
          BACKOFF_MAX_DELAY_MS
        )
        if (receiptsReconnectTimer) {
          clearTimeout(receiptsReconnectTimer)
        }
        syncLogger.warn(`Receipts channel ${status}. Retrying in ${delay}ms (attempt #${attempt})`)
        receiptsReconnectTimer = setTimeout(() => {
          receiptsReconnectTimer = null
          if (allowReceiptsReconnect) subscribeReceipts()
        }, delay)
      })
  }

  const subscribeDevices = () => {
    if (!allowDevicesReconnect) return

    if (devicesChannel) {
      void supabase.removeChannel(devicesChannel)
      devicesChannel = null
    }

    devicesChannel = supabase
      .channel('devices_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'devices', filter: `user_id=eq.${user.id}` },
        async (payload) => {
          try {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const row = payload.new as DeviceRow
              await upsertLocalDeviceIfNewer(row)
            } else if (payload.eventType === 'DELETE') {
              const oldRow = payload.old as DeviceRow
              const id = Number(oldRow?.id)
              if (Number.isFinite(id)) {
                await db.devices.delete(id)
                syncLogger.log(`✓ Local device #${id} deleted (realtime)`) 
              }
            }
          } catch (e) {
            syncLogger.error('Realtime device handler failed:', e)
          }
        }
      )
      .subscribe((status) => {
        syncLogger.log('Devices channel status:', status)
        if (status === 'SUBSCRIBED') {
          devicesReconnectAttempts = 0
          if (devicesReconnectTimer) {
            clearTimeout(devicesReconnectTimer)
            devicesReconnectTimer = null
          }
          return
        }

        if (!allowDevicesReconnect || !RECOVERABLE_STATUSES.has(status)) return

        const attempt = (devicesReconnectAttempts += 1)
        const delay = Math.min(
          BACKOFF_BASE_DELAY_MS * 2 ** (attempt - 1),
          BACKOFF_MAX_DELAY_MS
        )
        if (devicesReconnectTimer) {
          clearTimeout(devicesReconnectTimer)
        }
        syncLogger.warn(`Devices channel ${status}. Retrying in ${delay}ms (attempt #${attempt})`)
        devicesReconnectTimer = setTimeout(() => {
          devicesReconnectTimer = null
          if (allowDevicesReconnect) subscribeDevices()
        }, delay)
      })
  }

  subscribeReceipts()
  subscribeDevices()

  syncLogger.log('✓ Subscribed to Supabase Realtime')
}

export async function unsubscribeFromRealtime(): Promise<void> {
  allowReceiptsReconnect = false
  allowDevicesReconnect = false

  if (receiptsReconnectTimer) {
    clearTimeout(receiptsReconnectTimer)
    receiptsReconnectTimer = null
  }

  if (devicesReconnectTimer) {
    clearTimeout(devicesReconnectTimer)
    devicesReconnectTimer = null
  }

  receiptsReconnectAttempts = 0
  devicesReconnectAttempts = 0

  const ops: Promise<unknown>[] = []
  if (receiptsChannel) ops.push(supabase.removeChannel(receiptsChannel))
  if (devicesChannel) ops.push(supabase.removeChannel(devicesChannel))
  receiptsChannel = null
  devicesChannel = null
  if (ops.length) await Promise.allSettled(ops)
  syncLogger.log('Unsubscribed from Supabase Realtime')
}

// ─────────────────────────────────────────────────────────────
// Init & Online helpers
// ─────────────────────────────────────────────────────────────

/**
 * Initialize realtime sync and attach online listeners.
 *
 * @param opts.processQueue Optional callback to process the local outbox
 */
export function initRealtimeSync(opts?: { processQueue?: () => Promise<unknown> }) {
  const boot = async () => {
    try {
      await syncFromSupabase()
      await subscribeToRealtimeUpdates()
      if (opts?.processQueue) await opts.processQueue()
    } catch (e) {
      syncLogger.error('Initial realtime setup failed:', e)
    }
  }

  // Kickoff
  void boot()

  // Auto re-run when back online
  const onOnline = () => void boot()
  window.addEventListener('online', onOnline)

  // Optional: refresh when tab gains focus (stale after sleep)
  const onVisible = () => {
    if (document.visibilityState === 'visible') void boot()
  }
  document.addEventListener('visibilitychange', onVisible)

  return () => {
    window.removeEventListener('online', onOnline)
    document.removeEventListener('visibilitychange', onVisible)
    void unsubscribeFromRealtime()
  }
}
