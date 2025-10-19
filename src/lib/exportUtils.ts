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
  return extension.startsWith('.') ? extension : `.${extension}`
}
