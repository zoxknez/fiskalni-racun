/**
 * Patch: Add tags column to receipts table
 *
 * This migration adds the missing tags column to the receipts table.
 *
 * Usage: npx tsx scripts/patch-add-tags-column.ts
 */

import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.VITE_NEON_DATABASE_URL || process.env.DATABASE_URL

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL or VITE_NEON_DATABASE_URL environment variable is required')
}

const sql = neon(DATABASE_URL)

async function patchDatabase() {
  console.log('🚀 Adding tags column to receipts table...\n')

  try {
    // Test connection
    console.log('📡 Testing connection...')
    const testResult = await sql`SELECT NOW() as current_time`
    console.log(`✅ Connected! Server time: ${testResult[0]?.current_time}\n`)

    // Add tags column to receipts if it doesn't exist
    console.log('📦 Adding tags column to receipts...')
    await sql`
      ALTER TABLE receipts 
      ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'
    `
    console.log('✅ Tags column added to receipts\n')

    // Add tags column to devices if it doesn't exist
    console.log('📦 Adding tags column to devices...')
    await sql`
      ALTER TABLE devices 
      ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'
    `
    console.log('✅ Tags column added to devices\n')

    // Add is_deleted column to reminders if it doesn't exist
    console.log('📦 Adding is_deleted column to reminders...')
    await sql`
      ALTER TABLE reminders 
      ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE
    `
    console.log('✅ is_deleted column added to reminders\n')

    // Add is_admin column to users if it doesn't exist
    console.log('📦 Adding is_admin column to users...')
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE
    `
    console.log('✅ is_admin column added to users\n')

    console.log('\n✨ Database patch complete!')
  } catch (error) {
    console.error('❌ Error patching database:', error)
    process.exit(1)
  }
}

patchDatabase()
