/**
 * CSRF helper for Vercel API routes (VercelRequest/VercelResponse)
 *
 * Applies CSRF validation only for cookie-based auth. If an Authorization
 * Bearer token is present, CSRF is skipped.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { isCsrfExempt, validateCsrfToken } from './csrf.js'

export function applyCsrfProtection(req: VercelRequest, res: VercelResponse): { allowed: boolean } {
  const method = req.method?.toUpperCase() || ''
  const requiresValidation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

  if (!requiresValidation) {
    return { allowed: true }
  }

  const url = req.url || ''
  const path = url.split('?')[0] || ''
  if (path && isCsrfExempt(path)) {
    return { allowed: true }
  }

  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    return { allowed: true }
  }

  const headers = new Headers()
  if (req.headers.cookie) {
    headers.set('cookie', req.headers.cookie as string)
  }
  if (req.headers['x-csrf-token']) {
    headers.set('x-csrf-token', req.headers['x-csrf-token'] as string)
  }

  const mockReq = { headers } as unknown as Request
  const { valid, error } = validateCsrfToken(mockReq)

  if (!valid) {
    res.status(403).json({ success: false, error: `CSRF validation failed: ${error}` })
    return { allowed: false }
  }

  return { allowed: true }
}
