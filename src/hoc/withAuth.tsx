/**
 * Modern Higher-Order Component - withAuth
 *
 * Wraps component with authentication check
 * Alternative to ProtectedRoute for specific components
 */

import type { ComponentType } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'

export function withAuth<P extends object>(Component: ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { user } = useAppStore()

    if (!user) {
      return <Navigate to="/auth" replace />
    }

    return <Component {...props} />
  }
}

// Usage:
// const ProtectedPage = withAuth(MyPage)
