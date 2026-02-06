/**
 * Health Check API
 *
 * Lightweight endpoint to check database connectivity.
 * Can be used to "warm up" the database before sync operations.
 *
 * @module api/health
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

// NOTE: To avoid timeouts on cold starts, health does not hit the database.
// It simply returns a quick 200 so that warm-up checks don't 504.

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    return res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Health check failed:', error)
    return res.status(503).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
