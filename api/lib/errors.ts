// Edge-compatible error handling for API

/**
 * Base application error class (Edge compatible)
 */
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message)
    this.name = 'AppError'
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, 400, details)
    this.name = 'ValidationError'
  }
}

/**
 * Authentication error (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401)
    this.name = 'UnauthorizedError'
  }
}

/**
 * Forbidden error (403)
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super('FORBIDDEN', message, 403)
    this.name = 'ForbiddenError'
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Not found') {
    super('NOT_FOUND', message, 404)
    this.name = 'NotFoundError'
  }
}

/**
 * Conflict error (409)
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Conflict') {
    super('CONFLICT', message, 409)
    this.name = 'ConflictError'
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super('RATE_LIMIT_EXCEEDED', message, 429, retryAfter ? { retryAfter } : undefined)
    this.name = 'RateLimitError'
  }
}

/**
 * Internal server error (500)
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super('INTERNAL_ERROR', message, 500)
    this.name = 'InternalServerError'
  }
}

/**
 * Handle errors and return appropriate HTTP response
 */
export function handleError(error: unknown): Response {
  // Log error for debugging
  console.error('[API Error]', error)

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

    if (error.details !== undefined) {
      responseBody.details = error.details
    }

    if (
      error.code === 'RATE_LIMIT_EXCEEDED' &&
      error.details &&
      typeof error.details === 'object' &&
      'retryAfter' in error.details
    ) {
      responseBody.retryAfter = error.details.retryAfter as number
    }

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

  // Handle generic errors
  const message = error instanceof Error ? error.message : 'Unknown error'
  return new Response(
    JSON.stringify({
      error: 'Internal Server Error',
      code: 'INTERNAL_ERROR',
      message,
    }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}

/**
 * Wrapper for error handling in async functions
 */
export function withErrorHandling(
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    try {
      return await handler(req)
    } catch (error) {
      return handleError(error)
    }
  }
}
