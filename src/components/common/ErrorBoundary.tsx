import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { logger } from '@/lib/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to console (will be sent to Sentry in production)
    logger.error('ErrorBoundary caught an error:', error, errorInfo)

    this.setState({
      error,
      errorInfo,
    })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-dark-900 dark:to-dark-800 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-dark-800 rounded-2xl shadow-2xl p-8">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-center text-dark-900 dark:text-dark-50 mb-3">
              Nešto nije u redu
            </h1>

            {/* Message */}
            <p className="text-center text-dark-600 dark:text-dark-400 mb-6">
              Došlo je do neočekivane greške. Molimo pokušajte ponovo ili se vratite na početnu
              stranicu.
            </p>

            {/* Error details (only in dev) */}
            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 p-4 bg-dark-100 dark:bg-dark-700 rounded-lg overflow-auto max-h-40">
                <p className="text-xs font-mono text-red-600 dark:text-red-400">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <pre className="text-xs font-mono text-dark-600 dark:text-dark-400 mt-2 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                Pokušaj ponovo
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-dark-100 dark:bg-dark-700 hover:bg-dark-200 dark:hover:bg-dark-600 text-dark-900 dark:text-dark-50 rounded-xl font-semibold transition-colors"
              >
                <Home className="w-5 h-5" />
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
