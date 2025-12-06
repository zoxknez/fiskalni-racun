// Logout handler

import { withErrorHandling } from '../../lib/errors.js'
import { deleteSession } from '../utils/sessions.js'
import { hashToken } from '../utils/token.js'

async function handleLogoutInternal(req: Request): Promise<Response> {
  const authHeader = req.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    const tokenHash = await hashToken(token)
    await deleteSession(tokenHash)
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
}

export const handleLogout = withErrorHandling(handleLogoutInternal)
