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

  let lastError: Error | null = null

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

  if (lastError) {
    throw lastError
  }

  throw new Error('Retry failed without capturing an error')
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
export function debounce<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  waitMs: number
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  return function debounced(...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> {
    return new Promise<Awaited<ReturnType<T>>>((resolve, reject) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      timeoutId = setTimeout(async () => {
        try {
          const result = await fn(...args)
          resolve(result as Awaited<ReturnType<T>>)
        } catch (error) {
          reject(error)
        }
      }, waitMs)
    })
  }
}

/**
 * Throttle promise
 * Limits how often a promise can be called
 */
export function throttle<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  limitMs: number
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> | undefined {
  let lastRun = 0
  let pending: Promise<Awaited<ReturnType<T>>> | undefined

  return function throttled(...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> | undefined {
    const now = Date.now()

    if (now - lastRun >= limitMs) {
      lastRun = now
      pending = fn(...args) as Promise<Awaited<ReturnType<T>>>
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
      const index = executing.indexOf(promise)
      if (index >= 0) {
        executing.splice(index, 1)
      }
    }
  }

  await Promise.all(executing)
  return results
}

/**
 * Modernabortable async function
 * Wraps async function with AbortController support
 */
export function makeAbortable<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  onAbort?: () => void
): [(...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>, () => void] {
  let abortController: AbortController | null = null

  const abortableFn = async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
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

      return result as Awaited<ReturnType<T>>
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
type SettledResult<T> = PromiseSettledResult<Awaited<T>>

function isFulfilled<T>(result: SettledResult<T>): result is PromiseFulfilledResult<Awaited<T>> {
  return result.status === 'fulfilled'
}

function isRejected<T>(result: SettledResult<T>): result is PromiseRejectedResult {
  return result.status === 'rejected'
}

export async function allSettled<T>(promises: Iterable<T>): Promise<{
  fulfilled: PromiseFulfilledResult<Awaited<T>>[]
  rejected: PromiseRejectedResult[]
}> {
  const results = await Promise.allSettled(
    promises as Iterable<PromiseLike<Awaited<T>> | Awaited<T>>
  )

  return {
    fulfilled: results.filter(isFulfilled),
    rejected: results.filter(isRejected),
  }
}

/**
 * Run async functions in batches
 */
export function batch<T, U>(
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
export function memoizeAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  keyFn: (...args: Parameters<T>) => string = (...args) => JSON.stringify(args)
): T {
  const cache = new Map<string, Promise<Awaited<ReturnType<T>>>>()

  const memoized = (...args: Parameters<T>): ReturnType<T> => {
    const key = keyFn(...args)

    const existing = cache.get(key)
    if (existing) {
      return existing as ReturnType<T>
    }

    const promise = fn(...args) as Promise<Awaited<ReturnType<T>>>
    cache.set(key, promise)

    // Remove from cache on error
    promise.catch(() => cache.delete(key))

    return promise as ReturnType<T>
  }

  return memoized as unknown as T
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
