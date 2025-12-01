/**
 * Neon PostgreSQL Configuration
 *
 * Serverless PostgreSQL database configuration for authentication
 * and data storage.
 *
 * @module lib/neon/config
 */

import { neon, neonConfig } from '@neondatabase/serverless'

// Configure Neon for better performance
neonConfig.fetchConnectionCache = true

/**
 * Neon database connection string
 * In production, this should come from environment variables
 */
const DATABASE_URL =
  (import.meta.env['VITE_NEON_DATABASE_URL'] as string | undefined) ||
  'postgresql://neondb_owner:npg_58uUdpJohqzs@ep-jolly-math-ag22vjgc-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require'

/**
 * Neon SQL client for executing queries
 * Uses HTTP-based serverless driver for browser compatibility
 */
export const sql = neon(DATABASE_URL)

/**
 * Database configuration
 */
export const dbConfig = {
  url: DATABASE_URL,
  pooled: true,
  ssl: true,
}

export default sql
