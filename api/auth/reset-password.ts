import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { sql } from '../db.js'
import { applyRateLimit } from '../middleware/applyRateLimit.js'
import { hashPassword } from './utils/password.js'
import { hashToken } from './utils/token.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
}

// Inline schema
const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Rate limit: 10 attempts per 15 minutes
    const allowed = await applyRateLimit(req, res, 'auth:reset-password')
    if (!allowed) return

    // Validate body
    const validationResult = resetPasswordSchema.safeParse(req.body)
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: validationResult.error.errors,
      })
    }

    const { token, newPassword } = validationResult.data

    // Initialize shared DB
    const tokenHash = await hashToken(token)

    // Find valid token
    const tokens = await sql`
      SELECT user_id FROM password_reset_tokens
      WHERE token_hash = ${tokenHash}
        AND expires_at > NOW()
        AND used = false
      LIMIT 1
    `

    if (tokens.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired token' })
    }

    const userId = tokens[0]?.user_id
    const newHash = await hashPassword(newPassword)

    // Update password
    await sql`UPDATE users SET password_hash = ${newHash}, updated_at = NOW() WHERE id = ${userId}`

    // Mark token as used
    await sql`UPDATE password_reset_tokens SET used = true WHERE token_hash = ${tokenHash}`

    // Invalidate all sessions for security
    await sql`DELETE FROM sessions WHERE user_id = ${userId}`

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('[ResetPassword] Error:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
}
