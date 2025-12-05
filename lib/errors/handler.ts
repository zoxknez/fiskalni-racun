// Error handler for API responses

import { logger } from '@/lib/logger'
import { AppError, InternalServerError } from './index'

/**
 * Handle errors and return appropriate HTTP response
 */
export function handleError(error: unknown): Response {
  // Log error for debugging
  if (error instanceof AppError) {
    logger.warn('App error:', {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
    })
  } else {
    logger.error('Unexpected error:', error)
  }

  // Handle known AppError instances
  if (error instanceof AppError) {
    const responseBody: {
      error: string
      code: string
      details?: unknown
      retryAfter?: number
    } = {
      error: error.message,
      code: error.code,
    }

    // Add details if available
    if (error.details !== undefined) {
      responseBody.details = error.details
    }

    // Add retryAfter for rate limit errors
    if (
      error.code === 'RATE_LIMIT_EXCEEDED' &&
      error.details &&
      typeof error.details === 'object' &&
      'retryAfter' in error.details
    ) {
      responseBody.retryAfter = error.details.retryAfter as number
    }

    // Set appropriate headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (error.code === 'RATE_LIMIT_EXCEEDED' && responseBody.retryAfter) {
      headers['Retry-After'] = String(responseBody.retryAfter)
    }

    return new Response(JSON.stringify(responseBody), {
      status: error.statusCode,
      headers,
    })
  }

  // Handle unexpected errors
  const internalError = new InternalServerError()
  return new Response(
    JSON.stringify({
      error: internalError.message,
      code: internalError.code,
    }),
    {
      status: internalError.statusCode,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}

/**
 * Wrap async handler with error handling
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<Response>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args)
    } catch (error) {
      return handleError(error)
    }
  }) as T
}
