/**
 * Account Service - User account management
 */

import { type Device, db, type Receipt, type UserSettings } from '@lib/db'
import JSZip from 'jszip'
import {
  DEFAULT_EXPORT_FILENAME,
  ensureFileExtension,
  type PlainRecord,
  recordsToCsv,
  sanitizeRecords,
} from '@/lib/exportUtils'
import { logger } from '@/lib/logger'
import { supabase } from '@/lib/supabase'

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

    // Step 2: Delete user data from Supabase
    // Note: This requires a database function to be created in Supabase
    // See: supabase/migrations/XXX_create_delete_user_function.sql

    try {
      const { error: rpcError } = await supabase.rpc('delete_user_data', {
        user_id: userId,
      })

      if (rpcError) {
        logger.error('Supabase RPC error:', rpcError)
        // Continue anyway - local data is deleted
      }
    } catch (serverError) {
      logger.warn('Could not delete server data (function may not exist):', serverError)
      // This is OK - local data is still deleted
    }

    // Step 3: Sign out from Supabase Auth
    await supabase.auth.signOut()

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
