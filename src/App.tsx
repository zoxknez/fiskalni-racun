import { Analytics } from '@vercel/analytics/react'
import { AnimatePresence } from 'framer-motion'
import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { CommandPalette } from './components/common/CommandPalette'
import { EnhancedToaster } from './components/common/EnhancedToaster'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import OfflineIndicator from './components/common/OfflineIndicator'
import PWAPrompt from './components/common/PWAPrompt'
import MainLayout from './components/layout/MainLayout'
import { useBackgroundSync } from './hooks/useBackgroundSync'
import { useOCRCleanup } from './hooks/useOCRCleanup'
import { useRealtimeSync } from './hooks/useRealtimeSync'
import { useSWUpdate } from './hooks/useSWUpdate'
import { useWebVitals } from './hooks/useWebVitals'
import { onAuthStateChange, toAuthUser } from './lib/auth'
import { QueryProvider } from './providers/QueryProvider'
import { useAppStore } from './store/useAppStore'
import type { User } from './types'

// Lazy load pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage'))
const ReceiptsPage = lazy(() => import('./pages/ReceiptsPage'))
const ReceiptDetailPage = lazy(() => import('./pages/ReceiptDetailPage'))
const WarrantiesPage = lazy(() => import('./pages/WarrantiesPage'))
const WarrantyDetailPage = lazy(() => import('./pages/WarrantyDetailPage'))
const AddDevicePage = lazy(() => import('./pages/AddDevicePage'))
const EditDevicePage = lazy(() => import('./pages/EditDevicePage'))
const AddReceiptPage = lazy(() => import('./pages/AddReceiptPage'))
const SearchPage = lazy(() => import('./pages/SearchPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const AuthPage = lazy(() => import('./pages/AuthPage'))
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const ImportExportPage = lazy(() => import('./pages/ImportExportPage'))

const { VITE_REQUIRE_AUTH: rawRequireAuth } = import.meta.env as { VITE_REQUIRE_AUTH?: string }
const REQUIRE_AUTH = typeof rawRequireAuth === 'string' && rawRequireAuth.toLowerCase() === 'true'

// Loading fallback component
const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary-500/30 border-t-primary-500" />
  </div>
)

function App() {
  const { settings, setUser } = useAppStore()

  // Background sync for offline changes
  useBackgroundSync()

  // Realtime sync with Supabase (Web ↔ Mobile)
  useRealtimeSync()

  // Cleanup OCR worker on unmount (prevents memory leaks)
  useOCRCleanup()

  // Monitor Web Vitals for performance tracking
  useWebVitals()

  // Handle SW update messages (force refresh + cache cleanup)
  useSWUpdate()

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      if (user) {
        const authUser = toAuthUser(user)
        const nextUser: User = {
          id: authUser.id,
          email: authUser.email,
          createdAt: new Date(),
          ...(authUser.fullName !== undefined ? { fullName: authUser.fullName } : {}),
          ...(authUser.avatarUrl !== undefined ? { avatarUrl: authUser.avatarUrl } : {}),
        }
        setUser(nextUser)
      } else {
        setUser(null)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [setUser])

  // Apply theme
  useEffect(() => {
    const root = document.documentElement

    const applyTheme = (theme: typeof settings.theme) => {
      if (theme === 'dark') {
        root.classList.add('dark')
        root.setAttribute('data-theme', 'dark')
      } else if (theme === 'light') {
        root.classList.remove('dark')
        root.setAttribute('data-theme', 'light')
      } else {
        // System preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        if (prefersDark) {
          root.classList.add('dark')
          root.setAttribute('data-theme', 'dark')
        } else {
          root.classList.remove('dark')
          root.setAttribute('data-theme', 'light')
        }
      }
    }

    // Apply initial theme
    applyTheme(settings.theme)

    // Listen for system theme changes when using 'system' mode
    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => applyTheme('system')

      // Modern API with addEventListener
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange)
        return () => mediaQuery.removeEventListener('change', handleChange)
      }
      // Fallback for older browsers (deprecated API)
      const legacyQuery = mediaQuery as unknown as {
        addListener: (handler: () => void) => void
        removeListener: (handler: () => void) => void
      }
      legacyQuery.addListener(handleChange)
      return () => legacyQuery.removeListener(handleChange)
    }

    // Return empty cleanup function for non-system themes
    return () => {}
  }, [settings.theme])

  return (
    <ErrorBoundary>
      <QueryProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          {/* Accessibility: Skip to main content */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Skip to main content
          </a>

          {/* Command Palette (Cmd+K) */}
          <CommandPalette />

          {/* PWA Install Prompt & Update Notification */}
          <PWAPrompt />

          {/* Offline/Online Indicator */}
          <OfflineIndicator />

          {/* Enhanced Toast Notifications */}
          <EnhancedToaster />

          <AnimatePresence mode="wait">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Auth Routes (no layout) */}
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/auth/callback" element={<AuthCallbackPage />} />

                {/* Main App Routes (Protected) */}
                <Route
                  path="/"
                  element={
                    REQUIRE_AUTH ? (
                      <ProtectedRoute>
                        <MainLayout />
                      </ProtectedRoute>
                    ) : (
                      <MainLayout />
                    )
                  }
                >
                  <Route index element={<HomePage />} />
                  <Route path="receipts" element={<ReceiptsPage />} />
                  <Route path="receipts/new" element={<AddReceiptPage />} />
                  <Route path="receipts/:id" element={<ReceiptDetailPage />} />
                  <Route path="warranties" element={<WarrantiesPage />} />
                  <Route path="warranties/add" element={<AddDevicePage />} />
                  <Route path="warranties/:id/edit" element={<EditDevicePage />} />
                  <Route path="warranties/:id" element={<WarrantyDetailPage />} />
                  <Route path="add" element={<AddReceiptPage />} />
                  <Route path="search" element={<SearchPage />} />
                  <Route path="analytics" element={<AnalyticsPage />} />
                  <Route path="documents" element={<DocumentsPage />} />
                  <Route path="import-export" element={<ImportExportPage />} />
                  <Route path="import" element={<Navigate to="/import-export" replace />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="about" element={<AboutPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </Suspense>
          </AnimatePresence>
        </BrowserRouter>
        <Analytics />
      </QueryProvider>
    </ErrorBoundary>
  )
}

export default App
