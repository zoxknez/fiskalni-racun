/**
 * Health Check API
 *
 * Lightweight endpoint to check database connectivity.
 * Can be used to "warm up" the database before sync operations.
 *
 * @module api/health
 */

import { sql } from './db.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 10,
  regions: ['fra1'], // align with Neon region to cut latency
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const start = Date.now()

    // Abort if the database call exceeds 3 seconds to avoid Vercel 10s timeout
    // and still return a response instead of hanging to 504
    const timeoutMs = 3000
    let dbStatus: 'connected' | 'timeout' | 'error' = 'connected'

    try {
      await Promise.race([
        sql`SELECT 1`,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('DB warm-up timeout')), timeoutMs)
        ),
      ])
    } catch (err) {
      const isTimeout = err instanceof Error && err.message === 'DB warm-up timeout'
      dbStatus = isTimeout ? 'timeout' : 'error'
    }

    const duration = Date.now() - start

    return new Response(
      JSON.stringify({
        status: dbStatus === 'connected' ? 'ok' : 'degraded',
        database: dbStatus,
        latency: `${duration}ms`,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Health check failed:', error)
    return new Response(
      JSON.stringify({
        status: 'error',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
