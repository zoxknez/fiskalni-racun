import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { sql } from '../db.js'
import { applyRateLimit } from '../middleware/applyRateLimit.js'
import { verifyPassword } from './utils/password.js'
import { generateSessionToken, hashToken } from './utils/token.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
}

// Inline schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Rate limit: 5 attempts per 15 minutes
    const allowed = await applyRateLimit(req, res, 'auth:login')
    if (!allowed) return

    // Parse and validate body
    const body = req.body
    const validationResult = loginSchema.safeParse(body)
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: validationResult.error.errors,
      })
    }

    const { email, password } = validationResult.data
    const normalizedEmail = email.toLowerCase().trim()

    // Find user
    const users = await sql`
      SELECT id, email, password_hash, full_name, avatar_url, email_verified, created_at, updated_at, last_login_at, is_active, is_admin
      FROM users
      WHERE email = ${normalizedEmail} AND is_active = true
    `

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const userRow = users[0]

    // Verify password
    const isValid = await verifyPassword(password, userRow.password_hash as string)
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Update last login
    await sql`UPDATE users SET last_login_at = NOW() WHERE id = ${userRow.id}`

    // Create session
    const token = generateSessionToken()
    const tokenHash = await hashToken(token)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    await sql`
      INSERT INTO sessions (user_id, token_hash, expires_at)
      VALUES (${userRow.id}, ${tokenHash}, ${expiresAt.toISOString()})
    `

    // Remove password_hash from response
    const { password_hash: _, ...user } = userRow

    return res.status(200).json({ success: true, user, token })
  } catch (error) {
    console.error('[Login] Error:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
}
