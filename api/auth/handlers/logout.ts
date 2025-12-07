// Logout handler

import { withErrorHandling } from '../../lib/errors.js'
import { getHeader } from '../../lib/request-helpers.js'
import { deleteSession } from '../utils/sessions.js'
import { hashToken } from '../utils/token.js'

async function handleLogoutInternal(req: Request): Promise<Response> {
  const authHeader = getHeader(req, 'Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    if (token) {
      const tokenHash = await hashToken(token)
      await deleteSession(tokenHash)
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
}

export const handleLogout = withErrorHandling(handleLogoutInternal)
