import type { StateCreator } from 'zustand'

/**
 * Sync Slice for Zustand Store
 * Manages sync status and cached data
 */
export interface SyncSlice {
  // Sync status
  isSyncing: boolean
  lastSyncAt: Date | null
  setSyncing: (syncing: boolean) => void
  setLastSync: (date: Date) => void
}

export const createSyncSlice: StateCreator<SyncSlice> = (set) => ({
  isSyncing: false,
  lastSyncAt: null,
  setSyncing: (syncing) => set({ isSyncing: syncing }),
  setLastSync: (date) => set({ lastSyncAt: date }),
})
