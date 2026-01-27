/**
 * CSRF Protection Middleware
 *
 * Implements Double Submit Cookie pattern for CSRF protection.
 * This works well with single-page applications (SPAs) and API-based auth.
 *
 * How it works:
 * 1. Server generates a CSRF token and sends it as a cookie (csrf-token)
 * 2. Client reads the cookie and sends the token in the X-CSRF-Token header
 * 3. Server validates that the header matches the cookie
 *
 * @module api/middleware/csrf
 */

import { webcrypto } from 'node:crypto'

const crypto = webcrypto as unknown as Crypto

const CSRF_COOKIE_NAME = 'csrf-token'
const CSRF_HEADER_NAME = 'x-csrf-token'
const CSRF_TOKEN_LENGTH = 32

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  const bytes = new Uint8Array(CSRF_TOKEN_LENGTH)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Extract CSRF token from cookie header
 */
function getCsrfTokenFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null

  const cookies = cookieHeader.split(';').map((c) => c.trim())
  for (const cookie of cookies) {
    const [name, value] = cookie.split('=')
    if (name === CSRF_COOKIE_NAME && value) {
      return value
    }
  }
  return null
}

/**
 * Validate CSRF token
 *
 * Compares the token from the cookie with the token from the header.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function validateCsrfToken(req: Request): { valid: boolean; error?: string } {
  const cookieHeader = req.headers.get('cookie')
  const headerToken = req.headers.get(CSRF_HEADER_NAME)

  const cookieToken = getCsrfTokenFromCookie(cookieHeader)

  if (!cookieToken) {
    return { valid: false, error: 'CSRF cookie not found' }
  }

  if (!headerToken) {
    return { valid: false, error: 'CSRF header not found' }
  }

  // Timing-safe comparison
  if (cookieToken.length !== headerToken.length) {
    return { valid: false, error: 'CSRF token mismatch' }
  }

  let result = 0
  for (let i = 0; i < cookieToken.length; i++) {
    result |= cookieToken.charCodeAt(i) ^ headerToken.charCodeAt(i)
  }

  if (result !== 0) {
    return { valid: false, error: 'CSRF token mismatch' }
  }

  return { valid: true }
}

/**
 * Create Set-Cookie header for CSRF token
 *
 * Cookie settings:
 * - HttpOnly: false (JavaScript needs to read it)
 * - Secure: true in production
 * - SameSite: Strict (prevents CSRF from third-party sites)
 * - Path: / (available on all routes)
 * - Max-Age: 1 hour
 */
export function createCsrfCookie(token: string, isProduction: boolean = true): string {
  const secure = isProduction ? '; Secure' : ''
  const maxAge = 60 * 60 // 1 hour

  return `${CSRF_COOKIE_NAME}=${token}; Path=/; SameSite=Strict; Max-Age=${maxAge}${secure}`
}

/**
 * CSRF protection middleware wrapper
 *
 * Use this to wrap handlers that require CSRF protection.
 * Only validates on state-changing methods (POST, PUT, PATCH, DELETE).
 *
 * @example
 * ```ts
 * export default withCsrfProtection(async function handler(req: Request) {
 *   // Your handler code
 * })
 * ```
 */
export function withCsrfProtection(
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const method = req.method.toUpperCase()

    // Only validate on state-changing methods
    const requiresValidation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

    if (requiresValidation) {
      const { valid, error } = validateCsrfToken(req)
      if (!valid) {
        return new Response(
          JSON.stringify({ success: false, error: `CSRF validation failed: ${error}` }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
    }

    return handler(req)
  }
}

/**
 * Generate a new CSRF token response
 *
 * Call this endpoint to get a new CSRF token.
 * The token is set as a cookie and also returned in the response body.
 */
export function createCsrfTokenResponse(): Response {
  const token = generateCsrfToken()
  const isProduction = process.env.NODE_ENV === 'production'

  return new Response(JSON.stringify({ success: true, csrfToken: token }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': createCsrfCookie(token, isProduction),
    },
  })
}

/**
 * Endpoints that should be exempt from CSRF validation
 * (e.g., public APIs, webhooks)
 */
export const CSRF_EXEMPT_ENDPOINTS = [
  '/api/health',
  '/api/auth/login', // Initial login doesn't have CSRF token yet
  '/api/auth/register', // Registration doesn't have CSRF token yet
  '/api/webhook', // Webhooks have their own signature verification
]

/**
 * Check if an endpoint is exempt from CSRF protection
 */
export function isCsrfExempt(pathname: string): boolean {
  return CSRF_EXEMPT_ENDPOINTS.some(
    (exempt) => pathname === exempt || pathname.startsWith(`${exempt}/`)
  )
}
