// Update profile handler

import { sql } from '../../db.js'
import { UnauthorizedError, ValidationError, withErrorHandling } from '../../lib/errors.js'
import { parseJsonBody } from '../../lib/request-helpers.js'
import { verifyAuth } from '../middleware/auth.js'
import { updateProfileSchema } from '../schemas/profile.js'

async function handleProfileUpdateInternal(req: Request): Promise<Response> {
  const userId = await verifyAuth(req)
  if (!userId) {
    throw new UnauthorizedError()
  }

  const body = await parseJsonBody(req)

  // Validate input with Zod
  const validationResult = updateProfileSchema.safeParse(body)
  if (!validationResult.success) {
    throw new ValidationError(
      'Invalid input',
      validationResult.error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }))
    )
  }

  const { fullName, avatarUrl } = validationResult.data

  const result = await sql`
    UPDATE users
    SET
      full_name = COALESCE(${fullName ?? null}, full_name),
      avatar_url = COALESCE(${avatarUrl ?? null}, avatar_url),
      updated_at = NOW()
    WHERE id = ${userId}
    RETURNING id, email, full_name, avatar_url, email_verified, created_at, updated_at, last_login_at, is_active
  `

  return new Response(JSON.stringify({ success: true, user: result[0] }), {
    headers: { 'Content-Type': 'application/json' },
  })
}

export const handleProfileUpdate = withErrorHandling(handleProfileUpdateInternal)
