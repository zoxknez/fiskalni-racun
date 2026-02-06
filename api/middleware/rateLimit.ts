// Rate limiting middleware
// Supports distributed rate limiting via Upstash Redis with in-memory fallback

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { getHeader } from '../lib/request-helpers.js'

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  upstashWindow: string // Upstash format (e.g. '15 m')
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

// ──────────────────────────────────────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────────────────────────────────────

export const rateLimitConfigs: Record<string, RateLimitConfig> = {
  'auth:login': {
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    upstashWindow: '15 m',
  },
  'auth:register': {
    windowMs: 60 * 60 * 1000,
    maxRequests: 3,
    upstashWindow: '1 h',
  },
  'auth:password-reset': {
    windowMs: 60 * 60 * 1000,
    maxRequests: 3,
    upstashWindow: '1 h',
  },
  'auth:reset-password': {
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
    upstashWindow: '15 m',
  },
  'auth:change-password': {
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    upstashWindow: '15 m',
  },
  default: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100,
    upstashWindow: '15 m',
  },
}

// ──────────────────────────────────────────────────────────────────────────────
// In-memory Store (Fallback)
// ──────────────────────────────────────────────────────────────────────────────

const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      const now = Date.now()
      for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetAt < now) {
          rateLimitStore.delete(key)
        }
      }
    },
    5 * 60 * 1000
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Upstash Redis Initialization
// ──────────────────────────────────────────────────────────────────────────────

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

const redis =
  UPSTASH_URL && UPSTASH_TOKEN ? new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN }) : null

const limiters = new Map<string, Ratelimit>()

function getRedisLimiter(endpoint: string): Ratelimit | null {
  if (!redis) return null

  if (!limiters.has(endpoint)) {
    const config = rateLimitConfigs[endpoint] || rateLimitConfigs.default
    limiters.set(
      endpoint,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(
          config.maxRequests,
          config.upstashWindow as Parameters<typeof Ratelimit.slidingWindow>[1]
        ),
        analytics: true,
        prefix: `@upstash/ratelimit/${endpoint}`,
      })
    )
  }

  return limiters.get(endpoint) as Ratelimit
}

// ──────────────────────────────────────────────────────────────────────────────
// Core Logic
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Get client identifier from request
 */
function getClientId(req: Request, identifier?: string): string {
  if (identifier) return identifier

  const forwardedFor = getHeader(req, 'x-forwarded-for')
  const realIp = getHeader(req, 'x-real-ip')
  return forwardedFor?.split(',')[0] || realIp || 'unknown'
}

/**
 * Check rate limit for a request
 */
export async function checkRateLimit(
  req: Request,
  endpoint: string,
  identifier?: string
): Promise<{
  allowed: boolean
  retryAfter?: number
  limit: number
  remaining: number
  reset: number
}> {
  const clientId = getClientId(req, identifier)
  const config = rateLimitConfigs[endpoint] || rateLimitConfigs.default
  const key = `${endpoint}:${clientId}`

  // Try Redis first
  const redisLimiter = getRedisLimiter(endpoint)
  if (redisLimiter) {
    try {
      const result = await redisLimiter.limit(key)
      return {
        allowed: result.success,
        retryAfter: result.success ? undefined : Math.ceil((result.reset - Date.now()) / 1000),
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      }
    } catch (error) {
      console.error('[RateLimit] Redis error, falling back to in-memory:', error)
    }
  }

  // Fallback: In-memory rate limiting
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || entry.resetAt < now) {
    const newEntry = {
      count: 1,
      resetAt: now + config.windowMs,
    }
    rateLimitStore.set(key, newEntry)
    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      reset: newEntry.resetAt,
    }
  }

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      limit: config.maxRequests,
      remaining: 0,
      reset: entry.resetAt,
    }
  }

  entry.count++
  rateLimitStore.set(key, entry)

  return {
    allowed: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - entry.count,
    reset: entry.resetAt,
  }
}

/**
 * Create a standardized rate limit error response
 */
export function createRateLimitResponse(result: {
  retryAfter?: number
  limit: number
  remaining: number
  reset: number
}): Response {
  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(result.retryAfter || 0),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.reset),
      },
    }
  )
}

/**
 * Rate limit middleware wrapper
 */
export function withRateLimit(endpoint: string, handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    const result = await checkRateLimit(req, endpoint)

    if (!result.allowed) {
      return createRateLimitResponse(result)
    }

    return handler(req)
  }
}

export function isRedisConfigured(): boolean {
  return !!redis
}
