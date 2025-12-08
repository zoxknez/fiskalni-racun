import { lazy, Suspense, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { EnhancedToaster } from './components/common/EnhancedToaster'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import OfflineIndicator from './components/common/OfflineIndicator'
import PWAPrompt from './components/common/PWAPrompt'
import MainLayout from './components/layout/MainLayout'
import { useBackgroundSync } from './hooks/useBackgroundSync'
import { useBroadcastSync } from './hooks/useBroadcastSync'
import { useOCRCleanup } from './hooks/useOCRCleanup'
// import { useRealtimeSync } from './hooks/useRealtimeSync'
import { useSWUpdate } from './hooks/useSWUpdate'
import { useWebVitals } from './hooks/useWebVitals'
// import { onAuthStateChange, toAuthUser } from './lib/auth'
import { authService } from './lib/neon/auth'
import { QueryProvider } from './providers/QueryProvider'
import { useAppStore } from './store/useAppStore'

// import type { User } from './types'

// Lazy load pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage'))
const ReceiptsPage = lazy(() => import('./pages/ReceiptsPage'))
const ReceiptDetailPage = lazy(() => import('./pages/ReceiptDetailPage'))
const EditReceiptPage = lazy(() => import('./pages/EditReceiptPage'))
const WarrantiesPage = lazy(() => import('./pages/WarrantiesPage'))
const WarrantyDetailPage = lazy(() => import('./pages/WarrantyDetailPage'))
const AddDevicePage = lazy(() => import('./pages/AddDevicePage'))
const EditDevicePage = lazy(() => import('./pages/EditDevicePage'))
const AddReceiptPage = lazy(() => import('./pages/AddReceiptPageSimplified'))
const SearchPage = lazy(() => import('./pages/SearchPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const AccountSettingsPage = lazy(() => import('./pages/AccountSettingsPage'))
const AuthPage = lazy(() => import('./pages/AuthPage'))
// const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage'))
// const NeonAuthPage = lazy(() => import('./pages/NeonAuthPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const ImportExportPage = lazy(() => import('./pages/ImportExportPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const CommandPalette = lazy(() => import('./components/common/CommandPalette'))
const AnimatePresence = lazy(() =>
  import('framer-motion').then((m) => ({ default: m.AnimatePresence }))
)

const { VITE_REQUIRE_AUTH: rawRequireAuth } = import.meta.env as { VITE_REQUIRE_AUTH?: string }
const REQUIRE_AUTH = typeof rawRequireAuth === 'string' && rawRequireAuth.toLowerCase() === 'true'

// Loading fallback component
const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary-500/30 border-t-primary-500" />
  </div>
)

function AppContent() {
  const { settings, setUser } = useAppStore()

  // Background sync for offline changes
  useBackgroundSync()

  // Cross-tab synchronization using Broadcast Channel API
  useBroadcastSync()

  // Realtime sync with Neon (Web ↔ Mobile)
  // useRealtimeSync()

  // Cleanup OCR worker on unmount (prevents memory leaks)
  useOCRCleanup()

  // Monitor Web Vitals for performance tracking
  useWebVitals()

  // Handle SW update messages (force refresh + cache cleanup)
  useSWUpdate()

  // Listen to auth state changes
  useEffect(() => {
    const checkAuth = async () => {
      const user = await authService.getUser()
      if (user) {
        setUser({
          id: user.id,
          email: user.email,
          fullName: user.full_name || '',
          ...(user.avatar_url ? { avatarUrl: user.avatar_url } : {}),
          createdAt: new Date(user.created_at),
          is_admin: user.is_admin || false,
        })
      } else {
        setUser(null)
      }
    }
    checkAuth()
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

      // ⭐ FIXED: Removed deprecated addListener fallback (target: es2022)
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }

    // Return empty cleanup function for non-system themes
    return () => {}
  }, [settings.theme])

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      {/* Accessibility: Skip to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:rounded-lg focus:bg-primary-600 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
      >
        Skip to main content
      </a>

      {/* Command Palette (Cmd+K) */}
      <Suspense fallback={null}>
        <CommandPalette />
      </Suspense>

      {/* PWA Install Prompt & Update Notification */}
      <PWAPrompt />

      {/* Offline/Online Indicator */}
      <OfflineIndicator />

      {/* Enhanced Toast Notifications (sonner) */}
      <EnhancedToaster />

      {/* React Hot Toast (for legacy pages) */}
      <Toaster position="top-center" />

      <AnimatePresence mode="wait">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Auth Routes (no layout) */}
            <Route path="/auth" element={<AuthPage />} />

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
              <Route path="receipts/:id/edit" element={<EditReceiptPage />} />
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
              <Route path="profile/settings" element={<AccountSettingsPage />} />
              <Route path="admin" element={<AdminPage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </AnimatePresence>
    </BrowserRouter>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <AppContent />
      </QueryProvider>
    </ErrorBoundary>
  )
}

export default App
