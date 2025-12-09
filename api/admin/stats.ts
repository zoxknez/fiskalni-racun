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

// Verify admin user from token
async function verifyAdmin(sql: ReturnType<typeof neon>, authHeader: string | undefined) {
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.split(' ')[1]
  if (!token) return null

  const tokenHash = await hashToken(token)

  const result = await sql`
    SELECT u.id, u.email, u.is_admin
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token_hash = ${tokenHash}
      AND s.expires_at > NOW()
      AND u.is_active = true
      AND u.is_admin = true
    LIMIT 1
  `

  const rows = result as Array<{ id: string; email: string; is_admin: boolean }>
  return rows.length > 0 ? rows[0] : null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const DATABASE_URL = process.env['DATABASE_URL'] || process.env['VITE_NEON_DATABASE_URL']
    if (!DATABASE_URL) {
      return res.status(500).json({ error: 'Database configuration error' })
    }

    const sql = neon(DATABASE_URL)
    const authHeader = req.headers['authorization'] as string | undefined

    // Verify admin
    const admin = await verifyAdmin(sql, authHeader)
    if (!admin) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    // Get stats
    const [userStats, receiptStats, sessionStats, recentUsers, activeToday] = await Promise.all([
      // User counts
      sql`
        SELECT 
          COUNT(*) as total_users,
          COUNT(*) FILTER (WHERE is_active = true) as active_users,
          COUNT(*) FILTER (WHERE is_admin = true) as admin_users,
          COUNT(*) FILTER (WHERE email_verified = true) as verified_users,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_users_7d,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_users_30d
        FROM users
      `,
      // Receipt stats
      sql`
        SELECT 
          COUNT(*) as total_receipts,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as receipts_7d,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as receipts_30d,
          COALESCE(SUM(total_amount), 0) as total_amount
        FROM receipts
        WHERE is_deleted IS NULL OR is_deleted = false
      `,
      // Active sessions
      sql`
        SELECT COUNT(*) as active_sessions
        FROM sessions
        WHERE expires_at > NOW()
      `,
      // Recent users
      sql`
        SELECT id, email, full_name, created_at, is_admin, is_active
        FROM users
        ORDER BY created_at DESC
        LIMIT 5
      `,
      // Users active today
      sql`
        SELECT COUNT(DISTINCT user_id) as active_today
        FROM sessions
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `,
    ])

    return res.status(200).json({
      stats: {
        users: userStats[0],
        receipts: receiptStats[0],
        sessions: sessionStats[0],
        activeToday: activeToday[0],
      },
      recentUsers,
    })
  } catch (error) {
    console.error('[Admin Stats] Error:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
}
