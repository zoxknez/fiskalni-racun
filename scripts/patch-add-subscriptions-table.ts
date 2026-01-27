/**
 * Database Patch: Add subscriptions table
 *
 * This script creates the subscriptions table in Neon database
 * to enable subscription synchronization across devices.
 *
 * Run with: npx tsx scripts/patch-add-subscriptions-table.ts
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
    // Test connection
    console.log('📡 Testing connection...')
    const testResult = await sql`SELECT NOW() as current_time`
    console.log(`✅ Connected! Server time: ${testResult[0]?.current_time}\n`)

    // Check if subscriptions table already exists
    const existingTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'subscriptions'
    `

    if (existingTables.length > 0) {
      console.log('✅ subscriptions table already exists')

      // Check if is_deleted column exists
      const columns = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'subscriptions' AND column_name = 'is_deleted'
      `

      if (columns.length === 0) {
        console.log('➕ Adding is_deleted column to subscriptions...')
        await sql`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE`
        console.log('✅ is_deleted column added')
      }
    } else {
      console.log('➕ Creating subscriptions table...')

      await sql`
        CREATE TABLE subscriptions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          provider VARCHAR(255) NOT NULL,
          category VARCHAR(50),
          amount DECIMAL(12, 2) NOT NULL,
          billing_cycle VARCHAR(20) NOT NULL,
          next_billing_date TIMESTAMP WITH TIME ZONE,
          start_date TIMESTAMP WITH TIME ZONE,
          cancel_url TEXT,
          login_url TEXT,
          notes TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          reminder_days INTEGER DEFAULT 3,
          logo_url TEXT,
          is_deleted BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `

      console.log('✅ subscriptions table created')

      // Create indexes for performance
      console.log('➕ Creating indexes...')

      await sql`CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id)`
      await sql`CREATE INDEX IF NOT EXISTS idx_subscriptions_is_active ON subscriptions(is_active)`
      await sql`CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing_date ON subscriptions(next_billing_date)`
      await sql`CREATE INDEX IF NOT EXISTS idx_subscriptions_is_deleted ON subscriptions(is_deleted)`

      console.log('✅ Indexes created')
    }

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
