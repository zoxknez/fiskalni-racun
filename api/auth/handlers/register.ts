// Register handler

import { sql } from '../../db.js'
import {
  ConflictError,
  InternalServerError,
  ValidationError,
  withErrorHandling,
} from '../../lib/errors.js'
import { parseJsonBody } from '../../lib/request-helpers.js'
import { withRateLimit } from '../../middleware/rateLimit.js'
import { registerSchema } from '../schemas/register.js'
import { hashPassword } from '../utils/password.js'
import { createSession } from '../utils/sessions.js'
import { normalizeEmail } from '../utils/validation.js'

async function handleRegisterInternal(req: Request): Promise<Response> {
  // Check database connection first
  const DATABASE_URL = process.env['DATABASE_URL'] || process.env['VITE_NEON_DATABASE_URL']
  if (!DATABASE_URL) {
    throw new InternalServerError('Database configuration error. Please contact support.')
  }

  const body = await parseJsonBody(req)

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
  const existingUsers =
    (await sql`SELECT id FROM users WHERE email = ${normalizedEmail}`) as Array<{
      id: string
    }>

  if (existingUsers.length > 0) {
    throw new ConflictError('User already exists')
  }

  // Create user
  const passwordHash = await hashPassword(password)

  const result = (await sql`
    INSERT INTO users (email, password_hash, full_name)
    VALUES (${normalizedEmail}, ${passwordHash}, ${fullName || null})
    RETURNING id, email, full_name, avatar_url, email_verified, created_at, updated_at, last_login_at, is_active
  `) as Record<string, unknown>[]

  const user = result[0]
  if (!user) {
    throw new InternalServerError('Failed to create user')
  }

  // Create session
  const token = await createSession(user['id'] as string)

  return new Response(JSON.stringify({ success: true, user, token }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Export rate-limited handler (uses IP-based rate limiting)
export const handleRegister = withRateLimit(
  'auth:register',
  withErrorHandling(handleRegisterInternal)
)
