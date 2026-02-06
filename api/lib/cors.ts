/**
 * CORS helper for API routes
 *
 * Uses a comma-separated allowlist from CORS_ALLOWED_ORIGINS.
 * If not provided, falls back to same-origin checks.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

function getAllowedOrigins(): string[] {
  const raw = process.env['CORS_ALLOWED_ORIGINS']
  if (!raw) return []
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

function resolveOrigin(req: VercelRequest): string | null {
  const origin = req.headers.origin
  if (!origin) return null

  const allowlist = getAllowedOrigins()
  if (allowlist.length > 0) {
    return allowlist.includes(origin) ? origin : null
  }

  const host = req.headers.host
  if (!host) return null

  const httpOrigin = `http://${host}`
  const httpsOrigin = `https://${host}`
  if (origin === httpOrigin || origin === httpsOrigin) {
    return origin
  }

  return null
}

export function applyCors(
  req: VercelRequest,
  res: VercelResponse,
  options: { methods: string; headers?: string } = { methods: 'GET, POST, PUT, DELETE, OPTIONS' }
): { allowed: boolean } {
  const allowedOrigin = resolveOrigin(req)

  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
  }

  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', options.methods)
  res.setHeader('Access-Control-Allow-Headers', options.headers || 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    if (!allowedOrigin) {
      res.status(403).end()
      return { allowed: false }
    }
    res.status(204).end()
    return { allowed: false }
  }

  return { allowed: true }
}
