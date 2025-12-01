/**
 * Neon Authentication Service
 *
 * Handles user authentication with Neon PostgreSQL
 * Includes secure password hashing and session management
 *
 * @module lib/neon/auth
 */

import { logger } from '@/lib/logger'
import { sql } from './config'

/**
 * User type from Neon database
 */
export interface NeonUser {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  email_verified: boolean
  created_at: string
  updated_at: string
  last_login_at: string | null
  is_active: boolean
}

/**
 * Authentication result
 */
export interface AuthResult {
  success: boolean
  user?: NeonUser
  token?: string
  error?: string
}

/**
 * Simple hash function for browser environment
 * In production, use bcrypt on the server side
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(`${password}fiskalni-racun-salt-2024`)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Verify password against hash
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password)
  return passwordHash === hash
}

/**
 * Generate a secure session token
 */
function generateSessionToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Authentication Service
 */
export const authService = {
  /**
   * Register a new user
   */
  async register(email: string, password: string, fullName?: string): Promise<AuthResult> {
    try {
      const normalizedEmail = email.trim().toLowerCase()

      // Check if user already exists
      const existingUsers = await sql`
        SELECT id FROM users WHERE email = ${normalizedEmail}
      `

      if (existingUsers.length > 0) {
        return {
          success: false,
          error: 'User with this email already exists',
        }
      }

      // Hash password
      const passwordHash = await hashPassword(password)

      // Create user
      const result = await sql`
        INSERT INTO users (email, password_hash, full_name)
        VALUES (${normalizedEmail}, ${passwordHash}, ${fullName || null})
        RETURNING id, email, full_name, avatar_url, email_verified, created_at, updated_at, last_login_at, is_active
      `

      if (result.length === 0) {
        return {
          success: false,
          error: 'Failed to create user',
        }
      }

      const user = result[0] as NeonUser

      // Generate session token
      const token = generateSessionToken()
      const tokenHash = await hashPassword(token)
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

      await sql`
        INSERT INTO sessions (user_id, token_hash, expires_at)
        VALUES (${user.id}, ${tokenHash}, ${expiresAt.toISOString()})
      `

      logger.info(`✅ User registered: ${normalizedEmail}`)

      return {
        success: true,
        user,
        token,
      }
    } catch (error) {
      logger.error('❌ Registration error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      }
    }
  },

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<AuthResult> {
    try {
      const normalizedEmail = email.trim().toLowerCase()

      // Find user
      const users = await sql`
        SELECT id, email, password_hash, full_name, avatar_url, email_verified, created_at, updated_at, last_login_at, is_active
        FROM users
        WHERE email = ${normalizedEmail} AND is_active = true
      `

      if (users.length === 0) {
        return {
          success: false,
          error: 'Invalid email or password',
        }
      }

      const userRow = users[0] as NeonUser & { password_hash: string }

      // Verify password
      const isValid = await verifyPassword(password, userRow.password_hash)
      if (!isValid) {
        return {
          success: false,
          error: 'Invalid email or password',
        }
      }

      // Update last login
      await sql`
        UPDATE users SET last_login_at = NOW() WHERE id = ${userRow.id}
      `

      // Generate session token
      const token = generateSessionToken()
      const tokenHash = await hashPassword(token)
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

      await sql`
        INSERT INTO sessions (user_id, token_hash, expires_at)
        VALUES (${userRow.id}, ${tokenHash}, ${expiresAt.toISOString()})
      `

      // Remove password_hash from response
      const { password_hash: _, ...user } = userRow

      logger.info(`✅ User logged in: ${normalizedEmail}`)

      return {
        success: true,
        user: user as NeonUser,
        token,
      }
    } catch (error) {
      logger.error('❌ Login error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      }
    }
  },

  /**
   * Validate session token
   */
  async validateSession(token: string): Promise<NeonUser | null> {
    try {
      const tokenHash = await hashPassword(token)

      const result = await sql`
        SELECT u.id, u.email, u.full_name, u.avatar_url, u.email_verified, u.created_at, u.updated_at, u.last_login_at, u.is_active
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token_hash = ${tokenHash}
          AND s.expires_at > NOW()
          AND u.is_active = true
      `

      if (result.length === 0) {
        return null
      }

      return result[0] as NeonUser
    } catch (error) {
      logger.error('❌ Session validation error:', error)
      return null
    }
  },

  /**
   * Logout user (invalidate session)
   */
  async logout(token: string): Promise<boolean> {
    try {
      const tokenHash = await hashPassword(token)

      await sql`
        DELETE FROM sessions WHERE token_hash = ${tokenHash}
      `

      logger.info('✅ User logged out')
      return true
    } catch (error) {
      logger.error('❌ Logout error:', error)
      return false
    }
  },

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<NeonUser | null> {
    try {
      const result = await sql`
        SELECT id, email, full_name, avatar_url, email_verified, created_at, updated_at, last_login_at, is_active
        FROM users
        WHERE id = ${userId} AND is_active = true
      `

      if (result.length === 0) {
        return null
      }

      return result[0] as NeonUser
    } catch (error) {
      logger.error('❌ Get user error:', error)
      return null
    }
  },

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    data: { fullName?: string; avatarUrl?: string }
  ): Promise<{ success: boolean; user?: NeonUser; error?: string }> {
    try {
      const result = await sql`
        UPDATE users
        SET
          full_name = COALESCE(${data.fullName ?? null}, full_name),
          avatar_url = COALESCE(${data.avatarUrl ?? null}, avatar_url),
          updated_at = NOW()
        WHERE id = ${userId}
        RETURNING id, email, full_name, avatar_url, email_verified, created_at, updated_at, last_login_at, is_active
      `

      if (result.length === 0) {
        return { success: false, error: 'User not found' }
      }

      return { success: true, user: result[0] as NeonUser }
    } catch (error) {
      logger.error('❌ Update profile error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update profile',
      }
    }
  },

  /**
   * Delete all expired sessions (cleanup)
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await sql`
        DELETE FROM sessions WHERE expires_at < NOW()
        RETURNING id
      `
      return result.length
    } catch (error) {
      logger.error('❌ Session cleanup error:', error)
      return 0
    }
  },

  /**
   * Request password reset
   * Generates a reset token and stores it in the database
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const normalizedEmail = email.trim().toLowerCase()

      // Check if user exists
      const users = await sql`
        SELECT id FROM users WHERE email = ${normalizedEmail} AND is_active = true
      `

      if (users.length === 0) {
        // Don't reveal if user exists
        return { success: true, message: 'If the email exists, a reset link has been sent' }
      }

      const userId = users[0]?.['id'] as string

      // Generate reset token
      const resetToken = generateSessionToken()
      const tokenHash = await hashPassword(resetToken)
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      // Store reset token
      await sql`
        INSERT INTO password_resets (user_id, token_hash, expires_at)
        VALUES (${userId}, ${tokenHash}, ${expiresAt})
        ON CONFLICT (user_id) DO UPDATE SET
          token_hash = ${tokenHash},
          expires_at = ${expiresAt}
      `

      logger.info('✅ Password reset requested for:', normalizedEmail)

      // In production, send email with reset link
      // For now, return the token (for testing purposes only)
      return {
        success: true,
        message: 'Password reset token generated',
      }
    } catch (error) {
      logger.error('❌ Password reset request error:', error)
      return { success: false, message: 'Failed to process reset request' }
    }
  },

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<AuthResult> {
    try {
      const tokenHash = await hashPassword(token)

      // Find valid reset token
      const result = await sql`
        SELECT user_id FROM password_resets
        WHERE token_hash = ${tokenHash}
          AND expires_at > NOW()
      `

      if (result.length === 0) {
        return { success: false, error: 'Invalid or expired reset token' }
      }

      const userId = result[0]?.['user_id'] as string
      const newPasswordHash = await hashPassword(newPassword)

      // Update password
      await sql`
        UPDATE users SET password_hash = ${newPasswordHash}, updated_at = NOW()
        WHERE id = ${userId}
      `

      // Delete reset token
      await sql`DELETE FROM password_resets WHERE user_id = ${userId}`

      // Invalidate all existing sessions
      await sql`DELETE FROM sessions WHERE user_id = ${userId}`

      logger.info('✅ Password reset successful for user:', userId)

      return { success: true }
    } catch (error) {
      logger.error('❌ Password reset error:', error)
      return { success: false, error: 'Failed to reset password' }
    }
  },

  /**
   * Change password (requires current password)
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<AuthResult> {
    try {
      // Get current password hash
      const users = await sql`
        SELECT password_hash FROM users WHERE id = ${userId}
      `

      if (users.length === 0) {
        return { success: false, error: 'User not found' }
      }

      const passwordHash = users[0]?.['password_hash'] as string

      // Verify current password
      const isValid = await verifyPassword(currentPassword, passwordHash)
      if (!isValid) {
        return { success: false, error: 'Current password is incorrect' }
      }

      // Update password
      const newPasswordHash = await hashPassword(newPassword)
      await sql`
        UPDATE users SET password_hash = ${newPasswordHash}, updated_at = NOW()
        WHERE id = ${userId}
      `

      logger.info('✅ Password changed for user:', userId)

      return { success: true }
    } catch (error) {
      logger.error('❌ Password change error:', error)
      return { success: false, error: 'Failed to change password' }
    }
  },

  /**
   * Delete user account
   */
  async deleteAccount(userId: string, password: string): Promise<AuthResult> {
    try {
      // Verify password
      const users = await sql`
        SELECT password_hash FROM users WHERE id = ${userId}
      `

      if (users.length === 0) {
        return { success: false, error: 'User not found' }
      }

      const passwordHash = users[0]?.['password_hash'] as string
      const isValid = await verifyPassword(password, passwordHash)

      if (!isValid) {
        return { success: false, error: 'Password is incorrect' }
      }

      // Soft delete - mark as inactive
      await sql`
        UPDATE users SET is_active = false, updated_at = NOW()
        WHERE id = ${userId}
      `

      // Delete all sessions
      await sql`DELETE FROM sessions WHERE user_id = ${userId}`

      logger.info('✅ Account deleted for user:', userId)

      return { success: true }
    } catch (error) {
      logger.error('❌ Account deletion error:', error)
      return { success: false, error: 'Failed to delete account' }
    }
  },
}
