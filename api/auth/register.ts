import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { sql } from '../db.js'
import { applyRateLimit } from '../middleware/applyRateLimit.js'
import { hashPassword } from './utils/password.js'
import { generateSessionToken, hashToken } from './utils/token.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
}

// Inline schema
const registerSchema = z.object({
  email: z.string().email('Invalid email format').min(1, 'Email is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters'),
  fullName: z.string().max(200).optional(),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Rate limit: 3 registrations per hour
    const allowed = await applyRateLimit(req, res, 'auth:register')
    if (!allowed) return

    // Parse and validate body
    const body = req.body
    const validationResult = registerSchema.safeParse(body)
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: validationResult.error.errors,
      })
    }

    const { email, password, fullName } = validationResult.data
    const normalizedEmail = email.toLowerCase().trim()

    // Check if user exists
    const existingUsers = await sql`SELECT id FROM users WHERE email = ${normalizedEmail}`
    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'User already exists' })
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password)
    const result = await sql`
      INSERT INTO users (email, password_hash, full_name)
      VALUES (${normalizedEmail}, ${passwordHash}, ${fullName || null})
      RETURNING id, email, full_name, avatar_url, email_verified, created_at, updated_at, last_login_at, is_active, is_admin
    `

    const user = result[0]
    if (!user) {
      return res.status(500).json({ error: 'Failed to create user' })
    }

    // Create session
    const token = generateSessionToken()
    const tokenHash = await hashToken(token)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    await sql`
      INSERT INTO sessions (user_id, token_hash, expires_at)
      VALUES (${user.id}, ${tokenHash}, ${expiresAt.toISOString()})
    `

    return res.status(201).json({ success: true, user, token })
  } catch (error) {
    console.error('[Register] Error:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
}
