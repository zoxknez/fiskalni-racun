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
        <div className="flex min-h-[400px] items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl dark:bg-dark-800">
            <div className="mb-6 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            </div>

            <h2 className="mb-2 text-center font-bold text-dark-900 text-xl dark:text-dark-50">
              Greška na stranici
            </h2>

            <p className="mb-6 text-center text-dark-600 text-sm dark:text-dark-400">
              {routeName} nije mogao biti učitan. Molimo pokušajte ponovo.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 max-h-40 overflow-auto rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                <p className="font-mono text-red-600 text-xs dark:text-red-400">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-500 px-4 py-2.5 font-semibold text-sm text-white transition-colors hover:bg-primary-600"
              >
                <RefreshCw className="h-4 w-4" />
                Pokušaj ponovo
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-dark-100 px-4 py-2.5 font-semibold text-dark-900 text-sm transition-colors hover:bg-dark-200 dark:bg-dark-700 dark:text-dark-50 dark:hover:bg-dark-600"
              >
                <Home className="h-4 w-4" />
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
