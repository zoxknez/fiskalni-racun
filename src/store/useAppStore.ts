import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Receipt, Device, AppSettings, User } from '@/types'

interface AppState {
  // User & Auth
  user: User | null
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  logout: () => void

  // Settings
  settings: AppSettings
  updateSettings: (settings: Partial<AppSettings>) => void
  setLanguage: (language: 'sr' | 'en') => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void

  // UI State
  isSidebarOpen: boolean
  toggleSidebar: () => void
  isAddModalOpen: boolean
  setAddModalOpen: (open: boolean) => void
  
  // Data (in-memory cache, actual data in Dexie)
  receiptsCache: Receipt[]
  devicesCache: Device[]
  setReceiptsCache: (receipts: Receipt[]) => void
  setDevicesCache: (devices: Device[]) => void
  
  // Sync status
  isSyncing: boolean
  lastSyncAt: Date | null
  setSyncing: (syncing: boolean) => void
  setLastSync: (date: Date) => void
}

const defaultSettings: AppSettings = {
  language: 'sr',
  theme: 'system',
  pushNotifications: true,
  emailNotifications: true,
  appLock: false,
  biometric: false,
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // User & Auth
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      logout: () => set({ user: null, isAuthenticated: false }),

      // Settings
      settings: defaultSettings,
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      setLanguage: (language) =>
        set((state) => ({
          settings: { ...state.settings, language },
        })),
      setTheme: (theme) =>
        set((state) => ({
          settings: { ...state.settings, theme },
        })),

      // UI State
      isSidebarOpen: false,
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      isAddModalOpen: false,
      setAddModalOpen: (open) => set({ isAddModalOpen: open }),

      // Data cache
      receiptsCache: [],
      devicesCache: [],
      setReceiptsCache: (receipts) => set({ receiptsCache: receipts }),
      setDevicesCache: (devices) => set({ devicesCache: devices }),

      // Sync
      isSyncing: false,
      lastSyncAt: null,
      setSyncing: (syncing) => set({ isSyncing: syncing }),
      setLastSync: (date) => set({ lastSyncAt: date }),
    }),
    {
      name: 'fiskalni-racun-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        settings: state.settings,
      }),
    }
  )
)
