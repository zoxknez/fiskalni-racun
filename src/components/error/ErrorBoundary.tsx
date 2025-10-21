import { AlertTriangle } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { logger } from '@/lib/logger'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in child component tree,
 * logs errors, and displays fallback UI.
 *
 * @example
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      logger.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    // Log to error tracking service
    logger.error('React Error Boundary', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null })
  }

  override render() {
    if (this.state.hasError && this.state.error) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetErrorBoundary)
      }

      // Default fallback UI
      return (
        <div className="flex min-h-screen items-center justify-center bg-dark-50 p-4 dark:bg-dark-900">
          <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-lg dark:border-red-900/30 dark:bg-dark-800">
            <div className="mb-4 inline-flex rounded-full bg-red-100 p-3 dark:bg-red-900/30">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>

            <h2 className="mb-2 font-bold text-dark-900 text-xl dark:text-white">
              Nešto je pošlo po zlu
            </h2>

            <p className="mb-6 text-dark-600 text-sm dark:text-dark-400">
              Došlo je do neočekivane greške. Molimo osvežite stranicu ili pokušajte ponovo.
            </p>

            {import.meta.env.DEV && (
              <details className="mb-6 rounded-lg bg-red-50 p-4 text-left dark:bg-red-900/20">
                <summary className="cursor-pointer font-medium text-red-900 text-sm dark:text-red-300">
                  Detalji greške (dev mode)
                </summary>
                <pre className="mt-2 overflow-auto font-mono text-red-800 text-xs dark:text-red-400">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex-1 rounded-lg border border-dark-200 bg-white px-4 py-2 font-medium text-dark-700 text-sm transition-colors hover:bg-dark-50 dark:border-dark-700 dark:bg-dark-900 dark:text-dark-300 dark:hover:bg-dark-800"
              >
                Osveži stranicu
              </button>
              <button
                type="button"
                onClick={this.resetErrorBoundary}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
              >
                Pokušaj ponovo
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
