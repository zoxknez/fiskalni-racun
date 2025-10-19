import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface ErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
  showDetails?: boolean
}

/**
 * Error Fallback Component
 *
 * Displays user-friendly error message with recovery options.
 * Used by ErrorBoundary as fallback UI.
 */
export function ErrorFallback({
  error,
  resetErrorBoundary,
  showDetails = true,
}: ErrorFallbackProps) {
  const navigate = useNavigate()

  const handleGoHome = () => {
    resetErrorBoundary()
    navigate('/')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-dark-50 p-4 dark:bg-dark-900">
      <div className="w-full max-w-md space-y-6">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="inline-flex rounded-full bg-red-100 p-4 dark:bg-red-900/30">
            <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
          </div>
        </div>

        {/* Error Message */}
        <div className="text-center">
          <h1 className="mb-2 font-bold text-2xl text-dark-900 dark:text-white">
            Ups! Nešto je pošlo po zlu
          </h1>
          <p className="text-dark-600 dark:text-dark-400">
            Došlo je do neočekivane greške. Pokušajte ponovo ili se vratite na početnu stranicu.
          </p>
        </div>

        {/* Error Details (dev mode only) */}
        {showDetails && import.meta.env.DEV && (
          <details className="rounded-xl border border-red-200 bg-white p-4 dark:border-red-900/30 dark:bg-dark-800">
            <summary className="cursor-pointer font-medium text-red-900 text-sm dark:text-red-300">
              Detalji greške (dev mode)
            </summary>
            <div className="mt-3 space-y-2">
              <div>
                <div className="font-medium text-dark-700 text-xs dark:text-dark-300">Poruka:</div>
                <div className="font-mono text-red-800 text-xs dark:text-red-400">
                  {error.message}
                </div>
              </div>
              {error.stack && (
                <div>
                  <div className="font-medium text-dark-700 text-xs dark:text-dark-300">Stack:</div>
                  <pre className="mt-1 max-h-32 overflow-auto rounded bg-dark-50 p-2 font-mono text-[10px] text-dark-600 dark:bg-dark-900 dark:text-dark-400">
                    {error.stack}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={resetErrorBoundary} className="btn-primary flex-1 gap-2">
            <RefreshCw className="h-4 w-4" />
            Pokušaj ponovo
          </button>
          <button type="button" onClick={handleGoHome} className="btn-secondary flex-1 gap-2">
            <Home className="h-4 w-4" />
            Nazad na početnu
          </button>
        </div>

        {/* Additional Help */}
        <div className="rounded-xl border border-dark-200 bg-dark-50 p-4 dark:border-dark-700 dark:bg-dark-800">
          <h3 className="mb-2 font-semibold text-dark-900 text-sm dark:text-white">
            Trebate pomoć?
          </h3>
          <p className="text-dark-600 text-xs dark:text-dark-400">
            Ako se problem nastavi, pokušajte da osvežite stranicu ili očistite keš pretraživača.
          </p>
        </div>
      </div>
    </div>
  )
}
