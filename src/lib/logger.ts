/**
 * Modern Structured Logger
 *
 * Features:
 * - Log levels (debug, info, warn, error)
 * - Sentry integration
 * - Structured data
 * - Context support
 * - Production-safe
 */

const isDev = import.meta.env.DEV

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
  [key: string]: unknown
}

type LogMetadata = unknown[]

/**
 * Base logger interface
 */
interface Logger {
  debug: (message: string, ...metadata: LogMetadata) => void
  info: (message: string, ...metadata: LogMetadata) => void
  warn: (message: string, ...metadata: LogMetadata) => void
  error: (message: string, error?: Error | unknown, ...metadata: LogMetadata) => void
  log: (...args: unknown[]) => void
}

/**
 * Format log message with context
 */
function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString()
  const contextStr = context ? ` ${JSON.stringify(context)}` : ''
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`
}

function isLogContext(value: unknown): value is LogContext {
  if (!value || typeof value !== 'object') return false
  if (value instanceof Error || Array.isArray(value)) return false
  return value.constructor === Object
}

function extractContext(metadata: LogMetadata): LogContext | undefined {
  const contexts = metadata.filter(isLogContext) as LogContext[]
  if (!contexts.length) return undefined

  return contexts.reduce<LogContext>((acc, ctx) => Object.assign(acc, ctx), {})
}

/**
 * Send log to Sentry
 */
function sendToSentry(
  level: LogLevel,
  message: string,
  error?: Error | unknown,
  context?: LogContext
) {
  if (!import.meta.env.PROD) return

  try {
    // Lazy load Sentry
    import('./monitoring/sentry')
      .then(({ captureError, captureMessage, addBreadcrumb }) => {
        if (level === 'error' && error) {
          captureError(error instanceof Error ? error : new Error(String(error)), context)
        } else {
          const sentryLevel = level === 'debug' ? 'debug' : level === 'warn' ? 'warning' : level
          captureMessage(message, sentryLevel as any)
        }

        // Add breadcrumb for context
        addBreadcrumb(
          message,
          'console',
          level === 'error' ? 'error' : level === 'warn' ? 'warning' : 'info'
        )
      })
      .catch(() => {
        // Sentry not available
      })
  } catch {
    // Ignore Sentry errors
  }
}

/**
 * Main logger instance
 */
export const logger: Logger = {
  /**
   * Debug logs (development only)
   */
  debug: (message: string, ...metadata: LogMetadata) => {
    const context = extractContext(metadata)
    if (isDev) {
      console.log(formatMessage('debug', message, context), ...metadata)
    }
  },

  /**
   * Info logs
   */
  info: (message: string, ...metadata: LogMetadata) => {
    const context = extractContext(metadata)
    if (isDev) {
      console.info(formatMessage('info', message, context), ...metadata)
    }

    // Send to analytics in production (non-blocking)
    if (import.meta.env.PROD) {
      sendToSentry('info', message, undefined, context)
    }
  },

  /**
   * Warning logs
   */
  warn: (message: string, ...metadata: LogMetadata) => {
    const context = extractContext(metadata)
    console.warn(formatMessage('warn', message, context), ...metadata)

    // Always send warnings to Sentry
    if (import.meta.env.PROD) {
      sendToSentry('warn', message, undefined, context)
    }
  },

  /**
   * Error logs (always logged + sent to Sentry)
   */
  error: (message: string, error?: Error | unknown, ...metadata: LogMetadata) => {
    const context = extractContext(metadata)
    console.error(formatMessage('error', message, context), error, ...metadata)

    // Always send errors to Sentry
    sendToSentry('error', message, error, context)
  },

  /**
   * Legacy log method (for backward compatibility)
   */
  log: (...args: unknown[]) => {
    if (isDev) {
      console.log(...args)
    }
  },
}

/**
 * Create a namespaced logger for specific modules
 */
export function createLogger(namespace: string) {
  return {
    log: (...args: unknown[]) => logger.log(`[${namespace}]`, ...args),
    warn: (...args: unknown[]) => logger.warn(`[${namespace}]`, ...args),
    error: (...args: unknown[]) => logger.error(`[${namespace}]`, ...args),
    debug: (...args: unknown[]) => logger.debug(`[${namespace}]`, ...args),
    info: (...args: unknown[]) => logger.info(`[${namespace}]`, ...args),
  }
}

// Pre-configured loggers for common modules
export const authLogger = createLogger('AUTH')
export const dbLogger = createLogger('DB')
export const syncLogger = createLogger('SYNC')
export const ocrLogger = createLogger('OCR')
export const qrLogger = createLogger('QR')
