import { neon } from '@neondatabase/serverless'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
}

// Inline schema
const requestPasswordResetSchema = z.object({
  email: z.string().email(),
})

// Generate token
function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Hash token for storage
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

const RESET_TOKEN_DURATION_MS = 1 * 60 * 60 * 1000 // 1 hour

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get database URL
    const DATABASE_URL = process.env['DATABASE_URL'] || process.env['VITE_NEON_DATABASE_URL']
    if (!DATABASE_URL) {
      return res.status(500).json({ error: 'Database configuration error' })
    }

    // Validate body
    const validationResult = requestPasswordResetSchema.safeParse(req.body)
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: validationResult.error.errors,
      })
    }

    const { email } = validationResult.data
    const normalizedEmail = email.toLowerCase().trim()

    // Initialize Neon
    const sql = neon(DATABASE_URL)

    // Find user
    const users =
      await sql`SELECT id FROM users WHERE email = ${normalizedEmail} AND is_active = true`

    if (users.length === 0) {
      // Don't reveal if user exists for security
      return res.status(200).json({ success: true, message: 'If account exists, email sent' })
    }

    const userId = users[0]?.id
    const resetToken = generateToken()
    const tokenHash = await hashToken(resetToken)
    const expiresAt = new Date(Date.now() + RESET_TOKEN_DURATION_MS)

    await sql`
      INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
      VALUES (${userId}, ${tokenHash}, ${expiresAt.toISOString()})
    `

    // Send password reset email
    try {
      const { sendPasswordResetEmail } = await import('../services/email')
      await sendPasswordResetEmail(normalizedEmail, resetToken)
    } catch (emailError) {
      console.error('[RequestPasswordReset] Email error:', emailError)
      // Continue - don't fail the request if email fails
    }

    return res.status(200).json({ success: true, message: 'If account exists, email sent' })
  } catch (error) {
    console.error('[RequestPasswordReset] Error:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
}
