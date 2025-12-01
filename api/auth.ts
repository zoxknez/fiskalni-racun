import { sql } from './db'

export const config = {
  runtime: 'edge',
}

// PBKDF2 Configuration
const PBKDF2_ITERATIONS = 100000
const PBKDF2_KEY_LENGTH = 256
const SALT_LENGTH = 16

function generateSalt(): string {
  const salt = new Uint8Array(SALT_LENGTH)
  crypto.getRandomValues(salt)
  return Array.from(salt)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function hashPassword(password: string, existingSalt?: string): Promise<string> {
  const salt = existingSalt || generateSalt()
  const encoder = new TextEncoder()

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    PBKDF2_KEY_LENGTH
  )

  const hashArray = Array.from(new Uint8Array(derivedBits))
  const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

  return `${salt}:${hash}`
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, _hash] = storedHash.split(':')
  if (!salt || !_hash) {
    // Legacy hash format support if needed, or fail
    return false
  }

  const newHash = await hashPassword(password, salt)
  return newHash === storedHash
}

function generateSessionToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export default async function handler(req: Request) {
  const url = new URL(req.url)
  const path = url.pathname.replace('/api/auth/', '') // simple routing

  try {
    if (req.method === 'POST' && path === 'register') {
      const { email, password, fullName } = await req.json()
      const normalizedEmail = email.trim().toLowerCase()

      // Check if user exists
      const existingUsers = await sql`SELECT id FROM users WHERE email = ${normalizedEmail}`
      if (existingUsers.length > 0) {
        return new Response(JSON.stringify({ error: 'User already exists' }), { status: 400 })
      }

      const passwordHash = await hashPassword(password)

      const result = await sql`
        INSERT INTO users (email, password_hash, full_name)
        VALUES (${normalizedEmail}, ${passwordHash}, ${fullName || null})
        RETURNING id, email, full_name, avatar_url, email_verified, created_at, updated_at, last_login_at, is_active
      `
      const user = result[0]

      const token = generateSessionToken()
      const tokenHash = await hashToken(token)
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      await sql`
        INSERT INTO sessions (user_id, token_hash, expires_at)
        VALUES (${user.id}, ${tokenHash}, ${expiresAt.toISOString()})
      `

      return new Response(JSON.stringify({ success: true, user, token }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (req.method === 'POST' && path === 'login') {
      const { email, password } = await req.json()
      const normalizedEmail = email.trim().toLowerCase()

      const users = await sql`
        SELECT id, email, password_hash, full_name, avatar_url, email_verified, created_at, updated_at, last_login_at, is_active
        FROM users
        WHERE email = ${normalizedEmail} AND is_active = true
      `

      if (users.length === 0) {
        return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 })
      }

      const userRow = users[0]
      const isValid = await verifyPassword(password, userRow.password_hash)

      if (!isValid) {
        return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 })
      }

      await sql`UPDATE users SET last_login_at = NOW() WHERE id = ${userRow.id}`

      const token = generateSessionToken()
      const tokenHash = await hashToken(token)
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      await sql`
        INSERT INTO sessions (user_id, token_hash, expires_at)
        VALUES (${userRow.id}, ${tokenHash}, ${expiresAt.toISOString()})
      `

      const { password_hash: _, ...user } = userRow

      return new Response(JSON.stringify({ success: true, user, token }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (req.method === 'GET' && path === 'me') {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
      }
      const token = authHeader.split(' ')[1]
      const simpleHash = await hashToken(token)

      const result = await sql`
        SELECT u.id, u.email, u.full_name, u.avatar_url, u.email_verified, u.created_at, u.updated_at, u.last_login_at, u.is_active
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token_hash = ${simpleHash}
          AND s.expires_at > NOW()
          AND u.is_active = true
      `

      if (result.length === 0) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
      }

      return new Response(JSON.stringify({ user: result[0] }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (req.method === 'POST' && path === 'logout') {
      const authHeader = req.headers.get('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1]
        const simpleHash = await hashToken(token)
        await sql`DELETE FROM sessions WHERE token_hash = ${simpleHash}`
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (req.method === 'PATCH' && path === 'profile') {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
      }
      const token = authHeader.split(' ')[1]
      const simpleHash = await hashToken(token)

      // Verify session and get user_id
      const sessions = await sql`
        SELECT user_id FROM sessions 
        WHERE token_hash = ${simpleHash} AND expires_at > NOW()
      `

      if (sessions.length === 0) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
      }

      const userId = sessions[0].user_id
      const { fullName, avatarUrl } = await req.json()

      const result = await sql`
        UPDATE users
        SET
          full_name = COALESCE(${fullName ?? null}, full_name),
          avatar_url = COALESCE(${avatarUrl ?? null}, avatar_url),
          updated_at = NOW()
        WHERE id = ${userId}
        RETURNING id, email, full_name, avatar_url, email_verified, created_at, updated_at, last_login_at, is_active
      `

      return new Response(JSON.stringify({ success: true, user: result[0] }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (req.method === 'POST' && path === 'request-password-reset') {
      const { email } = await req.json()
      const normalizedEmail = email.trim().toLowerCase()

      const users =
        await sql`SELECT id FROM users WHERE email = ${normalizedEmail} AND is_active = true`
      if (users.length === 0) {
        // Don't reveal if user exists
        return new Response(
          JSON.stringify({ success: true, message: 'If account exists, email sent' }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }

      const userId = users[0].id
      const resetToken = generateSessionToken() // Reuse this helper
      const tokenHash = await hashToken(resetToken)
      const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000) // 1 hour

      await sql`
        INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
        VALUES (${userId}, ${tokenHash}, ${expiresAt.toISOString()})
      `

      // MOCK EMAIL SENDING
      console.log(`[MOCK EMAIL] Password reset for ${normalizedEmail}. Token: ${resetToken}`)
      console.log(
        `[MOCK EMAIL] Link: ${req.headers.get('origin')}/reset-password?token=${resetToken}`
      )

      return new Response(
        JSON.stringify({ success: true, message: 'If account exists, email sent' }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    if (req.method === 'POST' && path === 'reset-password') {
      const { token, newPassword } = await req.json()
      const tokenHash = await hashToken(token)

      const tokens = await sql`
        SELECT user_id FROM password_reset_tokens
        WHERE token_hash = ${tokenHash}
          AND expires_at > NOW()
          AND used = false
      `

      if (tokens.length === 0) {
        return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { status: 400 })
      }

      const userId = tokens[0].user_id
      const newHash = await hashPassword(newPassword)

      await sql`UPDATE users SET password_hash = ${newHash}, updated_at = NOW() WHERE id = ${userId}`
      await sql`UPDATE password_reset_tokens SET used = true WHERE token_hash = ${tokenHash}`

      // Optional: Invalidate all sessions? Maybe not required but good practice.
      await sql`DELETE FROM sessions WHERE user_id = ${userId}`

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (req.method === 'POST' && path === 'change-password') {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
      }
      const token = authHeader.split(' ')[1]
      const simpleHash = await hashToken(token)

      const sessions =
        await sql`SELECT user_id FROM sessions WHERE token_hash = ${simpleHash} AND expires_at > NOW()`
      if (sessions.length === 0)
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

      const userId = sessions[0].user_id
      const { currentPassword, newPassword } = await req.json()

      const users = await sql`SELECT password_hash FROM users WHERE id = ${userId}`
      const isValid = await verifyPassword(currentPassword, users[0].password_hash)

      if (!isValid)
        return new Response(JSON.stringify({ error: 'Invalid password' }), { status: 400 })

      const newHash = await hashPassword(newPassword)
      await sql`UPDATE users SET password_hash = ${newHash}, updated_at = NOW() WHERE id = ${userId}`

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (req.method === 'POST' && path === 'delete-account') {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
      }
      const token = authHeader.split(' ')[1]
      const simpleHash = await hashToken(token)

      const sessions =
        await sql`SELECT user_id FROM sessions WHERE token_hash = ${simpleHash} AND expires_at > NOW()`
      if (sessions.length === 0)
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

      const userId = sessions[0].user_id

      // Soft delete user
      await sql`UPDATE users SET is_active = false, updated_at = NOW() WHERE id = ${userId}`

      // Invalidate all sessions
      await sql`DELETE FROM sessions WHERE user_id = ${userId}`

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response('Not Found', { status: 404 })
  } catch (error) {
    console.error('Auth error:', error)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 })
  }
}

// Helper for token hashing (SHA-256)
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
