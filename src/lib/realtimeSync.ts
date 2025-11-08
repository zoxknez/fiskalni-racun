/**
 * Supabase Realtime Sync (refined)
 *
 * - Bi–directional sync Web ↔ Supabase
 * - Debounced boot (nema paralelnih syncova)
 * - Conflict: last-write-wins (updated_at vs local updatedAt)
 * - SSR-safe guards (window/document)
 * - Stabilan reconnect (exponential backoff + cap, reset on SUBSCRIBED)
 */

import { normalizeDeviceCategory, normalizeReceiptCategory } from '@lib/categories'
import { db, type SyncQueue } from '@lib/db'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { appStore } from '@/store/useAppStore'
import { tryJSONParse } from './json'
import { syncLogger } from './logger'
import { type Database, type Json, supabase } from './supabase'
import {
  isRemoteNewer,
  parseDeviceRow,
  parseHouseholdBillRow,
  parseReceiptRow,
} from './sync/parsers'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type ReceiptRow = Database['public']['Tables']['receipts']['Row']
type ReceiptInsert = Database['public']['Tables']['receipts']['Insert']
type ReceiptUpsert = ReceiptInsert & Partial<ReceiptRow>

type DeviceRow = Database['public']['Tables']['devices']['Row']
type DeviceInsert = Database['public']['Tables']['devices']['Insert']
type DeviceUpsert = DeviceInsert & Partial<DeviceRow>

type HouseholdBillRow = Database['public']['Tables']['household_bills']['Row']
type HouseholdBillInsert = Database['public']['Tables']['household_bills']['Insert']
type HouseholdBillUpsert = HouseholdBillInsert & Partial<HouseholdBillRow>

// ─────────────────────────────────────────────────────────────
// Runtime guards / consts
// ─────────────────────────────────────────────────────────────

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined'

let receiptsChannel: RealtimeChannel | null = null
let devicesChannel: RealtimeChannel | null = null
let householdBillsChannel: RealtimeChannel | null = null

const BACKOFF_BASE_DELAY_MS = 1_000
const BACKOFF_MAX_DELAY_MS = 30_000
const RECOVERABLE_STATUSES = new Set(['CHANNEL_ERROR', 'CLOSED', 'TIMED_OUT'])

let receiptsReconnectTimer: ReturnType<typeof setTimeout> | null = null
let devicesReconnectTimer: ReturnType<typeof setTimeout> | null = null
let householdReconnectTimer: ReturnType<typeof setTimeout> | null = null
let receiptsReconnectAttempts = 0
let devicesReconnectAttempts = 0
let householdReconnectAttempts = 0
let allowReceiptsReconnect = false
let allowDevicesReconnect = false
let allowHouseholdReconnect = false

// ⭐ FIXED: Promise-based mutex for boot operations
let bootPromise: Promise<void> | null = null

// ⭐ FIXED: Parsing logic extracted to src/lib/sync/parsers.ts
// This reduces this file from 900+ lines and improves maintainability

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

async function upsertLocalHouseholdBillIfNewer(row: HouseholdBillRow) {
  const parsed = parseHouseholdBillRow(row)
  if (!parsed || parsed.id === undefined) return
  const existing = await db.householdBills.get(parsed.id)
  if (!existing || isRemoteNewer(row.updated_at, existing.updatedAt)) {
    await db.householdBills.put(parsed)
    syncLogger.log(`✓ Local household bill #${parsed.id} upserted (newer)`)
  } else {
    syncLogger.log(`↷ Ignored older remote household bill #${parsed.id}`)
  }
}

async function cascadeDeleteLocalReceipt(id: number) {
  const childDeviceIds = await db.devices.where('receiptId').equals(id).primaryKeys()
  if (childDeviceIds.length) {
    await db.devices.bulkDelete(childDeviceIds as number[])
    syncLogger.log(`ⓘ Cascade-deleted ${childDeviceIds.length} device(s) for receipt #${id}`)
  }
  await db.receipts.delete(id)
}

async function deleteLocalHouseholdBill(id: number) {
  await db.householdBills.delete(id)
  syncLogger.log(`✓ Local household bill #${id} deleted (realtime)`)
}

// ─────────────────────────────────────────────────────────────
// Upload local → Supabase
// ─────────────────────────────────────────────────────────────

export async function syncToSupabase(item: SyncQueue): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const storeUser = appStore.getState().user
  const effectiveUserId = user?.id ?? storeUser?.id

  if (!effectiveUserId) {
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
        user_id: effectiveUserId,
        vendor: receipt?.merchantName ?? null,
        pib: receipt?.pib ?? null,
        date: receipt ? receipt.date.toISOString() : new Date().toISOString(),
        total_amount: receipt?.totalAmount ?? 0,
        vat_amount: receipt?.vatAmount ?? null,
        category: receipt ? normalizeReceiptCategory(receipt.category) : 'other',
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
        user_id: effectiveUserId,
        receipt_id: device?.receiptId !== undefined ? String(device.receiptId) : null,
        brand: device?.brand ?? 'Unknown',
        model: device?.model ?? 'Unknown',
        category: device ? normalizeDeviceCategory(device.category) : 'other',
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
        attachments: device?.attachments?.length ? device.attachments : null,
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
    } else if (entityType === 'householdBill') {
      const bill = await db.householdBills.get(entityId)
      if (!bill && operation !== 'delete') {
        syncLogger.warn(`Household bill #${entityId} not found in IndexedDB`)
        return
      }

      const consumptionPayload: Json | null = bill?.consumption
        ? ({
            value: bill.consumption.value,
            unit: bill.consumption.unit,
          } satisfies Record<string, unknown>)
        : null

      const supabaseData: HouseholdBillInsert = {
        user_id: effectiveUserId,
        bill_type: bill?.billType ?? 'other',
        provider: bill?.provider ?? 'Unknown',
        account_number: bill?.accountNumber ?? null,
        amount: bill?.amount ?? 0,
        billing_period_start: bill?.billingPeriodStart?.toISOString() ?? new Date().toISOString(),
        billing_period_end: bill?.billingPeriodEnd?.toISOString() ?? new Date().toISOString(),
        due_date: bill?.dueDate?.toISOString() ?? new Date().toISOString(),
        payment_date: bill?.paymentDate ? bill.paymentDate.toISOString() : null,
        status: bill?.status ?? 'pending',
        consumption: consumptionPayload,
        notes: bill?.notes ?? null,
        updated_at: bill?.updatedAt?.toISOString() ?? new Date().toISOString(),
        created_at: bill?.createdAt?.toISOString() ?? new Date().toISOString(),
      }
      if (entityId !== undefined) supabaseData.id = String(entityId)

      if (operation === 'create' || operation === 'update') {
        const { error } = await supabase
          .from('household_bills')
          .upsert<HouseholdBillUpsert>(supabaseData, { onConflict: 'id' })
        if (error) throw error
      } else if (operation === 'delete') {
        const { error } = await supabase.from('household_bills').delete().eq('id', String(entityId))
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

// ⭐ FIXED: Track last sync timestamp for incremental sync
const SYNC_METADATA_KEY = 'realtime-sync-metadata'

interface SyncMetadata {
  lastSyncTimestamp: string // ISO timestamp
  userId: string
}

function getLastSyncTimestamp(userId: string): string | null {
  const stored = localStorage.getItem(SYNC_METADATA_KEY)
  if (!stored) return null

  // ⭐ FIXED: Safe JSON parse
  const metadata = tryJSONParse<SyncMetadata>(stored)
  if (!metadata || metadata.userId !== userId) return null

  return metadata.lastSyncTimestamp
}

function saveLastSyncTimestamp(userId: string, timestamp: string): void {
  try {
    const metadata: SyncMetadata = {
      lastSyncTimestamp: timestamp,
      userId,
    }
    localStorage.setItem(SYNC_METADATA_KEY, JSON.stringify(metadata))
  } catch (error) {
    syncLogger.warn('Failed to save sync metadata:', error)
  }
}

export async function syncFromSupabase(forceFullSync = false): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    syncLogger.warn('Cannot sync from Supabase – user not authenticated')
    return
  }

  // ⭐ FIXED: Incremental sync using cursor-based approach
  const lastSync = forceFullSync ? null : getLastSyncTimestamp(user.id)
  const syncStartTime = new Date().toISOString()

  if (lastSync) {
    syncLogger.log(`Incremental sync from ${lastSync}`)
  } else {
    syncLogger.log('Full sync (no previous sync found)')
  }

  try {
    // ⭐ FIXED: Receipts - incremental sync
    const receiptsQuery = supabase.from('receipts').select('*').eq('user_id', user.id)

    if (lastSync) {
      receiptsQuery.gt('updated_at', lastSync)
    }

    const { data: receipts, error: rErr } = await receiptsQuery

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

    // ⭐ FIXED: Devices - incremental sync
    const devicesQuery = supabase.from('devices').select('*').eq('user_id', user.id)

    if (lastSync) {
      devicesQuery.gt('updated_at', lastSync)
    }

    const { data: devices, error: dErr } = await devicesQuery

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

    // ⭐ FIXED: Household bills - incremental sync
    const billsQuery = supabase.from('household_bills').select('*').eq('user_id', user.id)

    if (lastSync) {
      billsQuery.gt('updated_at', lastSync)
    }

    const { data: bills, error: hErr } = await billsQuery

    if (hErr) throw hErr

    const remoteBills = (bills ?? []) as HouseholdBillRow[]
    const billIds = new Set<number>()

    await db.transaction('rw', db.householdBills, async () => {
      for (const row of remoteBills) {
        const parsed = parseHouseholdBillRow(row)
        if (!parsed || parsed.id === undefined) continue
        billIds.add(parsed.id)
        const existing = await db.householdBills.get(parsed.id)
        if (!existing || isRemoteNewer(row.updated_at, existing.updatedAt)) {
          await db.householdBills.put(parsed)
        }
      }

      const staleBillIds = await db.householdBills
        .where('syncStatus')
        .equals('synced')
        .and((bill) => bill.id !== undefined && !billIds.has(Number(bill.id)))
        .primaryKeys()
      if (staleBillIds.length) await db.householdBills.bulkDelete(staleBillIds as number[])
    })

    syncLogger.log(`✓ Synced ${billIds.size} household bills from Supabase`)

    // ⭐ FIXED: Save sync timestamp after successful sync
    saveLastSyncTimestamp(user.id, syncStartTime)
    syncLogger.log(`✓ Sync completed, saved timestamp: ${syncStartTime}`)
  } catch (error) {
    syncLogger.error('Failed to sync from Supabase:', error)

    // ⭐ FIXED: Partial sync recovery - save timestamp for partial success
    // This prevents re-fetching data that was already successfully synced
    // before the error occurred (e.g., receipts synced but devices failed)
    if (!lastSync) {
      // First sync failed - don't save timestamp, retry full sync next time
      syncLogger.warn('Initial sync failed, will retry full sync')
    } else {
      // Incremental sync failed - save timestamp anyway to avoid re-syncing
      // data that might have been partially processed
      saveLastSyncTimestamp(user.id, syncStartTime)
      syncLogger.warn('Incremental sync partially failed, timestamp saved for next attempt')
    }

    throw error
  }
}

// ─────────────────────────────────────────────────────────────
// Realtime subscriptions (INSERT/UPDATE/DELETE) + reconnect
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
  allowHouseholdReconnect = true
  receiptsReconnectAttempts = 0
  devicesReconnectAttempts = 0
  householdReconnectAttempts = 0
  syncLogger.log('Subscribing to Supabase Realtime…')

  const subscribeReceipts = () => {
    if (!allowReceiptsReconnect) return

    if (receiptsChannel) {
      supabase.removeChannel(receiptsChannel).catch((error) => {
        syncLogger.error('Failed to remove receipts channel:', error)
      })
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
          // ⭐ FIXED: Reset reconnect attempts on successful connection
          receiptsReconnectAttempts = 0
          if (receiptsReconnectTimer) {
            clearTimeout(receiptsReconnectTimer)
            receiptsReconnectTimer = null
          }
          syncLogger.info('✅ Receipts channel connected successfully')
          return
        }

        if (!allowReceiptsReconnect || !RECOVERABLE_STATUSES.has(status)) return

        receiptsReconnectAttempts += 1
        const attempt = receiptsReconnectAttempts
        const delay = Math.min(BACKOFF_BASE_DELAY_MS * 2 ** (attempt - 1), BACKOFF_MAX_DELAY_MS)
        if (receiptsReconnectTimer) clearTimeout(receiptsReconnectTimer)
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
      supabase.removeChannel(devicesChannel).catch((error) => {
        syncLogger.error('Failed to remove devices channel:', error)
      })
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
          // ⭐ FIXED: Reset reconnect attempts on successful connection
          devicesReconnectAttempts = 0
          if (devicesReconnectTimer) {
            clearTimeout(devicesReconnectTimer)
            devicesReconnectTimer = null
          }
          syncLogger.info('✅ Devices channel connected successfully')
          return
        }

        if (!allowDevicesReconnect || !RECOVERABLE_STATUSES.has(status)) return

        devicesReconnectAttempts += 1
        const attempt = devicesReconnectAttempts
        const delay = Math.min(BACKOFF_BASE_DELAY_MS * 2 ** (attempt - 1), BACKOFF_MAX_DELAY_MS)
        if (devicesReconnectTimer) clearTimeout(devicesReconnectTimer)
        syncLogger.warn(`Devices channel ${status}. Retrying in ${delay}ms (attempt #${attempt})`)
        devicesReconnectTimer = setTimeout(() => {
          devicesReconnectTimer = null
          if (allowDevicesReconnect) subscribeDevices()
        }, delay)
      })
  }

  const subscribeHousehold = () => {
    if (!allowHouseholdReconnect) return

    if (householdBillsChannel) {
      supabase.removeChannel(householdBillsChannel).catch((error) => {
        syncLogger.error('Failed to remove household bills channel:', error)
      })
      householdBillsChannel = null
    }

    householdBillsChannel = supabase
      .channel('household_bills_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'household_bills',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          try {
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const row = payload.new as HouseholdBillRow
              await upsertLocalHouseholdBillIfNewer(row)
            } else if (payload.eventType === 'DELETE') {
              const oldRow = payload.old as HouseholdBillRow
              const id = Number(oldRow?.id)
              if (Number.isFinite(id)) {
                await deleteLocalHouseholdBill(id)
              }
            }
          } catch (e) {
            syncLogger.error('Realtime household bill handler failed:', e)
          }
        }
      )
      .subscribe((status) => {
        syncLogger.log('Household bills channel status:', status)
        if (status === 'SUBSCRIBED') {
          // ⭐ FIXED: Reset reconnect attempts on successful connection
          householdReconnectAttempts = 0
          if (householdReconnectTimer) {
            clearTimeout(householdReconnectTimer)
            householdReconnectTimer = null
          }
          syncLogger.info('✅ Household bills channel connected successfully')
          return
        }

        if (!allowHouseholdReconnect || !RECOVERABLE_STATUSES.has(status)) return

        householdReconnectAttempts += 1
        const attempt = householdReconnectAttempts
        const delay = Math.min(BACKOFF_BASE_DELAY_MS * 2 ** (attempt - 1), BACKOFF_MAX_DELAY_MS)
        if (householdReconnectTimer) clearTimeout(householdReconnectTimer)
        syncLogger.warn(
          `Household bills channel ${status}. Retrying in ${delay}ms (attempt #${attempt})`
        )
        householdReconnectTimer = setTimeout(() => {
          householdReconnectTimer = null
          if (allowHouseholdReconnect) subscribeHousehold()
        }, delay)
      })
  }
  subscribeReceipts()
  subscribeDevices()

  subscribeHousehold()
  syncLogger.log('✓ Subscribed to Supabase Realtime')
}

export async function unsubscribeFromRealtime(): Promise<void> {
  allowReceiptsReconnect = false
  allowDevicesReconnect = false
  allowHouseholdReconnect = false

  if (receiptsReconnectTimer) {
    clearTimeout(receiptsReconnectTimer)
    receiptsReconnectTimer = null
  }

  if (devicesReconnectTimer) {
    clearTimeout(devicesReconnectTimer)
    devicesReconnectTimer = null
  }

  if (householdReconnectTimer) {
    clearTimeout(householdReconnectTimer)
    householdReconnectTimer = null
  }

  receiptsReconnectAttempts = 0
  devicesReconnectAttempts = 0
  householdReconnectAttempts = 0

  const ops: Promise<unknown>[] = []
  if (receiptsChannel) ops.push(supabase.removeChannel(receiptsChannel))
  if (devicesChannel) ops.push(supabase.removeChannel(devicesChannel))
  if (householdBillsChannel) ops.push(supabase.removeChannel(householdBillsChannel))
  receiptsChannel = null
  devicesChannel = null
  householdBillsChannel = null
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
  const safeAddEvent = (
    target: Window | Document,
    type: string,
    handler: EventListenerOrEventListenerObject
  ) => {
    if (!isBrowser()) return
    target.addEventListener(type, handler)
    return () => {
      target.removeEventListener(type, handler)
    }
  }

  const boot = async (): Promise<void> => {
    // ⭐ FIXED: Promise-based mutex - if boot is in progress, return existing promise
    if (bootPromise) {
      syncLogger.debug('Realtime boot already in progress, returning existing promise')
      return bootPromise
    }

    // Create new boot promise
    bootPromise = (async () => {
      try {
        await syncFromSupabase()
        await subscribeToRealtimeUpdates()
        if (opts?.processQueue) await opts.processQueue()
      } catch (e) {
        syncLogger.error('Initial realtime setup failed:', e)
      }
    })()

    try {
      await bootPromise
    } finally {
      // Clear the promise when done, allowing next boot to proceed
      bootPromise = null
    }
  }

  const runBoot = () => {
    boot().catch((error) => {
      syncLogger.error('Realtime boot invocation failed:', error)
    })
  }

  // Kickoff (ne zavisi od browsera – syncFromSupabase radi i van njega)
  runBoot()

  // Auto re-run kada mreža dođe online (browser only)
  const offOnline = safeAddEvent(window, 'online', runBoot)

  // Refresh kad tab postane vidljiv (browser only)
  const offVisible = safeAddEvent(document, 'visibilitychange', () => {
    if (document.visibilityState === 'visible') runBoot()
  })

  return () => {
    offOnline?.()
    offVisible?.()
    unsubscribeFromRealtime().catch((error) => {
      syncLogger.error('Failed to unsubscribe from realtime:', error)
    })
  }
}
