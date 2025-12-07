// Rate limiting middleware
// Uses in-memory rate limiting (Edge compatible)
// For distributed rate limiting, configure Upstash Redis

import { getHeader } from '../lib/request-helpers.js'

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries every 5 minutes
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

/**
 * Rate limit configurations for different endpoints
 */
export const rateLimitConfigs: Record<string, RateLimitConfig> = {
  'auth:login': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
  },
  'auth:register': {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 registrations per hour
  },
  'auth:password-reset': {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 requests per hour
  },
  'auth:change-password': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
  },
  default: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per 15 minutes
  },
}

/**
 * Get client identifier from request
 */
function getClientId(req: Request, identifier?: string): string {
  // Try to get from custom identifier (e.g., email)
  if (identifier) {
    return identifier
  }

  // Fallback to IP address
  const forwardedFor = getHeader(req, 'x-forwarded-for')
  const realIp = getHeader(req, 'x-real-ip')
  const ip = forwardedFor?.split(',')[0] || realIp || 'unknown'

  return ip
}

/**
 * Check rate limit for a request
 * Uses in-memory rate limiting (Edge compatible)
 */
export async function checkRateLimit(
  req: Request,
  endpoint: string,
  identifier?: string
): Promise<{ allowed: boolean; retryAfter?: number; limit?: number; remaining?: number }> {
  const clientId = getClientId(req, identifier)

  // In-memory rate limiting (Edge compatible)
  const config = rateLimitConfigs[endpoint] || rateLimitConfigs.default
  const key = `${endpoint}:${clientId}`
  const now = Date.now()

  const entry = rateLimitStore.get(key)

  if (!entry || entry.resetAt < now) {
    // Create new entry
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    })
    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
    }
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return {
      allowed: false,
      retryAfter,
      limit: config.maxRequests,
      remaining: 0,
    }
  }

  // Increment count
  entry.count++
  rateLimitStore.set(key, entry)

  return {
    allowed: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - entry.count,
  }
}

/**
 * Rate limit middleware wrapper
 */
export function withRateLimit(endpoint: string, handler: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    const result = await checkRateLimit(req, endpoint)

    if (!result.allowed) {
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
            'X-RateLimit-Limit': String(result.limit || 0),
            'X-RateLimit-Remaining': String(result.remaining || 0),
            'X-RateLimit-Reset': String(Date.now() + (result.retryAfter || 0) * 1000),
          },
        }
      )
    }

    // Just return the response directly - no header manipulation
    // This avoids issues with streaming/cloning response body
    return handler(req)
  }
}
