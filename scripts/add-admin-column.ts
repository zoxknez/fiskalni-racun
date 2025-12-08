/**
 * Add is_admin column to users table and set admin for specific email
 * Run with: npx tsx scripts/add-admin-column.ts
 */

import { neon } from '@neondatabase/serverless'

const ADMIN_EMAIL = 'zoranknpoker@gmail.com'

async function main() {
  const DATABASE_URL = process.env['DATABASE_URL'] || process.env['VITE_NEON_DATABASE_URL']

  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in environment variables')
    process.exit(1)
  }

  const sql = neon(DATABASE_URL)

  console.log('🔧 Adding is_admin column to users table...')

  try {
    // Add is_admin column if it doesn't exist
    await sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false
    `
    console.log('✅ is_admin column added (or already exists)')

    // Set admin for specific email
    const result = await sql`
      UPDATE users 
      SET is_admin = true 
      WHERE email = ${ADMIN_EMAIL}
      RETURNING id, email, is_admin
    `

    if (result.length > 0) {
      console.log(`✅ Admin privileges granted to: ${ADMIN_EMAIL}`)
      console.log('   User ID:', result[0]?.id)
    } else {
      console.log(`⚠️  User ${ADMIN_EMAIL} not found. Admin will be set when they register.`)
    }

    // List all admins
    const admins = await sql`SELECT id, email, is_admin FROM users WHERE is_admin = true`
    console.log('\n📋 Current admins:')
    for (const admin of admins) {
      console.log(`   - ${admin.email}`)
    }
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }

  console.log('\n✨ Done!')
}

main()
