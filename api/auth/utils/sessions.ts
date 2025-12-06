// Session management utilities

import { sql } from '../../db.js'
import { generateSessionToken, hashToken } from './token.js'

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export async function createSession(userId: string, token?: string): Promise<string> {
  const sessionToken = token || generateSessionToken()
  const tokenHash = await hashToken(sessionToken)
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)

  await sql`
    INSERT INTO sessions (user_id, token_hash, expires_at)
    VALUES (${userId}, ${tokenHash}, ${expiresAt.toISOString()})
  `

  return sessionToken
}

export async function deleteSession(tokenHash: string): Promise<void> {
  await sql`DELETE FROM sessions WHERE token_hash = ${tokenHash}`
}

export async function deleteAllUserSessions(userId: string): Promise<void> {
  await sql`DELETE FROM sessions WHERE user_id = ${userId}`
}

export async function verifySession(tokenHash: string): Promise<string | null> {
  const result = await sql`
    SELECT user_id FROM sessions 
    WHERE token_hash = ${tokenHash} AND expires_at > NOW()
    LIMIT 1
  `

  return result.length > 0 ? result[0].user_id : null
}
