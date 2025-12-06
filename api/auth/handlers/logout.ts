// Logout handler

import { withErrorHandling } from '../../lib/errors'
import { deleteSession } from '../utils/sessions'
import { hashToken } from '../utils/token'

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
