/**
 * Initialize Neon Database Schema
 *
 * This script creates the necessary tables for the application.
 * Run this script once to set up the database.
 *
 * Usage: npx tsx scripts/init-neon-db.ts
 */

import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.VITE_NEON_DATABASE_URL || process.env.DATABASE_URL

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL or VITE_NEON_DATABASE_URL environment variable is required')
}

const sql = neon(DATABASE_URL)

async function initializeDatabase() {
  console.log('🚀 Initializing Neon database...\n')

  try {
    // Test connection
    console.log('📡 Testing connection...')
    const testResult = await sql`SELECT NOW() as current_time`
    console.log(`✅ Connected! Server time: ${testResult[0]?.current_time}\n`)

    // 1. Users & Auth
    console.log('📦 Creating auth tables...')
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
    console.log('✅ Auth tables created\n')

    // 2. Application Tables
    console.log('📦 Creating application tables...')

    // Receipts
    await sql`
      CREATE TABLE IF NOT EXISTS receipts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        merchant_name TEXT NOT NULL,
        pib TEXT NOT NULL,
        date TIMESTAMP WITH TIME ZONE NOT NULL,
        time TEXT,
        total_amount DECIMAL(10, 2) NOT NULL,
        vat_amount DECIMAL(10, 2),
        items JSONB DEFAULT '[]',
        category TEXT NOT NULL,
        notes TEXT,
        qr_link TEXT,
        image_url TEXT,
        pdf_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_deleted BOOLEAN DEFAULT FALSE
      )
    `

    // Devices
    await sql`
      CREATE TABLE IF NOT EXISTS devices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receipt_id UUID REFERENCES receipts(id) ON DELETE SET NULL,
        brand TEXT NOT NULL,
        model TEXT NOT NULL,
        category TEXT NOT NULL,
        serial_number TEXT,
        image_url TEXT,
        purchase_date TIMESTAMP WITH TIME ZONE NOT NULL,
        warranty_duration INTEGER NOT NULL, -- months
        warranty_expiry TIMESTAMP WITH TIME ZONE NOT NULL,
        warranty_terms TEXT,
        status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'in-service')),
        service_center_name TEXT,
        service_center_address TEXT,
        service_center_phone TEXT,
        service_center_hours TEXT,
        attachments JSONB DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_deleted BOOLEAN DEFAULT FALSE
      )
    `

    // Reminders
    await sql`
      CREATE TABLE IF NOT EXISTS reminders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        days_before_expiry INTEGER NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'dismissed')),
        sent_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_deleted BOOLEAN DEFAULT FALSE
      )
    `

    // Household Bills
    await sql`
      CREATE TABLE IF NOT EXISTS household_bills (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        bill_type TEXT NOT NULL,
        provider TEXT NOT NULL,
        account_number TEXT,
        amount DECIMAL(10, 2) NOT NULL,
        billing_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
        billing_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
        due_date TIMESTAMP WITH TIME ZONE NOT NULL,
        payment_date TIMESTAMP WITH TIME ZONE,
        status TEXT NOT NULL,
        consumption JSONB,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_deleted BOOLEAN DEFAULT FALSE
      )
    `

    // Documents
    await sql`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        file_url TEXT NOT NULL,
        thumbnail_url TEXT,
        expiry_date TIMESTAMP WITH TIME ZONE,
        expiry_reminder_days INTEGER,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_deleted BOOLEAN DEFAULT FALSE
      )
    `

    // User Settings
    await sql`
      CREATE TABLE IF NOT EXISTS user_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        theme TEXT DEFAULT 'system',
        language TEXT DEFAULT 'sr',
        notifications_enabled BOOLEAN DEFAULT TRUE,
        email_notifications BOOLEAN DEFAULT TRUE,
        push_notifications BOOLEAN DEFAULT TRUE,
        biometric_lock BOOLEAN DEFAULT FALSE,
        warranty_expiry_threshold INTEGER DEFAULT 30,
        warranty_critical_threshold INTEGER DEFAULT 7,
        quiet_hours_start TEXT,
        quiet_hours_end TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    console.log('✅ Application tables created\n')

    // 3. Indexes
    console.log('📦 Creating indexes...')
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`
    await sql`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON receipts(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_household_bills_user_id ON household_bills(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_receipts_updated_at ON receipts(updated_at)`
    console.log('✅ Indexes created\n')

    console.log('\n✨ Database initialization complete!')
  } catch (error) {
    console.error('❌ Error initializing database:', error)
    process.exit(1)
  }
}

initializeDatabase()
