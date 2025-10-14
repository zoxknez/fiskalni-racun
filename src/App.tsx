import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useAppStore } from './store/useAppStore'
import { useBackgroundSync } from './hooks/useBackgroundSync'
import { QueryProvider } from './providers/QueryProvider'
import { EnhancedToaster } from './components/common/EnhancedToaster'
import { CommandPalette } from './components/common/CommandPalette'
import MainLayout from './components/layout/MainLayout'
import PWAPrompt from './components/common/PWAPrompt'
import OfflineIndicator from './components/common/OfflineIndicator'
import HomePage from './pages/HomePage'
import ReceiptsPage from './pages/ReceiptsPage'
import ReceiptDetailPage from './pages/ReceiptDetailPage'
import WarrantiesPage from './pages/WarrantiesPage'
import WarrantyDetailPage from './pages/WarrantyDetailPage'
import AddDevicePage from './pages/AddDevicePage'
import EditDevicePage from './pages/EditDevicePage'
import AddReceiptPage from './pages/AddReceiptPage'
import SearchPage from './pages/SearchPage'
import ProfilePage from './pages/ProfilePage'

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
          <Routes>
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
        </AnimatePresence>
      </BrowserRouter>
    </QueryProvider>
  )
}

export default App
