import { neon } from '@neondatabase/serverless'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
}

// Inline schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// Verify password against PBKDF2 hash
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(':')
  if (parts[0] !== 'pbkdf2' || parts.length !== 3) {
    return false
  }

  const saltHex = parts[1]
  const hashHex = parts[2]

  // Convert salt from hex to Uint8Array
  const salt = new Uint8Array(
    saltHex.match(/.{1,2}/g)?.map((byte) => Number.parseInt(byte, 16)) || []
  )

  const encoder = new TextEncoder()
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

  const computedHashHex = Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  return computedHashHex === hashHex
}

// Generate session token
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

    // Initialize Neon
    const sql = neon(DATABASE_URL)

    // Parse and validate body
    const body = req.body
    const validationResult = loginSchema.safeParse(body)
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: validationResult.error.errors,
      })
    }

    const { email, password } = validationResult.data
    const normalizedEmail = email.toLowerCase().trim()

    // Find user
    const users = await sql`
      SELECT id, email, password_hash, full_name, avatar_url, email_verified, created_at, updated_at, last_login_at, is_active
      FROM users
      WHERE email = ${normalizedEmail} AND is_active = true
    `

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const userRow = users[0]

    // Verify password
    const isValid = await verifyPassword(password, userRow.password_hash as string)
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Update last login
    await sql`UPDATE users SET last_login_at = NOW() WHERE id = ${userRow.id}`

    // Create session
    const token = generateToken()
    const tokenHash = await hashToken(token)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    await sql`
      INSERT INTO sessions (user_id, token_hash, expires_at)
      VALUES (${userRow.id}, ${tokenHash}, ${expiresAt.toISOString()})
    `

    // Remove password_hash from response
    const { password_hash: _, ...user } = userRow

    return res.status(200).json({ success: true, user, token })
  } catch (error) {
    console.error('[Login] Error:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
}
