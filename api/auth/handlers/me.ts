// Get current user handler

import { sql } from '../../db.js'
import { UnauthorizedError, withErrorHandling } from '../../lib/errors.js'
import { getHeader } from '../../lib/request-helpers.js'
import { hashToken } from '../utils/token.js'

async function handleMeInternal(req: Request): Promise<Response> {
  const authHeader = getHeader(req, 'Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError()
  }

  const token = authHeader.split(' ')[1]
  if (!token) {
    throw new UnauthorizedError()
  }
  const tokenHash = await hashToken(token)

  const result = (await sql`
    SELECT u.id, u.email, u.full_name, u.avatar_url, u.email_verified, u.created_at, u.updated_at, u.last_login_at, u.is_active
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token_hash = ${tokenHash}
      AND s.expires_at > NOW()
      AND u.is_active = true
    LIMIT 1
  `) as Record<string, unknown>[]

  if (result.length === 0) {
    throw new UnauthorizedError()
  }

  return new Response(JSON.stringify({ user: result[0] }), {
    headers: { 'Content-Type': 'application/json' },
  })
}

export const handleMe = withErrorHandling(handleMeInternal)
