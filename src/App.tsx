import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import { useAppStore } from './store/useAppStore'
import MainLayout from './components/layout/MainLayout'
import HomePage from './pages/HomePage'
import ReceiptsPage from './pages/ReceiptsPage'
import ReceiptDetailPage from './pages/ReceiptDetailPage'
import WarrantiesPage from './pages/WarrantiesPage'
import WarrantyDetailPage from './pages/WarrantyDetailPage'
import AddReceiptPage from './pages/AddReceiptPage'
import SearchPage from './pages/SearchPage'
import ProfilePage from './pages/ProfilePage'

function App() {
  const { settings } = useAppStore()

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
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--toast-bg)',
            color: 'var(--toast-color)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="receipts" element={<ReceiptsPage />} />
          <Route path="receipts/:id" element={<ReceiptDetailPage />} />
          <Route path="warranties" element={<WarrantiesPage />} />
          <Route path="warranties/:id" element={<WarrantyDetailPage />} />
          <Route path="add" element={<AddReceiptPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
