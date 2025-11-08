/**
 * Supabase Row Parsers
 *
 * Extracts parsing logic from realtimeSync.ts for better maintainability
 * Converts Supabase database rows to IndexedDB entities
 *
 * @module lib/sync/parsers
 */

import { normalizeDeviceCategory, normalizeReceiptCategory } from '@lib/categories'
import type { Device, HouseholdBill, HouseholdConsumption, Receipt, ReceiptItem } from '@lib/db'
import { householdConsumptionUnits } from '@lib/household'
import { syncLogger } from '@/lib/logger'
import type { Database } from '@/lib/supabase'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type ReceiptRow = Database['public']['Tables']['receipts']['Row']
type DeviceRow = Database['public']['Tables']['devices']['Row']
type HouseholdBillRow = Database['public']['Tables']['household_bills']['Row']

// ─────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────

function coerceDate(input: unknown, fallback?: Date): Date {
  const d = new Date(String(input))
  return Number.isNaN(d.getTime()) ? (fallback ?? new Date()) : d
}

function parseReceiptItems(items: ReceiptRow['items']): Receipt['items'] {
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

function parseHouseholdConsumption(consumption: unknown): HouseholdConsumption | undefined {
  if (!consumption || typeof consumption !== 'object' || Array.isArray(consumption)) {
    return undefined
  }

  const payload = consumption as { value?: unknown; unit?: unknown }
  const value = Number(payload.value)
  const unit = typeof payload.unit === 'string' ? payload.unit : undefined

  if (Number.isNaN(value) || !unit) {
    return undefined
  }

  const normalizedUnit = householdConsumptionUnits.includes(
    unit as (typeof householdConsumptionUnits)[number]
  )
    ? (unit as (typeof householdConsumptionUnits)[number])
    : ('other' as (typeof householdConsumptionUnits)[number])

  return {
    value,
    unit: normalizedUnit,
  }
}

// ─────────────────────────────────────────────────────────────
// Receipt Parser
// ─────────────────────────────────────────────────────────────

export function parseReceiptRow(row: ReceiptRow): Receipt | null {
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
  const items = parseReceiptItems(row.items)
  if (items) receipt.items = items
  if (row.notes) receipt.notes = row.notes
  if (row.qr_data) receipt.qrLink = row.qr_data
  if (row.image_url) receipt.imageUrl = row.image_url
  if (row.pdf_url) receipt.pdfUrl = row.pdf_url

  return receipt
}

// ─────────────────────────────────────────────────────────────
// Device Parser
// ─────────────────────────────────────────────────────────────

export function parseDeviceRow(row: DeviceRow): Device | null {
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

// ─────────────────────────────────────────────────────────────
// Household Bill Parser
// ─────────────────────────────────────────────────────────────

export function parseHouseholdBillRow(row: HouseholdBillRow): HouseholdBill | null {
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

  const consumption = parseHouseholdConsumption(row.consumption)
  if (consumption) bill.consumption = consumption

  return bill
}

// ─────────────────────────────────────────────────────────────
// Validation Helpers
// ─────────────────────────────────────────────────────────────

export function isRemoteNewer(remoteUpdatedAt: unknown, localUpdated?: Date): boolean {
  const r = coerceDate(remoteUpdatedAt)
  if (!localUpdated) return true
  return r.getTime() > localUpdated.getTime()
}
