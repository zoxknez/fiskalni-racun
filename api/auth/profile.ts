import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { sql } from '../db.js'
import { applyCsrfProtection } from '../middleware/applyCsrf.js'
import { hashToken } from './utils/token.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
}

// Inline schema
const updateProfileSchema = z.object({
  fullName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional(),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow PUT/PATCH
  if (req.method !== 'PUT' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const csrf = applyCsrfProtection(req, res)
    if (!csrf.allowed) return

    // Get auth header
    const authHeader = req.headers['authorization'] as string | undefined
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.split(' ')[1]
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Shared DB
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
    const validationResult = updateProfileSchema.safeParse(req.body)
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: validationResult.error.errors,
      })
    }

    const { fullName, avatarUrl } = validationResult.data

    // Update profile
    const result = await sql`
      UPDATE users
      SET
        full_name = COALESCE(${fullName ?? null}, full_name),
        avatar_url = COALESCE(${avatarUrl ?? null}, avatar_url),
        updated_at = NOW()
      WHERE id = ${userId}
      RETURNING id, email, full_name, avatar_url, email_verified, created_at, updated_at, last_login_at, is_active, is_admin
    `

    return res.status(200).json({ success: true, user: result[0] })
  } catch (error) {
    console.error('[Profile] Error:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
}
