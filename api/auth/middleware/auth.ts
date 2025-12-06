// Authentication middleware

import { verifySession } from '../utils/sessions.js'
import { hashToken } from '../utils/token.js'

export async function verifyAuth(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.split(' ')[1]
  if (!token) {
    return null
  }

  const tokenHash = await hashToken(token)
  const userId = await verifySession(tokenHash)

  return userId
}

export function requireAuth(userId: string | null): Response | null {
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized', code: 'UNAUTHORIZED' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return null
}
