import { sql } from '../../db'

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
 * Convert Date object or string to ISO timestamp
 */
function toTimestamp(value: unknown): string {
  if (!value) return new Date().toISOString()
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  return new Date().toISOString()
}

/**
 * Handle CREATE operation for subscriptions
 */
export async function handleCreate(
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
      ${toTimestamp(data['createdAt'])},
      ${toTimestamp(data['updatedAt'])}
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

/**
 * Handle UPDATE operation for subscriptions
 */
export async function handleUpdate(
  userId: string,
  entityId: string,
  data: Record<string, unknown>
): Promise<void> {
  await sql`
    UPDATE subscriptions SET
      name = COALESCE(${data['name']}, name),
      provider = COALESCE(${data['provider']}, provider),
      category = COALESCE(${data['category']}, category),
      amount = COALESCE(${data['amount']}, amount),
      billing_cycle = COALESCE(${data['billingCycle']}, billing_cycle),
      next_billing_date = COALESCE(${toDateString(data['nextBillingDate'])}, next_billing_date),
      start_date = COALESCE(${toDateString(data['startDate'])}, start_date),
      cancel_url = COALESCE(${data['cancelUrl']}, cancel_url),
      login_url = COALESCE(${data['loginUrl']}, login_url),
      notes = COALESCE(${data['notes']}, notes),
      is_active = COALESCE(${data['isActive']}, is_active),
      reminder_days = COALESCE(${data['reminderDays']}, reminder_days),
      logo_url = COALESCE(${data['logoUrl']}, logo_url),
      updated_at = NOW()
    WHERE id = ${entityId} AND user_id = ${userId}
  `
}

/**
 * Handle DELETE operation (soft delete) for subscriptions
 */
export async function handleDelete(userId: string, entityId: string): Promise<void> {
  await sql`
    UPDATE subscriptions 
    SET is_deleted = TRUE, updated_at = NOW() 
    WHERE id = ${entityId} AND user_id = ${userId}
  `
}
