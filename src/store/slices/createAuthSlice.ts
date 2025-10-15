import type { StateCreator } from 'zustand'
import type { User } from '@/types'

/**
 * Auth Slice for Zustand Store
 * Modern pattern: Separated concerns with slice pattern
 */
export interface AuthSlice {
  user: User | null
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  logout: () => void
}

export const createAuthSlice: StateCreator<AuthSlice> = (set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => set({ user: null, isAuthenticated: false }),
})
