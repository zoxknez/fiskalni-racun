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
import { useWebVitals } from './hooks/useWebVitals'
import { onAuthStateChange, toAuthUser } from './lib/auth'
import { QueryProvider } from './providers/QueryProvider'
import { useAppStore } from './store/useAppStore'

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
const AboutPage = lazy(() => import('./pages/AboutPage'))

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="w-16 h-16 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
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

  // Listen to auth state changes
  useEffect(() => {
    const {
      data: { subscription },
    } = onAuthStateChange((user) => {
      if (user) {
        const authUser = toAuthUser(user)
        setUser({
          id: authUser.id,
          email: authUser.email,
          fullName: authUser.fullName,
          avatarUrl: authUser.avatarUrl,
          createdAt: new Date(),
        })
      } else {
        setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [setUser])

  // Apply theme
  useEffect(() => {
    const root = document.documentElement

    if (settings.theme === 'dark') {
      root.classList.add('dark')
    } else if (settings.theme === 'light') {
      root.classList.remove('dark')
    } else {
      // System preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
  }, [settings.theme])

  return (
    <ErrorBoundary>
      <QueryProvider>
        <BrowserRouter>
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
                    <ProtectedRoute>
                      <MainLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<HomePage />} />
                  <Route path="receipts" element={<ReceiptsPage />} />
                  <Route path="receipts/:id" element={<ReceiptDetailPage />} />
                  <Route path="warranties" element={<WarrantiesPage />} />
                  <Route path="warranties/add" element={<AddDevicePage />} />
                  <Route path="warranties/:id/edit" element={<EditDevicePage />} />
                  <Route path="warranties/:id" element={<WarrantyDetailPage />} />
                  <Route path="add" element={<AddReceiptPage />} />
                  <Route path="search" element={<SearchPage />} />
                  <Route path="analytics" element={<AnalyticsPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="about" element={<AboutPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </Suspense>
          </AnimatePresence>
        </BrowserRouter>
      </QueryProvider>
    </ErrorBoundary>
  )
}

export default App
