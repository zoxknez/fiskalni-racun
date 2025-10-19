import type { StateCreator } from 'zustand'
import type { AppSettings } from '@/types'

/**
 * Settings Slice for Zustand Store
 * Modern pattern: Separated concerns with slice pattern
 */
export interface SettingsSlice {
  settings: AppSettings
  updateSettings: (settings: Partial<AppSettings>) => void
  setLanguage: (language: 'sr' | 'en') => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
}

const defaultSettings: AppSettings = {
  language: 'sr',
  theme: 'light',
  notificationsEnabled: true,
  pushNotifications: true,
  emailNotifications: true,
  appLock: false,
  biometricLock: false,
  warrantyExpiryThreshold: 30,
  warrantyCriticalThreshold: 7,
}

export const createSettingsSlice: StateCreator<SettingsSlice> = (set) => ({
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
})
