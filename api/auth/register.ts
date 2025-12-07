import { neon } from '@neondatabase/serverless'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'

export const config = {
  runtime: 'nodejs',
  maxDuration: 30,
}

// Inline schema
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().optional(),
})

// Simple bcrypt alternative using Web Crypto
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
    const validationResult = registerSchema.safeParse(body)
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid input',
        details: validationResult.error.errors,
      })
    }

    const { email, password, fullName } = validationResult.data
    const normalizedEmail = email.toLowerCase().trim()

    // Check if user exists
    const existingUsers = await sql`SELECT id FROM users WHERE email = ${normalizedEmail}`
    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'User already exists' })
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password)
    const result = await sql`
      INSERT INTO users (email, password_hash, full_name)
      VALUES (${normalizedEmail}, ${passwordHash}, ${fullName || null})
      RETURNING id, email, full_name, avatar_url, email_verified, created_at, updated_at, last_login_at, is_active
    `

    const user = result[0]
    if (!user) {
      return res.status(500).json({ error: 'Failed to create user' })
    }

    // Create session
    const token = generateToken()
    const tokenHash = await hashToken(token)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    await sql`
      INSERT INTO sessions (user_id, token_hash, expires_at)
      VALUES (${user.id}, ${tokenHash}, ${expiresAt.toISOString()})
    `

    return res.status(200).json({ success: true, user, token })
  } catch (error) {
    console.error('[Register] Error:', error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
}
