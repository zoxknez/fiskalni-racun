import type { StateCreator } from 'zustand'
import type { Device, Receipt } from '@/types'

/**
 * Sync Slice for Zustand Store
 * Manages sync status and cached data
 */
export interface SyncSlice {
  // Data cache (in-memory, actual data in Dexie)
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

export const createSyncSlice: StateCreator<SyncSlice> = (set) => ({
  receiptsCache: [],
  devicesCache: [],
  setReceiptsCache: (receipts) => set({ receiptsCache: receipts }),
  setDevicesCache: (devices) => set({ devicesCache: devices }),

  isSyncing: false,
  lastSyncAt: null,
  setSyncing: (syncing) => set({ isSyncing: syncing }),
  setLastSync: (date) => set({ lastSyncAt: date }),
})
