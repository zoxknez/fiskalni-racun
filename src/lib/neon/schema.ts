/**
 * Neon Database Schema
 *
 * Database schema and initialization for authentication
 *
 * @module lib/neon/schema
 */

import { logger } from '@/lib/logger'
import { sql } from './config'

/**
 * Initialize database schema
 * Creates necessary tables for authentication if they don't exist
 */
export async function initializeDatabase(): Promise<boolean> {
  try {
    // Create users table
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

    // Create sessions table for token management
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

    // Create password reset tokens table
    await sql`
      CREATE TABLE IF NOT EXISTS password_resets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // Create index for faster email lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `

    // Create index for session lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)
    `

    // Create index for token lookups
    await sql`
      CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash)
    `

    logger.info('✅ Database schema initialized successfully')
    return true
  } catch (error) {
    logger.error('❌ Failed to initialize database schema:', error)
    return false
  }
}

/**
 * Check database connection
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const result = await sql`SELECT 1 as connected`
    return result.length > 0 && result[0]?.['connected'] === 1
  } catch (error) {
    logger.error('❌ Database connection failed:', error)
    return false
  }
}
