/**
 * Sync Pull API Handler
 *
 * Retrieves all user data from the server database for syncing to a new device.
 * This enables bidirectional synchronization - users can pull their data
 * when logging in on a new device.
 *
 * @module api/sync/pull
 */

import { verifyToken } from '../auth-utils.js'
import { sql } from '../db.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30, // 30 seconds for pulling all data
}

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

interface PullResponse {
  success: boolean
  data?: {
    receipts: unknown[]
    devices: unknown[]
    householdBills: unknown[]
    reminders: unknown[]
    documents: unknown[]
    subscriptions: unknown[]
    settings: unknown | null
  }
  meta?: {
    pulledAt: string
    counts: {
      receipts: number
      devices: number
      householdBills: number
      reminders: number
      documents: number
      subscriptions: number
    }
  }
  error?: string
}

// ────────────────────────────────────────────────────────────
// Response Helpers
// ────────────────────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}

function errorResponse(message: string, status: number): Response {
  return jsonResponse({ success: false, error: message }, status)
}

// ────────────────────────────────────────────────────────────
// Data Transformers (DB -> Client format)
// ────────────────────────────────────────────────────────────

function transformReceipt(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row['id'],
    merchantName: row['merchant_name'],
    pib: row['pib'],
    date: row['date'],
    time: row['time'],
    totalAmount: Number(row['total_amount']),
    vatAmount: row['vat_amount'] ? Number(row['vat_amount']) : undefined,
    items: row['items']
      ? typeof row['items'] === 'string'
        ? JSON.parse(row['items'])
        : row['items']
      : undefined,
    category: row['category'],
    tags: row['tags']
      ? typeof row['tags'] === 'string'
        ? JSON.parse(row['tags'])
        : row['tags']
      : undefined,
    notes: row['notes'],
    qrLink: row['qr_link'],
    imageUrl: row['image_url'],
    pdfUrl: row['pdf_url'],
    createdAt: row['created_at'],
    updatedAt: row['updated_at'],
    syncStatus: 'synced',
  }
}

function transformDevice(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row['id'],
    receiptId: row['receipt_id'],
    brand: row['brand'],
    model: row['model'],
    category: row['category'],
    serialNumber: row['serial_number'],
    imageUrl: row['image_url'],
    purchaseDate: row['purchase_date'],
    warrantyDuration: row['warranty_duration'] ? Number(row['warranty_duration']) : 0,
    warrantyExpiry: row['warranty_expiry'],
    warrantyTerms: row['warranty_terms'],
    status: row['status'] || 'active',
    serviceCenterName: row['service_center_name'],
    serviceCenterAddress: row['service_center_address'],
    serviceCenterPhone: row['service_center_phone'],
    serviceCenterHours: row['service_center_hours'],
    attachments: row['attachments']
      ? typeof row['attachments'] === 'string'
        ? JSON.parse(row['attachments'])
        : row['attachments']
      : undefined,
    tags: row['tags']
      ? typeof row['tags'] === 'string'
        ? JSON.parse(row['tags'])
        : row['tags']
      : undefined,
    reminders: [],
    createdAt: row['created_at'],
    updatedAt: row['updated_at'],
    syncStatus: 'synced',
  }
}

function transformHouseholdBill(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row['id'],
    billType: row['bill_type'],
    provider: row['provider'],
    accountNumber: row['account_number'],
    amount: Number(row['amount']),
    billingPeriodStart: row['billing_period_start'],
    billingPeriodEnd: row['billing_period_end'],
    dueDate: row['due_date'],
    paymentDate: row['payment_date'],
    status: row['status'],
    consumption: row['consumption']
      ? typeof row['consumption'] === 'string'
        ? JSON.parse(row['consumption'])
        : row['consumption']
      : undefined,
    notes: row['notes'],
    createdAt: row['created_at'],
    updatedAt: row['updated_at'],
    syncStatus: 'synced',
  }
}

function transformReminder(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row['id'],
    deviceId: row['device_id'],
    type: row['type'] || 'warranty',
    daysBeforeExpiry: row['days_before_expiry'] ? Number(row['days_before_expiry']) : 30,
    status: row['status'] || 'pending',
    sentAt: row['sent_at'],
    createdAt: row['created_at'],
  }
}

function transformDocument(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row['id'],
    type: row['type'],
    name: row['name'],
    fileUrl: row['file_url'],
    thumbnailUrl: row['thumbnail_url'],
    expiryDate: row['expiry_date'],
    expiryReminderDays: row['expiry_reminder_days'] ? Number(row['expiry_reminder_days']) : 30,
    notes: row['notes'],
    createdAt: row['created_at'],
    updatedAt: row['updated_at'],
    syncStatus: 'synced',
  }
}

function transformSubscription(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row['id'],
    name: row['name'],
    provider: row['provider'],
    category: row['category'],
    amount: Number(row['amount']),
    billingCycle: row['billing_cycle'],
    nextBillingDate: row['next_billing_date'],
    startDate: row['start_date'],
    cancelUrl: row['cancel_url'],
    loginUrl: row['login_url'],
    notes: row['notes'],
    isActive: row['is_active'] ?? true,
    reminderDays: row['reminder_days'] ? Number(row['reminder_days']) : 3,
    logoUrl: row['logo_url'],
    createdAt: row['created_at'],
    updatedAt: row['updated_at'],
  }
}

function transformSettings(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: row['id'],
    userId: row['user_id'],
    theme: row['theme'] || 'system',
    language: row['language'] || 'sr',
    notificationsEnabled: row['notifications_enabled'] ?? true,
    emailNotifications: row['email_notifications'] ?? false,
    pushNotifications: row['push_notifications'] ?? true,
    biometricLock: row['biometric_lock'] ?? false,
    warrantyExpiryThreshold: row['warranty_expiry_threshold']
      ? Number(row['warranty_expiry_threshold'])
      : 30,
    warrantyCriticalThreshold: row['warranty_critical_threshold']
      ? Number(row['warranty_critical_threshold'])
      : 7,
    quietHoursStart: row['quiet_hours_start'] || '22:00',
    quietHoursEnd: row['quiet_hours_end'] || '08:00',
    updatedAt: row['updated_at'],
  }
}

// ────────────────────────────────────────────────────────────
// Main Handler
// ────────────────────────────────────────────────────────────

export default async function handler(req: Request): Promise<Response> {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    // Verify authentication
    const userId = await verifyToken(req)
    if (!userId) {
      return errorResponse('Unauthorized', 401)
    }

    console.log(`[sync/pull] Pulling data for user ${userId}`)

    // Fetch data with individual error handling for each table
    let receiptsResult: Record<string, unknown>[] = []
    let devicesResult: Record<string, unknown>[] = []
    let householdBillsResult: Record<string, unknown>[] = []
    let remindersResult: Record<string, unknown>[] = []
    let documentsResult: Record<string, unknown>[] = []
    let subscriptionsResult: Record<string, unknown>[] = []
    let settingsResult: Record<string, unknown>[] = []

    // Fetch receipts
    try {
      receiptsResult = await sql`
        SELECT * FROM receipts 
        WHERE user_id = ${userId} 
        AND (is_deleted IS NULL OR is_deleted = false)
        ORDER BY date DESC
      `
    } catch (e) {
      console.error('[sync/pull] Error fetching receipts:', e)
    }

    // Fetch devices
    try {
      devicesResult = await sql`
        SELECT * FROM devices 
        WHERE user_id = ${userId}
        AND (is_deleted IS NULL OR is_deleted = false)
        ORDER BY created_at DESC
      `
    } catch (e) {
      console.error('[sync/pull] Error fetching devices:', e)
    }

    // Fetch household bills
    try {
      householdBillsResult = await sql`
        SELECT * FROM household_bills 
        WHERE user_id = ${userId}
        AND (is_deleted IS NULL OR is_deleted = false)
        ORDER BY due_date DESC
      `
    } catch (e) {
      console.error('[sync/pull] Error fetching household_bills:', e)
    }

    // Fetch reminders
    try {
      remindersResult = await sql`
        SELECT * FROM reminders 
        WHERE user_id = ${userId}
        AND (is_deleted IS NULL OR is_deleted = false)
        ORDER BY created_at DESC
      `
    } catch (e) {
      console.error('[sync/pull] Error fetching reminders:', e)
    }

    // Fetch documents
    try {
      documentsResult = await sql`
        SELECT * FROM documents 
        WHERE user_id = ${userId}
        AND (is_deleted IS NULL OR is_deleted = false)
        ORDER BY created_at DESC
      `
    } catch (e) {
      console.error('[sync/pull] Error fetching documents:', e)
    }

    // Fetch subscriptions
    try {
      subscriptionsResult = await sql`
        SELECT * FROM subscriptions 
        WHERE user_id = ${userId}
        AND (is_deleted IS NULL OR is_deleted = false)
        ORDER BY created_at DESC
      `
    } catch (e) {
      console.error('[sync/pull] Error fetching subscriptions:', e)
    }

    // Fetch settings
    try {
      settingsResult = await sql`
        SELECT * FROM user_settings 
        WHERE user_id = ${userId}
        LIMIT 1
      `
    } catch (e) {
      console.error('[sync/pull] Error fetching user_settings:', e)
    }

    // Transform data to client format
    const receipts = receiptsResult.map(transformReceipt)
    const devices = devicesResult.map(transformDevice)
    const householdBills = householdBillsResult.map(transformHouseholdBill)
    const reminders = remindersResult.map(transformReminder)
    const documents = documentsResult.map(transformDocument)
    const subscriptions = subscriptionsResult.map(transformSubscription)
    const settings = settingsResult.length > 0 ? transformSettings(settingsResult[0]) : null

    const response: PullResponse = {
      success: true,
      data: {
        receipts,
        devices,
        householdBills,
        reminders,
        documents,
        subscriptions,
        settings,
      },
      meta: {
        pulledAt: new Date().toISOString(),
        counts: {
          receipts: receipts.length,
          devices: devices.length,
          householdBills: householdBills.length,
          reminders: reminders.length,
          documents: documents.length,
          subscriptions: subscriptions.length,
        },
      },
    }

    console.log(`[sync/pull] Successfully pulled data for user ${userId}:`, response.meta?.counts)

    return jsonResponse(response)
  } catch (error) {
    console.error('[sync/pull] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return errorResponse(message, 500)
  }
}
