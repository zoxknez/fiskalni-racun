/**
 * Sentry Error Tracking & Performance Monitoring
 *
 * @module lib/monitoring/sentry
 */

import * as Sentry from '@sentry/react'
import { useEffect } from 'react'
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from 'react-router-dom'

/**
 * Initialize Sentry
 */
export function initSentry() {
  if (import.meta.env['PROD'] && import.meta.env['VITE_SENTRY_DSN']) {
    Sentry.init({
      dsn: import.meta.env['VITE_SENTRY_DSN'],
      environment: import.meta.env['MODE'],
      release: `fiskalni-racun@${import.meta.env['VITE_APP_VERSION'] || '1.0.0'}`,

      // ⭐ Performance monitoring
      integrations: [
        // React Router integration
        Sentry.reactRouterV6BrowserTracingIntegration({
          useEffect,
          useLocation,
          useNavigationType,
          createRoutesFromChildren,
          matchRoutes,
        }),

        // ⭐ Session Replay
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
          maskAllInputs: true,
          networkDetailAllowUrls: [window.location.origin],
        }),

        // ⭐ Browser Profiling
        Sentry.browserProfilingIntegration(),
      ],

      // ⭐ Performance traces
  tracesSampleRate: import.meta.env['DEV'] ? 1.0 : 0.1,

      // ⭐ Session Replay sampling
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,

      // ⭐ Before send hook
      beforeSend(event) {
        // Filter sensitive data
        if (event.request?.headers) {
          delete event.request.headers['Authorization']
          delete event.request.headers['Cookie']
        }

        // Add custom context
        if (event.user) {
          delete event.user.email
        }

        return event
      },

      // ⭐ Ignore specific errors
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
        'Network request failed',
        'Failed to fetch',
        'Load failed',
        'NotAllowedError',
        'AbortError',
      ],

      // ⭐ Deny URLs (don't track errors from these)
      denyUrls: [/extensions\//i, /^chrome:\/\//i, /^moz-extension:\/\//i],
    })
  }
}

/**
 * Set user context
 */
export function identifyUser(userId: string, email?: string, name?: string) {
  const user: Sentry.User = {
    id: userId,
  }

  if (name) {
    user.username = name
  }

  if (email) {
    user.email = email
  }

  Sentry.setUser(user)
}

/**
 * Clear user context (on logout)
 */
export function clearUser() {
  Sentry.setUser(null)
}

/**
 * Add breadcrumb (user action tracking)
 */
export function addBreadcrumb(
  message: string,
  category: string,
  level: Sentry.SeverityLevel = 'info'
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    timestamp: Date.now() / 1000,
  })
}

/**
 * Capture custom error
 */
export function captureError(error: Error | unknown, context?: Record<string, unknown>) {
  Sentry.captureException(error, (scope) => {
    if (context) {
      scope.setExtras(context)
    }
    return scope
  })
}

/**
 * Capture custom message
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level)
}

/**
 * React Error Boundary with Sentry
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary
