/**
 * Batch Sync API Handler
 *
 * Handles batch synchronization of multiple items at once.
 * Much more efficient than syncing items one by one.
 *
 * @module api/sync/batch
 */

import { verifyToken } from '../auth-utils.js'
import { sql } from '../db.js'
import { parseJsonBody } from '../lib/request-helpers.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 60, // 60 seconds for batch operations
}

interface SyncItem {
  entityType: 'receipt' | 'device' | 'householdBill' | 'reminder' | 'tag'
  entityId: string
  operation: 'create' | 'update' | 'delete'
  data?: Record<string, unknown>
}

interface BatchRequest {
  items: SyncItem[]
}

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

async function syncReceipt(
  userId: string,
  entityId: string,
  data: Record<string, unknown>
): Promise<void> {
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
      attachments, created_at, updated_at
    ) VALUES (
      ${entityId}, ${userId}, ${data['receiptId'] || null}, ${data['brand']}, ${data['model']},
      ${data['category'] || null}, ${data['serialNumber'] || null}, ${data['imageUrl'] || null},
      ${data['purchaseDate']}, ${data['warrantyDuration'] || null}, ${data['warrantyExpiry']},
      ${data['warrantyTerms'] || null}, ${data['status'] || 'active'},
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
      attachments = EXCLUDED.attachments,
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
      id, user_id, bill_type, provider_name, account_number, amount, due_date,
      period_start, period_end, status, notes, image_url, created_at, updated_at
    ) VALUES (
      ${entityId}, ${userId}, ${data['billType']}, ${data['providerName']},
      ${data['accountNumber'] || null}, ${data['amount']}, ${data['dueDate']},
      ${data['periodStart'] || null}, ${data['periodEnd'] || null},
      ${data['status'] || 'pending'}, ${data['notes'] || null}, ${data['imageUrl'] || null},
      ${data['createdAt'] || new Date().toISOString()}, ${data['updatedAt'] || new Date().toISOString()}
    )
    ON CONFLICT (id) DO UPDATE SET
      bill_type = EXCLUDED.bill_type,
      provider_name = EXCLUDED.provider_name,
      account_number = EXCLUDED.account_number,
      amount = EXCLUDED.amount,
      due_date = EXCLUDED.due_date,
      period_start = EXCLUDED.period_start,
      period_end = EXCLUDED.period_end,
      status = EXCLUDED.status,
      notes = EXCLUDED.notes,
      image_url = EXCLUDED.image_url,
      updated_at = NOW()
  `
}

export default async function handler(request: Request): Promise<Response> {
  // Only allow POST
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    // Verify authentication
    const userId = await verifyToken(request)
    if (!userId) {
      return errorResponse('Unauthorized', 401)
    }

    // Parse request body
    const body = await parseJsonBody<BatchRequest>(request)
    if (!body || !Array.isArray(body.items)) {
      return errorResponse('Invalid request format - items array required', 400)
    }

    const items = body.items
    let success = 0
    let failed = 0
    const errors: string[] = []

    // Process items in parallel batches of 5
    const BATCH_SIZE = 5
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE)

      await Promise.all(
        batch.map(async (item) => {
          try {
            if (!item.data) {
              throw new Error('Data is required')
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

    return jsonResponse({
      success,
      failed,
      total: items.length,
      errors: errors.slice(0, 10), // Return first 10 errors
    })
  } catch (error) {
    console.error('Batch sync error:', error)
    return errorResponse('Internal server error', 500)
  }
}
