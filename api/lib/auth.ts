/**
 * Shared Authentication Utilities for API Routes
 *
 * This module provides common authentication functions used across all API endpoints.
 * Centralizing these prevents code duplication and ensures consistent security practices.
 */

import { webcrypto } from 'node:crypto'
import { sql } from '../db.js'

// Use Node.js webcrypto for compatibility with Node.js runtime (Vercel)
const crypto = webcrypto as unknown as Crypto

// ============================================================================
// Types
// ============================================================================

export interface AuthUser {
  id: string
  email: string
  is_admin: boolean
  is_active: boolean
  email_verified: boolean
  full_name?: string
}

export interface SessionInfo {
  sessionId: string
  userId: string
  expiresAt: Date
}

// ============================================================================
// Token Hashing
// ============================================================================

/**
 * Hash a token using SHA-256 for secure storage/lookup
 * Tokens are never stored in plain text - only their hashes
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Generate a cryptographically secure random token
 */
export function generateToken(length: number = 32): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ============================================================================
// User Verification
// ============================================================================

/**
 * Verify a user from their auth token
 * Returns the user if valid, null otherwise
 * @deprecated The _sql parameter is kept for backward compatibility but is unused
 */
export async function verifyUser(
  _sql: unknown, // Kept for API compatibility, but we use the shared sql
  authHeader: string | undefined
): Promise<AuthUser | null> {
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.split(' ')[1]
  if (!token) return null

  const tokenHash = await hashToken(token)

  const result = await sql`
    SELECT 
      u.id, 
      u.email, 
      u.full_name,
      u.is_admin, 
      u.is_active,
      u.email_verified
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token_hash = ${tokenHash}
      AND s.expires_at > NOW()
      AND u.is_active = true
    LIMIT 1
  `

  const rows = result as AuthUser[]
  return rows.length > 0 ? rows[0] : null
}

/**
 * Verify an admin user from their auth token
 * Returns the admin user if valid, null otherwise
 * @deprecated The _sql parameter is kept for backward compatibility but is unused
 */
export async function verifyAdmin(
  _sql: unknown, // Kept for API compatibility
  authHeader: string | undefined
): Promise<AuthUser | null> {
  const user = await verifyUser(sql, authHeader)

  if (!user || !user.is_admin) {
    return null
  }

  return user
}

// ============================================================================
// Session Management
// ============================================================================

/**
 * Create a new session for a user
 * @deprecated The _sql parameter is kept for backward compatibility but is unused
 */
export async function createSession(
  _sql: unknown,
  userId: string,
  expiresInDays: number = 30
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken(32)
  const tokenHash = await hashToken(token)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + expiresInDays)

  await sql`
    INSERT INTO sessions (user_id, token_hash, expires_at, created_at)
    VALUES (${userId}, ${tokenHash}, ${expiresAt.toISOString()}, NOW())
  `

  return { token, expiresAt }
}

/**
 * Invalidate a session by token
 * @deprecated The _sql parameter is kept for backward compatibility but is unused
 */
export async function invalidateSession(_sql: unknown, token: string): Promise<boolean> {
  const tokenHash = await hashToken(token)

  const result = await sql`
    DELETE FROM sessions 
    WHERE token_hash = ${tokenHash}
    RETURNING id
  `

  return (result as unknown[]).length > 0
}

/**
 * Invalidate all sessions for a user
 * @deprecated The _sql parameter is kept for backward compatibility but is unused
 */
export async function invalidateAllUserSessions(_sql: unknown, userId: string): Promise<number> {
  const result = await sql`
    DELETE FROM sessions 
    WHERE user_id = ${userId}
    RETURNING id
  `

  return (result as unknown[]).length
}

/**
 * Refresh a session - extend its expiry
 * @deprecated The _sql parameter is kept for backward compatibility but is unused
 */
export async function refreshSession(
  _sql: unknown,
  token: string,
  extendDays: number = 30
): Promise<Date | null> {
  const tokenHash = await hashToken(token)
  const newExpiresAt = new Date()
  newExpiresAt.setDate(newExpiresAt.getDate() + extendDays)

  const result = await sql`
    UPDATE sessions
    SET expires_at = ${newExpiresAt.toISOString()}
    WHERE token_hash = ${tokenHash}
      AND expires_at > NOW()
    RETURNING expires_at
  `

  const rows = result as { expires_at: string }[]
  return rows.length > 0 ? new Date(rows[0].expires_at) : null
}

// ============================================================================
// Database Connection
// ============================================================================

/**
 * Get database connection
 * Redirects to the shared sql instance
 */
export function getDatabase(): typeof sql {
  return sql
}

// ============================================================================
// Authorization Helpers
// ============================================================================

/**
 * Extract bearer token from authorization header
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  return authHeader.split(' ')[1] || null
}

/**
 * Check if a user can modify another user
 * Prevents self-modification for certain dangerous operations
 */
export function canModifyUser(
  actingUserId: string,
  targetUserId: string,
  action: 'delete' | 'deactivate' | 'activate' | 'toggle_admin'
): { allowed: boolean; reason?: string } {
  if (actingUserId === targetUserId) {
    const reasons: Record<string, string> = {
      delete: 'Cannot delete your own account from admin panel',
      deactivate: 'Cannot deactivate yourself',
      toggle_admin: 'Cannot modify your own admin status',
      activate: 'Cannot activate your own account (you are already active)',
    }
    return { allowed: false, reason: reasons[action] }
  }
  return { allowed: true }
}
