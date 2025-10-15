import { useDeferredValue, useMemo } from 'react'
import type { Device, Receipt } from '@/types'

/**
 * Modern React 18 Hook - Deferred Search
 *
 * Uses useDeferredValue and useTransition for smooth search UX
 * Search results update with lower priority than user input
 *
 * Benefits:
 * - Input remains responsive during heavy filtering
 * - UI doesn't freeze on large datasets
 * - Loading state indicates background work
 */
export function useDeferredSearch<T>(
  items: T[] | undefined,
  searchQuery: string,
  searchFn: (item: T, query: string) => boolean
) {
  // Defer the search query - updates with lower priority
  const deferredQuery = useDeferredValue(searchQuery)

  // Perform expensive filtering with deferred value
  const filteredItems = useMemo(() => {
    if (!items) return []
    if (!deferredQuery.trim()) return items

    const query = deferredQuery.toLowerCase().trim()
    return items.filter((item) => searchFn(item, query))
  }, [items, deferredQuery, searchFn])

  return {
    filteredItems,
    isStale: deferredQuery !== searchQuery, // True when showing old results
  }
}

/**
 * Specialized hook for receipts search
 */
export function useDeferredReceiptSearch(receipts: Receipt[] | undefined, searchQuery: string) {
  return useDeferredSearch(
    receipts,
    searchQuery,
    (receipt, query) =>
      receipt.merchantName?.toLowerCase().includes(query) ||
      receipt.pib?.toLowerCase().includes(query) ||
      receipt.notes?.toLowerCase().includes(query) ||
      receipt.category?.toLowerCase().includes(query)
  )
}

/**
 * Specialized hook for devices search
 */
export function useDeferredDeviceSearch(devices: Device[] | undefined, searchQuery: string) {
  return useDeferredSearch(
    devices,
    searchQuery,
    (device, query) =>
      device.brand?.toLowerCase().includes(query) ||
      device.model?.toLowerCase().includes(query) ||
      device.serialNumber?.toLowerCase().includes(query) ||
      device.category?.toLowerCase().includes(query)
  )
}
