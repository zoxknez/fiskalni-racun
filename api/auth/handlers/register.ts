// Register handler

import { sql } from '../../db.js'
import {
  ConflictError,
  handleError,
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
  try {
    console.log('[Register] Starting registration...')

    // Check database connection first
    const DATABASE_URL = process.env['DATABASE_URL'] || process.env['VITE_NEON_DATABASE_URL']
    if (!DATABASE_URL) {
      console.error('[Register] DATABASE_URL not found!')
      throw new InternalServerError('Database configuration error. Please contact support.')
    }
    console.log('[Register] DATABASE_URL found, parsing body...')

    const body = await parseJsonBody(req)
    console.log('[Register] Body parsed, validating...')

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
    console.log('[Register] Checking if user exists...')

    // Check if user exists
    const existingUsers =
      (await sql`SELECT id FROM users WHERE email = ${normalizedEmail}`) as Array<{
        id: string
      }>
    console.log('[Register] User check complete, result:', existingUsers.length)

    if (existingUsers.length > 0) {
      throw new ConflictError('User already exists')
    }

    console.log('[Register] Hashing password...')
    // Create user
    const passwordHash = await hashPassword(password)
    console.log('[Register] Inserting user...')

    const result = await sql`
      INSERT INTO users (email, password_hash, full_name)
      VALUES (${normalizedEmail}, ${passwordHash}, ${fullName || null})
      RETURNING id, email, full_name, avatar_url, email_verified, created_at, updated_at, last_login_at, is_active
    `
    console.log('[Register] User inserted, creating session...')
    const user = result[0]!

    // Create session
    const token = await createSession(user['id'] as string)
    console.log('[Register] Registration complete!')

    return new Response(JSON.stringify({ success: true, user, token }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[Register] Error:', error)
    return handleError(error)
  }
}

// Export rate-limited handler (uses IP-based rate limiting)
export const handleRegister = withRateLimit(
  'auth:register',
  withErrorHandling(handleRegisterInternal)
)
