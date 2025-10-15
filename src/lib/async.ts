/**
 * Modern Async Utilities
 *
 * Advanced Promise patterns and utilities for better async code
 */

import { logger } from './logger'

/**
 * Promise with timeout
 * Rejects if promise doesn't resolve within timeout
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError?: Error
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(timeoutError || new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ])
}

/**
 * Retry promise with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number
    delayMs?: number
    backoffMultiplier?: number
    onRetry?: (attempt: number, error: Error) => void
  } = {}
): Promise<T> {
  const { maxAttempts = 3, delayMs = 1000, backoffMultiplier = 2, onRetry } = options

  let lastError: Error

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < maxAttempts) {
        const delay = delayMs * backoffMultiplier ** (attempt - 1)
        onRetry?.(attempt, lastError)
        logger.warn(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`, lastError)
        await sleep(delay)
      }
    }
  }

  throw lastError!
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Debounce promise
 * Returns a function that delays promise execution until after wait time
 */
export function debounce<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  waitMs: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  return function debounced(...args: Parameters<T>): Promise<ReturnType<T>> {
    return new Promise((resolve) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      timeoutId = setTimeout(async () => {
        const result = await fn(...args)
        resolve(result)
      }, waitMs)
    })
  }
}

/**
 * Throttle promise
 * Limits how often a promise can be called
 */
export function throttle<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  limitMs: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> | undefined {
  let lastRun = 0
  let pending: Promise<ReturnType<T>> | undefined

  return function throttled(...args: Parameters<T>): Promise<ReturnType<T>> | undefined {
    const now = Date.now()

    if (now - lastRun >= limitMs) {
      lastRun = now
      pending = fn(...args)
      return pending
    }

    return pending
  }
}

/**
 * Queue async operations
 * Ensures operations run sequentially
 */
export function createQueue() {
  let queue: Promise<void> = Promise.resolve()

  return {
    add<T>(fn: () => Promise<T>): Promise<T> {
      const result = queue.then(fn)
      queue = result.then(() => {}).catch(() => {}) // Continue queue even on error
      return result
    },
  }
}

/**
 * Parallel execution with concurrency limit
 */
export async function mapWithConcurrency<T, U>(
  items: T[],
  fn: (item: T, index: number) => Promise<U>,
  concurrency: number = 3
): Promise<U[]> {
  const results: U[] = []
  const executing: Promise<void>[] = []

  for (const [index, item] of items.entries()) {
    const promise = fn(item, index).then((result) => {
      results[index] = result
    })

    executing.push(promise)

    if (executing.length >= concurrency) {
      await Promise.race(executing)
      executing.splice(
        executing.findIndex((p) => p === promise),
        1
      )
    }
  }

  await Promise.all(executing)
  return results
}

/**
 * Modernabortable async function
 * Wraps async function with AbortController support
 */
export function makeAbortable<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  onAbort?: () => void
): [(...args: Parameters<T>) => Promise<ReturnType<T>>, () => void] {
  let abortController: AbortController | null = null

  const abortableFn = async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    // Abort previous call
    if (abortController) {
      abortController.abort()
    }

    abortController = new AbortController()
    const signal = abortController.signal

    try {
      // Check if already aborted
      if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError')
      }

      const result = await fn(...args)

      // Check if aborted during execution
      if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError')
      }

      return result
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        onAbort?.()
      }
      throw error
    }
  }

  const abort = () => {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
  }

  return [abortableFn, abort]
}

/**
 * Promise.allSettled with better typing
 */
export async function allSettled<T extends readonly unknown[] | []>(
  promises: T
): Promise<{
  fulfilled: Array<{ status: 'fulfilled'; value: any }>
  rejected: Array<{ status: 'rejected'; reason: any }>
}> {
  const results = await Promise.allSettled(promises)

  return {
    fulfilled: results.filter((r) => r.status === 'fulfilled') as any,
    rejected: results.filter((r) => r.status === 'rejected') as any,
  }
}

/**
 * Run async functions in batches
 */
export async function batch<T, U>(
  items: T[],
  fn: (batch: T[]) => Promise<U>,
  batchSize: number = 10
): Promise<U[]> {
  const batches: T[][] = []

  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize))
  }

  return Promise.all(batches.map(fn))
}

/**
 * Memoize async function results
 */
export function memoizeAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyFn: (...args: Parameters<T>) => string = (...args) => JSON.stringify(args)
): T {
  const cache = new Map<string, Promise<ReturnType<T>>>()

  return ((...args: Parameters<T>) => {
    const key = keyFn(...args)

    if (cache.has(key)) {
      return cache.get(key)!
    }

    const promise = fn(...args)
    cache.set(key, promise)

    // Remove from cache on error
    promise.catch(() => cache.delete(key))

    return promise
  }) as T
}

// Example usage:
/*
// Timeout
const result = await withTimeout(
  fetchData(),
  5000,
  new Error('Request timeout')
)

// Retry with backoff
const data = await retry(() => fetchData(), {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  onRetry: (attempt, error) => console.log(`Retry ${attempt}:`, error)
})

// Abortable
const [fetchWithAbort, abort] = makeAbortable(fetchData)
fetchWithAbort().catch(err => {
  if (err.name === 'AbortError') {
    console.log('Aborted')
  }
})
setTimeout(abort, 5000) // Abort after 5s

// Batch processing
const results = await batch(
  largeArray,
  async (batch) => processBatch(batch),
  100 // 100 items per batch
)
*/
