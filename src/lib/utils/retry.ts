/**
 * Retry Utilities with Exponential Backoff
 *
 * @module lib/utils/retry
 */

import { logger } from '../logger'

export interface RetryOptions {
  maxAttempts?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  shouldRetry?: (error: unknown) => boolean
  onRetry?: (attempt: number, error: unknown) => void
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'shouldRetry' | 'onRetry'>> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
}

/**
 * Retry async function with exponential backoff
 *
 * @example
 * ```ts
 * const data = await retry(
 *   () => fetch('/api/data'),
 *   {
 *     maxAttempts: 5,
 *     initialDelay: 1000,
 *     shouldRetry: (error) => error.status >= 500
 *   }
 * )
 * ```
 */
export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: unknown

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Check if should retry
      if (options.shouldRetry && !options.shouldRetry(error)) {
        throw error
      }

      // Don't delay on last attempt
      if (attempt === opts.maxAttempts - 1) {
        throw error
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(opts.initialDelay * opts.backoffMultiplier ** attempt, opts.maxDelay)

      logger.warn(`Retry attempt ${attempt + 1}/${opts.maxAttempts} after ${delay}ms`, { error })

      options.onRetry?.(attempt + 1, error)

      // Wait before next attempt
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Retry with jitter (randomized delay)
 * Prevents thundering herd problem
 */
export async function retryWithJitter<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: unknown

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (options.shouldRetry && !options.shouldRetry(error)) {
        throw error
      }

      if (attempt === opts.maxAttempts - 1) {
        throw error
      }

      // Calculate delay with jitter
      const baseDelay = opts.initialDelay * opts.backoffMultiplier ** attempt
      const jitter = Math.random() * baseDelay * 0.3 // ±30% jitter
      const delay = Math.min(baseDelay + jitter, opts.maxDelay)

      logger.warn(
        `Retry with jitter: attempt ${attempt + 1}/${opts.maxAttempts} after ${Math.round(delay)}ms`
      )

      options.onRetry?.(attempt + 1, error)

      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Retry only network errors
 */
export async function retryNetworkErrors<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  return retry(fn, {
    maxAttempts,
    shouldRetry: (error) => {
      if (error instanceof Error) {
        const networkErrors = [
          'Failed to fetch',
          'Network request failed',
          'NetworkError',
          'ECONNREFUSED',
          'ETIMEDOUT',
        ]

        return networkErrors.some((msg) => error.message.includes(msg))
      }
      return false
    },
  })
}

/**
 * Retry HTTP errors (500+)
 */
export async function retryServerErrors<_T>(
  fn: () => Promise<Response>,
  maxAttempts = 3
): Promise<Response> {
  return retry(fn, {
    maxAttempts,
    shouldRetry: (error) => {
      if (error instanceof Response) {
        return error.status >= 500
      }
      return true
    },
  })
}

/**
 * Circuit breaker pattern
 * Prevents cascading failures
 */
export class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'

  constructor(
    private threshold = 5,
    private timeout = 60000 // 1 minute
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // If circuit is open, check if timeout passed
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open'
        logger.info('Circuit breaker: half-open (testing)')
      } else {
        throw new Error('Circuit breaker is OPEN - too many failures')
      }
    }

    try {
      const result = await fn()

      // Success - reset circuit
      if (this.state === 'half-open') {
        this.state = 'closed'
        this.failures = 0
        logger.info('Circuit breaker: closed (recovered)')
      }

      return result
    } catch (error) {
      this.failures++
      this.lastFailureTime = Date.now()

      // Open circuit if threshold exceeded
      if (this.failures >= this.threshold) {
        this.state = 'open'
        logger.error(`Circuit breaker: OPEN after ${this.failures} failures`)
      }

      throw error
    }
  }

  reset() {
    this.state = 'closed'
    this.failures = 0
    logger.info('Circuit breaker: manually reset')
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailure: this.lastFailureTime ? new Date(this.lastFailureTime) : null,
    }
  }
}
