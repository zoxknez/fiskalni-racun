/**
 * Client-Side Rate Limiter
 *
 * Prevents abuse and protects against excessive API calls
 *
 * @module lib/utils/rateLimiter
 */

import { logger } from '../logger'

export interface RateLimiterOptions {
  maxRequests: number
  windowMs: number
  keyPrefix?: string
}

export class RateLimiter {
  private requests: Map<string, number[]> = new Map()

  constructor(private options: RateLimiterOptions) {}

  /**
   * Check if request is allowed
   *
   * @param key - Unique key for rate limiting (e.g., endpoint, userId)
   * @returns Whether request is allowed
   */
  async check(key: string): Promise<boolean> {
    const fullKey = this.options.keyPrefix ? `${this.options.keyPrefix}:${key}` : key
    const now = Date.now()
    const windowStart = now - this.options.windowMs

    // Get existing requests
    let timestamps = this.requests.get(fullKey) || []

    // Remove old timestamps
    timestamps = timestamps.filter((t) => t > windowStart)

    // Check if limit exceeded
    if (timestamps.length >= this.options.maxRequests) {
      logger.warn(`Rate limit exceeded for ${fullKey}`, {
        current: timestamps.length,
        max: this.options.maxRequests,
      })
      return false
    }

    // Add current timestamp
    timestamps.push(now)
    this.requests.set(fullKey, timestamps)

    return true
  }

  /**
   * Wait until request is allowed (with timeout)
   */
  async waitForSlot(key: string, timeoutMs = 60000): Promise<void> {
    const startTime = Date.now()

    while (!(await this.check(key))) {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error('Rate limiter timeout')
      }

      // Wait a bit before checking again
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  /**
   * Reset rate limiter for specific key
   */
  reset(key?: string) {
    if (key) {
      const fullKey = this.options.keyPrefix ? `${this.options.keyPrefix}:${key}` : key
      this.requests.delete(fullKey)
    } else {
      this.requests.clear()
    }
  }

  /**
   * Get remaining requests
   */
  getRemaining(key: string): number {
    const fullKey = this.options.keyPrefix ? `${this.options.keyPrefix}:${key}` : key
    const timestamps = this.requests.get(fullKey) || []
    const now = Date.now()
    const windowStart = now - this.options.windowMs

    const validTimestamps = timestamps.filter((t) => t > windowStart)
    return Math.max(0, this.options.maxRequests - validTimestamps.length)
  }

  /**
   * Get time until next slot available
   */
  getRetryAfter(key: string): number {
    const fullKey = this.options.keyPrefix ? `${this.options.keyPrefix}:${key}` : key
    const timestamps = this.requests.get(fullKey) || []

    if (timestamps.length < this.options.maxRequests) {
      return 0
    }

    const now = Date.now()
    const oldestTimestamp = timestamps[0]
    if (oldestTimestamp === undefined) {
      return 0
    }

    const retryAfter = oldestTimestamp + this.options.windowMs - now

    return Math.max(0, retryAfter)
  }
}

/**
 * Predefined rate limiters
 */

// OCR - Expensive operation, limit to 10 per minute
export const ocrRateLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000,
  keyPrefix: 'ocr',
})

// API calls - 100 per minute
export const apiRateLimiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60 * 1000,
  keyPrefix: 'api',
})

// Auth - 5 attempts per 5 minutes
export const authRateLimiter = new RateLimiter({
  maxRequests: 5,
  windowMs: 5 * 60 * 1000,
  keyPrefix: 'auth',
})

// QR Scanner - 30 per minute
export const qrRateLimiter = new RateLimiter({
  maxRequests: 30,
  windowMs: 60 * 1000,
  keyPrefix: 'qr',
})

/**
 * Rate limit decorator for async functions
 */
export function rateLimit<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  limiter: RateLimiter,
  key: string
): T {
  return (async (...args: any[]) => {
    const isAllowed = await limiter.check(key)

    if (!isAllowed) {
      const retryAfter = limiter.getRetryAfter(key)
      throw new Error(`Rate limit exceeded. Retry after ${Math.ceil(retryAfter / 1000)}s`)
    }

    return fn(...args)
  }) as T
}
