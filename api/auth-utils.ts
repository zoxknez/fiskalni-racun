import { sql } from './db'

export async function verifyToken(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.split(' ')[1]

  // Check against sessions table
  // Note: In a real app, you might use JWT verification here to avoid a DB hit on every request,
  // but since we have a sessions table, we can check it.
  // However, for "perfect" performance, JWT is better.
  // Given the schema has `sessions` with `token_hash`, I assume we check that.

  // For now, let's assume the token passed is the raw token, and we hash it to check.
  // Or if it's a JWT, we verify signature.
  // Since I don't have the login logic, I'll assume it's a session token.

  // Simple query to find user by token (assuming token is stored directly or we have a way to hash it)
  // WARNING: This is a placeholder. You must implement proper token hashing/verification matching your login logic.

  try {
    const result = await sql`
      SELECT user_id FROM sessions 
      WHERE token_hash = ${token} 
      AND expires_at > NOW()
      LIMIT 1
    `

    if (result.length > 0) {
      return result[0].user_id
    }
  } catch (e) {
    console.error('Auth verification failed', e)
  }

  return null
}
