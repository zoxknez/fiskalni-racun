// Custom React hooks for Dexie database with real-time updates

import * as dbAPI from '@lib/db'
import { type Device, db } from '@lib/db'
import { useLiveQuery } from 'dexie-react-hooks'

// ────────────────────────────────────────────────────────────
// Receipts Hooks
// ────────────────────────────────────────────────────────────
export function useReceipts() {
  return useLiveQuery(() => db.receipts.orderBy('date').reverse().toArray(), [])
}

export function useReceipt(id: number | undefined) {
  return useLiveQuery(() => (id !== undefined ? db.receipts.get(id) : undefined), [id])
}

export function useRecentReceipts(limit = 5) {
  return useLiveQuery(() => dbAPI.getRecentReceipts(limit), [limit])
}

export function useReceiptsByCategory(category: string) {
  return useLiveQuery(() => dbAPI.getReceiptsByCategory(category), [category])
}

export function useReceiptSearch(query: string) {
  return useLiveQuery(() => (query ? dbAPI.searchReceipts(query) : db.receipts.toArray()), [query])
}

// ────────────────────────────────────────────────────────────
// Devices Hooks
// ────────────────────────────────────────────────────────────
export function useDevices() {
  return useLiveQuery(() => db.devices.orderBy('createdAt').reverse().toArray(), [])
}

export function useDevice(id: number | undefined) {
  return useLiveQuery(() => (id !== undefined ? db.devices.get(id) : undefined), [id])
}

export function useDevicesByStatus(status: Device['status']) {
  return useLiveQuery(() => db.devices.where('status').equals(status).toArray(), [status])
}

export function useExpiringDevices(days = 30) {
  return useLiveQuery(() => dbAPI.getDevicesByWarrantyStatus(days), [days])
}

export function useDeviceSearch(query: string) {
  return useLiveQuery(() => (query ? dbAPI.searchDevices(query) : db.devices.toArray()), [query])
}

// ────────────────────────────────────────────────────────────
// Reminders Hooks
// ────────────────────────────────────────────────────────────
export function useDeviceReminders(deviceId: number | undefined) {
  return useLiveQuery(
    () => (deviceId !== undefined ? db.reminders.where('deviceId').equals(deviceId).toArray() : []),
    [deviceId]
  )
}

export function usePendingReminders() {
  return useLiveQuery(() => db.reminders.where('status').equals('pending').toArray(), [])
}

// ────────────────────────────────────────────────────────────
// Dashboard Stats Hook
// ────────────────────────────────────────────────────────────
export function useDashboardStats() {
  return useLiveQuery(() => dbAPI.getDashboardStats(), [])
}

// ────────────────────────────────────────────────────────────
// Settings Hooks
// ────────────────────────────────────────────────────────────
export function useSettings(userId: string) {
  return useLiveQuery(() => dbAPI.getSettings(userId), [userId])
}

// ────────────────────────────────────────────────────────────
// Sync Queue Hooks
// ────────────────────────────────────────────────────────────
export function useSyncQueue() {
  return useLiveQuery(() => dbAPI.getPendingSyncItems(), [])
}

// ────────────────────────────────────────────────────────────
// Category Stats Hook
// ────────────────────────────────────────────────────────────
export function useCategoryTotals() {
  return useLiveQuery(() => dbAPI.getTotalByCategory(), [])
}

// ────────────────────────────────────────────────────────────
// Date Range Hook
// ────────────────────────────────────────────────────────────
export function useReceiptsByDateRange(startDate: Date | null, endDate: Date | null) {
  return useLiveQuery(
    () =>
      startDate && endDate
        ? dbAPI.getReceiptsByDateRange(startDate, endDate)
        : db.receipts.toArray(),
    [startDate?.getTime(), endDate?.getTime()]
  )
}

// ────────────────────────────────────────────────────────────
// Export all database API functions for direct use
// ────────────────────────────────────────────────────────────
export {
  addDevice,
  addReceipt,
  addReminder,
  clearSyncQueue,
  deleteDevice,
  deleteReceipt,
  markSynced,
  processSyncQueue,
  updateDevice,
  updateReceipt,
} from '@lib/db'

export { db }
