// Rate limiting with Upstash Redis
// For production use - distributed rate limiting across multiple instances

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

// Rate limit configurations for different endpoints
const rateLimiters: Record<string, Ratelimit> = {
  'auth:login': new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    analytics: true,
    prefix: '@upstash/ratelimit/auth:login',
  }),
  'auth:register': new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1 h'),
    analytics: true,
    prefix: '@upstash/ratelimit/auth:register',
  }),
  'auth:password-reset': new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1 h'),
    analytics: true,
    prefix: '@upstash/ratelimit/auth:password-reset',
  }),
  'auth:change-password': new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    analytics: true,
    prefix: '@upstash/ratelimit/auth:change-password',
  }),
  default: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '15 m'),
    analytics: true,
    prefix: '@upstash/ratelimit/default',
  }),
}

/**
 * Check rate limit using Upstash Redis
 *
 * @param identifier - Client identifier (email, IP, etc.)
 * @param endpoint - Endpoint identifier (e.g., 'auth:login')
 * @returns Rate limit result
 */
export async function checkRateLimitRedis(
  identifier: string,
  endpoint: string
): Promise<{
  allowed: boolean
  retryAfter?: number
  limit: number
  remaining: number
  reset: number
}> {
  const limiter = rateLimiters[endpoint] || rateLimiters.default
  const key = `${endpoint}:${identifier}`

  const result = await limiter.limit(key)

  return {
    allowed: result.success,
    retryAfter: result.success ? undefined : Math.ceil((result.reset - Date.now()) / 1000),
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  }
}

/**
 * Check if Redis is configured
 */
export function isRedisConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}
