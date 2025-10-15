/**
 * Enhanced API Client with Caching
 *
 * @module lib/api/enhancedClient
 */

import { APIClient, type APIError, type RequestConfig } from '../api'
import { Ok, type Result } from '../result'

interface CacheEntry<T> {
  data: T
  timestamp: number
  etag?: string
}

/**
 * API Client with in-memory caching
 */
export class CachedAPIClient extends APIClient {
  private cache = new Map<string, CacheEntry<unknown>>()
  private cacheTTL: number

  constructor(baseURL: string = '', defaultHeaders: HeadersInit = {}, cacheTTL = 5 * 60 * 1000) {
    super(baseURL, defaultHeaders)
    this.cacheTTL = cacheTTL
  }

  /**
   * GET with caching support
   */
  override async get<T>(
    endpoint: string,
    config?: RequestConfig & { cache?: boolean; cacheTTL?: number }
  ): Promise<Result<T, APIError>> {
    const shouldCache = config?.cache !== false
    const ttl = config?.cacheTTL || this.cacheTTL
    const cacheKey = `GET:${endpoint}`

    // Check cache
    if (shouldCache) {
      const cached = this.cache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < ttl) {
        return Ok(cached.data as T)
      }
    }

    // Fetch from network
    const result = await super.get<T>(endpoint, config)

    // Store in cache
    if (result.ok && shouldCache) {
      this.cache.set(cacheKey, {
        data: result.value,
        timestamp: Date.now(),
      })
    }

    return result
  }

  /**
   * Clear cache
   */
  clearCache(pattern?: string) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key)
        }
      }
    } else {
      this.cache.clear()
    }
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size
  }

  /**
   * Get cached entry
   */
  getCachedEntry<T>(endpoint: string): T | null {
    const cached = this.cache.get(`GET:${endpoint}`)

    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data as T
    }

    return null
  }
}

/**
 * Create API client with auto-refresh token interceptor
 */
export function createSupabaseAPIClient(baseURL: string) {
  const client = new CachedAPIClient(baseURL)

  // ⭐ Request interceptor - Add auth token
  client.useRequestInterceptor(async (config) => {
    const { supabase } = await import('../supabase')
    const { data } = await supabase.auth.getSession()

    if (data.session?.access_token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${data.session.access_token}`,
      }
    }

    return config
  })

  // ⭐ Response interceptor - Auto refresh on 401
  client.useResponseInterceptor(async (response) => {
    if (response.status === 401) {
      const { supabase } = await import('../supabase')
      const { data, error } = await supabase.auth.refreshSession()

      if (!error && data.session) {
        // Retry original request with new token
        const originalRequest = response.clone()
        const newResponse = await fetch(originalRequest.url, {
          ...originalRequest,
          headers: {
            ...Object.fromEntries(originalRequest.headers.entries()),
            Authorization: `Bearer ${data.session.access_token}`,
          },
        })

        return newResponse
      }
    }

    return response
  })

  return client
}
