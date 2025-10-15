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
          <div className="min-h-screen flex items-center justify-center bg-dark-50 dark:bg-dark-900 p-4">
            <div className="max-w-md w-full bg-white dark:bg-dark-800 rounded-lg shadow-xl p-8 text-center">
              <AlertTriangle className="w-16 h-16 text-error-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-dark-900 dark:text-dark-50 mb-2">
                Critical Error
              </h1>
              <p className="text-dark-600 dark:text-dark-400 mb-6">
                The application encountered multiple errors. Please refresh the page or contact
                support.
              </p>
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
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
          <div className="min-h-screen flex items-center justify-center bg-dark-50 dark:bg-dark-900 p-4">
            <div className="max-w-lg w-full bg-white dark:bg-dark-800 rounded-lg shadow-xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <AlertTriangle className="w-8 h-8 text-error-500 flex-shrink-0" />
                <h1 className="text-2xl font-bold text-dark-900 dark:text-dark-50">
                  Nešto nije u redu
                </h1>
              </div>

              <p className="text-dark-600 dark:text-dark-400 mb-6">
                Došlo je do greške prilikom učitavanja ove stranice. Tim je automatski obavešten i
                radi na rešenju.
              </p>

              {import.meta.env.DEV && (
                <div className="mb-6 p-4 bg-dark-100 dark:bg-dark-700 rounded-lg">
                  <p className="text-sm font-mono text-error-600 dark:text-error-400 mb-2">
                    {error.toString()}
                  </p>
                  {errorInfo?.componentStack && (
                    <details className="text-xs text-dark-600 dark:text-dark-400">
                      <summary className="cursor-pointer hover:text-dark-900 dark:hover:text-dark-50">
                        Component Stack
                      </summary>
                      <pre className="mt-2 overflow-auto">{errorInfo.componentStack}</pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Pokušaj ponovo
                </button>
                <button
                  type="button"
                  onClick={this.handleGoHome}
                  className="flex-1 px-4 py-2 bg-dark-200 hover:bg-dark-300 dark:bg-dark-700 dark:hover:bg-dark-600 text-dark-900 dark:text-dark-50 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Početna
                </button>
              </div>
            </div>
          </div>
        )
      }

      // Component-level error
      return (
        <div className="p-4 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-error-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-error-900 dark:text-error-100 mb-1">
                Greška u komponenti
              </h3>
              <p className="text-sm text-error-700 dark:text-error-300 mb-3">
                {import.meta.env.DEV ? error.toString() : 'Došlo je do neočekivane greške.'}
              </p>
              <button
                type="button"
                onClick={this.handleReset}
                className="text-sm px-3 py-1.5 bg-error-600 hover:bg-error-700 text-white rounded font-medium transition-colors"
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
