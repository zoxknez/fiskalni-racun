import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Modern useAsyncData Hook
 *
 * Features:
 * - AbortController support
 * - Automatic retry
 * - Loading/error states
 * - Race condition prevention
 * - Stale-while-revalidate pattern
 *
 * Better than useEffect for data fetching
 */

export interface UseAsyncDataOptions<T> {
  /** Initial data */
  initialData?: T
  /** Auto-fetch on mount */
  enabled?: boolean
  /** Retry failed requests */
  retry?: number
  /** Retry delay in ms */
  retryDelay?: number
  /** Callback on success */
  onSuccess?: (data: T) => void
  /** Callback on error */
  onError?: (error: Error) => void
  /** Dedupe requests with same key */
  dedupeKey?: string
}

export interface UseAsyncDataReturn<T> {
  data: T | undefined
  error: Error | null
  isLoading: boolean
  isError: boolean
  isSuccess: boolean
  isFetching: boolean
  refetch: () => Promise<void>
  mutate: (data: T) => void
}

const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export function useAsyncData<T>(
  fetchFn: (signal: AbortSignal) => Promise<T>,
  options: UseAsyncDataOptions<T> = {}
): UseAsyncDataReturn<T> {
  const {
    initialData,
    enabled = true,
    retry = 0,
    retryDelay = 1000,
    onSuccess,
    onError,
    dedupeKey,
  } = options

  const [data, setData] = useState<T | undefined>(initialData)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(enabled && !initialData)
  const [isFetching, setIsFetching] = useState<boolean>(false)

  const abortControllerRef = useRef<AbortController | null>(null)
  const retryCountRef = useRef<number>(0)
  const mountedRef = useRef<boolean>(true)

  // Check cache
  const getCachedData = useCallback((): T | undefined => {
    if (!dedupeKey) return undefined

    const cached = cache.get(dedupeKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data
    }

    return undefined
  }, [dedupeKey])

  // Fetch data
  const fetch = useCallback(async () => {
    // Check cache first
    const cachedData = getCachedData()
    if (cachedData) {
      setData(cachedData)
      setIsLoading(false)
      return
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    const { signal } = abortControllerRef.current

    setIsFetching(true)
    setError(null)

    try {
      const result = await fetchFn(signal)

      // Check if component is still mounted and not aborted
      if (mountedRef.current && !signal.aborted) {
        setData(result)
        setError(null)
        setIsLoading(false)
        retryCountRef.current = 0

        // Cache result
        if (dedupeKey) {
          cache.set(dedupeKey, { data: result, timestamp: Date.now() })
        }

        onSuccess?.(result)
      }
    } catch (err) {
      // Ignore abort errors
      if (err instanceof DOMException && err.name === 'AbortError') {
        return
      }

      const error = err instanceof Error ? err : new Error(String(err))

      if (mountedRef.current && !signal.aborted) {
        // Retry logic
        if (retryCountRef.current < retry) {
          retryCountRef.current++
          setTimeout(() => {
            if (mountedRef.current) {
              fetch()
            }
          }, retryDelay * retryCountRef.current)
          return
        }

        setError(error)
        setIsLoading(false)
        onError?.(error)
      }
    } finally {
      if (mountedRef.current && !signal.aborted) {
        setIsFetching(false)
      }
    }
  }, [fetchFn, getCachedData, retry, retryDelay, onSuccess, onError, dedupeKey])

  // Auto-fetch on mount
  useEffect(() => {
    if (enabled) {
      fetch()
    }

    return () => {
      mountedRef.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [enabled, fetch])

  // Manual data mutation (for optimistic updates)
  const mutate = useCallback(
    (newData: T) => {
      setData(newData)
      if (dedupeKey) {
        cache.set(dedupeKey, { data: newData, timestamp: Date.now() })
      }
    },
    [dedupeKey]
  )

  return {
    data,
    error,
    isLoading,
    isError: error !== null,
    isSuccess: data !== undefined && error === null,
    isFetching,
    refetch: fetch,
    mutate,
  }
}
