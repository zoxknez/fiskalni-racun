/**
 * Route-specific Error Boundary
 *
 * Catches errors per route and provides recovery options
 *
 * @module components/common/RouteErrorBoundary
 */

import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { logger } from '@/lib/logger'
import { captureError } from '@/lib/monitoring/sentry'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  routeName?: string
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Per-route error boundary
 * More granular than global boundary - only affects specific route
 */
export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const routeName = this.props.routeName || 'Unknown route'

    logger.error(`[${routeName}] Error caught:`, error, errorInfo)

    // ⭐ Send to Sentry with route context
    captureError(error, {
      route: routeName,
      componentStack: errorInfo.componentStack,
    })

    this.setState({
      error,
      errorInfo,
    })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    this.props.onReset?.()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const routeName = this.props.routeName || 'Stranica'

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-dark-800 rounded-2xl shadow-xl p-8">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
            </div>

            <h2 className="text-xl font-bold text-center text-dark-900 dark:text-dark-50 mb-2">
              Greška na stranici
            </h2>

            <p className="text-center text-dark-600 dark:text-dark-400 mb-6 text-sm">
              {routeName} nije mogao biti učitan. Molimo pokušajte ponovo.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg overflow-auto max-h-40">
                <p className="text-xs font-mono text-red-600 dark:text-red-400">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold transition-colors text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Pokušaj ponovo
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-dark-100 dark:bg-dark-700 hover:bg-dark-200 dark:hover:bg-dark-600 text-dark-900 dark:text-dark-50 rounded-xl font-semibold transition-colors text-sm"
              >
                <Home className="w-4 h-4" />
                Početna
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
