/**
 * Advanced Cache Manager
 *
 * Implements stale-while-revalidate and cache invalidation strategies
 *
 * @module lib/cache/cacheManager
 */

import { logger } from '../logger'

export interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  staleWhileRevalidate?: number // SWR window in milliseconds
  tags?: string[] // Cache tags for bulk invalidation
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  etag?: string
  tags: string[]
}

/**
 * Advanced cache manager with SWR support
 */
export class CacheManager {
  private cache = new Map<string, CacheEntry<unknown>>()
  private revalidating = new Set<string>()

  /**
   * Get cached data with SWR support
   *
   * @returns [data, isStale] - data and whether it's stale
   */
  async get<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<[T, boolean]> {
    const {
      ttl = 5 * 60 * 1000, // 5 minutes default
      staleWhileRevalidate = 60 * 1000, // 1 minute SWR window
      tags = [],
    } = options

    const cached = this.cache.get(key) as CacheEntry<T> | undefined
    const now = Date.now()

    // Cache hit - fresh data
    if (cached && now - cached.timestamp < ttl) {
      return [cached.data, false]
    }

    // Cache hit - stale but within SWR window
    if (cached && now - cached.timestamp < ttl + staleWhileRevalidate) {
      // Return stale data immediately
      const staleData = cached.data

      // Revalidate in background
      if (!this.revalidating.has(key)) {
        this.revalidate(key, fetchFn, tags)
      }

      return [staleData, true]
    }

    // Cache miss or too stale - fetch fresh data
    const data = await fetchFn()

    this.cache.set(key, {
      data,
      timestamp: now,
      tags,
    })

    return [data, false]
  }

  /**
   * Revalidate cache entry in background
   */
  private async revalidate<T>(key: string, fetchFn: () => Promise<T>, tags: string[]) {
    this.revalidating.add(key)

    try {
      const data = await fetchFn()

      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        tags,
      })

      logger.debug('Cache revalidated:', key)
    } catch (error) {
      logger.warn('Cache revalidation failed:', key, error)
    } finally {
      this.revalidating.delete(key)
    }
  }

  /**
   * Set cache entry
   */
  set<T>(key: string, data: T, options: CacheOptions = {}) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      tags: options.tags || [],
    })
  }

  /**
   * Invalidate specific key
   */
  invalidate(key: string) {
    this.cache.delete(key)
    logger.debug('Cache invalidated:', key)
  }

  /**
   * Invalidate by tag
   *
   * @example
   * ```ts
   * cacheManager.invalidateByTag('receipts')
   * // Invalidates all entries tagged with 'receipts'
   * ```
   */
  invalidateByTag(tag: string) {
    let count = 0

    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key)
        count++
      }
    }

    logger.debug(`Cache invalidated by tag ${tag}:`, count, 'entries')
  }

  /**
   * Invalidate multiple tags
   */
  invalidateByTags(tags: string[]) {
    for (const tag of tags) {
      this.invalidateByTag(tag)
    }
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear()
    logger.debug('Cache cleared')
  }

  /**
   * Get cache size
   */
  getSize(): number {
    return this.cache.size
  }

  /**
   * Get cache stats
   */
  getStats() {
    const entries = Array.from(this.cache.entries())
    const now = Date.now()

    return {
      total: entries.length,
      fresh: entries.filter(([_, entry]) => now - entry.timestamp < 5 * 60 * 1000).length,
      stale: entries.filter(([_, entry]) => now - entry.timestamp >= 5 * 60 * 1000).length,
      revalidating: this.revalidating.size,
    }
  }
}

// Global cache manager instance
export const cacheManager = new CacheManager()

/**
 * React hook for cached data with SWR
 */
import { useEffect, useState } from 'react'

export function useSWR<T>(key: string, fetchFn: () => Promise<T>, options?: CacheOptions) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isStale, setIsStale] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      try {
        const [cachedData, stale] = await cacheManager.get(key, fetchFn, options)

        if (!cancelled) {
          setData(cachedData)
          setIsStale(stale)
          setIsLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to load data'))
          setIsLoading(false)
        }
      }
    }

    loadData()

    return () => {
      cancelled = true
    }
  }, [key, fetchFn, options])

  const mutate = (newData: T) => {
    cacheManager.set(key, newData, options)
    setData(newData)
    setIsStale(false)
  }

  const revalidate = async () => {
    setIsLoading(true)

    try {
      const freshData = await fetchFn()
      mutate(freshData)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to revalidate'))
    } finally {
      setIsLoading(false)
    }
  }

  return {
    data,
    isLoading,
    isStale,
    error,
    mutate,
    revalidate,
  }
}
