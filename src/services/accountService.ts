/**
 * Account Service - User account management
 */

import {
  type Device,
  db,
  type Receipt,
  type ReceiptItem,
  type Reminder,
  type UserSettings,
} from '@lib/db'
import { scheduleWarrantyReminders } from '@lib/notifications'
import type JSZip from 'jszip'
import {
  DEFAULT_EXPORT_FILENAME,
  ensureFileExtension,
  type PlainRecord,
  recordsToCsv,
  sanitizeRecords,
} from '@/lib/exportUtils'
import { logger } from '@/lib/logger'

type JSZipCtor = typeof import('jszip')

let jszipPromise: Promise<JSZipCtor> | null = null

async function loadJSZip(): Promise<JSZipCtor> {
  if (!jszipPromise) {
    jszipPromise = import('jszip').then((mod) => (mod.default ?? (mod as unknown as JSZipCtor)))
  }
  return jszipPromise
}

export interface DeleteAccountResult {
  success: boolean
  error?: string
}

/**
 * Delete user account and all associated data
 * GDPR compliant - "right to be forgotten"
 */
export async function deleteAccount(userId: string): Promise<DeleteAccountResult> {
  try {
    logger.info('Starting account deletion for user:', userId)

    // Step 1: Delete all local data from IndexedDB
    logger.log('Deleting local IndexedDB data...')

    await Promise.all([
      // Delete all receipts
      db.receipts
        .where('userId')
        .equals(userId)
        .delete(),

      // Delete all devices (cascades to reminders via hook)
      db.devices
        .where('userId')
        .equals(userId)
        .delete(),

      // Delete all settings
      db.settings
        .where('userId')
        .equals(userId)
        .delete(),

      // Clear sync queue
      db.syncQueue.clear(),
    ])

    logger.log('Local data deleted successfully')

    // Note: Server-side data deletion can be implemented via Neon API if needed

    logger.info('Account deletion completed successfully')

    return { success: true }
  } catch (error) {
    logger.error('Account deletion failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Export user data (GDPR - "right to data portability")
 * Returns all user data as JSON
 */
export interface ExportedUserData {
  receipts: Receipt[]
  devices: Device[]
  settings: UserSettings[]
}

type ExportEntity = 'receipts' | 'devices' | 'settings'
type ExportFormat = 'json' | 'csv'

interface SanitizedUserData {
  receipts: PlainRecord[]
  devices: PlainRecord[]
  settings: PlainRecord[]
}

export interface ExportDownloadOptions {
  readonly filename?: string
  readonly include?: ExportEntity[]
}

export interface ExportArchiveOptions extends ExportDownloadOptions {
  readonly includeJson?: boolean
  readonly includeCsv?: boolean
}

const EXPORT_ENTITIES: ExportEntity[] = ['receipts', 'devices', 'settings']

export async function exportUserData(userId: string): Promise<ExportedUserData> {
  logger.info('Exporting user data for:', userId)

  const [receipts, devices, settings] = await Promise.all([
    db.receipts.toArray(),
    db.devices.toArray(),
    db.settings.where('userId').equals(userId).toArray(),
  ])

  return {
    receipts,
    devices,
    settings,
  }
}

/**
 * Download user data as JSON file
 */
export function downloadUserData(
  data: object,
  filename: string = `${DEFAULT_EXPORT_FILENAME}.json`
) {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  downloadBlob(blob, ensureFileExtension(filename, 'json'))
}

export async function downloadUserDataJson(
  userId: string,
  options?: ExportDownloadOptions
): Promise<void> {
  if (!userId) throw new Error('User ID is required to export data')

  const include = normalizeEntities(options?.include)
  const exportedAt = new Date().toISOString()
  const data = await getSanitizedUserData(userId, include)
  const payload = buildJsonPayload(data, include, exportedAt)
  const filename = options?.filename ?? defaultFilename('json', undefined, exportedAt)
  downloadUserData(payload, filename)
}

export async function downloadUserDataCsv(
  userId: string,
  options?: ExportDownloadOptions
): Promise<void> {
  if (!userId) throw new Error('User ID is required to export data')

  const include = normalizeEntities(options?.include)
  const exportedAt = new Date().toISOString()
  const data = await getSanitizedUserData(userId, include)
  const JSZip = await loadJSZip()
  const zip = new JSZip()
  addCsvFilesToZip(zip, data, include)
  zip.file(
    'metadata.json',
    JSON.stringify(buildMetadata(data, include, exportedAt, ['csv']), null, 2)
  )
  const blob = await zip.generateAsync({ type: 'blob' })
  const filename = options?.filename ?? defaultFilename('zip', 'csv', exportedAt)
  downloadBlob(blob, ensureFileExtension(filename, 'zip'))
}

export async function downloadUserDataArchive(
  userId: string,
  options?: ExportArchiveOptions
): Promise<void> {
  if (!userId) throw new Error('User ID is required to export data')

  const includeJson = options?.includeJson ?? true
  const includeCsv = options?.includeCsv ?? true
  if (!includeJson && !includeCsv) {
    throw new Error('At least one export format must be included')
  }

  const include = normalizeEntities(options?.include)
  const exportedAt = new Date().toISOString()
  const data = await getSanitizedUserData(userId, include)
  const JSZip = await loadJSZip()
  const zip = new JSZip()

  if (includeJson) {
    const payload = buildJsonPayload(data, include, exportedAt)
    zip.file('data.json', JSON.stringify(payload, null, 2))
  }

  if (includeCsv) {
    addCsvFilesToZip(zip, data, include)
  }

  const formats: ExportFormat[] = []
  if (includeJson) formats.push('json')
  if (includeCsv) formats.push('csv')

  zip.file(
    'metadata.json',
    JSON.stringify(buildMetadata(data, include, exportedAt, formats), null, 2)
  )

  const blob = await zip.generateAsync({ type: 'blob' })
  const filename = options?.filename ?? defaultFilename('zip', 'bundle', exportedAt)
  downloadBlob(blob, ensureFileExtension(filename, 'zip'))
}

function normalizeEntities(include?: ExportEntity[]): ExportEntity[] {
  if (!include || include.length === 0) return [...EXPORT_ENTITIES]

  const unique = new Set<ExportEntity>()
  for (const entity of include) {
    if (EXPORT_ENTITIES.includes(entity)) {
      unique.add(entity)
    }
  }

  return unique.size > 0 ? Array.from(unique) : [...EXPORT_ENTITIES]
}

async function getSanitizedUserData(
  userId: string,
  include: ExportEntity[]
): Promise<SanitizedUserData> {
  const includeSet = new Set(include)

  const receiptsPromise = includeSet.has('receipts')
    ? db.receipts.toArray()
    : Promise.resolve([] as Receipt[])
  const devicesPromise = includeSet.has('devices')
    ? db.devices.toArray()
    : Promise.resolve([] as Device[])
  const settingsPromise = includeSet.has('settings')
    ? db.settings.where('userId').equals(userId).toArray()
    : Promise.resolve([] as UserSettings[])

  const [receiptsRaw, devicesRaw, settingsRaw] = await Promise.all([
    receiptsPromise,
    devicesPromise,
    settingsPromise,
  ])

  return {
    receipts: includeSet.has('receipts')
      ? sanitizeRecords(receiptsRaw as unknown as PlainRecord[])
      : [],
    devices: includeSet.has('devices')
      ? sanitizeRecords(devicesRaw as unknown as PlainRecord[])
      : [],
    settings: includeSet.has('settings')
      ? sanitizeRecords(settingsRaw as unknown as PlainRecord[])
      : [],
  }
}

function buildJsonPayload(data: SanitizedUserData, include: ExportEntity[], exportedAt: string) {
  return {
    exportedAt,
    version: 1,
    include,
    counts: {
      receipts: data.receipts.length,
      devices: data.devices.length,
      settings: data.settings.length,
    },
    receipts: include.includes('receipts') ? data.receipts : [],
    devices: include.includes('devices') ? data.devices : [],
    settings: include.includes('settings') ? data.settings : [],
  }
}

function addCsvFilesToZip(zip: JSZip, data: SanitizedUserData, include: ExportEntity[]) {
  if (include.includes('receipts')) {
    zip.file('receipts.csv', ensureCsvContent(recordsToCsv(data.receipts)))
  }
  if (include.includes('devices')) {
    zip.file('devices.csv', ensureCsvContent(recordsToCsv(data.devices)))
  }
  if (include.includes('settings')) {
    zip.file('settings.csv', ensureCsvContent(recordsToCsv(data.settings)))
  }
}

function buildMetadata(
  data: SanitizedUserData,
  include: ExportEntity[],
  exportedAt: string,
  formats: ExportFormat[]
) {
  return {
    exportedAt,
    include,
    formats,
    version: 1,
    counts: {
      receipts: include.includes('receipts') ? data.receipts.length : 0,
      devices: include.includes('devices') ? data.devices.length : 0,
      settings: include.includes('settings') ? data.settings.length : 0,
    },
  }
}

function ensureCsvContent(csv: string): string {
  return csv && csv.trim().length > 0 ? csv : 'No data available'
}

function defaultFilename(extension: string, variant?: string, exportedAt?: string): string {
  const date = exportedAt?.slice(0, 10) ?? new Date().toISOString().split('T')[0]
  const suffix = variant ? `-${variant}` : ''
  const base = `${DEFAULT_EXPORT_FILENAME}${suffix}-${date}`
  return ensureFileExtension(base, extension)
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)

  try {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export interface ImportUserDataSummary {
  receipts: number
  devices: number
  reminders: number
  settings: number
}

export interface ImportUserDataOptions {
  /**
   * When true, imported data will be merged with existing data instead of replacing it.
   * Currently merge mode is not supported and behaves the same as replace.
   */
  merge?: boolean
}

export async function importUserDataFromFile(
  userId: string,
  file: File,
  options?: ImportUserDataOptions
): Promise<ImportUserDataSummary> {
  if (!userId) {
    throw new Error('user_required')
  }

  let payload: unknown

  try {
    payload = await parseImportFile(file)
  } catch (error) {
    if (error instanceof Error && error.message === 'unsupported_format') {
      throw error
    }
    logger.error('Failed to read import file', error)
    const message = error instanceof Error ? error.message : 'invalid_payload'
    throw new Error(message)
  }

  try {
    return await applyImportedData(userId, payload, options)
  } catch (error) {
    logger.error('Import failed', error)
    throw error instanceof Error ? error : new Error('import_failed')
  }
}

async function parseImportFile(file: File): Promise<unknown> {
  const lowerName = file.name.toLowerCase()
  const isZip = lowerName.endsWith('.zip') || file.type === 'application/zip'
  const isJson = lowerName.endsWith('.json') || file.type === 'application/json' || !file.type

  if (isZip) {
    try {
      const JSZip = await loadJSZip()
      const zip = await JSZip.loadAsync(file)
      const preferred = ['data.json', 'export.json', 'fiskalni-racun-export.json']
      let entryName = preferred.find((candidate) => !!zip.files[candidate])
      if (!entryName) {
        entryName = Object.keys(zip.files).find((name) => {
          const entry = zip.files[name]
          return entry && !entry.dir && name.toLowerCase().endsWith('.json')
        })
      }
      if (!entryName) {
        throw new Error('unsupported_format')
      }

      const zipEntry = zip.files[entryName]
      if (!zipEntry) {
        throw new Error('unsupported_format')
      }

      const jsonContent = await zipEntry.async('string')
      return JSON.parse(jsonContent)
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('invalid_payload')
      }
      if (error instanceof Error && error.message === 'unsupported_format') {
        throw error
      }
      throw new Error('unsupported_format')
    }
  }

  if (isJson) {
    try {
      const text = await file.text()
      return JSON.parse(text)
    } catch {
      throw new Error('invalid_payload')
    }
  }

  throw new Error('unsupported_format')
}

interface ImportPayload {
  readonly receipts: PlainRecord[]
  readonly devices: PlainRecord[]
  readonly settings: PlainRecord[]
}

async function applyImportedData(
  userId: string,
  rawPayload: unknown,
  options?: ImportUserDataOptions
): Promise<ImportUserDataSummary> {
  const payload = normalizeImportPayload(rawPayload)

  const receipts = payload.receipts
    .map((record) => normalizeReceiptRecord(record))
    .filter((record): record is Receipt => record !== null)

  const devicesResult = normalizeDeviceRecords(payload.devices)
  const devices = devicesResult.devices
  const reminders = devicesResult.reminders

  const settings = dedupeSettings(
    payload.settings
      .map((record) => normalizeSettingsRecord(record, userId))
      .filter((record): record is UserSettings => record !== null)
  )

  await db.transaction('rw', db.receipts, db.devices, db.reminders, db.settings, async () => {
    if (!options?.merge) {
      await db.receipts.clear()
      await db.devices.clear()
      await db.reminders.clear()
      await db.settings.where('userId').equals(userId).delete()
    }

    if (receipts.length > 0) {
      await db.receipts.bulkAdd(receipts)
    }
    if (devices.length > 0) {
      await db.devices.bulkAdd(devices)
    }
    if (reminders.length > 0) {
      await db.reminders.bulkAdd(reminders)
    }
    if (settings.length > 0) {
      for (const setting of settings) {
        await db.settings.add(setting)
      }
    }
  })

  if (!options?.merge) {
    await db.syncQueue.clear()
  }

  for (const device of devices) {
    const reminderDays = reminders
      .filter((reminder) => reminder.deviceId === device.id)
      .map((reminder) => reminder.daysBeforeExpiry)
      .filter((value) => Number.isFinite(value)) as number[]
    scheduleWarrantyReminders(device, reminderDays)
  }

  logger.info('Imported user data', {
    userId,
    receipts: receipts.length,
    devices: devices.length,
    reminders: reminders.length,
    settings: settings.length,
  })

  return {
    receipts: receipts.length,
    devices: devices.length,
    reminders: reminders.length,
    settings: settings.length,
  }
}

function normalizeImportPayload(raw: unknown): ImportPayload {
  if (!raw || typeof raw !== 'object') {
    return { receipts: [], devices: [], settings: [] }
  }

  type PayloadShape = {
    data?: unknown
    receipts?: unknown
    devices?: unknown
    settings?: unknown
  }

  const base = raw as PayloadShape
  const candidate = base.data && typeof base.data === 'object' ? (base.data as PayloadShape) : base

  return {
    receipts: Array.isArray(candidate.receipts)
      ? (candidate.receipts.filter(isPlainRecord) as PlainRecord[])
      : [],
    devices: Array.isArray(candidate.devices)
      ? (candidate.devices.filter(isPlainRecord) as PlainRecord[])
      : [],
    settings: Array.isArray(candidate.settings)
      ? (candidate.settings.filter(isPlainRecord) as PlainRecord[])
      : [],
  }
}

function normalizeReceiptRecord(record: PlainRecord): Receipt | null {
  type ReceiptRaw = {
    id?: unknown
    merchantName?: unknown
    pib?: unknown
    date?: unknown
    time?: unknown
    totalAmount?: unknown
    vatAmount?: unknown
    items?: unknown
    category?: unknown
    notes?: unknown
    qrLink?: unknown
    imageUrl?: unknown
    pdfUrl?: unknown
    createdAt?: unknown
    updatedAt?: unknown
    syncStatus?: unknown
  }

  const raw = record as ReceiptRaw
  const merchantName = toStringSafe(raw.merchantName)
  const date = toDateSafe(raw.date)
  if (!merchantName || !date) {
    return null
  }

  const itemsRaw = Array.isArray(raw.items) ? raw.items : undefined
  const items =
    itemsRaw
      ?.map((item) => normalizeReceiptItem(item))
      .filter((item): item is ReceiptItem => item !== null) ?? []

  const receipt: Receipt = {
    merchantName,
    pib: toStringSafe(raw.pib) ?? '',
    date,
    time: toStringSafe(raw.time) ?? '00:00',
    totalAmount: toNumberSafe(raw.totalAmount),
    category: toStringSafe(raw.category) ?? 'other',
    createdAt: toDateSafe(raw.createdAt) ?? new Date(),
    updatedAt: toDateSafe(raw.updatedAt) ?? new Date(),
    syncStatus: normalizeSyncStatus(raw.syncStatus),
  }

  if (typeof raw.id === 'number') {
    receipt.id = raw.id.toString()
  } else if (typeof raw.id === 'string') {
    receipt.id = raw.id
  }
  if (raw.vatAmount != null) {
    receipt.vatAmount = toNumberSafe(raw.vatAmount)
  }
  if (items.length > 0) {
    receipt.items = items
  }

  const notes = toStringSafe(raw.notes)
  if (notes) receipt.notes = notes

  const qrLink = toStringSafe(raw.qrLink)
  if (qrLink) receipt.qrLink = qrLink

  const imageUrl = toStringSafe(raw.imageUrl)
  if (imageUrl) receipt.imageUrl = imageUrl

  const pdfUrl = toStringSafe(raw.pdfUrl)
  if (pdfUrl) receipt.pdfUrl = pdfUrl

  return receipt
}

function normalizeReceiptItem(value: unknown): ReceiptItem | null {
  if (!isPlainRecord(value)) return null

  type ItemRaw = {
    name?: unknown
    quantity?: unknown
    price?: unknown
    total?: unknown
  }

  const raw = value as ItemRaw
  const name = toStringSafe(raw.name)
  if (!name) return null

  const quantity = toNumberSafe(raw.quantity, 1)
  const price = toNumberSafe(raw.price, 0)
  const total = raw.total != null ? toNumberSafe(raw.total, quantity * price) : quantity * price

  return {
    name,
    quantity,
    price,
    total,
  }
}

function normalizeDeviceRecords(records: PlainRecord[]) {
  const devices: Device[] = []
  const reminders: Reminder[] = []

  for (const record of records) {
    const normalized = normalizeDeviceRecord(record)
    if (!normalized) continue
    devices.push(normalized.device)
    reminders.push(...normalized.reminders)
  }

  return { devices, reminders }
}

function normalizeDeviceRecord(record: PlainRecord): {
  device: Device
  reminders: Reminder[]
} | null {
  type DeviceRaw = {
    id?: unknown
    receiptId?: unknown
    brand?: unknown
    model?: unknown
    category?: unknown
    serialNumber?: unknown
    imageUrl?: unknown
    purchaseDate?: unknown
    warrantyDuration?: unknown
    warrantyExpiry?: unknown
    warrantyTerms?: unknown
    status?: unknown
    serviceCenterName?: unknown
    serviceCenterAddress?: unknown
    serviceCenterPhone?: unknown
    serviceCenterHours?: unknown
    attachments?: unknown
    reminders?: unknown
    createdAt?: unknown
    updatedAt?: unknown
    syncStatus?: unknown
  }

  const raw = record as DeviceRaw
  const brand = toStringSafe(raw.brand) ?? 'Unknown'
  const model = toStringSafe(raw.model) ?? 'Unknown'
  const purchaseDate = toDateSafe(raw.purchaseDate) ?? new Date()
  const duration = Math.max(0, Math.round(toNumberSafe(raw.warrantyDuration, 0)))
  const expiry = toDateSafe(raw.warrantyExpiry) ?? addMonths(purchaseDate, duration)

  const device: Device = {
    brand,
    model,
    category: toStringSafe(raw.category) ?? 'other',
    purchaseDate,
    warrantyDuration: duration,
    warrantyExpiry: expiry,
    status: normalizeDeviceStatus(raw.status, expiry),
    attachments: ensureStringArray(raw.attachments),
    reminders: [],
    createdAt: toDateSafe(raw.createdAt) ?? new Date(),
    updatedAt: toDateSafe(raw.updatedAt) ?? new Date(),
    syncStatus: normalizeSyncStatus(raw.syncStatus),
  }

  if (typeof raw.id === 'number') {
    device.id = raw.id.toString()
  } else if (typeof raw.id === 'string') {
    device.id = raw.id
  }

  if (typeof raw.receiptId === 'number') {
    device.receiptId = raw.receiptId.toString()
  } else if (typeof raw.receiptId === 'string') {
    device.receiptId = raw.receiptId
  }

  const serialNumber = toStringSafe(raw.serialNumber)
  if (serialNumber) device.serialNumber = serialNumber

  const imageUrl = toStringSafe(raw.imageUrl)
  if (imageUrl) device.imageUrl = imageUrl

  const warrantyTerms = toStringSafe(raw.warrantyTerms)
  if (warrantyTerms) device.warrantyTerms = warrantyTerms

  const serviceCenterName = toStringSafe(raw.serviceCenterName)
  if (serviceCenterName) device.serviceCenterName = serviceCenterName

  const serviceCenterAddress = toStringSafe(raw.serviceCenterAddress)
  if (serviceCenterAddress) device.serviceCenterAddress = serviceCenterAddress

  const serviceCenterPhone = toStringSafe(raw.serviceCenterPhone)
  if (serviceCenterPhone) device.serviceCenterPhone = serviceCenterPhone

  const serviceCenterHours = toStringSafe(raw.serviceCenterHours)
  if (serviceCenterHours) device.serviceCenterHours = serviceCenterHours

  const remindersRaw = Array.isArray(raw.reminders) ? raw.reminders : []
  const reminders = remindersRaw
    .map((entry) => normalizeReminderRecord(entry, device.id))
    .filter((entry): entry is Reminder => entry !== null)

  return { device, reminders }
}

function normalizeReminderRecord(value: unknown, fallbackDeviceId?: string): Reminder | null {
  if (!isPlainRecord(value)) return null

  type ReminderRaw = {
    id?: unknown
    deviceId?: unknown
    daysBeforeExpiry?: unknown
    status?: unknown
    sentAt?: unknown
    createdAt?: unknown
  }

  const raw = value as ReminderRaw
  const deviceId =
    typeof raw.deviceId === 'string'
      ? raw.deviceId
      : typeof raw.deviceId === 'number'
        ? raw.deviceId.toString()
        : typeof fallbackDeviceId === 'string'
          ? fallbackDeviceId
          : undefined

  if (typeof deviceId !== 'string') return null

  const reminder: Reminder = {
    deviceId,
    type: 'warranty',
    daysBeforeExpiry: Math.max(0, Math.round(toNumberSafe(raw.daysBeforeExpiry, 0))),
    status: normalizeReminderStatus(raw.status),
    createdAt: toDateSafe(raw.createdAt) ?? new Date(),
  }

  if (typeof raw.id === 'number') {
    reminder.id = raw.id.toString()
  } else if (typeof raw.id === 'string') {
    reminder.id = raw.id
  }
  const sentAt = toDateSafe(raw.sentAt)
  if (sentAt) {
    reminder.sentAt = sentAt
  }

  return reminder
}

function normalizeSettingsRecord(record: PlainRecord, userId: string): UserSettings | null {
  type SettingsRaw = {
    theme?: unknown
    language?: unknown
    notificationsEnabled?: unknown
    emailNotifications?: unknown
    pushNotifications?: unknown
    biometricLock?: unknown
    warrantyExpiryThreshold?: unknown
    warrantyCriticalThreshold?: unknown
    quietHoursStart?: unknown
    quietHoursEnd?: unknown
    updatedAt?: unknown
  }

  const raw = record as SettingsRaw

  const settings: UserSettings = {
    userId,
    theme: normalizeTheme(raw.theme),
    language: normalizeLanguage(raw.language),
    notificationsEnabled: toBooleanSafe(raw.notificationsEnabled, true),
    emailNotifications: toBooleanSafe(raw.emailNotifications, true),
    pushNotifications: toBooleanSafe(raw.pushNotifications, true),
    biometricLock: toBooleanSafe(raw.biometricLock, false),
    warrantyExpiryThreshold: Math.max(1, Math.round(toNumberSafe(raw.warrantyExpiryThreshold, 30))),
    warrantyCriticalThreshold: Math.max(
      1,
      Math.round(toNumberSafe(raw.warrantyCriticalThreshold, 7))
    ),
    quietHoursStart: toStringSafe(raw.quietHoursStart) ?? '22:00',
    quietHoursEnd: toStringSafe(raw.quietHoursEnd) ?? '07:00',
    updatedAt: toDateSafe(raw.updatedAt) ?? new Date(),
  }

  return settings
}

function dedupeSettings(settings: UserSettings[]): UserSettings[] {
  const byUser = new Map<string, UserSettings>()
  for (const setting of settings) {
    byUser.set(setting.userId, setting)
  }
  return Array.from(byUser.values())
}

function toStringSafe(value: unknown): string | undefined {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return undefined
}

function toNumberSafe(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function toBooleanSafe(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'yes', 'y'].includes(normalized)) return true
    if (['false', '0', 'no', 'n'].includes(normalized)) return false
  }
  return fallback
}

function toDateSafe(value: unknown): Date | undefined {
  if (value instanceof Date) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date
  }
  return undefined
}

function ensureStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => toStringSafe(entry))
    .filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
}

function normalizeSyncStatus(value: unknown): 'pending' | 'synced' | 'error' {
  if (value === 'pending' || value === 'synced' || value === 'error') return value
  return 'pending'
}

function normalizeDeviceStatus(value: unknown, expiry: Date): Device['status'] {
  if (value === 'in-service') return 'in-service'
  if (value === 'active' || value === 'expired') return value
  return expiry.getTime() >= Date.now() ? 'active' : 'expired'
}

function normalizeReminderStatus(value: unknown): Reminder['status'] {
  if (value === 'sent' || value === 'dismissed') return value
  return 'pending'
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  const targetMonth = result.getMonth() + months
  result.setMonth(targetMonth)
  return result
}

function normalizeTheme(value: unknown): UserSettings['theme'] {
  if (value === 'light' || value === 'dark' || value === 'system') return value
  if (value === 'auto') return 'system'
  return 'system'
}

function normalizeLanguage(value: unknown): UserSettings['language'] {
  if (value === 'sr' || value === 'en') return value
  if (typeof value === 'string' && value.toLowerCase().startsWith('sr')) return 'sr'
  return 'en'
}

function isPlainRecord(value: unknown): value is PlainRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
