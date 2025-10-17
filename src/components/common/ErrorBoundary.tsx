/**
 * Enhanced Error Boundary
 *
 * Catches React errors and provides fallback UI with recovery options
 *
 * @module components/common/ErrorBoundary
 */

import { captureException } from '@sentry/react'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { logger } from '@/lib/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  level?: 'page' | 'component' | 'layout'
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorCount: number
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to console
    logger.error('Error Boundary caught error:', error, errorInfo)

    // Track error count (for preventing infinite error loops)
    this.setState((prev) => ({
      errorInfo,
      errorCount: prev.errorCount + 1,
    }))

    // Send to Sentry
    captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
      level: 'error',
    })

    // Call custom error handler
    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  override render() {
    const { hasError, error, errorInfo, errorCount } = this.state
    const { children, fallback, level = 'component' } = this.props

    if (hasError && error) {
      // Prevent infinite error loops
      if (errorCount > 3) {
        return (
          <div className="flex min-h-screen items-center justify-center bg-dark-50 p-4 dark:bg-dark-900">
            <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-xl dark:bg-dark-800">
              <AlertTriangle className="mx-auto mb-4 h-16 w-16 text-error-500" />
              <h1 className="mb-2 font-bold text-2xl text-dark-900 dark:text-dark-50">
                Critical Error
              </h1>
              <p className="mb-6 text-dark-600 dark:text-dark-400">
                The application encountered multiple errors. Please refresh the page or contact
                support.
              </p>
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full rounded-lg bg-primary-600 px-4 py-2 font-medium text-white transition-colors hover:bg-primary-700"
              >
                Reload Application
              </button>
            </div>
          </div>
        )
      }

      // Custom fallback
      if (fallback) {
        return fallback
      }

      // Default fallback based on error level
      if (level === 'layout' || level === 'page') {
        return (
          <div className="flex min-h-screen items-center justify-center bg-dark-50 p-4 dark:bg-dark-900">
            <div className="w-full max-w-lg rounded-lg bg-white p-8 shadow-xl dark:bg-dark-800">
              <div className="mb-6 flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 flex-shrink-0 text-error-500" />
                <h1 className="font-bold text-2xl text-dark-900 dark:text-dark-50">
                  Nešto nije u redu
                </h1>
              </div>

              <p className="mb-6 text-dark-600 dark:text-dark-400">
                Došlo je do greške prilikom učitavanja ove stranice. Tim je automatski obavešten i
                radi na rešenju.
              </p>

              {import.meta.env.DEV && (
                <div className="mb-6 rounded-lg bg-dark-100 p-4 dark:bg-dark-700">
                  <p className="mb-2 font-mono text-error-600 text-sm dark:text-error-400">
                    {error.toString()}
                  </p>
                  {errorInfo?.componentStack && (
                    <details className="text-dark-600 text-xs dark:text-dark-400">
                      <summary className="cursor-pointer hover:text-dark-900 dark:hover:text-dark-50">
                        Component Stack
                      </summary>
                      <pre className="mt-2 overflow-auto">{errorInfo.componentStack}</pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 font-medium text-white transition-colors hover:bg-primary-700"
                >
                  <RefreshCw className="h-4 w-4" />
                  Pokušaj ponovo
                </button>
                <button
                  type="button"
                  onClick={this.handleGoHome}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-dark-200 px-4 py-2 font-medium text-dark-900 transition-colors hover:bg-dark-300 dark:bg-dark-700 dark:text-dark-50 dark:hover:bg-dark-600"
                >
                  <Home className="h-4 w-4" />
                  Početna
                </button>
              </div>
            </div>
          </div>
        )
      }

      // Component-level error
      return (
        <div className="rounded-lg border border-error-200 bg-error-50 p-4 dark:border-error-800 dark:bg-error-900/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-error-500" />
            <div className="flex-1">
              <h3 className="mb-1 font-semibold text-error-900 dark:text-error-100">
                Greška u komponenti
              </h3>
              <p className="mb-3 text-error-700 text-sm dark:text-error-300">
                {import.meta.env.DEV ? error.toString() : 'Došlo je do neočekivane greške.'}
              </p>
              <button
                type="button"
                onClick={this.handleReset}
                className="rounded bg-error-600 px-3 py-1.5 font-medium text-sm text-white transition-colors hover:bg-error-700"
              >
                Pokušaj ponovo
              </button>
            </div>
          </div>
        </div>
      )
    }

    return children
  }
}

/**
 * HOC for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}
