/**
 * Rate Limiting Implementation
 * Zaštita od brute-force napada
 */

interface RateLimitConfig {
  maxAttempts: number
  windowMs: number
  blockDurationMs: number
}

interface RateLimitRecord {
  count: number
  resetAt: number
  blockedUntil?: number
}

const limits = new Map<string, RateLimitRecord>()

/**
 * Check if an action is rate limited
 * @param key - Unique identifier (e.g., 'auth:user@example.com')
 * @param config - Rate limit configuration
 * @returns { allowed: boolean, retryAfter?: number }
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig = {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 60 * 60 * 1000, // 1 hour
  }
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const record = limits.get(key)

  // Check if currently blocked
  if (record?.blockedUntil && now < record.blockedUntil) {
    return {
      allowed: false,
      retryAfter: Math.ceil((record.blockedUntil - now) / 1000),
    }
  }

  // Reset if window expired or no record exists
  if (!record || now > record.resetAt) {
    limits.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    })
    return { allowed: true }
  }

  // Increment counter
  record.count++

  // Block if exceeded max attempts
  if (record.count > config.maxAttempts) {
    record.blockedUntil = now + config.blockDurationMs
    return {
      allowed: false,
      retryAfter: Math.ceil(config.blockDurationMs / 1000),
    }
  }

  return { allowed: true }
}

/**
 * Reset rate limit for a key
 */
export function resetRateLimit(key: string): void {
  limits.delete(key)
}

/**
 * Clear all rate limits (for testing)
 */
export function clearAllRateLimits(): void {
  limits.clear()
}

/**
 * Get current rate limit status
 */
export function getRateLimitStatus(key: string): RateLimitRecord | null {
  return limits.get(key) || null
}
