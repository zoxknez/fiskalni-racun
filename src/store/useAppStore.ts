import { z } from 'zod'
import { useStore } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'
import { type AuthSlice, createAuthSlice } from './slices/createAuthSlice'
import { createSettingsSlice, type SettingsSlice } from './slices/createSettingsSlice'
import { createSyncSlice, type SyncSlice } from './slices/createSyncSlice'
import { createUISlice, type UISlice } from './slices/createUISlice'

// ⭐ Zod schema for persisted state validation
const persistedStateSchema = z.object({
  user: z
    .object({
      id: z.string(),
      email: z.string().email(),
      fullName: z.string().optional(),
      avatarUrl: z.string().url().optional(),
      createdAt: z
        .union([z.string(), z.date()])
        .transform((v) => (typeof v === 'string' ? new Date(v) : v)),
    })
    .nullable()
    .optional(),
  isAuthenticated: z.boolean().optional(),
  settings: z
    .object({
      language: z.enum(['sr', 'en', 'hr', 'sl']).optional(),
      currency: z.string().optional(),
      theme: z.enum(['light', 'dark', 'system']).optional(),
      notificationsEnabled: z.boolean().optional(),
      pushNotifications: z.boolean().optional(),
      emailNotifications: z.boolean().optional(),
      appLock: z.boolean().optional(),
      biometricLock: z.boolean().optional(),
      warrantyExpiryThreshold: z.number().optional(),
      warrantyCriticalThreshold: z.number().optional(),
    })
    .optional(),
})

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

      // ⭐ Version control & migration with Zod validation
      version: 1,
      migrate: (persistedState: unknown, version: number) => {
        // Validate persisted state structure
        const parsed = persistedStateSchema.safeParse(persistedState)
        if (!parsed.success) {
          // Invalid state - return empty to use defaults
          console.warn('[AppStore] Invalid persisted state, using defaults:', parsed.error.issues)
          return {} as Partial<AppStore>
        }

        if (version === 0) {
          // Migration from v0 to v1
          return parsed.data as Partial<AppStore>
        }
        return parsed.data as Partial<AppStore>
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
  const appState = useStore(appStore)
  return selector ? selector(appState) : appState
}

// ⭐ Shorthand selectors for common use cases
export function useUser() {
  return useAppStore((state) => state.user)
}

export function useIsAuthenticated() {
  return useAppStore((state) => state.isAuthenticated)
}

export function useSettings() {
  return useAppStore((state) => state.settings)
}

export function useTheme() {
  return useAppStore((state) => state.settings.theme)
}

export function useLanguage() {
  return useAppStore((state) => state.settings.language)
}

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
