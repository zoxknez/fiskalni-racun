import { logger } from '@/lib/logger'
import './polyfills/buffer'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import './i18n'
import { ErrorBoundary } from './components/error'
import { initSentry } from './lib/monitoring/sentry'
import { initializeSecurityPolicies } from './lib/security/csp'

// ⭐ Initialize Sentry error tracking
initSentry()

// Initialize security policies (CSP, Trusted Types)
initializeSecurityPolicies()

// ⭐ Initialize debug tools (dev only)
if (import.meta.env.DEV) {
  import('./lib/dev/debugTools').then(({ initDebugTools }) => {
    initDebugTools()
  })
}

// Fix for PWA OAuth redirect issue
// If we detect localhost in the URL but we're on production domain, clean up
if (
  window.location.hostname === 'fiskalni.app' ||
  window.location.hostname === 'www.fiskalni.app'
) {
  // Check if there's a cached localhost URL in storage
  const keys = Object.keys(localStorage)
  keys.forEach((key) => {
    const value = localStorage.getItem(key)
    if (value?.includes('localhost:3000')) {
      logger.warn('[CLEANUP] Removing cached localhost URL from:', key)
      localStorage.removeItem(key)
    }
  })

  // Also check sessionStorage
  const sessionKeys = Object.keys(sessionStorage)
  sessionKeys.forEach((key) => {
    const value = sessionStorage.getItem(key)
    if (value?.includes('localhost:3000')) {
      logger.warn('[CLEANUP] Removing cached localhost URL from session:', key)
      sessionStorage.removeItem(key)
    }
  })
}

// Mobile debugging console was intentionally disabled to avoid UI overlap.

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element with id "root" not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)
