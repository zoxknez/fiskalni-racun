import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDatabase, verifyAdmin } from '../lib/auth.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const sql = getDatabase()
    const authHeader = req.headers['authorization'] as string | undefined

    // Verify admin using shared utility
    const admin = await verifyAdmin(sql, authHeader)
    if (!admin) {
      return res.status(403).json({ error: 'Admin access required' })
    }

    // Get stats - all in parallel for performance
    const [userStats, receiptStats, sessionStats, recentUsers, activeToday] = await Promise.all([
      // User counts
      sql`
        SELECT 
          COUNT(*)::int as total_users,
          COUNT(*) FILTER (WHERE is_active = true)::int as active_users,
          COUNT(*) FILTER (WHERE is_admin = true)::int as admin_users,
          COUNT(*) FILTER (WHERE email_verified = true)::int as verified_users,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int as new_users_7d,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::int as new_users_30d
        FROM users
      `,
      // Receipt stats
      sql`
        SELECT 
          COUNT(*)::int as total_receipts,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int as receipts_7d,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::int as receipts_30d,
          COALESCE(SUM(total_amount), 0)::numeric as total_amount
        FROM receipts
        WHERE is_deleted IS NULL OR is_deleted = false
      `,
      // Active sessions (currently valid)
      sql`
        SELECT COUNT(*)::int as active_sessions
        FROM sessions
        WHERE expires_at > NOW()
      `,
      // Recent users (last 5 registered)
      sql`
        SELECT id, email, full_name, created_at, is_admin, is_active
        FROM users
        ORDER BY created_at DESC
        LIMIT 5
      `,
      // Users active today
      sql`
        SELECT COUNT(DISTINCT user_id)::int as active_today
        FROM sessions
        WHERE expires_at > NOW()
          AND created_at > NOW() - INTERVAL '24 hours'
      `,
    ])

    // Calculate average receipts per user
    const totalUsers = (userStats[0] as { total_users: number }).total_users || 1
    const totalReceipts = (receiptStats[0] as { total_receipts: number }).total_receipts || 0
    const avgReceiptsPerUser = Math.round((totalReceipts / totalUsers) * 10) / 10

    return res.status(200).json({
      stats: {
        users: userStats[0],
        receipts: {
          ...(receiptStats[0] as Record<string, unknown>),
          avg_per_user: avgReceiptsPerUser,
        },
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
