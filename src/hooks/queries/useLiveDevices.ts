/**
 * Dexie Live Query Hooks for Devices
 *
 * Reactive database queries that auto-update UI
 *
 * @module hooks/queries/useLiveDevices
 */

import { type Device, db } from '@lib/db'
import { useLiveQuery } from 'dexie-react-hooks'

/**
 * ⭐ Live query - All devices
 */
export function useLiveDevices() {
  return useLiveQuery(() => db.devices.orderBy('warrantyExpiry').toArray(), [])
}

/**
 * ⭐ Live query - Single device
 */
export function useLiveDevice(id: string | undefined) {
  return useLiveQuery(() => (id ? db.devices.get(id) : undefined), [id])
}

/**
 * ⭐ Live query - Devices by status
 * Uses compound index for performance
 */
export function useLiveDevicesByStatus(status: Device['status']) {
  return useLiveQuery(() => db.devices.where('status').equals(status).toArray(), [status])
}

/**
 * ⭐ Live query - Expiring devices
 * Uses compound index [status+warrantyExpiry] for fast lookup
 */
export function useLiveExpiringDevices(daysThreshold = 30) {
  return useLiveQuery(() => {
    const now = new Date()
    const threshold = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000)

    // ⭐ Compound index query - FAST!
    return db.devices
      .where('[status+warrantyExpiry]')
      .between(['active', now], ['active', threshold], true, true)
      .toArray()
  }, [daysThreshold])
}

/**
 * ⭐ Live query - Critical expiring devices (< 7 days)
 */
export function useLiveCriticalDevices() {
  return useLiveQuery(() => {
    const now = new Date()
    const threshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    return db.devices
      .where('[status+warrantyExpiry]')
      .between(['active', now], ['active', threshold], true, true)
      .toArray()
  }, [])
}

/**
 * ⭐ Live query - Devices by brand
 */
export function useLiveDevicesByBrand(brand: string) {
  return useLiveQuery(() => db.devices.where('brand').equals(brand).toArray(), [brand])
}

/**
 * ⭐ Live query - Devices by category
 */
export function useLiveDevicesByCategory(category: string) {
  return useLiveQuery(() => db.devices.where('category').equals(category).toArray(), [category])
}

/**
 * ⭐ Live query - Search devices
 */
export function useLiveSearchDevices(query: string) {
  return useLiveQuery(() => {
    if (!query.trim()) {
      return db.devices.orderBy('warrantyExpiry').toArray()
    }

    const lowerQuery = query.toLowerCase()

    return db.devices
      .filter((device) => {
        const matchesBrand = device.brand.toLowerCase().includes(lowerQuery)
        const matchesModel = device.model.toLowerCase().includes(lowerQuery)
        const matchesSerial = device.serialNumber?.toLowerCase().includes(lowerQuery) ?? false
        const matchesCategory = device.category.toLowerCase().includes(lowerQuery)

        return matchesBrand || matchesModel || matchesSerial || matchesCategory
      })
      .toArray()
  }, [query])
}

/**
 * ⭐ Live query - Device stats
 */
export function useLiveDeviceStats() {
  return useLiveQuery(async () => {
    const devices = await db.devices.toArray()

    return {
      total: devices.length,
      active: devices.filter((d) => d.status === 'active').length,
      expired: devices.filter((d) => d.status === 'expired').length,
      inService: devices.filter((d) => d.status === 'in-service').length,
    }
  }, [])
}

/**
 * ⭐ Live query - Devices linked to receipt
 */
export function useLiveDevicesByReceipt(receiptId: number | undefined) {
  return useLiveQuery(() => {
    if (!receiptId) return []
    return db.devices.where('receiptId').equals(receiptId).toArray()
  }, [receiptId])
}
