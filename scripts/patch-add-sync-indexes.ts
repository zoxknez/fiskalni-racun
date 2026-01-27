/**
 * Database Patch: Add indexes for sync pull performance
 *
 * Run with: npx tsx scripts/patch-add-sync-indexes.ts
 */

import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.VITE_NEON_DATABASE_URL || process.env.DATABASE_URL

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL or VITE_NEON_DATABASE_URL environment variable is required')
}

const sql = neon(DATABASE_URL)

async function main() {
  console.log('🔗 Connecting to Neon database...')

  try {
    console.log('📡 Testing connection...')
    const testResult = await sql`SELECT NOW() as current_time`
    console.log(`✅ Connected! Server time: ${testResult[0]?.current_time}\n`)

    console.log('➕ Creating sync indexes...')

    await sql`
      CREATE INDEX IF NOT EXISTS idx_receipts_user_id_date
      ON receipts (user_id, date DESC)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_receipts_user_id_deleted
      ON receipts (user_id, is_deleted)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_devices_user_id_created
      ON devices (user_id, created_at DESC)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_devices_user_id_deleted
      ON devices (user_id, is_deleted)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_household_bills_user_id_due
      ON household_bills (user_id, due_date DESC)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_household_bills_user_id_deleted
      ON household_bills (user_id, is_deleted)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_reminders_user_id_created
      ON reminders (user_id, created_at DESC)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_reminders_user_id_deleted
      ON reminders (user_id, is_deleted)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_documents_user_id_created
      ON documents (user_id, created_at DESC)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_documents_user_id_deleted
      ON documents (user_id, is_deleted)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id_created
      ON subscriptions (user_id, created_at DESC)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id_deleted
      ON subscriptions (user_id, is_deleted)
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_settings_user_id
      ON user_settings (user_id)
    `

    console.log('✅ Indexes created')
    console.log('🎉 Patch completed successfully!')
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

main().catch((error) => {
  console.error('Failed to run patch:', error)
  process.exit(1)
})
