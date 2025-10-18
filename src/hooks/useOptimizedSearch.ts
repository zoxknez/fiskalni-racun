/**
 * Optimized Search Hook with React 18 useDeferredValue
 *
 * Improves performance by deferring expensive search operations
 * while keeping the input responsive
 *
 * @module hooks/useOptimizedSearch
 */

import { useDeferredValue, useMemo, useState } from 'react'
import type { Device, Receipt } from '@/lib/schemas'

export interface SearchResult<T> {
  items: T[]
  query: string
  isStale: boolean
  count: number
}

/**
 * Optimized search with deferred value
 *
 * @param items - Array of items to search
 * @param searchFn - Search function that filters items
 * @returns Search state and helpers
 *
 * @example
 * ```tsx
 * const { results, query, setQuery, isSearching } = useOptimizedSearch(
 *   receipts,
 *   (items, query) => items.filter(r => r.merchantName.includes(query))
 * )
 * ```
 */
export function useOptimizedSearch<T>(items: T[], searchFn: (items: T[], query: string) => T[]) {
  const [query, setQuery] = useState('')

  // ⭐ Defer expensive search computation
  const deferredQuery = useDeferredValue(query)

  // Only recompute when deferred query changes
  const results = useMemo(() => {
    if (!deferredQuery.trim()) {
      return items
    }

    return searchFn(items, deferredQuery)
  }, [items, deferredQuery, searchFn])

  // Check if search is stale (user is still typing)
  const isStale = query !== deferredQuery

  return {
    results,
    query,
    setQuery,
    isSearching: isStale,
    count: results.length,
  }
}

/**
 * Fuzzy search with deferred value
 * Uses simple string matching (can be replaced with Fuse.js for better results)
 */
export function useFuzzySearch<T>(items: T[], searchKeys: (keyof T)[]) {
  const searchFn = (items: T[], query: string) => {
    const lowerQuery = query.toLowerCase()

    return items.filter((item) => {
      return searchKeys.some((key) => {
        const value = item[key]
        if (typeof value === 'string') {
          return value.toLowerCase().includes(lowerQuery)
        }
        if (typeof value === 'number') {
          return value.toString().includes(query)
        }
        return false
      })
    })
  }

  return useOptimizedSearch(items, searchFn)
}

/**
 * Example: Search receipts
 */
export function useReceiptSearch(receipts: Receipt[]) {
  return useFuzzySearch(receipts, ['vendor', 'category', 'notes', 'pib'])
}

/**
 * Example: Search devices
 */
export function useDeviceSearch(devices: Device[]) {
  return useFuzzySearch(devices, ['brand', 'model', 'serialNumber', 'category'])
}
