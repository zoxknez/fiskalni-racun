import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sql } from '../db.js'
import { hashToken } from './utils/token.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
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
    const result = await sql`
      SELECT u.id, u.email, u.full_name, u.avatar_url, u.email_verified, u.created_at, u.updated_at, u.last_login_at, u.is_active, u.is_admin
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token_hash = ${tokenHash}
        AND s.expires_at > NOW()
        AND u.is_active = true
      LIMIT 1
    `

    if (result.length === 0) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    return res.status(200).json({ user: result[0] })
  } catch (error) {
    console.error('[Me] Error:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
}
