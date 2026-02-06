import { sql } from '../../db.js'

/**
 * Convert Date object or ISO string to PostgreSQL DATE format (YYYY-MM-DD)
 */
function toDateString(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string') {
    return value.split('T')[0]
  }
  if (value instanceof Date) {
    return value.toISOString().split('T')[0]
  }
  return null
}

/**
 * Handle CREATE operation for devices
 */
export async function handleCreate(
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
      ${toDateString(data['purchaseDate'])}, ${data['warrantyDuration'] || null}, ${toDateString(data['warrantyExpiry'])},
      ${data['warrantyTerms'] || null}, ${data['status'] || 'active'},
      ${data['serviceCenterName'] || null}, ${data['serviceCenterAddress'] || null},
      ${data['serviceCenterPhone'] || null}, ${data['serviceCenterHours'] || null},
      ${data['attachments'] ? JSON.stringify(data['attachments']) : null},
      ${data['tags'] ? JSON.stringify(data['tags']) : null},
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
      tags = EXCLUDED.tags,
      updated_at = NOW()
  `
}

/**
 * Handle UPDATE operation for devices
 */
export async function handleUpdate(
  userId: string,
  entityId: string,
  data: Record<string, unknown>
): Promise<void> {
  await sql`
    UPDATE devices SET
      receipt_id = COALESCE(${data['receiptId']}, receipt_id),
      brand = COALESCE(${data['brand']}, brand),
      model = COALESCE(${data['model']}, model),
      category = COALESCE(${data['category']}, category),
      serial_number = COALESCE(${data['serialNumber']}, serial_number),
      image_url = COALESCE(${data['imageUrl']}, image_url),
      purchase_date = COALESCE(${toDateString(data['purchaseDate'])}, purchase_date),
      warranty_duration = COALESCE(${data['warrantyDuration']}, warranty_duration),
      warranty_expiry = COALESCE(${toDateString(data['warrantyExpiry'])}, warranty_expiry),
      warranty_terms = COALESCE(${data['warrantyTerms']}, warranty_terms),
      status = COALESCE(${data['status']}, status),
      service_center_name = COALESCE(${data['serviceCenterName']}, service_center_name),
      service_center_address = COALESCE(${data['serviceCenterAddress']}, service_center_address),
      service_center_phone = COALESCE(${data['serviceCenterPhone']}, service_center_phone),
      service_center_hours = COALESCE(${data['serviceCenterHours']}, service_center_hours),
      attachments = COALESCE(${data['attachments'] ? JSON.stringify(data['attachments']) : null}, attachments),
      tags = COALESCE(${data['tags'] ? JSON.stringify(data['tags']) : null}, tags),
      updated_at = NOW()
    WHERE id = ${entityId} AND user_id = ${userId}
  `
}

/**
 * Handle DELETE operation (soft delete) for devices
 */
export async function handleDelete(userId: string, entityId: string): Promise<void> {
  await sql`
    UPDATE devices 
    SET is_deleted = TRUE, updated_at = NOW() 
    WHERE id = ${entityId} AND user_id = ${userId}
  `
}
