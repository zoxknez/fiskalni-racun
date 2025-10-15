import type { StateCreator } from 'zustand'

/**
 * UI Slice for Zustand Store
 * Modern pattern: Separated UI state from business logic
 */
export interface UISlice {
  isSidebarOpen: boolean
  toggleSidebar: () => void
  isAddModalOpen: boolean
  setAddModalOpen: (open: boolean) => void
}

export const createUISlice: StateCreator<UISlice> = (set) => ({
  isSidebarOpen: false,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  isAddModalOpen: false,
  setAddModalOpen: (open) => set({ isAddModalOpen: open }),
})
