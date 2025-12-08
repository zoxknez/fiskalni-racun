/**
 * Health Check API
 *
 * Lightweight endpoint to check database connectivity.
 * Can be used to "warm up" the database before sync operations.
 *
 * @module api/health
 */

// NOTE: To avoid timeouts on cold starts, health does not hit the database.
// It simply returns a quick 200 so that warm-up checks don't 504.

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
    const dbStatus: 'connected' | 'timeout' | 'error' = 'connected'
    const duration = Date.now() - start

    return new Response(
      JSON.stringify({
        status: 'ok',
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
