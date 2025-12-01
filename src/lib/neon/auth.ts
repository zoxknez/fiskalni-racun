/**
 * Neon Authentication Service
 *
 * Handles user authentication via API
 *
 * @module lib/neon/auth
 */

import { logger } from '@/lib/logger'

// Types
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

export interface AuthResult {
  success: boolean
  user?: NeonUser
  token?: string
  error?: string
}

const API_URL = import.meta.env['VITE_API_URL'] || '/api'

export const authService = {
  async getUser(): Promise<NeonUser | null> {
    const token = localStorage.getItem('neon_auth_token')
    if (!token) return null
    return this.validateSession(token)
  },

  async register(email: string, password: string, fullName?: string): Promise<AuthResult> {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.error || 'Registration failed' }
      }

      return { success: true, user: data.user, token: data.token }
    } catch (error) {
      logger.error(' Registration error:', error)
      return { success: false, error: 'Network error' }
    }
  },

  async login(email: string, password: string): Promise<AuthResult> {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.error || 'Login failed' }
      }

      return { success: true, user: data.user, token: data.token }
    } catch (error) {
      logger.error(' Login error:', error)
      return { success: false, error: 'Network error' }
    }
  },

  async validateSession(token: string): Promise<NeonUser | null> {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) return null

      const data = await response.json()
      return data.user
    } catch (_error) {
      return null
    }
  },

  async logout(token: string): Promise<boolean> {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      return true
    } catch (_error) {
      return false
    }
  },

  async getUserById(_userId: string): Promise<NeonUser | null> {
    // TODO: Implement API
    return null
  },

  async updateProfile(
    _userId: string,
    data: { fullName?: string; avatarUrl?: string }
  ): Promise<{ success: boolean; user?: NeonUser; error?: string }> {
    try {
      const token = localStorage.getItem('neon_auth_token')
      if (!token) return { success: false, error: 'No session' }

      const response = await fetch(`${API_URL}/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()
      if (!response.ok) return { success: false, error: result.error }

      return { success: true, user: result.user }
    } catch (_error) {
      return { success: false, error: 'Network error' }
    }
  },

  async cleanupExpiredSessions(): Promise<number> {
    return 0
  },

  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_URL}/auth/request-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await response.json()
      return { success: true, message: data.message }
    } catch (_error) {
      return { success: false, message: 'Network error' }
    }
  },

  async resetPassword(token: string, newPassword: string): Promise<AuthResult> {
    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      })
      const data = await response.json()
      if (!response.ok) return { success: false, error: data.error }
      return { success: true }
    } catch (_error) {
      return { success: false, error: 'Network error' }
    }
  },

  async changePassword(
    _userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<AuthResult> {
    try {
      const token = localStorage.getItem('neon_auth_token')
      if (!token) return { success: false, error: 'No session' }

      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const data = await response.json()
      if (!response.ok) return { success: false, error: data.error }

      return { success: true }
    } catch (_error) {
      return { success: false, error: 'Network error' }
    }
  },

  async deleteAccount(_userId: string): Promise<boolean> {
    try {
      const token = localStorage.getItem('neon_auth_token')
      if (!token) return false

      const response = await fetch(`${API_URL}/auth/delete-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        await this.logout(token)
        return true
      }
      return false
    } catch (_error) {
      return false
    }
  },
}
