import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { authLogger } from '@/lib/logger'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '../../store/useAppStore'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, logout } = useAppStore()
  const location = useLocation()
  const [isValidating, setIsValidating] = useState(true)
  const [isSessionValid, setIsSessionValid] = useState(false)

  useEffect(() => {
    async function validateSession() {
      try {
        // Check if we have a user in store
        if (!user) {
          setIsSessionValid(false)
          setIsValidating(false)
          return
        }

        // Validate session with Supabase
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          authLogger.error('Session validation error:', error)
          setIsSessionValid(false)
          logout() // Clear invalid session
        } else if (!session) {
          authLogger.warn('No active session found')
          setIsSessionValid(false)
          logout() // Clear stale user data
        } else {
          // Session is valid
          setIsSessionValid(true)
        }
      } catch (error) {
        authLogger.error('Session validation failed:', error)
        setIsSessionValid(false)
        logout()
      } finally {
        setIsValidating(false)
      }
    }

    validateSession()
  }, [user, logout])

  // Show loading state while validating
  if (isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
      </div>
    )
  }

  // Redirect to auth if no user or invalid session
  if (!user || !isSessionValid) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  return <>{children}</>
}
