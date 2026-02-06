import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { sql } from '../db.js'
import { applyCsrfProtection } from '../middleware/applyCsrf.js'
import { applyRateLimit } from '../middleware/applyRateLimit.js'
import { hashPassword, verifyPassword } from './utils/password.js'
import { hashToken } from './utils/token.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
}

// Inline schema
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const csrf = applyCsrfProtection(req, res)
    if (!csrf.allowed) return

    // Rate limit: 5 attempts per 15 minutes
    const allowed = await applyRateLimit(req, res, 'auth:change-password')
    if (!allowed) return

    // Get auth header
    const authHeader = req.headers['authorization'] as string | undefined
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.split(' ')[1]
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Initialize shared DB
    const tokenHash = await hashToken(token)

    // Find user by session
    const sessions = await sql`
      SELECT user_id FROM sessions
      WHERE token_hash = ${tokenHash} AND expires_at > NOW()
      LIMIT 1
    `

    if (sessions.length === 0) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const userId = sessions[0]?.user_id

    // Validate body
    const validationResult = changePasswordSchema.safeParse(req.body)
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: validationResult.error.errors,
      })
    }

    const { currentPassword, newPassword } = validationResult.data

    // Get current password hash
    const users = await sql`SELECT password_hash FROM users WHERE id = ${userId}`
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const userRow = users[0]
    const isValid = await verifyPassword(currentPassword, userRow?.password_hash as string)
    if (!isValid) {
      return res.status(400).json({ error: 'Current password is incorrect' })
    }

    // Update password
    const newHash = await hashPassword(newPassword)
    await sql`UPDATE users SET password_hash = ${newHash}, updated_at = NOW() WHERE id = ${userId}`

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('[ChangePassword] Error:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
}
