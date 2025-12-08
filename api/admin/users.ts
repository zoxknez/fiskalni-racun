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

    // GET - List all users
    if (req.method === 'GET') {
      const users = await sql`
        SELECT 
          id, email, full_name, avatar_url, email_verified, 
          is_active, is_admin, created_at, updated_at, last_login_at,
          (SELECT COUNT(*) FROM receipts WHERE user_id = users.id) as receipt_count,
          (SELECT COUNT(*) FROM sessions WHERE user_id = users.id AND expires_at > NOW()) as active_sessions
        FROM users
        ORDER BY created_at DESC
      `
      return res.status(200).json({ users })
    }

    // PATCH - Update user (toggle admin, activate/deactivate)
    if (req.method === 'PATCH') {
      const { userId, action } = req.body as { userId: string; action: string }

      if (!userId || !action) {
        return res.status(400).json({ error: 'userId and action are required' })
      }

      // Prevent self-modification for certain actions
      if (userId === admin.id && (action === 'toggle_admin' || action === 'deactivate')) {
        return res
          .status(400)
          .json({ error: 'Cannot modify your own admin status or deactivate yourself' })
      }

      let result: Record<string, unknown>[]
      switch (action) {
        case 'toggle_admin':
          result = await sql`
            UPDATE users 
            SET is_admin = NOT is_admin, updated_at = NOW()
            WHERE id = ${userId}
            RETURNING id, email, is_admin
          `
          break

        case 'activate':
          result = await sql`
            UPDATE users 
            SET is_active = true, updated_at = NOW()
            WHERE id = ${userId}
            RETURNING id, email, is_active
          `
          break

        case 'deactivate':
          result = await sql`
            UPDATE users 
            SET is_active = false, updated_at = NOW()
            WHERE id = ${userId}
            RETURNING id, email, is_active
          `
          // Also invalidate all sessions
          await sql`DELETE FROM sessions WHERE user_id = ${userId}`
          break

        default:
          return res.status(400).json({ error: 'Invalid action' })
      }

      if (result.length === 0) {
        return res.status(404).json({ error: 'User not found' })
      }

      return res.status(200).json({ user: result[0], action })
    }

    // DELETE - Delete user
    if (req.method === 'DELETE') {
      const { userId } = req.body as { userId: string }

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' })
      }

      // Prevent self-deletion
      if (userId === admin.id) {
        return res.status(400).json({ error: 'Cannot delete your own account from admin panel' })
      }

      // Delete user data in order (foreign key constraints)
      await sql`DELETE FROM sessions WHERE user_id = ${userId}`
      await sql`DELETE FROM devices WHERE user_id = ${userId}`
      await sql`DELETE FROM reminders WHERE user_id = ${userId}`
      await sql`DELETE FROM household_bills WHERE user_id = ${userId}`
      await sql`DELETE FROM receipts WHERE user_id = ${userId}`
      const result = await sql`DELETE FROM users WHERE id = ${userId} RETURNING id, email`

      if (result.length === 0) {
        return res.status(404).json({ error: 'User not found' })
      }

      return res.status(200).json({ message: 'User deleted', user: result[0] })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('[Admin Users] Error:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
}
