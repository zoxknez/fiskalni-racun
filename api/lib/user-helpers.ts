/**
 * Shared User Helper Utilities
 *
 * Centralizes user info retrieval from auth tokens.
 * Used by deals and comments endpoints.
 *
 * @module api/lib/user-helpers
 */

import type { VercelRequest } from '@vercel/node'
import { sql } from '../db.js'
import { verifyTokenFromHeader } from './auth.js'

export interface UserInfo {
  id: string
  name: string
  avatar: string | null
}

/**
 * Extract authenticated user info from request.
 * Returns id, name, and avatar for the current user.
 */
export async function getUserFromToken(req: VercelRequest): Promise<UserInfo | null> {
  const authHeader = req.headers.authorization
  const userId = await verifyTokenFromHeader(authHeader)
  if (!userId) return null

  const users = await sql`SELECT id, full_name, avatar_url FROM users WHERE id = ${userId}`
  const user = users[0]
  if (!user) return null

  return {
    id: user['id'] as string,
    name: (user['full_name'] as string) || 'Anonymous',
    avatar: (user['avatar_url'] as string) || null,
  }
}
