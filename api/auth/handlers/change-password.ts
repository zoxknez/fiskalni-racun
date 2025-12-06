// Change password handler

import { sql } from '../../db.js'
import {
  handleError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  withErrorHandling,
} from '../../lib/errors.js'
import { withRateLimit } from '../../middleware/rateLimit.js'
import { verifyAuth } from '../middleware/auth.js'
import { changePasswordSchema } from '../schemas/change-password.js'
import { hashPassword, verifyPassword } from '../utils/password.js'

async function handleChangePasswordInternal(req: Request): Promise<Response> {
  try {
    const userId = await verifyAuth(req)
    if (!userId) {
      throw new UnauthorizedError()
    }

    const body = await req.json()

    // Validate input with Zod
    const validationResult = changePasswordSchema.safeParse(body)
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid input',
        validationResult.error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        }))
      )
    }

    const { currentPassword, newPassword } = validationResult.data

    const users = await sql`SELECT password_hash FROM users WHERE id = ${userId}`
    if (users.length === 0) {
      throw new NotFoundError('User')
    }

    const isValid = await verifyPassword(currentPassword, users[0].password_hash)

    if (!isValid) {
      throw new ValidationError('Invalid password')
    }

    const newHash = await hashPassword(newPassword)
    await sql`UPDATE users SET password_hash = ${newHash}, updated_at = NOW() WHERE id = ${userId}`

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return handleError(error)
  }
}

// Export rate-limited handler
export const handleChangePassword = withRateLimit(
  'auth:change-password',
  withErrorHandling(handleChangePasswordInternal)
)
