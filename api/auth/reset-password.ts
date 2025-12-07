import { neon } from '@neondatabase/serverless'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
}

// Inline schema
const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
})

// Hash token for lookup
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Hash password with PBKDF2
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )

  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  )

  const hashHex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return `pbkdf2:${saltHex}:${hashHex}`
}

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
    const validationResult = resetPasswordSchema.safeParse(req.body)
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: validationResult.error.errors,
      })
    }

    const { token, newPassword } = validationResult.data

    // Initialize Neon
    const sql = neon(DATABASE_URL)
    const tokenHash = await hashToken(token)

    // Find valid token
    const tokens = await sql`
      SELECT user_id FROM password_reset_tokens
      WHERE token_hash = ${tokenHash}
        AND expires_at > NOW()
        AND used = false
      LIMIT 1
    `

    if (tokens.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired token' })
    }

    const userId = tokens[0]?.user_id
    const newHash = await hashPassword(newPassword)

    // Update password
    await sql`UPDATE users SET password_hash = ${newHash}, updated_at = NOW() WHERE id = ${userId}`

    // Mark token as used
    await sql`UPDATE password_reset_tokens SET used = true WHERE token_hash = ${tokenHash}`

    // Invalidate all sessions for security
    await sql`DELETE FROM sessions WHERE user_id = ${userId}`

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('[ResetPassword] Error:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
}
