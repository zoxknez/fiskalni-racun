import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type AuthSlice, createAuthSlice } from './slices/createAuthSlice'
import { createSettingsSlice, type SettingsSlice } from './slices/createSettingsSlice'
import { createSyncSlice, type SyncSlice } from './slices/createSyncSlice'
import { createUISlice, type UISlice } from './slices/createUISlice'

/**
 * Modern Zustand Store with Slice Pattern
 *
 * Benefits:
 * - Better code organization
 * - Easier to maintain and test
 * - Type-safe slice composition
 * - Clear separation of concerns
 */
type AppStore = AuthSlice & SettingsSlice & UISlice & SyncSlice

export const useAppStore = create<AppStore>()(
  persist(
    (...args) => ({
      ...createAuthSlice(...args),
      ...createSettingsSlice(...args),
      ...createUISlice(...args),
      ...createSyncSlice(...args),
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
