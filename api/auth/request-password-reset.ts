import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { sql } from '../db.js'
import { applyRateLimit } from '../middleware/applyRateLimit.js'
import { generateSessionToken, hashToken } from './utils/token.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
}

// Inline schema
const requestPasswordResetSchema = z.object({
  email: z.string().email(),
})

const RESET_TOKEN_DURATION_MS = 1 * 60 * 60 * 1000 // 1 hour

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Rate limit: 3 attempts per hour
    const allowed = await applyRateLimit(req, res, 'auth:password-reset')
    if (!allowed) return

    // Validate body
    const validationResult = requestPasswordResetSchema.safeParse(req.body)
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: validationResult.error.errors,
      })
    }

    const { email } = validationResult.data
    const normalizedEmail = email.toLowerCase().trim()

    // Initialize shared DB

    // Find user
    const users =
      await sql`SELECT id FROM users WHERE email = ${normalizedEmail} AND is_active = true`

    if (users.length === 0) {
      // Don't reveal if user exists for security
      return res.status(200).json({ success: true, message: 'If account exists, email sent' })
    }

    const userId = users[0]?.id
    const resetToken = generateSessionToken()
    const tokenHash = await hashToken(resetToken)
    const expiresAt = new Date(Date.now() + RESET_TOKEN_DURATION_MS)

    await sql`
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
      VALUES (${userId}, ${tokenHash}, ${expiresAt.toISOString()})
    `

    // Send password reset email
    try {
      const { sendPasswordResetEmail } = await import('../services/email')
      await sendPasswordResetEmail(normalizedEmail, resetToken)
    } catch (emailError) {
      console.error('[RequestPasswordReset] Email error:', emailError)
      // Continue - don't fail the request if email fails
    }

    return res.status(200).json({ success: true, message: 'If account exists, email sent' })
  } catch (error) {
    console.error('[RequestPasswordReset] Error:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
}
