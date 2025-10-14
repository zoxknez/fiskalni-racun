import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useAppStore } from './store/useAppStore'
import { useBackgroundSync } from './hooks/useBackgroundSync'
import { QueryProvider } from './providers/QueryProvider'
import { EnhancedToaster } from './components/common/EnhancedToaster'
import { CommandPalette } from './components/common/CommandPalette'
import MainLayout from './components/layout/MainLayout'
import PWAPrompt from './components/common/PWAPrompt'
import OfflineIndicator from './components/common/OfflineIndicator'

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

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="w-16 h-16 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
  </div>
)

function App() {
  const { settings } = useAppStore()
  
  // Background sync for offline changes
  useBackgroundSync()

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
              {/* Auth Route (no layout) */}
              <Route path="/auth" element={<AuthPage />} />
              
              {/* Main App Routes */}
              <Route path="/" element={<MainLayout />}>
                <Route index element={<HomePage />} />
                <Route path="receipts" element={<ReceiptsPage />} />
                <Route path="receipts/:id" element={<ReceiptDetailPage />} />
                <Route path="warranties" element={<WarrantiesPage />} />
                <Route path="warranties/add" element={<AddDevicePage />} />
                <Route path="warranties/:id/edit" element={<EditDevicePage />} />
                <Route path="warranties/:id" element={<WarrantyDetailPage />} />
                <Route path="add" element={<AddReceiptPage />} />
                <Route path="search" element={<SearchPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </AnimatePresence>
      </BrowserRouter>
    </QueryProvider>
  )
}

export default App
