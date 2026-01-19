import { sql } from '../../db'

/**
 * Handle CREATE operation for settings
 */
export async function handleCreate(
  userId: string,
  entityId: string,
  data: Record<string, unknown>
): Promise<void> {
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
}

/**
 * Handle UPDATE operation for settings
 */
export async function handleUpdate(
  userId: string,
  entityId: string,
  data: Record<string, unknown>
): Promise<void> {
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
}

/**
 * Handle DELETE operation (hard delete) for settings
 */
export async function handleDelete(userId: string, entityId: string): Promise<void> {
  await sql`DELETE FROM user_settings WHERE id = ${entityId} AND user_id = ${userId}`
}
