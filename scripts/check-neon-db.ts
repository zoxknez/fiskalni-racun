/**
 * Check Neon Database Status
 *
 * Usage: npx tsx scripts/check-neon-db.ts
 */

import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.VITE_NEON_DATABASE_URL || process.env.DATABASE_URL

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL or VITE_NEON_DATABASE_URL environment variable is required')
}

const sql = neon(DATABASE_URL)

async function checkDatabase() {
  console.log('🔍 Checking Neon database status...\n')

  try {
    // 1. Test connection
    console.log('📡 Testing connection...')
    const timeResult = await sql`SELECT NOW() as current_time, version() as pg_version`
    console.log('✅ Connected!')
    console.log(`   Server time: ${timeResult[0]?.current_time}`)
    console.log(`   PostgreSQL: ${timeResult[0]?.pg_version?.split(',')[0]}\n`)

    // 2. List tables with counts
    console.log('📋 Tables in database:')
    const tables = await sql`
      SELECT 
        table_name
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `

    // Get counts for each table
    const tableCounts: Record<string, number> = {}
    const usersCount = await sql`SELECT COUNT(*) as c FROM users`
    tableCounts['users'] = Number(usersCount[0]?.c || 0)
    const sessionsCount = await sql`SELECT COUNT(*) as c FROM sessions`
    tableCounts['sessions'] = Number(sessionsCount[0]?.c || 0)
    const receiptsCount = await sql`SELECT COUNT(*) as c FROM receipts`
    tableCounts['receipts'] = Number(receiptsCount[0]?.c || 0)
    const devicesCount = await sql`SELECT COUNT(*) as c FROM devices`
    tableCounts['devices'] = Number(devicesCount[0]?.c || 0)
    const remindersCount = await sql`SELECT COUNT(*) as c FROM reminders`
    tableCounts['reminders'] = Number(remindersCount[0]?.c || 0)
    const householdBillsCount = await sql`SELECT COUNT(*) as c FROM household_bills`
    tableCounts['household_bills'] = Number(householdBillsCount[0]?.c || 0)
    const documentsCount = await sql`SELECT COUNT(*) as c FROM documents`
    tableCounts['documents'] = Number(documentsCount[0]?.c || 0)
    const userSettingsCount = await sql`SELECT COUNT(*) as c FROM user_settings`
    tableCounts['user_settings'] = Number(userSettingsCount[0]?.c || 0)
    const passwordResetCount = await sql`SELECT COUNT(*) as c FROM password_reset_tokens`
    tableCounts['password_reset_tokens'] = Number(passwordResetCount[0]?.c || 0)

    for (const table of tables) {
      const count = tableCounts[table.table_name] ?? '?'
      console.log(`   - ${table.table_name}: ${count} rows`)
    }
    console.log('')

    // 3. Check indexes
    console.log('🔑 Indexes:')
    const indexes = await sql`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `
    for (const idx of indexes) {
      console.log(`   - ${idx.indexname} on ${idx.tablename}`)
    }
    console.log('')

    // 4. Check for any users
    console.log('👥 Users check:')
    const users = await sql`SELECT id, email, full_name, is_active, created_at FROM users LIMIT 5`
    if (users.length === 0) {
      console.log('   No users found (database is empty)')
    } else {
      for (const user of users) {
        console.log(
          `   - ${user.email} (${user.full_name || 'No name'}) - Active: ${user.is_active}`
        )
      }
    }
    console.log('')

    // 5. Check active sessions
    console.log('🔐 Active sessions:')
    const sessions = await sql`
      SELECT COUNT(*) as count 
      FROM sessions 
      WHERE expires_at > NOW()
    `
    console.log(`   ${sessions[0]?.count || 0} active sessions\n`)

    // 6. Database size
    console.log('💾 Database size:')
    const sizeResult = await sql`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `
    console.log(`   ${sizeResult[0]?.size}\n`)

    console.log('✨ Database check complete!')
  } catch (error) {
    console.error('❌ Error checking database:', error)
    process.exit(1)
  }
}

checkDatabase()
