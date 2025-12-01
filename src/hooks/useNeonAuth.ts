/**
 * useNeonAuth Hook
 *
 * Custom hook for Neon PostgreSQL authentication
 * Provides login, register, logout, and session management
 *
 * @module hooks/useNeonAuth
 */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService, type NeonUser } from '@/lib/neon'
import { useAppStore } from '@/store/useAppStore'
import type { User } from '@/types'

const SESSION_TOKEN_KEY = 'neon_auth_token'

interface UseNeonAuthReturn {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  validateSession: () => Promise<boolean>
  requestPasswordReset: (email: string) => Promise<{ success: boolean; message: string }>
  resetPassword: (
    token: string,
    newPassword: string
  ) => Promise<{ success: boolean; error?: string }>
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ success: boolean; error?: string }>
  deleteAccount: (password: string) => Promise<{ success: boolean; error?: string }>
  updateProfile: (data: {
    fullName?: string
    avatarUrl?: string
  }) => Promise<{ success: boolean; error?: string }>
}

/**
 * Convert NeonUser to App User type
 */
function toAppUser(neonUser: NeonUser): User {
  return {
    id: neonUser.id,
    email: neonUser.email,
    createdAt: new Date(neonUser.created_at),
    ...(neonUser.full_name ? { fullName: neonUser.full_name } : {}),
    ...(neonUser.avatar_url ? { avatarUrl: neonUser.avatar_url } : {}),
  }
}

/**
 * Custom hook for Neon authentication
 */
export function useNeonAuth(): UseNeonAuthReturn {
  const navigate = useNavigate()
  const { user, setUser } = useAppStore()
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem(SESSION_TOKEN_KEY)
      if (token) {
        const neonUser = await authService.validateSession(token)
        if (neonUser) {
          setUser(toAppUser(neonUser))
        } else {
          localStorage.removeItem(SESSION_TOKEN_KEY)
        }
      }
      setIsLoading(false)
    }
    checkSession()
  }, [setUser])

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true)
      try {
        const result = await authService.login(email, password)
        if (result.success && result.user && result.token) {
          localStorage.setItem(SESSION_TOKEN_KEY, result.token)
          setUser(toAppUser(result.user))
          return { success: true }
        }
        return { success: false, error: result.error || 'Login failed' }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Login failed',
        }
      } finally {
        setIsLoading(false)
      }
    },
    [setUser]
  )

  const register = useCallback(
    async (email: string, password: string, fullName?: string) => {
      setIsLoading(true)
      try {
        const result = await authService.register(email, password, fullName)
        if (result.success && result.user && result.token) {
          localStorage.setItem(SESSION_TOKEN_KEY, result.token)
          setUser(toAppUser(result.user))
          return { success: true }
        }
        return { success: false, error: result.error || 'Registration failed' }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Registration failed',
        }
      } finally {
        setIsLoading(false)
      }
    },
    [setUser]
  )

  const logout = useCallback(async () => {
    const token = localStorage.getItem(SESSION_TOKEN_KEY)
    if (token) {
      await authService.logout(token)
      localStorage.removeItem(SESSION_TOKEN_KEY)
    }
    setUser(null)
    navigate('/neon-auth')
  }, [setUser, navigate])

  const validateSession = useCallback(async () => {
    const token = localStorage.getItem(SESSION_TOKEN_KEY)
    if (!token) return false

    const neonUser = await authService.validateSession(token)
    if (neonUser) {
      setUser(toAppUser(neonUser))
      return true
    }
    localStorage.removeItem(SESSION_TOKEN_KEY)
    setUser(null)
    return false
  }, [setUser])

  const requestPasswordReset = useCallback(async (email: string) => {
    try {
      const result = await authService.requestPasswordReset(email)
      return result
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send reset email',
      }
    }
  }, [])

  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    try {
      const result = await authService.resetPassword(token, newPassword)
      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Password reset failed',
      }
    }
  }, [])

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!user) {
        return { success: false, error: 'Not authenticated' }
      }
      try {
        const result = await authService.changePassword(user.id, currentPassword, newPassword)
        return result
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Password change failed',
        }
      }
    },
    [user]
  )

  const deleteAccount = useCallback(
    async (_password: string) => {
      if (!user) {
        return { success: false, error: 'Not authenticated' }
      }
      try {
        const success = await authService.deleteAccount(user.id)
        if (success) {
          localStorage.removeItem(SESSION_TOKEN_KEY)
          setUser(null)
          navigate('/neon-auth')
          return { success: true }
        }
        return { success: false, error: 'Failed to delete account' }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Account deletion failed',
        }
      }
    },
    [user, setUser, navigate]
  )

  const updateProfile = useCallback(
    async (data: { fullName?: string; avatarUrl?: string }) => {
      if (!user) {
        return { success: false, error: 'Not authenticated' }
      }
      try {
        const result = await authService.updateProfile(user.id, data)
        if (result.success && result.user) {
          setUser(toAppUser(result.user))
        }
        return result
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Profile update failed',
        }
      }
    },
    [user, setUser]
  )

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    validateSession,
    requestPasswordReset,
    resetPassword,
    changePassword,
    deleteAccount,
    updateProfile,
  }
}
