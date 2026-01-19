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
    const [
      userStats,
      receiptStats,
      sessionStats,
      recentUsers,
      activeToday,
      topUsersByReceipts,
      warrantyStats,
      receiptsToday,
      userGrowth,
    ] = await Promise.all([
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
      // Top 10 users by receipt count
      sql`
        SELECT 
          u.id,
          u.email,
          u.full_name,
          u.avatar_url,
          u.is_admin,
          u.created_at,
          COUNT(r.id)::int as receipt_count,
          COALESCE(SUM(r.total_amount), 0)::numeric as total_amount
        FROM users u
        LEFT JOIN receipts r ON r.user_id = u.id AND (r.is_deleted IS NULL OR r.is_deleted = false)
        GROUP BY u.id, u.email, u.full_name, u.avatar_url, u.is_admin, u.created_at
        HAVING COUNT(r.id) > 0
        ORDER BY receipt_count DESC, total_amount DESC
        LIMIT 10
      `,
      // Warranty/Guarantee stats
      sql`
        SELECT 
          COUNT(*)::int as total_warranties,
          COUNT(*) FILTER (WHERE warranty_expiry > NOW())::int as active_warranties,
          COUNT(*) FILTER (WHERE warranty_expiry <= NOW() AND warranty_expiry IS NOT NULL)::int as expired_warranties,
          COUNT(*) FILTER (WHERE warranty_expiry > NOW() AND warranty_expiry < NOW() + INTERVAL '30 days')::int as expiring_soon
        FROM receipts
        WHERE warranty_expiry IS NOT NULL
          AND (is_deleted IS NULL OR is_deleted = false)
      `,
      // Receipts created today
      sql`
        SELECT 
          COUNT(*)::int as receipts_today,
          COALESCE(SUM(total_amount), 0)::numeric as amount_today
        FROM receipts
        WHERE created_at > NOW() - INTERVAL '24 hours'
          AND (is_deleted IS NULL OR is_deleted = false)
      `,
      // User growth calculation (compare this month vs last month)
      sql`
        SELECT 
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::int as this_month,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '60 days' AND created_at <= NOW() - INTERVAL '30 days')::int as last_month
        FROM users
      `,
    ])

    // Calculate average receipts per user
    const totalUsers = (userStats[0] as { total_users: number }).total_users || 1
    const totalReceipts = (receiptStats[0] as { total_receipts: number }).total_receipts || 0
    const avgReceiptsPerUser = Math.round((totalReceipts / totalUsers) * 10) / 10

    // Calculate user growth percentage
    const thisMonth = (userGrowth[0] as { this_month: number }).this_month || 0
    const lastMonth = (userGrowth[0] as { last_month: number }).last_month || 0
    const growthPercentage =
      lastMonth > 0
        ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
        : thisMonth > 0
          ? 100
          : 0

    return res.status(200).json({
      stats: {
        users: {
          ...(userStats[0] as Record<string, unknown>),
          growth_percentage: growthPercentage,
        },
        receipts: {
          ...(receiptStats[0] as Record<string, unknown>),
          avg_per_user: avgReceiptsPerUser,
          receipts_today: (receiptsToday[0] as { receipts_today: number }).receipts_today,
          amount_today: (receiptsToday[0] as { amount_today: number }).amount_today,
        },
        warranties: warrantyStats[0],
        sessions: sessionStats[0],
        activeToday: activeToday[0],
      },
      topUsers: topUsersByReceipts,
      recentUsers,
    })
  } catch (error) {
    console.error('[Admin Stats] Error:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
}
