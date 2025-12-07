/**
 * Request helper utilities
 * Compatible with both Web Request API and Node.js IncomingMessage
 */

/**
 * Get header value from request
 * Works with both Web Request and Node.js IncomingMessage
 */
export function getHeader(req: Request, name: string): string | null {
  // Check if it's a Web Request with .get() method
  if (req.headers && typeof req.headers.get === 'function') {
    return req.headers.get(name)
  }
  // Fallback for Node.js IncomingMessage style headers
  const headers = req.headers as unknown as Record<string, string | string[] | undefined>
  const value = headers[name.toLowerCase()]
  if (Array.isArray(value)) {
    return value[0] || null
  }
  return value || null
}

/**
 * Get Authorization header from request
 */
export function getAuthHeader(req: Request): string | null {
  return getHeader(req, 'Authorization')
}

/**
 * Extract Bearer token from Authorization header
 */
export function getBearerToken(req: Request): string | null {
  const authHeader = getAuthHeader(req)
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  return authHeader.split(' ')[1] || null
}
