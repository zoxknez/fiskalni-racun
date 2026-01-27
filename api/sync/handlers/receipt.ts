import { sql } from '../../db'

/**
 * Convert Date object or ISO string to PostgreSQL DATE format (YYYY-MM-DD)
 */
function toDateString(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string') {
    // If already a date string, extract YYYY-MM-DD
    return value.split('T')[0]
  }
  if (value instanceof Date) {
    return value.toISOString().split('T')[0]
  }
  return null
}

/**
 * Convert Date object or string to ISO timestamp
 */
function toTimestamp(value: unknown): string {
  if (!value) return new Date().toISOString()
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  return new Date().toISOString()
}

/**
 * Handle CREATE operation for receipts
 */
export async function handleCreate(
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

/**
 * Handle UPDATE operation for receipts
 */
export async function handleUpdate(
  userId: string,
  entityId: string,
  data: Record<string, unknown>
): Promise<void> {
  await sql`
    UPDATE receipts SET
      merchant_name = COALESCE(${data['merchantName']}, merchant_name),
      pib = COALESCE(${data['pib']}, pib),
      date = COALESCE(${toDateString(data['date'])}, date),
      time = COALESCE(${data['time']}, time),
      total_amount = COALESCE(${data['totalAmount']}, total_amount),
      vat_amount = COALESCE(${data['vatAmount']}, vat_amount),
      items = COALESCE(${data['items'] ? JSON.stringify(data['items']) : null}, items),
      category = COALESCE(${data['category']}, category),
      tags = COALESCE(${data['tags'] ? JSON.stringify(data['tags']) : null}, tags),
      notes = COALESCE(${data['notes']}, notes),
      qr_link = COALESCE(${data['qrLink']}, qr_link),
      image_url = COALESCE(${data['imageUrl']}, image_url),
      pdf_url = COALESCE(${data['pdfUrl']}, pdf_url),
      updated_at = NOW()
    WHERE id = ${entityId} AND user_id = ${userId}
  `
}

/**
 * Handle DELETE operation (soft delete) for receipts
 */
export async function handleDelete(userId: string, entityId: string): Promise<void> {
  await sql`
    UPDATE receipts 
    SET is_deleted = TRUE, updated_at = NOW() 
    WHERE id = ${entityId} AND user_id = ${userId}
  `
}
