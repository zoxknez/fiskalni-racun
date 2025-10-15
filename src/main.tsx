import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import './i18n'

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
    if (value && value.includes('localhost:3000')) {
      console.warn('[CLEANUP] Removing cached localhost URL from:', key)
      localStorage.removeItem(key)
    }
  })

  // Also check sessionStorage
  const sessionKeys = Object.keys(sessionStorage)
  sessionKeys.forEach((key) => {
    const value = sessionStorage.getItem(key)
    if (value && value.includes('localhost:3000')) {
      console.warn('[CLEANUP] Removing cached localhost URL from session:', key)
      sessionStorage.removeItem(key)
    }
  })
}

// Mobile debugging console - visible on mobile devices
if (import.meta.env.DEV || window.location.search.includes('debug=true')) {
  import('eruda').then((eruda) => eruda.default.init())
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
