import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { authLogger } from '@/lib/logger'
import { authService } from '@/lib/neon/auth'
import type { User } from '@/types'
import { useAppStore } from '../../store/useAppStore'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const GUEST_USER_ID = 'guest-user'

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, logout, setUser } = useAppStore()
  const location = useLocation()
  const [isValidating, setIsValidating] = useState(true)
  const [isSessionValid, setIsSessionValid] = useState(false)
  const guestActivatedRef = useRef(false)
  const guestUserRef = useRef<User | null>(null)

  const allowGuestAccess = useMemo(() => {
    const { VITE_REQUIRE_AUTH } = import.meta.env as { VITE_REQUIRE_AUTH?: string }
    if (typeof VITE_REQUIRE_AUTH === 'string') {
      return VITE_REQUIRE_AUTH.toLowerCase() !== 'true'
    }
    return true
  }, [])

  const ensureGuestUser = useCallback(() => {
    if (!guestUserRef.current) {
      guestUserRef.current = {
        id: GUEST_USER_ID,
        email: 'guest@offline.local',
        fullName: 'Offline gost',
        createdAt: new Date(),
      }
    }

    guestActivatedRef.current = true
    setIsSessionValid(true)
    setUser(guestUserRef.current)
  }, [setUser])

  const isGuestUser = user?.id === GUEST_USER_ID

  useEffect(() => {
    async function validateSession() {
      try {
        if (isGuestUser || guestActivatedRef.current) {
          if (!user || user.id !== GUEST_USER_ID) {
            ensureGuestUser()
          } else {
            setIsSessionValid(true)
          }
          setIsValidating(false)
          return
        }

        // Check if we have a user in store
        if (!user) {
          if (allowGuestAccess) {
            ensureGuestUser()
            setIsValidating(false)
            return
          }

          setIsSessionValid(false)
          setIsValidating(false)
          return
        }

        // Validate session with Neon
        const token = localStorage.getItem('neon_auth_token')
        if (!token) {
          setIsSessionValid(false)
          setIsValidating(false)
          return
        }

        const validUser = await authService.validateSession(token)

        if (!validUser) {
          authLogger.error('Session validation failed')
          if (allowGuestAccess) {
            ensureGuestUser()
          } else {
            setIsSessionValid(false)
            logout() // Clear invalid session
          }
        } else {
          // Session is valid
          setIsSessionValid(true)
        }
      } catch (error) {
        authLogger.error('Session validation failed:', error)
        if (allowGuestAccess) {
          ensureGuestUser()
        } else {
          setIsSessionValid(false)
          logout()
        }
      } finally {
        setIsValidating(false)
      }
    }

    validateSession()
  }, [user, logout, allowGuestAccess, ensureGuestUser, isGuestUser])

  // Show loading state while validating
  if (isValidating) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary-500/30 border-t-primary-500" />
      </div>
    )
  }

  // Redirect to auth if no user or invalid session
  if (!allowGuestAccess && (!user || !isSessionValid)) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  return <>{children}</>
}
