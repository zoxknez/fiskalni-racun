/**
 * DashboardError Component
 *
 * Error state component for dashboard with retry functionality
 */

import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { PageTransition } from '@/components/common/PageTransition'
import { AlertTriangle, Home, RefreshCw } from '@/lib/icons'

interface DashboardErrorProps {
  error: Error | null
  onRetry?: () => void
}

function DashboardErrorComponent({ error, onRetry }: DashboardErrorProps) {
  const { t } = useTranslation()

  return (
    <PageTransition className="flex min-h-[60vh] items-center justify-center pb-8">
      <div className="max-w-md text-center">
        {/* Error Icon */}
        <div
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20"
          aria-hidden="true"
        >
          <AlertTriangle className="h-10 w-10 text-red-500" />
        </div>

        {/* Error Title */}
        <h1 className="mb-2 font-bold text-2xl text-dark-900 dark:text-dark-50">
          {t('errors.somethingWentWrong') || 'Something went wrong'}
        </h1>

        {/* Error Message */}
        <p className="mb-6 text-dark-600 dark:text-dark-400">
          {t('errors.dashboardLoadError') || "We couldn't load your dashboard. Please try again."}
        </p>

        {/* Error Details (development only) */}
        {process.env['NODE_ENV'] === 'development' && error && (
          <details className="mb-6 rounded-lg bg-dark-100 p-4 text-left dark:bg-dark-800">
            <summary className="cursor-pointer font-medium text-dark-700 text-sm dark:text-dark-300">
              Error details
            </summary>
            <pre className="mt-2 overflow-auto text-red-600 text-xs dark:text-red-400">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          {onRetry && (
            <button
              onClick={onRetry}
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 font-semibold text-white shadow-lg transition-colors hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              <RefreshCw className="h-5 w-5" aria-hidden="true" />
              {t('common.retry') || 'Try again'}
            </button>
          )}

          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl border border-dark-300 bg-white px-5 py-3 font-semibold text-dark-700 transition-colors hover:bg-dark-50 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-200 dark:hover:bg-dark-700"
          >
            <Home className="h-5 w-5" aria-hidden="true" />
            {t('common.goHome') || 'Go home'}
          </Link>
        </div>
      </div>
    </PageTransition>
  )
}

export const DashboardError = memo(DashboardErrorComponent)
