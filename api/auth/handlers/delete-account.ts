// Delete account handler

import { sql } from '../../db'
import { UnauthorizedError, withErrorHandling } from '../../lib/errors'
import { verifyAuth } from '../middleware/auth'
import { deleteAllUserSessions } from '../utils/sessions'

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
