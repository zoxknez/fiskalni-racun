/**
 * Sync API Handler
 *
 * Handles synchronization of local data with the server database.
 * Supports create, update, and delete operations for all entity types.
 *
 * @module api/sync
 */

import { verifyToken } from './auth-utils.js'
import { sql } from './db.js'
import { parseJsonBody } from './lib/request-helpers.js'
import {
  ENTITY_TABLE_MAP,
  type EntityTypeValue,
  SyncRequestSchema,
  validateEntityData,
} from './schemas/sync.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
}

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────
// Utility Functions
// ────────────────────────────────────────────────────────────

/**
 * Create JSON response with proper headers
 */
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}

/**
 * Create error response
 */
function errorResponse(message: string, status: number, errors?: unknown): Response {
  return jsonResponse({ success: false, error: message, errors }, status)
}

// ────────────────────────────────────────────────────────────
// CRUD Operations
// ────────────────────────────────────────────────────────────

/**
 * Handle CREATE operation
 */
async function handleCreate(
  entityType: EntityTypeValue,
  userId: string,
  entityId: string,
  data: Record<string, unknown>
): Promise<void> {
  switch (entityType) {
    case 'receipt':
      await sql`
        INSERT INTO receipts (
          id, user_id, merchant_name, pib, date, time, total_amount, vat_amount,
          items, category, notes, qr_link, image_url, pdf_url, created_at, updated_at
        ) VALUES (
          ${entityId}, ${userId}, ${data['merchantName']}, ${data['pib'] || null},
          ${data['date']}, ${data['time'] || null}, ${data['totalAmount']}, ${data['vatAmount'] || null},
          ${data['items'] ? JSON.stringify(data['items']) : null}, ${data['category'] || null},
          ${data['notes'] || null}, ${data['qrLink'] || null}, ${data['imageUrl'] || null},
          ${data['pdfUrl'] || null}, ${data['createdAt'] || new Date().toISOString()},
          ${data['updatedAt'] || new Date().toISOString()}
        )
        ON CONFLICT (id) DO UPDATE SET
          merchant_name = EXCLUDED.merchant_name,
          pib = EXCLUDED.pib,
          date = EXCLUDED.date,
          time = EXCLUDED.time,
          total_amount = EXCLUDED.total_amount,
          vat_amount = EXCLUDED.vat_amount,
          items = EXCLUDED.items,
          category = EXCLUDED.category,
          notes = EXCLUDED.notes,
          qr_link = EXCLUDED.qr_link,
          image_url = EXCLUDED.image_url,
          pdf_url = EXCLUDED.pdf_url,
          updated_at = NOW()
      `
      break

    case 'device':
      await sql`
        INSERT INTO devices (
          id, user_id, receipt_id, brand, model, category, serial_number, image_url,
          purchase_date, warranty_duration, warranty_expiry, warranty_terms, status,
          service_center_name, service_center_address, service_center_phone,
          service_center_hours, attachments, created_at, updated_at
        ) VALUES (
          ${entityId}, ${userId}, ${data['receiptId'] || null}, ${data['brand']}, ${data['model']},
          ${data['category'] || null}, ${data['serialNumber'] || null}, ${data['imageUrl'] || null},
          ${data['purchaseDate']}, ${data['warrantyDuration'] || null}, ${data['warrantyExpiry']},
          ${data['warrantyTerms'] || null}, ${data['status'] || 'active'},
          ${data['serviceCenterName'] || null}, ${data['serviceCenterAddress'] || null},
          ${data['serviceCenterPhone'] || null}, ${data['serviceCenterHours'] || null},
          ${data['attachments'] ? JSON.stringify(data['attachments']) : null},
          ${data['createdAt'] || new Date().toISOString()}, ${data['updatedAt'] || new Date().toISOString()}
        )
        ON CONFLICT (id) DO UPDATE SET
          receipt_id = EXCLUDED.receipt_id,
          brand = EXCLUDED.brand,
          model = EXCLUDED.model,
          category = EXCLUDED.category,
          serial_number = EXCLUDED.serial_number,
          image_url = EXCLUDED.image_url,
          purchase_date = EXCLUDED.purchase_date,
          warranty_duration = EXCLUDED.warranty_duration,
          warranty_expiry = EXCLUDED.warranty_expiry,
          warranty_terms = EXCLUDED.warranty_terms,
          status = EXCLUDED.status,
          service_center_name = EXCLUDED.service_center_name,
          service_center_address = EXCLUDED.service_center_address,
          service_center_phone = EXCLUDED.service_center_phone,
          service_center_hours = EXCLUDED.service_center_hours,
          attachments = EXCLUDED.attachments,
          updated_at = NOW()
      `
      break

    case 'reminder':
      await sql`
        INSERT INTO reminders (
          id, user_id, device_id, type, days_before_expiry, status, sent_at,
          created_at, updated_at
        ) VALUES (
          ${entityId}, ${userId}, ${data['deviceId']}, ${data['type']},
          ${data['daysBeforeExpiry']}, ${data['status'] || 'pending'}, ${data['sentAt'] || null},
          ${data['createdAt'] || new Date().toISOString()}, ${data['updatedAt'] || new Date().toISOString()}
        )
        ON CONFLICT (id) DO UPDATE SET
          device_id = EXCLUDED.device_id,
          type = EXCLUDED.type,
          days_before_expiry = EXCLUDED.days_before_expiry,
          status = EXCLUDED.status,
          sent_at = EXCLUDED.sent_at,
          updated_at = NOW()
      `
      break

    case 'householdBill':
      await sql`
        INSERT INTO household_bills (
          id, user_id, bill_type, provider, account_number, amount,
          billing_period_start, billing_period_end, due_date, payment_date,
          status, consumption, notes, created_at, updated_at
        ) VALUES (
          ${entityId}, ${userId}, ${data['billType']}, ${data['provider']},
          ${data['accountNumber'] || null}, ${data['amount']},
          ${data['billingPeriodStart'] || null}, ${data['billingPeriodEnd'] || null},
          ${data['dueDate'] || null}, ${data['paymentDate'] || null},
          ${data['status'] || 'pending'},
          ${data['consumption'] ? JSON.stringify(data['consumption']) : null},
          ${data['notes'] || null},
          ${data['createdAt'] || new Date().toISOString()}, ${data['updatedAt'] || new Date().toISOString()}
        )
        ON CONFLICT (id) DO UPDATE SET
          bill_type = EXCLUDED.bill_type,
          provider = EXCLUDED.provider,
          account_number = EXCLUDED.account_number,
          amount = EXCLUDED.amount,
          billing_period_start = EXCLUDED.billing_period_start,
          billing_period_end = EXCLUDED.billing_period_end,
          due_date = EXCLUDED.due_date,
          payment_date = EXCLUDED.payment_date,
          status = EXCLUDED.status,
          consumption = EXCLUDED.consumption,
          notes = EXCLUDED.notes,
          updated_at = NOW()
      `
      break

    case 'document':
      await sql`
        INSERT INTO documents (
          id, user_id, type, name, file_url, thumbnail_url, expiry_date,
          expiry_reminder_days, notes, created_at, updated_at
        ) VALUES (
          ${entityId}, ${userId}, ${data['type']}, ${data['name']},
          ${data['fileUrl'] || null}, ${data['thumbnailUrl'] || null},
          ${data['expiryDate'] || null}, ${data['expiryReminderDays'] || null},
          ${data['notes'] || null},
          ${data['createdAt'] || new Date().toISOString()}, ${data['updatedAt'] || new Date().toISOString()}
        )
        ON CONFLICT (id) DO UPDATE SET
          type = EXCLUDED.type,
          name = EXCLUDED.name,
          file_url = EXCLUDED.file_url,
          thumbnail_url = EXCLUDED.thumbnail_url,
          expiry_date = EXCLUDED.expiry_date,
          expiry_reminder_days = EXCLUDED.expiry_reminder_days,
          notes = EXCLUDED.notes,
          updated_at = NOW()
      `
      break

    case 'settings':
      await sql`
        INSERT INTO user_settings (
          id, user_id, theme, language, notifications_enabled, email_notifications,
          push_notifications, biometric_lock, warranty_expiry_threshold,
          warranty_critical_threshold, quiet_hours_start, quiet_hours_end, updated_at
        ) VALUES (
          ${entityId}, ${userId}, ${data['theme'] || 'system'}, ${data['language'] || 'sr'},
          ${data['notificationsEnabled'] ?? true}, ${data['emailNotifications'] ?? false},
          ${data['pushNotifications'] ?? true}, ${data['biometricLock'] ?? false},
          ${data['warrantyExpiryThreshold'] ?? 30}, ${data['warrantyCriticalThreshold'] ?? 7},
          ${data['quietHoursStart'] || null}, ${data['quietHoursEnd'] || null},
          ${data['updatedAt'] || new Date().toISOString()}
        )
        ON CONFLICT (id) DO UPDATE SET
          theme = EXCLUDED.theme,
          language = EXCLUDED.language,
          notifications_enabled = EXCLUDED.notifications_enabled,
          email_notifications = EXCLUDED.email_notifications,
          push_notifications = EXCLUDED.push_notifications,
          biometric_lock = EXCLUDED.biometric_lock,
          warranty_expiry_threshold = EXCLUDED.warranty_expiry_threshold,
          warranty_critical_threshold = EXCLUDED.warranty_critical_threshold,
          quiet_hours_start = EXCLUDED.quiet_hours_start,
          quiet_hours_end = EXCLUDED.quiet_hours_end,
          updated_at = NOW()
      `
      break
  }
}

/**
 * Handle UPDATE operation
 */
async function handleUpdate(
  entityType: EntityTypeValue,
  userId: string,
  entityId: string,
  data: Record<string, unknown>
): Promise<void> {
  switch (entityType) {
    case 'receipt':
      await sql`
        UPDATE receipts SET
          merchant_name = COALESCE(${data['merchantName']}, merchant_name),
          pib = COALESCE(${data['pib']}, pib),
          date = COALESCE(${data['date']}, date),
          time = COALESCE(${data['time']}, time),
          total_amount = COALESCE(${data['totalAmount']}, total_amount),
          vat_amount = COALESCE(${data['vatAmount']}, vat_amount),
          items = COALESCE(${data['items'] ? JSON.stringify(data['items']) : null}, items),
          category = COALESCE(${data['category']}, category),
          notes = COALESCE(${data['notes']}, notes),
          qr_link = COALESCE(${data['qrLink']}, qr_link),
          image_url = COALESCE(${data['imageUrl']}, image_url),
          pdf_url = COALESCE(${data['pdfUrl']}, pdf_url),
          updated_at = NOW()
        WHERE id = ${entityId} AND user_id = ${userId}
      `
      break

    case 'device':
      await sql`
        UPDATE devices SET
          receipt_id = COALESCE(${data['receiptId']}, receipt_id),
          brand = COALESCE(${data['brand']}, brand),
          model = COALESCE(${data['model']}, model),
          category = COALESCE(${data['category']}, category),
          serial_number = COALESCE(${data['serialNumber']}, serial_number),
          image_url = COALESCE(${data['imageUrl']}, image_url),
          purchase_date = COALESCE(${data['purchaseDate']}, purchase_date),
          warranty_duration = COALESCE(${data['warrantyDuration']}, warranty_duration),
          warranty_expiry = COALESCE(${data['warrantyExpiry']}, warranty_expiry),
          warranty_terms = COALESCE(${data['warrantyTerms']}, warranty_terms),
          status = COALESCE(${data['status']}, status),
          service_center_name = COALESCE(${data['serviceCenterName']}, service_center_name),
          service_center_address = COALESCE(${data['serviceCenterAddress']}, service_center_address),
          service_center_phone = COALESCE(${data['serviceCenterPhone']}, service_center_phone),
          service_center_hours = COALESCE(${data['serviceCenterHours']}, service_center_hours),
          attachments = COALESCE(${data['attachments'] ? JSON.stringify(data['attachments']) : null}, attachments),
          updated_at = NOW()
        WHERE id = ${entityId} AND user_id = ${userId}
      `
      break

    case 'reminder':
      await sql`
        UPDATE reminders SET
          device_id = COALESCE(${data['deviceId']}, device_id),
          type = COALESCE(${data['type']}, type),
          days_before_expiry = COALESCE(${data['daysBeforeExpiry']}, days_before_expiry),
          status = COALESCE(${data['status']}, status),
          sent_at = COALESCE(${data['sentAt']}, sent_at),
          updated_at = NOW()
        WHERE id = ${entityId} AND user_id = ${userId}
      `
      break

    case 'householdBill':
      await sql`
        UPDATE household_bills SET
          bill_type = COALESCE(${data['billType']}, bill_type),
          provider = COALESCE(${data['provider']}, provider),
          account_number = COALESCE(${data['accountNumber']}, account_number),
          amount = COALESCE(${data['amount']}, amount),
          billing_period_start = COALESCE(${data['billingPeriodStart']}, billing_period_start),
          billing_period_end = COALESCE(${data['billingPeriodEnd']}, billing_period_end),
          due_date = COALESCE(${data['dueDate']}, due_date),
          payment_date = COALESCE(${data['paymentDate']}, payment_date),
          status = COALESCE(${data['status']}, status),
          consumption = COALESCE(${data['consumption'] ? JSON.stringify(data['consumption']) : null}, consumption),
          notes = COALESCE(${data['notes']}, notes),
          updated_at = NOW()
        WHERE id = ${entityId} AND user_id = ${userId}
      `
      break

    case 'document':
      await sql`
        UPDATE documents SET
          type = COALESCE(${data['type']}, type),
          name = COALESCE(${data['name']}, name),
          file_url = COALESCE(${data['fileUrl']}, file_url),
          thumbnail_url = COALESCE(${data['thumbnailUrl']}, thumbnail_url),
          expiry_date = COALESCE(${data['expiryDate']}, expiry_date),
          expiry_reminder_days = COALESCE(${data['expiryReminderDays']}, expiry_reminder_days),
          notes = COALESCE(${data['notes']}, notes),
          updated_at = NOW()
        WHERE id = ${entityId} AND user_id = ${userId}
      `
      break

    case 'settings':
      await sql`
        UPDATE user_settings SET
          theme = COALESCE(${data['theme']}, theme),
          language = COALESCE(${data['language']}, language),
          notifications_enabled = COALESCE(${data['notificationsEnabled']}, notifications_enabled),
          email_notifications = COALESCE(${data['emailNotifications']}, email_notifications),
          push_notifications = COALESCE(${data['pushNotifications']}, push_notifications),
          biometric_lock = COALESCE(${data['biometricLock']}, biometric_lock),
          warranty_expiry_threshold = COALESCE(${data['warrantyExpiryThreshold']}, warranty_expiry_threshold),
          warranty_critical_threshold = COALESCE(${data['warrantyCriticalThreshold']}, warranty_critical_threshold),
          quiet_hours_start = COALESCE(${data['quietHoursStart']}, quiet_hours_start),
          quiet_hours_end = COALESCE(${data['quietHoursEnd']}, quiet_hours_end),
          updated_at = NOW()
        WHERE id = ${entityId} AND user_id = ${userId}
      `
      break
  }
}

/**
 * Handle DELETE operation (soft delete)
 */
async function handleDelete(
  entityType: EntityTypeValue,
  userId: string,
  entityId: string
): Promise<void> {
  const tableName = ENTITY_TABLE_MAP[entityType]

  if (entityType === 'settings') {
    // Settings are hard deleted
    await sql`DELETE FROM user_settings WHERE id = ${entityId} AND user_id = ${userId}`
  } else {
    // All other entities are soft deleted
    // Note: We need to handle dynamic table names carefully with Neon
    // Using a switch for type safety since sql template doesn't support dynamic identifiers
    switch (entityType) {
      case 'receipt':
        await sql`UPDATE receipts SET is_deleted = TRUE, updated_at = NOW() WHERE id = ${entityId} AND user_id = ${userId}`
        break
      case 'device':
        await sql`UPDATE devices SET is_deleted = TRUE, updated_at = NOW() WHERE id = ${entityId} AND user_id = ${userId}`
        break
      case 'reminder':
        await sql`UPDATE reminders SET is_deleted = TRUE, updated_at = NOW() WHERE id = ${entityId} AND user_id = ${userId}`
        break
      case 'householdBill':
        await sql`UPDATE household_bills SET is_deleted = TRUE, updated_at = NOW() WHERE id = ${entityId} AND user_id = ${userId}`
        break
      case 'document':
        await sql`UPDATE documents SET is_deleted = TRUE, updated_at = NOW() WHERE id = ${entityId} AND user_id = ${userId}`
        break
    }
  }
}

// ────────────────────────────────────────────────────────────
// Main Handler
// ────────────────────────────────────────────────────────────

export default async function handler(req: Request): Promise<Response> {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    // Verify authentication
    const userId = await verifyToken(req)
    if (!userId) {
      return errorResponse('Unauthorized', 401)
    }

    // Parse request body
    let body: unknown
    try {
      body = await parseJsonBody(req)
    } catch {
      return errorResponse('Invalid JSON body', 400)
    }

    // Validate request structure
    const parseResult = SyncRequestSchema.safeParse(body)
    if (!parseResult.success) {
      return errorResponse(
        'Invalid request format',
        400,
        parseResult.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
      )
    }

    const { entityType, entityId, operation, data } = parseResult.data

    // For create/update, validate entity data
    if ((operation === 'create' || operation === 'update') && data) {
      const validationResult = validateEntityData(entityType, data)
      if (validationResult.success === false) {
        return errorResponse(
          'Invalid entity data',
          400,
          validationResult.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
        )
      }
    }

    // Execute operation
    switch (operation) {
      case 'create':
        if (!data) {
          return errorResponse('Data is required for create operation', 400)
        }
        await handleCreate(entityType, userId, entityId, data as Record<string, unknown>)
        break

      case 'update':
        if (!data) {
          return errorResponse('Data is required for update operation', 400)
        }
        await handleUpdate(entityType, userId, entityId, data as Record<string, unknown>)
        break

      case 'delete':
        await handleDelete(entityType, userId, entityId)
        break
    }

    return jsonResponse({ success: true, operation, entityType, entityId })
  } catch (error) {
    console.error('Sync error:', error)

    // Don't expose internal errors in production
    const message =
      process.env.NODE_ENV === 'development'
        ? error instanceof Error
          ? error.message
          : 'Unknown error'
        : 'Internal server error'

    return errorResponse(message, 500)
  }
}
