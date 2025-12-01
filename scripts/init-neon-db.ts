/**
 * Initialize Neon Database Schema
 *
 * This script creates the necessary tables for authentication.
 * Run this script once to set up the database.
 *
 * Usage: npx tsx scripts/init-neon-db.ts
 */

import { neon } from '@neondatabase/serverless'

const DATABASE_URL =
  process.env.VITE_NEON_DATABASE_URL ||
  'postgresql://neondb_owner:npg_58uUdpJohqzs@ep-jolly-math-ag22vjgc-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require'

const sql = neon(DATABASE_URL)

async function initializeDatabase() {
  console.log('🚀 Initializing Neon database...\n')

  try {
    // Test connection
    console.log('📡 Testing connection...')
    const testResult = await sql`SELECT NOW() as current_time`
    console.log(`✅ Connected! Server time: ${testResult[0]?.current_time}\n`)

    // Create users table
    console.log('📦 Creating users table...')
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        avatar_url TEXT,
        email_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_login_at TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN DEFAULT TRUE
      )
    `
    console.log('✅ Users table created\n')

    // Create sessions table
    console.log('📦 Creating sessions table...')
    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        ip_address VARCHAR(45),
        user_agent TEXT
      )
    `
    console.log('✅ Sessions table created\n')

    // Create password reset tokens table
    console.log('📦 Creating password_reset_tokens table...')
    await sql`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `
    console.log('✅ Password reset tokens table created\n')

    // Create indexes
    console.log('📦 Creating indexes...')
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash)`
    console.log('✅ Indexes created\n')

    // Verify tables exist
    console.log('🔍 Verifying tables...')
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'sessions', 'password_reset_tokens')
      ORDER BY table_name
    `
    console.log('📋 Created tables:')
    for (const table of tables) {
      console.log(`   - ${table.table_name}`)
    }

    console.log('\n✨ Database initialization complete!')
    console.log('🔗 Your Neon Auth is ready to use at /neon-auth\n')
  } catch (error) {
    console.error('❌ Error initializing database:', error)
    process.exit(1)
  }
}

initializeDatabase()
