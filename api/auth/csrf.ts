/**
 * CSRF Token API Endpoint
 *
 * GET /api/auth/csrf - Get a new CSRF token
 *
 * This endpoint generates a new CSRF token and sets it as a cookie.
 * The client should call this before making any state-changing requests.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createCsrfCookie, generateCsrfToken } from '../middleware/csrf'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  const token = generateCsrfToken()
  const isProduction = process.env.NODE_ENV === 'production'

  res.setHeader('Set-Cookie', createCsrfCookie(token, isProduction))
  return res.status(200).json({ success: true, csrfToken: token })
}
