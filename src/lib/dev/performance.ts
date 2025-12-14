/**
 * Development Performance Utilities
 *
 * Tools for measuring and debugging performance
 *
 * @module lib/dev/performance
 */

import { logger } from '../logger'

/**
 * Measure function execution time
 */
export function measureTime<T>(fn: () => T, label: string): T {
  const start = performance.now()
  const result = fn()
  const duration = performance.now() - start

  logger.debug(`⏱️  ${label}: ${duration.toFixed(2)}ms`)

  return result
}

/**
 * Measure async function execution time
 */
export async function measureTimeAsync<T>(fn: () => Promise<T>, label: string): Promise<T> {
  const start = performance.now()
  const result = await fn()
  const duration = performance.now() - start

  logger.debug(`⏱️  ${label}: ${duration.toFixed(2)}ms`)

  return result
}

/**
 * Create a performance marker
 */
export function mark(name: string) {
  if (!import.meta.env.DEV) return

  performance.mark(name)
}

/**
 * Measure between two markers
 */
export function measure(name: string, startMark: string, endMark: string) {
  if (!import.meta.env.DEV) return

  try {
    performance.measure(name, startMark, endMark)

    const measure = performance.getEntriesByName(name, 'measure')[0]
    if (measure) {
      logger.debug(`📏 ${name}: ${measure.duration.toFixed(2)}ms`)
    }
  } catch (error) {
    logger.warn('Performance measure failed:', error)
  }
}

/**
 * Log component render count (for debugging)
 */
export function useRenderCount(componentName: string) {
  if (!import.meta.env.DEV) return

  const renderCount = React.useRef(0)

  React.useEffect(() => {
    renderCount.current += 1
    logger.debug(`🔄 ${componentName} rendered ${renderCount.current} times`)
  })
}

/**
 * Detect slow renders (>16ms)
 */
import * as React from 'react'

export function useSlowRenderDetection(componentName: string, threshold = 16) {
  if (!import.meta.env.DEV) return

  React.useEffect(() => {
    const start = performance.now()

    return () => {
      const duration = performance.now() - start
      if (duration > threshold) {
        logger.warn(`🐌 Slow render detected in ${componentName}: ${duration.toFixed(2)}ms`)
      }
    }
  })
}

/**
 * Log re-render reasons
 */
export function useWhyDidYouUpdate(name: string, props: Record<string, any>) {
  if (!import.meta.env.DEV) return

  const previousProps = React.useRef<Record<string, any>>()

  React.useEffect(() => {
    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props })
      const changedProps: Record<string, { from: any; to: any }> = {}

      for (const key of allKeys) {
        if (previousProps.current[key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current[key],
            to: props[key],
          }
        }
      }

      if (Object.keys(changedProps).length > 0) {
        logger.debug(`🔍 ${name} re-rendered because:`, changedProps)
      }
    }

    previousProps.current = props
  })
}

/**
 * Detect memory leaks (large objects remaining in memory)
 */
export class MemoryMonitor {
  private snapshots: number[] = []

  takeSnapshot() {
    if (!import.meta.env.DEV) return

    if ('memory' in performance) {
      const memory = (performance as any).memory
      this.snapshots.push(memory.usedJSHeapSize)

      logger.debug('📸 Memory snapshot:', {
        used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`,
      })
    }
  }

  detectLeak() {
    if (!import.meta.env.DEV || this.snapshots.length < 3) return false

    // Check if memory is consistently growing
    const recent = this.snapshots.slice(-3)
    const isGrowing = recent.every((val, i) => i === 0 || val > (recent[i - 1] ?? val))

    if (isGrowing) {
      const start = recent[0]
      const end = recent[recent.length - 1]

      if (start === undefined || end === undefined) {
        return false
      }

      logger.warn('⚠️  Potential memory leak detected!')
      logger.warn('Memory growth:', {
        start: `${(start / 1024 / 1024).toFixed(2)} MB`,
        end: `${(end / 1024 / 1024).toFixed(2)} MB`,
        growth: `${((end - start) / 1024 / 1024).toFixed(2)} MB`,
      })
      return true
    }

    return false
  }
}

/**
 * Create singleton instance
 */
export const memoryMonitor = new MemoryMonitor()

// ⚠️ MEMORY LEAK FIX: Auto-monitor memory in dev mode with cleanup
if (import.meta.env.DEV && typeof window !== 'undefined') {
  const monitorIntervalId = setInterval(() => {
    memoryMonitor.takeSnapshot()
    memoryMonitor.detectLeak()
  }, 10000) // Every 10 seconds

  // Clear interval on page unload
  window.addEventListener(
    'beforeunload',
    () => {
      clearInterval(monitorIntervalId)
    },
    { once: true }
  )
}
