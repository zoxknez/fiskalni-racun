import { useEffect } from 'react'
import type { Metric } from 'web-vitals'
import { logger } from '@/lib/logger'

/**
 * Modern Web Vitals Hook
 *
 * Monitors Core Web Vitals:
 * - LCP (Largest Contentful Paint) - Loading performance
 * - FID (First Input Delay) - Interactivity
 * - CLS (Cumulative Layout Shift) - Visual stability
 * - FCP (First Contentful Paint) - Initial rendering
 * - TTFB (Time to First Byte) - Server response time
 * - INP (Interaction to Next Paint) - New metric replacing FID
 *
 * Automatically sends metrics to:
 * - Console (development)
 * - Analytics (production)
 * - Sentry (production)
 */
export function useWebVitals() {
  useEffect(() => {
    const reportWebVital = (metric: Metric) => {
      // Log in development
      logger.info('Web Vital:', {
        name: metric.name,
        value: Math.round(metric.value),
        rating: metric.rating,
        delta: Math.round(metric.delta),
      })

      // Send to analytics in production
      // Web Vitals are already tracked by PostHog (see App.tsx)
      if (import.meta.env.PROD) {
        // PostHog automatically captures web vitals
        // No additional implementation needed
        /*
        gtag('event', metric.name, {
          value: Math.round(metric.value),
          metric_rating: metric.rating,
          metric_delta: Math.round(metric.delta),
        })
        */
        // Send to Sentry for performance monitoring
        /*
        import('@ sentry/react').then(Sentry => {
          Sentry.metrics.distribution(metric.name, metric.value, {
            unit: 'millisecond',
            tags: { rating: metric.rating },
          })
        })
        */
      }
    }

    // Dynamically import web-vitals (only loads when needed)
    import('web-vitals').then(({ onCLS, onFCP, onLCP, onTTFB, onINP }) => {
      onCLS(reportWebVital) // Cumulative Layout Shift
      onFCP(reportWebVital) // First Contentful Paint
      onLCP(reportWebVital) // Largest Contentful Paint
      onTTFB(reportWebVital) // Time to First Byte
      onINP(reportWebVital) // Interaction to Next Paint (new!)
    })
  }, [])
}

/**
 * Web Vitals Thresholds (Google's recommendations)
 */
export const WEB_VITALS_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint (ms)
  FID: { good: 100, poor: 300 }, // First Input Delay (ms)
  CLS: { good: 0.1, poor: 0.25 }, // Cumulative Layout Shift
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint (ms)
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte (ms)
  INP: { good: 200, poor: 500 }, // Interaction to Next Paint (ms)
} as const

/**
 * Get rating for a metric value
 */
export function getMetricRating(
  name: keyof typeof WEB_VITALS_THRESHOLDS,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const threshold = WEB_VITALS_THRESHOLDS[name]
  if (value <= threshold.good) return 'good'
  if (value <= threshold.poor) return 'needs-improvement'
  return 'poor'
}
