// Password reset handlers

import { sql } from '../../db.js'
import { handleError, ValidationError, withErrorHandling } from '../../lib/errors.js'
import { parseJsonBody } from '../../lib/request-helpers.js'
import { withRateLimit } from '../../middleware/rateLimit.js'
import { requestPasswordResetSchema, resetPasswordSchema } from '../schemas/password-reset.js'
import { hashPassword } from '../utils/password.js'
import { deleteAllUserSessions } from '../utils/sessions.js'
import { generateSessionToken, hashToken } from '../utils/token.js'
import { normalizeEmail } from '../utils/validation.js'

const RESET_TOKEN_DURATION_MS = 1 * 60 * 60 * 1000 // 1 hour

async function handleRequestPasswordResetInternal(req: Request): Promise<Response> {
  try {
    const body = await parseJsonBody(req)

    // Validate input with Zod
    const validationResult = requestPasswordResetSchema.safeParse(body)
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid input',
        validationResult.error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        }))
      )
    }

    const { email } = validationResult.data
    const normalizedEmail = normalizeEmail(email)

    const users =
      (await sql`SELECT id FROM users WHERE email = ${normalizedEmail} AND is_active = true`) as Array<{
        id: string
      }>

    if (users.length === 0) {
      // Don't reveal if user exists for security
      return new Response(
        JSON.stringify({ success: true, message: 'If account exists, email sent' }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const userRow = users[0]
    if (!userRow) {
      return new Response(
        JSON.stringify({ success: true, message: 'If account exists, email sent' }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
    const userId = userRow['id'] as string
    const resetToken = generateSessionToken()
    const tokenHash = await hashToken(resetToken)
    const expiresAt = new Date(Date.now() + RESET_TOKEN_DURATION_MS)

    await sql`
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
      VALUES (${userId}, ${tokenHash}, ${expiresAt.toISOString()})
    `

    // Send password reset email
    const { sendPasswordResetEmail } = await import('../../services/email')
    await sendPasswordResetEmail(normalizedEmail, resetToken)

    return new Response(
      JSON.stringify({ success: true, message: 'If account exists, email sent' }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    return handleError(error)
  }
}

// Export rate-limited handler (uses IP-based rate limiting)
export const handleRequestPasswordReset = withRateLimit(
  'auth:password-reset',
  withErrorHandling(handleRequestPasswordResetInternal)
)

async function handleResetPasswordInternal(req: Request): Promise<Response> {
  try {
    const body = await parseJsonBody(req)

    // Validate input with Zod
    const validationResult = resetPasswordSchema.safeParse(body)
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid input',
        validationResult.error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        }))
      )
    }

    const { token, newPassword } = validationResult.data

    const tokenHash = await hashToken(token)

    const tokens = (await sql`
      SELECT user_id FROM password_reset_tokens
      WHERE token_hash = ${tokenHash}
        AND expires_at > NOW()
        AND used = false
      LIMIT 1
    `) as { user_id: string }[]

    if (tokens.length === 0) {
      throw new ValidationError('Invalid or expired token')
    }

    const tokenRow = tokens[0]
    if (!tokenRow) {
      throw new ValidationError('Invalid or expired token')
    }
    const userId = tokenRow.user_id
    const newHash = await hashPassword(newPassword)

    await sql`UPDATE users SET password_hash = ${newHash}, updated_at = NOW() WHERE id = ${userId}`
    await sql`UPDATE password_reset_tokens SET used = true WHERE token_hash = ${tokenHash}`

    // Invalidate all sessions for security
    await deleteAllUserSessions(userId)

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return handleError(error)
  }
}

// Export handler (no rate limit needed as token is single-use)
export const handleResetPassword = withErrorHandling(handleResetPasswordInternal)
