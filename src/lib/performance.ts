/**
 * Modern Performance Utilities
 *
 * React Compiler Ready (React 19+)
 * Web Performance Best Practices
 */

import { logger } from './logger'

/**
 * Measure function execution time
 */
export function measure<TArgs extends unknown[], TResult>(
  name: string,
  fn: (...args: TArgs) => TResult
): (...args: TArgs) => TResult {
  return ((...args: TArgs) => {
    const start = performance.now()
    const result = fn(...args)

    // Handle async functions
    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = performance.now() - start
        logger.debug(`⏱️ ${name} took ${duration.toFixed(2)}ms`)
      }) as TResult
    }

    const duration = performance.now() - start
    logger.debug(`⏱️ ${name} took ${duration.toFixed(2)}ms`)
    return result
  }) as (...args: TArgs) => TResult
}

/**
 * Performance mark utilities
 * Uses native Performance API
 */
export const perf = {
  mark(name: string) {
    if (typeof performance !== 'undefined') {
      performance.mark(name)
    }
  },

  measure(name: string, startMark: string, endMark?: string) {
    if (typeof performance !== 'undefined') {
      try {
        if (endMark) {
          performance.measure(name, startMark, endMark)
        } else {
          this.mark(`${name}-end`)
          performance.measure(name, startMark, `${name}-end`)
        }

        const entry = performance.getEntriesByName(name)[0]
        if (entry) {
          logger.info(`📊 ${name}: ${entry.duration.toFixed(2)}ms`)
        }
      } catch (error) {
        logger.warn('Performance measurement failed:', error)
      }
    }
  },

  clear(name?: string) {
    if (typeof performance !== 'undefined') {
      if (name) {
        performance.clearMarks(name)
        performance.clearMeasures(name)
      } else {
        performance.clearMarks()
        performance.clearMeasures()
      }
    }
  },
}

/**
 * Request Idle Callback wrapper
 * Runs code when browser is idle
 */
export function runWhenIdle<T>(callback: () => T): Promise<T> {
  return new Promise((resolve) => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        resolve(callback())
      })
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        resolve(callback())
      }, 1)
    }
  })
}

/**
 * Schedule task with priority
 * Uses Scheduler API if available (Chrome 94+)
 */
export function scheduleTask<T>(
  callback: () => T | Promise<T>,
  priority: 'background' | 'user-blocking' | 'user-visible' = 'user-visible'
): Promise<T> {
  // Check if Scheduler API is available
  type Scheduler = {
    postTask<U>(task: () => U | Promise<U>, options: { priority: typeof priority }): Promise<U>
  }

  const scheduler = (window as Window & { scheduler?: Scheduler }).scheduler
  if (scheduler?.postTask) {
    return scheduler.postTask(callback, { priority })
  }

  // Fallback based on priority
  if (priority === 'background') {
    return runWhenIdle(callback) as Promise<T>
  }

  const result = callback()
  return result instanceof Promise ? result : Promise.resolve(result)
}

/**
 * Preload resource
 * Uses <link rel="preload">
 */
export function preloadResource(href: string, as: 'script' | 'style' | 'image' | 'font' | 'fetch') {
  if (typeof document === 'undefined') return

  // Check if already preloaded
  const existing = document.querySelector(`link[rel="preload"][href="${href}"]`)
  if (existing) return

  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = as
  link.href = href

  if (as === 'font') {
    link.crossOrigin = 'anonymous'
  }

  document.head.appendChild(link)
}

/**
 * Prefetch resource
 * Uses <link rel="prefetch"> for low-priority fetching
 */
export function prefetchResource(href: string) {
  if (typeof document === 'undefined') return

  const existing = document.querySelector(`link[rel="prefetch"][href="${href}"]`)
  if (existing) return

  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.href = href

  document.head.appendChild(link)
}

/**
 * Batch DOM reads/writes for better performance
 * Prevents layout thrashing
 */
export function batchDOMOperations(reads: (() => void)[], writes: (() => void)[]): void {
  // Perform all reads first
  requestAnimationFrame(() => {
    for (const read of reads) {
      read()
    }

    // Then perform all writes
    requestAnimationFrame(() => {
      for (const write of writes) {
        write()
      }
    })
  })
}

/**
 * Check if code is running on main thread
 */
export function isMainThread(): boolean {
  return typeof window !== 'undefined' && window.self === window.top
}

/**
 * Get memory usage (Chrome only)
 */
export function getMemoryUsage(): {
  used: number
  total: number
  limit: number
} | null {
  interface PerformanceWithMemory extends Performance {
    memory?: {
      usedJSHeapSize: number
      totalJSHeapSize: number
      jsHeapSizeLimit: number
    }
  }

  const perf = performance as PerformanceWithMemory
  if (perf.memory) {
    const mem = perf.memory
    return {
      used: Math.round(mem.usedJSHeapSize / 1048576), // MB
      total: Math.round(mem.totalJSHeapSize / 1048576), // MB
      limit: Math.round(mem.jsHeapSizeLimit / 1048576), // MB
    }
  }
  return null
}

/**
 * Log performance metrics
 */
export function logPerformanceMetrics() {
  if (typeof performance === 'undefined') return

  const memory = getMemoryUsage()
  if (memory) {
    logger.info('Memory:', `${memory.used}MB / ${memory.limit}MB`)
  }

  // Navigation timing
  const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
  if (navEntry) {
    logger.info('Performance Metrics:', {
      'DNS Lookup': `${(navEntry.domainLookupEnd - navEntry.domainLookupStart).toFixed(2)}ms`,
      'TCP Connect': `${(navEntry.connectEnd - navEntry.connectStart).toFixed(2)}ms`,
      'Request Time': `${(navEntry.responseStart - navEntry.requestStart).toFixed(2)}ms`,
      'Response Time': `${(navEntry.responseEnd - navEntry.responseStart).toFixed(2)}ms`,
      'DOM Processing': `${(navEntry.domComplete - navEntry.domInteractive).toFixed(2)}ms`,
      'Total Load': `${(navEntry.loadEventEnd - navEntry.fetchStart).toFixed(2)}ms`,
    })
  }
}

// Log metrics on load (dev only)
if (import.meta.env.DEV) {
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      setTimeout(logPerformanceMetrics, 1000)
    })
  }
}
