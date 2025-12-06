// Register handler

import { sql } from '../../db.js'
import { ConflictError, handleError, ValidationError, withErrorHandling } from '../../lib/errors.js'
import { withRateLimit } from '../../middleware/rateLimit.js'
import { registerSchema } from '../schemas/register.js'
import { hashPassword } from '../utils/password.js'
import { createSession } from '../utils/sessions.js'
import { normalizeEmail } from '../utils/validation.js'

async function handleRegisterInternal(req: Request): Promise<Response> {
  try {
    const body = await req.json()

    // Validate input with Zod
    const validationResult = registerSchema.safeParse(body)
    if (!validationResult.success) {
      throw new ValidationError(
        'Invalid input',
        validationResult.error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        }))
      )
    }

    const { email, password, fullName } = validationResult.data
    const normalizedEmail = normalizeEmail(email)

    // Check if user exists
    const existingUsers = await sql`SELECT id FROM users WHERE email = ${normalizedEmail}`
    if (existingUsers.length > 0) {
      throw new ConflictError('User already exists')
    }

    // Create user
    const passwordHash = await hashPassword(password)
    const result = await sql`
      INSERT INTO users (email, password_hash, full_name)
      VALUES (${normalizedEmail}, ${passwordHash}, ${fullName || null})
      RETURNING id, email, full_name, avatar_url, email_verified, created_at, updated_at, last_login_at, is_active
    `
    const user = result[0]!

    // Create session
    const token = await createSession(user['id'] as string)

    return new Response(JSON.stringify({ success: true, user, token }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return handleError(error)
  }
}

// Export rate-limited handler
export const handleRegister = withRateLimit(
  'auth:register',
  withErrorHandling(handleRegisterInternal),
  async (req: Request) => {
    try {
      const { email } = await req.clone().json()
      return email ? normalizeEmail(email) : undefined
    } catch {
      return undefined
    }
  }
)
