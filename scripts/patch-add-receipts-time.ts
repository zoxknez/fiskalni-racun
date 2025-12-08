import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_NEON_DATABASE_URL

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL or VITE_NEON_DATABASE_URL is required')
}

const sql = neon(DATABASE_URL)

async function main() {
  console.log('🔧 Adding receipts.time column if missing...')
  await sql`ALTER TABLE receipts ADD COLUMN IF NOT EXISTS time TEXT`
  console.log('✅ Done')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
