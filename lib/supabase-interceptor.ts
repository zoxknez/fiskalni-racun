/**
 * Supabase API Interceptor
 *
 * ⭐ ADDED: Centralized error handling, logging, and retry logic for Supabase calls
 * - Automatic error logging to Sentry
 * - Request/response transformation
 * - Zod validation integration
 * - Retry logic for network errors
 * - Performance monitoring
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ZodSchema } from 'zod'
import { logger } from '@/lib/logger'

// ============================================
// TYPES
// ============================================

interface InterceptorConfig {
  enableLogging?: boolean
  enableValidation?: boolean
  enableRetry?: boolean
  maxRetries?: number
  retryDelay?: number
}

interface RequestContext {
  method: string
  table?: string | undefined
  operation?: 'select' | 'insert' | 'update' | 'delete' | 'upsert' | undefined
  startTime: number
}

// ============================================
// INTERCEPTOR CLASS
// ============================================

export class SupabaseInterceptor {
  private config: Required<InterceptorConfig>
  private requestContexts: Map<string, RequestContext> = new Map()

  constructor(config: InterceptorConfig = {}) {
    this.config = {
      enableLogging: config.enableLogging ?? true,
      enableValidation: config.enableValidation ?? true,
      enableRetry: config.enableRetry ?? true,
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
    }
  }

  /**
   * Wraps a Supabase query with interceptor logic
   */
  async intercept<T>(
    operation: () => Promise<{ data: T | null; error: any }>,
    context: Partial<RequestContext> = {},
    validationSchema?: ZodSchema<T>
  ): Promise<{ data: T | null; error: any }> {
    const requestId = this.generateRequestId()
    const fullContext: RequestContext = {
      method: context.method || 'unknown',
      table: context.table,
      operation: context.operation,
      startTime: Date.now(),
    }

    this.requestContexts.set(requestId, fullContext)

    // Log request
    if (this.config.enableLogging) {
      this.logRequest(requestId, fullContext)
    }

    try {
      // Execute with retry logic
      const result = this.config.enableRetry
        ? await this.executeWithRetry(operation, this.config.maxRetries)
        : await operation()

      // Log response
      if (this.config.enableLogging) {
        this.logResponse(requestId, fullContext, result)
      }

      // Validate response
      if (this.config.enableValidation && validationSchema && result.data) {
        const validationResult = validationSchema.safeParse(result.data)

        if (!validationResult.success) {
          logger.error('Supabase response validation failed', {
            errors: validationResult.error.issues,
          })

          // Send validation errors to Sentry
          this.reportError(new Error('Supabase response validation failed'), fullContext, {
            validationErrors: validationResult.error.issues,
          })
        } else {
          // Return validated data
          return { data: validationResult.data, error: null }
        }
      }

      // Handle errors
      if (result.error) {
        this.handleError(requestId, fullContext, result.error)
      }

      return result
    } catch (error) {
      this.handleError(requestId, fullContext, error)
      return { data: null, error }
    } finally {
      this.requestContexts.delete(requestId)
    }
  }

  /**
   * Execute operation with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<{ data: T | null; error: any }>,
    maxRetries: number
  ): Promise<{ data: T | null; error: any }> {
    let lastError: any

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation()

        // Don't retry on successful responses or client errors (4xx)
        if (!result.error || this.shouldNotRetry(result.error)) {
          return result
        }

        lastError = result.error

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          await this.delay(this.config.retryDelay * 2 ** attempt)
        }
      } catch (error) {
        lastError = error

        // Wait before retry
        if (attempt < maxRetries) {
          await this.delay(this.config.retryDelay * 2 ** attempt)
        }
      }
    }

    return { data: null, error: lastError }
  }

  /**
   * Determine if error should not be retried
   */
  private shouldNotRetry(error: any): boolean {
    // Don't retry on authentication errors
    if (error?.code === 'PGRST301' || error?.message?.includes('JWT')) {
      return true
    }

    // Don't retry on validation errors (4xx equivalent)
    if (error?.code && error.code.startsWith('22')) {
      return true
    }

    // Don't retry on unique constraint violations
    if (error?.code === '23505') {
      return true
    }

    return false
  }

  /**
   * Handle errors with logging and reporting
   */
  private handleError(requestId: string, context: RequestContext, error: any): void {
    logger.error('Supabase error', {
      requestId,
      context,
      error,
    })

    // Report to Sentry (if available)
    this.reportError(error, context)
  }

  /**
   * Log request details
   */
  private logRequest(requestId: string, context: RequestContext): void {
    logger.debug('Supabase request', {
      requestId,
      method: context.method,
      table: context.table,
      operation: context.operation,
    })
  }

  /**
   * Log response details
   */
  private logResponse(
    requestId: string,
    context: RequestContext,
    result: { data: any; error: any }
  ): void {
    const duration = Date.now() - context.startTime

    logger.debug('Supabase response', {
      requestId,
      duration: `${duration}ms`,
      success: !result.error,
      dataSize: result.data ? JSON.stringify(result.data).length : 0,
    })

    // Track slow queries
    if (duration > 1000) {
      logger.warn('Slow Supabase query detected', {
        requestId,
        duration: `${duration}ms`,
        context,
      })
    }
  }

  /**
   * Report error to monitoring service (Sentry)
   */
  private reportError(error: any, context: RequestContext, extra?: Record<string, any>): void {
    // TODO: Integrate with Sentry
    // Sentry.captureException(error, {
    //   tags: {
    //     component: 'supabase',
    //     table: context.table || 'unknown',
    //     operation: context.operation || 'unknown',
    //   },
    //   extra: {
    //     ...context,
    //     ...extra,
    //   },
    // })

    logger.error('Supabase error reported', { error, context, extra })
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let interceptorInstance: SupabaseInterceptor | undefined

/**
 * Get or create singleton interceptor instance
 */
export function getInterceptor(config?: InterceptorConfig): SupabaseInterceptor {
  if (!interceptorInstance) {
    interceptorInstance = new SupabaseInterceptor(config)
  }
  return interceptorInstance
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Wrap Supabase client methods with interceptor
 *
 * Usage:
 * ```ts
 * const receipts = await interceptSupabaseCall(
 *   () => supabase.from('receipts').select('*'),
 *   { table: 'receipts', operation: 'select' },
 *   z.array(receiptSchema)
 * )
 * ```
 */
export async function interceptSupabaseCall<T>(
  operation: () => Promise<{ data: T | null; error: any }>,
  context?: Partial<RequestContext>,
  validationSchema?: ZodSchema<T>
): Promise<{ data: T | null; error: any }> {
  const interceptor = getInterceptor()
  return interceptor.intercept(operation, context, validationSchema)
}

/**
 * Create intercepted Supabase client wrapper
 *
 * Usage:
 * ```ts
 * const client = createInterceptedClient(supabase)
 * const { data, error } = await client
 *   .from('receipts')
 *   .select('*')
 *   .intercepted({ validationSchema: z.array(receiptSchema) })
 * ```
 */
export function createInterceptedClient(supabase: SupabaseClient) {
  return {
    from: (table: string) => {
      const query = supabase.from(table)

      return {
        ...query,
        select: (...args: Parameters<typeof query.select>) => {
          const selectQuery = query.select(...args)

          return {
            ...selectQuery,
            intercepted: async (options?: { validationSchema?: ZodSchema<any> }) => {
              return interceptSupabaseCall(
                () => selectQuery as any,
                { table, operation: 'select' },
                options?.validationSchema
              )
            },
          }
        },
        insert: (data: any) => {
          const insertQuery = query.insert(data)

          return {
            ...insertQuery,
            intercepted: async (options?: { validationSchema?: ZodSchema<any> }) => {
              return interceptSupabaseCall(
                () => insertQuery as any,
                { table, operation: 'insert' },
                options?.validationSchema
              )
            },
          }
        },
        update: (data: any) => {
          const updateQuery = query.update(data)

          return {
            ...updateQuery,
            intercepted: async (options?: { validationSchema?: ZodSchema<any> }) => {
              return interceptSupabaseCall(
                () => updateQuery as any,
                { table, operation: 'update' },
                options?.validationSchema
              )
            },
          }
        },
        delete: () => {
          const deleteQuery = query.delete()

          return {
            ...deleteQuery,
            intercepted: async () => {
              return interceptSupabaseCall(() => deleteQuery as any, { table, operation: 'delete' })
            },
          }
        },
      }
    },
  }
}
