import Papa from 'papaparse'

export type PlainRecord = Record<string, unknown>

export interface CsvOptions {
  readonly fields?: string[]
}

export const DEFAULT_EXPORT_FILENAME = 'fiskalni-racun-export'

export function sanitizeRecords<T extends Record<string, unknown>>(records: T[]): PlainRecord[] {
  return records.map((record) => sanitizeRecord(record))
}

function sanitizeRecord(record: Record<string, unknown>): PlainRecord {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, sanitizeValue(value)])
  )
}

function sanitizeValue(value: unknown): unknown {
  if (value === undefined) return null
  if (value === null) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'bigint') return value.toString()
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item))
  if (value instanceof Set) return Array.from(value).map((item) => sanitizeValue(item))
  if (value instanceof Map)
    return Object.fromEntries(
      Array.from(value.entries()).map(([key, entryValue]) => [key, sanitizeValue(entryValue)])
    )
  if (value instanceof File) return value.name
  if (value instanceof Blob) return '[blob]'
  if (typeof value === 'object' && value !== null)
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [
        key,
        sanitizeValue(entryValue),
      ])
    )
  return value
}

export function recordsToCsv(records: PlainRecord[], options?: CsvOptions): string {
  if (records.length === 0) return ''

  const fields = options?.fields ?? collectFields(records)
  const data = records.map((record) => fields.map((field) => formatCsvValue(record[field])))

  return Papa.unparse({ fields, data, newline: '\r\n' })
}

function collectFields(records: PlainRecord[]): string[] {
  const fields = new Set<string>()
  for (const record of records) {
    for (const key of Object.keys(record)) {
      fields.add(key)
    }
  }
  return Array.from(fields)
}

function formatCsvValue(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function ensureFileExtension(filename: string, extension: string): string {
  const trimmed = filename.trim()

  const normalizedExtension = normalizeExtension(extension)
  if (!trimmed) return `${DEFAULT_EXPORT_FILENAME}${normalizedExtension}`
  const lowerName = trimmed.toLowerCase()

  if (lowerName.endsWith(normalizedExtension.toLowerCase())) return trimmed

  return `${trimmed}${normalizedExtension}`
}

function normalizeExtension(extension: string): string {
  const withDot = extension.startsWith('.') ? extension : `.${extension}`
  return withDot.toLowerCase()
}

// ────────────────────────────────────────────────────────────────────────────────
// Fiscal Receipts & Household Bills Export
// ────────────────────────────────────────────────────────────────────────────────

import type { HouseholdBill, Receipt } from '@lib/db'
import { format } from 'date-fns'

export type ExportReceiptRow = {
  merchant_name: string
  pib: string
  date: string
  time: string
  amount: string
  category: string
  notes: string
  [key: string]: unknown
}

export type ExportHouseholdBillRow = {
  provider: string
  bill_type: string
  account_number: string
  amount: string
  billing_period_start: string
  billing_period_end: string
  due_date: string
  payment_date: string
  status: string
  consumption_value: string
  consumption_unit: string
  notes: string
  [key: string]: unknown
}

/**
 * Format fiscal receipt for CSV export
 */
export function formatReceiptForExport(receipt: Receipt): ExportReceiptRow {
  return {
    merchant_name: receipt.merchantName || '',
    pib: receipt.pib || '',
    date: receipt.date ? format(new Date(receipt.date), 'yyyy-MM-dd') : '',
    time: receipt.time || '',
    amount: receipt.totalAmount.toFixed(2),
    category: receipt.category || '',
    notes: receipt.notes || '',
  }
}

/**
 * Format household bill for CSV export
 */
export function formatHouseholdBillForExport(bill: HouseholdBill): ExportHouseholdBillRow {
  return {
    provider: bill.provider || '',
    bill_type: bill.billType || '',
    account_number: bill.accountNumber || '',
    amount: bill.amount.toFixed(2),
    billing_period_start: bill.billingPeriodStart
      ? format(new Date(bill.billingPeriodStart), 'yyyy-MM-dd')
      : '',
    billing_period_end: bill.billingPeriodEnd
      ? format(new Date(bill.billingPeriodEnd), 'yyyy-MM-dd')
      : '',
    due_date: bill.dueDate ? format(new Date(bill.dueDate), 'yyyy-MM-dd') : '',
    payment_date: bill.paymentDate ? format(new Date(bill.paymentDate), 'yyyy-MM-dd') : '',
    status: bill.status || '',
    consumption_value: bill.consumption?.value?.toString() || '',
    consumption_unit: bill.consumption?.unit || '',
    notes: bill.notes || '',
  }
}

/**
 * Export fiscal receipts to CSV
 */
export function exportReceiptsToCSV(receipts: Receipt[]): string {
  const rows = receipts.map(formatReceiptForExport)
  return recordsToCsv(rows as PlainRecord[])
}

/**
 * Export household bills to CSV
 */
export function exportHouseholdBillsToCSV(bills: HouseholdBill[]): string {
  const rows = bills.map(formatHouseholdBillForExport)
  return recordsToCsv(rows as PlainRecord[])
}

/**
 * Trigger browser download of CSV data
 */
export function downloadCSV(csvData: string, filename: string): void {
  const blob = new Blob(['\uFEFF' + csvData], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = ensureFileExtension(filename, '.csv')
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
