import { sql } from '../../db'

/**
 * Handle CREATE operation for household bills
 */
export async function handleCreate(
  userId: string,
  entityId: string,
  data: Record<string, unknown>
): Promise<void> {
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
}

/**
 * Handle UPDATE operation for household bills
 */
export async function handleUpdate(
  userId: string,
  entityId: string,
  data: Record<string, unknown>
): Promise<void> {
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
}

/**
 * Handle DELETE operation (soft delete) for household bills
 */
export async function handleDelete(userId: string, entityId: string): Promise<void> {
  await sql`
    UPDATE household_bills 
    SET is_deleted = TRUE, updated_at = NOW() 
    WHERE id = ${entityId} AND user_id = ${userId}
  `
}
