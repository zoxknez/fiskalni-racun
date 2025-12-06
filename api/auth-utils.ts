import { webcrypto } from 'node:crypto'
import { sql } from './db.js'

// Use Node.js webcrypto for compatibility with Node.js runtime
const crypto = webcrypto as Crypto

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyToken(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.split(' ')[1]
  if (!token) {
    return null
  }

  try {
    // Hashiraj token prije usporedbe sa bazom
    const tokenHash = await hashToken(token)

    const result = await sql`
      SELECT user_id FROM sessions 
      WHERE token_hash = ${tokenHash} 
      AND expires_at > NOW()
      LIMIT 1
    `

    if (result.length > 0) {
      const row = result[0]!
      return row['user_id'] as string
    }
  } catch (e) {
    console.error('Auth verification failed', e)
  }

  return null
}
