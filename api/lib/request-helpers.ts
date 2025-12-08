/**
 * Request helper utilities
 * Compatible with both Web Request API and Node.js IncomingMessage
 */

import type { IncomingMessage } from 'node:http'

// Type for requests that could be either Web Request or Node.js IncomingMessage
type AnyRequest = Request | IncomingMessage

/**
 * Get header value from request
 * Works with both Web Request and Node.js IncomingMessage
 */
export function getHeader(req: AnyRequest, name: string): string | null {
  // Check if it's a Web Request with .get() method
  if ('headers' in req && req.headers && typeof (req.headers as Headers).get === 'function') {
    return (req.headers as Headers).get(name)
  }
  // Fallback for Node.js IncomingMessage style headers
  const headers = req.headers as Record<string, string | string[] | undefined>
  const value = headers[name.toLowerCase()]
  if (Array.isArray(value)) {
    return value[0] || null
  }
  return value || null
}

/**
 * Parse JSON body from request
 * Works with both Web Request and Node.js IncomingMessage
 */
export async function parseJsonBody<T = unknown>(req: AnyRequest): Promise<T> {
  // Check if it's a Web Request with .json() method
  if (typeof (req as Request).json === 'function') {
    return (req as Request).json() as Promise<T>
  }

  // Node.js IncomingMessage - read body from stream
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const incomingReq = req as IncomingMessage

    incomingReq.on('data', (chunk: Buffer) => {
      chunks.push(chunk)
    })

    incomingReq.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString('utf-8')
        if (!body) {
          resolve({} as T)
          return
        }
        resolve(JSON.parse(body) as T)
      } catch {
        reject(new Error('Invalid JSON body'))
      }
    })

    incomingReq.on('error', (error) => {
      reject(error)
    })
  })
}

/**
 * Clone request for reading body multiple times
 * Works with both Web Request and Node.js IncomingMessage
 */
export function canCloneRequest(req: AnyRequest): boolean {
  return typeof (req as Request).clone === 'function'
}

/**
 * Get Authorization header from request
 */
export function getAuthHeader(req: AnyRequest): string | null {
  return getHeader(req, 'Authorization')
}

/**
 * Extract Bearer token from Authorization header
 */
export function getBearerToken(req: AnyRequest): string | null {
  const authHeader = getAuthHeader(req)
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  return authHeader.split(' ')[1] || null
}
