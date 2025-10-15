import { useStore } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'
import { type AuthSlice, createAuthSlice } from './slices/createAuthSlice'
import { createSettingsSlice, type SettingsSlice } from './slices/createSettingsSlice'
import { createSyncSlice, type SyncSlice } from './slices/createSyncSlice'
import { createUISlice, type UISlice } from './slices/createUISlice'

/**
 * Modern Zustand Store with Vanilla Pattern
 *
 * Benefits:
 * - Better TypeScript inference
 * - Testable without React
 * - Can be used in non-React code
 * - Better tree-shaking
 * - Selective hydration support
 * - Migration support
 *
 * @example
 * ```ts
 * // In React components
 * const user = useAppStore(state => state.user)
 *
 * // Outside React
 * const user = appStore.getState().user
 * appStore.setState({ user: newUser })
 * ```
 */
export type AppStore = AuthSlice & SettingsSlice & UISlice & SyncSlice

// ⭐ Create vanilla store
export const appStore = createStore<AppStore>()(
  persist(
    (...args) => ({
      ...createAuthSlice(...args),
      ...createSettingsSlice(...args),
      ...createUISlice(...args),
      ...createSyncSlice(...args),
    }),
    {
      name: 'fiskalni-racun-storage',

      // ⭐ Use JSON storage
      storage: createJSONStorage(() => localStorage),

      // ⭐ Selective persistence
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        settings: state.settings,
      }),

      // ⭐ Version control & migration
      version: 1,
      migrate: (persistedState: unknown, version: number) => {
        if (version === 0) {
          // Migration from v0 to v1
          // Add any migration logic here
          return persistedState as AppStore
        }
        return persistedState as AppStore
      },

      // ⭐ Skip hydration (useful for SSR)
      skipHydration: false,
    }
  )
)

// ⭐ Type-safe selectors
export function useAppStore(): AppStore
export function useAppStore<T>(selector: (state: AppStore) => T): T
export function useAppStore<T>(selector?: (state: AppStore) => T) {
  return selector ? useStore(appStore, selector) : useStore(appStore)
}

// ⭐ Shorthand selectors for common use cases
export const useUser = () => useAppStore((state) => state.user)
export const useIsAuthenticated = () => useAppStore((state) => state.isAuthenticated)
export const useSettings = () => useAppStore((state) => state.settings)
export const useTheme = () => useAppStore((state) => state.settings.theme)
export const useLanguage = () => useAppStore((state) => state.settings.language)

// ⭐ Actions without re-renders (for callbacks)
export const appStoreActions = {
  setUser: (user: AppStore['user']) => appStore.setState({ user, isAuthenticated: !!user }),
  logout: () => appStore.setState({ user: null, isAuthenticated: false }),
  updateSettings: (settings: Partial<AppStore['settings']>) =>
    appStore.setState((state) => ({
      settings: { ...state.settings, ...settings },
    })),
}

// ⭐ Subscribe to specific slices (outside React)
export const subscribeToAuth = (callback: (user: AppStore['user']) => void) => {
  let previous = appStore.getState().user
  callback(previous)
  return appStore.subscribe((state) => {
    if (state.user !== previous) {
      previous = state.user
      callback(state.user)
    }
  })
}

export const subscribeToSettings = (callback: (settings: AppStore['settings']) => void) => {
  let previous = appStore.getState().settings
  callback(previous)
  return appStore.subscribe((state) => {
    if (state.settings !== previous) {
      previous = state.settings
      callback(state.settings)
    }
  })
}
