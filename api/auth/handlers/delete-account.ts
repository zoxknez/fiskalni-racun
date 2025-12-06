// Delete account handler

import { sql } from '../../db.js'
import { UnauthorizedError, withErrorHandling } from '../../lib/errors.js'
import { verifyAuth } from '../middleware/auth.js'
import { deleteAllUserSessions } from '../utils/sessions.js'

async function handleDeleteAccountInternal(req: Request): Promise<Response> {
  const userId = await verifyAuth(req)
  if (!userId) {
    throw new UnauthorizedError()
  }

  // Soft delete user
  await sql`UPDATE users SET is_active = false, updated_at = NOW() WHERE id = ${userId}`

  // Invalidate all sessions
  await deleteAllUserSessions(userId)

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
}

export const handleDeleteAccount = withErrorHandling(handleDeleteAccountInternal)
