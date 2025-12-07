import { neon } from '@neondatabase/serverless'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
}

// Inline schema
const updateProfileSchema = z.object({
  fullName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional(),
})

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
  // Only allow PUT/PATCH
  if (req.method !== 'PUT' && req.method !== 'PATCH') {
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
      RETURNING id, email, full_name, avatar_url, email_verified, created_at, updated_at, last_login_at, is_active
    `

    return res.status(200).json({ success: true, user: result[0] })
  } catch (error) {
    console.error('[Profile] Error:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
}
