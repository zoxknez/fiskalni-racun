import { neon } from '@neondatabase/serverless'
import type { VercelRequest, VercelResponse } from '@vercel/node'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
}

// Hash token for lookup
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow DELETE
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get database URL
    const DATABASE_URL = process.env['DATABASE_URL'] || process.env['VITE_NEON_DATABASE_URL']
    if (!DATABASE_URL) {
      return res.status(500).json({ error: 'Database configuration error' })
    }

    // Get auth header
    const authHeader = req.headers['authorization'] as string | undefined
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.split(' ')[1]
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Initialize Neon
    const sql = neon(DATABASE_URL)
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
