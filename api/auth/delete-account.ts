import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '../db.js'
import { applyCsrfProtection } from '../middleware/applyCsrf.js'
import { hashToken } from './utils/token.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow DELETE
  if (req.method !== 'DELETE') {
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

    // Soft delete user
    await sql`UPDATE users SET is_active = false, updated_at = NOW() WHERE id = ${userId}`

    // Invalidate all sessions
    await sql`DELETE FROM sessions WHERE user_id = ${userId}`

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('[DeleteAccount] Error:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
}
