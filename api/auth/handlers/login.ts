// Login handler

import { sql } from '../../db'
import {
  handleError,
  UnauthorizedError,
  ValidationError,
  withErrorHandling,
} from '../../lib/errors'
import { withRateLimit } from '../../middleware/rateLimit'
import { loginSchema } from '../schemas/login'
import { verifyPassword } from '../utils/password'
import { createSession } from '../utils/sessions'
import { normalizeEmail } from '../utils/validation'

async function handleLoginInternal(req: Request): Promise<Response> {
  try {
    const body = await req.json()

    // Validate input with Zod
    const validationResult = loginSchema.safeParse(body)
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid input',
        validationResult.error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        }))
      )
    }

    const { email, password } = validationResult.data
    const normalizedEmail = normalizeEmail(email)

    const users = await sql`
      SELECT id, email, password_hash, full_name, avatar_url, email_verified, created_at, updated_at, last_login_at, is_active
      FROM users
      WHERE email = ${normalizedEmail} AND is_active = true
    `

    if (users.length === 0) {
      // Don't reveal if user exists for security
      throw new UnauthorizedError('Invalid credentials')
    }

    const userRow = users[0]
    const isValid = await verifyPassword(password, userRow.password_hash)

    if (!isValid) {
      throw new UnauthorizedError('Invalid credentials')
    }

    // Update last login
    await sql`UPDATE users SET last_login_at = NOW() WHERE id = ${userRow.id}`

    // Create session
    const token = await createSession(userRow.id)

    const { password_hash: _, ...user } = userRow

    return new Response(JSON.stringify({ success: true, user, token }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return handleError(error)
  }
}

// Export rate-limited handler
export const handleLogin = withRateLimit(
  'auth:login',
  withErrorHandling(handleLoginInternal),
  async (req: Request) => {
    try {
      const { email } = await req.json()
      return email ? normalizeEmail(email) : undefined
    } catch {
      return undefined
    }
  }
)
