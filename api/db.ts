import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env['VITE_NEON_DATABASE_URL'] || process.env['DATABASE_URL']

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined')
}

export const sql = neon(DATABASE_URL)
