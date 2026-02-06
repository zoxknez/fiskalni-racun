import { sql } from '../../db.js'

/**
 * Handle CREATE operation for documents
 */
export async function handleCreate(
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

/**
 * Handle UPDATE operation for documents
 */
export async function handleUpdate(
  userId: string,
  entityId: string,
  data: Record<string, unknown>
): Promise<void> {
  await sql`
    UPDATE documents SET
      type = COALESCE(${data['type']}, type),
      name = COALESCE(${data['name']}, name),
      file_url = COALESCE(${data['fileUrl']}, file_url),
      thumbnail_url = COALESCE(${data['thumbnailUrl']}, thumbnail_url),
      expiry_date = COALESCE(${data['expiryDate']}, expiry_date),
      expiry_reminder_days = COALESCE(${data['expiryReminderDays']}, expiry_reminder_days),
      notes = COALESCE(${data['notes']}, notes),
      tags = COALESCE(${data['tags'] ? JSON.stringify(data['tags']) : null}, tags),
      updated_at = NOW()
    WHERE id = ${entityId} AND user_id = ${userId}
  `
}

/**
 * Handle DELETE operation (soft delete) for documents
 */
export async function handleDelete(userId: string, entityId: string): Promise<void> {
  await sql`
    UPDATE documents 
    SET is_deleted = TRUE, updated_at = NOW() 
    WHERE id = ${entityId} AND user_id = ${userId}
  `
}
