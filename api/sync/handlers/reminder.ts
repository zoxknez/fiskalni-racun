import { sql } from '../../db.js'

/**
 * Handle CREATE operation for reminders
 */
export async function handleCreate(
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

/**
 * Handle UPDATE operation for reminders
 */
export async function handleUpdate(
  userId: string,
  entityId: string,
  data: Record<string, unknown>
): Promise<void> {
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
}

/**
 * Handle DELETE operation (soft delete) for reminders
 */
export async function handleDelete(userId: string, entityId: string): Promise<void> {
  await sql`
    UPDATE reminders 
    SET is_deleted = TRUE, updated_at = NOW() 
    WHERE id = ${entityId} AND user_id = ${userId}
  `
}
