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
import {
  type Device,
  db,
  type HouseholdBill,
  type HouseholdConsumption,
  type Receipt,
  type ReceiptItem,
  type SyncQueue,
} from '@lib/db'
import { householdConsumptionUnits } from '@lib/household'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { appStore } from '@/store/useAppStore'
import { syncLogger } from './logger'
import { type Database, type Json, supabase } from './supabase'

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

// Debounce/lock boot
let bootInFlight = false
let bootQueued = false

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
    const total = Number.isFinite(Number(tRaw))
      ? Number(tRaw)
      : Number.isFinite(price * quantity)
        ? price * quantity
        : 0

    parsed.push({
      name: tentative.name.trim(),
      quantity,
      price,
      total,
    })
  }

  return parsed.length ? parsed : undefined
}

function coerceDate(input: unknown, fallback?: Date): Date {
  const d = new Date(String(input))
  return Number.isNaN(d.getTime()) ? (fallback ?? new Date()) : d
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
    category: normalizeReceiptCategory(row.category ?? 'other'),
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
    category: normalizeDeviceCategory(row.category ?? 'other'),
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
  if (attachments?.length) device.attachments = attachments

  if (row.receipt_id && Number.isFinite(Number(row.receipt_id))) {
    device.receiptId = Number(row.receipt_id)
  }

  return device
}

function parseHouseholdBillRow(row: HouseholdBillRow): HouseholdBill | null {
  const parsedId = Number(row.id)
  if (!Number.isFinite(parsedId)) {
    syncLogger.warn('Skipping household bill with invalid ID from Supabase', row)
    return null
  }

  const dueDate = coerceDate(row.due_date)
  const billingPeriodStart = coerceDate(row.billing_period_start, dueDate)
  const billingPeriodEnd = coerceDate(row.billing_period_end, dueDate)
  const createdAt = coerceDate(row.created_at, dueDate)
  const updatedAt = coerceDate(row.updated_at, createdAt)

  const bill: HouseholdBill = {
    id: parsedId,
    billType: (row.bill_type as HouseholdBill['billType']) ?? 'other',
    provider: row.provider ?? 'Unknown',
    amount: row.amount ?? 0,
    billingPeriodStart,
    billingPeriodEnd,
    dueDate,
    status: (row.status as HouseholdBill['status']) ?? 'pending',
    createdAt,
    updatedAt,
    syncStatus: 'synced',
  }

  if (row.account_number) bill.accountNumber = row.account_number

  if (row.payment_date) bill.paymentDate = coerceDate(row.payment_date)
  if (row.notes) bill.notes = row.notes

  if (row.consumption && typeof row.consumption === 'object' && !Array.isArray(row.consumption)) {
    const payload = row.consumption as { value?: unknown; unit?: unknown }
    const value = Number(payload.value)
    const unit = typeof payload.unit === 'string' ? payload.unit : undefined
    if (!Number.isNaN(value) && unit) {
      const normalizedUnit = householdConsumptionUnits.includes(
        unit as (typeof householdConsumptionUnits)[number]
      )
        ? (unit as (typeof householdConsumptionUnits)[number])
        : ('other' as (typeof householdConsumptionUnits)[number])
      const consumption: HouseholdConsumption = {
        value,
        unit: normalizedUnit,
      }
      bill.consumption = consumption
    }
  }

  return bill
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

    // Household bills
    const { data: bills, error: hErr } = await supabase
      .from('household_bills')
      .select('*')
      .eq('user_id', user.id)

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
  } catch (error) {
    syncLogger.error('Failed to sync from Supabase:', error)
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
          receiptsReconnectAttempts = 0
          if (receiptsReconnectTimer) {
            clearTimeout(receiptsReconnectTimer)
            receiptsReconnectTimer = null
          }
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
          devicesReconnectAttempts = 0
          if (devicesReconnectTimer) {
            clearTimeout(devicesReconnectTimer)
            devicesReconnectTimer = null
          }
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
          householdReconnectAttempts = 0
          if (householdReconnectTimer) {
            clearTimeout(householdReconnectTimer)
            householdReconnectTimer = null
          }
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

  const boot = async () => {
    if (bootInFlight) {
      // debouncing: označi da postoji još jedan zahtev i izađi
      bootQueued = true
      return
    }
    bootInFlight = true
    try {
      await syncFromSupabase()
      await subscribeToRealtimeUpdates()
      if (opts?.processQueue) await opts.processQueue()
    } catch (e) {
      syncLogger.error('Initial realtime setup failed:', e)
    } finally {
      bootInFlight = false
      if (bootQueued) {
        bootQueued = false
        // jedan “rep” posle kratkog odlaganja
        setTimeout(runBoot, 50)
      }
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
