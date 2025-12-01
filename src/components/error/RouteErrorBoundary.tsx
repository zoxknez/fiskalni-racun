/**
 * Route-Level Error Boundary
 *
 * Catches errors within specific routes without crashing entire app
 * Provides better UX with route-specific error handling
 */

import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import { Component, type ReactNode } from 'react'
import { logger } from '@/lib/logger'

interface Props {
  children: ReactNode
  routeName?: string
  fallback?: ReactNode
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    const routeName = this.props.routeName || 'unknown route'
    logger.error(`Error in ${routeName}:`, error, {
      componentStack: errorInfo.componentStack,
      route: routeName,
    })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
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

      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
          <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-center">
              <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/30">
                <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            </div>

            <h2 className="mb-2 text-center font-bold text-2xl text-gray-900 dark:text-white">
              Nešto je pošlo naopako
            </h2>

            <p className="mb-6 text-center text-gray-600 dark:text-gray-400">
              {this.props.routeName
                ? `Greška u ${this.props.routeName}`
                : 'Dogodila se neočekivana greška'}
            </p>

            {import.meta.env.DEV && this.state.error && (
              <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-xs dark:border-red-800 dark:bg-red-900/20">
                <p className="font-mono text-red-800 dark:text-red-300">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 font-medium text-white transition hover:bg-primary-700"
              >
                <RefreshCw className="h-4 w-4" />
                Pokušaj ponovo
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
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
