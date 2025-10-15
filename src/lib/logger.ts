/**
 * Logger utility - removes console.log in production
 * while keeping error logs for debugging
 */

const isDev = import.meta.env.DEV

export const logger = {
  /**
   * Development-only logging
   */
  log: (...args: unknown[]) => {
    if (isDev) {
      console.log(...args)
    }
  },

  /**
   * Development-only warnings
   */
  warn: (...args: unknown[]) => {
    if (isDev) {
      console.warn(...args)
    }
  },

  /**
   * Always log errors (even in production)
   * These should be sent to error tracking service (Sentry)
   */
  error: (...args: unknown[]) => {
    console.error(...args)
    // TODO: Send to Sentry in production
    // if (import.meta.env.PROD) {
    //   Sentry.captureException(args[0])
    // }
  },

  /**
   * Debug logs with prefix
   */
  debug: (context: string, ...args: unknown[]) => {
    if (isDev) {
      console.log(`[DEBUG:${context}]`, ...args)
    }
  },

  /**
   * Info logs (shown in production too, but less verbose)
   */
  info: (...args: unknown[]) => {
    console.info(...args)
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
    debug: (...args: unknown[]) => logger.debug(namespace, ...args),
    info: (...args: unknown[]) => logger.info(`[${namespace}]`, ...args),
  }
}

// Pre-configured loggers for common modules
export const authLogger = createLogger('AUTH')
export const dbLogger = createLogger('DB')
export const syncLogger = createLogger('SYNC')
export const ocrLogger = createLogger('OCR')
export const qrLogger = createLogger('QR')
