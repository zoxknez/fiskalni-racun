/**
 * Modern Higher-Order Component - withErrorBoundary
 *
 * Wraps component with error boundary
 * Per-component error handling
 */

import type { ComponentType } from 'react'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'

interface WithErrorBoundaryOptions {
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  options: WithErrorBoundaryOptions = {}
) {
  return function ComponentWithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={options.fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}
