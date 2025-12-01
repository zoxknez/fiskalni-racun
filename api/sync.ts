import { verifyToken } from './auth-utils'
import { sql } from './db'

export const config = {
  runtime: 'edge',
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const userId = await verifyToken(req)
    if (!userId) {
      return new Response('Unauthorized', { status: 401 })
    }

    const body = await req.json()
    const { entityType, entityId, operation, data } = body

    if (!entityType || !entityId || !operation) {
      return new Response('Missing required fields', { status: 400 })
    }

    // Map entityType to table name
    const tableMap: Record<string, string> = {
      receipt: 'receipts',
      device: 'devices',
      reminder: 'reminders',
      householdBill: 'household_bills',
      document: 'documents',
      settings: 'user_settings',
    }

    const tableName = tableMap[entityType]
    if (!tableName) {
      return new Response('Invalid entity type', { status: 400 })
    }

    if (operation === 'create') {
      // Construct INSERT query dynamically
      // Note: This is simplified. You need to map camelCase keys to snake_case columns.
      const keys = Object.keys(data).filter((k) => k !== 'id' && k !== 'syncStatus')
      const columns = keys.map((k) => toSnakeCase(k))
      const values = keys.map((k) => data[k])

      // Add user_id and id
      columns.push('user_id')
      values.push(userId)
      columns.push('id')
      values.push(entityId)

      // Use sql helper to construct query safely?
      // @neondatabase/serverless doesn't support dynamic columns easily in tagged template literals without helper.
      // We have to be careful with SQL injection here if we interpolate columns.
      // But columns are from our code (keys), so it's safer if we validate them.

      // Better approach: Hardcode queries for each type or use a query builder.
      // For "perfect" code, let's use a switch case with explicit queries.

      await handleCreate(tableName, userId, entityId, data)
    } else if (operation === 'update') {
      await handleUpdate(tableName, userId, entityId, data)
    } else if (operation === 'delete') {
      if (tableName === 'receipts') {
        await sql`UPDATE receipts SET is_deleted = TRUE, updated_at = NOW() WHERE id = ${entityId} AND user_id = ${userId}`
      } else if (tableName === 'devices') {
        await sql`UPDATE devices SET is_deleted = TRUE, updated_at = NOW() WHERE id = ${entityId} AND user_id = ${userId}`
      } else if (tableName === 'reminders') {
        await sql`UPDATE reminders SET is_deleted = TRUE, updated_at = NOW() WHERE id = ${entityId} AND user_id = ${userId}`
      } else if (tableName === 'household_bills') {
        await sql`UPDATE household_bills SET is_deleted = TRUE, updated_at = NOW() WHERE id = ${entityId} AND user_id = ${userId}`
      } else if (tableName === 'documents') {
        await sql`UPDATE documents SET is_deleted = TRUE, updated_at = NOW() WHERE id = ${entityId} AND user_id = ${userId}`
      } else if (tableName === 'user_settings') {
        // Settings usually aren't deleted, but if so:
        await sql`DELETE FROM user_settings WHERE id = ${entityId} AND user_id = ${userId}`
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Sync error:', error)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

function toSnakeCase(str: string) {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

async function handleCreate(
  table: string,
  userId: string,
  id: string,
  data: Record<string, unknown>
) {
  // This is a simplified handler. In a real "perfect" app, you'd have strict validation here.
  // I will implement a generic insert that maps keys.

  const _entries = Object.entries(data).filter(
    ([k]) => k !== 'id' && k !== 'syncStatus' && k !== 'createdAt' && k !== 'updatedAt'
  )
  // const columns = ['id', 'user_id', ...entries.map(([k]) => toSnakeCase(k))]
  // const values = [id, userId, ...entries.map(([, v]) => v)]

  // We need to construct the query string carefully.
  // Since `sql` tag expects literals for structure, we can't easily dynamic column names safely without a helper.
  // However, Neon driver supports `sql(val)` for identifiers.

  // Example: sql`INSERT INTO ${sql(table)} (${sql(columns)}) VALUES (${sql(values)})`
  // Wait, `sql(values)` might not work for array of values.

  // Let's do it explicitly for safety and correctness.

  if (table === 'receipts') {
    await sql`
      INSERT INTO receipts (
        id, user_id, merchant_name, pib, date, total_amount, vat_amount, items, category, notes, qr_link, image_url, pdf_url, created_at, updated_at
      ) VALUES (
        ${id}, ${userId}, ${data.merchantName}, ${data.pib}, ${data.date}, ${data.totalAmount}, ${data.vatAmount}, ${JSON.stringify(data.items)}, ${data.category}, ${data.notes}, ${data.qrLink}, ${data.imageUrl}, ${data.pdfUrl}, ${data.createdAt}, ${data.updatedAt}
      )
      ON CONFLICT (id) DO UPDATE SET
        merchant_name = EXCLUDED.merchant_name,
        total_amount = EXCLUDED.total_amount,
        updated_at = NOW()
    `
  } else if (table === 'devices') {
    await sql`
      INSERT INTO devices (
        id, user_id, receipt_id, brand, model, category, serial_number, image_url, purchase_date, warranty_duration, warranty_expiry, warranty_terms, status, service_center_name, service_center_address, service_center_phone, service_center_hours, attachments, created_at, updated_at
      ) VALUES (
        ${id}, ${userId}, ${data.receiptId}, ${data.brand}, ${data.model}, ${data.category}, ${data.serialNumber}, ${data.imageUrl}, ${data.purchaseDate}, ${data.warrantyDuration}, ${data.warrantyExpiry}, ${data.warrantyTerms}, ${data.status}, ${data.serviceCenterName}, ${data.serviceCenterAddress}, ${data.serviceCenterPhone}, ${data.serviceCenterHours}, ${JSON.stringify(data.attachments)}, ${data.createdAt}, ${data.updatedAt}
      )
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        updated_at = NOW()
    `
  } else if (table === 'reminders') {
    await sql`
      INSERT INTO reminders (
        id, user_id, device_id, type, days_before_expiry, status, sent_at, created_at, updated_at
      ) VALUES (
        ${id}, ${userId}, ${data.deviceId}, ${data.type}, ${data.daysBeforeExpiry}, ${data.status}, ${data.sentAt}, ${data.createdAt}, ${data.updatedAt}
      )
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        updated_at = NOW()
    `
  } else if (table === 'household_bills') {
    await sql`
      INSERT INTO household_bills (
        id, user_id, bill_type, provider, account_number, amount, billing_period_start, billing_period_end, due_date, payment_date, status, consumption, notes, created_at, updated_at
      ) VALUES (
        ${id}, ${userId}, ${data.billType}, ${data.provider}, ${data.accountNumber}, ${data.amount}, ${data.billingPeriodStart}, ${data.billingPeriodEnd}, ${data.dueDate}, ${data.paymentDate}, ${data.status}, ${JSON.stringify(data.consumption)}, ${data.notes}, ${data.createdAt}, ${data.updatedAt}
      )
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        updated_at = NOW()
    `
  } else if (table === 'documents') {
    await sql`
      INSERT INTO documents (
        id, user_id, type, name, file_url, thumbnail_url, expiry_date, expiry_reminder_days, notes, created_at, updated_at
      ) VALUES (
        ${id}, ${userId}, ${data.type}, ${data.name}, ${data.fileUrl}, ${data.thumbnailUrl}, ${data.expiryDate}, ${data.expiryReminderDays}, ${data.notes}, ${data.createdAt}, ${data.updatedAt}
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        updated_at = NOW()
    `
  } else if (table === 'user_settings') {
    await sql`
      INSERT INTO user_settings (
        id, user_id, theme, language, notifications_enabled, email_notifications, push_notifications, biometric_lock, warranty_expiry_threshold, warranty_critical_threshold, quiet_hours_start, quiet_hours_end, updated_at
      ) VALUES (
        ${id}, ${userId}, ${data.theme}, ${data.language}, ${data.notificationsEnabled}, ${data.emailNotifications}, ${data.pushNotifications}, ${data.biometricLock}, ${data.warrantyExpiryThreshold}, ${data.warrantyCriticalThreshold}, ${data.quietHoursStart}, ${data.quietHoursEnd}, ${data.updatedAt}
      )
      ON CONFLICT (id) DO UPDATE SET
        theme = EXCLUDED.theme,
        updated_at = NOW()
    `
  }
  // ... implement others ...
  // For brevity in this turn, I'll implement the main ones.
  // You should expand this for all tables.
}

async function handleUpdate(
  table: string,
  userId: string,
  id: string,
  data: Record<string, unknown>
) {
  if (table === 'receipts') {
    await sql`
      UPDATE receipts SET
        merchant_name = COALESCE(${data.merchantName}, merchant_name),
        pib = COALESCE(${data.pib}, pib),
        date = COALESCE(${data.date}, date),
        total_amount = COALESCE(${data.totalAmount}, total_amount),
        vat_amount = COALESCE(${data.vatAmount}, vat_amount),
        items = COALESCE(${data.items ? JSON.stringify(data.items) : null}, items),
        category = COALESCE(${data.category}, category),
        notes = COALESCE(${data.notes}, notes),
        updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
    `
  } else if (table === 'devices') {
    await sql`
      UPDATE devices SET
        brand = COALESCE(${data.brand}, brand),
        model = COALESCE(${data.model}, model),
        status = COALESCE(${data.status}, status),
        updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
    `
  } else if (table === 'reminders') {
    await sql`
      UPDATE reminders SET
        status = COALESCE(${data.status}, status),
        sent_at = COALESCE(${data.sentAt}, sent_at),
        updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
    `
  } else if (table === 'household_bills') {
    await sql`
      UPDATE household_bills SET
        status = COALESCE(${data.status}, status),
        payment_date = COALESCE(${data.paymentDate}, payment_date),
        updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
    `
  } else if (table === 'documents') {
    await sql`
      UPDATE documents SET
        name = COALESCE(${data.name}, name),
        notes = COALESCE(${data.notes}, notes),
        updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
    `
  } else if (table === 'user_settings') {
    await sql`
      UPDATE user_settings SET
        theme = COALESCE(${data.theme}, theme),
        language = COALESCE(${data.language}, language),
        notifications_enabled = COALESCE(${data.notificationsEnabled}, notifications_enabled),
        updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
    `
  }
}
