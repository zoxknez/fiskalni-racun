/**
 * Batch Sync API Handler
 *
 * Handles batch synchronization of multiple items at once.
 * Much more efficient than syncing items one by one.
 *
 * @module api/sync/batch
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '../db.js'
import { verifyTokenFromHeader } from '../lib/auth.js'

// ────────────────────────────────────────────────────────────
// Date Helpers
// ────────────────────────────────────────────────────────────

/** Convert Date object or ISO string to PostgreSQL DATE format (YYYY-MM-DD) */
function toDateString(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string') return value.split('T')[0]
  if (value instanceof Date) return value.toISOString().split('T')[0]
  return null
}

/** Convert Date object or string to ISO timestamp */
function toTimestamp(value: unknown): string {
  if (!value) return new Date().toISOString()
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  return new Date().toISOString()
}

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

interface SyncItem {
  entityType: 'receipt' | 'device' | 'householdBill' | 'reminder' | 'subscription' | 'document'
  entityId: string
  operation: 'create' | 'update' | 'delete'
  data?: Record<string, unknown>
}

interface BatchRequest {
  items: SyncItem[]
}

// ────────────────────────────────────────────────────────────
// Entity Table Map (for delete operations)
// ────────────────────────────────────────────────────────────

const ENTITY_TABLE_MAP: Record<string, string> = {
  receipt: 'receipts',
  device: 'devices',
  householdBill: 'household_bills',
  reminder: 'reminders',
  subscription: 'subscriptions',
  document: 'documents',
}

// ────────────────────────────────────────────────────────────
// Sync Functions
// ────────────────────────────────────────────────────────────

async function syncReceipt(
  userId: string,
  entityId: string,
  data: Record<string, unknown>
): Promise<void> {
  await sql`
    INSERT INTO receipts (
      id, user_id, merchant_name, pib, date, time, total_amount, vat_amount,
      items, category, tags, notes, qr_link, image_url, pdf_url, created_at, updated_at
    ) VALUES (
      ${entityId}, ${userId}, ${data['merchantName']}, ${data['pib'] || null},
      ${toDateString(data['date'])}, ${data['time'] || null}, ${data['totalAmount']}, ${data['vatAmount'] || null},
      ${data['items'] ? JSON.stringify(data['items']) : null}, ${data['category'] || null},
      ${data['tags'] ? JSON.stringify(data['tags']) : null},
      ${data['notes'] || null}, ${data['qrLink'] || null}, ${data['imageUrl'] || null},
      ${data['pdfUrl'] || null}, ${toTimestamp(data['createdAt'])},
      ${toTimestamp(data['updatedAt'])}
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
      tags = EXCLUDED.tags,
      notes = EXCLUDED.notes,
      qr_link = EXCLUDED.qr_link,
      image_url = EXCLUDED.image_url,
      pdf_url = EXCLUDED.pdf_url,
      updated_at = NOW()
  `
}

async function syncDevice(
  userId: string,
  entityId: string,
  data: Record<string, unknown>
): Promise<void> {
  await sql`
    INSERT INTO devices (
      id, user_id, receipt_id, brand, model, category, serial_number, image_url,
      purchase_date, warranty_duration, warranty_expiry, warranty_terms, status,
      service_center_name, service_center_address, service_center_phone,
      service_center_hours, attachments, tags, created_at, updated_at
    ) VALUES (
      ${entityId}, ${userId}, ${data['receiptId'] || null}, ${data['brand']}, ${data['model']},
      ${data['category'] || null}, ${data['serialNumber'] || null}, ${data['imageUrl'] || null},
      ${toDateString(data['purchaseDate'])}, ${data['warrantyDuration'] || null},
      ${toDateString(data['warrantyExpiry'])},
      ${data['warrantyTerms'] || null}, ${data['status'] || 'active'},
      ${data['serviceCenterName'] || null}, ${data['serviceCenterAddress'] || null},
      ${data['serviceCenterPhone'] || null}, ${data['serviceCenterHours'] || null},
      ${data['attachments'] ? JSON.stringify(data['attachments']) : null},
      ${data['tags'] ? JSON.stringify(data['tags']) : null},
      ${toTimestamp(data['createdAt'])}, ${toTimestamp(data['updatedAt'])}
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
      tags = EXCLUDED.tags,
      updated_at = NOW()
  `
}

async function syncHouseholdBill(
  userId: string,
  entityId: string,
  data: Record<string, unknown>
): Promise<void> {
  await sql`
    INSERT INTO household_bills (
      id, user_id, bill_type, provider, account_number, amount, due_date,
      billing_period_start, billing_period_end, payment_date, status,
      consumption, notes, created_at, updated_at
    ) VALUES (
      ${entityId}, ${userId}, ${data['billType']}, ${data['provider']},
      ${data['accountNumber'] || null}, ${data['amount']}, ${toDateString(data['dueDate'])},
      ${toDateString(data['billingPeriodStart'])}, ${toDateString(data['billingPeriodEnd'])},
      ${toDateString(data['paymentDate'])},
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
      due_date = EXCLUDED.due_date,
      billing_period_start = EXCLUDED.billing_period_start,
      billing_period_end = EXCLUDED.billing_period_end,
      payment_date = EXCLUDED.payment_date,
      status = EXCLUDED.status,
      consumption = EXCLUDED.consumption,
      notes = EXCLUDED.notes,
      updated_at = NOW()
  `
}

async function syncSubscription(
  userId: string,
  entityId: string,
  data: Record<string, unknown>
): Promise<void> {
  await sql`
    INSERT INTO subscriptions (
      id, user_id, name, provider, category, amount, billing_cycle,
      next_billing_date, start_date, cancel_url, login_url, notes,
      is_active, reminder_days, logo_url, created_at, updated_at
    ) VALUES (
      ${entityId}, ${userId}, ${data['name']}, ${data['provider']},
      ${data['category'] || null}, ${data['amount']}, ${data['billingCycle']},
      ${toDateString(data['nextBillingDate'])}, ${toDateString(data['startDate'])},
      ${data['cancelUrl'] || null}, ${data['loginUrl'] || null},
      ${data['notes'] || null}, ${data['isActive'] ?? true},
      ${data['reminderDays'] || 3}, ${data['logoUrl'] || null},
      ${data['createdAt'] || new Date().toISOString()},
      ${data['updatedAt'] || new Date().toISOString()}
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      provider = EXCLUDED.provider,
      category = EXCLUDED.category,
      amount = EXCLUDED.amount,
      billing_cycle = EXCLUDED.billing_cycle,
      next_billing_date = EXCLUDED.next_billing_date,
      start_date = EXCLUDED.start_date,
      cancel_url = EXCLUDED.cancel_url,
      login_url = EXCLUDED.login_url,
      notes = EXCLUDED.notes,
      is_active = EXCLUDED.is_active,
      reminder_days = EXCLUDED.reminder_days,
      logo_url = EXCLUDED.logo_url,
      updated_at = NOW()
  `
}

async function syncDocument(
  userId: string,
  entityId: string,
  data: Record<string, unknown>
): Promise<void> {
  await sql`
    INSERT INTO documents (
      id, user_id, type, name, file_url, thumbnail_url, expiry_date,
      expiry_reminder_days, notes, tags, created_at, updated_at
    ) VALUES (
      ${entityId}, ${userId}, ${data['type']}, ${data['name']},
      ${data['fileUrl'] || null}, ${data['thumbnailUrl'] || null},
      ${data['expiryDate'] || null}, ${data['expiryReminderDays'] || null},
      ${data['notes'] || null},
      ${data['tags'] ? JSON.stringify(data['tags']) : null},
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
      tags = EXCLUDED.tags,
      updated_at = NOW()
  `
}

async function syncReminder(
  userId: string,
  entityId: string,
  data: Record<string, unknown>
): Promise<void> {
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
}

// ────────────────────────────────────────────────────────────
// Main Handler
// ────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[sync/batch] Request received:', req.method)

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const authHeader = (req.headers.authorization || req.headers['Authorization']) as string
    const userId = await verifyTokenFromHeader(authHeader)

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' })
    }

    const body = req.body as BatchRequest
    if (!body || !Array.isArray(body.items)) {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid request format - items array required' })
    }

    const items = body.items
    let success = 0
    let failed = 0
    const errors: string[] = []

    const BATCH_SIZE = 5
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE)

      await Promise.all(
        batch.map(async (item) => {
          try {
            // Handle delete operations via soft delete
            if (item.operation === 'delete') {
              const table = ENTITY_TABLE_MAP[item.entityType]
              if (!table) {
                throw new Error(`Unsupported entity type for delete: ${item.entityType}`)
              }
              await sql`
                UPDATE ${sql(table)}
                SET is_deleted = TRUE, updated_at = NOW()
                WHERE id = ${item.entityId} AND user_id = ${userId}
              `
              success++
              return
            }

            if (!item.data) {
              throw new Error('Data is required for create/update operations')
            }

            switch (item.entityType) {
              case 'receipt':
                await syncReceipt(userId, item.entityId, item.data)
                break
              case 'device':
                await syncDevice(userId, item.entityId, item.data)
                break
              case 'householdBill':
                await syncHouseholdBill(userId, item.entityId, item.data)
                break
              case 'subscription':
                await syncSubscription(userId, item.entityId, item.data)
                break
              case 'document':
                await syncDocument(userId, item.entityId, item.data)
                break
              case 'reminder':
                await syncReminder(userId, item.entityId, item.data)
                break
              default:
                throw new Error(`Unsupported entity type: ${item.entityType}`)
            }
            success++
          } catch (error) {
            failed++
            errors.push(
              `${item.entityType}/${item.entityId}: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
          }
        })
      )
    }

    return res.status(200).json({
      success,
      failed,
      total: items.length,
      errors: errors.slice(0, 10),
    })
  } catch (error) {
    console.error('Batch sync error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}
