/**
 * CSRF Token API Endpoint
 *
 * GET /api/auth/csrf - Get a new CSRF token
 *
 * This endpoint generates a new CSRF token and sets it as a cookie.
 * The client should call this before making any state-changing requests.
 */

import { createCsrfTokenResponse } from '../middleware/csrf'

export const config = {
  runtime: 'nodejs',
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return createCsrfTokenResponse()
}
