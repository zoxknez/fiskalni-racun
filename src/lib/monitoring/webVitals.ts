/**
 * Advanced Web Vitals Tracking
 *
 * Monitors Core Web Vitals and sends to multiple analytics services
 *
 * @module lib/monitoring/webVitals
 */

import * as Sentry from '@sentry/react'
import { type Metric, onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals'
import { logger } from '@/lib/logger'

declare global {
  interface Window {
    va?: (event: 'beforeSend' | 'event' | 'pageview', properties?: unknown) => void
  }
}

interface VitalsReport extends Metric {
  page: string
  deviceType: 'mobile' | 'tablet' | 'desktop'
  connectionSpeed: string
  timestamp: number
}

type VitalMetricName = 'CLS' | 'LCP' | 'FCP' | 'TTFB' | 'INP'

/**
 * Get device type based on screen width
 */
function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const width = window.innerWidth
  if (width < 768) return 'mobile'
  if (width < 1024) return 'tablet'
  return 'desktop'
}

/**
 * Get connection speed
 */
function getConnectionSpeed(): string {
  const conn =
    (navigator?.connection as unknown) ||
    (navigator as unknown as { mozConnection?: unknown })?.mozConnection ||
    (navigator as unknown as { webkitConnection?: unknown })?.webkitConnection
  const effectiveType = (conn as { effectiveType?: string })?.effectiveType
  return effectiveType || 'unknown'
}

/**
 * Send metric to analytics services
 */
function sendToAnalytics(metric: Metric) {
  const report: VitalsReport = {
    ...metric,
    page: window.location.pathname,
    deviceType: getDeviceType(),
    connectionSpeed: getConnectionSpeed(),
    timestamp: Date.now(),
  }

  // ⭐ Send to Vercel Analytics
  if (typeof window !== 'undefined') {
    window.va?.('event', {
      name: metric.name,
      data: {
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
      },
    })
  }

  // ⭐ Send to Sentry Performance
  if (typeof Sentry !== 'undefined') {
    Sentry.metrics?.distribution(metric.name, metric.value, {
      unit: 'millisecond',
    })
  }

  // ⭐ Send to custom analytics endpoint
  if (navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(report)], { type: 'application/json' })
    navigator.sendBeacon('/api/analytics/vitals', blob)
  }

  // ⭐ Log to console in development
  if (import.meta.env.DEV) {
    logger.debug(`[Web Vitals] ${metric.name}:`, {
      value: Math.round(metric.value),
      rating: metric.rating,
      page: report.page,
    })
  }

  // ⭐ Alert on poor metrics
  if (metric.rating === 'poor') {
    logger.warn(`⚠️ Poor ${metric.name}: ${Math.round(metric.value)}ms`)

    // Send critical metrics to Sentry as warnings
    if (
      (metric.name === 'LCP' && metric.value > 4000) ||
      (metric.name === 'INP' && metric.value > 200) ||
      (metric.name === 'INP' && metric.value > 500) ||
      (metric.name === 'CLS' && metric.value > 0.25)
    ) {
      Sentry.captureMessage(`Critical ${metric.name}: ${Math.round(metric.value)}`, {
        level: 'warning',
        extra: {
          metric: metric.name,
          value: metric.value,
          rating: metric.rating,
          page: report.page,
          deviceType: report.deviceType,
          connectionSpeed: report.connectionSpeed,
        },
      })
    }
  }
}

/**
 * Initialize Web Vitals monitoring
 */
export function initWebVitals() {
  // ⭐ Core Web Vitals
  onCLS(sendToAnalytics)
  onLCP(sendToAnalytics)

  // ⭐ Additional metrics
  onFCP(sendToAnalytics)
  onTTFB(sendToAnalytics)

  // ⭐ INP - Replaces FID (more accurate)
  onINP(sendToAnalytics)

  logger.debug('Web Vitals monitoring initialized')
}

/**
 * Get current vitals (for debugging)
 */
export function getCurrentVitals(): Promise<Partial<Record<VitalMetricName, number>>> {
  return new Promise<Partial<Record<VitalMetricName, number>>>((resolve) => {
    const vitals: Partial<Record<VitalMetricName, number>> = {}
    let count = 0
    const total = 5

    const check = () => {
      count++
      if (count === total) resolve(vitals)
    }

    onCLS((metric) => {
      vitals.CLS = metric.value
      check()
    })
    onLCP((metric) => {
      vitals.LCP = metric.value
      check()
    })
    onFCP((metric) => {
      vitals.FCP = metric.value
      check()
    })
    onTTFB((metric) => {
      vitals.TTFB = metric.value
      check()
    })
    onINP((metric) => {
      vitals.INP = metric.value
      check()
    })
  })
}
