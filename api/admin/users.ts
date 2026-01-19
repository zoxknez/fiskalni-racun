import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { canModifyUser, getDatabase, verifyAdmin } from '../lib/auth.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
}

// Validation schemas
const updateUserSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  action: z.enum(['toggle_admin', 'activate', 'deactivate'], {
    errorMap: () => ({ message: 'Action must be toggle_admin, activate, or deactivate' }),
  }),
})

const deleteUserSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const sql = getDatabase()
    const authHeader = req.headers['authorization'] as string | undefined

    // Verify admin using shared utility
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
          COALESCE((SELECT COUNT(*) FROM receipts WHERE user_id = users.id AND (is_deleted IS NULL OR is_deleted = false)), 0)::int as receipt_count,
          COALESCE((SELECT COUNT(*) FROM sessions WHERE user_id = users.id AND expires_at > NOW()), 0)::int as active_sessions
        FROM users
        ORDER BY created_at DESC
      `
      return res.status(200).json({ users })
    }

    // PATCH - Update user (toggle admin, activate/deactivate)
    if (req.method === 'PATCH') {
      const validation = updateUserSchema.safeParse(req.body)

      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid input',
          details: validation.error.errors.map((e) => e.message),
        })
      }

      const { userId, action } = validation.data

      // Check if action is allowed using shared utility
      const canModify = canModifyUser(admin.id, userId, action)
      if (!canModify.allowed) {
        return res.status(400).json({ error: canModify.reason })
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

    // DELETE - Delete user (cascade delete using CTE for atomicity)
    if (req.method === 'DELETE') {
      const validation = deleteUserSchema.safeParse(req.body)
      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid input',
          details: validation.error.errors.map((e) => e.message),
        })
      }

      const { userId } = validation.data

      // Check if action is allowed using shared utility
      const canModify = canModifyUser(admin.id, userId, 'delete')
      if (!canModify.allowed) {
        return res.status(400).json({ error: canModify.reason })
      }

      // Use CTE (Common Table Expression) for atomic cascade delete
      const result = await sql`
        WITH deleted_sessions AS (
          DELETE FROM sessions WHERE user_id = ${userId}
        ),
        deleted_reminders AS (
          DELETE FROM reminders WHERE user_id = ${userId}
        ),
        deleted_devices AS (
          DELETE FROM devices WHERE user_id = ${userId}
        ),
        deleted_bills AS (
          DELETE FROM household_bills WHERE user_id = ${userId}
        ),
        deleted_receipts AS (
          DELETE FROM receipts WHERE user_id = ${userId}
        )
        DELETE FROM users WHERE id = ${userId}
        RETURNING id, email
      `

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
