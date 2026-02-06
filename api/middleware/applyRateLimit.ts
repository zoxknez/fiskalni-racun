/**
 * Rate limit helper for Vercel API routes (VercelRequest/VercelResponse)
 *
 * Bridges the existing checkRateLimit (which expects Request) to work with
 * Vercel's VercelRequest/VercelResponse pattern used by auth routes.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { checkRateLimit } from './rateLimit.js'

/**
 * Apply rate limiting to a Vercel handler.
 * Returns true if request is allowed, false if rate-limited (response already sent).
 */
export async function applyRateLimit(
  req: VercelRequest,
  res: VercelResponse,
  endpoint: string
): Promise<boolean> {
  // Build a minimal Request-like object for checkRateLimit
  const headers = new Headers()
  if (req.headers['x-forwarded-for']) {
    headers.set('x-forwarded-for', req.headers['x-forwarded-for'] as string)
  }
  if (req.headers['x-real-ip']) {
    headers.set('x-real-ip', req.headers['x-real-ip'] as string)
  }

  const mockReq = { headers } as unknown as Request

  const result = await checkRateLimit(mockReq, endpoint)

  if (!result.allowed) {
    res.setHeader('Retry-After', String(result.retryAfter || 0))
    res.setHeader('X-RateLimit-Limit', String(result.limit))
    res.setHeader('X-RateLimit-Remaining', String(result.remaining))
    res.setHeader('X-RateLimit-Reset', String(result.reset))
    res.status(429).json({
      error: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: result.retryAfter,
    })
    return false
  }

  return true
}
