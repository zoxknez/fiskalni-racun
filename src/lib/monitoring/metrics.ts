/**
 * Real-time Performance Monitoring
 *
 * Tracks Web Vitals and custom performance metrics.
 * Integrates with PostHog for centralized analytics.
 *
 * @module metrics
 */

import { type Metric, onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals'
import { posthog } from '@/lib/analytics/posthog'

/**
 * Web Vitals thresholds (Core Web Vitals)
 */
export const WEB_VITALS_THRESHOLDS = {
  // Largest Contentful Paint (LCP) - measures loading performance
  LCP: {
    good: 2500, // < 2.5s
    needsImprovement: 4000, // 2.5s - 4s
  },
  // Interaction to Next Paint (INP) - measures interactivity
  INP: {
    good: 200, // < 200ms
    needsImprovement: 500, // 200ms - 500ms
  },
  // Cumulative Layout Shift (CLS) - measures visual stability
  CLS: {
    good: 0.1, // < 0.1
    needsImprovement: 0.25, // 0.1 - 0.25
  },
  // First Input Delay (FID) - measures responsiveness (legacy)
  FID: {
    good: 100, // < 100ms
    needsImprovement: 300, // 100ms - 300ms
  },
  // First Contentful Paint (FCP) - measures loading
  FCP: {
    good: 1800, // < 1.8s
    needsImprovement: 3000, // 1.8s - 3s
  },
  // Time to First Byte (TTFB) - measures server response
  TTFB: {
    good: 800, // < 800ms
    needsImprovement: 1800, // 800ms - 1.8s
  },
} as const

/**
 * Get rating for a metric value
 */
function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = WEB_VITALS_THRESHOLDS[name as keyof typeof WEB_VITALS_THRESHOLDS]

  if (!threshold) {
    return 'good'
  }

  if (value <= threshold.good) {
    return 'good'
  }

  if (value <= threshold.needsImprovement) {
    return 'needs-improvement'
  }

  return 'poor'
}

/**
 * Send metric to analytics
 */
function sendMetric(metric: Metric): void {
  const { name, value, delta, id } = metric

  // Calculate custom rating based on thresholds
  const customRating = getRating(name, value)

  // Send to PostHog
  posthog.capture('web_vital', {
    metric_name: name,
    metric_value: value,
    metric_rating: customRating,
    metric_delta: delta,
    metric_id: id,
    page_url: window.location.href,
    page_path: window.location.pathname,
  })

  // Log to console in development
  if (import.meta.env.DEV) {
    const emoji = customRating === 'good' ? '✅' : customRating === 'needs-improvement' ? '⚠️' : '❌'
    console.log(`${emoji} [Metrics] ${name}:`, {
      value: `${Math.round(value)}${name === 'CLS' ? '' : 'ms'}`,
      rating: customRating,
      threshold: WEB_VITALS_THRESHOLDS[name as keyof typeof WEB_VITALS_THRESHOLDS],
    })
  }

  // Alert if metric is poor
  if (customRating === 'poor') {
    posthog.capture('performance_alert', {
      metric_name: name,
      metric_value: value,
      severity: 'warning',
    })
  }
}

/**
 * Initialize Web Vitals monitoring
 *
 * Call this once in your application entry point (main.tsx)
 */
export function initWebVitals(): void {
  // Core Web Vitals
  onLCP(sendMetric) // Largest Contentful Paint
  onINP(sendMetric) // Interaction to Next Paint (replaces FID)
  onCLS(sendMetric) // Cumulative Layout Shift

  // Other important metrics
  onFCP(sendMetric) // First Contentful Paint
  onTTFB(sendMetric) // Time to First Byte

  if (import.meta.env.DEV) {
    console.log('📊 [Metrics] Web Vitals monitoring initialized')
  }
}

/**
 * Track custom performance metric
 */
export function trackCustomMetric(
  name: string,
  value: number,
  metadata?: Record<string, unknown>
): void {
  posthog.capture('custom_metric', {
    metric_name: name,
    metric_value: value,
    page_url: window.location.href,
    page_path: window.location.pathname,
    ...metadata,
  })
}

/**
 * Measure and track operation duration
 *
 * @example
 * const endMeasure = startMeasure('data-fetch')
 * await fetchData()
 * endMeasure({ success: true })
 */
export function startMeasure(operationName: string) {
  const startTime = performance.now()

  return (metadata?: Record<string, unknown>) => {
    const duration = performance.now() - startTime
    trackCustomMetric(`operation_duration_${operationName}`, duration, {
      operation: operationName,
      ...metadata,
    })
    return duration
  }
}

/**
 * Track navigation timing
 */
export function trackNavigationTiming(): void {
  // Wait for page load
  if (document.readyState === 'complete') {
    captureNavigationTiming()
  } else {
    window.addEventListener('load', captureNavigationTiming, { once: true })
  }
}

function captureNavigationTiming(): void {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming

  if (!navigation) {
    return
  }

  const metrics = {
    dns_lookup: navigation.domainLookupEnd - navigation.domainLookupStart,
    tcp_connection: navigation.connectEnd - navigation.connectStart,
    request_time: navigation.responseStart - navigation.requestStart,
    response_time: navigation.responseEnd - navigation.responseStart,
    dom_processing: navigation.domComplete - navigation.domInteractive,
    dom_content_loaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
    load_complete: navigation.loadEventEnd - navigation.loadEventStart,
    total_load_time: navigation.loadEventEnd - navigation.fetchStart,
  }

  posthog.capture('navigation_timing', metrics)

  if (import.meta.env.DEV) {
    console.log('🚀 [Metrics] Navigation Timing:', metrics)
  }
}

/**
 * Track resource loading performance
 */
export function trackResourceTiming(): void {
  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]

  const resourceStats = resources.reduce(
    (acc, resource) => {
      const type = resource.initiatorType
      const duration = resource.duration

      if (!acc[type]) {
        acc[type] = { count: 0, totalDuration: 0, avgDuration: 0 }
      }

      acc[type].count++
      acc[type].totalDuration += duration
      acc[type].avgDuration = acc[type].totalDuration / acc[type].count

      return acc
    },
    {} as Record<string, { count: number; totalDuration: number; avgDuration: number }>
  )

  posthog.capture('resource_timing', {
    resource_stats: resourceStats,
    total_resources: resources.length,
  })

  if (import.meta.env.DEV) {
    console.log('📦 [Metrics] Resource Timing:', resourceStats)
  }
}

/**
 * Monitor long tasks (tasks that block the main thread for > 50ms)
 */
export function monitorLongTasks(): void {
  if (!('PerformanceObserver' in window)) {
    return
  }

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const longTask = entry as PerformanceEntry

        // Only track tasks longer than 50ms (blocking threshold)
        if (longTask.duration > 50) {
          posthog.capture('long_task', {
            task_duration: longTask.duration,
            task_start: longTask.startTime,
            page_url: window.location.href,
          })

          if (import.meta.env.DEV) {
            console.warn('⏱️ [Metrics] Long task detected:', {
              duration: `${Math.round(longTask.duration)}ms`,
              start: `${Math.round(longTask.startTime)}ms`,
            })
          }
        }
      }
    })

    observer.observe({ entryTypes: ['longtask'] })
  } catch {
    // PerformanceObserver might not support longtask
    console.warn('Long task monitoring not supported')
  }
}

/**
 * Initialize all performance monitoring
 *
 * Call this in main.tsx after app initialization
 */
export function initPerformanceMonitoring(): void {
  initWebVitals()
  trackNavigationTiming()
  monitorLongTasks()

  // Track resource timing after load
  window.addEventListener('load', () => {
    setTimeout(trackResourceTiming, 1000)
  })

  if (import.meta.env.DEV) {
    console.log('📊 [Metrics] Performance monitoring fully initialized')
  }
}
